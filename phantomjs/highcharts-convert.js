/**
 * @license Highcharts JS v3.0.1 (2012-11-02)
 *
 * (c) 20013-2014
 *
 * Author: Gert Vaartjes
 *
 * License: www.highcharts.com/license
 *
 * version: 2.0.1
 */

/* global cb, clearInterval, clearTimeout, console, customCode,
	dataOptions, document, globalOptions, Highcharts, Image, options, themeOptions
	phantom, response, require, window */
(function () {
	'use strict';

	var config = {
			TIMEOUT: 5000 /* 5 seconds timout for loading images */
		},
		mapCLArguments,
		render,
		startServer = false,
		args,
		pick,
		extend,
		SVG_DOCTYPE = '<?xml version=\"1.0" standalone=\"no\"?><!DOCTYPE svg PUBLIC \"-//W3C//DTD SVG 1.1//EN\" \"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\">',
		dpiCorrection = 1.0, // Correction factor for DPI scaling. Use if PDF export does not match page size (issue #4764).
		// dpiCorrection = 72 / 96, // DPI correction setting for Windows
		system = require('system'),
		fs = require('fs'),
		serverMode = false;

	pick = function () {
		var args = arguments, i, arg, length = args.length;
		for (i = 0; i < length; i += 1) {
			arg = args[i];
			if (arg !== undefined && arg !== null && arg !== 'null' && arg !== '0') {
				return arg;
			}
		}
	};

	/*
	 * Extend an object with the members of another
	 * @param {Object} a The object to be extended
	 * @param {Object} b The object to add to the first one
	 * @returns {Object}
	 */
	extend = function (a, b) {
		var n;
		if (!a) {
			a = {};
		}

		for (n in b) {
			if (b.hasOwnProperty(n)) {
				a[n] = b[n];
			}
		}
		return a;
	};

	mapCLArguments = function () {
		var map = {},
			i,
			key;

		if (system.args.length < 1) {
			console.log('Commandline Usage: highcharts-convert.js -infile filename -outfile filename -scale 2.5 -width 300 -constr Chart -callback callback.js');
			console.log(', or run PhantomJS as server: highcharts-convert.js -host 127.0.0.1 -port 1234');
		}

		for (i = 0; i < system.args.length; i += 1) {
			if (system.args[i].charAt(0) === '-') {
				key = system.args[i].substr(1, i.length);
				if (key === 'infile' || key === 'callback' || key === 'dataoptions' || key === 'globaloptions' || key === 'customcode' || key === 'themeoptions') {
					// get string from file
					try {
						map[key] = fs.read(system.args[i + 1]).replace(/^\s+/, '');
					} catch (e) {
						console.log('Error: cannot find file, ' + system.args[i + 1]);
						phantom.exit();
					}
				} else {
					// assume PhantomJS running in serverMode. Parameter is not a file, but contains content.
					map[key] = system.args[i + 1];
				}
			}
		}
		return map;
	};

	render = function (params, exitCallback, exitErrorCallback) {

		var page = require('webpage').create(),
			messages = {},
			scaleAndClipPage,
			loadChart,
			createChart,
			appendStyleElement,
			appendScriptElement,
			injectResources,
			injectResource,
			input,
			constr,
			callback,
			output,
			outType,
			timer,
			renderSVG,
			convert,
			exit,
			exitError,
			interval,
			counter,
			imagesLoaded = false;

		messages.optionsParsed = 'Highcharts.options.parsed';
		messages.callbackParsed = 'Highcharts.cb.parsed';

		window.optionsParsed = false;
		window.callbackParsed = false;

		// security measures, for not allowing loading iframes
		page.navigationLocked = true;

		page.onConsoleMessage = function (msg) {
			console.log(msg);

			/*
			 * Ugly hack, but only way to get messages out of the 'page.evaluate()'
			 * sandbox. If any, please contribute with improvements on this!
			 */

			/* to check options or callback are properly parsed */
			if (msg === messages.optionsParsed) {
				window.optionsParsed = true;
			}

			if (msg === messages.callbackParsed) {
				window.callbackParsed = true;
			}
		};

		page.onAlert = function (msg) {
			console.log(msg);
		};

		page.onError = function (msg, trace) {
			var msgStack = [msg];

			if (trace && trace.length) {
				msgStack.push('TRACE:');
				trace.forEach(function (t) {
					msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
				});
			}

			console.error(msgStack.join('\n'));

			exitError(msg);
		};

		/* scale and clip the page */
		scaleAndClipPage = function (svg) {
			/*	param: svg: The scg configuration object
			*/

			var zoom = 1,
				pageWidth = pick(params.width, svg.width),
				clipwidth,
				clipheight;

			if (parseInt(pageWidth, 10) == pageWidth) { // eslint-disable-line eqeqeq
				zoom = pageWidth / svg.width;
			}

			/* set this line when scale factor has a higher precedence
			scale has precedence : page.zoomFactor = params.scale  ? zoom * params.scale : zoom;*/

			/* params.width has a higher precedence over scaling, to not break backover compatibility */
			page.zoomFactor = params.scale && params.width === undefined ? zoom * params.scale : zoom;

			// Set scale on foreignObject body. page.zoomFactor does not work on HTML inside SVG foreignObject on webkit currently.
			// See Highcharts issue #4648
			page.evaluate(function (zoom) {
				var foreignObjectElem = document.getElementsByTagName('foreignObject')[0],
					bodyElem = foreignObjectElem && foreignObjectElem.getElementsByTagName('body')[0];
				if (bodyElem) {
					bodyElem.setAttribute('style', '-webkit-transform: scale(' + zoom + '); -webkit-transform-origin: 0 0 !important');
				}
			}, page.zoomFactor);

			clipwidth = svg.width * page.zoomFactor;
			clipheight = svg.height * page.zoomFactor;

			/* define the clip-rectangle */
			/* ignored for PDF, see https://github.com/ariya/phantomjs/issues/10465 */
			page.clipRect = {
				top: 0,
				left: 0,
				width: clipwidth,
				height: clipheight
			};

			if (outType === 'pdf') {
				// redefine the viewport
				page.viewportSize = { width: clipwidth, height: clipheight };

				// simulate zooming to get the right zoomFactor. Using page.zoomFactor doesn't work anymore, see issue here https://github.com/ariya/phantomjs/issues/12685
				page.evaluate(function (zoom) {
					document.getElementsByTagName('body')[0].style.zoom = zoom;
				}, page.zoomFactor);

				page.paperSize = { width: clipwidth * dpiCorrection, height: clipheight * dpiCorrection };
			}
		};

		exit = function (result, error) {
			if (serverMode) {
				// Calling page.close(), may stop the increasing heap allocation
				page.close();
			}
			console.log('Exited with message \'' + result + '\'');
			if (error !== true && exitCallback !== null) {
				exitCallback(result);
			} else if (error === true && exitErrorCallback !== null) {
				exitErrorCallback(result);
			}
		};

		exitError = function (result) {
			exit('ERROR: ' + result, true);
		};

		convert = function (svg) {
			var base64;
			scaleAndClipPage(svg);
			if (outType === 'pdf' || output !== undefined || !serverMode) {
				if (output === undefined) {
					// in case of pdf files
					output = 'chart.' + outType;
				}

				if (config.tmpDir) {
					// assume only output is a filename, not a path.
					page.render(config.tmpDir + '/' + output);
				} else {
					page.render(output);
				}

				exit(output);
			} else {
				base64 = page.renderBase64(outType);
				exit(base64);
			}
		};

		function decrementImgCounter() {
			counter -= 1;
			if (counter < 1) {
				imagesLoaded = true;
			}
		}

		function loadImages(imgUrls) {
			var i, img;
			counter = imgUrls.length;
			for (i = 0; i < imgUrls.length; i += 1) {
				img = new Image();
				/* onload decrements the counter, also when error (perhaps 404), don't wait for this image to be loaded */
				img.onload = img.onerror = decrementImgCounter;
				/* force loading of images by setting the src attr.*/
				img.src = imgUrls[i];
			}
		}

		renderSVG = function (svg) {
			var svgFile;
			// From this point we have 'loaded' or 'created' a SVG

			// Do we have to load images?
			if (svg.imgUrls.length > 0) {
				loadImages(svg.imgUrls);
			} else {
				// no images present, no loading, no waiting
				imagesLoaded = true;
			}

			try {
				if (outType.toLowerCase() === 'svg') {
					// output svg
					svg = svg.html.replace(/<svg (?!xmlns:xlink)/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ').replace(/ href=/g, ' xlink:href=').replace(/<\/svg>.*?$/, '</svg>');
					// add xml doc type
					svg = SVG_DOCTYPE + svg;

					if (output !== undefined) {
						// write the file
						if (config.tmpDir) {
							output = config.tmpDir + '/' + output;
						}
						svgFile = fs.open(output, 'w');
						svgFile.write(svg);
						svgFile.close();
						exit(output);
					} else {
						// return the svg as a string
						exit(svg);
					}

				} else {
					// output binary images or pdf
					if (!imagesLoaded) {
						// render with interval, waiting for all images loaded
						interval = window.setInterval(function () {
							if (imagesLoaded) {
								clearTimeout(timer);
								clearInterval(interval);
								convert(svg);
							}
						}, 50);

						// we have a 5 second timeframe..
						timer = window.setTimeout(function () {
							clearInterval(interval);
							exitError('While rendering, there\'s is a timeout reached');
						}, config.TIMEOUT);
					} else {
						// images are loaded, render rightaway
						convert(svg);
					}
				}
			} catch (e) {
				exitError('While rendering, ' + e);
			}
		};

		loadChart = function (input, outputType) {
			var nodeIter, nodes, elem, opacity, svgElem, imgs, imgUrls, imgIndex, foreignObjectElem, bodyElem;

			document.body.style.margin = '0px';
			document.body.innerHTML = input;

			// Wrap contents of foreignObject in a body tag if the body tag has been removed. Not sure why this happens,
			// but when assigning to innerHTML, the body tag seems to be stripped off.
			foreignObjectElem = document.getElementsByTagName('foreignObject')[0];
			if (foreignObjectElem && !foreignObjectElem.getElementsByTagName('body').length) {
				bodyElem = document.createElement('body');
				bodyElem.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
				while (foreignObjectElem.firstChild) {
					bodyElem.appendChild(foreignObjectElem.firstChild.cloneNode(true));
					foreignObjectElem.removeChild(foreignObjectElem.firstChild);
				}
				foreignObjectElem.appendChild(bodyElem);
			}

			if (outputType === 'jpeg') {
				document.body.style.backgroundColor = 'white';
			}

			nodes = document.querySelectorAll('*[stroke-opacity]');

			for (nodeIter = 0; nodeIter < nodes.length; nodeIter += 1) {
				elem = nodes[nodeIter];
				opacity = elem.getAttribute('stroke-opacity');
				elem.removeAttribute('stroke-opacity');
				elem.setAttribute('opacity', opacity);
			}

			svgElem = document.getElementsByTagName('svg')[0];

			imgs = document.getElementsByTagName('image');
			imgUrls = [];

			for (imgIndex = 0; imgIndex < imgs.length; imgIndex = imgIndex + 1) {
				imgUrls.push(imgs[imgIndex].href.baseVal);
			}

			return {
				html: document.body.innerHTML,
				width: svgElem.getAttribute('width'),
				height: svgElem.getAttribute('height'),
				imgUrls: imgUrls
			};
		};

		createChart = function (constr, input, themeOptionsArg, globalOptionsArg, dataOptionsArg, customCodeArg, outputType, callback) {

			var container, chart, nodes, nodeIter, elem, opacity, imgIndex, imgs, imgUrls;

			// dynamic script insertion
			function loadScript(varName, code) {

				var elem = document.createElement('script'),
					body = 'var ' + varName + ' = ' + code;
				elem.type = 'text/javascript';
				elem.appendChild(document.createTextNode(body));
				document.getElementsByTagName('head')[0].appendChild(elem);

				if (window[varName] !== undefined) {
					console.log('Highcharts.' + varName + '.parsed');
				}
			}

			function parseData(completeHandler, chartOptions, dataConfig) {
				try {
					dataConfig.complete = completeHandler;
					Highcharts.data(dataConfig, chartOptions);
				} catch (error) {
					completeHandler(undefined);
				}
			}

			if (input !== 'undefined') {
				loadScript('options', input);
			}

			if (callback !== 'undefined') {
				loadScript('cb', callback);
			}

			if (globalOptionsArg !== 'undefined') {
				loadScript('globalOptions', globalOptionsArg);
			}

			if (themeOptionsArg !== 'undefined') {
				loadScript('themeOptions', themeOptionsArg);
			}

			if (dataOptionsArg !== 'undefined') {
				loadScript('dataOptions', dataOptionsArg);
			}

			if (customCodeArg !== 'undefined') {
				loadScript('customCode', customCodeArg);
			}

			document.body.style.margin = '0px';

			if (outputType === 'jpeg') {
				document.body.style.backgroundColor = 'white';
			}

			container = document.createElement('div');
			container.id = 'container';
			document.body.appendChild(container);

			// disable animations
			Highcharts.SVGRenderer.prototype.Element.prototype.animate = Highcharts.SVGRenderer.prototype.Element.prototype.attr;
			Highcharts.setOptions({
				plotOptions: {
					series: {
						animation: false
					}
				}
			});

			// merge optionally the chartOptions into the themeOptions
			options = Highcharts.merge(true, themeOptions, options);

			if (!options.chart) {
				options.chart = {};
			}

			options.chart.renderTo = container;

			// check if witdh is set. Order of precedence:
			// args.width, options.chart.width and 600px

			// OLD. options.chart.width = width || options.chart.width || 600;
			// Notice we don't use commandline parameter width here. Commandline parameter width is used for scaling.

			options.chart.width = (options.exporting && options.exporting.sourceWidth) || options.chart.width || 600;
			options.chart.height = (options.exporting && options.exporting.sourceHeight) || options.chart.height || 400;

			if (globalOptions) {
				Highcharts.setOptions(globalOptions);
			}

			// Load data
			if (dataOptions) {
				parseData(function completeHandler(opts) {
					// Merge series configs
					if (options.series) {
						Highcharts.each(options.series, function (series, i) {
							options.series[i] = Highcharts.merge(series, opts.series[i]);
						});
					}

					var mergedOptions = Highcharts.merge(true, opts, options);

					// Run customCode
					if (customCode) {
						customCode(mergedOptions);
					}

					chart = new Highcharts[constr](mergedOptions, cb);

				}, options, dataOptions);
			} else {
				chart = new Highcharts[constr](options, cb);
			}

			/* remove stroke-opacity paths, used by mouse-trackers, they turn up as
			*  as fully opaque in the PDF
			*/
			nodes = document.querySelectorAll('*[stroke-opacity]');

			for (nodeIter = 0; nodeIter < nodes.length; nodeIter += 1) {
				elem = nodes[nodeIter];
				opacity = elem.getAttribute('stroke-opacity');
				elem.removeAttribute('stroke-opacity');
				elem.setAttribute('opacity', opacity);
			}

			imgs = document.getElementsByTagName('image');
			imgUrls = [];

			for (imgIndex = 0; imgIndex < imgs.length; imgIndex = imgIndex + 1) {
				imgUrls.push(imgs[imgIndex].href.baseVal);
			}

			return {
				html: document.getElementsByClassName('highcharts-container')[0].innerHTML,
				width: chart.chartWidth,
				height: chart.chartHeight,
				imgUrls: imgUrls
			};
		};

		/**
		 * @param {String} css - the css content to be inserted in a style tag placed in body element
		 * @returns {undefined}
		 */
		appendStyleElement = function (css) {
			var elem = document.createElement('style');
			elem.type = 'text/css';
			elem.innerHTML = css;
			document.body.appendChild(elem);
		};

		/**
		 * @param {String} js - the javascript content to be inserted in a script tag placed in body element
		 * @returns {undefined}
		 */
		appendScriptElement = function (js) {
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.charset = 'utf-8';
			script.defer = true;
			script.async = true;
			script.text = js;
			document.body.appendChild(script);
		};


		/**
		 * In ject or append files, content for javascript tags or style tags
		 * @param {String} type - indicating the type of resource, of type: file, css or js
		 * @param {String} resource - the content of the resource
		 * @returns {undefined}
		 */
		injectResource = function (type, resource) {
			if (type === 'js') {
				page.evaluate(appendScriptElement, resource);
			}
			// css or js file content is directly specfied on the property // instead of using filenames.
			if (type === 'css') {
				page.evaluate(appendStyleElement, resource);
			}
		};

		/*
		 * Process a json file where resources are specified by key.
		 * @param {Object} resources - an object with the folowing keys: files,js, css
		 */
		injectResources = function (resources) {
			var key,
				fileName,
				fileIdx,
				extension;

			for (key in resources) {
				if (resources.hasOwnProperty(key)) {
					if (key === 'files') {
						if (resources.files.constructor.name === 'String' ) {
							// Assume a comma separated string of filenames
							resources.files = resources.files.split(',');
						}
						// loop through a array of local css or js files
						for (fileIdx = 0; fileIdx < resources.files.length; fileIdx++) {
							fileName = resources.files[fileIdx];

							// first check if the path exists, otherwise assume the file to be in the libaryPath
							if (!fs.exists(fileName)) {
								fileName = phantom.libraryPath + fs.separator + fileName;
							}

							extension = fileName.split('.').pop();
							if (fs.exists(fileName) && extension === 'js') {
								// for local javascript files
								page.injectJs(fileName);
							}

							if (fs.exists(fileName) && extension === 'css') {
								// for js or css placed between tags
								injectResource('css', fs.read(fileName));
							}
						}
					}
					// css or js file content is directly specfied on the property // instead of using filenames.
					if (key === 'css' || key === 'js') {
						injectResource(key, resources[key]);
					}
				}
			}
		};

		if (params.length < 1) {
			exitError('Insufficient parameters');
		} else {
		    	if (params.infile === undefined || params.infile.length === 0) {
				input = params.options;
			} else {
				input = params.infile;
			}
			output = params.outfile;

			if (output !== undefined) {
				outType = pick(output.split('.').pop(), 'png');
			} else {
				outType = pick(params.type, 'png');
			}

			constr = pick(params.constr, 'Chart');
			callback = params.callback;
			// width = params.width;

			if (input === undefined || input.length === 0) {
				exitError('Insuficient or wrong parameters for rendering');
			}

			page.open('about:blank', function () {
				var svg,
					globalOptions = params.globaloptions,
					dataOptions = params.dataoptions,
					themeOptions = params.themeoptions,
					customCode = 'function customCode(options) {\n' + params.customcode + '}\n',
					fileList,
					resourcesFile = page.libraryPath + '/resources.json',
					resources,
					resourcesParam;

				/* Decide if we have to generate a svg first before rendering */
				if (input.substring(0, 4).toLowerCase() === '<svg' || input.substring(0, 5).toLowerCase() === '<?xml' ||
					input.substring(0, 9).toLowerCase() === '<!doctype') {
					// render page directly from svg file
					svg = page.evaluate(loadChart, input, outType);
					page.viewportSize = { width: svg.width, height: svg.height };
					renderSVG(svg);
				} else {
					/**
					 * We have to render a chart serverside from the send Highcharts options and use the svg for rendering to an image.
					 */

					/**
					 * Load first resources needed for renderering for example highcharts files and/or css
					 * resources can be specfied with:
					 * 1. A string of filenames separated by comma's, keyed by the propertyname 'files'
					 * 2. A JSON file with file content keyed by 'js' or 'css', or 'files' specifying local files in an array
					 */

					// read the local resources file needed for chart creation
					if (fs.exists(resourcesFile)) {
						try {
							resources = JSON.parse(fs.read(resourcesFile));
						} catch(err) {
							console.log('Cannot parse the local resources file');
						}
					}

					// extend resources config with resources specified on the parameter
					if (params.resources !== undefined) {
						try {
							resourcesParam = JSON.parse(params.resources);
							if (typeof resources === 'object') {
								// extend the already defined resources from the local file with the resources defined with the parameter.
								resources = extend(resources, resourcesParam);
							}
						} catch(err) {
							// Not parsing as JSON, try if we have the resources specified by a comma separated list of filenames.
							fileList = params.resources.split('\,');
							resources = extend(resources, { files: fileList });
						}
					}

					injectResources(resources);

					// load chart in page and return svg height and width
					svg = page.evaluate(createChart, constr, input, themeOptions, globalOptions, dataOptions, customCode, outType, callback, messages);

					if (!window.optionsParsed) {
						exitError('the options variable was not available or couldn\'t be parsed, does the infile contain an syntax error? Input used:' + input);
					}

					if (callback !== undefined && !window.callbackParsed) {
						exitError('the callback variable was not available, does the callback contain an syntax error? Callback used: ' + callback);
					}
					if(typeof svg !== 'undefined' && svg !== null){
						renderSVG(svg);
					} else {
						exitError('failed to render chart in page, svg is null.');
					}
				}
			});
		}
	};

	startServer = function (host, port) {
		var server = require('webserver').create();


		server.listen(host ? host + ':' + port : parseInt(port, 10),
			function (request, response) {
				function onSuccess(msg) {
					response.statusCode = 200;
					response.write(msg);
					response.close();
				}
				function onError(msg, e) {
					msg = 'Failed rendering: \n';
					if (e) {
						msg += e;
					}
					response.statusCode = 500;
					response.setHeader('Content-Type', 'text/plain');
					response.setHeader('Content-Length', msg.length);
					response.write(msg);
					response.close();
				}
				var jsonStr = request.postRaw || request.post,
					params;
				try {
					params = JSON.parse(jsonStr);
					if (params.status) {
						// for server health validation
						response.statusCode = 200;
						response.write('OK');
						response.close();
					} else {
						render(params, onSuccess, onError);
					}
				} catch (e) {
					onError('ERROR: Failed rendering chart');
				}
			}); // end server.listen

		// switch to serverMode
		serverMode = true;

		console.log('OK, PhantomJS is ready.');
	};

	args = mapCLArguments();

	// set tmpDir, for outputting temporary files.
	if (args.tmpdir !== undefined) {

		config.tmpDir = args.tmpdir;

		// Make sure tmpDir exist and is writable
		if (!fs.exists(config.tmpDir)) {
			try{
				fs.makeDirectory(config.tmpDir);
			} catch (e) {
				console.log('ERROR: Cannot create temp directory for ' + config.tmpDir);
			}
		}
	}

	if (args.port !== undefined) {
		startServer(args.host, args.port);
	} else {
		// presume commandline usage
		render(args, function (msg) {
			console.log(msg);
			phantom.exit();
		});
	}
}());

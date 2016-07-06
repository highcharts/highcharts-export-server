
## **Setting up the export server**

There may be cases where you don't want to use Highcharts' featured export server, for instance if you are running a secure website or if you don't want your data to be passed to the Highcharts CDN.

Before setting up your own server, consider using the client side export module. In short, a dedicated server is only needed if you need to support IE8 and older, or if you are having problems with the features listed in the client side export browser support table.

If you still need to set up your own server, we have a few flavors of servers to choose from;

1. The simple export server, based on PHP and Batik.
2. More advanced server, based on Java and PhantomJS, which also support serverside rendering of charts.
3. Build export server docker image 

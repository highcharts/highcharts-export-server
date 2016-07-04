1. Place here the Highcharts javascript files needed for server-side chart generation.
For example highcharts.js or highstock.js and don't forget modules like gauge.js or funnel.js if you want to support gauges, funnel charts, etc.
2. Edit the resources.json file to match it with the above files needed by PhantomJS. use the ```files``` property to specify the filenames in a command separated string.

Example:

```
{
    "files": "highcharts.js,highcharts-more.js,data.js,drilldown.js,funnel.js,heatmap.js,treemap.js,highcharts-3d.js,no-data-to-display.js,map.js,solid-gauge.js,broken-axis.js"
}
```

**note**
The Highcharts files are subjected to the Highcharts License.

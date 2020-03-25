console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { wrapText } = require("./lib/helpers");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var pymChild = null;
pym.then(function(child) {
  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", render);

  child.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });
});

var render = function() {
  //put your D3 code here

  // add in bars on bottom



  var bottomChartWidth = d3
    .select(".graphic-bottom-bars")
    .node()
    .getBoundingClientRect().width;


  var noOptInWidth = ((DATA[0].highlight - DATA[DATA.length - 1].highlight) / DATA[0].highlight) * bottomChartWidth

  var optInWidth = (DATA[DATA.length - 1].highlight / DATA[0].highlight) * bottomChartWidth

  console.log(noOptInWidth, optInWidth)



  d3.select(".graphic-bottom-bars .gray-bar").attr(
    "style",
    "width:" +
      noOptInWidth +
      "px"
  );

  d3.select(".graphic-bottom-bars .highlight-bar").attr(
    "style",
    "width:" +
      optInWidth +
      "px"
  );

  var svg = d3.select("svg.axis-svg");
  svg.html("")
  var axisHeight = 10;

  // setup first axis
  // svg.append("line")
  //   .attr('x1', 1)
  //   .attr('x2', 1)
  //   .attr('y1', 0)
  //   .attr('y2', axisHeight)

  // svg.append("line")
  //   .attr('x1', 1)
  //   .attr('x2', noOptInWidth)
  //   .attr('y1', axisHeight)
  //   .attr('y2', axisHeight)

  // svg.append("line")
  //   .attr('x1', noOptInWidth - 1)
  //   .attr('x2', noOptInWidth - 1)
  //   .attr('y1', 0)
  //   .attr('y2', axisHeight)

  // svg.append("line")
  //   .attr('x1', (noOptInWidth - 2)/2 + 1)
  //   .attr('x2', (noOptInWidth - 2)/2 + 1)
  //   .attr('y1', axisHeight)
  //   .attr('y2', axisHeight + 7)

  svg.append("text")
    .attr('x', (noOptInWidth - 2)/2 + 1)
    .attr('y', axisHeight + 7 + 13)
    .attr("dy", -18)
    .attr('class', "noOptIn-text bold-text")
    .text(((DATA[0].highlight - DATA[1].highlight)*100/DATA[0].highlight).toFixed(0) + "%")
    .call(wrapText, 88, 13)

  svg.append("text")
    .attr('x', (noOptInWidth - 2)/2 + 1)
    .attr('y', axisHeight + 7 + 13*2)
    .attr("dy", -18)
    .attr('class', "noOptIn-text")
    .text(LABELS.barlabel1)
    .call(wrapText, 144, 13)


  // setup second axis
  // svg.append("line")
  //   .attr('x1', noOptInWidth + 1)
  //   .attr('x2', noOptInWidth + 1)
  //   .attr('y1', 0)
  //   .attr('y2', axisHeight)

  // svg.append("line")
  //   .attr('x1', noOptInWidth + 1)
  //   .attr('x2', bottomChartWidth)
  //   .attr('y1', axisHeight)
  //   .attr('y2', axisHeight)

  // svg.append("line")
  //   .attr('x1', bottomChartWidth - 1)
  //   .attr('x2', bottomChartWidth - 1)
  //   .attr('y1', 0)
  //   .attr('y2', axisHeight)

  // svg.append("line")
  //   .attr('x1', bottomChartWidth - (optInWidth - 2)/2 - 1)
  //   .attr('x2', bottomChartWidth - (optInWidth - 2)/2 - 1)
  //   .attr('y1', axisHeight)
  //   .attr('y2', axisHeight + 7)

  svg.append("text")
    .attr('x', bottomChartWidth - (optInWidth - 2)/2 - 1)
    .attr('y', axisHeight + 7 + 13)
    .attr("dy", -18)
    .attr('class', "noOptIn-text bold-text")
    .text((DATA[1].highlight*100/DATA[0].highlight).toFixed(0) + "%")
    .call(wrapText, 88, 13)

  svg.append("text")
    .attr('x', bottomChartWidth - (optInWidth - 2)/2 - 1)
    .attr('y', axisHeight + 7 + 13*2)
    .attr("dy", -18)
    .attr('class', "noOptIn-text")
    .text(LABELS.barlabel2)
    .call(wrapText, 88, 13)


  pymChild.sendHeight();
};

setTimeout(function() {
  render();
}, 3000);

//first render
render();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var legendText = ["Counties where at least 65% of all students would receive equal or greater funding"];

var { COLORS, wrapText, fmtComma, classify } = require("./lib/helpers");
var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-fetch/dist/d3-fetch.min"),
};

var pymChild;

//Initialize graphic
var onWindowLoaded = function() {
  render();
  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

  });
};

var render = function() {
  var container = "#legend";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderLegend(container);

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderLegend = function(container) {
  var containerElement = d3.select(container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(legendText)
    .range([
      COLORS.teal4,
      COLORS.teal6
    ]);

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(legendText.slice())
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d));

    legend.append("b").style("background-color", d => colorScale(d));
    legend.append("label").text(d => d);
}

// wait for images to load
window.onload = onWindowLoaded;

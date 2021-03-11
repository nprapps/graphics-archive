// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle } = require("./lib/helpers");

var renderBarChart = require("./renderBarMults");

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = window.DATA;
  render(data);

  window.addEventListener("resize", () => render(data));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(container);
  containerElement.html("");

  var charts = data.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  charts.forEach((c) => {
    var chartData = data.filter(function(d, i) {
      return d.chart == c;
    });

    var showLegend = (c == "Overall") ? true : false;
    var showTitle = (c == "Overall") ? false: true;

    containerElement.append("div")
      .attr("class", "chart " + classify(c));

    renderBarChart({
      container: ".chart." + classify(c),
      width,
      data: chartData,
      title: c,
      showLegend,
      showTitle,
      labelColumn: "label",
      valueColumn: "amt"
    });

  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var renderBarChart = require("./renderBars");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};

var { classify } = require("./lib/helpers");

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

  charts.forEach((chart, i) => {
    var chartData = data.filter(function(c) {
      return c.chart == chart;
    });

    containerElement.append("div")
      .attr("class", "chart " + classify(chart));

    var chartTitle = null;
    switch(chart) {
      case "dem":
        chartTitle = "Democratic donors";
        break;
      case "gop":
        chartTitle = "Republican donors";
        break;
    }

    renderBarChart({
      container: ".chart." + classify(chart),
      width,
      data: chartData,
      labelColumn: "label",
      valueColumn: "amt",
      roundTicksFactor: 50000000,
      title: chartTitle
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

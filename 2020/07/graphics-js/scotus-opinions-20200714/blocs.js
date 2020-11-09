// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};
var { classify } = require("./lib/helpers");

var renderBarChart = require("./renderBars");

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

  var containerElement = d3.select(container);
  containerElement.html("");

  // define # of charts
  var charts = data.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  charts.forEach((chart, i) => {
    var chartData = data.filter(function(v, k) {
      return v.chart == chart;
    })

    containerElement.append("div")
      .attr("class", "chart c-" + classify(chart));

    renderBarChart({
      container: ".chart.c-" + classify(chart),
      width,
      data: chartData,
      labelColumn: "label",
      valueColumn: "amt",
      xDomain: [ 0, 100 ],
      title: chart
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

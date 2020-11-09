var thisChart = "percapita";
var roundTicksFactor = 20;
var units = null;

// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

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

  var chartData = data.filter(function(d) {
    return d.chart == thisChart;
  })

  renderBarChart({
    container,
    width,
    data: chartData,
    labelColumn: "label",
    valueColumn: "amt",
    roundTicksFactor,
    chart: thisChart,
    units
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

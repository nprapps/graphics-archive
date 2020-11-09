var thisChart = "casefatality";
var roundTicksFactor = 5;
var units = "percent";

// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var renderBarChart = require("./renderBars");

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = window.DATA;
  var formattedData = formatData(data);
  render(formattedData);

  window.addEventListener("resize", () => render(formattedData));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var formatData = function(data) {
  data.forEach((d, i) => {
    d.amt = Number(d.amt) * 100;
  });
  return data;
}

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

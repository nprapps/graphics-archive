// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var renderBarChart = require("./renderBars");

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = window.DATA;
  var labels = window.LABELS;
  render(data, labels);

  window.addEventListener("resize", () => render(data, labels));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data, labels) {
  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data,
    labels,
    labelColumn: "label",
    valueColumn: "amt"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

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

  var labelWidth = 190;
  if (typeof LABEL_WIDTH != "undefined") {
    labelWidth = LABEL_WIDTH;
  }

  var domainX = [ 0, 60 ];
  if (typeof DOMAIN_X != "undefined") {
    domainX = DOMAIN_X;
  }

  renderBarChart({
    container,
    width,
    data,
    labelColumn: "label",
    valueColumn: "amt",
    labelWidth: labelWidth,
    barHeight: 35,
    domainX: domainX
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

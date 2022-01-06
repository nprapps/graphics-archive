// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var renderSankeyDiagram = require("./renderSankey");

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
  var container = "#sankey-diagram";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderSankeyDiagram({
    container,
    width,
    data
  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

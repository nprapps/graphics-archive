// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var renderBarbellChart = require("./renderBarbells");

// Initialize the graphic.
var onWindowLoaded = function () {
  var data = window.DATA;
  render(data);

  window.addEventListener("resize", () => render(data));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function ({ data, labels }) {
  // Render the chart!
  var container = "#barbell-chart";
  var legend = "#key";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderBarbellChart({
    container,
    legend,
    width,
    data,
    labels,
    labelColumn: "b_code",
    valueColumns: ["b_type", "b_type_nation"],
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

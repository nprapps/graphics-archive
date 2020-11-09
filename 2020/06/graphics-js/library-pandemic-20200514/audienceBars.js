var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderBarChart = require("./renderBarChart");
var { COLORS } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

console.clear();

//Initialize graphic
var onWindowLoaded = function() {
  var grouped = {};

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
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var margins = {
    top: 5,
    right: 150,
    bottom: 20,
    left: 40
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 100;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 40;
  }

  renderBarChart({
    container,
    width,
    data,
    labelColumn: "audience",
    valueColumn: "delta"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

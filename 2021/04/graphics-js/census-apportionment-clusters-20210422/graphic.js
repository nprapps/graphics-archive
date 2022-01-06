var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { makeTranslate } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-force/dist/d3-force.min.js"),
  ...require("d3-selection/dist/d3-selection.js"),
  ...require("d3-transition/dist/d3-transition.js")
};
var { sqrt, PI } = Math;
var pymChild;

var renderHorizontal = require("./renderHorizontal");
var renderVertical = require("./renderVertical");

// Initialize graphic
var onWindowLoaded = function() {
  var data = window.DATA;
  render(data);
  window.addEventListener("resize", () => render(data));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function(data) {
  var container = "#bubble-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  if (isMobile.matches) {
    renderVertical({
      container,
      width,
      data: data
    })
  } else if ((!isMobile.matches)) {
    renderHorizontal({
      container,
      width,
      data: data
    })
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

// Initially load the graphic
window.onload = onWindowLoaded;

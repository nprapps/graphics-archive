console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;
var renderGraphic = require("./renderGraphic");

// Initialize the graphic.
var onWindowLoaded = function() {

  var currentMode = "binary";
  
  var data = window.DATA;
  render(data,currentMode);

  window.addEventListener("resize", () => render(data,currentMode));

  function changeMode(e) {
    currentMode = e.target.value;
    render(data,currentMode);
  }

  document.querySelector(".controls").addEventListener("change", changeMode);


  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};


// Render the graphic(s). Called by pym with the container width.
var render = function(data,mode) {
  // Render the chart!
  var container = "#map";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderGraphic({
    container,
    width,
    data,
    mode
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
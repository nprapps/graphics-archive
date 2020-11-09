// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var renderBarChart = require("./renderBars");

// Initialize the graphic.
var onWindowLoaded = function() {
  var petition = window.PETITION;
  var social = window.SOCIAL;
  var sticker = window.STICKER;
  var march = window.MARCH;


  render(petition, social, sticker, march);

  window.addEventListener("resize", () => render(petition, social, sticker, march));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(petition, social, sticker, march) {
  // Render the chart!
  var container = "#bar-chart-petition";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data: petition,
    labelColumn: "label",
    valueColumn: "amt"
  });


  // Render the chart!
  var container = "#bar-chart-social";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data: social,
    labelColumn: "label",
    valueColumn: "amt"
  });


  // Render the chart!
  var container = "#bar-chart-sticker";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data: sticker,
    labelColumn: "label",
    valueColumn: "amt"
  });


  // Render the chart!
  var container = "#bar-chart-march";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data: march,
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

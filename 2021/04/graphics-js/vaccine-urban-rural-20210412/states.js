// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var { isMobile } = require("./lib/breakpoints");
var renderBarChart = require("./renderBars");

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = window.DATA;
  var shortData = data.filter(d => d.initial);
  data = data.filter(d => d.amt != 0);
  var displayData = shortData;
  document.querySelector(".graphic").classList.add("collapsed");
  render(displayData, window.DATA);

  window.addEventListener("resize", () => render(displayData, window.DATA));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    var expandButton = document.querySelector("button.expander");
    expandButton.addEventListener("click", function(e) {
      var collapsed = displayData == shortData ? true : false;
      expandButton.innerHTML = collapsed ? "Show less ▲" : "Show all ▼";
      document.querySelector(".graphic").classList.toggle("collapsed");
      displayData = collapsed ? data : shortData;
      render(displayData, window.DATA);
      child.sendHeight();
      child.scrollParentToChildEl("bar-chart");
    });
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data, fullData) {

  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data,
    fullData,
    labelColumn: isMobile.matches ? "ap" : "label" ,
    actualColumn: "amt",
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

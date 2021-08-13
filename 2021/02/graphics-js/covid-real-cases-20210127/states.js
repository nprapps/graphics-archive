// Global vars
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild;

var renderBarChart = require("./renderBars");

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = window.DATA;
  var shortData = data.slice(0,10);
  var displayData = shortData;
  render(displayData);

  window.addEventListener("resize", () => render(displayData));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    var expandButton = document.querySelector("button.expander");
    expandButton.addEventListener("click", function(e) {
      var collapsed = displayData == shortData ? true : false;
      expandButton.innerHTML = collapsed ? "Show less" : "Show more";
      displayData = collapsed ? data : shortData;
      render(displayData);
      child.sendHeight();
      child.scrollParentToChildEl("bar-chart");
    });
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {

  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data,
    labelColumn: "label",
    apColumn: "ap",
    actualColumn: "actual_perc",
    reportedColumn: "reported_perc"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

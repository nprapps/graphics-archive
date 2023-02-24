var pym = require("./lib/pym");
require("./lib/webfonts");

// Global vars
var pymChild = null;
var renderStackedBarChart = require("./renderStackedBars");
var skipLabels = ["label", "values"];

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = formatData(window.DATA);
  render(data);

  window.addEventListener("resize", () => render(data));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(input) {
  var data = input.map(function(d) {
    var x0 = 0;

    var { label } = d;
    var values = [];

    for (var name in d) {
      if (skipLabels.indexOf(name) > -1) {
        continue;
      }

      var x1 = x0 + d[name];
      var val = d[name];

      values.push({
        name,
        x0,
        x1,
        val
      });

      x0 = x1;
    }

    return { label, values };

  });

  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderStackedBarChart({
    container,
    width,
    data,
    labelColumn: "label",
    nameColumn: "name"
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

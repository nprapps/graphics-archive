var pym = require("./lib/pym");
require("./lib/webfonts");

// Global vars
var pymChild = null;
var renderStackedBarChart = require("./renderStackedBars");
var skipLabels = ["label", "values", "truefalse"];

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = formatData(window.DATA);
  var dataFalse = formatData(window.DATA_FALSE);
  render(data, dataFalse);

  window.addEventListener("resize", () => render(data, dataFalse));

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
      var tf = d["true_false"]

      values.push({
        name,
        x0,
        x1,
        val,
      });

      x0 = x1;
    }

    return { label, values, tf };

  });

  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data, dataFalse) {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderStackedBarChart({
    container: "#chart2",
    width,
    data,
    labelColumn: "label",
    nameColumn: "name"
  });

  renderStackedBarChart({
    container: "#chart1",
    width,
    data: dataFalse,
    labelColumn: "label",
    nameColumn: "name"
  }, true);

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

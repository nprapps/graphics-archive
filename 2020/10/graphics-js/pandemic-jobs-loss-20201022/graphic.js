var pym = require("./lib/pym");
require("./lib/webfonts");
var skipLabels = ["label", "category", "values", "total"];

var pymChild;
var renderGroupedStackedColumnChart = require("./renderStackedGroupedColumns");

console.clear();

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
  var output = input.map(function(d) {
    var y0 = 0;
    var y1 = 0;
    var total = 0;
    var values = [];
    var { category, label } = d;

    for (var name in d) {
      if (skipLabels.indexOf(name) > -1) {
        continue;
      }

      var val = d[name];
      y1 = y0 + val;
      total += val;

      values.push({
        label: label,
        y0,
        y1,
        val
      });

      y0 = y1;
    }

    return { values, total, category, label };
  });
  console.log(output);

  return output;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  var container = "#stacked-grouped-column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  // Render the chart!
  renderGroupedStackedColumnChart({
    container,
    width,
    data,
    labelColumn: "label"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

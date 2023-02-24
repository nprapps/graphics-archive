var pym = require("./lib/pym");
require("./lib/webfonts");

// Global vars
var pymChild = null;
var renderStackedColumnChart = require("./renderStackedColumn");
var skipLabels = ["label", "values", "total"];
var state = "PA";

console.clear();

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = formatData(window.DATA);
  var medians = formatMedians(window.MEDIANS, state);
  var container = "#column-chart-1";

  render(data, container, medians);

  window.addEventListener("resize", () => render(data, container, medians));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var formatMedians = function(data, state) {
  var output = [];

  data = data.filter(d => d.data_state == state);

  data.forEach(function(row) {
    output.push({
      type: row.standard_app_type,
      label: row.label,
      median: row.med21_weeks
    })
  })

  console.log(output)
  return output;
}

// Format graphic data for processing by D3.
var formatData = function(data) {
  var output = data.map(function(d) {
    var { label } = d;
    var y0 = 0;
    var y1 = 0;
    var values = [];
    var total = 0;

    for (var name in d) {
      if (skipLabels.indexOf(name) > -1) {
        continue;
      }

      var val = d[name];
      y1 = y0 + val;
      total += val;

      values.push({
        label: name,
        y0,
        y1,
        val
      });

      y0 = y1;
    }

    return { values, total, label };
  });

  return output.filter(d => d.total != 0 && d.label <= 48);
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data, container, medians) {
  // var container = "#stacked-column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  // Render the chart!
  renderStackedColumnChart({
    container,
    width,
    data,
    medians,
    labelColumn: "label"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
//(NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

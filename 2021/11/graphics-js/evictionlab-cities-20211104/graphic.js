var pym = require("./lib/pym");
require("./lib/webfonts");
var skipLabels = ["label", "category", "values", "total", "chart"];

var pymChild;
var renderGroupedStackedColumnChart = require("./renderStackedGroupedColumns");

var d3 = {
  ...require("d3-selection")
};
var { classify } = require("./lib/helpers");

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
    var chart = d.chart;

    for (var name in d) {
      if (skipLabels.indexOf(name) > -1) {
        continue;
      }

      var val = d[name] * 100; // since these are percentages
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

    return { values, total, category, label, chart };
  });

  return output;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  var charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq
  console.log(charts);

  console.log(data);

  // Clear existing graphic (for redraw)
  var container = "#stacked-grouped-column-chart";
  var containerElement = d3.select(container);
  containerElement.html("");
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  charts.forEach((c, i) => {
    var chartData = data.filter(d => d.chart == c);

    containerElement.append("div")
      .attr("class", "chart " + classify(c));

    // Render the chart!
    renderGroupedStackedColumnChart({
      container: ".chart." + classify(c),
      width,
      data: chartData,
      labelColumn: "label",
      title: c,
      yDomain: [ 0, 100 ]
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

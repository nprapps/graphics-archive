var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

console.clear();

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "round") continue;

    var values = data.filter(d => d[column]).map(d => ({
      round: d.round,
      amt: d[column] || 0
    }));

    var last = values[values.length - 1];

    series.push({
      name: column,
      values: values,
      finalResult: last.amt
    });
  }

  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data,
    dateColumn: "round",
    valueColumn: "amt"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChartInfections");

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

var annotations = [];

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  
  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    d.date = Number(d.date);
    // d.date = new Date(y, 0, 0);

    annotations.push({
            date: d.date,
            total: d['reconstructed'],
            reported: d['observed'],
            xOffset: d['xOffset'],
            yOffset: d['yOffset'],
            annotate: d['annotate'],
            align: d['align']
          });
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: cToF(d[column])
      }))
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
    annotations,
    dateColumn: "date",
    valueColumn: "amt"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var cToF = function(c) {
  return (c * 9/5);
}

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

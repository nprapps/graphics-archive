var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

var totalSeries = [];
var insiderSeries = [];

//Initialize graphic
var onWindowLoaded = function() {
  // var series = formatData(window.TOTAL);
  // render(series);
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function() {

  TOTAL.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in TOTAL[0]) {
    if (column == "date") continue;

    totalSeries.push({
      name: column,
      values: TOTAL.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  INSIDER.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in INSIDER[0]) {
    if (column == "date") continue;

    insiderSeries.push({
      name: column,
      values: INSIDER.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  // console.log(series);
  // return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#line-chart-total";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container: "#line-chart-total",
    width,
    data: totalSeries,
    max: 1000,
    dateColumn: "date",
    valueColumn: "amt"
  });

  // renderLineChart({
  //   container: "#line-chart-insider",
  //   width,
  //   data: insiderSeries,
  //   max: 100,
  //   dateColumn: "date",
  //   valueColumn: "amt"
  // });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

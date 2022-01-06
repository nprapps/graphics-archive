var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);
  var series2 = formatData(window.DATA_GAS);
  render([series,series2]);

  window.addEventListener("resize", () => render([series,series2]));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // var {data1, data2} = data;
  // console.log(data1)

  // Render the chart!
  var container = "#line-chart1";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data: data[0],
    dateColumn: "date",
    valueColumn: "amt",
    type:"single"
  });

  container = "#line-chart2";
  element = document.querySelector(container);
  width = element.offsetWidth;
  // console.log(width2)
  // console.log(element2)
  // console.log(data[1])
  renderLineChart({
    container,
    width,
    data: data[1],
    dateColumn: "date",
    valueColumn: "amt",
    type:"single"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

var annotations = {
  "FY2021": { "date": "Feb." },
  "FY2020": { "date": "Sept." },
  "FY2019": { "date": "Sept." }
};

var offsets = {
  // "FY2019": 2,
  // "FY2018": 6,
  // "FY2017": 5,
  // "FY2016": 5,
  // "FY2015": 24,
  // "FY2014": 18,
  // "FY2013": -10,
  // "FY2012": -12
}

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

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  // data.forEach(function(d) {
  //   if (d.date instanceof Date) return;
  //   var [m, day, y] = d.date.split("/").map(Number);
  //   y = y > 50 ? 1900 + y : 2000 + y;
  //   d.date = new Date(y, m - 1, day);
  // });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column]
      })).filter(function(d) {
        return d['amt'] != null;
      })
    });
  }

  console.log(series);

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
    dateColumn: "date",
    valueColumn: "amt",
    roundTicksFactor: 5000,
    offsets,
    annotations
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

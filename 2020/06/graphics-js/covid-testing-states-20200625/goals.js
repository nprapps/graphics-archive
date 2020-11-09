var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderGoalChart");

// Initialize the graphic.
var initialize = function() {
  // (NB: Use window.load to ensure all images have loaded)
  window.onload = onWindowLoaded;
}

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

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);

    if (d["7-day rolling average"] == "null") {
      d["7-day rolling average"] = null;
    }

  });
  data = data.filter(d => d.date >= new Date(2020,2,1));

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
  [ "mitigation", "suppression" ].forEach((item, i) => {
    // Render the chart!
    var container = "#" + item + " .chart";
    var element = document.querySelector(container);
    var width = element.offsetWidth;

    var chartData = [];
    var roundTicksFactor = null;
    switch(item) {
      case "mitigation":
        chartData.push(data[0], data[1]);
        roundTicksFactor = 500;
        break;
      case "suppression":
        chartData.push(data[2], data[3]);
        roundTicksFactor = 2000;
        break;
    }

    renderLineChart({
      container,
      width,
      data: chartData,
      dateColumn: "date",
      valueColumn: "amt",
      model: item,
      roundTicksFactor
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

module.exports = initialize;

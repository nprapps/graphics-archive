var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

//Initialize graphic
var onWindowLoaded = function () {
  var series = formatData(window.DATA);
  var labels = window.LABELS;
  render(series, labels);

  window.addEventListener("resize", () => render(series, labels));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function (data) {
  var series = [];

  data.forEach(function (d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);

    if (d["7-day average"] == "null") {
      d["7-day average"] = null;
    }
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column],
      })),
    });
  }

  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function (data, labels) {
  var olympics_start;
  if (labels.olympics_start) {
    var [m, day, y] = labels.olympics_start.split("/").map(Number);
    olympics_start = new Date(y, m - 1, day);
  }

  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data,
    labels: { olympics_start },
    dateColumn: "date",
    valueColumn: "amt",
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

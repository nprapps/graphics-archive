var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");

// Initialize graphic
var onWindowLoaded = function () {
  var series = formatData(window.DATA);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function ({ data, labels }) {
  var series = [];

  data.forEach(function (d) {
    if (d.month instanceof Date) return;
    var [m, day, y] = d.month.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.month = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "month") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        month: d.month,
        value: d[column],
      })),
    });
  }

  return { data: series, labels };
};

// Render the graphic(s). Called by pym with the container width.
var render = function ({ data, labels }) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data,
    labels,
    dateColumn: "month",
    valueColumn: "value",
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

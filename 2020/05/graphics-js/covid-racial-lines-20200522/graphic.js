var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");
var { isMobile } = require("./lib/breakpoints");
var { COLORS } = require("./lib/helpers");

console.clear();

//Initialize graphic
var onWindowLoaded = function() {
  var known = formatData(window.data_known);
  var states = formatData(window.data_states);
  render(known, states);

  window.addEventListener("resize", () => render(known, states));

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

  var ignored = ["date", "original_date"]

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (ignored.includes(column)) continue;

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
var render = function(known, states) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var yFormat = d => `${d * 100}%`;
  var labelFormat = function(d) {
    var item = d.values[d.values.length - 1];
    var value = item.amt;
    var label = value * 100 + "%";

    // if (width > 400) {
    //   label = d.name + ": " + label;
    // }

    return label;
  };

  var margins = {
    top: 5,
    right: 90,
    bottom: 20,
    left: 40
  };

  // Mobile
  if (width < 400) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 30;
  }

  renderLineChart({
    container,
    width,
    data: known,
    yFormat,
    labelFormat,
    margins,
    colors: [COLORS.teal4, COLORS.orange4],
    max: 1,
    dateColumn: "date",
    valueColumn: "amt"
  });

  container = "#step-chart";
  element = document.querySelector(container);
  width = element.offsetWidth;

  yFormat = d => d;
  labelFormat = function(d) {
    var item = d.values[d.values.length - 1];
    var value = item.amt;
    var label = value;

    // if (width > 400) {
    //   label = d.name + ": " + label;
    // }

    return label;
  };

  // margins = {
  //   top: 5,
  //   right: 110,
  //   bottom: 20,
  //   left: 25
  // };

  // // Mobile
  // if (width < 400) {
  //   ticksX = 5;
  //   ticksY = 5;
  //   margins.right = 20;
  // }

  renderLineChart({
    container,
    width,
    data: states,
    yFormat,
    labelFormat,
    margins,
    colors: [COLORS.teal4, COLORS.orange4],
    max: 56,
    area: true,
    dateColumn: "date",
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

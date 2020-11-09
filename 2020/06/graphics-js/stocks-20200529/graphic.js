var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");
var { isMobile } = require("./lib/breakpoints");
var { COLORS } = require("./lib/helpers");

console.clear();

//Initialize graphic
var onWindowLoaded = function() {
  var dow = formatData(window.data_dow);
  var sp = formatData(window.data_sp);
  var unemployment = formatData(window.data_unemployment);
  render(dow, sp, unemployment);

  window.addEventListener("resize", () => render(dow, sp, unemployment));

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
    y = y > 50 ? y : 2000 + y;
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
var render = function(dow, sp, unemployment) {
  // Render the chart!
  var container = "#dow-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var yFormat = d => Math.abs(d) > 999 ? Math.sign(d)*((Math.abs(d)/1000).toFixed(1)) + 'K' : Math.sign(d)*Math.abs(d);
  var labelFormat = function(d) {
    var item = lastItem(d);
    var value = item[valueColumn];
    var label = value.toFixed(1);

    // if (width > 400) {
    //   label = d.name + ": " + label;
    // }

    return label;
  };

  var margins = {
    top: 5,
    right: 100,
    bottom: 20,
    left: 35
  };

  // Mobile
  if (width < 400) {
    ticksX = 5;
    ticksY = 3;
    margins.right = 70;
  }

  renderLineChart({
    container,
    width,
    data: dow,
    yFormat,
    labelFormat,
    margins,
    colors: [COLORS.teal3, COLORS.orange4],
    max: 30000,
    dateColumn: "date",
    valueColumn: "amt"
  });

  container = "#sp-chart";
  element = document.querySelector(container);
  width = element.offsetWidth;

  var yFormat = d => Math.abs(d) > 999 ? Math.sign(d)*((Math.abs(d)/1000).toFixed(1)) + 'K' : Math.sign(d)*Math.abs(d);
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
    data: sp,
    yFormat,
    labelFormat,
    margins,
    colors: [COLORS.teal3, COLORS.orange4],
    max: 3500,
    area: true,
    dateColumn: "date",
    valueColumn: "amt"
  });

  container = "#unemployment-chart";
  element = document.querySelector(container);
  width = element.offsetWidth;

  yFormat = d => Math.abs(d) > 999 ? Math.sign(d)*((Math.abs(d)/1000000).toFixed(1)) + 'M' : Math.sign(d)*Math.abs(d);
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
    data: unemployment,
    yFormat,
    labelFormat,
    margins,
    colors: [COLORS.red3, COLORS.orange4],
    max: 25000000,
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

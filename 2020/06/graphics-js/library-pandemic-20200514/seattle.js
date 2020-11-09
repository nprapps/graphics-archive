var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");
var { COLORS, getAPMonth } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

console.clear();

//Initialize graphic
var onWindowLoaded = function() {
  var series = {};
  var ignore = ["date"];

  window.DATA.forEach(function(row) {
    for (var k in row) {
      if (ignore.includes(k)) continue;
      if (!series[k]) series[k] = [];
      var { date } = row;
      var [m, d, y] = date.split("/").map(Number);
      date = new Date(y, m - 1, d);
      series[k].push({ date, value: row[k] });
    }
  });

  series = Object.keys(series).map(function(name) {
    return {
      name,
      values: series[name]
    }
  });

  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};


// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var margins = {
    top: 15,
    right: 110,
    bottom: 20,
    left: 40
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 10000;
  var yOffset = -10;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    yOffset = 3;
    margins.right = 50;
  }

  var labelFormat = function(d) {
    var first = d.values[0];
    var firstValue = first.value
    var item = d.values[d.values.length - 1];
    var value = item.value;
    var label = value.toLocaleString();

    var increase = value / firstValue * 100 - 100;

    if (!isMobile.matches) {
      label = `${d.name}: ${label} (+${increase.toFixed(1)}%)`;
    }

    return label;
  };
  var xFormat = getAPMonth;
  var yFormat = y => y / 1000 + "K";

  renderLineChart({
    container,
    width,
    data,
    margins,
    labelFormat,
    xFormat,
    yFormat,
    ticksX,
    ticksY,
    roundTicksFactor,
    yOffset,
    strictDates: true,
    colors: [COLORS.teal4, COLORS.orange4, "#333"],
    dateColumn: "date",
    valueColumn: "value"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

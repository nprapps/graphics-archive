var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");
var { COLORS, getAPMonth } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

console.clear();

//Initialize graphic
var onWindowLoaded = function() {
  var grouped = {};
  window.DATA.forEach(function(row) {
    var { format, week, total } = row;
    // if (region == "Other") region = "National";
    if (!grouped[format]) grouped[format] = [];
    var [m, d, y] = row.day.split("/").map(Number);
    var date = new Date(y, m - 1, d);
    total /= 1000;
    grouped[format].push({
      total,
      date
    });
  });

  var series = Object.keys(grouped).map(function(name) {
    return {
      name,
      values: grouped[name]
    }
  });
  series.forEach(function(s) {
    var [ first ] = s.values;
    s.values.forEach(function(d) {
      d.value = d.total / first.total * 100;
    });
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
    top: 5,
    right: 80,
    bottom: 20,
    left: 40
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 100;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 40;
  }

  var labelFormat = function(d) {
    var first = d.values[0];
    var firstValue = first.total
    var item = d.values[d.values.length - 1];
    var value = item.total;
    var label = value.toFixed(1) + "K";

    var increase = (value - firstValue) / firstValue * 100;

    if (!isMobile.matches) {
      label = `${d.name} checkouts: ${label}`;
    }

    return label;
  };

  var yFormat = value => value + "K";

  renderLineChart({
    container,
    width,
    data,
    margins,
    labelFormat,
    yFormat,
    ticksX,
    ticksY,
    roundTicksFactor,
    colors: [COLORS.orange3, COLORS.teal3],
    dateColumn: "date",
    valueColumn: "total"
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

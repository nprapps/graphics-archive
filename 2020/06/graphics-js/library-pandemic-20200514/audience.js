var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");
var { COLORS } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

console.clear();

//Initialize graphic
var onWindowLoaded = function() {
  var grouped = {};
  window.DATA.filter(row => !row.audience.match(/young/i)).forEach(function(row) {
    var { audience, day, total } = row;
    // if (region == "Other") region = "National";
    if (!grouped[audience]) grouped[audience] = [];
    var [m, d, y] = day.split("/").map(Number);
    var date = new Date(y, m - 1, d);
    total /= 1000;
    grouped[audience].push({
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
    right: 150,
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
    margins.right = 45;
  }

  var labelFormat = function(d) {
    var first = d.values[0];
    var firstValue = first.total
    var item = d.values[d.values.length - 1];
    var value = item.total;
    var label = value.toFixed(1) + "K";

    var increase = value / firstValue * 100 - 100;

    if (!isMobile.matches) {
      label = `${d.name}: ${label} checkouts`;
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
    yOffset: -5,
    shadeWeekends: true,
    colors: ["#CCC", "#888", COLORS.red3, COLORS.red5],
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

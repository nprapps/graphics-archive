var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { COLORS } = require("./lib/helpers");
var $ = require("./lib/qsa");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

var pymChild = null;

var render = function () {
  ["48453", "48021"].forEach(function (item, index) {
    renderMaps(item, index);
  });
};

var renderMaps = function (id, index) {
  var containerElement = $.one(".svg-" + index);
  //remove fallback

  var containerWidth = containerElement.offsetWidth;

  var data = DATA.filter(s => String(s.fips).startsWith(id));

  var values = data.map(d => d.percent_white);
  values = values.sort(function (a, b) {
    return a - b;
  });
  values = values.filter(d => (d !== "")).sort(function (a, b) {
    return a - b;
  });
  var median = values[Math.ceil(values.length / 2) -1];
  if (values.length % 2 == 0) {
    var val = values.length / 2 - 1;
    console.log(val, values[val], values[val + 1])
    median = (values[val] + values[val + 1])/2
  }

  var perMin = 0;
  var perMax = 1;

  var fillScale = d3
    .scaleLinear()
    .domain([0, median, 1])
    .range(['#f3684b', '#f2e3b4', '#c789b9']);

  maxDisplay = "100%";
  minDisplay = "0%";
  medianDisplay = (median * 100).toFixed(1) + "%";
  $(".right-label")[index].innerHTML = maxDisplay;
  $(".middle-label")[index].innerHTML = "Overall: " + medianDisplay;
  $(".middle-label")[index].style.left = median * 100 + "%";
  $(".median-line")[index].style.left = median * 100 + "%";
  $(".left-label")[index].innerHTML = minDisplay;

  var medianOffset = median * 100;
  var gradient =
    "linear-gradient(to right," +
    "#f3684b" +
    "," +
    "#f2e3b4" +
    " " +
    median * 100 +
    "%," +
    '#c789b9' +
    ")";
  $(".key")[index].style.background = gradient;

 data.forEach(function (c) {
    var path = containerElement.querySelector(`[id="${c.fips}"]`);
    path.style.fill = !c.percent_white ? "#fff" : fillScale(c.percent_white);
  });

  if (pymChild) {
    pymChild.sendHeight();
  }
};

var onWindowLoaded = function () {
  pym.then(function (child) {
    pymChild = child;
    child.sendHeight();
    window.addEventListener("resize", render);
  });

  render();
};

// wait for images to load
window.onload = onWindowLoaded;

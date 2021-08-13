var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { COLORS } = require("./lib/helpers");
var $ = require('./lib/qsa');

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var pymChild = null;
pym.then(function(child) {
  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", render);
});

var render = function() {
  var containerElement = document.querySelector("svg");
  //remove fallback

  var containerWidth = containerElement.offsetWidth;

  var container = d3.select('.counties');
  
  var demPers = [];
  var mainVars = [];
  DATA.forEach(function(c) {
    mainVars.push(c.Sites)
    demPers.push(c.percent_white)
  })

  var values = DATA.map(d => d.percent_white);
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

    var maxDisplay =  '100%';
    var minDisplay = '0%';
    var medianDisplay = (median* 100).toFixed(1) + '%';
  $.one('.right-label').innerHTML = maxDisplay;
  $.one('.middle-label').innerHTML = 'Overall: ' + medianDisplay;
  $.one('.middle-label').style.left = median * 100 + '%';
  $.one('.median-line').style.left = median * 100 + '%';
  $.one('.left-label').innerHTML = minDisplay;

  var medianOffset = median * 100;
  var gradient =
    'linear-gradient(to right,' +
    '#f3684b' +
    ',' +
    '#f2e3b4' +
    ' ' +
    median * 100 +
    '%,' +
    '#c789b9' +
    ')';
  $.one('.key').style.background = gradient;

  DATA.forEach(function(c) {
    var path = containerElement.querySelector(`[id="${c.fips}"]`);
    path.style.fill = !c.percent_white ? '#fff' : fillScale(c.percent_white); 
  })

  if (pymChild) {
    pymChild.sendHeight();
  }
  
};

//first render
render();

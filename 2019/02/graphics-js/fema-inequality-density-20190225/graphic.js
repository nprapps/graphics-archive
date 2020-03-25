console.clear();

var ANALYTICS = require("./lib/analytics");
var DEFAULT_WIDTH = 300;
var { COLORS, classify, fmtComma, makeTranslate } = require("./lib/helpers");

var pym = require("./lib/pym");
var pymChild = null;
var { isMobile } = require("./lib/breakpoints");
require("./lib/webfonts");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-scale-chromatic/dist/d3-scale-chromatic.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var debounce = require("./lib/debounce");


/*
* Initialize the graphic
*/
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", debounce(render, 100));

  pym.then(function(child) {
    pymChild = child;
    pymChild.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};


/*
 * Process the data once
 */
var formatData = function() {
  CATEGORIES.forEach(function(d,i) {
    var catData = [];
    for (var key in DATA) {
      catData.push(DATA[key][d.data_column]);
    }
    d.data = catData;
  });
}


/*
* Initially render the graphic
*/
var render = function() {
  console.log("render");
  var container = ".graphic";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  element.innerHTML = '';

  var cats = [...new Set(CATEGORIES.map(value => value.category))];

  cats.forEach(function(d,i) {
    var catElement = d3.select(container).append('div')
      .attr('class', 'chart ' + classify(d));

    catElement.append('h3')
      .text(d);

    var subcats = CATEGORIES.filter(function(v, k) {
      return v.category == d;
    });

    catElement.append('h4')
      .text(subcats[0]['explainer']);

    // Render the map!
    renderDensityChart({
      container: '.chart.' + classify(d),
      subcats,
      width
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

var renderDensityChart = function(config) {
  // Setup
  var aspectWidth = isMobile.matches ? 2 : 7;
  var aspectHeight = isMobile.matches ? 1 : 1;

  var numBins = 100;

  var margins = {
    top: 15,
    right: 20,
    bottom: 20,
    left: 55
  };

  var ticksX = [ -50000, 0, 100000, 200000, 300000 ];
  var ticksY = 3;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Create the root SVG element.
  var containerElement = d3.select(config.container);

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Set up scales
  // var colorScale = d3.scaleSequential()
  //   .domain([ -200000, 200000  ]) // input value ranges
  //   .interpolator(d3.interpolateRdYlGn);
  if (config.subcats[0].category == 'Race/Ethnicity') {
    var colorScale = d3.scaleOrdinal()
      .domain(config.subcats.map(value => value.title))
      .range([ COLORS.teal3, COLORS.orange3, COLORS.red3 ]);
  } else {
    var colorScale = d3.scaleOrdinal()
      .domain(config.subcats.map(value => value.title))
      .range([ COLORS.teal1, COLORS.teal3, COLORS.teal5 ]);
  }

  var xScale = d3.scaleLinear()
    .domain([ -50000, 300000 ])
    .range([ 0, chartWidth ]);

  var yScale = d3
    .scaleLinear()
    .domain([ 0, 3000 ])
    .range([ chartHeight, 0 ]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues(ticksX)
    .tickFormat(function(d, i) {
      var val = d/1000;
      var prefix = '';
      if (val > 0) {
        prefix = '+';
      } else if (val < 0) {
        prefix = '-';
      }
      return prefix + '$' + Math.abs(val) + 'k';
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      return fmtComma(d);
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  var yAxisElement = chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  yAxisElement.append('text')
    .text('Number of counties')
    .attr('class', 'axis-label')
    .attr('transform', 'translate(-45,' + (chartHeight / 2) + ')rotate(-90)');

  var trendElement = chartElement.append('g')
    .attr('class', 'trend');

  config.subcats.forEach(function(v,k) {
    // binning JS via https://bl.ocks.org/mbostock/4341954
    var n = v.data.length;
    var bins = d3.histogram().domain(xScale.domain()).thresholds(numBins)(v.data);

    var max = { 'x0': 0, 'x1': 0, 'count': 0 };
    bins.forEach(function(d,i) {
      if (d.length > max.count) {
        max = { 'x0': d.x0, 'x1': d.x1, 'count': d.length };
      }
    });

    trendElement.append("path")
      .attr('class', classify(v.title))
      .datum(bins)
      .attr("d", d3.line()
        // .defined(function(d) { return d.length; })
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d.x0) + ((xScale(d.x1) - xScale(d.x0)) / 2))
        .y(d => yScale(d.length))
      )
      .attr('fill', colorScale(v.title))
      .attr('stroke', colorScale(v.title));

    trendElement.append('text')
      .text(v.title)
      .attr('x', xScale(max.x0) + ((xScale(max.x1) - xScale(max.x0)) / 2))
      .attr('y', yScale(max.count))
      .attr('dy', -10)
      .attr('fill', colorScale(v.title));
  });

  // Render grid to chart.
  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .insert("g", "*")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );
}

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

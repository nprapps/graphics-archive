var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

console.clear();

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

var lastItem = d => d[d.length - 1];

//Initialize graphic
var onWindowLoaded = function() {
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

//Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    d.date = new Date(d.year, 0, 1);
  });

  // Restructure tabular data for easier charting.
  var keys = Object.keys(DATA[0]).filter(c => c[0].match(/[A-Z]/)).reverse();
  var stack = d3.stack().keys(keys).value((d, k) => d[k] * 100);
  var series = stack(DATA);
  // hack, but floating point errors are giving us weird toplines
  series[2].forEach(d => d[1] = 100);
  return [keys, series];
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var [keys, series] = formatData(config.data);

  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 105,
    bottom: 20,
    left: 50
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 40;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = series[0].map(d => d.data.date);
  var extent = [dates[0], lastItem(dates)];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var max = Math.max.apply(null, lastItem(series).map(d => d[1]));
  var min = 0;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(keys)
    .range([
      COLORS.orange3,
      COLORS.blue4,
      COLORS.blue3
    ]);

  // Render the HTML legend.

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(keys.slice().reverse())
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d));

  legend.append("b").style("background-color", d => colorScale(d));

  legend.append("label").text(d => d);

  // Create the root SVG element.

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var svg = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom);

  var chartElement = svg
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return "\u2019" + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d ? d + "%" : "");

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // Render 0 value line.

  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  // Render lines to chart.
  var area = d3
    .area()
    .curve(d3.curveStepAfter)
    .x(d => xScale(d.data.date))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]));

  var line = d3
    .line()
    .x(d => xScale(d.data.date))
    .y(d => yScale(d[1]));

  // slice into two sets, recorded and projected
  var [ recorded, projected ] = [
    d => d.data.date.getFullYear() <= 2016,
    d => d.data.date.getFullYear() >= 2016
  ].map(fn => series.map(s => s.filter(d => fn(d))));

  var grid = 5;
  var size = 2;
  svg.append("defs").html(`
<pattern id="dots" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse" viewBox="0,0,${grid},${grid}">
  <line x1="0" x2="${grid}" y2="0" y1="${grid}" stroke-width="${size}" stroke="white" />
  <line x1="0" x2="${grid}" y2="0" y1="${grid}" stroke-width="${size}" transform="translate(${grid * .5}, ${grid * .5})" stroke="white" />
  <line x1="0" x2="${grid}" y2="0" y1="${grid}" stroke-width="${size}" transform="translate(${-grid * .5} ${-grid * .5})" stroke="white" />
</pattern>
`)

  chartElement
    .append("mask")
    .attr("id", "halftone")
    .append("rect")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .attr("fill", "url(#dots)");


  [recorded, projected].forEach(function(series, index) {
    chartElement
      .append("g")
      .attr("class", "lines")
      .selectAll("path")
      .data(series)
      .enter()
      .append("path")
      .attr("class", (s, i) => `line ${classify(keys[i])} ${index ? "projected" : "recorded"}`)
      .attr("fill", (s, i) => colorScale(keys[i]))
      .attr("d", s => area(s))
      // .attr("mask", () => index ? "url(#halftone)" : "");
  });

  var labels = keys.map(k => k.replace(/^.+?(\d.+)/, (_, d) => d));

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(projected)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d).data.date) + 5)
    .attr("y", d => (yScale(lastItem(d)[0]) + yScale(lastItem(d)[1])) / 2)
    .text(function(d, index) {
      var item = lastItem(d);
      var key = keys[index];
      var value = item.data[key] * 100;
      var label = value + "%";
      var age = labels[index];

      if (!isMobile.matches) {
        label =  age + ": " + label;
      }

      return label;
    });



  // Render grid to chart.
  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

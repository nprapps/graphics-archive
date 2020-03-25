var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var stacked = [];
var pymChild;

var showArea = true;

DATA = DATA.filter(d => d.All);
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

//Initialize graphic
var onWindowLoaded = function() {
  formatData();
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

var annotations = DATA.filter(d => d.annotation);

//Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });
  DATA.sort((a, b) => a.date - b.date);

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (column == "date" || column == "All") continue;

    dataSeries.push({
      name: column,
      values: DATA.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  stacked = d3.stack().keys(["Tweets", "Retweets"])(DATA);
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
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 60,
    right: 10,
    bottom: 20,
    left: 30
  };

  var ticksX = 6;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 4;
    ticksY = 5;
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

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates.pop()];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);
  if (showArea) {
    max = 450;
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.teal3,
      COLORS.orange3
    ]);

  // Render the HTML legend.

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d.name));

  legend.append("b").style("background-color", d => colorScale(d.name));

  legend.append("label").text(d => d.name);

  // Create the root SVG element.

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues([2016, 2017, 2018, 2019].map(y => new Date(y, 0, 1)))
    .tickFormat(d => d.getFullYear());

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

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
  var line = d3
    .line()
    .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  var area = d3
    .area()
    .curve(d3.curveStepBefore)
    .x(d => xScale(d.data.date))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]));

  if (showArea) {
    chartElement
      .append("g")
      .attr("class", "area")
      .selectAll("path")
      .data(stacked)
      .enter()
        .append("path")
        .attr("class", d => "area " + classify(d.key))
        .attr("fill", d => colorScale(d.key))
        .attr("d", d => area(d));
  } else {
    chartElement
      .append("g")
      .attr("class", "lines")
      .selectAll("path")
      .data(config.data)
      .enter()
        .append("path")
        .attr("class", d => "line " + classify(d.name))
        .attr("stroke", d => colorScale(d.name))
        .attr("d", d => line(d.values));
  }


  var lastItem = d => d.values[d.values.length - 1];

  // add annotation lines
  chartElement
    .append("g")
    .attr("class", "annotation-lines")
    .selectAll("path")
    .data(annotations)
    .enter()
      .append("path")
      .attr("d", d => `M${xScale(d.date)},${-margins.top} l0,${chartHeight + margins.top}`);

  chartElement
    .append("g")
    .attr("class", "annotation-labels")
    .selectAll("text")
    .data(annotations)
    .enter()
      .append("text")
      .attr("transform", d => `translate(${xScale(d.date) - 5}, ${-margins.top})`)
      // .attr("x", d => xScale(d.date))
      // .attr("y", 0)
      .html(function(d) {
        return d.annotation.split(/\s/).map((t, i) => `<tspan x=0 dy="${isMobile.matches ? 12 : 16}">${t}</tspan>`).join("");
      })


  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
  //   .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
  //   .text(function(d) {
  //     var item = lastItem(d);
  //     var value = item[valueColumn];
  //     var label = value.toFixed(1);

  //     if (!isMobile.matches) {
  //       label = d.name + ": " + label;
  //     }

  //     return label;
  //   });
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

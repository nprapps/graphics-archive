var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText, fmtComma } = require("./lib/helpers");
var { monthDay, yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 2 : 16;
  var aspectHeight = isMobile.matches ? 1 : 7;

  var margins = {
    top: 5,
    right: 42,
    bottom: 20,
    left: 37
  };

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = config.roundTicksFactor;
  var labelLineHeight = isMobile.matches ? 12 : 14;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var min = 0;

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

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
    .ticks(ticksX)
    .tickFormat(d => monthDay(d));

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

  // render area to chart
  var areaData = [ config.data[0] ]; // new tests
  var area = d3.area()
    .defined(function(d) {
      return d[dateColumn] != null && !isNaN(d[valueColumn]);
    })
    .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y0(chartHeight)
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "area")
    .selectAll("path")
    .data(areaData)
    .enter()
      .append("path")
      .attr("d", d => area(d.values));

  // Render lines to chart.
  var lineData = [ config.data[1] ]; // rolling average
  var line = d3.line()
    .defined(function(d) {
      return d[valueColumn] != null && !isNaN(d[valueColumn]);
    })
    // .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(lineData)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(lineData)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 6)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .text("7-day average")
    .call(wrapText, margins.right - 10, 11);

  //
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(lineData)
  //   .enter()
  //   .append("text")
  //   .attr("x", d => xScale(lastItem(d)[dateColumn]) + 10)
  //   .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3 + labelLineHeight + 2)
  //   .text(function(d) {
  //     var item = lastItem(d);
  //     var value = item[valueColumn];
  //
  //     return fmtComma(value) + " tests/day";
  //   })
  //   .call(wrapText, margins.right - 10, labelLineHeight);
  //
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(lineData)
  //   .enter()
  //   .append("text")
  //   .attr("x", d => xScale(lastItem(d)[dateColumn]) + 10)
  //   .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3 + ((labelLineHeight + 2) * 2))
  //   .text("(7-day average)");
};

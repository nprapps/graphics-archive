var { isMobile } = require("./lib/breakpoints");
var { COLORS, makeTranslate, wrapText } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");
var { dayMonth } = require("./lib/helpers/formatDate");

// Render a column chart.
module.exports = function(config) {
  // Setup chart container
  var { labelColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 16 : 1;
  var aspectHeight = isMobile.matches ? 9 : 1;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 37
  };

  var ticksX = 3;
  var ticksY = 4;
  var roundTicksFactor = 50;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  if (config.title) {
    containerElement.append('h3')
      .text(config.title);
  }
  // containerElement.html("");

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

  // Create D3 scale objects.
  var xScale = d3
    .scaleTime()
    .range([ 0, chartWidth ])
    .domain([ config.data[0][labelColumn], config.data[ config.data.length - 1 ][labelColumn]]);

  var xScaleBars = d3
    .scaleBand()
    .range([ 0, chartWidth ])
    .round(false)
    // .padding(0.1)
    .domain(config.data.map(d => d[labelColumn]));

  // var floors = config.data.map(
  //   d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  // );
  //
  // var min = Math.min(...floors);

  var min = config.yDomain[0];

  if (min > 0) {
    min = 0;
  }

  // var ceilings = config.data.map(
  //   d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  // );
  //
  // var max = Math.max(...ceilings);

  var max = config.yDomain[1];

  var yScale = d3
    .scaleLinear()
    .domain([ min, max ])
    .range([ chartHeight, 0 ]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => dayMonth(d));

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d + '%');

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

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxis
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );

  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
      .append("rect")
      .attr("x", d => xScaleBars(d[labelColumn]) - (xScaleBars.bandwidth() / 4))
      .attr("y", d => (d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn])))
      .attr("width", xScaleBars.bandwidth())
      .attr("height", d =>
        d[valueColumn] < 0
          ? yScale(d[valueColumn]) - yScale(0)
          : yScale(0) - yScale(d[valueColumn])
      )
      .attr("class", function(d) {
        return "bar bar-" + d[labelColumn];
      });

  // Render bars to chart.
  var area = d3.area()
    .defined(function(d) {
      return d[valueColumn] != null && !isNaN(d[valueColumn]);
    })
    .curve(d3.curveStepBefore)
    .x(d => xScale(d[labelColumn]))
    .y0(chartHeight)
    .y1(d => yScale(d[valueColumn]));

  // chartElement
  //   .append("g")
  //   .attr("class", "area")
  //   .selectAll("path")
  //   .data([ config.data ])
  //   .enter()
  //     .append("path")
  //     .attr("d", d => area(d));

  // Render lines to chart.
  var line = d3.line()
    .defined(d => !isNaN(d[valueColumn]))
    .curve(d3.curveMonotoneX)
    .x(d => xScale(d[labelColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data([ config.data_averages ])
    .enter()
      .append("path")
      .attr("d", d => line(d));

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

  if (config.valueColumn == "Trump") {
    chartElement.append("text")
      .attr("class", "annotation")
      .text("Running average of the last 3 briefings")
      .attr("x", xScale(config.data_averages[10][labelColumn]))
      .attr("y", yScale(config.data_averages[10][valueColumn]))
      .attr("dx", 10)
      .attr("dy", 0)
      .call(wrapText, (chartWidth - xScale(config.data_averages[10][labelColumn]) - 20), 12);
  }
};

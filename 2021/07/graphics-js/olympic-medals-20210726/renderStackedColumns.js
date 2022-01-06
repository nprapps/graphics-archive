var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");

var { COLORS, makeTranslate, classify } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a stacked column chart.
module.exports = function(config) {
  // Setup
  var labelColumn = config.labelColumn;

  var aspectWidth = 16;
  var aspectHeight = 4;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 30
  };

  var ticksY = 4;
  var roundTicksFactor = 10;

  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 1;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  var labels = config.data.map(d => d[labelColumn]);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(labels)
    .range([0, chartWidth])
    .padding(0.1);

  var values = config.data.map(d => d.total);

  var min = config.domain[0];
  var max = config.domain[1];

  if (min > 0) {
    min = 0;
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(Object.keys(config['data'][0]).filter(function(d) {
      return d != labelColumn && d != 'values' && d != 'total';
    }))
    .range([ COLORS['teal2'], COLORS['teal3'], COLORS['teal5']]);

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues([ 1912, 1936, 1968, 1992, 2012 ]);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d +'%');

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
    .call(yAxis.tickSize(-chartWidth, 0).tickFormat(""));

  // Render bars to chart.
  var bars = chartElement
    .selectAll(".bars")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", "bar")
    .attr("transform", d => makeTranslate(xScale(d[labelColumn]), 0));

  bars
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("y", d => (d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1)))
    .attr("width", xScale.bandwidth())
    .attr("height", d => Math.abs(yScale(d.y0) - yScale(d.y1)))
    .attr("class", d => classify(d["name"]));

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
};

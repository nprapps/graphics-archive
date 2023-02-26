var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 130,
    bottom: 40,
    left: 35
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 10;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 30;
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

  var extent = [1, 12];

  var xScale = d3
    .scaleLinear()
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

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0])

  var colors = new Array(12).fill("rgba(0, 0, 0, .3");
  var palette = [
    COLORS.teal2,
    COLORS.yellow2,
    COLORS.blue4,
    COLORS.orange3,
    COLORS.teal4,
    COLORS.red4
  ];
  for (var i = 0; i < palette.length; i++) {
    colors[i] = palette[i];
  }

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range(colors);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
    .selectAll("g")
    .data(config.data.filter(d => d.values[d.values.length - 1].amt > 4))
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
    .ticks(ticksX);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d + "%");

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .text("Elimination rounds")
    .attr("x", xScale(6.5))
    .attr("y", chartHeight + 40)
    .attr("class", "x-axis-sub");

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

  // add the 50% victory line
  var victory = chartElement
    .append("line")
    .attr("class", "victory")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", yScale(50))
    .attr("y2", yScale(50));

  chartElement
    .append("text")
    .attr("class", "threshold-label")
    .attr("x", 0)
    .attr("y", yScale(50) - 5)
    .text("Threshold for victory")

  // Render lines to chart.
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data.slice().reverse())
    .enter()
    .append("path")
    .attr("class", d => "line " + (d.finalResult > 4 ? classify(d.name) : "misc"))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  var wrap = require("./lib/helpers/wrapText");
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .attr("fill", d => colorScale(d.name))
    .style("display", d => d.finalResult > 4 ? "" : "none")
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(0) + "%";

      if (!isMobile.matches) {
        label = d.name + ": " + label;
      }

      return label;
    })
    // .call(wrap, margins.right - 5, 14)
};

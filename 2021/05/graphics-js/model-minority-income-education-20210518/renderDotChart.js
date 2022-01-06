console.clear();

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, makeTranslate, classify, formatStyle, colors, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

console.log(makeTranslate)

// Render a bar chart.
module.exports = function(config) {
  // Setup

  var { labelColumn, valueColumn, yColumn, popColumn } = config;

  var barHeight = 20;
  var barGap = 5;
  var labelWidth = 60;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var dotRadius = 5;
  var lineHeight = 13;

  var margins = {
    top: 30,
    right: 20,
    bottom: 20,
    left: 65
  };

  var ticksX = 4;
  var ticksY = 4;
  var roundTicksFactor = .01;

  if (isMobile.matches) {
    ticksX = 6;
    margins.right = 30;
    lineHeight = 12;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

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
  var min = 0;
  var values = config.data.map(d => d[valueColumn]);
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max(...ceilings);
  var min = Math.min(...floors);


  var xScale = d3
    .scaleLinear()
    .domain([0, 100])
    .range([0, chartWidth]);

  // var colorScale = d3.scaleLinear()
  //   .domain([0, max])
  //   .range([COLORS.orange4, COLORS.orange4])
  //   .interpolate(d3.interpolate);



  roundTicksFactor = 50000;

  min = 0;
  values = config.data.map(d => d[yColumn]);
  ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  max = Math.max(...ceilings);
  min = Math.min(...floors);


  var yScale = d3
    .scaleLinear()
    .domain([140000, 40000])
    .range([0, chartHeight]);

  var maxR = 4993935;
  var minR = 119956;

  var rScale = d3
    .scaleLinear()
    .domain([minR, maxR])
    .range([5, 30]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => d + "%");


  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat((d, i) =>  d > 0 ? "$" + d/1000 + "K" : "$" + d);

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartWrapper.select("svg")
    .append("g")
    .attr("class", "y axis")
    .attr("transform", makeTranslate(margins.left, margins.top))
    .call(yAxis);

  chartWrapper.select("svg")
    .append("text")
    .attr("class", 'yaxis-label')
    .text("median household income")
    .attr("x", margins.left - 6 )
    .attr("y", yScale(140000) + 20 + margins.top)
    .call(wrapText, 50, 13);

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxis
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

var yAxisGrid = function() {
    return yAxis;
  };


  // chartElement
  //   .append("g")
  //   .attr("class", "y grid")
  //   .call(
  //     yAxisGrid()
  //       .tickSize(-chartWidth, 0, 0)
  //       .tickFormat("")
  //   );

  // // Render range bars to chart.
  // chartElement
  //   .append("g")
  //   .attr("class", "bars")
  //   .selectAll("line")
  //   .data(config.data)
  //   .enter()
  //   .append("line")
  //   .attr("x1", d => xScale(d[yColumn]))
  //   .attr("x2", d => xScale(d[maxColumn]))
  //   .attr("y1", (d, i) => i * (barHeight + barGap) + barHeight / 2)
  //   .attr("y2", (d, i) => i * (barHeight + barGap) + barHeight / 2);

  // Render dots to chart.
  chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(config.data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[valueColumn]))
    .attr("cy", d => yScale(d[yColumn]))
    .attr("r", d => rScale(d[popColumn]))
    .attr("class", d => classify(d['region']));
    // .attr("fill", d => colorScale(d["region"]));

  // Render text to dots.
  ["shadow", "value"].forEach(function(cls) {
    chartElement
      .append("g")
      .attr("class", "text-labels")
      .selectAll("circle")
      .data(config.data)
      .enter()
      .append("text")
      .attr("class", cls)
      .attr("x", d => xScale(d[valueColumn]) + rScale(d[yColumn]) + d['offset_x'])
      .attr("y", d => yScale(d[yColumn]) + d['offset_y'])
      .text(d => d[labelColumn])
      .call(wrapText, 70, lineHeight)
  })


  chartWrapper.append("div")
    .attr('class', 'xaxis-label')
    .html("Percent of adults age 25 and above with at least a bachelor's degree")
    // .call(wrapText, 200, 13);

  // // Render bar labels.
  // containerElement
  //   .append("ul")
  //   .attr("class", "labels")
  //   .attr(
  //     "style",
  //     formatStyle({
  //       width: labelWidth + "px",
  //       top: margins.top + "px",
  //       left: "0"
  //     })
  //   )
  //   .selectAll("li")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("style", (d, i) =>
  //     formatStyle({
  //       width: labelWidth + "px",
  //       height: barHeight + "px",
  //       left: "0px",
  //       top: i * (barHeight + barGap) + "px;"
  //     })
  //   )
  //   .attr("class", d => classify(d[labelColumn]))
  //   .append("span")
  //   .text(d => d[labelColumn]);

  // // Render bar values.
  // ["shadow", "value"].forEach(function(cls) {
  //   chartElement
  //     .append("g")
  //     .attr("class", cls)
  //     .selectAll("text")
  //     .data(config.data)
  //     .enter()
  //     .append("text")
  //     .attr("x", d => xScale(d[maxColumn]) + 6)
  //     .attr("y", (d, i) => i * (barHeight + barGap) + barHeight / 2 + 3)
  //     .text(d => d[valueColumn].toFixed(1) + "%");
  // });
};

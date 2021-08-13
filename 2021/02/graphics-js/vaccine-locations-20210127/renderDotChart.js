var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
};

var { makeTranslate, classify, formatStyle, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a bar chart.
module.exports = function (config) {
  // Setup

  var { labelColumn, valueColumn, sizeColumn } = config;

  var barHeight = 25;
  var barGap = 5;
  var labelWidth = 60;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var dotRadius = 5;

  var margins = {
    top: 0,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin,
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

  if (isMobile.matches) {
    ticksX = 6;
    margins.right = 30;
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

  var xScale = d3.scaleLinear().domain([min, 300]).range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => d + "%");

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));

  var sizes = config.data.map(d => d[sizeColumn]);
  var ceilingsSizes = sizes.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var sizeMax = Math.max(...ceilingsSizes);

  var radiusFxn = d3.scaleLinear().domain([0, sizeMax]).range([5, 25]);

  // Render dots to chart.
  chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(config.data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[valueColumn]))
    .attr("cy", (d, i) => i * (barHeight + barGap) + barHeight / 2)
    .attr("r", d => radiusFxn(d[sizeColumn]));

  // Render bar labels.
  containerElement
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0",
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px;",
      })
    )
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);

  // Render bar values.
  ["value"].forEach(function (cls) {
    chartElement
      .append("g")
      .attr("class", cls)
      .selectAll("text")
      .data(config.data)
      .enter()
      .append("text")
      .attr(
        "x",
        d => xScale(d[valueColumn]) + xScale(radiusFxn(d[sizeColumn])) / 2 + 12
      )
      .attr("y", (d, i) => i * (barHeight + barGap) + barHeight / 2 + 3)
      .text(function (d) {
        if (d['Major City'] == 'Brookhaven') return `In Dekalb, black residents are ${d[valueColumn].toFixed(0)}% more likely to live further than a mile from a vaccination site`

        return d[valueColumn].toFixed(0) + "%";
      }).call(wrapText, isMobile.matches ? 200 : 300, isMobile.matches ? 10 : 16);
  });
};

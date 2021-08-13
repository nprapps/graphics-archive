var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
};

var $ = require("./lib/qsa");

var {
  makeTranslate,
  classify,
  formatStyle,
  wrapText,
  fmtComma,
} = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a bar chart.
module.exports = function (config) {
  // Setup

  var { labelColumn, valueColumn, sizeColumn } = config;

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 120;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var dotRadius = 5;

  if (isMobile.matches) {
    ticksX = 6;
    labelWidth = 100;
  }

  var margins = {
    top: 35,
    right: 10,
    bottom: 40,
    left: labelWidth + labelMargin,
  };

  if (isMobile.matches) {
    margins.top = 45;
    margins.right = 15;
  }

  var ticksX = 4;
  var roundTicksFactor = 5;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var sizes = config.data.map(d => d[sizeColumn]);
  var ceilingsSizes = sizes.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var sizeMax = Math.max(...ceilingsSizes);

  var radiusFxn = d3.scaleLinear().domain([0, sizeMax]).range([5, 25]);

  var bubbleLegend = d3.select(".bubble-legend");

  [50000, 100000, 250000].forEach(function (a, i) {
    $.one(".bubble-keys." + "b" + i).style.width =
      Math.round(radiusFxn(a) * 2) + "px";
    $.one(".bubble-keys." + "b" + i).style.height =
      Math.round(radiusFxn(a) * 2) + "px";
    $.one(".bubble-keys." + "b" + i).classList.remove("deaths");

    $.one(".bubble-legend-text." + "t" + i).innerHTML = fmtComma(a);
  });

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

  var xScale = d3.scaleLinear().domain([0, 120]).range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => "+" + d + "%");

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .append("text")
    .attr("class", "xaxis-label")
    .attr("x", xScale(50))
    .attr("y", chartHeight + 35)
    .text(LABELS.pitt_xaxis);

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));

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

  chartElement
    .append("g")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("class", "zero-line")
    .attr("x1", xScale(0))
    .attr("x2", d => xScale(d[valueColumn]))
    .attr("y1", (d, i) => i * (barHeight + barGap) + barHeight / 2)
    .attr("y2", (d, i) => i * (barHeight + barGap) + barHeight / 2);

  chartElement
    .append("g")
    .attr("class", "small-dots")
    .selectAll("circle")
    .data(config.data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[valueColumn]))
    .attr("cy", (d, i) => i * (barHeight + barGap) + barHeight / 2)
    .attr("r", "1");

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
    .text(d => d[labelColumn] + ", " + d.State);

  // Render bar values.
  ["value"].forEach(function (cls) {
    chartElement
      .append("g")
      .attr("class", cls)
      .selectAll("text")
      .data(config.data)
      .enter()
      .append("text")
      .attr("x", d => xScale(d[valueColumn]) + radiusFxn(d[sizeColumn]) + 3)
      .attr(
        "y",
        (d, i) =>
          i * (barHeight + barGap) +
          barHeight / 2 +
          (d["Major City"] == "Dallas" ? -8 : 3)
      )
      .text(function (d) {
        if (d["Major City"] == "Dallas")
          return `In Dallas County, Black residents are ${d[
            valueColumn
          ].toFixed(
            0
          )}% more likely to live over 1 mile from a vaccination site than white residents are.`;

        if (d.label == "DeKalb County")
          return "+" + d[valueColumn].toFixed(0) + "% excess risk";
        return "+" + d[valueColumn].toFixed(0) + "%";
      })
      .call(wrapText, isMobile.matches ? 175 : 300, isMobile.matches ? 12 : 16);
  });
};

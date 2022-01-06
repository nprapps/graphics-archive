var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min")
};

var { makeTranslate, classify, formatStyle, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a bar chart.
module.exports = function(config) {
  // Setup

  var { labelColumn, valueColumn, minColumn, maxColumn } = config;

  var barHeight = 60;
  var barGap = 5;
  var labelWidth = 50;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var dotRadius = 5;
  var axisLabelWidthLeft = 400;
  var axisLabelWidthRight = 200;

  var margins = {
    top: 20,
    right: 40,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

  if (isMobile.matches) {
    margins.right = 30;
    ticksX = 5;
    barHeight = 45;
    axisLabelWidthLeft = 200;
    axisLabelWidthRight = 100;
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
  var values = config.data.map(d => d[maxColumn]);
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  // var max = Math.max(...ceilings);
  // var min = Math.min(...floors);

  var min = isMobile.matches ? -120 : -100;
  var max = 60;

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

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
    .call(
      xAxis
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

    // Render axis labels
chartElement
  .append("text")
  .attr("class", "xaxis-label")
  .text("⟵ Underrepresented compared to population")
  .attr("x", xScale(0) - 10)
  .attr("y", -10)
  .attr("text-anchor", "end")
  .call(wrapText, axisLabelWidthLeft, 13);

  chartElement
    .append("text")
    .attr("class", "xaxis-label")
    .text("Overrepresented compared to population ⟶")
    .attr("x", xScale(0) + 10)
    .attr("y", -10)
    .attr("text-anchor", "start")
    .call(wrapText, axisLabelWidthRight, 13);

  // Render range bars to chart.
  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("x1", d => xScale(0))
    .attr("x2", d => xScale(d[valueColumn]))
    .attr("y1", (d, i) => i * (barHeight + barGap) + barHeight / 2)
    .attr("y2", (d, i) => i * (barHeight + barGap) + barHeight / 2)
    .style("stroke-dasharray", ("4, 4"))
    .attr("class", d => classify(d[labelColumn]) + " line");

    // Render zero line
    if (min < 0) {
      chartElement
        .append("line")
        .attr("class", "zero-line")
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("y1", 0)
        .attr("y2", chartHeight);
    }


  // Render people to chart.
  chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("circle")
    .data(config.data)
    .enter()
    .append("svg:image")
    .attr("xlink:href", function(d) {
      if (d[labelColumn] == "AAPI") {
        return "img/person-red.svg";
      }

      if (d[labelColumn] == "Latinx") {
        return "img/person-1.svg";
      }

      if (d[labelColumn] == "Native") {
        return "img/person-3.svg";
      }

      if (d[labelColumn] == "Black") {
        return "img/person-4.svg";
      }

      if (d[labelColumn] == "White") {
        return "img/person-5.svg";
      }
      return "img/person-grey.svg"
    })
    .attr("width", 20)
    .attr("height", 60)
    .attr("x", d => d[valueColumn] > 0 ? xScale(d[valueColumn]) - 15 : xScale(d[valueColumn]) - 4)
    .attr("y", (d, i) => i * (barHeight + barGap) + barHeight / 2 - 30)
    .attr("class", d => classify(d[labelColumn]) + " person");
    // .append("circle")
    // .attr("cx", d => xScale(d[valueColumn]))
    // .attr("cy", (d, i) => i * (barHeight + barGap) + barHeight / 2)
    // .attr("r", dotRadius);

  // Render bar labels.
  containerElement
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
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
        top: i * (barHeight + barGap) + "px;"
      })
    )
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);

  // Render bar values.
  ["shadow", "value"].forEach(function(cls) {
    chartElement
      .append("g")
      .attr("class", cls)
      .selectAll("text")
      .data(config.data)
      .enter()
      .append("text")
      .attr("x", d => d[valueColumn] < 0 ? xScale(d[valueColumn]) - 35 : xScale(d[valueColumn]) + 10)
      .attr("y", (d, i) => i * (barHeight + barGap) + barHeight / 2 + 3)
      .text(d => d[valueColumn].toFixed(0) + "%");
  });
};

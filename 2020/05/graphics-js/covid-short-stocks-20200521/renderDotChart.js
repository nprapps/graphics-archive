var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min")
};

var { makeTranslate, classify, formatStyle, fmtComma } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a bar chart.
module.exports = function(config) {
  // Setup

  var { labelColumn, minColumn, maxColumn } = config;

  config.data = config.data.filter(d => d.display == true );

  var barHeight = isMobile.matches ? 90 : 70;
  var barGap = 5;
  var labelWidth = isMobile.matches ? 200 : 350;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var dotRadius = 5;

  var margins = {
    top: 0,
    right: 5,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 50000;

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
  // var floors = values.map(
  //   v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  // );
  var max = Math.max(...ceilings);
  // var min = Math.min(...floors);

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d) {
      if (d == 0) {
        return "$0";
      } else {
        return "$" + (d / 1000) + "K";
      }
    });

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

  // Render range bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("x1", d => xScale(d[minColumn]))
    .attr("x2", d => xScale(d[maxColumn]))
    .attr("y1", (d, i) => i * (barHeight + barGap) + barHeight / 2)
    .attr("y2", (d, i) => i * (barHeight + barGap) + barHeight / 2);

  // Render bar labels.
  var barLabels = containerElement
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
    .append("span");
  barLabels.append("strong")
    .text(d => d[labelColumn]);
  barLabels.append("i")
    .text(d => d.sector);
  barLabels.append("span")
    .attr("class", "desc")
    .html(d => d.desc);

  // Render bar values.
  var barValues = chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
      .attr("x", function(d) {
        var val = d[minColumn] + ((d[maxColumn] - d[minColumn]) / 2);
        d.xPos = xScale(val);
        return xScale(val);
      })
      .attr("y", (d, i) => i * (barHeight + barGap) + barHeight / 2 + 3)
      .attr("dy", 1)
      .text(d => `${ d.min_display }-${ d.max_display }`);

  barValues.attr("x", function(d) {
    var textWidth = this.getComputedTextLength();
    var thisEl = d3.select(this);
    var xPos = d.xPos - (textWidth / 2); // b/c the label is centered by default

    if (xPos < 0) {
      this.classList.add("left");
      return 6;
    } else {
      return d.xPos;
    }
  });
};

var { isMobile } = require("./lib/breakpoints");

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

// Render a bar chart.
var renderBarChart = function(config) {
  // Setup
  var { labelColumn, valueColumn } = config;

  var barHeight = isMobile.matches ? 50 : 35;
  var barGap = 5;
  var labelWidth = isMobile.matches ? 120 : 185;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  if (config.title) {
    containerElement.append("h3")
      .text(config.title);
  }

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  var min = config.xDomain[0];
  var max = config.xDomain[1];

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
      return d.toFixed(0) + "%";
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
    .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));

  //Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => (d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn])))
    .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("height", barHeight)
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`);

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);
  }

  // Render bar labels.
  var barLabels = chartWrapper
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
    .attr("style", function(d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px"
      });
    })
    .attr("class", function(d) {
      return classify(d[labelColumn]);
    })
    .append("span");
  barLabels.append("b")
    .text(d => d[labelColumn]);
  barLabels.append("i")
    .text(d => d["label_desc"]);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => d[valueColumn].toFixed(0) + "%")
    .attr("x", d => xScale(d[valueColumn]))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dx", function(d) {
      var xStart = xScale(d[valueColumn]);
      var textWidth = this.getComputedTextLength();

      // Negative case
      if (d[valueColumn] < 0) {
        var outsideOffset = -(valueGap + textWidth);

        if (xStart + outsideOffset < 0) {
          d3.select(this).classed("in", true);
          return valueGap;
        } else {
          d3.select(this).classed("out", true);
          return outsideOffset;
        }
        // Positive case
      } else {
        if (xStart + valueGap + textWidth > chartWidth) {
          d3.select(this).classed("in", true);
          return -(valueGap + textWidth);
        } else {
          d3.select(this).classed("out", true);
          return valueGap;
        }
      }
    })
    .attr("dy", barHeight / 2 + 3);
};

module.exports = renderBarChart;

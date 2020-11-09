var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a stacked bar chart.
module.exports = function(config) {
  // Setup
  var { labelColumn, nameColumn } = config;

  var barHeight = 40;
  var barGap = 5;
  var labelWidth = 110;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 30,
    bottom: 0,
    left: labelWidth + labelMargin
  };

  if (config.showAxis) {
    margins.bottom = 20;
  }

  var ticksX = 4;

  if (isMobile.matches) {
    ticksX = 2;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  var min = config.xDomain[0];
  var max = config.xDomain[1];

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data[0].values.map(d => d[nameColumn]))
      // .range([ COLORS.teal2, COLORS.teal4, COLORS.orange3, COLORS.orange5 ]);
      .range([ '#14716f', COLORS['teal4'], '#d4842b', COLORS['orange4'] ]);

  // Render the legend.
  if (config.showLegend) {
    var legend = containerElement
      .append("ul")
      .attr("class", "key")
      .selectAll("g")
      .data(colorScale.domain())
      .enter()
      .append("li")
      .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

    legend.append("b").style("background-color", colorScale);

    legend.append("label").text(d => d);
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
    .attr("transform", `translate(${margins.left},${margins.top})`);


  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d,i) {
      if (d == 30 || d == 400) {
        return d + " " + config.units;
      } else {
        return d;
      }
    });

  if (config.showAxis) {
    // Render axes to chart.
    chartElement
      .append("g")
      .attr("class", "x axis")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxis);
  }

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

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d[labelColumn]))
    .attr(
      "transform",
      (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    );

  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", d => colorScale(d[nameColumn]))
    .attr("class", d => classify(d[nameColumn]));

  // Render bar values.
  group
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(d => (d.val ? d.val : null))
    .attr("class", d => classify(d.name))
    .attr("x", d => xScale(d.x1))
    .attr("dx", function(d) {
      var textWidth = this.getComputedTextLength();
      var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

      // Hide labels that don't fit
      if (textWidth + valueGap * 2 > barWidth) {
        d3.select(this).classed("hidden", true);
      }

      if (d.x1 < 0) {
        return valueGap;
      }

      return -(valueGap + textWidth);
    })
    .attr("dy", barHeight / 2 + 4);

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
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px;"
      })
    )
    .attr("class", d => classify(d[labelColumn]));

  barLabels.append("span")
    .attr("class", "img-wrapper")
    .append("img")
      .attr("src", d => "img/" + d.img);

  barLabels.append("span")
    .text(d => d[labelColumn]);
};

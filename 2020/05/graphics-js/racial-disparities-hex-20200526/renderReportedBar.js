// build our custom D3 object
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");


// Render state cases and deaths bar chart
module.exports = function(config) {

  var filterOut = config.metrics.toString().split(", ").join(",").split(",");
  filterOut.unshift("state_name", "values", "pop");

  config.data.forEach(function(d) {
    var x0 = 0;

    d.values = [];

    for (var key in d) {
      if (filterOut.indexOf(key) > -1) {
        continue;
      }

      if (isNaN(d[key])) {
        var x1 = 0;
        d[key] = 0;
      } else {
        var x1 = x0 + d[key];
      }

      d.values.push({
        name: key,
        x0: x0,
        x1: x1,
        val: d[key] * 100
      });

      // x0 = x1;
    }

  });
  // console.log(config.data[0]);

  // Setup
  var labelColumn = "name";
  var valueColumn = "val"

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 120;
  var labelMargin = 10;
  var valueGap = 5;

  var margins = {
    top: 70,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 100;

  if (isMobile.matches) {
    ticksX = 4;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data[0].values.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  var max = Math.max(...ceilings);
  // var max = 70;

  if (isMobile.matches) {
    max = 72;
  }

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([0, 100])
    .rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(d => filterOut.indexOf(d) == -1)
    )
    .range(["rgb(221,221,221)","rgb(221,221,221)"]);

    // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "lookup-wrapper graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

    var chartTitle = chartElement
      .append("text")
      .attr("class", "chart-title")
      .attr("x", (chartWidth - labelWidth) / 2)
      .attr("y", 0 - (margins.top / 2) - 25)
      .attr("text-anchor", "middle")
      .text(LABELS.lookup_reported_title);

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
  var xAxisGrid = () => xAxis;

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

    // Render bars to chart.
    chartElement
      .append("g")
      .attr("class", "bars")
      .selectAll("rect")
      .data(config.data[0].values)
      .enter()
      .append("rect")
      .attr("x", d => d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn]))
      .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
      .attr("y", (d, i) => i * (barHeight + barGap))
      .attr("height", barHeight)
      .style("fill", d => colorScale(d.name))
      .attr("class", (d, i) => `${classify(d[labelColumn])}`);

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
  chartWrapper
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
    .data(config.data[0].values)
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
    .attr("class", (d, i) => `${classify(d[labelColumn])}`)
    .append("span")
    .html(function(d) {
      var upper = d[labelColumn].charAt(0).toUpperCase() + d[labelColumn].slice(1);
      return upper.replace(/_/g, " ").replace("cases",`<span class="bold">cases</span>`).replace("deaths",`<span class="bold">deaths</span>`)
    });

      // Render bar values
      chartElement
        .append("g")
        .attr("class", "value")
        .selectAll("text")
        .data(config.data[0].values)
        .enter()
        .append("text")
        .text(function(d) {
          if (isNaN(d.val)) {
            return "Not enough data available";
          } else {
            return d.val.toFixed(0) + "%";
          }
        })
        .attr("class", d => classify(d.name))
        .attr("x", d => xScale(d.val) + 5)
        .attr("y", (d, i) => i * (barHeight + barGap))
        .attr("dx", function(d) {
        var xStart = xScale(d[valueColumn]);
        var textWidth = this.getComputedTextLength();

        // Negative case
        if (d.val < 0) {
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
}

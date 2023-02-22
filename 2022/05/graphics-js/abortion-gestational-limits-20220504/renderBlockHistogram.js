
var { isMobile } = require("./lib/breakpoints");
var { makeTranslate, classify, COLORS, wrapText } = require("./lib/helpers");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-axis/dist/d3-axis.min")
};

// Render a bar chart.
module.exports = function(config) {
  // Setup
  var labelColumn = "usps";
  var valueColumn = "amt";

  // console.log(config.data)

  var blockHeight = 24;
  if (isMobile.matches) {
    blockHeight = 18;
  }
  var blockGap = 1;

  var margins = {
    top: 20,
    right: 12,
    bottom: 30,
    left: 10
  };

  var ticksY = 4;

  // Determine largest bin
  var largestBin = Math.max.apply(
    null,
    config.data.map(b => b.length)
  );

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (blockHeight + blockGap) * largestBin;

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
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(config.bins)
    .range([0, chartWidth])
    .padding(0.1);

  var yScale = d3
    .scaleLinear()
    .domain([0, largestBin])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(d => {
      if (!isMobile.matches) {
        return d;
      } else {
        return d;
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis)
    .selectAll(".tick text")
      .attr("transform", makeTranslate(0, 8))
      .call(wrapText, xScale.bandwidth(), 12);

  d3.select(".x.axis .domain").remove();

  // Render grid to chart.
  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );

  var bandwidth = xScale.bandwidth();
  var shift = -(bandwidth / 2) - (bandwidth * 0.1) / 2;
  var tickShift = function(d, i) {
    var existing = this.getAttribute("transform").match(
      /translate\(([^)]+)\)/
    )[1];
    existing = existing.split(",").map(Number);
    existing[0] += shift;
    existing[1] += 3;
    return makeTranslate(...existing);
  };

  // Render bins to chart.
  var bins = chartElement
    .selectAll(".bin")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", (d, i) => "bin bin-" + i)
    .attr("transform", (d, i) => makeTranslate(xScale(config.bins[i]), 0));

  bins
    .selectAll("rect")
    .data(function(d, i) {
      // console.log(d)
      // add the bin index to each row of data so we can assign the right color
      var formattedData = [];
      Object.keys(d).forEach(function(k) {
        var v = d[k];
        formattedData.push({ key: k, value: v.state, parentIndex: i, highlight: v.based_on_pain });
      });
      return formattedData;
    })
    .enter()
    .append("rect")
    .attr("width", xScale.bandwidth())
    .attr("x", 0)
    .attr("y", (d, i) => chartHeight - (blockHeight + blockGap) * (i + 1))
    .attr("height", blockHeight)
    .attr("fill", d => {
      // if (d.value.charAt(d.value.length - 1) == '*') {
      //   return COLORS.teal2;
      // }
      return config.colors[d.parentIndex]
    })
    .attr("class", d => {
      return `${classify(d.value)} ${d.highlight ? 'highlight' : ''}`
    });

  // Render bin values.
  bins
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(function(d) {
      // console.log(d)
      return Object.keys(d).map(key => ({ key, value: d[key].state }));
    })
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", (d, i) => chartHeight - (blockHeight + blockGap) * (i + 1))
    .attr("dy", blockHeight / 2 + 4)
    .text(d => {
      // console.log(d)
      return d.value 
    });

};
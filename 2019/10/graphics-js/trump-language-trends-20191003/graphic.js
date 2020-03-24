var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "total"];
var { COLORS, makeTranslate, classify } = require("./lib/helpers");
console.clear();

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });

    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// Format graphic data for processing by D3.
var formatData = function(data) {
  var keys = Object.keys(data[0]).filter(d => d.match(/^[A-Z]/));
  data.forEach(function(d) {
    var [m, _, y] = d.date.split("/").map(Number);
    d.time = new Date(y, m - 1, 1);
  });
  var stacked = d3.stack()
    .keys(keys)(data);
  return { keys, stacked };
};

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  var container = "#stacked-column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  // Render the chart!
  renderStackedColumnChart({
    container,
    width,
    data: formatData(DATA)
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a stacked column chart.
var renderStackedColumnChart = function(config) {
  // Setup
  var labelColumn = "label";

  var data = config.data.stacked;
  var keys = config.data.keys;
  var dates = data[0].map(d => d.data.time);

  var aspectWidth = 16;
  var aspectHeight = 9;
  var valueGap = 6;

  var margins = {
    top: 25,
    right: 10,
    bottom: 20,
    left: 25
  };

  var ticksX = 6;
  var ticksY = 10;
  var roundTicksFactor = 50;

  if (isMobile.matches) {
    ticksX = 6;
    aspectWidth = 4;
    aspectHeight = 3;
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

  // Create D3 scale objects.
  var xScale = d3
    .scaleTime()
    .domain([dates[0], new Date(2019, 10, 1)])
    .range([0, chartWidth])
    // .padding(0.1);

  var min = 0;
  var max = Math.max.apply(null, data[data.length - 1].map(d => d[1]));

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(keys)
    .range([
      COLORS.teal2,
      COLORS.teal5,
      COLORS.orange3,
      COLORS.orange5
    ]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", function(d, i) {
      return `key-item key-${i} ${classify(d)}`;
    });

  legend.append("b").style("background-color", d => colorScale(d));

  legend.append("label").text(d => d);

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

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(d => d)
    .ticks(ticksX)
    .tickFormat(function(d) {
      return [d.getMonth() + 1, "'" + d.getFullYear().toString().slice(2)].join("/");
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d);

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

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

  // add incomplete shading
  var shadePattern = containerElement.select("svg").append("defs").html(`
<pattern id="cross-hatch" patternUnits="userSpaceOnUse" width="3" height="3" viewBox="0,0,10,10">
  <line x1="0" x2="10" y1="10" y2="0" stroke="black" stroke-width="1">
  <line x1="5" x2="10" y1="10" y2="5" stroke="black" stroke-width="1">
  <line x1="0" x2="5" y1="5" y2="0" stroke="black" stroke-width="1">
</pattern>
  `)
  var shadeStart = Math.round(xScale(new Date(2019, 9, 1))) - 1;
  var shadeWidth = chartWidth - shadeStart;
  var shadeGroup = chartElement.append("g");

  shadeGroup
    .append("rect")
    .attr("class", "projection")
    .attr("x", shadeStart)
    .attr("y", 0)
    .attr("width", shadeWidth)
    .attr("height", chartHeight)

  shadeGroup
    .append("path")
    .attr("d", `M${shadeStart},-2 l0,-4 l${shadeWidth},0 l0,4 M${shadeStart + shadeWidth * .5},-6 l0,-6`)
    .attr("stroke", "black")
    .attr("fill", "none")

  shadeGroup
    .append("text")
    .style("font-size", "12")
    .attr("y", -15)
    .attr("x", chartWidth)
    .attr("text-anchor", "end")
    .text("OCT. 1-3")
    .attr("fill", "#555")

  // Render bars to chart.
  data.forEach(function(series) {

    var barWidth = chartWidth / series.length - 1;

    chartElement
      .append("g")
      .attr("class", "series " + classify(series.key))
      .selectAll("rect")
      .data(series)
      .enter()
        .append("rect")
        .attr("x", d => xScale(d.data.time))
        .attr("width", barWidth)
        .attr("y", d => yScale(d[1]))
        .attr("height", d => yScale(d[0]) - yScale(d[1]))
        .attr("fill", colorScale(series.key))

  });





  // var bars = chartElement
  //   .selectAll(".bars")
  //   .data(config.data)
  //   .enter()
  //   .append("g")
  //   .attr("class", "bar")
  //   .attr("transform", d => makeTranslate(xScale(d[labelColumn]), 0));

  // bars
  //   .selectAll("rect")
  //   .data(d => d.values)
  //   .enter()
  //   .append("rect")
  //   .attr("y", d => d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1))
  //   .attr("width", xScale.bandwidth())
  //   .attr("height", d => Math.abs(yScale(d.y0) - yScale(d.y1)))
  //   .style("fill", d => colorScale(d.name))
  //   .attr("class", d => classify(d.name));

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

  // Render values to chart.
  // bars
  //   .selectAll("text")
  //   .data(function(d) {
  //     return d.values;
  //   })
  //   .enter()
  //   .append("text")
  //   .text(d => d.val)
  //   .attr("class", d => classify(d.name))
  //   .attr("x", xScale.bandwidth() / 2)
  //   .attr("y", function(d) {
  //     var textHeight = this.getBBox().height;
  //     var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));

  //     if (textHeight + valueGap * 2 > barHeight) {
  //       d3.select(this).classed("hidden", true);
  //     }

  //     var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;

  //     return barCenter + textHeight / 2;
  //   })
  //   .attr("text-anchor", "middle");
};

// Initially load the graphic
//(NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

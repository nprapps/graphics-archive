var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var charts = [];

// Global vars
var pymChild = null;
// var skipLabels = ["label", "values", "offset", "chart", "party", "incumbent"];

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle } = require("./lib/helpers");

var onWindowLoaded = function() {
  // render();
  //
  // window.addEventListener("resize", render);
  //
  // pym.then(child => {
  //   pymChild = child;
  //   child.sendHeight();
  // });

  pym.then(child => {
      child.sendHeight();

      window.addEventListener("resize", () => child.sendHeight());
  });
}

// Render graphic
var render = function(data) {
  // Render chart
  var container = "#lollipop-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  DATA.forEach(function(d) {
    var chartData = d;
    // console.log(chartData);

    containerElement.append('div')
      .attr('class', 'chart ' + classify(d.label));

    renderLollipopChart({
      container: container + ' .chart.' + classify(d.label),
      width,
      data: chartData,
      title: d.label
    });
  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderLollipopChart = function(config) {
  // Setup
  var lollipopHeight = 30;
  var lollipopGap = 5;

  var labelWidth = config.width / 2;
  var labelMargin = 6;

  var margins = {
    top: 0,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  // Chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = lollipopHeight + lollipopGap;

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
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  var min = config.data.min;
  var max = config.data.max;
  var middle = ((min + max) / 2).toFixed(1);

  var xScale = d3
    .scaleLinear()
    .domain([0, 100])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues([0, 50, 100])
    .tickFormat(function(d) {
      if (config.data.percent == "percent") {
        return d + "%";
      }

      if (config.data.percent == "year") {
        return d + " years";
      }

      return d;
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render lollipops
  var group = chartElement
    .append("g")
    .attr("class", "lollipop-group")
    .attr("transform", makeTranslate(0, lollipopHeight));

  // Lines
  group
    .append("line")
    .attr("x1", xScale(config.data.tract_a))
    .attr("x2", xScale(config.data.tract_d))
    .attr("y1", -lollipopHeight / 2)
    .attr("y2", -lollipopHeight / 2)
    .attr("stroke", "grey")
    .attr("stroke-width", "1px");

  // First circle
  group
    .append("circle")
    .attr("cx", xScale(config.data.tract_a))
    .attr("cy", -lollipopHeight / 2)
    .attr("r", 6)
    .style("fill", COLORS.blue2);

  // Second circle
  group
    .append("circle")
    .attr("cx", xScale(config.data.tract_d))
    .attr("cy", -lollipopHeight / 2)
    .attr("r", 6)
    .style("fill", COLORS.orange3);

  // Chart label
  chartWrapper
    .append("h3")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
      })
    )
    .text(config.data.label);

};

// wait for images to load
window.onload = onWindowLoaded;

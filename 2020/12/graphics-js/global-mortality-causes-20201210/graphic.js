var pym = require("./lib/pym");
var pymChild;
require("./lib/webfonts");

console.clear();

var $ = require("./lib/qsa");
var { isMobile } = require("./lib/breakpoints");
var COLORS = require("./lib/helpers/colors");
var wrapText = require("./lib/helpers/wrapText");
var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale/dist/d3-scale.min")
};

pym.then((child) => {
  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", () => child.sendHeight());
});

var colorScale = function (d) {
  if (d.delta == 0) return "black";
  if (d.delta > 0) return COLORS.teal3;
  if (d.delta < 0) return COLORS.red3;
};

var classify = (s = "") => s.toLowerCase().replace(/[^a-z]/g, "-");

var render = function () {
  var container = $.one(".slopegraph");

  var data = window.DATA;
  var labels = window.LABELS;

  var width = container.offsetWidth;

  renderSlopeGraph({
    container,
    data,
    labels,
    width
  });

  if (pymChild) pymChild.sendHeight();
};

/*
 * Render a line chart.
 */
var renderSlopeGraph = function (config) {
  /*
   * Setup
   */
  var labelColumn = "label";
  var startYear = "2000";
  var endYear = "2019";

  var startLabel = config.labels.start_label;
  var endLabel = config.labels.end_label;

  var maxWidth = 250;
  var minWidth = 20;
  var minMargin = 140;

  var margins = {
    top: 30,
    right: 2, // this is a ratio, not an actual margin
    bottom: 20,
    left: 3
  };

  var ticksX = 2;
  var ticksY = 10;
  var roundTicksFactor = 4;
  var dotRadius = 3;
  var labelGap = 35;
  var labelLineHeight = isMobile.matches ? 10 : 12;

  // Calculate actual chart dimensions
  var clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  var chartWidth = clamp(config.width - minMargin * 2, minWidth, maxWidth);
  var remaining = config.width - chartWidth;
  if (chartWidth == maxWidth) {
    margins.left = margins.right = remaining / 2;
  } else {
    var totalRatio = margins.right + margins.left;
    margins.left = remaining * (margins.left / totalRatio);
    margins.right = remaining * (margins.right / totalRatio);
  }

  var chartHeight = 600;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  /*
   * Create D3 scale objects.
   */

  var values = config.data.flatMap((d) => [d[2000].cdr, d[2019].cdr]);

  var min =
    Math.floor(Math.min(...values) / roundTicksFactor) * roundTicksFactor;
  var max =
    Math.ceil(Math.max(...values) / roundTicksFactor) * roundTicksFactor;

  var yScale = d3.scaleLog().domain([min, max]).range([chartHeight, 0]);

  var sortByYear = function(year) {
    return (a, b) => b[year].cdr - a[year].cdr;
  };

  var sorted2000 = config.data.slice().sort(sortByYear(2000));
  var sorted2019 = config.data.slice().sort(sortByYear(2019));

  containerElement.append("ul")
    .attr("class", "key")
    .selectAll("li")
    .data([
      { label: config.labels.key_decreased, delta: 1 },
      { label: config.labels.key_increased, delta: -1 }
    ])
    .enter()
    .append("li")
    .attr("class", "key-item")
    .html(d => `
      <i class="dot" style="background-color: ${colorScale(d)}"></i>
      ${d.label}
    `);

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  /*
   * Render lines to chart.
   */
  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("class", function (d, i) {
      return "line ";
    })
    .attr("x1", 0)
    .attr("y1", function (d) {
      return yScale(d[startYear].cdr);
    })
    .attr("x2", chartWidth)
    .attr("y2", function (d) {
      return yScale(d[endYear].cdr);
    })
    .style("stroke", colorScale);

  /*
   * Render dots to chart.
   */
  chartElement
    .append("g")
    .attr("class", "dots start")
    .selectAll("circle")
    .data(config.data)
    .enter()
    .append("circle")
    .attr("cx", 0)
    .attr("cy", function (d) {
      return yScale(d[startYear].cdr);
    })
    .attr("class", function (d) {
      return ""; //classify(d[labelColumn]) + ' ' + classify(d.change);
    })
    .attr("r", dotRadius)
    .style("fill", colorScale);

  chartElement
    .append("g")
    .attr("class", "dots end")
    .selectAll("circle")
    .data(config.data)
    .enter()
    .append("circle")
    .attr("cx", chartWidth)
    .attr("cy", function (d) {
      return yScale(d[endYear].cdr);
    })
    .attr("class", function (d) {
      return ""; //classify(d[labelColumn]) + ' ' + classify(d.change);
    })
    .attr("r", dotRadius)
    .style("fill", colorScale);

  /*
   * Render values.
   */
  [sorted2000, sorted2019].forEach(function(year, end) {
    var prop = end ? endYear : startYear;

    var spacing = isMobile.matches ? 5 : 10;

    var wrap = end ? wrapText : () => {};

    // text labels
    var textGroup = chartElement
      .append("g")
      .attr("class", `value ${end ? "end" : "start"}`);
      
    textGroup
      .selectAll("text")
      .data(year)
      .enter()
      .append("text")
      .attr("x", end ? chartWidth : 0)
      .attr("y", d => yScale(d[prop].cdr) + 4)
      .attr("text-anchor", end ? "begin" : "end")
      .attr("dx", end ? spacing : -spacing)
      .attr("class", function (d) {
        return ""; //classify(d[labelColumn]) + ' ' + classify(d.change);
      })
      .attr("fill", colorScale)
      .text(d => (end ? [d[prop].cdr, d.cause] : [d.cause, d[prop].cdr]).join(" "))
      .call(wrap, margins.right - spacing, labelLineHeight)

    // adjust and record placement
    var labels = $(`.value.${end ? "end" : "start"} text`);
    for (var i = 1; i < labels.length; i++) {
      // is this colliding with the previous?
      var l = labels[i];
      var prev = labels[i - 1];
      var lBox = l.getBBox();
      var pBox = prev.getBBox();
      var pBottom = pBox.y + pBox.height;
      if (lBox.y < pBottom) {
        var diff = pBottom - lBox.y;
        var current = l.getAttribute("y") * 1;
        var updated = current + diff;
        l.setAttribute("y", updated);
        var spans = l.querySelectorAll("tspan");
        spans.forEach(s => s.setAttribute("y", updated));
      }
    }

    // add CDR note
    if (!end) {
      var topItem = $.one("text", textGroup.node());
      var topBox = topItem.getBBox();
      textGroup.append("text")
        .attr("x", -1)
        .attr("text-anchor", "end")
        .attr("y", topBox.y + topBox.height + 10)
        .text("(110 deaths per 100,000)")
        .attr("fill", colorScale({ delta: -1 }));
    }

    // add the top year labels
    chartElement
      .append("text")
      .attr("class", "axis")
      .attr("x", end ? chartWidth : 0)
      .attr("y", -20)
      .attr("text-anchor", end ? "begin" : "end")
      .text(end ? endYear : startYear);
  });

};

window.addEventListener("resize", render);
render();

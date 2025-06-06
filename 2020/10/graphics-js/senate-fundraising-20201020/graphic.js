var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var charts = [];

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "offset", "chart", "party", "incumbent"];

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle } = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    var x0 = 0;
    var party = d.party;

    d.values = [];

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      d[key] = d[key];

      var x1 = x0 + d[key];

      d.values.push({
        name: key,
        party: party,
        x0: x0,
        x1: x1,
        val: d[key]
      });

      x0 = x1;
    }
  });

  charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq
  console.log(charts);
  console.log(DATA);
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = isMobile.matches ? element.offsetWidth : element.offsetWidth / 2 - 20;

  var containerElement = d3.select(container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(["Democrat", "Republican", "Independent"])
    .range([ COLORS.blue2, COLORS.red3, "#15b16e"]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
      .append("li")
      .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  legend.append("b")
    .style("background-color", colorScale);

  legend.append("label").text(d => d);

  charts.forEach(function(d,i) {
    var chartData = DATA.filter(function(v) {
      return v.chart == d;
    });

    console.log(chartData);

    containerElement.append('div')
      .attr('class', 'chart ' + classify(d));

    var showLegend =  false;
    var showTitle =  true;

    renderStackedBarChart({
      container: container + ' .chart.' + classify(d),
      width,
      data: chartData,
      colorScale,
      xDomain: [ -95, 95 ],
      title: d,
      showLegend,
      showTitle
    });
  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderLegend = function(config) {
  var containerElement = d3.select(config.container);
  var colorScale = config.colorScale;

  // Render the legend.
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

// Render a stacked bar chart.
var renderStackedBarChart = function(config) {
  // Setup
  var labelColumn = "label";

  // var barHeight = 55;
  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 70;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 2;
  var roundTicksFactor = 20;

  if (isMobile.matches) {
    ticksX = 2;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  if (config.title && config.showTitle) {
    containerElement.append('h3')
      .html(config.title);
  }

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  // var max = Math.max(...ceilings);
  var max = 40;

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([min, 100])
    .rangeRound([0, chartWidth]);

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
    .tickFormat(d => "$" + d + "M");

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
    .attr("class", d => d.party);

  // Render bar values.
  group
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(function(d) {
      return "$" + d.val + "M";
    })
    .attr("class", d => classify(d.name))
    .attr("x", d => xScale(d.x1))
    .attr("dx", function(d) {
      var xStart = xScale(d.val);
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
    .text(function(d) {
      if (d.incumbent) {
        return d.incumbent + " " + d[labelColumn];
      }
      return d[labelColumn];
    });
};
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

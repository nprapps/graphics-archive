var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var skipLabels = ["Group", "key", "values"];

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
    pymChild.sendHeight();

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
var formatData = function() {
  DATA.forEach(function(d) {
    d.key = d.Group;
    d.values = [];

    Object.keys(d).forEach(function(k) {
      var v = d[k];
      if (skipLabels.indexOf(k) > -1) {
        return;
      }

      d.values.push({ label: k, amt: +v });
      delete d[k];
    });

    delete d.Group;
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#grouped-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderGroupedBarChart({
    container,
    width,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderGroupedBarChart = function(config) {
  // Setup chart container.
  var labelColumn = "label";
  var valueColumn = "amt";

  var numGroups = config.data.length;
  var numGroupBars = config.data[0].values.length;

  var barHeight = 25;
  var barGapInner = 2;
  var barGap = 10;
  var groupHeight = barHeight * numGroupBars + barGapInner * (numGroupBars - 1);
  var labelWidth = 95;
  var labelMargin = 3;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 7;
  var roundTicksFactor = 5;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    ((barHeight + barGapInner) * numGroupBars - barGapInner + barGap) *
      numGroups -
    barGap +
    barGapInner;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Create D3 scale objects.
  var values = config.data
    .reduce((acc, d) => acc.concat(d.values), [])
    .map(d => d[valueColumn]);
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min(...floors);
  var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  var yScale = d3.scaleLinear().range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0].values).filter(
        d => skipLabels.indexOf(d) == -1
      )
    )
    .range([COLORS.teal3]);
  // Render a color legend.
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(config.data[0].values)
  //   .enter()
  //   .append("li")
  //   .attr("class", function(d, i) {
  //     return `key-item key-${i} ${classify(d[labelColumn])}`;
  //   });
  //
  // legend.append("b").style("background-color", d => colorScale(d[labelColumn]));
  //
  // legend.append("label").text(d => d[labelColumn]);

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
    .tickFormat(d => d.toFixed(0) + "%");

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
  var barGroups = chartElement
    .selectAll(".bars")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", "g bars")
    .attr("transform", (d, i) =>
      makeTranslate(0, i ? (groupHeight + barGap) * i : 0)
    );

  barGroups
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn])))
    .attr("y", (d, i) => (i ? barHeight * i + barGapInner * i : 0))
    .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
    .attr("height", barHeight)
    .style("fill", d => colorScale(d[labelColumn]))
    .attr("class", d => "y-" + d[labelColumn]);

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
    .attr("style", function(d, i) {
      var top = (groupHeight + barGap) * i;

      if (i == 0) {
        top = 0;
      }

      return formatStyle({
        width: labelWidth - 10 + "px",
        height: barHeight + "px",
        left: "0px",
        top: top + "px;"
      });
    })
    .attr("class", d => classify(d.key))
    .append("span")
    .text(d => d.key);

  // Render bar values.
  barGroups
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(function(d) {
      var v = d[valueColumn].toFixed(0);

      if (d[valueColumn] > 0 && v == 0) {
        v = "<1";
      }

      return v + "%";
    })
    .attr("x", d => xScale(d[valueColumn]))
    .attr("y", (d, i) => (i ? barHeight * i + barGapInner : 0))
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
    .attr("dy", barHeight / 2 + 4);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

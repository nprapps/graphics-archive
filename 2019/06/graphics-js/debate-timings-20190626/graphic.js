// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-ease/dist/d3-ease.min"),
  ...require("d3-transition/dist/d3-transition.min")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  fmtData();
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

var fmtData = function() {
  DATA = DATA.filter(function(d,i) {
    CANDIDATES.forEach(function(v,k) {
      if (v.last == d.value) {
        for (key in v) {
          d[key] = v[key];
        }
      }
    });

    var elapsed = Number(d['SUM of elapsed']);

    d.minutes = Math.floor(elapsed / 60);
    d.seconds = elapsed - (d.minutes * 60);
    d.elapsed = Number(d['SUM of elapsed']) / 60;
    return d.value != 'Nobody' && d.value != '' && d.value != 'Cross-talk';
  });
}

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  // var width = element.offsetWidth;
  var width = 400;

  renderBarChart({
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
var renderBarChart = function(config) {
  // Setup
  var labelColumn = "value";
  var valueColumn = "elapsed";

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 60;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

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
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  var floors = config.data.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max.apply(null, ceilings);

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
      return d.toFixed(0) + ' min.';
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = function() {
    return xAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  //Render bars to chart.
  var t = d3.transition()
    .duration(750)
    .ease(d3.easeLinear);

  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
      .append("rect")
        .attr("x", d => d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn]))
        // .attr("width", 0)
        .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
        .attr("y", (d, i) => i * (barHeight + barGap))
        .attr("height", barHeight)
        .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`)
        // .transition(t)
        //   .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])));

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
    .append("span")
    .text(d => d[labelColumn]);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(function(d, i) {
      // var minSuffix = d.minutes == 1 ? ' minute' : ' minutes';
      // var secSuffix = d.seconds == 1 ? ' second' : ' seconds';
      var minSuffix = ' min.';
      var secSuffix = ' sec.';
      return d.minutes + minSuffix + ', ' + d.seconds + secSuffix;
    })
    .attr('class', d => classify(d[labelColumn]))
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

// Initially load the graphic
window.onload = onWindowLoaded;

// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var charts = [];

var { COLORS, fmtComma, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  // via https://stackoverflow.com/questions/25726066/equivalent-of-underscore-pluck-in-pure-javascript
  charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)).sort(); // dedupe / _.uniq

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

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var graphicWidth = width;
  // var gutterWidth = 22;
  // if (!isMobile.matches) {
  //   graphicWidth = Math.floor((width - gutterWidth) / 2);
  // }

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(container);
  containerElement.html("");

  charts.forEach(function(d, i) {
    var chartData = DATA.filter(function(v,k) {
      return v['chart'] == d;
    });

    var chartElement = containerElement.append('div')
      .attr('class', 'chart ' + classify(d));

    // if (!isMobile.matches) {
    //   chartElement.attr('style', function() {
    //     var s = '';
    //     s += 'width: ' + graphicWidth + 'px; ';
    //     s += 'float: left; ';
    //     if (i > 0) {
    //       s += 'margin-left: ' + gutterWidth + 'px; ';
    //     }
    //     return s;
    //   });
    // }

    renderBarChart({
      container: container + ' .chart.' + classify(d),
      width: graphicWidth,
      chartId: d,
      data: chartData,
      title: LABELS['hed_' + d]
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderBarChart = function(config) {
  // Setup
  var labelColumn = "label";
  var valueColumn = "amt";

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 30;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;

  var roundTicksFactor = 100;
  if (config['chartId'] == 'number') {
    roundTicksFactor = 10000000;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  // containerElement.append('h3')
  //   .html(config['title']);

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
      if (config['chartId'] == 'number') {
        if (d == 0) {
          return d;
        } else {
          return (d/1000000).toFixed(0) + 'M';
        }
      } else {
        return d.toFixed(0) + "%";
      }
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
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
      .attr("x", d => d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn]))
      .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
      .attr("y", (d, i) => i * (barHeight + barGap))
      .attr("height", barHeight)
      .attr("class", (d, i) => `bar-${i} y-${classify(d[labelColumn])}`);

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
    .text(d => config.chartId == 'number' ? (d[valueColumn]/1000000).toFixed(1) + 'M' : d[valueColumn].toFixed(0) + "%")
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

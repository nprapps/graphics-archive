console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

//Initialize graphic
var onWindowLoaded = function() {
  formatData();
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

//Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    d.before = Number(d.before);
    d.after = Number(d.after);
    d.diff = Number(d.diff);
  });
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  var numCols = isMobile.matches ? 2 : 3;
  var gutterWidth = 22;
  var graphicWidth = Math.floor((width - ((numCols - 1) * gutterWidth)) / numCols);

  DATA.forEach(function(d, i) {
    var thisContainer = containerElement.append('div')
      .attr('class', 'chart ' + classify(d.city));

    thisContainer.attr('style', function() {
      var s = '';
      s += 'width: ' + graphicWidth + 'px; ';
      if (i % numCols > 0) {
        s += 'margin-left: ' + gutterWidth + 'px;';
      }
      return s;
    });

    renderLineChart({
      container: '.chart.' + classify(d.city),
      width: graphicWidth,
      data: d,
      title: d.city
    });
  })

  // align heds
  var labelHeds = d3.selectAll('h3');
  var labelMaxHeight = 0;
  labelHeds._groups[0].forEach(function(d,i) {
    var thisHeight = d.getBoundingClientRect().height;
    if (thisHeight > labelMaxHeight) {
      labelMaxHeight = thisHeight;
    }
  });
  labelHeds.style('height', labelMaxHeight + 'px');

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var beforeColumn = "before";
  var afterColumn = "after";

  var aspectWidth = 1.5;
  var aspectHeight = 1;

  var margins = {
    top: 5,
    right: 60,
    bottom: 40,
    left: 40
  };

  if (isMobile.matches) {
    margins.left = 28;
    margins.right = 55;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  // title
  var hed = containerElement.append('h3')
    .text(config.title)
    .attr('style', function(d) {
      var s = '';
      s += 'margin-left: ' + margins.left + 'px; ';
      s += 'margin-right: ' + margins.right + 'px; ';
      return s;
    });

  hed.append('span')
    .text(config.data.implemented);

  var xScale = d3
    .scaleOrdinal()
    .domain([ beforeColumn, afterColumn ])
    .range([0, chartWidth]);

  var yScale = d3
    .scaleLinear()
    .domain([ 0, 100 ])
    .range([chartHeight, 0]);

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
    .tickFormat(function(d,i) {
      return d;
    });

  // var yAxis = d3
  //   .axisLeft()
  //   .ticks(5)
  //   .scale(yScale);

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  var axisDates = chartElement.append('g')
    .attr('class', 'axis x dates');

  axisDates.append('text')
    .text(config.data.before_date)
    .attr('x', xScale(beforeColumn))
    .attr('y', chartHeight + 32);

  axisDates.append('text')
    .text(config.data.after_date)
    .attr('x', xScale(afterColumn))
    .attr('y', chartHeight + 32);

  // chartElement
  //   .append("g")
  //   .attr("class", "y axis")
  //   .call(yAxis);

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

  // Render lines to chart.
  var sentElement = chartElement.append('g')
    .attr('class', 'sentiment');

  sentElement.append('path')
    .attr('d', function() {
      var val = '';
      val += ' M ' + xScale(beforeColumn) + ' ' + yScale(0);
      val += ' L ' + xScale(afterColumn) + ' ' + yScale(0);
      val += ' L ' + xScale(afterColumn) + ' ' + yScale(config.data[afterColumn]);
      val += ' L ' + xScale(beforeColumn) + ' ' + yScale(config.data[beforeColumn]);
      val += ' L ' + xScale(beforeColumn) + ' ' + yScale(0);
      return val;
    });

  sentElement.append('line')
    .attr('x1', xScale(beforeColumn))
    .attr('x2', xScale(afterColumn))
    .attr('y1', yScale(config.data[beforeColumn]))
    .attr('y2', yScale(config.data[afterColumn]));

  sentElement.append('text')
    .attr('class', 'before')
    .text(config.data[beforeColumn].toFixed(0) + '%')
    .attr('x', xScale(beforeColumn))
    .attr('y', yScale(config.data[beforeColumn]))
    .attr('dx', -5)
    .attr('dy', 3);

  sentElement.append('text')
    .attr('class', 'after')
    .text(config.data[afterColumn].toFixed(0) + '%')
    .attr('x', xScale(afterColumn))
    .attr('y', yScale(config.data[afterColumn]))
    .attr('dx', 5)
    .attr('dy', 3);

  sentElement.append('text')
    .attr('class', 'after')
    .text('(+' + config.data.diff.toFixed(0) + ' pts.)')
    .attr('x', xScale(afterColumn))
    .attr('y', yScale(config.data[afterColumn]))
    .attr('dx', 5)
    .attr('dy', 18);

  // if (isMobile.matches) {
  //   sentText.call(wrapText, margins['right'] - 5, 14);
  // }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var charts = [];
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
  charts = Object.keys(DATA);

  charts.forEach(function(v, k) {
    DATA[v].forEach(function(d) {
      var y = Number(d.date);
      d.date = new Date(y, 0, 1);
    });

    // Restructure tabular data for easier charting.
    dataSeries[v] = [];
    for (var column in DATA[v][0]) {
      if (column == "date" || column == 'Total') continue;

      dataSeries[v].push({
        name: column,
        values: DATA[v].map(d => ({
          date: d.date,
          amt: d[column]
        }))
      });
    }
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var graphicWidth = width;
  var gutterWidth = 22;
  if (!isMobile.matches && charts.length > 1) {
    graphicWidth = Math.floor((width - gutterWidth) / charts.length);
  }

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      dataSeries[charts[0]].map(function(d) {
        return d.name;
      })
    )
    .range([
      '#CCC',
      COLORS.orange3
    ]);

  charts.forEach(function(v, k) {
    var chartId = classify(v);

    var chartElement = containerElement.append('div')
      .attr('class', 'chart ' + chartId);

    if (!isMobile.matches && charts.length > 1) {
      chartElement.attr('style', function() {
        var s = '';
        s += 'width: ' + graphicWidth + 'px; ';
        s += 'float: left; ';
        if (k > 0) {
          s += 'margin-left: ' + gutterWidth + 'px; ';
        }
        return s;
      });
    }

    renderLineChart({
      colorScale: colorScale,
      container: container + ' .chart.' + chartId,
      data: dataSeries[v],
      id: chartId,
      width: graphicWidth,
      xDomain: [ 0, 100 ]
    });
  });

  // fix chart hed alignment
  var labelHeds = d3.selectAll('h3');
  var labelMaxHeight = 0;

  labelHeds['_groups'][0].forEach(function(d,i) {
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
  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 125,
    bottom: 20,
    left: 37
  };

  var labelLineHeight = 13;
  var ticksX = 5;
  var ticksY = 5;

  if (isMobile.matches) {
    margins.right = 110;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var min = config.xDomain[0];
  var max = config.xDomain[1];

  var yScale = d3
    .scaleLinear()
    .domain([ min, max ])
    .range([ chartHeight, 0 ]);

  var colorScale = config.colorScale;

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
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return '\u2019' + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      return d + '%';
    });

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

  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
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

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

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

  // Render lines to chart.
  var line = d3
    .line()
    .x(function(d) {
      return xScale(d[dateColumn]);
    })
    .y(function(d) {
      return yScale(d[valueColumn]);
    });

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  chartElement
    .append("g")
    .attr("class", "value first")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", function(d, i) {
      var first = d.values[0];
      return xScale(first[dateColumn]);
    })
    .attr("y", function(d) {
      var first = d.values[0];
      return yScale(first[valueColumn]) - 6;
    })
    .attr('class', function(d) {
      return classify(d.name);
    })
    .text(function(d) {
      var first = d.values[0];
      var label = first[valueColumn].toFixed(0) + '%';

      return label;
    });

  var lastValue = chartElement
    .append("g")
    .attr("class", "value last");

  lastValue.selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", function(d, i) {
      var last = d.values[d.values.length - 1];

      return xScale(last[dateColumn]) + 5;
    })
    .attr("y", function(d) {
      var last = d.values[d.values.length - 1];

      return yScale(last[valueColumn]) + 3;
    })
    .attr('class', function(d) {
      return classify(d.name);
    })
    .text(function(d, i) {
      var last = d.values[d.values.length - 1];
      var label = d.name + ': ' + last[valueColumn].toFixed(0) + '%';

      return label;
    });

  var firstVal = config['data'][1].values[0];
  var lastVal = config['data'][1].values[config['data'][1].values.length - 1];
  lastValue.append('text')
    .text(function() {
      var diff = lastVal[valueColumn] - firstVal[valueColumn];
      var diffPrefix = diff > 0 ? "+" : "";
      var pts = Math.abs(diff) == 1 ? "pt." : "pts.";
      var suffix = ' since 1995';
      var change = '(' + diffPrefix + diff + ' ' + pts + suffix + ')';

      return change;
    })
    .attr('class', 'diff')
    .attr('x', function() {
      return xScale(lastVal[dateColumn]) + 5;
    })
    .attr('y', function() {
      return yScale(lastVal[valueColumn]) + 18;
    });
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

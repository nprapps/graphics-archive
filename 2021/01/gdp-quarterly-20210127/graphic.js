var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var wrapText = require("./lib/helpers/wrapText");

var dataSeries = [];
var pymChild;

console.clear();

// source: http://www.nber.org/cycles.html
var recession_dates = [
  { begin: new Date(1953, 6, 1), end: new Date(1954, 4, 1) },
  { begin: new Date(1957, 7, 1), end: new Date(1958, 3, 1) },
  { begin: new Date(1960, 3, 1), end: new Date(1961, 1, 1) },
  { begin: new Date(1969, 11, 1), end: new Date(1970, 10, 1) },
  { begin: new Date(1973, 10, 1), end: new Date(1975, 2, 1) },
  { begin: new Date(1980, 0, 1), end: new Date(1980, 6, 1) },
  { begin: new Date(1981, 6, 1), end: new Date(1982, 10, 1) },
  { begin: new Date(1990, 6, 1), end: new Date(1991, 2, 1) },
  { begin: new Date(2001, 2, 1), end: new Date(2001, 10, 1) },
  { begin: new Date(2007, 11, 1), end: new Date(2009, 5, 1) },
  { begin: new Date(2020, 1, 1), end: new Date(2020, 6, 1) }
];

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
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

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
  DATA.forEach(function(d) {
    // console.log(d)
    // var quarters = [null, 1, 4, 7, 10];
    var quarters = [null, 3, 6, 9, 12];
    var m = quarters[d.q];

    d.date = new Date(d.year, m - 1, 1);
  });

  /*
   * Restructure tabular data for easier charting.
   */
  for (var column in DATA[0]) {
    if (["date", "q", "year"].indexOf(column) > -1) continue;

    dataSeries.push({
      name: column,
      values: DATA.map(function(d) {
        return {
          date: d.date,
          amt: d[column],
          q: d.q,
          label: d.label
        };
        // filter out empty data. uncomment this if you have inconsistent data.
      }).filter(function(d) {
        return d.amt != null;
      })
    });
  }

  recession_dates.forEach(function(d) {
    d.begin = new Date(d.begin);
    d.end = new Date(d.end);
  });
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  /*
   * Setup
   */
  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 3 : 16;
  var aspectHeight = isMobile.matches ? 4 : 9;

  var margins = {
    top: 15,
    right: 75,
    bottom: 20,
    left: 40
  };

  var labelLineHeight = 14;
  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    labelLineHeight = 11;
    ticksX = 5;
    ticksY = 5;
    margins.right = 55;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  // var chartHeight = Math.ceil((config.width * aspectHeight) / aspectWidth) - margins.top - margins.bottom;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);

  /*
   * Create D3 scale objects.
   */
  var xScale = d3.scaleTime()
    .domain([dates[0], dates[dates.length - 1]])
    .range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var floors = values.map(v => Math.floor(v / roundTicksFactor) * roundTicksFactor);
  var ceilings = values.map(v => Math.ceil(v / roundTicksFactor) * roundTicksFactor);

  var min = Math.min(...floors);
  var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }

  var yScale = d3.scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3.scaleOrdinal()
    .domain(config.data.map(d => d.name))
    // .range([ '#999', COLORS.red3 ]);
    .range([COLORS.red3, COLORS.red6]);

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
    .attr("transform", `translate(${margins.left}, ${margins.top})`);

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return "\u2019" + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => `${d > 0 ? "+" : ""}${d}%`);

  // recession bars
  var recession = chartElement
    .append("g")
    .attr("class", "recession")
    .selectAll("rect")
    .data(recession_dates)
    .enter()
      .append("rect")
        .attr("x", d => xScale(d.begin))
        .attr("width", d => xScale(d.end) - xScale(d.begin))
        .attr("y", 0)
        .attr("height", chartHeight)
        .attr("fill", "#ebebeb");

  /*
   * Render axes to chart.
   */
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  /*
   * Render grid to chart.
   */
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

  /*
   * Render 0 value line.
   */
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  /*
   * Render lines to chart.
   */
  var area = d3.area()
    .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y0(yScale(0))
    .y1(d => yScale(d[valueColumn]));

  // above/below clipping
  // see: http://bl.ocks.org/mbostock/4062844
  // and: http://bl.ocks.org/mbostock/3894205
  chartElement.append('clipPath')
      .attr('id', 'clip-below')
      .append('rect')
      .attr('y', yScale(0))
      .attr('width', chartWidth)
      .attr('height', yScale(yScale.domain()[0]) - yScale(0));

  chartElement.append('clipPath')
      .attr('id', 'clip-above')
      .append('rect')
      .attr('y', yScale(yScale.domain()[1]))
      .attr('width', chartWidth)
      .attr('height', yScale(0) - yScale(yScale.domain()[1]));

  var areaWrapper = chartElement.append('g')
      .attr('class', 'areas');
  [ "above", "below" ].forEach((v, k) => {
    areaWrapper.append('path')
        .datum(config['data'][0]['values'])
        .attr('class', 'area ' + v)
        .attr('clip-path', 'url(#clip-' + v + ')')
        .attr('d', area);
  });

  // var line = d3.line()
  //   .curve(d3.curveStep)
  //   .x(d => xScale(d[dateColumn]))
  //   .y(d => yScale(d[valueColumn]));
  //
  // chartElement
  //   .append("g")
  //   .attr("class", "lines")
  //   .selectAll("path")
  //   .data(config.data)
  //   .enter()
  //   .append("path")
  //   .attr("class", d => "line " + classify(d.name))
  //   .attr("stroke", d => colorScale(d.name))
  //   .attr("d", d => line(d.values));

  var data = config.data[0].values.filter(a => a["label"])
  console.log(data);
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("x", function(d, i) {
      // var last = d.values[d.values.length - 1];

      var xOffset = -5;
      if ((i == data.length - 1) || (i == data.length - 2)) {
        xOffset = 5;
      } else if (d.amt == -31.4 && d.q == 2) {
        xOffset = 5;
      }

      return xScale(d[dateColumn]) + xOffset;
    })
    .attr("y", function(d, i) {
      // var last = d.values[d.values.length - 1];

      var yOffset = 15;
      if ((i == data.length - 2)) {
        yOffset = -10;
      }

      if ((i == data.length - 1)) {
        yOffset = 7;
      }

      if (d.amt == -31.4 && d.q == 2) {
        yOffset = -10;
      }

      return yScale(d[valueColumn]) + yOffset;
    })
    .text(function(d) {
      // var last = d.values[d.values.length - 1];
      var value = d[valueColumn];

      var q = d.q;
      switch (q) {
        case "01":
          q = "Q1";
          break;
        case "04":
          q = "Q2";
          break;
        case "06":
          q = "Q3";
          break;
        case "10":
          q = "Q4";
          break;
      }

      var polarity = value > 0 ? "+" : "";

      var label = `Q${q} ${d.date.getFullYear()}: ${polarity}${value.toFixed(1)}%`;
      return label;
    })
    .style("fill", function(d) {
      if (d.amt < 0) {
        return COLORS.red3;
      }

      return "#787878"; 
    })
    .call(wrapText, margins.right - 5, labelLineHeight);

  // recession label
  chartElement
    .append("text")
    .classed("chart-label", true)
    .attr("x", function() {
      var dates = recession_dates[1];
      if (isMobile.matches) {
        dates = recession_dates[1];
      }
      return (
        xScale(dates.begin) +
        (xScale(dates.end) - xScale(dates.begin)) / 2
      );
    })
    .attr("y", chartHeight - 20)
    .text("Recessions");
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

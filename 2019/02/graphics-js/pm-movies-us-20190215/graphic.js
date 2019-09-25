var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { COLORS, classify, fmtComma, makeTranslate, wrapText } = require("./lib/helpers");
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
    var y = Number(d.date);
    d.date = new Date(y, 0, 1);
  });

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (column == "date" || column == "annotate") continue;

    dataSeries.push({
      name: column,
      values: DATA.map(d => ({
        date: d.date,
        amt: d[column],
        annotate: d['annotate']
      }))
    });
  }
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
  // Setup

  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 60,
    bottom: 20,
    left: 38
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 1000;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 50;
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

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.teal3
    ]);

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
        return "\u2019" + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

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

  // Render area to chart
  var area = d3.area()
    .x(d => xScale(d[dateColumn]))
    .y0(yScale(0))
    .y1(d => yScale(d[valueColumn]));

  var areas = chartElement.append('g')
    .attr('class', 'area')
    .selectAll('path')
    .data(config['data'])
    .enter()
      .append('path')
        .attr('class', d => classify(d.name))
        .attr('fill', d => colorScale(d.name))
        .attr('d', d => area(d.values));

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

  // render line values

  var values = chartElement.append("g")
    .attr("class", "values")
    .selectAll("g")
    .data(config.data)
    .enter()
      .append("g")
        .attr("class", d => classify(d.name));

  values.selectAll('circle')
    .data(function(d) {
      var vals = d.values.filter(function(v,k) {
        v.series = d.name;
        return v.annotate == "yes";
      });
      return vals;
    })
    .enter()
      .append('circle')
        .attr('cx', d => xScale(d[dateColumn]))
        .attr('cy', d => yScale(d[valueColumn]))
        .attr('r', 4)
        .attr('fill', d => colorScale(d.series));

  values.selectAll("text")
    .data(function(d) {
      var vals = d.values.filter(function(v,k) {
        v.series = d.name;
        return v.annotate == "yes";
      });
      vals[vals.length - 1].lastval = true;
      return vals;
    })
    .enter()
      .append("text")
        .text(function(d) {
          var suffix = '';
          if (typeof d['lastval'] != 'undefined') {
            suffix = ' movies listed';
          }
          return fmtComma(d[valueColumn]) + suffix;
        })
        .attr('class', d => 'y-' + fmtYearFull(d[dateColumn]))
        .attr("x", d => xScale(d[dateColumn]))
        .attr("y", d => yScale(d[valueColumn]))
        .attr("dx", function(d) {
          if (d.lastval) {
            return 5;
          }
        })
        .attr('dy', function(d) {
          if (!d.lastval) {
            return -11;
          }
        })
        .attr("fill", d => colorScale(d.series))
        .call(wrapText, margins['right'] - 11, 13);
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

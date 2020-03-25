var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var annotations = [];
var dataSeries = [];
var pymChild;
var skipLabels = ["date", "annotate", "x_offset", "y_offset"];

var { COLORS, classify, getAPMonth, makeTranslate, wrapText } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

// source: http://www.nber.org/cycles.html
var recession_dates = [
  { 'begin': '1960-04-01', 'end': '1961-02-01' },
  { 'begin': '1969-12-01', 'end': '1970-11-01' },
  { 'begin': '1973-11-01', 'end': '1975-03-01' },
  { 'begin': '1980-01-01', 'end': '1980-07-01' },
  { 'begin': '1981-07-01', 'end': '1982-11-01' },
  { 'begin': '1990-07-01', 'end': '1991-03-01' },
  { 'begin': '2001-03-01', 'end': '2001-11-01' },
  { 'begin': '2007-12-01', 'end': '2009-06-01' }
];

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
    d.date = new Date(d.date, 0, 1);

    for (var key in d) {
      if (!skipLabels.includes(key) && !!d[key]) {
        // Annotations
        var hasAnnotation = !!d.annotate;
        if (hasAnnotation) {
          var xOffset = Number(d.x_offset) || 0;
          var yOffset = Number(d.y_offset) || 0;

          annotations.push({
            date: d.date,
            amt: d[key],
            series: key,
            xOffset: xOffset,
            yOffset: yOffset
          });
        }
      }
    }
  });

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (column == "date") continue;

    dataSeries.push({
      name: column,
      values: DATA.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  recession_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
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
    annotations: annotations,
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

  var annoConfig = {
    xOffset: -3,
    yOffset: -22,
    width: 50,
    lineHeight: 14
  }

  var margins = {
    top: 5,
    right: 50,
    bottom: 20,
    left: 37
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 10;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 40;
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
  // var min = Math.min.apply(null, floors);

  // if (min > 0) {
  //   min = 0;
  // }

  var min = 70;

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
      COLORS.orange3,
    ]);

  // Render the HTML legend.

  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d.name));
  //
  // legend.append("b").style("background-color", d => colorScale(d.name));
  //
  // legend.append("label").text(d => d.name);

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
    .ticks(ticksY)
    .tickFormat(d => d + '%');

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

  /*
   * Recession bars
   */
  var recession = chartElement.insert('g','*')
    .attr('class', 'recession')
    .selectAll('rect')
    .data(recession_dates)
    .enter()
      .append('rect')
      .attr('x', d => xScale(d['begin']))
      .attr('width', d => xScale(d['end']) - xScale(d['begin']))
      .attr('y', 0)
      .attr('height', chartHeight);

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
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

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

  // var lastItem = d => d.values[d.values.length - 1];
  //
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
  //   .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
  //   .text(function(d) {
  //     var item = lastItem(d);
  //     var value = item[valueColumn];
  //     var label = value.toFixed(1);
  //
  //     return label + '%';
  //   });

  if (config.annotations) {
    /*
     * Render annotations.
     */
    var annotation = chartElement.append("g")
      .attr("class", "annotations")
      .selectAll("circle")
      .data(config.annotations)
      .enter();

    annotation.append("circle")
      .attr("class", "dots")
      .attr("cx", d => xScale(d[dateColumn]))
      .attr("cy", d => yScale(d[valueColumn]))
      .attr("fill", d => colorScale(d.series))
      .attr("r", 3);

    annotation.append("text")
      .html(function(d) {
        var hasCustomLabel = d.label != null && d.label.length > 0;
        var text = fmtYearFull(d.date) + ':';
        var value = d[valueColumn].toFixed(1) + '%';

        // // if annotation ends in .0, make fixed to 0 decimals
        // if (d[valueColumn].toFixed(1).split(".").pop() == 0) {
        //   var value = d[valueColumn].toFixed(0) + '%';
        // } else {
        //   var value = d[valueColumn].toFixed(1) + '%';
        // }

        return text + " " + value;
      })
      .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annoConfig.xOffset)
      .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annoConfig.yOffset)
      .call(wrapText, annoConfig.width, annoConfig.lineHeight);
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

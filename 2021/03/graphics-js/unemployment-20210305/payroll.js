var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var dataSeries = [];
var annotations = [];
var skipLabels = ["date", "annotate", "x_offset", "y_offset"];

var { COLORS, classify, getAPMonth, makeTranslate, wrapText } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");
var fmtYearAbbrev = d => "\u2019" + (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ", " + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + " " + fmtDayYear(d).trim();

// source: http://www.nber.org/cycles.html
var recession_dates = [
    // { 'begin':'1929-08-01','end':'1933-03-01' },
    // { 'begin':'1937-05-01','end':'1938-06-01' },
    { 'begin':'1945-02-01','end':'1945-10-01' },
    { 'begin':'1948-11-01','end':'1949-10-01' },
    { 'begin':'1953-07-01','end':'1954-05-01' },
    { 'begin':'1957-08-01','end':'1958-04-01' },
    { 'begin':'1960-04-01','end':'1961-02-01' },
    { 'begin':'1969-12-01','end':'1970-11-01'  },
    { 'begin':'1973-11-01','end':'1975-03-01' },
    { 'begin':'1980-01-01','end':'1980-07-01' },
    { 'begin':'1981-07-01','end':'1982-11-01'  },
    { 'begin':'1990-07-01','end':'1991-03-01' },
    { 'begin':'2001-03-01','end':'2001-11-01' },
    { 'begin':'2007-12-01','end':'2009-06-01' },
    { 'begin':'2020-02-01','end':'2021-02-01' }
];

/*
 * Initialize graphic
 */
var initialize = function() {
  // (NB: Use window.load to ensure all images have loaded)
  window.onload = onWindowLoaded;
}

var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    // pymChild.onMessage("on-screen", function(bucket) {
    //   ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // pymChild.onMessage("scroll-depth", function(data) {
    //   data = JSON.parse(data);
    //   ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });
  });
};

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
  DATA.forEach(function(d) {
    var [m, y] = d.date.split("/").map(Number);
    d.date = new Date(y, m - 1, 1);

    for (var key in d) {
      if (!skipLabels.includes(key) && !!d[key]) {
        // Annotations
        var hasAnnotation = !!d.annotate;
        if (hasAnnotation) {
          var hasCustomLabel = d.annotate !== true;
          var label = hasCustomLabel ? d.annotate : null;

          var xOffset = Number(d.x_offset) || 0;
          var yOffset = Number(d.y_offset) || 0;

          annotations.push({
            date: d.date,
            amt: d[key],
            series: key,
            xOffset: xOffset,
            yOffset: yOffset,
            label: label
          });
        }
      }
    }
  });

  recession_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
  });

  /*
   * Restructure tabular data for easier charting.
   */

  for (var column in DATA[0]) {
    if (skipLabels.includes(column)) {
      continue;
    }

    dataSeries.push({
      name: column,
      values: DATA.filter(d => d[column]).map(function(d) {
        return {
          date: d.date,
          amt: d[column]
        };
        // filter out empty data. uncomment this if you have inconsistent data.
               // }).filter(function(d) {
                   // return d.amt != null;
      })
    });
  }
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
  var container = "#annotated-line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var marginLeft = isMobile.matches ? 35 : 62;
  var marginRight = 70;

  // Render the chart!
  renderLineChart({
    container,
    width,
    data: dataSeries,
    annotations: annotations,
    marginLeft,
    marginRight
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
  /*
   * Setup
   */
  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 9 : 16;
  var aspectHeight = isMobile.matches ? 16 : 9;

  var annoConfig = {
    xOffset: 0,
    yOffset: -13,
    width: config.marginRight,
    lineHeight: 14
  }

  var margins = {
    top: 5,
    right: annoConfig.width + 1,
    bottom: 20,
    left: config.marginLeft
  };

  var ticksX = 10;
  var ticksY = 8;
  var roundTicksFactor = 1000;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;

    annoConfig = {
      xOffset: 0,
      yOffset: -10,
      width: config.marginRight,
      lineHeight: 12
    }

    margins.right = annoConfig.width + 5;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates1 = config.data[0].values.map(d => d.date);
  var dates2 = config.data[0].values.map(d => d.date);
  var extent = [dates1[0], dates2[dates2.length - 1]];

  /*
   * Create D3 scale objects.
   */
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
    .domain([ min, max ])
    .range([ chartHeight, 0 ]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([ COLORS.red3,]);

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
   * Create D3 axes.
   */
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => isMobile.matches ? fmtYearAbbrev(d) : fmtYearFull(d));

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      if (d == 0) {
        return d;
      } else {
        var suffix = isMobile.matches ? "M" : " million";
        return d/1000 + suffix;
      }
    });

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

  // chartElement
  //   .insert('g', '*')
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat("")
  //   );

  chartElement
    .insert('g', '*')
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

  // var lineWrapper = chartElement.append('g')
  //     .attr('class', 'lines');
  // _.each([ 'above', 'below' ], function(v, k) {
  //     lineWrapper.append('path')
  //         .datum(config['data'][0]['values'])
  //         .attr('class', 'line ' + v)
  //         .attr('clip-path', 'url(#clip-' + v + ')')
  //         .attr('d', function(d) {
  //             return line(d);
  //         });
  // });

  /*
   * Render annotations.
   */
  var annotation = chartElement.append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();

  // annotation.append("circle")
  //   .attr("class", function(d) {
  //     var polarity = d[valueColumn] < 0 ? "negative" : "positive"
  //     return "dots " + polarity;
  //   })
  //   .attr("cx", d => xScale(d[dateColumn]))
  //   .attr("cy", d => yScale(d[valueColumn]))
  //   // .attr("fill", d => colorScale(d.series))
  //   .attr("r", 3);

  annotation.append("text")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : getAPMonth(d.date) + ' ' + fmtYearFull(d.date);
      if (Math.abs(d[valueColumn]) >= 1000) {
        var value = d[valueColumn] / 1000;
        var displayValue = fmtComma(value.toFixed(1)) + "M";
      } else {
        var displayValue = fmtComma(d[valueColumn]) + "K";
      }

      var polarity = "";
      if (d[valueColumn] > 0) {
        polarity = "+";
      }

      return text + " " + polarity + displayValue;
    })
    .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annoConfig.xOffset)
    .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annoConfig.yOffset)
    .call(wrapText, annoConfig.width, annoConfig.lineHeight);

  // chartElement.append('text')
  //   .classed('chart-label', true)
  //   .attr('x', function(){
  //     var dates = recession_dates[0];
  //     return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
  //   })
  //   .attr('y', isMobile.matches ? chartHeight - 15 : 20)
  //   .attr('y', isMobile.matches ? -20 : 20)
  //   .text('Great Depression')
  //   .call(wrapText, annoConfig.width, annoConfig.lineHeight);

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = recession_dates[recession_dates.length - 2];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', yScale(-10000))
    .text('Recession')
    .call(wrapText, annoConfig.width, annoConfig.lineHeight);
};


module.exports = initialize;

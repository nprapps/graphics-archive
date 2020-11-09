var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var dataSeries = [];
var dataSeries2 = [];

var annotations = [];
var annotations2 = [];
var skipLabels = ["date", "annotate", "x_offset", "y_offset"];

var {
  COLORS,
  classify,
  getAPMonth,
  makeTranslate,
  fmtComma,
  wrapText
} = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => "\u2019" + (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ", " + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + " " + fmtYearFull(d);

// source: http://www.nber.org/cycles.html
var recession_dates = [
    // { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' },
    { 'begin':'2020-02-01','end':'2020-07-01' }
];

/*
 * Initialize graphic
 */
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
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);

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
  DATA_CUMULATIVE.forEach(function(d) {
    var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);

    for (var key in d) {
      if (!skipLabels.includes(key) && !!d[key]) {

        // Annotations
        var hasAnnotation = !!d.annotate;
        if (hasAnnotation) {
          var hasCustomLabel = d.annotate !== true;
          var label = hasCustomLabel ? d.annotate : null;

          var xOffset = Number(d.x_offset) || 0;
          var yOffset = Number(d.y_offset) || 0;

          annotations2.push({
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

  /*
   * Restructure tabular data for easier charting.
   */
  for (var column in DATA[0]) {
    if (skipLabels.includes(column)) {
      continue;
    }

    dataSeries.push({
      name: column,
      values: DATA.map(function(d) {
        return {
          date: d.date,
          amt: d[column]
        };
        // filter out empty data. uncomment this if you have inconsistent data.
        //        }).filter(function(d) {
        //            return d.amt != null;
      })
    });
  }

  for (var column in DATA_CUMULATIVE[0]) {
    if (skipLabels.includes(column)) {
      continue;
    }

    dataSeries2.push({
      name: column,
      values: DATA_CUMULATIVE.map(function(d) {
        return {
          date: d.date,
          amt: d[column]
        };
        // filter out empty data. uncomment this if you have inconsistent data.
        //        }).filter(function(d) {
        //            return d.amt != null;
      })
    });
  }

  recession_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
  });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
  var container = "#annotated-line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Render the chart!
  renderLineChart({
    container,
    width,
    data: dataSeries,
    annotations: annotations
  });

  var container2 = "#annotated-line-chart2";
  var element2 = document.querySelector(container2);
  var width2 = element.offsetWidth;

  // Render the chart!
  renderLineChart2({
    container2,
    width2,
    data: dataSeries2,
    annotations: annotations2
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Render a line chart.
 */
var renderLineChart2 = function(config) {
  /*
   * Setup
   */
  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 20,
    right: 80,
    bottom: 20,
    left: 45
  };

  // var ticksX = 10;
  // var ticksY = 6;
  ticksX = 5;
    ticksY = 5;
  var roundTicksFactor = 5;

  var annotationXOffset = -4;
  var annotationYOffset = -24;
  var annotationWidth = 70;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 5;
    ticksY = 5;
    annotationXOffset = -6;
    annotationYOffset = -20;
    annotationWidth = 70;
    annotationLineHeight = 12;
    margins.right = 60;
    margins.left = 42;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width2 - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width2 * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container2);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

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

  var min = 300000;

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);
  // var max = 20;


  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

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
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      if (d == 0) {
        return d;
      } else {
        return `$${d/1000}B`;
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
   * Recession bars
   */
  var recession = chartElement.insert('g','*')
    .attr('class', 'recession')
    .selectAll('rect')
    .data(recession_dates)
    .enter()
      .append('rect')
      .attr('x', d => xScale(d['begin']))
      // .attr('x', function(d) {
      //   console.log(d['begin']);
      //   return xScale(d['begin']);
      // })
      .attr('width', d => xScale(d['end']) - xScale(d['begin']))
      .attr('y', 0)
      .attr('height', chartHeight);

  /*
   * Render lines to chart.
   */
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
    .attr("class", function(d, i) {
      return "line " + classify(d.name);
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
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
    });

  /*
   * Render annotations.
   */
  var annotation = chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();

  annotation
    .append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", 3);

  annotation
    .append("text")
    .attr("class","anno")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : fmtDateFull(d[dateColumn]);
      var value = d[valueColumn];
      return text + ": $" + Math.round(value/1000) + "B";
    })
    .attr("x", function(d) {
      var offset = d.xOffset + annotationXOffset;
      if (d.xOffset < 0 && isMobile.matches) {
        offset += 20;
      } else if (d.xOffset > 0 && isMobile.matches) {
        // offset += 5;
      }
      return xScale(d[dateColumn]) + offset;
    })
    .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annotationYOffset)
    .call(wrapText, annotationWidth, annotationLineHeight);

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = recession_dates[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', - 10)
    .attr("text-anchor", "middle")
    .text('Recession');
};


var renderLineChart = function(config) {
  /*
   * Setup
   */
  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 20,
    right: 80,
    bottom: 20,
    left: 37
  };

ticksX = 5;
    ticksY = 5;
  var roundTicksFactor = 5;

  var annotationXOffset = -4;
  var annotationYOffset = -24;
  var annotationWidth = 70;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 5;
    ticksY = 5;
    annotationXOffset = -6;
    annotationYOffset = -20;
    annotationWidth = 70;
    annotationLineHeight = 12;
    margins.right = 60;
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
  // var max = 20;


  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

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
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      if (d == 0) {
        return d;
      } else {
        return d + "%";
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
   * Recession bars
   */
  var recession = chartElement.insert('g','*')
    .attr('class', 'recession')
    .selectAll('rect')
    .data(recession_dates)
    .enter()
      .append('rect')
      .attr('x', d => xScale(d['begin']))
      // .attr('x', function(d) {
      //   console.log(d['begin']);
      //   return xScale(d['begin']);
      // })
      .attr('width', d => xScale(d['end']) - xScale(d['begin']))
      .attr('y', 0)
      .attr('height', chartHeight);

  /*
   * Render lines to chart.
   */
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
    .attr("class", function(d, i) {
      return "line " + classify(d.name);
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
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
    });

  /*
   * Render annotations.
   */
  var annotation = chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();

  annotation
    .append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", 3);

  annotation
    .append("text")
    .attr("class","anno")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : fmtDateFull(d[dateColumn]);
      var value = d[valueColumn].toFixed(1) + "%";
      return text + ": " + fmtComma(value);
    })
    .attr("x", function(d) {
      var offset = d.xOffset + annotationXOffset;
      if (d.xOffset < 0 && isMobile.matches) {
        offset += 20;
      } else if (d.xOffset > 0 && isMobile.matches) {
        // offset += 5;
      }
      return xScale(d[dateColumn]) + offset;
    })
    .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annotationYOffset)
    .call(wrapText, annotationWidth, annotationLineHeight);

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = recession_dates[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', - 10)
    .attr("text-anchor", "middle")
    .text('Recession');
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

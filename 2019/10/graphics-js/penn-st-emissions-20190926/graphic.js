console.clear()

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var dataSeries = [];
var annotations = [];
var skipLabels = ["date", "annotate", "x_offset", "y_offset"];

var {
  COLORS,
  classify,
  getAPMonth,
  makeTranslate,
  wrapText,
  fmtComma
} = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ", " + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + " " + fmtDayYear(d).trim();

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
    // var [m, day, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = d.date;

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

  /*
   * Restructure tabular data for easier charting.
   */
  for (var column in DATA[DATA.length-1]) {
    if (skipLabels.includes(column)) {
      continue;
    }


    dataSeries.push({
      name: column,
      values: DATA.map(function(d) {
        return {
          date: d.date,
          amt: d[column],
        };
        // filter out empty data. uncomment this if you have inconsistent data.
               }).filter(function(d) {
                  if (d.amt != undefined && d.amt != "") {
                    return true
                  }
                  return false
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

  // Render the chart!
  renderLineChart({
    container,
    width,
    data: dataSeries,
    annotations: annotations
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

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 22,
    right: 75,
    bottom: 20,
    left: 60
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 5;

  var annotationXOffset = -4;
  var annotationYOffset = -24;
  var annotationWidth = 120;
  var annotationLineHeight = 13;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 5;
    ticksY = 5;
    margins.right = 25;
    annotationWidth = 80;
    annotationLineHeight = 12;
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
  dates = dates.concat(config.data[1].values.map(d => d.date))
  var extent = [0, dates.length - 1];
  var extentKey = {}

  for (i in dates) {
    extentKey[dates[i]] = i
  }


  /*
   * Create D3 scale objects.
   */
  var xScale = d3
    .scaleLinear()
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
  var max = 700000;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.red3,
      COLORS.red3,
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
      return '\u2019' + dates[d].replace("/", "/\u2019")
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

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

 // projection begin

 var projWidth = chartWidth - xScale(extentKey['17/18'])

    chartElement.append("rect")
      .attr('x', xScale(extentKey['17/18']))
      .attr('width', projWidth)
      .attr('y', 0)
      .attr('height', chartHeight)
      .attr('class', 'shading')


    d3.select("svg").append("text")
      .attr('x', chartWidth - (projWidth/2) + margins.left)
      .attr('y', 20)
      .text("Projected")
      .attr("class", "chart-label")

  /*
   * Render lines to chart.
   */
  var line = d3
    .line()
    .x(function(d, i) {
      console.log( d[dateColumn])
      console.log( xScale(extentKey[d[dateColumn]]))
      return xScale(extentKey[d[dateColumn]])
    })
    .y(function(d, i) {
      return yScale(d[valueColumn])
    })

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
    .attr("d", function(d) {
      console.log(d)
      return line(d.values)
    });

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", function(d, i) {
      return xScale(i) + 5;
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
    .attr("cx", function(d, i) {

      function isThisDate(str) {
        return str == d[dateColumn]
      }
      return xScale(extentKey[d[dateColumn]])
    })
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", 3);

  annotation
    .append("text")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : d[dateColumn];
      var value = d[valueColumn].toFixed(2);
      return text;
    })
    .attr('class', function(d) {
      return d.label.split(" ")[0]
    })
    .attr("x", function(d, i) {

      function isThisDate(str) {
        return str == d[dateColumn]
      }
      return xScale(extentKey[d[dateColumn]]) + d.xOffset + annotationXOffset
    })
    .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annotationYOffset)
    .call(wrapText, annotationWidth, annotationLineHeight);




    // goal begin


    var goal2050 = 97381

    chartElement.append("line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(goal2050))
      .attr("y2", yScale(goal2050))
      .attr("class", "goal-line")

    annotation.append("text")
      .attr("x", xScale(0) + 5)
      .attr("y", yScale(goal2050) + 15)
      .attr("class", "goal-line-text goal-line-text-shadow")
      .text("Goal by 2050: " + fmtComma(goal2050))

    annotation.append("text")
      .attr("x", xScale(0) + 5)
      .attr("y", yScale(goal2050) + 15)
      .attr("class", "goal-line-text")
      .text("Goal by 2050: " + fmtComma(goal2050))




};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

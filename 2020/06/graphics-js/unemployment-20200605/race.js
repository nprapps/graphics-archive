var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var dataSeries = [];
var annotations = [];
var skipLabels = ["date", "annotate", "x_offset", "y_offset"];
var chartList = [
    {
      container:"#annotated-line-chart1",
      primary:"white"
    },
    {
      container:"#annotated-line-chart2",
      primary:"black"
    },
    {
      container:"#annotated-line-chart4",
      primary:"latino"
    },
    {
      container:"#annotated-line-chart3",
      primary:"asian"
    },
  ];

// change morning of
var allYmax = 20;
var goesFirst = "latino";

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
    // { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
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
  UNEMPLOYMENT_DATA.forEach(function(d) {
    var [m, day, y] = d.date.split("/").map(Number);
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

  recession_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
  });

  /*
   * Restructure tabular data for easier charting.
   */
  for (var column in UNEMPLOYMENT_DATA[0]) {
    if (skipLabels.includes(column)) {
      continue;
    }

    dataSeries.push({
      name: column,
      values: UNEMPLOYMENT_DATA.map(function(d) {
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
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {

  for (var i = 0; i < chartList.length; i++) {
    var container = chartList[i].container;
    var element = document.querySelector(container);
    var width = element.offsetWidth;

    var marginLeft = 35;
    var marginRight = 60;

    // Render the chart!

    renderLineChart({
      container,
      width,
      data: dataSeries.filter(d => (d.name == chartList[i].primary || d.name == "overall")),
      primary: chartList[i].primary,
      annotations: annotations.filter(function(d){
        if (d.series == chartList[i].primary){
          return d;
        } else if (d.series == "overall" && chartList[i].primary == goesFirst) {
          return d;
        }
      }),
      marginLeft,
      marginRight
    });
  }


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

  var aspectWidth = isMobile.matches ? 16 : 16;
  var aspectHeight = isMobile.matches ? 9 : 9;
  // var aspectWidth = isMobile.matches ? 2 : 16;
  // var aspectHeight = isMobile.matches ? 1 : 7;

  var annoConfig = {
    xOffset: 0,
    yOffset: -13,
    width: config.marginRight,
    lineHeight: 14
  }

  var margins = {
    top: 10,
    right: annoConfig.width + 5,
    bottom: 20,
    left: config.marginLeft
  };

  var ticksX = 3;
  var ticksY = 4;
  var roundTicksFactor = 12;

  // Mobile
  if (isMobile.matches) {
    margins.right = annoConfig.width -10;
  }
  //   ticksX = 3;
  //   ticksY = 5;

  //   annoConfig = {
  //     xOffset: 0,
  //     yOffset: -10,
  //     width: config.marginRight,
  //     lineHeight: 12
  //   }

  //   margins.right = annoConfig.width + 5;
  // }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

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
  var max = allYmax

  var yScale = d3
    .scaleLinear()
    .domain([ min, max ])
    .range([ chartHeight, 0 ]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([ "#bababa", COLORS.red3 ]);

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
    .tickFormat(d => getAPMonth(d));

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d + '%');

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
    .insert('g', '*')
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

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
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data.sort(function(a,b){
      if (a.name != config.primary) {
        return -1;
      }
      return 0
    }))
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
  var annotation = chartElement.append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();

  annotation.append("circle")
    .attr("class", function(d, i) {
      return "dots";
    })
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", 3);

  annotation.append("text")
    .attr("class", (d,i) => `${d.series} i${i}`)
    .html(function(d) {
      // if annotation ends in .0, make fixed to 0 decimals
      if (d[valueColumn].toFixed(1).split(".").pop() == 0) {
        var value = d[valueColumn].toFixed(0) + '%';
      } else {
        var value = d[valueColumn].toFixed(1) + '%';
      }

      var hasCustomLabel = d.label != null && d.label.length > 0;
      if (hasCustomLabel && d.series == "overall") {
        return `${d.label}: ${value}`
      } else {
        return value;
      }
    })
    .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annoConfig.xOffset)
    .attr("y", function(d){
      var sign = d.series == "overall" ? -1.5 : 1;
      return yScale(d[valueColumn]) + (d.yOffset + annoConfig.yOffset)*sign;
    })
    .call(wrapText, annoConfig.width, annoConfig.lineHeight);
};


module.exports = initialize;

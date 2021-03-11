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

  // format payroll/wage data
  if (SECONDARY_MODE != 'none') {
    SECONDARY_DATA.forEach(function(d, i) {
      var [y, m, day] = d.date.split("-").map(Number);
      d.date = new Date(y, m - 1, day);
    });
  }
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(chartList) {
  var container = "#annotated-line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var marginLeft = 42;
  var marginRight = 60;

  // Render the chart!
  renderLineChart({
    container,
    width,
    data: dataSeries,
    annotations: annotations,
    marginLeft,
    marginRight
  });

  // Payrolls chart
  if (SECONDARY_MODE != 'none') {
    var pYDomain = null;
    switch(SECONDARY_MODE) {
      case 'payrolls-month':
        pYDomain = [ -800, 600 ];
        ticksY = 8;
        ticksYMobile = 5;
        break;
      case 'payrolls-year':
        pYDomain = [ -8000, 4000 ];
        ticksY = 8;
        ticksYMobile = 5;
        break;
      case 'wages':
        pYDomain = [ 0, 5 ];
        ticksY = 5;
        ticksYMobile = 5;
        break;
    }

    renderColumnChart({
      container: '#column-chart',
      width,
      data: SECONDARY_DATA,
      yDomain: pYDomain,
      ticksY: [ ticksY, ticksYMobile ],
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

  var aspectWidth = isMobile.matches ? 2 : 8;
  var aspectHeight = isMobile.matches ? 1 : 2;
  // var aspectWidth = isMobile.matches ? 2 : 16;
  // var aspectHeight = isMobile.matches ? 1 : 7;

  var annoConfig = {
    xOffset: 0,
    yOffset: -13,
    width: config.marginRight,
    lineHeight: 14
  }

  var margins = {
    top: 15,
    right: annoConfig.width + 5,
    bottom: 20,
    left: config.marginLeft
  };

  var ticksX = 10;
  var ticksY = 6;
  var roundTicksFactor = 12;

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

  var yScale = d3
    .scaleLinear()
    .domain([ min, max ])
    .range([ chartHeight, 0 ]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([ COLORS.red3 ]);

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
      var text = hasCustomLabel ? d.label : getAPMonth(d.date) + ' ' + fmtYearFull(d.date);
      d[valueColumn].toFixed(1) + '%';

      // if annotation ends in .0, make fixed to 0 decimals
      if (d[valueColumn].toFixed(1).split(".").pop() == 0) {
        var value = d[valueColumn].toFixed(0) + '%';
      } else {
        var value = d[valueColumn].toFixed(1) + '%';
      }

      return text + " " + value;
    })
    .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annoConfig.xOffset)
    .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annoConfig.yOffset)
    .call(wrapText, annoConfig.width, annoConfig.lineHeight);

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = recession_dates[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', isMobile.matches ? chartHeight - 15 : 20)
    .text('Recession');
};


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'date';
    var valueColumn = 'change';

    var aspectWidth = 16;
    var aspectHeight = 9;
    // var aspectWidth = isMobile.matches ? 2 : 8;
    // var aspectHeight = isMobile.matches ? 1 : 2;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: config.marginRight,
        bottom: 20,
        left: config.marginLeft
    };

    var ticksY = config['ticksY'][0];
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksY = config['ticksY'][1];
        roundTicksFactor = 200;
    }

    var xTickValues = [];
    config['data'].forEach(function(d,i) {
      if (d.date.getMonth() == 0) {
        xTickValues.push(d.date);
      }
    });

    // Calculate actual chart dimensions
    var chartWidth = config.width - margins.left - margins.right;
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config.container);
    containerElement.html("");

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append("div")
      .attr("class", "graphic-wrapper");

    var chartElement = chartWrapper
      .append("svg")
      .attr("width", chartWidth + margins.left + margins.right)
      .attr("height", chartHeight + margins.top + margins.bottom)
      .append("g")
        .attr("transform", `translate(${margins.left},${margins.top})`);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3
      .scaleBand()
      .range([ 0, chartWidth ])
      .padding(0)
      .domain(
        config.data.map(d => d[labelColumn])
      );

    var min = config['yDomain'][0];
    var max = config['yDomain'][1];

    var yScale = d3.scaleLinear()
      .domain([ min, max ])
      .range([ chartHeight, 0 ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3
      .axisBottom()
      .scale(xScale)
      .tickValues(xTickValues)
      .tickFormat(function(d, i) {
        if (!isMobile.matches) {
          return fmtYearFull(d);
        } else if (i % 2 == 0 && isMobile.matches) {
          return fmtYearAbbrev(d);
        }
      });

    var yAxis = d3
      .axisLeft()
      .scale(yScale)
      .ticks(ticksY)
      .tickFormat(function(d) {
        if (d != 0) {
          var val = null;
          switch (SECONDARY_MODE) {
            case 'payrolls-month':
              val = d + 'K';
              break;
            case 'payrolls-year':
              val = (d/1000).toFixed(0) + 'M';
              break;
            case 'wages':
              val = d.toFixed(0) + '%';
              break;
          }
          if (d > 0) {
            val = '+' + val;
          }
          return val;
        } else {
          return d;
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
    var yAxisGrid = function() {
      return yAxis;
    };

    chartElement.append('g')
      .attr('class', 'y grid')
      .call(yAxisGrid()
        .tickSize(-chartWidth, 0)
        .tickFormat('')
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
          .attr('x', function(d) {
            return xScale(d['begin']);
          })
          .attr('width', function(d) {
            return xScale(d['end']) - xScale(d['begin']) + xScale.bandwidth();
          })
          .attr('y', 0)
          .attr('height', chartHeight);

    /*
     * Render bars to chart.
     */
    chartElement.append("g")
      .attr("class", "bars")
      .selectAll("rect")
      .data(config.data)
      .enter()
        .append("rect")
          .attr("x", d => xScale(d[labelColumn]))
          .attr("y", d => d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn]))
          .attr("width", xScale.bandwidth())
          .attr("height", d => d[valueColumn] < 0
            ? yScale(d[valueColumn]) - yScale(0)
            : yScale(0) - yScale(d[valueColumn])
          )
          .attr("class", function(d) {
            var c = 'bar bar-' + d[labelColumn];
            if (d['status']) {
              c += ' ' + classify(d['status']);
            }
            if (d[valueColumn] < 0) {
              c += ' negative';
            }
            return c;
          });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    // show value for most recent month
    chartElement.append('g')
        .attr('class', 'value')
        .append('text')
            .attr('x', chartWidth + 5)
            .attr('y', function() {
                var last = config['data'][config['data'].length - 1];
                var value = last['change'];
                return yScale(value);
            })
            .attr('dy', 10)
            .text(function() {
                var last = config['data'][config['data'].length - 1];
                var value = last['change'];
                var val = null;

                switch(SECONDARY_MODE) {
                    case 'payrolls-month':
                        val = value + 'K';
                        break;
                    case 'payrolls-year':
                        val = (value/1000).toFixed(0) + 'M';
                        break;
                    case 'wages':
                        val = value.toFixed(1) + '%';
                        break;
                }
                if (value > 0) {
                    val = '+' + val;
                }

                var datePrefix = getAPMonth(last.date) + ' ' + fmtYearFull(last.date);

                return datePrefix + ' ' + val;
            })
            .call(wrapText, margins.right, 12);

    chartElement.append('text')
      .classed('chart-label', true)
      .attr('x', function(){
        var dates = recession_dates[0];
        return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
      })
      .attr('y', 20)
      .text('Recession');
}

module.exports = initialize;

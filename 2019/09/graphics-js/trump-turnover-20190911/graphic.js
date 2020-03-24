var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min")
};

var { makeTranslate, classify, formatStyle, wrapText } = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function() {
  render();
  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    pymChild.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#dot-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderDotChart({
    container,
    width,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderDotChart = function(config) {
  // Setup
  var labelColumn = "label";
  var valueColumn = "amt";
  var periodColumn = 'period_6mo';

  var barHeight = 40;
  var barGap = 5;
  var labelWidth = 125;
  var labelMargin = 10;
  var valueMinWidth = 30;
  var dotRadius = 6;

  var margins = {
    top: 35,
    right: 45,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var roundTicksFactor = 50;
  var tickValues = [ 0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300 ];

  if (isMobile.matches) {
    labelWidth = 100;
    margins.left = labelWidth + labelMargin;
    margins.right = 65;
    tickValues = [ 0, 90, 180, 270 ];
  }

  var periods = DATA.map(o => o[periodColumn]); // equivalent of underscore _.pluck
  periods = Array.from(new Set(periods)); // dedupe / _.uniq

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * periods.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

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

  // Create D3 scale objects.
  var min = 0;
  var values = config.data.map(d => d['days_to_start']);
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  // var floors = values.map(
  //   v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  // );
  var max = Math.max(...ceilings);
  // var min = Math.min(...floors);

  var xScale = d3
    .scaleLinear()
    .domain([ min, max ])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues(tickValues)
    // .tickFormat(d => d + " days");

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

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

  // Render dots to chart.
  var dotElement = chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(periods)
    .enter()
      .append('g')
        .attr('class', function(d, i) {
          return `${ classify(d) } period-${ i }`;
        });

  dotElement
    .selectAll('circle')
    .data(function(d, i) {
      var dotData = config.data.filter(function(v, k) {
        if (v[periodColumn] == d) {
          v.periodGrouping = i;
        }
        return v[periodColumn] == d;
      })
      return dotData;
    })
    .enter()
      .append('circle')
        .attr('cx', d => xScale(d.days_to_start))
        .attr('cy', d => d.periodGrouping * (barHeight + barGap) + barHeight / 2)
        .attr('r', dotRadius)
        .attr('class', function(d) {
          var c = '';
          if (d.status) {
            c += classify(d.status);
          }
          if (d.annotate) {
            c += ' annotate';
          }
          return c;
        });

  // Render bar labels.
  containerElement
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
      })
    )
    .selectAll("li")
    .data(periods)
    .enter()
    .append("li")
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px;"
      })
    )
    .attr("class", function(d,i) {
      return `${ classify(d) } period-${ i }`;
    })
    .append("span")
    .text(d => d);

  var annotElement = chartElement.append('g')
    .attr('class', 'annotations');
  annotElement.append('text')
    .text('Departure announced in...')
    .attr('class', 'departure')
    .attr('x', -margins.left)
    .attr('y', -25)
    .call(wrapText, (margins.left - labelMargin), 14);
  annotElement.append('text')
    .text('Days to fill the job')
    .attr('class', 'time-to-fill')
    .attr('x', xScale(0))
    .attr('y', -10);

  var dotLabels = chartElement.append('g')
    .attr('class', 'dot-labels')
    .selectAll('text')
    .data(config.data.filter(function(d) {
      if (d.status != '') {
        d.suffix = ' so far';
      } else {
        d.suffix = '';
      }
      return d.annotate == true;
    }))
    .enter();

  dotLabels.append('line')
    .attr('x1', function(d) {
      if ([ 'Secretary of veterans affairs' ].indexOf(d.job) > -1) {
        return xScale(d.days_to_start) + dotRadius;
      } else {
        return xScale(d.days_to_start);
      }
    })
    .attr('x2', function(d) {
      if ([ 'Secretary of veterans affairs' ].indexOf(d.job) > -1) {
        return xScale(d.days_to_start) + dotRadius + 6;
      } else {
        return xScale(d.days_to_start);
      }
    })
    .attr('y1', function(d) {
      var yPos = d.periodGrouping * (barHeight + barGap) + barHeight / 2;
      if ([ 'Secretary of veterans affairs' ].indexOf(d.job) > -1) {
        return yPos;
      } else if ([ 'Secretary of homeland security', 'Chief of staff' ].indexOf(d.job) > -1) {
        return yPos + dotRadius;
      } else {
        return yPos - dotRadius;
      }
    })
    .attr('y2', function(d) {
      var yPos = d.periodGrouping * (barHeight + barGap) + barHeight / 2;
      if ([ 'Secretary of veterans affairs' ].indexOf(d.job) > -1) {
        return yPos;
      } else if ([ 'Secretary of homeland security', 'Chief of staff' ].indexOf(d.job) > -1) {
        return yPos + dotRadius + 7;
      } else {
        return yPos - (dotRadius + 7);
      }
    });

  dotLabels.append('text')
    .text(d => `${ d.job } (${ d.days_to_start } days${ d.suffix })` )
    .attr('x', d => xScale(d.days_to_start))
    .attr('y', d => d.periodGrouping * (barHeight + barGap) + barHeight / 2)
    .attr('dx', function(d) {
      if ([ 'Secretary of veterans affairs' ].indexOf(d.job) > -1) {
        return dotRadius + 5 + 3;
      }
      if ([ 'OMB director', 'Chief of staff', 'Secretary of homeland security' ].indexOf(d.job) > -1) {
        return -(dotRadius);
      }
    })
    .attr('dy', function(d) {
      switch(d.job) {
        case 'OMB director':
          return -30;
          break;
        case 'Chief of staff':
          return 25;
          break;
        case 'Secretary of homeland security':
          return 23;
          break;
        default:
          return -10;
          break;
      }
    })
    .call(wrapText, 85, 12);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

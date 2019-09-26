var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => "\u2019" + (d.getFullYear() + "").slice(-2);
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
    d.year_start = new Date(Number(d.year_start), 0, 1);
    d.year_end = new Date(Number(d.year_end), 11, 31);
    d.age_oldest = Number(d.age_oldest);
    d.age_youngest = Number(d.age_youngest);
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  var container = "#chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderTimeline({
    container,
    width,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

// Render timeline
var renderTimeline = function(config) {
  var chartHeight = 30;
  var barHeight = chartHeight;
  // var barHeight = chartHeight - 10;

  var margins = {
    top: 20,
    right: 15,
    bottom: 70,
    left: 10
  };

  var ticksX = 10;
  var ticksY = 10;

  // Mobile
  if (isMobile.matches) {
    chartHeight = 20;
    barHeight = 20;
    margins.bottom = 140;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var xScale = d3
    .scaleTime()
    .domain([ new Date(1920,0,1), new Date(2020,0,1) ])
    .range([ 0, chartWidth ]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.generation;
      })
    )
    .range([ '#51a09e','#43878c','#356f7a','#285869','#194158' ]);
    // http://gka.github.io/palettes/#colors=#51A09E,#194158|steps=5|bez=1|coL=1

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
    .axisTop()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        if (fmtYearFull(d) == '1920' || fmtYearFull(d) == '2000' || fmtYearFull(d) == '2020') {
          return fmtYearFull(d);
        } else {
          return fmtYearAbbrev(d);
        }
      } else {
        return fmtYearFull(d);
      }
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, 0))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = function() {
    return xAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, 0))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  // render bars
  var bg = chartElement.insert('rect', '*')
    .attr('class', 'bg')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', chartWidth)
    .attr('height', chartHeight);

  var bars = chartElement.append('g')
    .attr('class', 'years')
    .selectAll('rect')
    .data(config.data)
    .enter()
      .append('rect')
        .attr('class', d => classify(d.generation))
        .attr('x', d => xScale(d.year_start))
        .attr('y', (chartHeight - barHeight) / 2)
        .attr('width', d => xScale(d.year_end) - xScale(d.year_start))
        .attr('height', barHeight)
        .attr('fill', d => colorScale(d.generation));

  var labels = chartElement.append('g')
    .attr('class', 'year-labels')
    .selectAll('text')
    .data(config.data)
    .enter()
      .append('g')
        .attr('class', d => classify(d.generation))

  labels.append('circle')
    .attr('cx', d => xScale(d.year_start) + ((xScale(d.year_end) - xScale(d.year_start)) / 2))
    .attr('cy', function(d, i) {
      return setLineYPos(1, i, chartHeight);
    })
    .attr('r', 3);

  labels.append('line')
    .attr('x1', d => xScale(d.year_start) + ((xScale(d.year_end) - xScale(d.year_start)) / 2))
    .attr('x2', d => xScale(d.year_start) + ((xScale(d.year_end) - xScale(d.year_start)) / 2))
    .attr('y1', function(d, i) {
      return setLineYPos(1, i, chartHeight);
    })
    .attr('y2', function(d, i) {
      return setLineYPos(2, i, chartHeight);
    });

  labels.append('text')
    .text(d => isMobile.matches ? d.gen_mobile : d.generation)
    .attr('class', 'gen-name')
    .attr('x', d => xScale(d.year_start) + ((xScale(d.year_end) - xScale(d.year_start)) / 2))
    .attr('y', function(d, i) {
      return setLabelYPos(i, chartHeight);
    })
    .attr('fill', d => colorScale(d.generation));

  labels.append('text')
    .text(function(d) {
      return 'Born ' + d.year_start.getFullYear() + '-' + d.year_end.getFullYear();
    })
    .attr('class', 'gen-dates')
    .attr('x', d => xScale(d.year_start) + ((xScale(d.year_end) - xScale(d.year_start)) / 2))
    .attr('y', function(d, i) {
      return setLabelYPos(i, chartHeight);
    })
    .attr('dy', 18);

  labels.append('text')
    .text(function(d) {
      return d.age_youngest + '-' + d.age_oldest + ' years old';
    })
    .attr('class', 'gen-ages')
    .attr('x', d => xScale(d.year_start) + ((xScale(d.year_end) - xScale(d.year_start)) / 2))
    .attr('y', function(d, i) {
      return setLabelYPos(i, chartHeight);
    })
    .attr('dy', 35);
}

var setLineYPos = function(k, i, chartHeight) {
  var labelPos = setLabelYPos(i, chartHeight);
  switch(k) {
    case 1:
      if (labelPos < 0) {
        return 0;
      } else {
        return chartHeight;
      }
      break;
    case 2:
      if (labelPos < 0) {
        return -10;
      } else {
        return labelPos - 15;
      }
      break;
  }
}

var setLabelYPos = function(i, chartHeight) {
  if (isMobile.matches && (i % 2 == 1)) {
    return chartHeight + 95;
  } else {
    return chartHeight + 30;
  }
}


//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var activeView = 'black';
var charts = [];
var dataSeries = [];
var pymChild;

var { COLORS, classify, fmtComma, makeTranslate } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min")
};

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
  charts = Object.keys(DATA);

  // Restructure tabular data for easier charting.
  charts.forEach(function(v,k) {
    dataSeries[v] = [];
    for (var column in DATA[v][0]) {
      if (column == "Group") continue;

      dataSeries[v].push({
        name: column,
        values: DATA[v].map(d => ({
          category: d.Group,
          amt: Number(d[column])
        }))
      });
    }
  });
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // empty the container div and start over
  element.innerHTML = '';

  var graphicWidth = null; // the width of the chart itself, minus the y-axis label
  var gutterWidth = 22;
  var yAxisLabelWidth = 85;
  var noYAxisLabelWidth = 15;

  // side-by-side on desktop, stacked on mobile
  if (!isMobile.matches) {
    graphicWidth = Math.floor((width - gutterWidth - yAxisLabelWidth - noYAxisLabelWidth) / 2);
  } else {
    graphicWidth = width - yAxisLabelWidth;
  }

  // loop through the charts
  charts.forEach(function(d,i) {
    var chartElement = d3.select(container)
      .append('div')
      .attr('class', 'chart ' + classify(d));

    var marginLeft = yAxisLabelWidth;
    var showYAxisLabels = true;
    var thisGraphicWidth = graphicWidth + marginLeft;

    // desktop-only config
    if (!isMobile.matches) {
      if (i > 0) {
        marginLeft = noYAxisLabelWidth;
        showYAxisLabels = false;
        thisGraphicWidth = graphicWidth + marginLeft;
      }

      chartElement.attr('style', function() {
        var s = '';
        s += 'width: ' + thisGraphicWidth + 'px; ';
        s += 'float: left; ';
        if (i > 0) {
          s += 'margin-left: ' + gutterWidth + 'px; ';
        }
        return s;
      });
    }

    renderLineChart({
      container: '.chart.' + classify(d),
      width: thisGraphicWidth,
      data: dataSeries[d],
      marginLeft: marginLeft,
      showYAxisLabels: showYAxisLabels,
      title: LABELS['hed_' + d],
      yDomain: [ -200000, 200000 ]
    });
  });

  var navElement = d3.select(container)
    .insert('div','*')
    .attr('class', 'nav')
    .selectAll('button')
    .data([ 'White', 'Black', 'Latino' ])
    .enter()
      .append('button')
        .text(function(d) {
          return d;
        })
        .attr('id', function(d) {
          return classify(d);
        });

  var navButtons = document.querySelectorAll('.nav button');
  navButtons.forEach(function(d,i) {
    d.addEventListener('click', onButtonClicked);
  })

  document.querySelector('button#' + activeView).click();

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// toggle chart states
var onButtonClicked = function(evt) {
  var btn = d3.select(this);
  var selected = btn.attr('id');
  activeView = selected;

  d3.selectAll('.active')
    .classed('active', false);
  d3.selectAll("[class*='" + selected + "']")
    .classed('active', true)
    .moveToFront();

  btn.classed('active', true);
}

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var dateColumn = "category";
  var valueColumn = "amt";

  var aspectWidth = 1;
  var aspectHeight = 1;

  var margins = {
    top: 45,
    right: 10,
    bottom: 17,
    left: config.marginLeft
  };

  var ticksY = 10;
  var roundTicksFactor = 5;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  if (config['title']) {
    containerElement.append('h3')
      .text(config['title'])
      .attr('style', !isMobile.matches ? 'margin-left: ' + margins.left + 'px;' : 'text-align: left;');
  }

  var xScale = d3
    .scalePoint()
    .domain(config.data[0].values.map(d => d[dateColumn]))
    .range([ 0, chartWidth ]);

  var min = config.yDomain[0];
  var max = config.yDomain[1];

  var yScale = d3
    .scaleLinear()
    .domain([ min, max ])
    .range([ chartHeight, 0 ]);

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

  var xAxis = d3.axisTop()
    .scale(xScale);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      var prefix = '';
      if (d > 0) {
        prefix = '+';
      } else if (d < 0) {
        prefix = '-';
      }
      return prefix + '$' + fmtComma(Math.abs(d));
    });

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, 0))
    .call(xAxis);

  chartElement.selectAll('.x.axis text')
    .attr('y', -13);

  chartElement.select('.x.axis')
    .append('text')
      .text(LABELS.lbl_xaxis)
      .attr('class', 'axis-label')
      .attr('x', isMobile.matches ? -margins.left : (chartWidth / 2))
      .attr('y', -35);

  if (config.showYAxisLabels) {
    var yAxisElement = chartElement
      .append("g")
      .attr("class", "y axis")
      .call(yAxis);

    yAxisElement.append('text')
      .text(LABELS.lbl_yaxis)
      .attr('class', 'axis-label')
      .attr('transform', 'translate(-73,' + (chartHeight / 2) + ')rotate(-90)');
  }


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
    .attr("transform", makeTranslate(0, 0))
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
    .attr("d", d => line(d.values));

  var dots = chartElement.append('g')
    .attr('class', 'dots')
    .selectAll('g')
    .data(config.data)
    .enter()
      .append('g')
      .attr('class', d => classify(d.name));
  dots.selectAll('circle')
    .data(function(d, i) {
      d.values.forEach(function(v,k) {
        v.series = d.name;
      });
      return d.values;
    })
    .enter()
      .append('circle')
        .attr('cx', d => xScale(d.category))
        .attr('cy', d => yScale(d.amt))
        .attr('r', 4);

  [ 'shadow', 'value' ].forEach(function(v,k) {
    var labels = chartElement.append('g')
      .attr('class', v)
      .selectAll('text')
      .data(config.data)
      .enter()
        .append('text')
          .text(function(d,i) {
            var thisEdLevel = classify(d.name.split(' ')[1]);
            return EDUCATION[thisEdLevel].label;
          })
          .attr('class', d => classify(d.name))
          .attr('x', function(d,i) {
            var last = d.values[d.values.length - 1];
            return xScale(last[dateColumn]) + 4;
          })
          .attr('y', function(d,i) {
            var last = d.values[d.values.length - 1];
            var offset = last[valueColumn] > 0 ? -10 : 17;
            return yScale(last[valueColumn]) + offset;
          });
  })
};

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

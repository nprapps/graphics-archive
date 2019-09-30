var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;
var skipLabels = [ "chart", "label", "values", "total" ];
var { COLORS, makeTranslate, classify, wrapText } = require("./lib/helpers");
var charts = [];

var d3 = {
  ...require("d3-axis"),
  ...require("d3-scale"),
  ...require("d3-selection")
};

var debounce = require("./lib/debounce");

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData(window.DATA);
  render();

  window.addEventListener("resize", debounce(render, 100));

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

// Format graphic data for processing by D3.
var formatData = function(data) {
  charts = [...new Set(data.map(value => value.chart))];

  data.forEach(function(d) {
    var y0 = 0;

    d.values = [];
    d.total = 0;

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1 || d[key] == '') {
        continue;
      }

      d[key] = Number(d[key]);

      var y1 = y0 + d[key];
      d.total += d[key];

      d.values.push({
        name: key,
        y0: y0,
        y1: y1,
        val: d[key]
      });

      y0 = y1;
    }
  });

  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  var container = "#stacked-column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  element.innerHTML = '';

  var graphicWidth = width;
  var gutterWidth = 22;
  if (!isMobile.matches) {
      graphicWidth = Math.floor((width - ((gutterWidth * 2) + 1)) / 2);
  }

  charts.forEach(function(d,i) {
    var chartData = DATA.filter(function(v,k) {
      return v.chart == d;
    });

    var colorRange = [];
    switch(d) {
      case 'housing stock':
        colorRange = [ '#11605e','#3e7f7d','#659f9d','#8bc0bf',   '#e38d2c','#ce7028','#b85324','#a23520' ];
        // colorRange = [ COLORS.orange3, COLORS.orange4, '#999', COLORS.teal3, COLORS.teal2 ];
        break;
      case 'demographics':
        // colorRange = [ '#999', COLORS.teal4,    COLORS.orange3, COLORS.orange3, COLORS.orange3,     COLORS.teal4 ];
        colorRange = [ '#999', COLORS.teal4,    '#aeb372', '#e2b92a', '#aeb372',     COLORS.teal4 ];

        break;
    }

    var chartElement = d3.select('#stacked-column-chart').append('div')
      .attr('class', 'chart ' + classify(d));

    if (!isMobile.matches) {
      chartElement.attr('style', function() {
        var s = '';
        s += 'width: ' + graphicWidth + 'px; ';
        s += 'float: left; ';
        if (i > 0) {
          s += 'border-left: 1px solid #ccc; '
          s += 'margin-left: ' + gutterWidth + 'px; ';
          s += 'padding-left: ' + gutterWidth + 'px; ';
        }
        return s;
      });
    }

    // Render the chart!
    renderStackedColumnChart({
      container: '.chart.' + classify(d),
      width: graphicWidth,
      data: chartData,
      colorRange
    });
  });

  // align heds
  if (!isMobile.matches) {
    var labelHeds = d3.selectAll('.graphic h3');
    var labelMaxHeight = 0;

    labelHeds['_groups'][0].forEach(function(d,i) {
      var thisHeight = d.getBoundingClientRect().height;
      if (thisHeight > labelMaxHeight) {
        labelMaxHeight = thisHeight;
      }
    });

    labelHeds.style('height', labelMaxHeight + 'px');
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a stacked column chart.
var renderStackedColumnChart = function(config) {
  // Setup
  var labelColumn = "label";

  var valueGap = 6;

  var margins = {
    top: 0,
    right: 200,
    bottom: 5,
    left: 0
  };

  var maxHeight = 350;
  var maxWidth = 100;

  var labelLineHeight = 14;
  var roundTicksFactor = 100;

  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  if (chartWidth > maxWidth) {
    chartWidth = maxWidth;
    margins.right = config.width - chartWidth - margins.left;
  };
  var chartHeight = maxHeight;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);

  // header
  containerElement.append('h3')
    .html(config.data[0][labelColumn]);

  var labels = config.data.map(d => d[labelColumn]);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(labels)
    .range([0, chartWidth])
    .padding(0);

  var values = config.data.map(d => d.total);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  var max = 100;

  if (min > 0) {
    min = 0;
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(k => skipLabels.indexOf(k) == -1)
    )
    .range(config.colorRange);

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(d => d);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickFormat(d => d);

  // Render bars to chart.
  var bars = chartElement.selectAll(".bars")
    .data(config.data)
    .enter()
      .append("g")
        .attr("class", "bar")
        .attr("transform", function(d) {
          return makeTranslate(xScale(d[labelColumn]), 0);
        });

  bars.selectAll("rect")
    .data(d => d.values)
    .enter()
      .append("rect")
        .attr("y", function(d) {
          if (d.y1 < d.y0) {
            return yScale(d.y0);
          }

          return yScale(d.y1);
        })
        .attr("width", xScale.bandwidth())
        .attr("height", function(d) {
          return Math.abs(yScale(d.y0) - yScale(d.y1));
        })
        .style("fill", function(d) {
          return colorScale(d.name);
        })
        .attr("class", function(d) {
          return classify(d.name);
        });

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

  // Render values to chart.
  var chartLabels = chartElement.append('g')
    .attr('class', 'labels')
    .selectAll('text')
    .data(config.data[0].values)
    .enter()
      .append('text')
        .text(d => (d.name + ': ' + d.val + '%'))
        .attr('x', chartWidth + valueGap)
        .attr('y', function(d, i) {
          var textHeight = d3
            .select(this)
            .node()
            .getBBox().height;
          var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;
          return barCenter + (textHeight / 2) - 3;
        })
        .attr('fill', d => colorScale(d.name));
};


// Initially load the graphic
//(NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

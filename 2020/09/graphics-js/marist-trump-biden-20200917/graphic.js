var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var charts = [];

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "offset", "chart"];

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle } = require("./lib/helpers");

// Initialize the graphic.
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

// Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    // var x0 = 0;

    d.values = [];

    var x0 = d.offset;

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      var x1 = x0 + d[key];

      d.values.push({
        name: key,
        label: d.label,
        x0: x0,
        x1: x1,
        val: d[key]
      });

      x0 = x1;
    }
  });

  charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  var keys = ['Biden', 'Clinton 2016', 'Trump', 'Trump 2016'];
  var colorScale = d3
    .scaleOrdinal()
    .domain(
      keys
    )
    .range([ '#237bbd', 'rgb(35, 123, 189, .5)', '#d62021',  'rgb(214, 32, 33, .5)' ]);

  renderLegend({
    container,
    data: DATA,
    colorScale
  });

  charts.forEach(function(d,i) {
    var chartData = DATA.filter(function(v) {
      return v.chart == d;
    });

    containerElement.append('div')
      .attr('class', 'chart ' + classify(d));

    renderStackedBarChart({
      container: container + ' .chart.' + classify(d),
      width,
      data: chartData,
      colorScale,
      xDomain: [ -95, 95 ],
      title: d
    });
  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderLegend = function(config) {
  var containerElement = d3.select(config.container);
  var colorScale = config.colorScale;

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  legend.append("b").style("background-color", colorScale);

  legend.append("label").text(d => d);
}

// Render a stacked bar chart.
var renderStackedBarChart = function(config) {
  // Setup
  var labelColumn = "label";

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 145;
  var labelMargin = 8;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 0,
    bottom: 0,
    left: labelWidth + labelMargin
  };

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  if (config.title) {
    containerElement.append('h3')
      .html(config.title);
  }

  var min = config.xDomain[0];
  var max = config.xDomain[1];

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([0, chartWidth]);

  var colorScale = config.colorScale;

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

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d[labelColumn]))
    .attr(
      "transform",
      (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    );

  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", function(d) { 
      if (d.label.includes('2016')) {
        return d.name == 'Biden' ? colorScale('Clinton 2016') : colorScale('Trump 2016');
      }
      return colorScale(d.name)
    })
    .attr("class", d => classify(d.name));

  // Render bar values.
  group
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(function(d) {
      var units = isMobile.matches ? "" : "%";
      return d.val ? d.val.toFixed(0) + units : null;
    })
    .attr('class', function(d) {
        var c = classify(d['name']);
        if (d['x0'] < 0) {
            c += ' left';
        } else {
            c += ' right';
        }
        return c;
    })
    .attr('x', function(d) {
        if (d.x0 < 0) {
            return xScale(d.x0);
        } else {
            return xScale(d.x1);
        }
    })
    .attr("dx", function(d, i) {
      var textWidth = this.getComputedTextLength();
      var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

      if (textWidth > barWidth) {
          if (i == 0 || i == config['data'][0]['values'].length - 1) {
              // first or last item -- set outside the bar
              d3.select(this).classed('out', true);

              if (d.x0 < 0) {
                  return -valueGap;
              } else {
                  return valueGap;
              }
          } else {
              // middle bar -- hide
              d3.select(this).classed('hidden', true);
              return 0;
          }
      } else if (textWidth < barWidth && (textWidth + valueGap * 2) > barWidth) {
          // label baaaarely fits inside the bar. center it in the avail space
          d3.select(this).classed('center', true);

          var xShift = ((xScale(d.x1) - xScale(d.x0)) / 2);

          if (d.x0 < 0) {
              return xShift;
          } else {
              return -xShift;
          }

      } else {
          if (d.x0 < 0) {
              return valueGap;
          } else {
              return -valueGap;
          }
      }
    })
    .attr("dy", barHeight / 2 + 4);

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight - barGap);
  }

  // Render bar labels.
  chartWrapper
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
    .data(config.data)
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
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

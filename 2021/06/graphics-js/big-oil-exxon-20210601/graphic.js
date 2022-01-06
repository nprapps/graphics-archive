var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var charts = [];

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "moe", "offset", "chart"];

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var $ = require('./lib/qsa');

var { COLORS, classify, makeTranslate, formatStyle, wrapText } = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    var x0 = 0;

    d.values = [];

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      d[key] = d[key];

      var x1 = x0 + d[key];

      d.values.push({
        name: key,
        x0: x0,
        x1: x1,
        val: d[key],
        moe: d.moe
      });

      x0 = x1;
    }
  });

  charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  console.log(DATA);
};

// Render the graphic(s). Called by pym with the container width.
var render = function(colorScale) {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      ['Carbon capture capital expenditures',
    'All other capital expenditures']
    )
    .range([ COLORS.teal3, COLORS.yellow3]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
      .append("li")
      .attr("class", (d, i) => `key-item key-${i} ${d}`);

  legend.append("b")
    .style("background-color", colorScale);

  legend.append("label").text(d => d);

  charts.forEach(function(d,i) {
    var chartData = DATA.filter(function(v) {
      return v.chart == d;
    });

    containerElement.append('div')
      .attr('class', 'chart ' + classify(d));

    var showLegend =  false;
    var showTitle =  true;

    renderStackedBarChart({
      container: container + ' .chart.' + classify(d),
      width,
      data: chartData,
      xDomain: [ -95, 95 ],
      title: d,
      showLegend,
      showTitle
    });
  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a stacked bar chart.
var renderStackedBarChart = function(config) {
  // Setup
  var labelColumn = "label";

  console.log(config)

  // var barHeight = 55;
  var barHeight = 30;
  var barGap = 8;
  var labelWidth = 0;
  var labelMargin = 10;
  var valueGap = 6;


  if (!isMobile.matches)  {
    barHeight= 25;
  }
  var margins = {
    top: 20,
    right: 30,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 20;

  if (isMobile.matches) {
    ticksX = 2;
    margins.right = 10;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  var max = Math.max(...ceilings);
  var max = 120;

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([0, chartWidth]);

  var colorMap = {
    'carbon-capture' : COLORS.teal3,
    'total-capex-through-2025' : COLORS.yellow3,
  }

  var colorMapText = {
    'carbon-capture' : COLORS.teal3,
    'total-capex-through-2025' : COLORS.yellow2,
  }

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
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => d);

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = () => xAxis;


  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  var ticks = $('.x.axis .tick text');
  var currText = ticks[ticks.length -1].innerHTML
  ticks[ticks.length -1].innerHTML = currText + ' billion';

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d[labelColumn]))
    .attr("fill", d => colorMap[classify(d[labelColumn])])
    // .attr(
    //   "transform",
    //   (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    // );

  group
    .selectAll("rect")
    .data(d => d.values.filter(d => d.name != 'moe'))
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0) + xScale(d.moe || 0)))
    .attr("height", barHeight)
    .style("fill", d => colorMap[classify(config.title)])
    .attr("class", d => classify(d.name));


  // Render MOE sections
  chartElement
    .append("g")
    .attr("class", "moe-bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d.amt))
    .attr("width", d => xScale(d.moe))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("height", barHeight)
    .attr("class", (d, i) => `bar-${i} moe inner ${classify(d.label)}`);

  // chartElement
  //   .append("g")
  //   .attr("class", "moe-bars")
  //   .selectAll("rect")
  //   .data(config.data)
  //   .enter()
  //   .append("rect")
  //   .attr("x", d => xScale(d.amt))
  //   .attr("width", d => xScale(d.moe))
  //   .attr("y", (d, i) => i * (barHeight + barGap))
  //   .attr("height", barHeight)
  //   .attr("class", (d, i) => `bar-${i} moe outer ${classify(d.label)}`);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(function(d) {
      if (d.amt == 96) {
        if (isMobile.matches) {
          return 'Between $93 billion - $116 billion'
        }
        return 'All other capital expenditures: Between $93 billion - $116 billion';
      }
      if (isMobile.matches) {
        return '$' + d.amt.toFixed(0) + ' billion';
      }
      return 'Carbon capture: $' + d.amt.toFixed(0) + ' billion';
    })
    .attr("x", function(d) {
      if (d.amt == 3) {
        return 0;
      }
      return xScale(d.amt + 20) + 5;
    })
    .attr("y", 0)
    .attr("dy", -5)
    .attr("class", d => classify(d[labelColumn]))
    .attr("fill", d => colorMapText[classify(d[labelColumn])]);

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);
  }

  // // Render bar labels.
  // chartWrapper
  //   .append("ul")
  //   .attr("class", "labels")
  //   .attr(
  //     "style",
  //     formatStyle({
  //       width: labelWidth + "px",
  //       top: margins.top + "px",
  //       left: "0"
  //     })
  //   )
  //   .selectAll("li")
  //   .data(config.data.slice(0,1))
  //   .enter()
  //   .append("li")
  //   .attr("style", (d, i) =>
  //     formatStyle({
  //       width: labelWidth + "px",
  //       height: barHeight + "px",
  //       left: "0px",
  //       top: i * (barHeight + barGap) + "px;"
  //     })
  //   )
  //   .attr("class", d => classify(d[labelColumn]))
  //   .append("span")
  //   .text(d => d[labelColumn]);
};
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

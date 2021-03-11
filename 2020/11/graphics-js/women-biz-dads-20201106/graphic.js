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

var renderStackedBarChart = require("./renderBars");

// Initialize the graphic.
var onWindowLoaded = function () {
  var data = formatData();
  render(data);

  window.addEventListener("resize", () => render(data));

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
        val: d[key]
      });

      x0 = x1;
    }
  });

  charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  console.log(DATA);
  return DATA;
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(DATA[0]).filter(d => skipLabels.indexOf(d) == -1)
    )
    .range([ COLORS.teal3, "#999", COLORS.orange3]);

  // Render the legend.
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(colorScale.domain())
  //   .enter()
  //     .append("li")
  //     .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  // legend.append("b")
  //   .style("background-color", colorScale);

  // legend.append("label").text(d => d);

  charts.forEach(function(d,i) {
    var chartData = DATA.filter(function(v) {
      return v.chart == d;
    });

    var max = 2500000;
    var percent = false;
    console.log(chartData)
    if (chartData[0].chart.includes("fathers")) {
      max = 20;
      percent = true;
    }

    containerElement.append('div')
      .attr('class', 'chart ' + classify(d));

    var showLegend =  false;
    var showTitle =  true;
    if (percent) showTitle = false;

    renderStackedBarChart({
      container: container + ' .chart.' + classify(d),
      width,
      data: chartData,
      colorScale,
      xDomain: [ -95, 95 ],
      title: d,
      showLegend,
      showTitle,
      percent
    }, max );

    // if (percent) {
    //   containerElement.append('h4').attr('class', 'subheader').text('Number who are ___')
    // }
  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

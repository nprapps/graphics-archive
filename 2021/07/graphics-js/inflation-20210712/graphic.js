var pym = require("./lib/pym");
require("./lib/webfonts");

var pymChild;
var renderLineChart = require("./renderLineChart");
var { isMobile } = require("./lib/breakpoints");
var { classify } = require("./lib/helpers");

var d3 = {
  // ...require("d3-axis/dist/d3-axis.min"),
  // ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  // ...require("d3-shape/dist/d3-shape.min"),
  // ...require("d3-interpolate/dist/d3-interpolate.min")
};

// source: https://www.nber.org/research/data/us-business-cycle-expansions-and-contractions
var recession_dates = [
    // { 'begin':'1929-08-01','end':'1933-03-01' },
    // { 'begin':'1937-05-01','end':'1938-06-01' },
    // { 'begin':'1945-02-01','end':'1945-10-01' },
    // { 'begin':'1948-11-01','end':'1949-10-01' },
    // { 'begin':'1953-07-01','end':'1954-05-01' },
    // { 'begin':'1957-08-01','end':'1958-04-01' },
    // { 'begin':'1960-04-01','end':'1961-02-01' },
    // { 'begin':'1969-12-01','end':'1970-11-01'  },
    // { 'begin':'1973-11-01','end':'1975-03-01' },
    // { 'begin':'1980-01-01','end':'1980-07-01' },
    // { 'begin':'1981-07-01','end':'1982-11-01'  },
    // { 'begin':'1990-07-01','end':'1991-03-01' },
    // { 'begin':'2001-03-01','end':'2001-11-01' },
    // { 'begin':'2007-12-01','end':'2009-06-01'  },
    { 'begin':'2020-02-01','end':'2021-06-01' }
];

//Initialize graphic
var onWindowLoaded = function() {
  var series = formatData(window.DATA);
  render(series);

  window.addEventListener("resize", () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function(data) {
  var series = [];

  data.forEach(function(d) {
    if (d.date instanceof Date) return;
    var [m, y] = d.date.split("/").map(Number);
    // y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, 1);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (column == "date" || column == "year" || column == "month") continue;

    series.push({
      name: column,
      values: data.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }

  recession_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
  });

  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  element.innerHTML = "";

  var numCols = isMobile.matches ? 1 : 2;
  var gutterWidth = 22;
  var graphicWidth = width;
  if (numCols > 1) {
    graphicWidth = Math.floor((width - (gutterWidth * (numCols - 1))) / numCols);
  }

  data.forEach(function(chart, i) {
    var chartData = chart;

    element.innerHTML += `<div class="chart chart-${ i } ${ classify(chart.name) }"></div>`;

    renderLineChart({
      container: container + " .chart." + classify(chart.name),
      width: graphicWidth,
      title: chart.name,
      yDomain: [-1, 6],
      data: [chart],
      recession_dates,
      dateColumn: "date",
      valueColumn: "amt",
      idx: i
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

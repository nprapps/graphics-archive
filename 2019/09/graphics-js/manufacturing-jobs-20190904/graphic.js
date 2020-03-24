console.clear()
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { COLORS, classify, makeTranslate, getAPMonth, wraptext } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, makeTranslate, wrapText } = require("./lib/helpers");

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

// source: http://www.nber.org/cycles.html
var recession_dates = [
    // { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
];

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
    d.date = new Date(d.date);
  });

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (column == "date") continue;

    dataSeries.push({
      name: column,
      values: DATA.map(d => ({
        date: d.date,
        amt: d[column]
      }))
    });
  }
};

recession_dates.forEach(function(d) {
  [ 'begin', 'end' ].forEach(function(v, k) {
    var [y, m, day] = d[v].split("-").map(Number);
    d[v] = new Date(y, m - 1, day);
  })
});

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 75,
    bottom: 20,
    left: 65
  };

  var wrapLineheight = 12;

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 5000;
  
  var startVal = {
    x: new Date("Thu Mar 01 2007 00:00:00 GMT-0500"),
    y: 13970,
    xOffset: 0,
    yOffset: -20,
    mon: "March"
  };
  var minVal = {
    x: new Date(2010,2),
    y: 11453,
    xOffset: -5,
    yOffset: 15,

  }



  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 60;
    margins.left = 35;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

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

  // if (min > 0) {
  //   min = 0;
  // }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

  // Render the HTML legend.

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d.name));

  legend.append("b").style("background-color", d => colorScale(d.name));

  legend.append("label").text(d => d.name);

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
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return "\u2019" + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d,i){
      if (isMobile.matches) {
        return d / 1000 + "M";
      } else {
        return d / 1000 + " million";
      }
      console.log(d)
      
    });

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

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
    .attr("transform", makeTranslate(0, chartHeight))
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
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  /*
   * Render annotations.
   */

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = recession_dates[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', isMobile.matches ? chartHeight - 15 : 20)
    .text('Recession');

  chartElement.append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(lastItem(config.data[0])[dateColumn]))
    .attr("cy", d => yScale(lastItem(config.data[0])[valueColumn]))
    .attr("fill", COLORS.red3)
    .attr("r", 3);

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var text = "Aug." + ' ' + fmtYearFull(item.date);
      var label = (value / 1000).toFixed(1) + " million";

      // if (!isMobile.matches) {
        label = text + " " + label;
      // }

      return label;
    })
    .call(wrapText, margins.right, wrapLineheight);

  //add annotation for low value
  chartElement.append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(minVal.x))
    .attr("cy", d => yScale(minVal.y))
    .attr("fill", COLORS.red3)
    .attr("r", 3);


  chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("class", "value")
    .attr("x", d => xScale(minVal.x) + minVal.xOffset)
    .attr("y", d => yScale(minVal.y) + minVal.yOffset)
    .text(function(d) {      
      var text = getAPMonth(minVal.x) + ' ' + fmtYearFull(minVal.x);
      var label = (minVal.y / 1000).toFixed(1) + " million";

      // if (!isMobile.matches) {
        label = text + " " + label;
      // }

      return label;
    })
    .call(wrapText, margins.right, wrapLineheight);


 //add annotation for start value
  chartElement.append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(startVal.x))
    .attr("cy", d => yScale(startVal.y))
    .attr("fill", COLORS.red3)
    .attr("r", 3);


  chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("class", "value")
    .attr("x", d => xScale(startVal.x) + startVal.xOffset)
    .attr("y", d => yScale(startVal.y) + startVal.yOffset)
    .text(function(d) {      
      var text = startVal.mon + ' ' + fmtYearFull(startVal.x);
      var label = (startVal.y / 1000).toFixed(0) + " million";

      // if (!isMobile.matches) {
        label = text + " " + label ;
      // }

      return label;
    })
    .call(wrapText, margins.right, wrapLineheight);
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

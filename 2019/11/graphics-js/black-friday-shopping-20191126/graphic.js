console.clear()

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

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

//Initialize graphic
var onWindowLoaded = function() {
  formatData();
  render();



  window.addEventListener("resize", render);
  animation();


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
    var [m, day, y] = d.date.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.date = d.date
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
  var aspectHeight = isMobile.matches ? 3 : 7;

  var margins = {
    top: 5,
    right: 3,
    bottom: 43,
    left: 30
  };

  var ticksX = 49;
  var ticksY = 5;
  var roundTicksFactor = .025;

  // Mobile
  if (isMobile.matches) {
    ticksX = 15;
    // ticksY = 5;
    margins.right = 25;
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
  var extent = [0, dates.length - 1];


  var xScale = d3
    .scaleLinear()
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
  // var max = Math.max.apply(null, ceilings);
  var max = .12

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
      COLORS.teal6,
      COLORS.teal4,
      COLORS.teal2,
      COLORS.teal1,
    ]);

  // Render the HTML legend.

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("li")
    .attr("class", d => "key-item key-item-" + classify(d.name));

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
      if (i%6 != 0) {
        return ""
      }
      var hour = config.data[0].values[d][dateColumn].split(" ")[1]
      console.log(parseInt(hour))
      if (parseInt(hour) == 0) {
        return "12 a.m."
      }
      if (parseInt(hour) == 12) {
        return "12 p.m." 
      }
      if (parseInt(hour) < 12) {
        return hour + " a.m."
      }
      return hour-12 + " p.m."
    });



  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d=>d*100 + "%");

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
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );


  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    )

  d3.select(".x.grid")
    .selectAll("text.day-label")
    .data(["Thanksgiving", "Black Friday"])
    .enter()
    .append('text')
    .attr('class', "day-label")
    .attr("y", 38)
    .attr("x", function(d,i){
      return xScale(12 + 24*i)
    })
    .text(d => d)

  // highlight grid lines 

  var gridLineSelector = ".x.grid .tick line"
  var xGridLines = 

  d3.selectAll(gridLineSelector).filter(d => d%12 == 0)
    .classed('highlight-grid', true)

  d3.selectAll(gridLineSelector).filter(d => d%24 == 0 && d > 0)
    .classed('highlight-strong-grid', true)

  // d3.selectAll(gridLineSelector).each(function(d, ind) {
  //   if (ind%6==0) {
  //     d3.select(gridLineSelector + "")
  //       .classed("highlight-grid", true)
  //   }
  //   if (ind == 24) {
  //     d3.select(xGridLines[ind])
  //       .classed("highlight-grid", true)
  //   }
  // })





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
    .x(function(d, i){
      return xScale(i)
    })
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line line-" + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  d3.select(".line.line-" + startingLine)
    .attr("style", "display: block;")


  d3.select(".key-item-" + startingLine)
    .classed("highlight-key", true)

  var lastItem = d => d.values[d.values.length - 1];


};




// BEGIN ANIMATION PUZZLE

var bringInLine = function(stage){
  d3.select(".line.line-" + stage)
    .classed("show", true)

  d3.selectAll(".key-item")
    .classed("highlight-key", false)

  d3.select(".key-item-" + stage)
    .classed("highlight-key", true)
}


var startingLine = 2015;
var maxLine = 2018;
var pauseYears = 3;

var stage = startingLine;
var tick;
var lastTick = 0;



var animation = function() {



  if (tick) {
    clearTimeout(tick)
  };

  if (stage == startingLine) {
    d3.selectAll(".line").classed('show', false)
  }

  if (d3.select(".key-item-" + startingLine).classed("highlight-key") && stage != startingLine + 1) {
    stage = startingLine
  }





  if (stage <= maxLine) {
    bringInLine(stage)
  }

  stage = stage + 1



  if (stage >=  maxLine + pauseYears) {
    stage = startingLine
  }

  tick = setTimeout(animation, 1000);
}


//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

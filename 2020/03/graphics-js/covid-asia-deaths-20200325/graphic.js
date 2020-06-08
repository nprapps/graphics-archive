var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { COLORS, getAPMonth, classify, makeTranslate, wrapText, fmtComma } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ", " + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + " " + fmtDayYear(d).trim();

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
  // DATA.forEach(function(d) {
  //   var [m, day, y] = d.date.split("/").map(Number);
  //   y = y > 50 ? 1900 + y : 2000 + y;
  //   d.date = new Date(y, m - 1, day);
  // });

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (column == "date") continue;

    dataSeries.push({
      name: column,
      values: DATA.filter(d => d[column]).map(d => ({
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
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 6,
    right: 80,
    bottom: 50,
    left: 50
  };

  var ticksX = 10;
  var ticksY = 3;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 3;
    margins.right = 20;
    margins.top = 5;

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
  // var extent = [dates[0], dates[dates.length - 1]];
  var xMax = 50;
  var xMin = 0;

  var extent = [xMin, xMax];


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
  var max = Math.max.apply(null, ceilings);
  var max = 1000;


  var yScale = d3
    .scaleLog()
    .domain([1, max])
    .range([chartHeight, 1]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.red3,
      COLORS.blue1,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.teal3,
      COLORS.orange3

    ]);

  // Render the HTML legend.

  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d.name));

  // legend.append("b").style("background-color", d => colorScale(d.name));

  // legend.append("label").text(d => d.name);

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
    .ticks(ticksX);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => fmtComma(d))

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

  // Render 0 value line.

  // chartElement
  //     .append("line")
  //     .attr("class", "zero-line")
  //     .attr("x1", 0)
  //     .attr("x2", chartWidth)
  //     .attr("y1", yScale(100))
  //     .attr("y2", yScale(100));

  // chartElement
  //     .append("line")
  //     .attr("class", "zero-line")
  //     .attr("x1", xScale(0))
  //     .attr("x2", xScale(0))
  //     .attr("y1", 0)
  //     .attr("y2", chartHeight);      

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

  // Render dots
  // var dots = chartElement
  //   .append("g")
  //   .attr("class", "dots")
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //     .append("g")
  //     .attr('class',d => classify(d.name));

  // dots.selectAll("circle")
  //   .data(function(d, i) {
  //     d.values.forEach(function(v,k) {
  //       v.series = d.name;
  //     });
  //     return d.values;
  //   })
  //   .enter()
  //     .append("circle")
  //     .attr("cx", d => xScale(d[dateColumn]))
  //     .attr("cy", d => yScale(d[valueColumn]))
  //     .attr("fill", d => colorScale(d.series))
  //     .attr("stroke-width",function(d){
  //       var width = 1;
  //       if (!isMobile.matches) {
  //         width = 0.5;
  //       }

  //       return width;
  //     })
  //     .attr("stroke","#fff")
  //     .attr("r", 4);

  var lastItem = d => d.values[d.values.length - 1];
  var end = xMax-1;
  var labelOffsetX = 1;
  var labelOffsetY = 3;


  chartElement
    .append("g")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class", function(d) {
      if (d.name == "Singapore") {
        var className = "sg";
      } else {
        var className = "value";
      }
      return className; }
      )
    .attr("x", function(d){
      if (d.name == "South Korea" || d.name == "Singapore" || d.name == "Japan" ){
        var xPos = xScale(lastItem(d)[dateColumn]) + labelOffsetX;
        if (isMobile.matches) {
          var xPos = xScale(lastItem(d)[dateColumn]) + labelOffsetX;
        }
      } else if (d.name == "Hong Kong" && isMobile.matches ){
          var xPos = xScale(lastItem(d)[dateColumn]) - 42;
      }
      else {
        var xPos = xScale(lastItem(d)[dateColumn]) + labelOffsetX;
      } return xPos;
    })
    // d => (d.name === "South Korea" || "Singapore" || "Japan" && isMobile.matches) ? xScale(lastItem(d)[dateColumn]) : xScale(lastItem(d)[dateColumn]) + labelOffsetX)
    .attr("y", function(d) {
      if (d.name == "South Korea" || d.name == "Singapore" || d.name == "Japan" ){
        var yPos = yScale(lastItem(d)[valueColumn]) + labelOffsetY;
        if (isMobile.matches){
          var yPos = yScale(lastItem(d)[valueColumn]) + labelOffsetY;
        }
      } else if (d.name == "Hong Kong" && isMobile.matches) {
          var yPos = yScale(lastItem(d)[valueColumn]) - 5;
      } else {
        var yPos = yScale(lastItem(d)[valueColumn]) + labelOffsetY;
      } return yPos;
    })
    // d => (d.name === "South Korea" || "Singapore" || "Japan" && isMobile.matches) ? yScale(lastItem(d)[valueColumn]) : yScale(lastItem(d)[valueColumn]) + labelOffsetY)
    .text(function(d) {
      var item = lastItem(d);

      if (d.name === "China") {
        item = d.values[end]
      }
      var value = item[valueColumn];
      var label = d.name + ": " + value;

      // if (!isMobile.matches) {
      //   label = d.name + ": " + label;
      // }

      return label;
    }).call(wrapText,100,13)

  // chartElement
  //   .append("g")
  //   .attr("class", "value hide-for-mobile")
  //   .append("text")
  //   .attr("class", "arrow")
  //   .attr("x", xScale(xMax)-20)
  //   .attr("y", yScale(max)+120)
  //   .text("↑")

  // chartElement
  //   .append("g")
  //   .attr("class", "value hide-for-mobile")
  //   .append("text")
  //   .attr("x", xScale(xMax)-110)
  //   .attr("y", yScale(max)+140)
  //   .text(LABELS.chinaLatest)
  //   .call(wrapText,120,13)


  chartElement
  .append("g")
  .attr("class", "value")
  // .attr("id", "margin-of-v")
  .append("text")
  .attr("transform", 'translate(-35,' + (chartHeight/2) + ")rotate(-90)")
  .style("text-anchor", "middle")
  .text(LABELS.yAxisLabel);

  chartElement.append("g")
    .attr("class", "value")
    .append("text")
    .attr("y", chartHeight + 40)
    .attr("x", xScale(0))
    .text(LABELS.xAxisLabel);
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

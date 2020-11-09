var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var doublingRate = [];

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

  for (var column in RATE[0]) {
    if (column == "date") continue;

    doublingRate.push({
      name: column,
      values: RATE.filter(d => d[column]).map(d => ({
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
    top: 15,
    right: 100,
    bottom: 50,
    left: 65
  };

  var ticksX = 10;
  var ticksY = 3;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 3;
    margins.right = 50;
    margins.top = 20;

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
  var xMax = 36;
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
  var max = 10000;


  var yScale = d3
    .scaleLog()
    .domain([10, max])
    .range([chartHeight, 0])
    .base(10);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.blue3,
      COLORS.teal3,
      COLORS.yellow3,
      COLORS.orange3,
      COLORS.orange1,
      COLORS.orange1

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

  legend.append("b").style("background-color", d => colorScale(d.name))
  .style("opacity", function(d) {
    if (d.name == "wa_highlight" || d.name == "wa_highlight2") {
      var opacity = 0;
    } else {
      var opacity = 1;
    } return opacity;
  });

  legend.append("label").text(function(d){
    if (d.name == "wa_highlight" || d.name == "wa_highlight2") {
      var keyText = ""
    } else {
      var keyText = d.name;
    } return keyText;
  });

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

  
  // Render lines to chart.
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));
  
  // Add doubling rate dotted lines
  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(doublingRate)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", "#ccc")
    .style("stroke-dasharray", ("3, 3"))
    .attr("d", d => line(d.values));

      
  // var dayOne = d => d.values.length - 8;
  // var daySeven = d => d.values.length - 1;

  // var daySevenValue = d => d.values[d.values.length - 1];
  // var dayOneValue = d => d.values[d.values.length - 8];

  // var last7Days = d => d.slice(-8);
  // var sth = last7Days(config.data[0]);
  // console.log(sth);


  // Draw slope lines
  // chartElement
  //   .append("g")
  //   .attr("class", "lines")
  //   .data(config.data)
  //   .enter()
  //   .append("path")
  //   .attr("x1", d => xScale(dayOneValue(d)[dateColumn]))
  //   .attr("x2", d => xScale(daySevenValue(d)[dateColumn]))
  //   .attr("y1", d => yScale(dayOneValue(d)[valueColumn]))
  //   .attr("y2", d => yScale(daySevenValue(d)[valueColumn]))
  //   .style("stroke", "#000")
  //   .style("stroke-width", "10")


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
  var end = xMax-1;
  var labelOffsetX = 2;
  var labelOffsetY = 3;


  chartElement
    .append("g")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class", function(d) {
      if (d.name == "wa_highlight" || d.name == "wa_highlight2") {
        var classThis = "value-highlight";
      } else {
        var classThis = "value";
      } return classThis;
    })
    // .attr("x", d => xScale(lastItem(d)[dateColumn]) + labelOffsetX)
    .attr("x", function(d) {
      if (d.name == "wa_highlight" && !isMobile.matches) {
        var xPos = xScale(lastItem(d)[dateColumn]) - 50
      } else if (d.name == "wa_highlight2" && !isMobile.matches) {
        var xPos = xScale(lastItem(d)[dateColumn]) - 80
      } else if (d.name == "wa_highlight" && isMobile.matches) {
        var xPos = xScale(lastItem(d)[dateColumn]) - 20
      } else if (d.name == "wa_highlight2" && isMobile.matches) {
        var xPos = xScale(lastItem(d)[dateColumn]) - 40
      } else {
        var xPos = xScale(lastItem(d)[dateColumn]) + labelOffsetX
      } return xPos;
    })
    // .attr("y", d => yScale(lastItem(d)[valueColumn]) + labelOffsetY)
    // .attr("y", function(d) {
    //   if (d.name == "California") {
    //     var yPos = yScale(lastItem(d)[valueColumn]) + 5;
    //   } else if (d.name == "Louisiana" && isMobile.matches){
    //     var yPos = yScale(lastItem(d)[valueColumn])
    //   } else if (d.name == "Louisiana" && !isMobile.matches){
    //     var yPos = yScale(lastItem(d)[valueColumn]) - 10;
    //   } 
    //   else {
    //     var yPos = yScale(lastItem(d)[valueColumn]) + labelOffsetY;
    //   }
    //   return yPos;
    // })
    .attr("y", function(d) {
      if (d.name == "California") {
        var yPos = yScale(lastItem(d)[valueColumn]) + 5;
      } else if (d.name == "Louisiana"){
        var yPos = yScale(lastItem(d)[valueColumn]);
      } else if (d.name == "wa_highlight" && !isMobile.matches) {
        var yPos = yScale(lastItem(d)[valueColumn] - 10)
      }
      else if (d.name == "wa_highlight2" && !isMobile.matches) {
        var yPos = yScale(lastItem(d)[valueColumn] + 100)
      } else if (d.name == "wa_highlight" && isMobile.matches) {
        var yPos = yScale(lastItem(d)[valueColumn] - 12)
      }
      else if (d.name == "wa_highlight2" && isMobile.matches) {
        var yPos = yScale(lastItem(d)[valueColumn] + 300)
      }
      else {
        var yPos = yScale(lastItem(d)[valueColumn]) + labelOffsetY;
      }
      return yPos;
    })
    .text(function(d) {
      // var item = lastItem(d);

      // var value = item[valueColumn];
      // var label = fmtComma(value);

      // if (!isMobile.matches) {
      //   label = d.name + ": " + label;
      // }

      if (!isMobile.matches) {
        label = d.name;
      }
      else if (isMobile.matches) {
        label = ""
      }

      if (d.name == "wa_highlight") {
        label = LABELS.washington_start;
      }

      else if (d.name == "wa_highlight2") {
        label = LABELS.washington_end;
      } 
      // else {
      //   label = d.name;
      // }
      return label;
    })
    // .text(function(d) {
    //   var item = lastItem(d);

    //   var value = item[valueColumn];
    //   var label = fmtComma(value);
    //   if (d.name == "California") {
    //     var timeLabel = LABELS.california + " days";
    //   }
    //   else if (d.name == "Washington") {
    //     var timeLabel = LABELS.washington + " days";
    //   }
    //   else if (d.name == "New York") {
    //     var timeLabel = LABELS.newyork + " days";
    //   }
    //   else if (d.name == "Louisiana") {
    //     var timeLabel = LABELS.louisiana + " days";
    //   }  if (!isMobile.matches) {
    //          timeLabel = "Doubling time: " + timeLabel;
    //       }return timeLabel;
    // })
    .call(wrapText,85,13)


  chartElement
  .append("g")
  .attr("class", "axis-label")
  .append("text")
  .attr("transform", 'translate(-50,' + (chartHeight/2) + ")rotate(-90)")
  .style("text-anchor", "middle")
  .text(LABELS.yAxisLabel);

  chartElement.append("g")
    .attr("class", "axis-label")
    .append("text")
    .attr("y", chartHeight + 40)
    .attr("x", xScale(0))
    .text(LABELS.xAxisLabel);

  //annotating doubling rates
  chartElement
    .append("g")
    .attr("class", "rate")
    .selectAll("text")
    .data(doublingRate)
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", function(d) {
      if (d.name == "...every 7 days"){
          var xPos = xScale(lastItem(d)[dateColumn]) - 20;
      } else {
        var xPos = xScale(lastItem(d)[dateColumn])

      } return xPos;
    })
    .attr("y", function(d) {

      if (d.name == "...every 7 days"){
          var yPos = yScale(lastItem(d)[valueColumn]) + 25;
      } else {
        var yPos = yScale(lastItem(d)[valueColumn]) - 3;
      }
      
      return yPos;
    })
    .text(d => d.name)
    .call(wrapText,80,13);

    

};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

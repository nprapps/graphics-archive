var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { classify, makeTranslate } = require("./lib/helpers");
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


var formatData = function() {
    // Restructure tabular data for easier charting.
  for (var i = 0; i < DATA.length; i++) {
    dataSeries.push([]);

    for (var column in DATA[i][0]) {
      if (column == "date") continue;

      dataSeries[i].push({
        name: column,
        values: DATA[i].map(d => ({
          date: d.date,
          amt: d[column]
        }))
      });
    }
  }
}

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!

  for (var i = 0; i < DATA.length; i++) {

    var container = `#line-chart${i}`;
    var element = document.querySelector(container);
    var width = element.offsetWidth;
    renderLineChart({
      container,
      width,
      data: dataSeries[i],
      itemNum: i
    });
  } 

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

  var aspectWidth = isMobile.matches ? 1 : 1;
  var aspectHeight = isMobile.matches ? 1 : 1;

  var margins = {
    top: 5,
    right: 15,
    bottom: 15,
    left: 20
  };

  var ticksX = 4;
  var ticksY = 5;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
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

  if (min > 0) {
    min = 0;
  }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = 75;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

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
      // if (isMobile.matches) {
        return "\u2019" + fmtYearAbbrev(d);
      // } else {
      //   return fmtYearFull(d);
      // }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d + "%");



      // add axis lines
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0) )
      .attr("y2", yScale(0) );

  // Render for first chart but not others
  if (config.itemNum === 0) {
    // chartElement
    //   .append("g")
    //   .attr("class", "x axis")
    //   .attr("transform", makeTranslate(0, chartHeight + 10))
    //   .call(xAxis);

    // chartElement
    //   .append("g")
    //   .attr("class", "y axis")
    //   .call(yAxis);

    chartElement
      .append("line")
      .attr("class", "mid-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(25))
      .attr("y2", yScale(25));

    chartElement
      .append("line")
      .attr("class", "mid-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(50))
      .attr("y2", yScale(50));

    //axis labels
    var yStart = yScale(0)+20;
    var xTextOffset = 20;
    var yScaleXOffset = 25;
    var yScaleYOffset = 4;

    chartElement
      .append("text")
      .attr("class","axis")
      .attr("x",xScale(1)-xTextOffset)
      .attr("y",yStart)
      .text("Aug. ’18");

    chartElement
      .append("text")
      .attr("class","axis")
      .attr("x",xScale(2)-xTextOffset)
      .attr("y",yStart)
      .text("Dec. ’18");

    chartElement
      .append("text")
      .attr("class","axis")
      .attr("x",xScale(3)-xTextOffset)
      .attr("y",yStart)
      .text("Aug. ’19");

    chartElement
      .append("text")
      .attr("class","axis")
      .attr("x",-yScaleXOffset)
      .attr("y",yScale(0) + yScaleYOffset)
      .text("0%");

    chartElement
      .append("text")
      .attr("class","axis")
      .attr("x",-yScaleXOffset)
      .attr("y",yScale(25) + yScaleYOffset)
      .text("25%");

    chartElement
      .append("text")
      .attr("class","axis")
      .attr("x",-yScaleXOffset)
      .attr("y",yScale(50) + yScaleYOffset)
      .text("50%");
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
    .attr("stroke", d => "#D8472B")
    .attr("stroke-width", "3px")
    .attr("d", d => line(d.values));

  // Render dots
  var dots = chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(config.data)
    .enter()
      .append("g")
      .attr('class',d => classify(d.name));

  dots.selectAll("circle")
    .data(function(d, i) {
      d.values.forEach(function(v,k) {
        v.series = d.name;
      });
      return d.values;
    })
    .enter()
      .append("circle")
      .attr("cx", d => xScale(d[dateColumn]))
      .attr("cy", d => yScale(d[valueColumn]))
      .attr("fill", d => "#D8472B")
      .attr("stroke-width", 2)
      .attr("stroke", "#f1f1f1")
      .attr("r", 5);

  // Render annotation/value at end
  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", function(d){
      var positions = {
        OffsetLarge: -55,
        OffsetSmall: -23
      }

      // if (!isMobile.matches) {
      //   positions = {
      //     OffsetLarge: -57,        
      //     OffsetSmall: -24
      //   }
      // }

      var position = lastItem(d)[valueColumn] > 55 ? xScale(lastItem(d)[dateColumn]) + positions.OffsetLarge : xScale(lastItem(d)[dateColumn]) +positions.OffsetSmall;
      return position;

    }) 
    .attr("y", function(d){
      var positions = {
          OffsetLarge: 7,        
          OffsetSmall: -10
        }
      
      // if (!isMobile.matches) {
      //   positions = {
      //     OffsetLarge: 6,        
      //     OffsetSmall: -10
      //   }
      // }

      var position = lastItem(d)[valueColumn] > 55 ? yScale(lastItem(d)[valueColumn]) + positions.OffsetLarge : yScale(lastItem(d)[valueColumn]) + positions.OffsetSmall;
      return position;

    })
    // .attr("fill",d => lastItem(d)[valueColumn] > 20 ? "#fff" : "#000")
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(0);

      // if (!isMobile.matches) {
        label = "+" + label + "%"; 
      // }

      return label;
    });
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

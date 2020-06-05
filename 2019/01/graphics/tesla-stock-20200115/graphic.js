var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { COLORS, classify, makeTranslate, getAPMonth } = require("./lib/helpers");
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
  DATA.forEach(function(d) {
    var [m, day, y] = d.date.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
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
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 75,
    bottom: 20,
    left: 40
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
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
  var max = Math.max.apply(null, ceilings);
  var max = 600;

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
      // COLORS.red3,
      // COLORS.yellow3,
      // COLORS.blue3,
      // COLORS.orange3,
      COLORS.teal3
    ]);

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
    .tickFormat(function(d) {
      return "$" + d;
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
  var firstItem = d => d.values[0];

  
  var lastOffset = [-20,3];
  var firstOffset = [15, -15];


  var vals = chartElement
    .append("g")
    .attr("class", "value")

  vals.selectAll(".value1")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class","value1")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + lastOffset[0])
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + lastOffset[1])
    .attr("text-anchor","end")
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];

      var date = fmtDateFull(item.date);
      var label = "$" + value.toFixed(2);

      if (!isMobile.matches) {
        label = date + ": " + label;
      }

      return label
    });

  vals.selectAll(".value2")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class","value2")
    .attr("x", d => xScale(firstItem(d)[dateColumn]) + firstOffset[0])
    .attr("y", d => yScale(firstItem(d)[valueColumn]) + firstOffset[1])
    .attr("text-anchor","start")
    .text(function(d) {
      var item = firstItem(d);
      var value = item[valueColumn];

      var date = fmtDateFull(item.date);
      var label = "$" + value.toFixed(2);

      if (!isMobile.matches) {
        label = date + ": " + label;
      }

      return label
    });    

  var miniLines = chartElement
    .append("g")
    .attr("class","miniLines")

  miniLines.selectAll(".mL1")
    .data(config.data)
    .enter()
    .append("line")
      .attr("class","mL1")
      .attr("x1", d => xScale(lastItem(d)[dateColumn]))
      .attr("y1", d => yScale(lastItem(d)[valueColumn]))
      .attr("x2", d => xScale(lastItem(d)[dateColumn]) + lastOffset[0] + 2)
      .attr("y2", d => yScale(lastItem(d)[valueColumn]) + lastOffset[1] - 3)
      .attr("fill", "#000")
      .attr("stroke-width", 1)
      .attr("stroke","#000")

  miniLines.selectAll(".mL2")
    .data(config.data)
    .enter()
    .append("line")
      .attr("class","mL2")
      .attr("x1", d => xScale(firstItem(d)[dateColumn]))
      .attr("y1", d => yScale(firstItem(d)[valueColumn]))
      .attr("x2", d => xScale(firstItem(d)[dateColumn]) + firstOffset[0] - 3)
      .attr("y2", d => yScale(firstItem(d)[valueColumn]) + firstOffset[1] - 1)
      .attr("fill", "#000")
      .attr("stroke-width", 1)
      .attr("stroke","#000")

  var dots = chartElement
    .append("g")
    .attr("class","dots")

  dots.selectAll(".dot1")
    .data(config.data)
    .enter()
    .append("circle")
      .attr("class","dot1")
      .attr("cx", d => xScale(lastItem(d)[dateColumn]))
      .attr("cy", d => yScale(lastItem(d)[valueColumn]))
      .attr("fill", d => COLORS.teal3)
      .attr("stroke-width",2)
      .attr("stroke","#fff")
      .attr("r", 5);

  dots.selectAll(".dot2")
    .data(config.data)
    .enter()
    .append("circle")
      .attr("class","dot2")
      .attr("cx", d => xScale(firstItem(d)[dateColumn]))
      .attr("cy", d => yScale(firstItem(d)[valueColumn]))
      .attr("fill", d => COLORS.teal3)
      .attr("stroke-width",2)
      .attr("stroke","#fff")
      .attr("r", 5); 

};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

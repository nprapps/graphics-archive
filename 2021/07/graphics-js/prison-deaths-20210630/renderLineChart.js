var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");


// var black = '#d1b545';
var black = COLORS.orange3;
var white = '#74a1cc';


var recession_dates = [
  { 'begin': new Date(1973, 11, 1),'end': new Date(1975, 3, 1) },
    { 'begin': new Date(1980, 1, 1),'end': new Date(1980, 7, 1)},
    { 'begin': new Date(1981, 7, 1),'end': new Date(1982, 11, 1)},
    { 'begin': new Date(1990, 7, 1),'end': new Date(1991, 3, 1)},
  { begin: new Date(2001, 2, 1), end: new Date(2001, 10, 1) },
  { begin: new Date(2007, 11, 1), end: new Date(2009, 5, 1) },

];

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 8;

  var margins = {
    top: 10,
    right: 150,
    bottom: 25,
    left: 45
  };

  var ticksX = 5;
  var ticksY = 6;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 50;
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
  min = -100;

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);
  // max = 25;

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
      '#407CAD',
      '#81ACCD',
      '#C3DCED',
      COLORS.blue3,
      black
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
    .selectAll("g")
    .data(config.data.slice().reverse())
    .enter()
    .append("li")
    .attr("class", "key-item");

  legend.append("b")
    .attr("class", d => classify(d.name));//.style("background-color", d => colorScale(d.name));

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
        return "\u2019" + yearAbbrev(d);
      } else {
        return yearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      if (d > 0) {
        d = '+' + d
      }
      return d + '%';
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

  // var recession = chartElement
  //   .append("g")
  //   .attr("class", "recession")
  //   .selectAll("rect")
  //   .data(recession_dates)
  //   .enter()
  //     .append("rect")
  //       .attr("x", d => xScale(d.begin))
  //       .attr("width", d => xScale(d.end) - xScale(d.begin))
  //       .attr("y", 0)
  //       .attr("height", chartHeight)
  //       .attr("fill", "#ebebeb");

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

   // chartElement
   //  .append("g")
   //  .append("text")
   //  .attr("x", xScale(new Date(1990, 7, 1)))
   //  .attr("y", yScale(20))
   //  .attr("class", "recession-label")
   //  .attr("text-anchor", "middle")
   //  .text("Recession")

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
    .curve(d3.curveCatmullRom.alpha(0.15))
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

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class", d=> classify(d.name))
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", function(d) {
      var pos = yScale(lastItem(d)[valueColumn]) + 3;
      if (d.name == 'Accident' ) pos -= 8;
      return pos;
    })
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(0);

      if (!isMobile.matches && d.name =="Drug/alcohol intoxication") {
        return d.name + " deaths increased " + label + "% between 2001 and 2018";
      } else if (!isMobile.matches) {
        return d.name + ': +' + label + '%';
      }

      return '+' + label + '%';
    }).call(wrapText, 145, 14);
};

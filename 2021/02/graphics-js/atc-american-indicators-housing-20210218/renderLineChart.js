var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, monthDay } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 5,
    right: 30,
    bottom: 20,
    left: 35
  };

  var ticksX = 4;
  var ticksY = 2;
  var roundTicksFactor = 40;
  //var width = 350;
  
  //console.log(width)
  var width = config.width/2-10;
  console.log(width)


  // Mobile
  if (isMobile.matches) {
    ticksX = 2;
    ticksY = 2;
    width = config.width/2-5;
  }

  // Calculate actual chart dimensions
  var chartWidth = width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  //containerElement.html("");
  //console.log(config.data)
  var dates = config.data[0].map(d => {
    return d.data.date
  })

  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  // var values = config.data.reduce(
  //   (acc, d) => {console.log(d); acc.concat(d[valueColumn]),
  //   []}
  // );

  // var floors = values.map(
  //   v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  // );
  // var min = Math.min.apply(null, floors);

  // if (min > 0) {
  //   min = 0;
  // }

  // var ceilings = values.map(
  //   v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  // );
  // var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([0, 40])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.key;
      })
    )
    .range([
      COLORS.teal4
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key" + oneLine)
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
    .attr("class", "graphic-wrapper " + classify(config.category));

  chartWrapper.append("h3")
    .attr("class", "state-title")
    .html(config.category)
    .style("width",chartWidth + "px")

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
      //   return "\u2019" + yearAbbrev(d);
      // } else {
        return monthDay(d);
      //}
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i){
          return d + '%'
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

  // chartElement
  //   .append("g")
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat("")
  //   );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

  // Render 0 value line.

  // if (min < 0) {
  //   chartElement
  //     .append("line")
  //     .attr("class", "zero-line")
  //     .attr("x1", 0)
  //     .attr("x2", chartWidth)
  //     .attr("y1", yScale(0))
  //     .attr("y2", yScale(0));
  // }

  // Render lines to chart.
   var areaGen = d3
    .area()
    .curve(d3.curveStepAfter)
    .x(d => xScale(d.data[dateColumn]))
    .y0(function (d) {
      return yScale(d[0]);
    })
    .y1(d => yScale(d[1]));

    chartElement
    .append("g")
    .attr("class","areas")
    .selectAll("path")
    .data(config.data)
    .join("path")
      .attr("fill", d => colorScale(d.key) + '73')
      .attr("d", areaGen)

    // Render lines to chart.
  var line = d3
    .line()
    .curve(d3.curveStepAfter)
    .x(d => xScale(d.data[dateColumn]))
    .y(d => yScale(d[1]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(config.category))
    .attr("stroke", d => colorScale(config.category))
    .attr("d", d => line(d));

    var lastItem = d => d[d.length - 1];

  //console.log(lastItem(config.data.flat()).data['date']);

  var lastDate = lastItem(config.data.flat()).data.date;
  var lastValue = lastItem(config.data.flat())[1];

function getRadius() {
  if (isMobile.matches) return "3";
  return "4";
}

chartElement
    .append("g")
    .attr("class", "end-circles")
    // .selectAll("circle")
    // .data(config.data.slice(0, 2))
    // .enter()
    .append("circle")
    .attr("class", "circle " + classify(config.category))
    .attr("fill", COLORS.teal3)
    .attr("stroke",'#ffffff')
    .attr("cx", xScale(lastDate))
    .attr("cy", yScale(lastValue))
    .attr("r", getRadius())


  chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("x", xScale(lastDate) + 5)
    .attr("y", yScale(lastValue) + 3)
    .text(Math.round(lastValue) + "%")
    .style("font-weight","normal") 
};

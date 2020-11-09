var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, getAPMonth, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

var fmtMonthDay = d => getAPMonth(d) + " " + d.getDate();


// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 15,
    right: 90,
    bottom: 20,
    left: 60
  };

  var ticksX = 5;
  var ticksY = 6;
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

  // console.log(dates);

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
  // var max = Math.max.apply(null, ceilings);
  var max = 50;

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
      "#ccc",
      COLORS.teal3,
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
    .tickFormat(function(d, i) {  ``
      if (isMobile.matches) {
        return fmtMonthDay(d);
      } else {
        return fmtMonthDay(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      if (d>0) {
        return "+" + d + "%";
      } else if (d<0) {
        return d + "%";
      } else {
        return d;
      }
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

    var order_dates = [
      {
        begin: new Date(2020, 2, 13),
        text: 'U.S. declares state of emergency',
      },
    ];

    console.log(xScale(order_dates[0].begin))
    // var begin = new Date(2020, 2, 13);

// console.log(begin);
chartElement
  .append('line')
  .attr("x1", xScale(order_dates[0].begin) )
  .attr("x2", xScale(order_dates[0].begin) )
  .attr("y1", chartHeight)
  .attr("y2", -15)
  .attr('class', 'median-line')

// order label
chartElement
  .append('text')
  .attr("class", "anno")
  .attr('x', function (d) {
    return xScale(order_dates[0].begin) + 5;
  })
  .attr('y', 10)
  .html(d => order_dates[0].text)
  .call(wrapText, isMobile.matches ? 150 : 150, 15);

chartElement
  .append('text')
  .attr("class", "anno main")
  .attr('x', function (d) {
    return xScale(order_dates[0].begin) + 5;
  })
  .attr('y', -5)
  .html("March 13:")
  .call(wrapText, isMobile.matches ? 150 : 150, 15);

// annotations
var highestPoint = [
  {
    begin: new Date(2020, 2, 8),
    value: 12.8652975,
    text_1: 'March 8:',
    text_2: 'Highest point before drop',

  },
];

var lowestPoint = [
  {
    begin: new Date(2020, 3, 4),
    value: -46,
    text_1: 'April 4:',
    text_2: '58-point drop from March 8',
  },
];


var endPoint = [
  {
    begin: new Date(2020, 4, 16),
    value: -18.5,
    text_1: 'May 16:',
    text_2: '27.5-point increase since April 4',
  },
];

//high
chartElement
  .append("circle")
  .attr("class", "dots")
  .attr("cx", xScale(highestPoint[0].begin))
  .attr("cy", yScale(highestPoint[0].value))
  .attr("r", 3);

var annoYOffsetHigh = isMobile.matches ? 40 : 40;
var annoXOffsetHigh = isMobile.matches ? 35 : 60;

chartElement
  .append("text")
  .attr("class", "annotation main")
  .attr("x", xScale(highestPoint[0].begin) - annoXOffsetHigh)
  .attr("y", yScale(highestPoint[0].value) - annoYOffsetHigh)
  .text(highestPoint[0].text_1)
  .call(wrapText, isMobile.matches ? 80 : 120, 15);

  chartElement
  .append("text")
  .attr("class", "annotation second")
  .attr("x", xScale(highestPoint[0].begin) - annoXOffsetHigh)
  .attr("y", yScale(highestPoint[0].value) - annoYOffsetHigh + 15)
  .text(LABELS.highest_annotation)
  .call(wrapText, isMobile.matches ? 90 : 100, 15);

  //low
chartElement
  .append("circle")
  .attr("class", "dots")
  .attr("cx", xScale(lowestPoint[0].begin))
  .attr("cy", yScale(lowestPoint[0].value))
  .attr("r", 3);

var annoYOffsetLow = isMobile.matches ? -40 : -40;
var annoXOffsetLow = isMobile.matches ? -20 : -15;

chartElement
  .append("text")
  .attr("class", "annotation main")
  .attr("x", xScale(lowestPoint[0].begin) + annoXOffsetLow)
  .attr("y", yScale(lowestPoint[0].value) + annoYOffsetLow)
  .text(lowestPoint[0].text_1)
  .call(wrapText, isMobile.matches ? 50 : 100, 15);


chartElement
  .append("text")
  .attr("class", "annotation second")
  .attr("x", xScale(lowestPoint[0].begin) + annoXOffsetLow)
  .attr("y", yScale(lowestPoint[0].value) + annoYOffsetLow + 15)
  .text(LABELS.lowest_annotation)
  .call(wrapText, isMobile.matches ? 80 : 80, 15);

//end

chartElement
  .append("circle")
  .attr("class", "dots")
  .attr("cx", xScale(endPoint[0].begin))
  .attr("cy", yScale(endPoint[0].value))
  .attr("r", 3);

var annoYOffsetEnd = isMobile.matches ? -34 : -10;
var annoXOffsetEnd = isMobile.matches ? -37 : 5;

chartElement
  .append("text")
  .attr("class", "annotation main")
  .attr("x", xScale(endPoint[0].begin) + annoXOffsetEnd)
  .attr("y", yScale(endPoint[0].value) + annoYOffsetEnd)
  .text(endPoint[0].text_1)
  .call(wrapText, isMobile.matches ? 50 : 100, 15);

chartElement
  .append("text")
  .attr("class", "annotation second")
  .attr("x", xScale(endPoint[0].begin) + annoXOffsetEnd)
  .attr("y", yScale(endPoint[0].value) + annoYOffsetEnd + 15)
  .text(LABELS.end_annotation)
  .call(wrapText, isMobile.matches ? 70 : 70, 15);

  chartElement
    .append("g")
    .attr("class", "value")
    .attr("id", "axis-label")
    .append("text")
    .attr("transform", 'translate(-45,' + (chartHeight/2) + ")rotate(-90)")
    .style("text-anchor", "middle")
    .text("Change in total miles driven from Feb. 2");
    // .attr("fill", "#000000")


  // var lastItem = d => d.values[d.values.length - 1];

  // chartElement
  //   .append("g")
  //   .attr("class", "annotation")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
  //   .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
  //   .text(function(d) {
  //     var item = lastItem(d);
  //     var value = item[valueColumn];
  //     var label = value.toFixed(1);

  //     if (!isMobile.matches) {
  //       label = d.name + ": " + label;
  //     }

  //     return label;
  //   })
  //   .call(wrapText, isMobile.matches ? 80 : 100, 15);

};

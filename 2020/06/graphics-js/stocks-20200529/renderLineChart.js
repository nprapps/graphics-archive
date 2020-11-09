var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText, getAPMonth } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

var fmtMonthDay = d => getAPMonth(d) + " " + d.getDate();


// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn, max, margins } = config;

  var isMobile = {
    matches: config.width < 400
  };

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 5;

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
  // var max = Math.max.apply(null, ceilings);

  var fmtNum = function (num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  }

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
    .range(config.colors);

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
        return fmtMonthDay(d);
      } else {
        return fmtMonthDay(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(config.yFormat);

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
    .y(d => yScale(d[valueColumn]))
    // .curve(config.area ? d3.curveStepAfter : d3.curveLinear);

  var area = d3.area()
    .x(d => xScale(d[dateColumn]))
    .y0(d => yScale(d[valueColumn]))
    .y1(chartHeight)
    // .curve(config.area ? d3.curveStepAfter : d3.curveLinear);

  // if (config.area) {
  //   // chartElement
  //     // .append("g")
  //     // .attr("class", "shading")
  //     // .selectAll("path")
  //     // .data(config.data)
  //     // .enter()
  //     // .append("path")
  //     // .attr("class", d => "line " + classify(d.name))
  //     // .attr("fill", d => colorScale(d.name))
  //     // .attr("d", d => area(d.values));
  // }


  var order_dates = [
    {
      begin: new Date(2020, 2, 13),
      text: 'March 13: President Trump declares state of emergency',
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
.attr('y', chartHeight - 50)
.html(d => order_dates[0].text)
.call(wrapText, isMobile.matches ? 100 : 100, 15);


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
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    // .text(config.labelFormat)
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = fmtNum(value);

      // if (!isMobile.matches) {
        var labelfull = d.name + ": " + label;
      // }

      return labelfull;
    })
    .call(wrapText, isMobile.matches ? 60 : 80, 15);

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
    .attr("fill", d => colorScale(d.series))
    .attr("stroke-width",function(d){
      var width = 1;
      if (!isMobile.matches) {
        width = 0.5;
      }

      return width;
    })
    .attr("stroke","#fff")
    .attr("r", 3);

};

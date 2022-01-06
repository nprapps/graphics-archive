var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
};

var $ = require('./lib/qsa')
var { COLORS, classify, makeTranslate, wrapText, fmtComma } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function (config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 35,
    right: 130,
    bottom: 20,
    left: 30,
  };

  var ticksX = 3;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 3;
    ticksY = 5;
    margins.right = 100;
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

  var xScale = d3.scaleTime().domain(extent).range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min.apply(null, floors);

  min = 0;

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);
  max = 100;

  var yScale = d3.scaleLinear().domain([min, max]).range([chartHeight, 0]);
  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.teal3,
      COLORS.orange3,
      COLORS.blue3,
      COLORS.red3,
      COLORS.orange3,
      "#555",
      "#ccc",
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
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

  // Create D3 axes

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function (d, i) {
      return yearFull(d);
    });

  var yAxis = d3.axisLeft().scale(yScale).ticks(ticksY).tickFormat(function(d) {
    if (d == 100) return;
    return d;
  });

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.append("g").attr("class", "y axis").call(yAxis);

  // Render grid to chart.

  var xAxisGrid = function () {
    return xAxis;
  };

  var yAxisGrid = function () {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxisGrid().tickSize(-chartHeight, 0, 0).tickFormat(""));

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(yAxisGrid().tickSize(-chartWidth, 0, 0).tickFormat(""));


  chartElement
    .append("g")
    .append("text")
    .attr("x", -22)
    .attr("y", yScale(100.5))
    .attr('class', 'axis-special')
    .text("100 gigawatts");

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
    .defined(d => !!d[valueColumn]);

  var dates = chartElement
    .append('g')
    .attr('class', 'date-annotations');
  // order line
  dates
    .append('line')
    .attr('x1', d => xScale(new Date(2021, 0, 1)))
    .attr('x2', d => xScale(new Date(2021, 0, 1)))
    .attr('y1', chartHeight)
    .attr('y2', 0)
    .attr('class', 'median-line');

  dates
    .append('text')
    .classed('chart-label', true)
    .attr('x', xScale(new Date(2021, 0, 1)) - 5)
    .attr('y', yScale(75))
    .attr('text-anchor', 'end')
    .html(d => 'Renewable production to date')
    .call(wrapText, isMobile.matches ? 60 : 120, 14);

  dates
    .append('text')
    .classed('chart-label', true)
    .attr('x', xScale(new Date(2021, 0, 1)) + 5)
    .attr('y', yScale(60))
    .attr('text-anchor', 'start')
    .html(d => 'Targets →')
    .call(wrapText, isMobile.matches ? 60 : 100, 14);

  var allLine = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));
  // .defined(d => !!d[valueColumn]);

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", function (d) {
      var classLine = " line-nodata";
      return classify(d.name) + classLine;
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => allLine(d.values.filter(d => d[valueColumn])));


  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", function (d) {
      var classLine = " full-line";
      return classify(d.name) + classLine;
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => allLine(d.values.filter(d => d[valueColumn] && yearFull(d[dateColumn]) <= 2021)));

  for (i in config.data) {
    chartElement
      .append("g")
      .attr("class", "dots")
      .selectAll("circle")
      .data(config.data[i].values.filter(d => d[valueColumn]))
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d[dateColumn]))
      .attr("cy", d => config.data[i].name == 'BP' ? yScale(d[valueColumn]) -2 : yScale(d[valueColumn]))
      .attr("fill", d => colorScale(config.data[i].name))
      .attr("r", isMobile.matches ? "4" : "5");
  }

  // chartElement
  //   .append("g")
  //   .attr("class", "lines")
  //   .selectAll("path")
  //   .data(config.data)
  //   .enter()
  //   .append("path")
  //   .attr("class", d => "line " + classify(d.name))
  //   .attr("stroke", d => colorScale(d.name))
  //   .attr("d", d => line(d.values));

  var lastItem = function (d) {
    var filled = d.values.filter(d => d[valueColumn]);
    return filled[filled.length - 1];
  };

  var firstItem = function (d) {
    var filled = d.values.filter(d => d[valueColumn]);
    return filled[filled.length - 2];
  };

  var annotations = chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()

  annotations
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + OFFSETS.filter(a => a.company == d.name)[0].offset_x)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + OFFSETS.filter(a => a.company == d.name)[0].offset_y - 15)
    .attr("fill", d => colorScale(d.name))
    .text(function (d) {
      return d.name;
    });

  annotations
    .append("text")
    .attr(
      "class", "subtext")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + OFFSETS.filter(a => a.company == d.name)[0].offset_x)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + OFFSETS.filter(a => a.company == d.name)[0].offset_y)
    .attr("fill", d => colorScale(d.name))
    .text(function (d) {
      var last = lastItem(d);
      var dif = (last[valueColumn] - firstItem(d)[valueColumn])/firstItem(d)[valueColumn];
      dif = fmtComma(Number((dif * 100).toFixed(0)));
      return `Target: ${last[valueColumn].toFixed(0)} GW by ${yearFull(last[dateColumn])} (+${dif}%)`;
    }).call(wrapText, 100, 14);
};

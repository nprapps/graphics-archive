var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
};

var { COLORS, classify, makeTranslate, getAPMonth } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { getAPMonths } = require("./lib/helpers/getAPMonth");
var { isMobile } = require("./lib/breakpoints");
var fmtComma = require("./lib/helpers/fmtComma");

// Render a line chart.
module.exports = function (config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 40,
    bottom: 30,
    left: 43,
  };

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.left = 28;
    margins.right = 35;
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

  var dates = config.data[0].values.map(d => d[dateColumn]);
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

  if (min > 0) {
    min = 0;
  }

  var max = 20000;

  var yScale = d3.scaleLinear().domain([min, max]).range([chartHeight, 0]);

  // Render the HTML legend.
  var oneLine = config.data.length > 1 ? "" : " one-line";

  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
    .selectAll("g")
    .data(["nonmain", "main"])
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d));

  legend.append("b");
  legend.append("label").text(d => config.labels[`cat_${d}`]);

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
    //.tickValues(config.ticks.x)
    .tickFormat(function (d, i) {
      var apMonth = getAPMonth(d);
      if (apMonth !== "Jan." && i !== 0) {
        return apMonth;
      }
      if (isMobile.matches) {
        return `${apMonth} \u2019${yearAbbrev(d)}`;
      }
      return `${apMonth} ${yearFull(d)}`;
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function (d) {
      if (d === 0) return d;
      if (isMobile.matches) return `${Math.floor(d / 1000)}k`;
      return fmtComma(d);
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

  // Labels at the end of each line
  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(config.data)
    .join(function (enter) {
      var label = enter
        .append("text")
        .attr("class", d => `label ${classify(d.name)}`)
        .attr("transform", d =>
          makeTranslate(
            xScale(lastItem(d)[dateColumn]) + 8,
            yScale(lastItem(d)[valueColumn]) + 5
          )
        );
      label
        .append("tspan")
        .attr("x", 0)
        .text(d => fmtComma(lastItem(d)[valueColumn]));
    });

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
    .join(function (enter) {
      var g = enter.append("g").attr("class", d => `line ${classify(d.name)}`);

      // Lines
      g.append("path").attr("d", d => line(d.values));

      // Dots/markers
      g.selectAll("circle")
        .data(d => d.values)
        .join("circle")
        .attr("class", "mark")
        .attr("r", isMobile.matches ? 3 : 4)
        .attr("transform", d =>
          makeTranslate(xScale(d[dateColumn]), yScale(d[valueColumn]))
        )
        .append("title")
        .text(d => fmtComma(d[valueColumn]));
    });
};

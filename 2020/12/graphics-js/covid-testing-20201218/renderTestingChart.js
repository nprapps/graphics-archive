var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

// var textures = {
//   ...require("textures/dist/textures")
// }

var { COLORS, classify, makeTranslate, wrapText, fmtComma } = require("./lib/helpers");
var { monthDay, yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 1 : 16;
  var aspectHeight = isMobile.matches ? 1 : 9;

  var margins = {
    top: 5,
    right: 150,
    bottom: 20,
    left: 50
  };

  // var targetMitigation = 1165199;
  // var targetSuppression = 4279506;
  var targetMitigation = 1975900;
  var targetSuppression = 5926441;

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 6000000;
  var labelLineHeight = isMobile.matches ? 12 : 14;

  // Mobile
  if (isMobile.matches) {
    margins.left = 25;
    margins.right = 130;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

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
      COLORS.blue5,
      COLORS.blue3,
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
    .tickFormat(d => monthDay(d));

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i) {
      var suffix = isMobile.matches ? "M" : " million";
      if (d == 0) {
        return d;
      } else {
        return (d/1000000).toFixed(0) + suffix;
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

  // render area to chart
  var areaData = [ config.data[0] ]; // new tests
  var area = d3.area()
    .defined(function(d) {
      return d[dateColumn] != null && !isNaN(d[valueColumn]);
    })
    .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y0(chartHeight)
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "area")
    .selectAll("path")
    .data(areaData)
    .enter()
      .append("path")
      .attr("d", d => area(d.values));

  // Render lines to chart.
  var lineData = [ config.data[1] ]; // rolling average
  var line = d3.line()
    .defined(function(d) {
      return d[valueColumn] != null && !isNaN(d[valueColumn]);
    })
    // .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(lineData)
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
    .data(lineData)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 10)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .text("Current testing:");

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(lineData)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 10)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3 + labelLineHeight + 2)
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];

      return fmtComma(value) + " tests/day";
    })
    .call(wrapText, margins.right - 10, labelLineHeight);

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(lineData)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 10)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3 + ((labelLineHeight + 2) * 2))
    .text("(7-day average)");

  var annotation = chartElement.append("g")
    .attr("class", "annotation");

  // var annotTexture = textures.lines()
  //   .size(5)
  //   .strokeWidth(1)
  //   .stroke(COLORS.blue6);

  // chartWrapper.select('svg').call(annotTexture);

  // annotation.append("rect")
  //   .attr("x", 0)
  //   .attr("width", chartWidth)
  //   .attr("y", yScale(600000))
  //   .attr("height", (yScale(500000) - yScale(600000)))
  //   .style('fill', annotTexture.url());

  annotation.append("line")
    .attr("class", "mitigation")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", yScale(targetMitigation))
    .attr("y2", yScale(targetMitigation));

  annotation.append("text")
    .attr("class", "mitigation")
    .text("Goal: Diagnostic testing:")
    .attr("x", chartWidth + 10)
    .attr("y", yScale(targetMitigation))
    .attr("dy", isMobile.matches ? -22 : -27)
    .call(wrapText, (margins.right - 10), labelLineHeight);
  annotation.append("text")
    .attr("class", "mitigation")
    .text((targetMitigation / 1000000).toFixed(1) + " million tests/day")
    .attr("x", chartWidth + 10)
    .attr("y", yScale(targetMitigation) + labelLineHeight + 2)
    .attr("dy", isMobile.matches ? -22 : -27)
    .call(wrapText, (margins.right - 10), labelLineHeight);

  annotation.append("line")
    .attr("class", "suppression")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", yScale(targetSuppression))
    .attr("y2", yScale(targetSuppression));

  annotation.append("text")
    .attr("class", "suppression")
    .text("Goal: Total diagnostic + screening testing:")
    .attr("x", chartWidth + 10)
    .attr("y", yScale(targetSuppression))
    // .attr("dy", isMobile.matches ? -10 : -10)
    .call(wrapText, (margins.right - 10), labelLineHeight);
  annotation.append("text")
    .attr("class", "suppression")
    .text((targetSuppression / 1000000).toFixed(1) + " million tests/day")
    .attr("x", chartWidth + 10)
    .attr("y", yScale(targetSuppression) + labelLineHeight + 2)
    .attr("dy", isMobile.matches ? 10 : 12)
    .call(wrapText, (margins.right - 10), labelLineHeight);
};

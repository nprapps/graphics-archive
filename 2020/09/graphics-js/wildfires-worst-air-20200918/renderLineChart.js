var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, getAPMonth } = require("./lib/helpers");
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
    top: 5,
    right: 10,
    bottom: 20,
    left: 30
  };

  var ticksX = 5;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 10;
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
  var max = 750;

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
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
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
      return fmtMonthDay(d)
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

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

  chartElement.append("rect")
      .attr("x", xScale(new Date("8/21/2020")))
      .attr("y", yScale(150))
      .attr("width", chartWidth)
      .attr("height", yScale(0) - yScale(150))
      .attr("class", "healthy-maybe");
  chartElement.append("rect")
      .attr("x", xScale(new Date("8/21/2020")))
      .attr("y", yScale(200))
      .attr("width", chartWidth)
      .attr("height", yScale(151) - yScale(200))
      .attr("class", "unhealthy");

  chartElement.append("rect")
      .attr("x", xScale(new Date("8/21/2020")))
      .attr("y", yScale(300))
      .attr("width", chartWidth)
      .attr("height", yScale(200) - yScale(300))
      .attr("class", "very-unhealthy");
  chartElement.append("rect")
      .attr("x", xScale(new Date("8/21/2020")))
      .attr("y", yScale(max))
      .attr("width", chartWidth)
      .attr("height", yScale(300) - yScale(max))
      .attr("class", "hazardous");

  chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(500))
      .attr("y2", yScale(500));

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
    .attr("class", function(d) {
      var cName = "line " + classify(d.name)
      if (d.name == config.stateSelection) {
        cName += " highlight"
      }
      return cName;
    })
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[0]; //d.values.length - 1

  var annotations = [{ value: 301, text: 'Hazardous'}, {value: 201, text: 'Very unhealthy'}, {value: 151, text: 'Unhealthy'}, {value : 501, text: 'Beyond the index'}];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("g")
    .data(annotations)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(config.data[0])[dateColumn]) + 2)
    .attr("y", d => yScale(d.value) - 3)
    .text(function(d) {
      return d.text
    }).attr("class", d => classify(d.text) + " shadow");

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("g")
    .data(annotations)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(config.data[0])[dateColumn]) + 2)
    .attr("y", d => yScale(d.value) - 3)
    .text(function(d) {
      return d.text
    }).attr("class", d => classify(d.text));
};

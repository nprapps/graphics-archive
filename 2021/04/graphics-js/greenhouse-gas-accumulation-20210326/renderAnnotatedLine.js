/*
 * Render a line chart.
 */

var {
  COLORS,
  classify,
  makeTranslate,
  wrapText
} = require("./lib/helpers");

var { isMobile } = require("./lib/breakpoints");

var { yearAbbrev, yearFull, dayYear, dateFull } = require("./lib/helpers/formatDate");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

module.exports = function(config) {
  /*
   * Setup
   */
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 10,
    right: 50,
    bottom: 20,
    left: 30
  };

  var ticksX = 10;
  var ticksY = 6;
  var roundTicksFactor = 5;

  var annotationXOffset = -2;
  var annotationYOffset = -19;
  var annotationWidth = 50;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 5;
    ticksY = 5;
    margins.right = 45;
    margins.top = 15;
    annotationXOffset = -2;
    annotationYOffset = -18;
    annotationWidth = 45;
    annotationLineHeight = 13;
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

  var dates = config.data[0].map(d => {
    return d.data.date
  })

  var extent = [dates[0], dates[dates.length - 1]];

  /*
   * Create D3 scale objects.
   */
  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  // var values = config.data[0].reduce(
  //   (acc, d) => acc.concat(d.data.values.map(v => v[valueColumn])),
  //   []
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

  var min = 0;
  var max = 500;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.red3,
      COLORS.red4,
      // COLORS.blue3,
      // COLORS.orange3,
      // COLORS.teal3
    ]);

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return yearFull(d);
      } else {
        return yearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

  /*
   * Render axes to chart.
   */
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  /*
   * Render grid to chart.
   */

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxis
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxis
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

    chartElement.append('text')
    .attr("class", "tick")
    .classed('chart-label-title', true)
    .attr('x', xScale(new Date(dates[0])))
    .attr('y', yScale(max)+4)
    .text('parts per million')

  /*
   * Render 0 value line.
   */
  // if (min < 0) {
  //   chartElement
  //     .append("line")
  //     .attr("class", "zero-line")
  //     .attr("x1", 0)
  //     .attr("x2", chartWidth)
  //     .attr("y1", yScale(0))
  //     .attr("y2", yScale(0));
  // }

  /*
   * Render lines to chart.
   */
  

  var areaGen = d3
    .area()
    .x(d => xScale(d.data[dateColumn]))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]));

    chartElement
    .append("g")
    .attr("class","areas")
    .selectAll("path")
    .data(config.data)
    .join("path")
    .attr("fill", d => colorScale(d.key) + '8C')
    .attr("d", areaGen)

  var line = d3
    .line()
    .x(d => xScale(d.data[dateColumn]))
    .y(d => yScale(d[1]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", function(d, i) {
      return "line " + classify(d.name);
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("stroke-width", isMobile.matches ? 2 : 2)
    .attr("d", function (d) {
      return line(d);
    });

  var lastItem = d => d[d.length - 1];

  //console.log(lastItem(config.data.flat()).data['date']);

  var lastDate = lastItem(config.data.flat()).data.date;
  var lastValue = lastItem(config.data.flat())[1];

  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .attr("x", function(d, i) {
  //     var last = d.values[d.values.length - 1];
  //     return xScale(last[dateColumn]) + 5;
  //   })
  //   .attr("y", function(d) {
  //     var last = d.values[d.values.length - 1];
  //     return yScale(last[valueColumn]) + 3;
  //   });

  /*
   * Render annotations.
   */
  var annotation = chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();

  annotation
    .append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => COLORS.red3)
    .attr("r", isMobile.matches ? 3 : 3.5);

  annotation
    .append("text")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : yearFull(d[dateColumn]);
      var value = Math.round(d[valueColumn]);
      return text + " " + value + " ppm";
    })
    .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annotationXOffset)
    .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annotationYOffset)
    .call(wrapText, annotationWidth, annotationLineHeight);
};

/*
 * Render a line chart.
 */

var {
  COLORS,
  classify,
  makeTranslate,
  wrapText,
  getAPMonth
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

var emergency_dates = [
  {
    begin: new Date(2020, 2, 13),
    text: 'March 13: 26,392',
  },
];

module.exports = function(config) {
  /*
   * Setup
   */
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 20;
  var aspectHeight = 9;

  var margins = {
    top: 15,
    right: 50,
    bottom: 20,
    left: 30
  };

  var ticksX = 5;
  var ticksY = 8;
  var roundTicksFactor = 5;

  var annotationXOffset = -4;
  var annotationYOffset = -24;
  var annotationWidth = 60;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 5;
    ticksY = 5;
    margins.right = 40;
    annotationXOffset = -6;
    annotationYOffset = -20;
    annotationWidth = 60;
    annotationLineHeight = 12;
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

  /*
   * Create D3 scale objects.
   */
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
    .domain([min, 30000])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      "#ddd",
      COLORS.orange3
    ]);

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(config.data.slice().reverse())
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d.name));

    legend.append("b").style("background-color", d => colorScale(d.name));
    legend.append("label").text(d => d.name);

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
    .tickFormat(d => getAPMonth(d) + " " + d.getDate());
    // .tickFormat(function(d, i) {
    //   if (isMobile) {
    //     return "\u2019" + yearAbbrev(d);
    //   } else {
    //     return yearFull(d);
    //   }
    // });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d / 1000 + "K");

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

  /*
   * Render 0 value line.
   */
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  // Render national emergency line
  var emergency = chartElement
    .append('g')
    .attr('class', 'emergency')
    .selectAll('line')
    .data(emergency_dates)
    .enter()
      .append('line')
      .attr("x1", d => xScale(d['begin']) )
      .attr("x2", d => xScale(d['begin']) )
      .attr("y1", chartHeight)
      .attr("y2", d => yScale(d['value']))
      .attr('class', 'emergency-line')

  chartElement
    .append('text')
    .classed('emergency-label', true)
    .attr('x', function (d) {
      return xScale(emergency_dates[0].begin) + 5;
    })
    .attr('y', -5)
    .html(d => emergency_dates[0].text)
    .call(wrapText, isMobile.matches ? 130 : 250, annotationLineHeight)

  chartElement
    .append('text')
    .classed('emergency-label-us', true)
    .attr('x', function (d) {
      return xScale(emergency_dates[0].begin) + 5;
    })
    .attr('y', 10)
    .text("U.S. declares state of emergency")
    .call(wrapText, isMobile.matches ? 130 : 250, annotationLineHeight);

  /*
   * Render lines to chart.
   */
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
    .attr("class", function(d, i) {
      return "line " + classify(d.name);
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", function(d, i) {
      var last = d.values[d.values.length - 1];
      return xScale(last[dateColumn]) + 5;
    })
    .attr("y", function(d) {
      var last = d.values[d.values.length - 1];
      return yScale(last[valueColumn]) + 3;
    });

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
    .attr("fill", d => colorScale(d.series))
    .attr("r", 3);

  annotation
    .append("text")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : getAPMonth(d[dateColumn]) + " " + d[dateColumn].getDate();
      var value = `${d[valueColumn].toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
      return text + ": " + value;
    })
    .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annotationXOffset)
    .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annotationYOffset)
    .call(wrapText, annotationWidth, annotationLineHeight);
};

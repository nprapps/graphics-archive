/*
 * Render a line chart.
 */

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");

var { isMobile } = require("./lib/breakpoints");

var annotated = true;

var {
  yearAbbrev,
  yearFull,
  dayYear,
  dateFull,
} = require("./lib/helpers/formatDate");
const getAPMonth = require("./lib/helpers/getAPMonth");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
};

module.exports = function (config) {
  /*
   * Setup
   */
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 5,
    right: 46,
    bottom: 20,
    left: 30,
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;

  var annotationXOffset = -4;
  var annotationYOffset = -24;
  var annotationWidth = 80;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 5;
    ticksY = 5;
    margins.right = 36;
    annotationXOffset = -6;
    annotationYOffset = -20;
    annotationWidth = 72;
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

  var dates = config.data[0].values.map(d => d[dateColumn]);
  var extent = [dates[0], dates[dates.length - 1]];

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([COLORS.red3, COLORS.red5]);
  //var color = COLORS.orange3;

  // Render the HTML legend.
  var oneLine = config.data.length > 1 ? "" : " one-line";

  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
    .selectAll("g")
    .data(config.data.map(d => d.name))
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d));

  legend.append("b").style("background-color", d => colorScale(d));
  legend.append("label").text(d => config.labels[d]);

  /*
   * Create D3 scale objects.
   */
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

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = isMobile.matches ? Math.max.apply(null, ceilings) : 16;

  var yScale = d3.scaleLinear().domain([min, max]).range([chartHeight, 0]);

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
    .tickFormat(function (d, i) {
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
    .tickFormat(function (d) {
      return `\$${d}`;
    });

  /*
   * Render axes to chart.
   */
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.append("g").attr("class", "y axis").call(yAxis);

  /*
   * Render grid to chart.
   */

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(yAxis.tickSize(-chartWidth, 0, 0).tickFormat(""));

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
    .attr("class", function (d, i) {
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
    .attr("x", function (d, i) {
      var last = d.values[d.values.length - 1];
      return xScale(last[dateColumn]) + 5;
    })
    .attr("y", function (d) {
      var last = d.values[d.values.length - 1];
      return yScale(last[valueColumn]) + 3;
    });

  /*
   * Render annotations.
   */
  if (annotated) {
    var annotation = chartElement
      .append("g")
      .attr("class", "annotations")
      .selectAll("circle")
      .data(config.annotations.filter(d => d.series === "real"))
      .enter();

    annotation
      .append("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d[dateColumn]))
      .attr("cy", d => yScale(d[valueColumn]))
      .attr("r", 3);

    var textContent = function (d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : dateFull(d[dateColumn]);
      // var value = d[valueColumn].toFixed(2);
      // return text + " " + value;
      return `${getAPMonth(d[dateColumn])} ${yearFull(d[dateColumn])} ${text}`;
    };

    var xOffset = function (d) {
      return isMobile.matches ? d.xOffsetMobile : d.xOffset;
    };
    var yOffset = function (d) {
      return isMobile.matches ? d.yOffsetMobile : d.yOffset;
    };

    annotation
      .filter(d => (isMobile.matches ? d.lineMobile : true))
      .append("line")
      .attr("class", "line")
      .attr("x1", d => xScale(d[dateColumn]))
      .attr("y1", d => yScale(d[valueColumn]) + 6)
      .attr("x2", d => xScale(d[dateColumn]))
      .attr(
        "y2",
        d => yScale(d[valueColumn]) + yOffset(d) + annotationYOffset - 12
      );

    annotation
      .append("text")
      .html(textContent)
      .attr("x", d => xScale(d[dateColumn]) + xOffset(d) + annotationXOffset)
      .attr("y", d => yScale(d[valueColumn]) + yOffset(d) + annotationYOffset)
      .call(wrapText, annotationWidth, annotationLineHeight)
      .attr("class", "outline")
      .clone()
      .attr("class", "content")
      .html(textContent)
      .call(wrapText, annotationWidth, annotationLineHeight);
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
        .attr("fill", d => colorScale(d.name))
        .attr("class", d => `label ${classify(d.name)}`)
        .attr("transform", d =>
          makeTranslate(
            xScale(lastItem(d)[dateColumn]) + (isMobile.matches ? 5 : 8),
            yScale(lastItem(d)[valueColumn]) + 5
          )
        );
      label
        .append("tspan")
        .attr("x", 0)
        .text(d => `\$${lastItem(d)[valueColumn]}`);
    });
};

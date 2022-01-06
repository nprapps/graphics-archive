var { isMobile } = require("./lib/breakpoints");

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

// Render a bar chart.
var renderBarbellChart = function (config) {
  // Setup
  var { labelColumn, valueColumns } = config;
  var [avgType, avgTypeNation] = valueColumns;

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 100;
  var labelMargin = 6;
  var valueGap = 6;

  var margins = {
    top: 15,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin,
  };

  // var ticksX = 4;
  var roundTicksFactor = 5;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  /*
  var floors = config.data.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max.apply(null, ceilings);
  max = max > 0.6 ? max : 0.6;*/

  var min = 0.25;
  var max = 0.5;

  var xScale = d3.scaleLinear().domain([min, max]).range([0, chartWidth]);

  var colorType = COLORS.blue3;
  var colorTypeNation = COLORS.blue2;
  var colorAnnotation = COLORS.blue2;
  var r = isMobile.matches ? 4 : 5;

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    //.ticks(ticksX)
    .tickValues([0.25, 0.3, 0.35, 0.4, 0.45, 0.5])
    .tickFormat(function (d) {
      return (d * 100).toFixed(0) + "%";
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));

  // Render annotation line to chart
  var annotationAvgNation = chartElement
    .append("g")
    .attr("class", "annotation")
    .attr("transform", makeTranslate(xScale(config.labels.b_nation), 0));

  annotationAvgNation
    .append("line")
    .attr("stroke", colorAnnotation)
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", 4)
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y1", 0)
    .attr("y2", chartHeight);

  annotationAvgNation
    .append("text")
    .attr("x", isMobile.matches ? 16 : 48)
    .attr("y", -6)
    .attr("fill", colorAnnotation)
    .text(
      `${config.labels.b_nation_annot}: ${(
        config.labels.b_nation * 100
      ).toFixed(1)}%`
    );

  // Render barbells to chart.
  chartElement
    .append("g")
    .selectAll(".barbell")
    .data(config.data)
    .join(function (enter) {
      var barbell = enter.append("g").attr("class", "barbell");

      barbell
        .append("line")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 2)
        .attr("x1", d => xScale(d[avgType]))
        .attr("x2", d => xScale(d[avgTypeNation]))
        .attr("y1", (_, i) => i * (barHeight + barGap) + barHeight / 2)
        .attr("y2", (_, i) => i * (barHeight + barGap) + barHeight / 2);

      barbell
        .append("circle")
        .attr("fill", colorType)
        .attr("stroke", "none")
        .attr("cx", d => xScale(d[avgType]))
        .attr("cy", (_, i) => i * (barHeight + barGap) + barHeight / 2)
        .attr("r", r);

      barbell
        .append("circle")
        .attr("fill", "white")
        .attr("stroke", colorTypeNation)
        .attr("stroke-width", 2)
        .attr("cx", d => xScale(d[avgTypeNation]))
        .attr("cy", (_, i) => i * (barHeight + barGap) + barHeight / 2)
        .attr("r", r - 1);
    });

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);
  }

  // Render bar labels.
  chartWrapper
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0",
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", function (d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px",
      });
    })
    .attr("class", function (d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .text(d => d[labelColumn]);

  // Draw legend
  var legendElement = d3.select(".key");
  legendElement.html("");

  legendElement
    .selectAll("li")
    .data(["b_type", "b_type_nation"])
    .join(function (enter) {
      var keyItem = enter
        .append("li")
        .attr("class", d => `key-item ${classify(d)}`);
      keyItem.append("b");
      keyItem.append("label").text(d => config.labels[d]);
    });
};

module.exports = renderBarbellChart;

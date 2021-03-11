var { isMobile } = require("./lib/breakpoints");

var { COLORS, makeTranslate, classify, formatStyle, fmtComma } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var skipLabels = ["label", "values", "offset", "chart"];

// Render a stacked bar chart.
var renderStackedBarChart = function(config, max) {
  // Setup
  var labelColumn = "label";

  // var barHeight = 55;
  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 35;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 20;

  if (isMobile.matches) {
    ticksX = 2;
  }

  var percent = config.percent;
  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  if (config.title && config.showTitle) {
    containerElement.append('h3')
      .html(config.title);
  }

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  // var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([0, chartWidth]);

  var colorMap = {
    'Republicans' : '#d62021',
    'Democrats' : '#237bbd',
    'Overall (Likely Voters)': '#adadad',
  }
  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(d => skipLabels.indexOf(d) == -1)
    )
    .range([colorMap[config.title]]);

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
    .tickFormat(function(d) {
      console.log(d)
      var unit;
      if (percent) {
        unit = '%'
      } else {
        d = d/1000000;
        unit = 'M'
      }
      return d + (d != 0 ? unit : '');
    } );

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = () => xAxis;

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group-" + classify(d[labelColumn]))
    .attr(
      "transform",
      (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    );

  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", d => colorScale(d.name))
    .attr("class", d => classify(d.name));

  // Render bar values.
  group
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(function(d) {
      var units = (percent) ? "%" : "";
      return d.val ? fmtComma(d.val) + units : null;
    })
    .attr("class", d => classify(d.name))
    .attr("x", d => xScale(d.x1))
    .attr("dx", function(d) {
      var textWidth = this.getComputedTextLength();
      var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

      // Hide labels that don't fit
      if (textWidth + valueGap > barWidth) {
        d3.select(this).classed("hidden", true);
      } else if (textWidth + valueGap > barWidth) {
        d3.select(this).classed("centered", true);
        return -(valueGap + (textWidth / 2));
      }

      if (d.x1 < 0) {
        return valueGap;
      }

      return -(valueGap + textWidth);
    })
    .attr("dy", barHeight / 2 + 4);

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
        left: "0"
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px;"
      })
    )
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);
};

module.exports = renderStackedBarChart;
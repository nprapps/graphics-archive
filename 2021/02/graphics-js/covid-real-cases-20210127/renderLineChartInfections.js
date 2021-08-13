var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
};

var annoLen;
var {
  COLORS,
  classify,
  makeTranslate,
  wrapText,
  fmtComma,
} = require("./lib/helpers");
var {
  yearFull,
  yearAbbrev,
  dateFull,
  monthDay,
} = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function (config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  annoLen = config.annotations.length - 1;
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 10,
    right: 130,
    bottom: 30,
    left: 35,
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 90;
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

  if (min > 0) {
    min = 0;
  }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  var yScale = d3.scaleLinear().domain([min, max]).range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function (d) {
        return d.name;
      })
    )
    .range([
      "#888",
      COLORS.orange3,
      COLORS.red3,
      "rgba(216, 71, 43, 4)",
      "rgba(216, 71, 43, .4)",
      "rgba(216, 71, 43, .4)",
      "rgba(216, 71, 43, .4)",
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  var legendData = config.data.map(d => d.name).slice(0, 3);
  legendData.push("Margin of error");
  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
    .selectAll("g")
    .data(legendData)
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d));

  legend
    .append("b")
    .style("background-color", d => colorScale(d))
    .attr("class", d => "sq-" + classify(d));

  legend.append("label").text(d => d);

  d3.select(".sq-unreported-cases")
    .style("border-top", "3px solid" + COLORS.yellow3)
    .style("border-bottom", "3px solid" + COLORS.red3);

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
    .tickFormat(function (d, i) {
      return monthDay(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => (d ? (d / 1000000).toFixed(1) + "M" : 0));

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

  // add the area
  var areaGen = d3
    .area()
    // .curve(d3.curveMonotoneY)
    .x(function (d) {
      return xScale(d[dateColumn]);
    })
    .y0(function (d, i) {
      return yScale(Number(config.data[3].values[i][valueColumn])); //
    })
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data([config.data[4]])
    .enter()
    .append("path")
    .attr("fill", "rgba(216, 71, 43, .6)")
    .attr("d", d => areaGen(d.values));

  // Render lines to chart.
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data.slice(0, 3))
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  var labelVals = chartElement.append("g").attr("class", "value");

  labelVals
    .selectAll("text")
    .data(config.data.slice(0, 3))
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 8)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3 + (d.name.includes("Reported") ? 0: -30))
    .attr("fill", d => colorScale(d.name))
    .attr("class", "bolded")
    .text(function (d, i) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = fmtComma(Number(value.toFixed(0)));

      return label;
    })

  labelVals
    .selectAll("text-labels")
    .data(config.data.slice(0, 3))
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 8)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + (isMobile.matches ? 14 : 16) + (d.name.includes("Reported") ? 0: -30))
    .attr("fill", d => colorScale(d.name))
    .text(function (d, i) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = fmtComma(Number(value.toFixed(0)));

      label = LABELS['label_' + i];;

      return label;
    })
    .call(wrapText, margins.right - 8, isMobile.matches ? 12 : 14);

  var lastDate = lastItem(config.data[0])[dateColumn];
  labelVals
    .append("text")
    .attr("class", "value-header bolded")
    .attr("x", d => xScale(lastDate) + 5)
    .attr("y", yScale(2500000))
    .attr("fill", "#666")
    .text(d => "On " + monthDay(lastDate) + " there were: ")
    .call(wrapText, isMobile.matches ? margins.right/1.5 : margins.right/2, isMobile.matches ? 12 : 14);


  chartElement
    .append("g")
    .attr("class", "end-circles")
    .selectAll("circle")
    .data(config.data.slice(0, 3))
    .enter()
    .append("circle")
    .attr("class", d => "circle " + classify(d.name))
    .attr("fill", d => colorScale(d.name))
    .attr("cx", function (d) {
      return xScale(lastItem(d)[dateColumn]);
    })
    .attr("cy", d => yScale(lastItem(d)[valueColumn]))
    .attr("r", getRadius());
};

function getRadius() {
  if (isMobile.matches) return "2";
  return "4.5";
}

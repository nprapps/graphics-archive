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
    bottom: 20,
    left: 38,
  };

  var ticksX = 8;
  var ticksY = 5;
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

  var yScale = d3.scaleLinear().domain([-1, 3.5]).range([chartHeight, 0]);

  var legendData = config.data.map(d => d.name).slice(0, 3);
  // legendData.push("Margin of error, human and natural");
  // legendData.push("Margin of error, natural");

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      legendData
    )
    .range([
      COLORS.orange3,
      COLORS.teal3,
      "#666",
      "rgba(227, 141, 44, .5)",
      "rgba(23, 128, 126, .5)",
      "rgba(227, 141, 44, .4)",
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key" + oneLine)
  //   .selectAll("g")
  //   .data(legendData)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d));

  // legend
  //   .append("b")
  //   .style("background-color", d => colorScale(d))
  //   .attr("class", d => "sq-" + classify(d));

  // legend.append("label").text(d => d);

  // d3.select(".sq-unreported-cases")
  //   .style("border-top", "3px solid" + COLORS.orange3)
  //   .style("border-bottom", "3px solid" + COLORS.red3);

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
      return yearFull(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => (d ? d + '°F' : 0));

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
      return yScale(Number(config.data[3].values[i][valueColumn]));
    })
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data([config.data[4]])
    .enter()
    .append("path")
    .attr("fill", "rgba(227, 141, 44, .5)")
    .attr("d", d => areaGen(d.values));


  areaGen = d3
    .area()
    // .curve(d3.curveMonotoneY)
    .x(function (d) {
      return xScale(d[dateColumn]);
    })
    .y0(function (d, i) {
      return yScale(Number(config.data[5].values[i][valueColumn]));
    })
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data([config.data[6]])
    .enter()
    .append("path")
    .attr("fill", "rgba(23, 128, 126, .5)")
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


  var lastDate = lastItem(config.data[0])[dateColumn];

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


console.log(config.data)
  chartElement
    .append("g")
    .selectAll("text")
    .data(config.data.slice(0, 3))
    .enter()
    .append("text")
    .attr("class", d => "annotext " + classify(d.name))
    .attr("fill", d => colorScale(d.name))
    .attr("x", function (d) {
      return xScale(lastItem(d)[dateColumn]) + 5;
    })
    .attr("y", function(d) {
      var offset = yScale(lastItem(d)[valueColumn]);

      if (d.name.includes('Observed')) offset -= 8;
      if (d.name.includes('human')) offset += 3;

      return offset;
    })
    .text(d => d.name + ': ' + lastItem(d)[valueColumn].toFixed(2) + '°F')
    .call(wrapText, isMobile.matches? 85 : 125, 14);


    chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', xScale(new Date(2000, 0, 1)))
    .attr('y', yScale(2.5))
    .attr("text-anchor", "end")
    .text('Margin of error');


    chartElement.append('line')
    .classed('chart-line', true)
    .attr('x1', xScale(new Date(2001, 0, 1)))
    .attr('x2', xScale(new Date(2011, 0, 1)))
    .attr('y1', yScale(2.525))
    .attr('y2', yScale(2.525));

};

function getRadius() {
  if (isMobile.matches) return "2";
  return "4";
}

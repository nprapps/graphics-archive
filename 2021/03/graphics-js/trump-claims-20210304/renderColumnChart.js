var { isMobile } = require("./lib/breakpoints");
var { COLORS, makeTranslate } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

// Render a column chart.
module.exports = function(config) {
  // Setup chart container
  var { labelColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 8;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 25,
    left: 30
  };

  var ticksY = 4;
  var roundTicksFactor = 50;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

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
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .range([0, chartWidth])
    .round(true)
    .padding(0.1)
    .domain(config.data.map(d => d[labelColumn]));

  var floors = config.data.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max(...ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function(d, i) {
      if (d.substring(0,2) == "1/") {
        return d;
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => fmtComma(d));

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.selectAll(".x.axis .tick line")
    .attr('y2', function(d) {
      if (d.substring(0,2) == "1/") {
        return 10;
      } else {
        return 5;
      }
    });

  chartElement.selectAll(".x.axis .tick text")
    .attr('dy', function(d) {
      if (d.substring(0,2) == "1/") {
        return 15;
      }
    });

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxis
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );

  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d[labelColumn]))
    .attr("y", d => (d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn])))
    .attr("width", xScale.bandwidth())
    .attr("height", d =>
      d[valueColumn] < 0
        ? yScale(d[valueColumn]) - yScale(0)
        : yScale(0) - yScale(d[valueColumn])
    )
    .attr("class", function(d) {
      var val = "low";
      if (d[valueColumn] >= 100 && d[valueColumn] < 200) {
        val = "med";
      } else if (d[valueColumn] >= 200) {
        val = "high";
      }

      return "bar bar-" + d[labelColumn] + " " + val;
    });

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

  // Render bar values.
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data.filter(d => d[valueColumn] > 240))
  //   .enter()
  //   .append("text")
  //   .text(d => d[valueColumn].toFixed(0))
  //   .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
  //   .attr("y", d => yScale(d[valueColumn]))
  //   .attr("dy", function(d) {
  //     var textHeight = this.getBBox().height;
  //     var $this = d3.select(this);
  //     var barHeight = 0;
  //
  //     if (d[valueColumn] < 0) {
  //       barHeight = yScale(d[valueColumn]) - yScale(0);
  //
  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return -(textHeight - valueGap / 2);
  //       } else {
  //         $this.classed("out", true);
  //         return textHeight + valueGap;
  //       }
  //     } else {
  //       barHeight = yScale(0) - yScale(d[valueColumn]);
  //
  //       // if (textHeight + valueGap * 2 < barHeight) {
  //       //   $this.classed("in", true);
  //       //   return textHeight + valueGap;
  //       // } else {
  //         $this.classed("out", true);
  //         return -(textHeight - valueGap / 2);
  //       // }
  //     }
  //   })
  //   .attr("text-anchor", "middle");
};

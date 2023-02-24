var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, makeTranslate, classify, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a stacked column chart.
module.exports = function(config) {
  // console.log(config.data)
  // Setup
  var { labelColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 3;
  var valueGap = 6;
  var barWidth = 5;

  var margins = {
    top: 20,
    right: 10,
    bottom: 35,
    left: 30
  };

  var ticksY = 5;
  var roundTicksFactor = 50;

  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    margins.left = 40;
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

  var labels = config.data.map(d => d[labelColumn]);
  // var labels = config.data.map(d => d[labelColumn]).slice(0, 37);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(labels)
    .range([0, chartWidth])
    .padding(0.1);

  var values = config.data.map(d => d.total);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, 900])
    .rangeRound([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data[0].values.map(d => d[labelColumn]))
    .range([COLORS.teal2, COLORS.teal5]);

  // Render the legend.
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(colorScale.domain())
  //   .enter()
  //   .append("li")
  //   .attr("class", function(d, i) {
  //     return `key-item key-${i} ${classify(d)}`;
  //   });
  //
  // legend.append("b").style("background-color", d => colorScale(d));
  //
  // legend.append("label").text(d => d);

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(d => d % 4 !== 0 ? " ": d);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d);

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

  // Add x-axis label
  chartElement
    .append("text")
    .attr("class", "weeks-label")
    // .attr("x", isMobile.matches ? chartWidth + 6 : chartWidth + 3)
    .attr("x", chartWidth / 2 - 40)
    .attr("y", chartHeight + 30)
    .text("Weeks to process");

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(yAxis.tickSize(-chartWidth, 0).tickFormat(""));


  // Render bars to chart.
  var bars = chartElement
    .selectAll(".bars")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", "bar")
    // .attr("transform", d => makeTranslate(xScale(d[labelColumn]), 0));
    .attr("transform", function(d) {
      // console.log(d[labelColumn], xScale(d[labelColumn]))
      return makeTranslate(xScale(d[labelColumn]), 0);
    });

  bars
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("y", d => (d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1)))
    .attr("width", xScale.bandwidth())
    .attr("height", d => Math.abs(yScale(d.y0) - yScale(d.y1)))
    .style("fill", d => colorScale(d[labelColumn]))
    .attr("class", d => classify(d[labelColumn]));

    // render annotations
    var anno = chartElement
      .append("g")
      .attr("class", "annotations")

    // add anno lines
    anno
      .append("g")
      .attr("class", "anno-lines")
      .selectAll("line")
      .data(config.medians)
      .enter()
      .append("line")
      .attr("x1", function(d) {
        return xScale.bandwidth() * d.median;
      })
      .attr("x2", function(d) {
        return xScale.bandwidth() * d.median;
      })
      .attr("y1", -18)
      .attr("y2", chartHeight)
      .attr("stroke-dasharray", ("3, 3"))
      .attr("class", d => classify(d.type) + " median-line")

    // add anno labels
    anno
      .append("g")
      .attr("class", "anno-labels")
      .selectAll("text")
      .data(config.medians)
      .enter()
      .append("text")
      .attr("x", function(d) {
        var padding = d.label == "end" ? -5 : 5;
        return (xScale.bandwidth() * d.median) + padding;
      })
      .attr("y", -10)
      .text(function(d) {
        var val = d.median;
        return d.type + ": " + val.toFixed(0) + " weeks (median)"
      })
      .attr("class", d => classify(d.type) + " median-label")
      .attr("text-anchor", d => d.label)
      .call(wrapText, 100, 13)

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

  // Render values to chart.
  // bars
  //   .selectAll("text")
  //   .data(function(d) {
  //     return d.values;
  //   })
  //   .enter()
  //   .append("text")
  //   .text(d => d.val)
  //   .attr("class", d => classify(d.name))
  //   .attr("x", xScale.bandwidth() / 2)
  //   .attr("y", function(d) {
  //     var textHeight = this.getBBox().height;
  //     var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));
  //
  //     if (textHeight + valueGap * 2 > barHeight) {
  //       d3.select(this).classed("hidden", true);
  //     }
  //
  //     var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;
  //
  //     return barCenter + textHeight / 2;
  //   })
  //   .attr("text-anchor", "middle");
};

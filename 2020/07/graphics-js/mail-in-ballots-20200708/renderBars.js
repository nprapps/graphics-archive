var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a stacked bar chart.
module.exports = function(config) {
  // Setup
  var { labelColumn, nameColumn } = config;

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 60;
  var labelMargin = 6;
  var valueGap = 6;
  
  var margins = {
    top: 0,
    right: 20,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

  if (isMobile.matches) {
    ticksX = 2;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
  var markerValues = config.data.map(d => d.marker);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = markerValues.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  var max = Math.max(...ceilings);
  console.log(max, ceilings, markerValues, roundTicksFactor)

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data[0].values.map(d => d[nameColumn]))
      .range([COLORS.orange3, COLORS.teal3, COLORS.teal4, COLORS.teal5]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  legend.append("b").style("background-color", colorScale);

  legend.append("label").text(d => d);

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
    .tickFormat(d => d + "%");

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
    .call(
      xAxis
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d[labelColumn]))
    .attr(
      "transform",
      (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    );

  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", function(d) {
      var color = colorScale(d[nameColumn]);
      return color + '90';
    })
    .attr("class", d => 'd' + classify(d[nameColumn]));


  // Render bar values.
  group
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(d => (d.val ? Math.round(d.val * 100)/100 + "%" : null))
    .attr("class", d => classify(d.name))
    .attr("x", d => xScale(d.x1))
    .attr("dx", function(d) {
      var textWidth = this.getComputedTextLength();
      var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

      // Hide labels that don't fit
      if (textWidth + valueGap * 2 > barWidth) {
        d3.select(this).classed("hidden", true);
      }

      if (d.x1 < 0) {
        return valueGap;
      }

      return -(valueGap + textWidth);
    })
    .attr("dy", barHeight / 2 + 4);


    // group
    // .append("g").selectAll("line")
    // .data(d => d.values)
    // .enter()
    // .attr("class", "amt-line")
    // .attr("x1", d => xScale(Math.abs(d['name'] * 100)))
    // .attr("x2", d => xScale(Math.abs(d['name'] *100)))
    // .attr("y1", 0)
    // .attr("y2", 35)
    // .style("stroke-width", "1.5")
    // .style("stroke", "black");

   // group.append("text")
   //  .attr("class", "model-label")
   //  .attr("x", function(d) {
   //    return xScale(Math.abs(d['marker']))
   //  })
   //  .attr("y", 0)
   //  .attr("text-anchor", function(d){
   //    if (Math.abs(d['marker']) + 15 > max) {
   //      return "end"
   //    }
   //    return "start"
   //  })
   //  .text(function(d) {
   //    return `2016 Margin: ${Math.abs(d['marker'])}`;
   //  })
   //  .call(wrapText,120,13);

    group.append("line")
    .attr("class", "model-line")
    .attr("x1", d => xScale(Math.abs(d['marker'])))
    .attr("x2", d => xScale(Math.abs(d['marker'])))
    .attr("y1", 0)
    .attr("y2", 35)
    .style("stroke-width", "1.5")
    .style("stroke-dasharray", ("3, 3"));

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
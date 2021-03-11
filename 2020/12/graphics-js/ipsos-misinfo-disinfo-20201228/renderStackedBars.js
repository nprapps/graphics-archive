var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

var { COLORS, classify, makeTranslate, formatStyle } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

// Render a stacked bar chart.
module.exports = function (config, second) {
  // Setup
  var { labelColumn, nameColumn } = config;

  var barHeight = 40;
  var barGap = 5;
  var labelWidth = 250;
  var labelMargin = 6;
  var valueGap = 6;

  var ticksX = 4;
  var roundTicksFactor = 100;

  if (isMobile.matches) {
    ticksX = 2;
    labelWidth = 180;
    barHeight = 50;
  }

  var margins = {
    top: 0,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin,
  };

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  console.log(config)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
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

  var xScale = d3.scaleLinear().domain([min, 100]).rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data[0].values.map(d => d[nameColumn]))
    .range([COLORS.teal3, "#ccc", COLORS.orange3,  "url(#correct-true)", "url(#correct-false)", "url(#correct-dk)"]);

  if (!second) {
    // Render the legend.
    var legend = d3.select(".legend");
    legend.html("");

    var legendCont = legend
      .append("ul")
      .attr("class", "key")
      .selectAll("g")
      .data(colorScale.domain())
      .enter()
      .append("li")
      .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

    legendCont.append("b").style("background-color", colorScale);

    legendCont.append("label").text(d => d);
  }

  var newCs = config.data[0].values.map(d => d[nameColumn])
  newCs.push(...colorScale.domain().map(v => v +'f'))
  colorScale.domain(newCs)
  console.log(colorScale.domain())

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

  var pattern = chartElement
    .append("pattern")
    .attr("id", "correct-false")
    .attr("width", "4")
    .attr("height", "4")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("patternTransform", "rotate(45)");

  pattern
    .append("path")
    .attr("d", "M0,0L0,5")
    .style("stroke", "rgba(249,183,110,.9)")
    .style("stroke-width", "6");

  pattern
    .append("path")
    .attr("d", "M0,0L0,5")
    .style("stroke", "rgba(249,183,110,.7)")
    .style("stroke-width", "20");

  var patternTrue = chartElement
    .append("pattern")
    .attr("id", "correct-true")
    .attr("width", "4")
    .attr("height", "4")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("patternTransform", "rotate(45)");

  patternTrue
    .append("path")
    .attr("d", "M0,0L0,5")
    .style("stroke", "rgb(23, 128, 126)")
    .style("stroke-width", "6");

  patternTrue
    .append("path")
    .attr("d", "M0,0L0,5")
    .style("stroke", "rgba(23, 128, 126, .7)")
    .style("stroke-width", "20");

  var patternDK = chartElement
    .append("pattern")
    .attr("id", "correct-dk")
    .attr("width", "4")
    .attr("height", "4")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("patternTransform", "rotate(45)");

  patternDK
    .append("path")
    .attr("d", "M0,0L0,5")
    .style("stroke", "rgba(204, 204, 204, .9)")
    .style("stroke-width", "6");

  patternDK
    .append("path")
    .attr("d", "M0,0L0,5")
    .style("stroke", "rgba(204, 204, 204, .6)")
    .style("stroke-width", "20");

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

  // chartElement
  //   .append("g")
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));

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
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", function(d) {
      var l = d[nameColumn];
      // if ((!second && d[nameColumn] != 
      //   'True') || second && d[nameColumn] != 'False') {
        
      //   l = l + 'f';
      // }
      return colorScale(l)

    })
    .attr("class", d => classify(d[nameColumn]));

  // Render bar values.
  group
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(d => (d.val ? d.val + "%" : null))
    .attr("class", d => classify(d.name))
    .attr("x", d => xScale(d.x1))
    .attr("dx", function (d) {
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
  var bLabels = chartWrapper
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
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px;",
      })
    )
    .attr("class", d => classify(d[labelColumn]));

    bLabels.append("span")
    .text(d => d[labelColumn])
    // .append("b")
    // .text(function(d) { return d.tf ? ' (True)' : ' (False)'})
};

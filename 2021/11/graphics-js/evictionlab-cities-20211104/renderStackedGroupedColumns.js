var d3 = {
  ...require("d3-array"),
  ...require("d3-axis"),
  ...require("d3-scale"),
  ...require("d3-selection")
};
var { isMobile } = require("./lib/breakpoints");
var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");

// Render a grouped stacked column chart.
module.exports = function(config) {
  // Setup
  var { labelColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 3;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 1,
    bottom: 47,
    left: 37
  };

  var ticksY = [ 0, 25, 50, 75, 100 ];
  var roundTicksFactor = 20;

  if (isMobile.matches) {
    aspectWidth = 2;
    aspectHeight = 1;
    margins.bottom = 65;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");
  containerElement.append("h3")
    .text(config.title);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(config.data.map(d => d.category))
    .range([0, chartWidth])
    .padding(0.1);

  var xScaleBars = d3
    .scaleBand()
    .domain(config.data.map(d => d[labelColumn]))
    .range([0, xScale.bandwidth()])
    .padding(0.1);

  var values = config.data.map(d => d.total);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  // var min = Math.min(...floors);
  // var max = Math.max(...ceilings);

  // if (min > 0) {
  //   min = 0;
  // }

  var min = config.yDomain[0];
  var max = config.yDomain[1];

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // var colorScale = d3
  //   .scaleOrdinal()
  //   .domain(config.data[0].values.map(d => d[labelColumn]))
  //   .range([ COLORS.orange2, COLORS.orange3, COLORS.orange4 ]);

  // // Render the legend.
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(colorScale.domain())
  //   .enter()
  //   .append("li")
  //   .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);
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
    .tickFormat(d => d);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickValues(ticksY)
    .tickFormat(d => d + "%");

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis category")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.selectAll(".x.axis.category .tick line").remove();
  chartElement
    .selectAll(".x.axis.category text")
    .attr("y", 40)
    .attr("dy", 0)
    .call(wrapText, xScale.bandwidth(), 13);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(yAxis.tickSize(-chartWidth, 0).tickFormat(""));

  // Render bars to chart.
  xScale.domain().forEach(function(c, k) {
    var categoryElement = chartElement
      .append("g")
        .attr("class", "columns " + classify(c));

    var columns = categoryElement
      .selectAll(".columns." + classify(c))
      .data(config.data.filter(d => d.category == c))
      .enter()
      .append("g")
        .attr("class", "column")
        .attr("transform", d => makeTranslate(xScale(d.category), 0));

    // axis labels
    var xAxisBars = d3
      .axisBottom()
      .scale(xScaleBars)
      .tickFormat(d => d);
    categoryElement
      .append("g")
        .attr("class", "x axis bars")
        .attr("transform", makeTranslate(xScale(c), chartHeight))
        .call(xAxisBars);

    // column segments
    var bars = columns
      .append("g")
        .attr("class", "bar")
        .attr("transform", d => makeTranslate(xScaleBars(d[labelColumn]), 0));

    bars
      .selectAll("rect")
      .data(d => d.values)
      .enter()
      .append("rect")
        .attr("y", d => (d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1)))
        .attr("width", xScaleBars.bandwidth())
        .attr("height", d => Math.abs(yScale(d.y0) - yScale(d.y1)))
        // .style("fill", d => colorScale(d[labelColumn]))
        .attr("class", d => classify(d[labelColumn]));

    // Render values to chart.
    bars
      .selectAll("text")
      .data(d => d.values)
      .enter()
      .append("text")
        .text(d => d.val.toFixed(0) + "%")
        .attr("class", d => classify(d[labelColumn]))
        .attr("x", d => xScaleBars.bandwidth() / 2)
        .attr("y", function(d) {
          var textHeight = this.getBBox().height;
          var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));

          var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;
          var centerPos = barCenter + textHeight / 2;

          if (textHeight + valueGap * 2 > barHeight) {
            if (d.val.toFixed(0) == 0) {
              d3.select(this).classed("hidden", true);
              return centerPos - 3;
            } else {
              d3.select(this).classed("out", true);
              return yScale(d.y1) - 6;
            }
          } else {
            // return centerPos;
            return yScale(d.y1) + 15;
          }
        });
  });
};

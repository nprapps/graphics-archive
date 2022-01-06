var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, makeTranslate, classify, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
var { monthDay, yearFull, yearAbbrev } = require("./lib/helpers/formatDate");

// Render a stacked column chart.
module.exports = function(config) {
  // Setup
  var { labelColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;
  var valueGap = 6;

  var margins = {
    top: 25,
    right: 5,
    bottom: 20,
    left: 25
  };

  var ticksY = 5;
  var roundTicksFactor = 50;

  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
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
  console.log(labels)
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
  var max = 25000000; 
  var labelWidthBooster = 0;
  var xLabelPosition = -11;

  if (isMobile.matches) {
    max = 30000000;
    labelWidthBooster = 20;
    xLabelPosition += 5;
  }

  if (min > 0) {
    min = 0;
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
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

  // legend.append("b").style("background-color", d => colorScale(d));

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

  var defs = chartElement.append("defs")
  var pattern = defs.append("pattern")
    .attr("id","pattern")
    .attr("width",12)
    .attr("height",12)
    .attr("patternUnits","userSpaceOnUse")
    .attr("patternTransform","rotate(45 50 50)")

  pattern.append("line")
    .attr("stroke",COLORS.teal5)
    .attr("stroke-width","12px")
    .attr("y2",12)
  pattern.append("line")
    .attr("stroke",COLORS.teal4)
    .attr("stroke-width","24px")
    .attr("y2",12)
    .attr("stroke-opacity",0.5)



  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(d => d);

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(5)
    .tickFormat(function(d, i) {
      console.log(d)
      // if (i%4 ==) {}
      if (i%4 == 0 ){
        return monthDay(new Date(d));
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d == 0 ? 0 : `${d/1000000}`);

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

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(yAxis.tickSize(-chartWidth, 0).tickFormat(""));

  // var future = chartElement
  //   .append('rect')
  //   .attr("class","bg-rect")
  //   .attr('x', xScale(labels[labels.length - 3]) - 1)
  //   .attr('width', 2 + xScale.bandwidth() + xScale(labels[labels.length - 1]) - xScale(labels[labels.length - 3]) )
  //   .attr('y', 0)
  //   .attr('height', chartHeight);

  chartElement.append('text')
    .classed('chart-label-title', true)
    .attr('x', xScale(labels[0])+xLabelPosition)
    .attr('y', yScale(max)+4)
    .text('million doses per week')
    // .call(wrapText,100,11);


  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', xScale(labels[labels.length - 2]))
    .attr('y', yScale(max)+20)
    .text(LABELS.projected_label)
    .call(wrapText,xScale.bandwidth()*4-10+labelWidthBooster,12);

  // Render bars to chart.
  var bars = chartElement
    .selectAll(".bars")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", "bar")
    .attr("transform", d => makeTranslate(xScale(d[labelColumn]), 0));

  bars
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("y", d => (d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1)))
    .attr("width", xScale.bandwidth())
    .attr("height", d => Math.abs(yScale(d.y0) - yScale(d.y1)))
    // .style("fill", d => colorScale(d[labelColumn]))
    .style("fill", d => {
      if (d[labelColumn] !== "deficit") {
        return colorScale(d[labelColumn])
      } else {
        return "url(#pattern)" 
      }
    })
    .attr("class", d => classify(d[labelColumn]));

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

  //     if (textHeight + valueGap * 2 > barHeight) {
  //       d3.select(this).classed("hidden", true);
  //     }

  //     var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;

  //     return barCenter + textHeight / 2;
  //   })
  //   .attr("text-anchor", "middle");
};

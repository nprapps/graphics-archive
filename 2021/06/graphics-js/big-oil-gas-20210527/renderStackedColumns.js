var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

var {
  COLORS,
  makeTranslate,
  classify,
  wrapText,
  fmtComma,
} = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");

var fmtYearAbbrev = d => (d + "").slice(-2);

// Render a stacked column chart.
module.exports = function (config) {
  // Setup
  var { labelColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 8;
  var valueGap = 6;

  var margins = {
    top: 15,
    right: 5,
    bottom: 25,
    left: 30,
  };

  var ticksY = 5;
  var roundTicksFactor = 50;

  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    margins.bottom = 55;
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
  var max = 50000;

  if (min > 0) {
    min = 0;
  }

  var yScale = d3.scaleLinear().domain([min, max]).rangeRound([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data[0].values.map(d => d[labelColumn]))
    .range([COLORS.teal2, COLORS.yellow3]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", function (d, i) {
      return `key-item key-${i} ${classify(d)}`;
    });

  legend.append("b").style("background-color", d => colorScale(d));

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
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function (d) {
      if (isMobile.matches) return "\u2019" + fmtYearAbbrev(d);
      return d;
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function (d) {
      if (d == 50000) {
        return "";
      }
      if (d == 0) return 0;
      return '$' + d / 1000;
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.append("g").attr("class", "y axis").call(yAxis);

  // Render grid to chart.

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(yAxis.tickSize(-chartWidth, 0).tickFormat(""));

  d3.selectAll(".x.axis .tick text").call(
    wrapText,
    isMobile.matches ? 33 : 90,
    14
  );

  d3.selectAll(".x.axis .tick text").attr("transform", "translate(0, 8)");

  var lastItem = config.data[config.data.length - 1];
  chartElement
    .append("rect")
    .attr("class", "preliminary")
    .attr("transform", d => makeTranslate(xScale("2021") - 2, 0))
    .attr("y", 0)
    .attr("width", xScale.bandwidth() * 11 + 4)
    .attr("height", chartHeight);

  // Render bars to chart.
  var bars = chartElement
    .selectAll(".bars")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", "bar")
    .style("opacity", function (d) {
      return d[labelColumn] >= "2021" ? 0.5 : 1;
    })
    .attr("transform", d => makeTranslate(xScale(d[labelColumn]), 0));

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

  chartElement
    .append("g")
    .append("text")
    .attr("x", -28)
    .attr("y", yScale(50500))
    .text("$50 billion");

  if (isMobile.matches) {
    chartElement
      .append("g")
      .attr("class", "axis-label")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight + 50)
      .text("Year");
  }

  // Render values to chart.
  // bars
  //   .selectAll("text")
  //   .data(function (d) {
  //     if (d.label == "May 16-22") return [];
  //     return d.values;
  //   })
  //   .enter()
  //   .append("text")
  //   .text(function (d) {
  //     if (d.name >= 2021 || isMobile.matches) return;
  //     return (d.val / 1000).toFixed(1);
  //   })
  //   .attr("class", d => classify(d.name))
  //   .attr("x", xScale.bandwidth() / 2)
  //   .attr("y", function (d) {
  //     var textHeight = this.getBBox().height;
  //     var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));

  //     if (textHeight + valueGap * 2 > barHeight) {
  //       d3.select(this).classed("hidden", true);
  //     }

  //     var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;

  //     return barCenter + textHeight / 2;
  //   })
  //   .attr("text-anchor", "middle");

  chartElement
    .append("g")
    .append("text")
    .attr("x", xScale("2026") + xScale.bandwidth() / 2)
    .attr("y", yScale(45000))
    .attr("class", "preliminary-label")
    .text("Future capital expenditures*")
    .attr("text-anchor", "middle")
    .call(wrapText, isMobile.matches ? 30 : 90, 14);

  chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("text")
    .data(isMobile.matches ? window.ANNOTATIONS.slice(0, 1) : window.ANNOTATIONS)
    .enter()
    .append("text")
    .text(d => d.text)
    .attr("x", d => xScale(d.year) + d.x_offset + 2 + xScale.bandwidth()/ (d.vertical ? 2 : 1))
    .attr("y", d => yScale(d.y) - (d.vertical ? 10 : 20))
    .call(wrapText, isMobile.matches ? 100 : 150 , 14);

  chartElement
    .append("g")
    .attr("class", "annotation-lines")
    .selectAll("line")
    .data(isMobile.matches ? window.ANNOTATIONS.slice(0, 1) : window.ANNOTATIONS)
    .enter()
    .append("line")
    .attr(
      "x1",
      d => xScale(d.year) + (xScale.bandwidth() + 2) / (d.vertical ? 2 : 1)
    )
    .attr(
      "x2",
      d =>
        xScale(d.year) +
        (d.vertical
          ? (xScale.bandwidth() + 2) / 2
          : d.x_offset + xScale.bandwidth() - 2)
    )
    .attr("y1", d => yScale(d.y) + (d.vertical ? 15 : 10))
    .attr("y2", d => (d.vertical ? yScale(d.y) + 30 : yScale(d.y)));
};

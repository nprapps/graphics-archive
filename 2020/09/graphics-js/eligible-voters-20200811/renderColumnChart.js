console.clear();

var { isMobile, isMedium, isDesktop } = require("./lib/breakpoints");
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

  var aspectWidth = isMedium.matches ? 4 : 16;
  var aspectHeight = isMedium.matches ? 3 : 9;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 30,
    left: 48
  };

  var gutterWidth = isMobile.matches ? 0 : 15;

  var ticksY = 5;
  var roundTicksFactor = 10;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right - gutterWidth;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // add chart title
  containerElement.append("h3")
    .text(config.title)
    // .attr("style", "width: " + labelWidth + "px;");

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

  var min = -10;

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = 10;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function(d, i) {
      return d;
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    // .tickFormat(d => fmtComma(d))
    .tickFormat(function(d, i) {
      if (d > 0) d = "+" + d;
      if (i == 4) {
        return d + " pts."; 
      } else {
        return d;
      }
    });

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

  // shift axis labels
  if (!isDesktop.matches && !isMobile.matches) {
    chartElement.selectAll('.x.axis .tick line')
      .attr('y2', function(d,i) {
          if (i%2 == 1) {
              return 15;
          } else {
              return 5;
          }
      });
    chartElement.selectAll('.x.axis .tick text')
      .attr('dy', function(d,i) {
          if (i%2 == 1) {
              return 18;
          } else {
              return 6;
          }
      });
  }

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
      return "bar bar-" + d[labelColumn] + (d[valueColumn] < 0 ? " neg" : " pos");
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
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => d.annotation ? d.annotation + ": " + (d[valueColumn] > 0 ? "+" : "") + d[valueColumn] : "")
    .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2 + (d.offset ? d.offset : 0))
    .attr("y", d => yScale(d[valueColumn]))
    .attr("dy", function(d) {
      var textHeight = this.getBBox().height;
      var $this = d3.select(this);
      var barHeight = 0;

      if (d[valueColumn] < 0) {
        barHeight = yScale(d[valueColumn]) - yScale(0);
          $this.classed("out", true);
          return textHeight + valueGap;
      } else {
        barHeight = yScale(0) - yScale(d[valueColumn]);
          $this.classed("out", true);
          return -(textHeight - valueGap / 2);
      }
    })
    .attr("text-anchor", "middle");
};

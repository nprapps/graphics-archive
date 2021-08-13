console.clear();

var { isMobile } = require("./lib/breakpoints");
var textures = require("./lib/textures");

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

// Render a bar chart.
var renderBarChart = function(config) {
  // Setup
  var { labelColumn, apColumn, actualColumn, reportedColumn } = config;

  var barHeight = 20;
  var barGap = 10;
  var labelWidth = 95;
  var labelMargin = 6;
  var valueGap = 6;
  var dotRadius = 5;

  var margins = {
    top: 18,
    right: 15,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

  // if (isMobile.matches) {
  //   ticksX = 3;
  // }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

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
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Define textured background
  var texture = textures
    .lines()
    .orientation("7/8")
    .size(13)
    .strokeWidth(3)
    .background(COLORS.orange3)
    .stroke(COLORS.orange5);
  containerElement.select("svg").call(texture);

  // Create D3 scale objects.
  var floors = config.data.map(
    d => Math.floor(d[actualColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[actualColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max.apply(null, ceilings);

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisTop()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d) {
      return d.toFixed(0) + "%";
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    // .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis.tickSize(chartHeight, 0, 0).tickFormat(""));

  // Render bars to chart.
 
  chartElement
    .append("g")
    .attr("class", "bars reported")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => (d[reportedColumn] >= 0 ? xScale(0) : xScale(d[reportedColumn])))
    .attr("width", d => Math.abs(xScale(0) - xScale(d[reportedColumn])))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("height", barHeight)
    // .attr("style", `fill: ${texture.url()};`)
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`);

 chartElement
    .append("g")
    .attr("class", "bars estimated")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => (d[actualColumn] >= 0 ? xScale(0) : xScale(d[actualColumn])))
    .attr("width", d => Math.abs(xScale(0) - xScale(d[actualColumn])))
    .attr("y", (d, i) => (i * (barHeight + barGap)) + 5)
    .attr("height", barHeight / 2)
    // .attr("style", `fill: ${texture.url()};`)
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`);

  // chartElement
  //   .append("g")
  //   .attr("class", "bars border")
  //   .selectAll("rect")
  //   .data(config.data)
  //   .enter()
  //   .append("rect")
  //   .attr("x", d => Math.abs(xScale(0) - xScale(d[reportedColumn])))
  //   .attr("width", 1)
  //   .attr("y", (d, i) => i * (barHeight + barGap))
  //   .attr("height", (d, i) => i > 2 ? barHeight : barHeight + 10)
  //   .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`);
  
  

  // Render lines to chart.
  // chartElement
  //   .append("g")
  //   .attr("class", "bars")
  //   .selectAll("line")
  //   .data(config.data)
  //   .enter()
  //   .append("line")
  //   .attr("x1", 0)
  //   .attr("x2", d => xScale(d[actualColumn]))
  //   .attr("y1", (d, i) => i * (barHeight + barGap) + barHeight / 2)
  //   .attr("y2", (d, i) => i * (barHeight + barGap) + barHeight / 2);

  // Render dots to chart.
  // chartElement
  //   .append("g")
  //   .attr("class", "dots")
  //   .selectAll("circle")
  //   .data(config.data)
  //   .enter()
  //   .append("circle")
  //   .attr("cx", d => xScale(d[reportedColumn]))
  //   .attr("cy", (d, i) => i * (barHeight + barGap) + barHeight / 2)
  //   .attr("r", dotRadius);

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
    .attr("class", "labels long")
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
    .attr("style", function(d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px"
      });
    })
    .attr("class", function(d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .text(d => d[labelColumn]);

  // chartWrapper
  //   .append("ul")
  //   .attr("class", "labels short")
  //   .attr(
  //     "style",
  //     formatStyle({
  //       width: labelWidth + "px",
  //       top: margins.top + "px",
  //       left: "0"
  //     })
  //   )
  //   .selectAll("li")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("style", function(d, i) {
  //     return formatStyle({
  //       width: labelWidth + "px",
  //       height: barHeight + "px",
  //       left: "0px",
  //       top: i * (barHeight + barGap) + "px"
  //     });
  //   })
  //   .attr("class", function(d) {
  //     return classify(d[apColumn]);
  //   })
  //   .append("span")
  //   .text(d => d[apColumn]);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => d[actualColumn].toFixed(0) + "%")
    .attr("x", d => xScale(d[actualColumn]))
    .attr("y", (d, i) => (i * (barHeight + barGap)) + 1)
    .attr("dx", function(d) {
      var xStart = xScale(d[actualColumn]);
      var textWidth = this.getComputedTextLength();

      // Negative case
      if (d[actualColumn] < 0) {
        var outsideOffset = -(valueGap + textWidth);

        // if (xStart + outsideOffset < 0) {
        //   d3.select(this).classed("in", true);
        //   return valueGap;
        // } else {
          d3.select(this).classed("out", true);
          return outsideOffset;
        // }
        // Positive case
      } else {
        // if (xStart + valueGap + textWidth > chartWidth) {
        //   d3.select(this).classed("in", true);
        //   return -(valueGap + textWidth);
        // } else {
          d3.select(this).classed("out", true);
          return valueGap;
        // }
      }
    })
    .attr("dy", barHeight / 2 + 3);

  // Render topline annotations
  chartElement
    .append("g")
    .attr("class", "annotation header")
    .append("text")
    .text("Reported:")
    .attr("x", xScale(1))
    .attr("y", 40)
    .attr("fill", "#888");
  chartElement
    .append("g")
    .attr("class", "annotation")
    .append("text")
    .text("8% have been")
    .attr("x", xScale(1))
    .attr("y", 55);
  chartElement
    .append("g")
    .attr("class", "annotation")
    .append("text")
    .text("infected")
    .attr("x", xScale(1))
    .attr("y", 70);

  chartElement
    .append("g")
    .attr("class", "annotation header")
    .append("text")
    .text("Estimate:")
    .attr("x", xScale(26))
    .attr("y", 40)
    .attr("fill", "#E38D2C");
  chartElement
    .append("g")
    .attr("class", "annotation")
    .append("text")
    .text("36% have actually")
    .attr("x", xScale(26))
    .attr("y", 55);
  chartElement
    .append("g")
    .attr("class", "annotation")
    .append("text")
    .text("been infected")
    .attr("x", xScale(26))
    .attr("y", 70);

  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .text(d => d[reportedColumn].toFixed(0) + "%")
  //   .attr("x", d => xScale(d[reportedColumn]))
  //   .attr("y", (d, i) => i * (barHeight + barGap))
  //   .attr("dx", function(d) {
  //     var xStart = xScale(d[reportedColumn]);
  //     var textWidth = this.getComputedTextLength();

  //     // Negative case
  //     // if (d[reportedColumn] < 0) {
  //       var outsideOffset = -(valueGap + textWidth);

  //       if (xStart + outsideOffset < 0) {
  //         d3.select(this).classed("in", true);
  //         return valueGap;
  //       } else {
  //         d3.select(this).classed("out", true);
  //         return outsideOffset;
  //       }
  //       // Positive case
  //     // } else {
  //     //   if (xStart + valueGap + textWidth > chartWidth) {
  //     //     d3.select(this).classed("in", true);
  //     //     return -(valueGap + textWidth);
  //     //   } else {
  //     //     d3.select(this).classed("out", true);
  //     //     return valueGap;
  //     //   }
  //     // }
  //   })
  //   .attr("dy", barHeight / 2 + 3);
};

module.exports = renderBarChart;
console.clear();

var { isMobile } = require("./lib/breakpoints");
var textures = require("./lib/textures");

var {
  COLORS,
  makeTranslate,
  classify,
  formatStyle,
  wrapText,
} = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

// Render a bar chart.
var renderBarChart = function (config) {
  // Setup
  var { labelColumn, actualColumn, fullData } = config;

  var barHeight = 20;
  var barGap = 5;
  var labelWidth = 95;
  var labelMargin = 6;
  var valueGap = 4;
  var dotRadius = 5;

  if (isMobile.matches) {
    labelWidth = 45;
  }

  var margins = {
    top: 45,
    right: 40,
    bottom: 20,
    left: labelWidth + labelMargin,
  };

  if (isMobile.matches) {
    margins.right = 40;
  }

  var ticksX = 4;
  var roundTicksFactor = 5;

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
  var floors = config.fullData.map(
    d => Math.floor(d[actualColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.fullData.map(
    d => Math.ceil(d[actualColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = 20;

  var xScale = d3.scaleLinear().domain([min, max]).range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisTop()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function (d) {
      var lead = d > 0 ? "+" : "";
      return lead + d.toFixed(0) + " pts";
    });

  var axisLabels = chartElement.append("g");

  var fx = isMobile ? wrapText : () => {};
  axisLabels
    .append("text")
    .attr("class", "xaxis-label")
    .attr("x", isMobile.matches ? xScale(-14) : xScale(-12))
    .attr("y", -30)
    .text(LABELS.rural);

  axisLabels
    .append("text")
    .attr("class", "xaxis-label")
    .attr("x", xScale(0))
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .text(LABELS.mid);

  axisLabels
    .append("text")
    .attr("class", "xaxis-label")
    .attr("x", xScale(max + 1))
    .attr("y", -30)
    .attr("text-anchor", "end")
    .text(LABELS.urban);

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

  // Render bars to charts

  chartElement
    .append("g")
    .attr("class", "bars estimated")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d =>
      d[actualColumn] >= 0 ? xScale(0) : xScale(d[actualColumn])
    )
    .attr("width", d => Math.abs(xScale(0) - xScale(d[actualColumn])))
    .attr("y", (d, i) => i * (barHeight + barGap) + 5)
    .attr("height", barHeight)
    .attr(
      "style",
      d => `opacity: ${(Math.abs(d[actualColumn]) / 18) * 0.7 + 0.3};`
    )
    .attr("class", function (d, i) {
      var negClass =
        Math.round(d[actualColumn]) > 1
          ? "pos"
          : Math.round(d[actualColumn]) >= -1
          ? "neutral"
          : "neg";
      return `bar-${i} ${classify(d[labelColumn])} ${negClass}`;
    });

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);

    chartElement
      .append("line")
      .attr("class", "bar-dash")
      .attr("x1", xScale(-15))
      .attr("x2", xScale(25))
      .attr("y1", 8 * (barHeight + barGap) + (barHeight + barGap + 3) / 2)
      .attr("y2", 8 * (barHeight + barGap) + (barHeight + barGap + 3) / 2);

    var dashLine = chartElement
      .append("line")
      .attr("class", "dash-line")
      .attr("x1", xScale(-11))
      .attr("x2", xScale(21))
      .attr("y1", 8 * (barHeight + barGap) + (barHeight + barGap + 3) / 2)
      .attr("y2", 8 * (barHeight + barGap) + (barHeight + barGap + 3) / 2);

    //▲

    var arrows = chartElement.append("g").attr("class", "arrows");
      arrows.append("text")
      .attr("class", "more-up")
      .attr("x", xScale(0))
      .attr("y", 8 * (barHeight + barGap) + (barHeight + barGap + 3) / 2 - 3)
      .attr("text-anchor", "middle")
      .text("▲");

    arrows
      .append("text")
      .attr("class", "more-down")
      .attr("x", xScale(0))
      .attr("y", 8 * (barHeight + barGap) + (barHeight + barGap + 3) / 2 + 12)
      .attr("text-anchor", "middle")
      .text("▼");

    var middle = document.querySelector(".bar-dash");
    middle.addEventListener("click", function(e) {
      document.querySelector("button.expander").click();
    });

    document.querySelector(".more-up").addEventListener("click", function(e) {
      document.querySelector("button.expander").click();
    });

    document.querySelector(".more-down").addEventListener("click", function(e) {
      document.querySelector("button.expander").click();
    });

    document.querySelector(".dash-line").addEventListener("click", function(e) {
      document.querySelector("button.expander").click();
    });

    //   chartElement
    // .append("text")
    // .attr("class", "xaxis-label")
    // .attr("x", xScale(-4))
    // .attr("y", 8 * (barHeight + barGap) + (barHeight + barGap + 3) / 2 - 3)
    // .attr("text-anchor", "start")
    // .text("Show all");

    // chartElement
    // .append("line")
    // .attr("class", "collapsed")
    // .attr("x1", xScale(0))
    // .attr("x2", xScale(0))
    // .attr("y1", 8 * (barHeight + barGap))
    // .attr("y2",  8 * (barHeight + barGap) + barHeight + barGap+ 3);
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
        left: "0",
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", function (d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + 4 + "px",
      });
    })
    .attr("class", function (d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .text(d => d[labelColumn]);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => (d.hide ? "" : Number(d[actualColumn]).toFixed(1)))
    .attr("class", d => (d[actualColumn] == 0 ? "hidden" : ""))
    .attr("x", d => xScale(d[actualColumn]))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dx", function (d) {
      var xStart = xScale(d[actualColumn]);
      var textWidth = this.getComputedTextLength();

      // Negative case
      if (d[actualColumn] < 0) {
        var outsideOffset = -(valueGap + textWidth);
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
    .attr("dy", barHeight / 2 + 10);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => d.annotation)
    .attr("class", "out")
    .attr("x", d => Math.max(xScale(d[actualColumn]), xScale(0)))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dx", function (d) {
      return d.left;
    })
    .attr("dy", barHeight / 2 + 5)
    .each(function (d, i) {
      wrapText([this], isMobile.matches ? d.mobile_width : d.width, 12);
    });

  // Render topline annotations
  chartElement.append("g").attr("class", "annotation header").append("text");
  // .text("Reported:")
  // .attr("x", xScale(1))
  // .attr("y", 40)
  // .attr("fill", "#888");
};

module.exports = renderBarChart;

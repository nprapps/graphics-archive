// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;

var {
  COLORS,
  makeTranslate,
  classify,
  formatStyle,
  fmtComma,
  wrapText,
} = require("./lib/helpers");

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-fetch/dist/d3-fetch.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

// Initialize the graphic.
var onWindowLoaded = function () {
  // formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage("on-screen", function (bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function (data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function () {
  // Render the chart!
  var container = "#dumbbell-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderArrowChart({
    container,
    width,
    data: DATA,
    max,
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderArrowChart = function (config) {
  // Setup
  var labelColumn = isMobile.matches ? "label_mobile" : "label";
  var firstColumn = "first";
  var finalColumn = "final";
  var diffColumn = "diff";

  var barHeight = 30;
  var barGap = 5;
  var labelWidth = 118;
  var labelMargin = 10;
  var resultLabelWidth = 80;
  var valueGap = 5;

  var margins = {
    top: 65,
    right: 30,
    // right: (resultLabelWidth * 2),
    bottom: 25,
    left: labelWidth + labelMargin,
  };

  if (isMobile.matches) {
    margins.top = margins.top + 17;
    margins.right = 41;
    barGap = 0;
    valueGap = 5;
    labelWidth = 99;
    margins.left = labelWidth + labelMargin;
  }

  var ticksX = 5;
  var roundTicksFactor = 5;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(LEGEND.map(d => d.label))
    .range(LEGEND.map(d => d.color));

  // Render HTML legend
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(colorScale.domain())
  //   .enter()
  //   .append("li")
  //     .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

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
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  var floors = config.data.map(
    d => Math.floor(d[finalColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  // var ceilings = config.data.map(
  //   d => Math.ceil(d[finalColumn] / roundTicksFactor) * roundTicksFactor
  // );

  // var max = Math.max.apply(null, ceilings);
  // var max = 700;
  var xScale = d3.scaleLinear().domain([0, max]).range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => d);

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = function () {
    return xAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxisGrid().tickSize(-chartHeight, 0, 0).tickFormat(""));

  //Render guiding lines
  chartElement
    .append("g")
    .attr("class", "guiding-lines")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("x1", xScale(0))
    .attr("x2", function () {
      return xScale(max);
    })
    .attr("y1", function (d, i) {
      return i * (barHeight + barGap) + barHeight / 2;
    })
    .attr("y2", function (d, i) {
      return i * (barHeight + barGap) + barHeight / 2;
    });

  //Render range arrows to chart.
  LEGEND.forEach(function (d, i) {
    var markerElement = chartElement
      .append("svg:defs")
      .append("svg:marker")
      .attr("id", "marker-" + classify(d.label))
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto");

    switch (d.symbol) {
      case "arrow":
        markerElement
          .attr("refX", function () {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
          .attr("d", "M0,0 L0,6 L6,3 z")
          .attr("fill", colorScale(d.label));
        break;
      case "bar":
        markerElement
          .attr("refX", function () {
            return 4;
          })
          .attr("refY", 4)
          .append("rect")
          .attr("y", 1)
          .attr("x", 4)
          .attr("width", 2)
          .attr("height", 6)
          .attr("fill", colorScale(d.label));
        // .attr("stroke", '#fff');
        break;
      default:
        // dot
        markerElement
          .attr("refX", function () {
            return 4;
          })
          .attr("refY", 4)
          .append("circle")
          .attr("cy", 4)
          .attr("cx", 4)
          .attr("r", 2)
          .attr("fill", colorScale(d.label))
          .attr("stroke", "#fff");
        break;
    }
  });

  var legendPositions = {
    midpoint: chartWidth / 2,
    offset: 50,
    startingOffset: 5,
    labelYOffset: -2,
    startingY: -20,
  };

  if (isMobile.matches) {
    legendPositions.midpoint =
      chartWidth / 2 - margins.left / 2 + margins.right / 2;
  }

  var legend = chartElement.append("g").attr("class", "key");

  legend
    .append("line")
    .attr("class", "legend-bar negative")
    .attr("x1", legendPositions.midpoint - legendPositions.startingOffset)
    .attr("x2", legendPositions.midpoint - legendPositions.offset)
    .attr("y1", legendPositions.startingY)
    .attr("y2", legendPositions.startingY)
    .attr("marker-end", `url(#marker-negative)`)
    .attr("marker-start", `url(#marker-negative2)`);

  legend
    .append("line")
    .attr("class", "legend-bar positive")
    .attr("x1", legendPositions.midpoint + legendPositions.startingOffset)
    .attr("x2", legendPositions.midpoint + legendPositions.offset)
    .attr("y1", legendPositions.startingY)
    .attr("y2", legendPositions.startingY)
    .attr("marker-end", `url(#marker-positive)`)
    .attr("marker-start", `url(#marker-positive2)`);

  legend
    .append("text")
    .attr("class", "legend-text positive")
    .attr("x", legendPositions.midpoint + legendPositions.offset)
    .attr("y", legendPositions.startingY + legendPositions.labelYOffset)
    .attr("dy", 5)
    .attr("dx", 5)
    .text(legendLabel1);

  legend
    .append("text")
    .attr("class", "legend-text negative")
    .attr("x", legendPositions.midpoint - legendPositions.offset)
    .attr("y", legendPositions.startingY + legendPositions.labelYOffset)
    .attr("dy", 5)
    .attr("dx", -10)
    .attr("text-anchor", "end")
    .text(legendLabel2);

  legend
    .append("text")
    .attr("class", "legend-text mid master")
    .attr("x", legendPositions.midpoint)
    .attr("y", legendPositions.startingY - (isMobile.matches ? 50 : 35))
    .attr("dy", 5)
    .attr("dx", 0)
    .attr("text-anchor", "middle")
    .text(legendLabelMaster)
    .call(wrapText, isMobile.matches ? 250 : 350, 13);

  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("x1", function (d) {
      return xScale(d[firstColumn]);
    })
    .attr("x2", function (d) {
      if (
        d[firstColumn] < d[finalColumn] ||
        d[firstColumn] === d[finalColumn]
      ) {
        return xScale(d[finalColumn]);
      } else {
        return xScale(d[finalColumn]) + xScale(1);
      }
    })
    .attr("y1", function (d, i) {
      return i * (barHeight + barGap) + barHeight / 2;
    })
    .attr("y2", function (d, i) {
      return i * (barHeight + barGap) + barHeight / 2;
    })
    .attr("marker-end", d => `url(#marker-${classify(d.diff_status)})`)
    .attr("marker-start", function (d) {
      // if (Math.abs(d.diff) > 1) {
      return `url(#marker-${classify(d.diff_status)}2)`;
      // }
    })
    .attr("stroke", d => colorScale(d.diff_status));

  // Render bar labels.
  chartWrapper
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
    .attr("style", function (d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px",
      });
    })
    .attr("class", function (d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .html(d => d[labelColumn]);

  // Render final alignment bar values
  var value = function (d) {
    var sign = Math.sign(d.diff) == -1 ? "" : "+";
    return `${d.final} (${sign}${d.diff})`;
  };

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("text-anchor", function (d) {
      if (Math.sign(d.diff) == -1) {
        var anchor = "end";
        var sign = -1;
      } else {
        var anchor = "start";
        var sign = 1;
      }
      var x = xScale(d[finalColumn]) + sign * 8;
      return x < 50 ? "start" : anchor;
    })
    .attr("x", function (d) {
      if (Math.sign(d.diff) == -1) {
        var sign = -1;
      } else {
        var sign = 1;
      }
      var x = xScale(d[finalColumn]) + sign * 8;
      return x < 50 && sign === -1 ? xScale(d[firstColumn]) + 8 : x;
    })
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dy", function (d) {
      return barHeight / 2 + 3;
    })
    //.attr("fill", d => colorScale(d.diff_status))
    .attr("fill", "none")
    .attr("stroke-width", 5)
    .attr("stroke", "#fff")
    .attr("class", function (d) {
      return "value-" + classify(d[labelColumn]);
    })
    .text(value)
    .clone()
    .attr("fill", d => colorScale(d.diff_status))
    .attr("stroke", "none")
    .text(value);
};

// Initially load the graphic
window.onload = onWindowLoaded;

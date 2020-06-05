// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;

var { COLORS, makeTranslate, classify, formatStyle, fmtComma } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderBarChart({
    container,
    width,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderBarChart = function(config) {
  // Setup
  var labelColumn = "label";
  var valueColumn = "amt";

  var barHeight = 34;
  var barGap = 19;
  var labelWidth = 112;
  var labelMargin = 6;
  var valueGap = 6;

  var margins = {
    top: 30,
    right: 30,
    bottom: 20,
    left: labelWidth + labelMargin
  };
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

  // Create D3 scale objects.
  var floors = config.data.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max.apply(null, ceilings);

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d) {
      return "$" + d/1000 + "K" ;
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = function() {
    return xAxis;
  };

  // chartElement
  //   .append("g")
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat("")
  //   );

  //Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => d[valueColumn] >= 0 ? xScale(0) : xScale(d[valueColumn]))
    .attr("width", d => Math.abs(xScale(0) - xScale(d[valueColumn])))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("height", barHeight)
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`);

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
    .attr("style", function(d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: (i * (barHeight + barGap) - 4) + "px"
      });
    })
    .attr("class", function(d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .attr("class", 'left-label')
    .html(d => "<b>" + d[labelColumn] + "</b><br>Payment: <span style='display:inline;' class='highlight'>" + d.fullpayment + "</span>");

//   // Render bar values.
//   chartElement
//     .append("g")
//     .attr("class", "value")
//     .selectAll("text")
//     .data(config.data)
//     .enter()
//     .append("text")
//     .text(d => "$" + fmtComma(d[valueColumn]))
//     .attr("x", d => xScale(d[valueColumn]))
//     .attr("y", (d, i) => i * (barHeight + barGap))
//     .attr("dx", function(d) {
//       var xStart = xScale(d[valueColumn]);
//       var textWidth = this.getComputedTextLength();

//       // Negative case
//       if (d[valueColumn] < 0) {
//         var outsideOffset = -(valueGap + textWidth);

//         if (xStart + outsideOffset < 0) {
//           d3.select(this).classed("in", true);
//           return valueGap;
//         } else {
//           d3.select(this).classed("out", true);
//           return outsideOffset;
//         }
//         // Positive case
//       } else {
//         if (xStart + valueGap + textWidth > chartWidth) {
//           d3.select(this).classed("in", true);
//           return -(valueGap + textWidth);
//         } else {
//           d3.select(this).classed("out", true);
//           return valueGap;
//         }
//       }
//     })
//     .attr("dy", barHeight / 2 + 3);

  // add in white bars


  chartElement
    .append("g")
    .attr("class", "white-bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d.cutoff))
    .attr("width", d => Math.abs(xScale(d.cutoff) - xScale(d[valueColumn])))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("height", barHeight)
    .attr("class", (d, i) => `white-bar bar-${i} ${classify(d[labelColumn])}`);


    // add in defs


  var linearGradients = chartElement
    .append("defs")
    .selectAll("linearGradient")
    .data(config.data)
    .enter()
    .append("linearGradient")
      .attr("id", d=>"grad-" + classify(d.label))
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%")
    ;

    linearGradients.append('stop')
      .attr('offset', "0%")
      .attr("style", "stop-color:rgb(23,128,126);stop-opacity:1")

    linearGradients.append('stop')
      .attr('offset', "100%")
      .attr("style", "stop-color:rgb(23,128,126);stop-opacity:0")


   // add in gradient bars
  var linearGradients = chartElement
    .append("g")
    .attr("class", "linear-bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d.cutoff))
    .attr("width", d => Math.abs(xScale(d.end) - xScale(d.cutoff)))
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("height", barHeight)
    .attr("class", (d, i) => `bar-${i} ${classify(d[labelColumn])}`)
    .attr("fill", d=>"url(#grad-" + classify(d.label) + ")")



    // annotation lines


    chartElement.append('line')
      .attr('x1', xScale(75000))
      .attr('x2', xScale(75000))
      .attr('y1', -10)
      .attr('y2', 1 * (barHeight + barGap*.5))
      .attr('class', "anno-line cutoff")

    chartElement.append('line')
      .attr('x1', xScale(99000))
      .attr('x2', xScale(99000))
      .attr('y1', -10)
      .attr('y2', 1 * (barHeight + barGap*.5))
      .attr('class', "anno-line end")

    chartElement.append('line')
      .attr('x1', xScale(150000))
      .attr('x2', xScale(150000))
      .attr('y1', 1 * (barHeight + barGap) - 10)
      .attr('y2', 2 * (barHeight + barGap*.75))
      .attr('class', "anno-line cutoff")

    chartElement.append('line')
      .attr('x1', xScale(198000))
      .attr('x2', xScale(198000))
      .attr('y1', 1 * (barHeight + barGap) - 10)
      .attr('y2', 2 * (barHeight + barGap*.75))
      .attr('class', "anno-line end")


    // annotation text

   chartElement.append('text')
      .attr('x', xScale(75000))
      .attr('y', -16)
      .attr('class', "anno-text cutoff")
      .text("Up to $75K: full payment")

    chartElement.append('text')
      .attr('x', xScale(99000))
      .attr('y', -16)
      .attr('class', "anno-text end")
      .text("$99K+: No payment")


   chartElement.append('text')
      .attr('x', xScale(150000))
      .attr('y', 1 * (barHeight + barGap) - 13)
      .attr('class', "anno-text cutoff joint")
      .text("$150K")

    chartElement.append('text')
      .attr('x', xScale(198000))
      .attr('y', 1 * (barHeight + barGap) - 13)
      .attr('class', "anno-text end joint")
      .text("$198K+")



};

// Initially load the graphic
window.onload = onWindowLoaded;

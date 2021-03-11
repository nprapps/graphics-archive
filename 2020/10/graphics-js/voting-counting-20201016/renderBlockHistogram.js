
var { isMobile } = require("./lib/breakpoints");
var { makeTranslate, classify } = require("./lib/helpers");

var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-axis/dist/d3-axis.min")
};

var COLOR_BINS = [-2, -1, 0, 1, 2];
var TICK_LABELS = ["Before", "2+ Weeks Before", "Less Than 2 Weeks Before", "Election Day", "Election Day"];

// Render a bar chart.
module.exports = function(config) {
  // Setup
  var labelColumn = "usps";
  var valueColumn = "amt";

  var blockHeight = 30;
  if (isMobile.matches) {
    blockHeight = 18;
  }
  var blockGap = 1;

  var margins = {
    top: 20,
    right: 12,
    bottom: 35,
    left: 18
  };

  var ticksY = 4;
  // Determine largest bin

  var largestBin = Math.max.apply(
    null,
    config.data.map(b => b.length)
  );

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (blockHeight + blockGap) * largestBin;

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
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(config.bins.slice(0, -1))
    .range([0, chartWidth])
    .padding(0.1);

  var yScale = d3
    .scaleLinear()
    .domain([0, largestBin])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function(d){
      return d == 1 ? null : TICK_LABELS[d + 3];
    });
    // .tickFormat(d => d > 0 ? "+" + d + "%" : d + "%");

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(xScale.bandwidth()/2, chartHeight))
    .call(xAxis)

    // move and hide tick line
    chartElement
    .selectAll(".tick line")
    .style("display", d => (d == 1)? "none" : "block")

    chartElement
    .selectAll(".tick text")
    .call(wrap, xScale.bandwidth())

    // chartElement
    // .selectAll(".tick")
    // .attr("transform", function(d){
    //   if(d == 0){
    //     return makeTranslate(0, 0)
    //   }
    //   return makeTranslate(0, 0)
    // })

  d3.select(".x.axis .domain").remove();

  // Render grid to chart.
  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );

  function wrap(text, width) {
    text.each(function() {
      var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          y = text.attr("y"),
          dy = parseFloat(text.attr("dy")),
          tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }

  var bandwidth = xScale.bandwidth();
  var shift = -(bandwidth / 2) - (bandwidth * 0.1) / 2;
  var tickShift = function(d, i) {
    console.log(d)
    var existing = this.getAttribute("transform").match(
      /translate\(([^)]+)\)/
    )[1];
    existing = existing.split(",").map(Number);
    existing[0] += (d != 0 ? shift : 2);
    existing[1] += 3;
    return makeTranslate(...existing);
  };

  // Shift tick marks
  chartElement.selectAll(".x.axis .tick")
  .attr("transform", tickShift)

  // var lastTick = chartElement
  //   .select(".x.axis")
  //   .append("g")
  //   .attr("class", "tick")
  //   .attr("transform", function() {
  //     var lastBin = xScale.domain()[xScale.domain().length - 1];

  //     var x = xScale(lastBin) + bandwidth + (bandwidth * 0.1) / 2;
  //     var y = 0;
  //     return makeTranslate(x, y);
  //   });

  // lastTick
  //   .append("line")
  //   .attr("x1", 0)
  //   .attr("x2", 0)
  //   .attr("y1", 0)
  //   .attr("y2", 1);

  // lastTick
  //   .append("text")
  //   .attr("text-anchor", "middle")
  //   .attr("x", 0)
  //   .attr("y", 9)
  //   .attr("dy", "0.71em")
  //   .attr("fill", "currentColor")
  //   .text(function() {
  //     var t = config.bins[config.bins.length - 1];
  //     return t;
  //     if (t > 0) {
  //       return "+" + t + "%";
  //     } else {
  //       return t + "%";
  //     }
  //   });

  // Render bins to chart.
  var bins = chartElement
    .selectAll(".bin")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", (d, i) => "bin bin-" + i)
    .attr("transform", (d, i) => makeTranslate(xScale(COLOR_BINS[i]), 0));

  bins
    .selectAll("rect")
    .data(function(d, i) {
      // add the bin index to each row of data so we can assign the right color
      var formattedData = [];
      Object.keys(d).forEach(function(k) {
        var v = d[k];
        formattedData.push({ key: k, value: v, parentIndex: i });
      });
      return formattedData;
    })
    .enter()
    .append("rect")
    .attr("width", xScale.bandwidth())
    .attr("x", 0)
    .attr("y", (d, i) => chartHeight - (blockHeight + blockGap) * (i + 1))
    .attr("height", blockHeight)
    .attr("fill", d => config.colors[d.parentIndex])
    .attr("class", d => classify(d.value));

  // Render bin values.
  bins
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(function(d) {
      return Object.keys(d).map(key => ({ key, value: d[key] }));
    })
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", (d, i) => chartHeight - (blockHeight + blockGap) * (i + 1))
    .attr("dy", blockHeight / 2 + 4)
    .text(d => d.value);

  // Render annotations
  var annotations = chartElement.append("g").attr("class", "annotations");

  console.log(LABELS)
  annotations
    .append("text")
    .attr("class", "label-top")
    .attr("x", xScale(0))
    .attr("dx", -18)
    .attr("text-anchor", "end")
    .attr("y", -10)
    .html(LABELS.annotation_left_process);

  // annotations
  //   .append("text")
  //   .attr("class", "label-top")
  //   .attr("x", xScale(0))
  //   .attr("dx", 5)
  //   .attr("text-anchor", "begin")
  //   .attr("y", -10)
  //   .html(LABELS.annotation_right_process);

  annotations
    .append("line")
    .attr("class", "axis-0")
    .attr("x1", xScale(0) - (xScale.bandwidth() * 0.1) / 2)
    .attr("y1", -margins.top)
    .attr("x2", xScale(0) - (xScale.bandwidth() * 0.1) / 2)
    .attr("y2", chartHeight);
};
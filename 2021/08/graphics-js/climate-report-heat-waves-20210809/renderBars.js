var { isMobile } = require("./lib/breakpoints");

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
};

// Render a bar chart.
var renderBarChart = function (config) {
  // Setup
  var { labelColumn, valueColumn } = config;

  var barHeight = 40;
  var barGap = 5;
  var labelWidth = 75;
  var labelMargin = 6;
  var valueGap = 6;

  var margins = {
    top: 0,
    right: 70,
    bottom: 20,
    left: labelWidth + labelMargin,
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

   var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .append("li")
    .attr("class", d => "key-item heat-wave");

  legend
    .append("b")
    .style("background-color", COLORS.orange3)
    .attr("class", d => "sq-heat-wave");

  legend.append("label").text('Extreme heat wave event');

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



  var min = 0;

  var ceilings = config.data
    .filter(d => d.upper)
    .map(d => Math.ceil(d.upper / roundTicksFactor) * roundTicksFactor);

  var max = Math.max.apply(null, ceilings);

  var xScale = d3.scaleLinear().domain([min, max]).range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function (d) {
      return d.toFixed(0) + " times";
    });

  // Render axes to chart.
  // chartElement
  //   .append("g")
  //   .attr("class", "x axis")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(xAxis);

  // Render grid to chart.
  // chartElement
  //   .append("g")
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));

  //Render bars to chart.
  var divisor = isMobile.matches ? 25 : 50;
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("g")
    .attr( 
      "transform",
      (d, i) => `translate(0, ${i * (barHeight + barGap) + barGap * 3})`
    )
    .selectAll("rect")
    .data(function (d, i) {
      if (!d.amt) return [];
      var arr = new Array(50);
      return arr;
    })
    .enter()
    .append("rect")
    .attr("x", function (d, i) {
      return ((i % divisor) * chartWidth) / divisor;
    })
    .attr("width", chartWidth / divisor)
    .attr("y", (d, i) => (Math.floor(i / divisor) * chartWidth) / divisor)
    .attr("height", chartWidth / divisor)
    .attr("class", (d, i) => `bar-${i} backdrop`);
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("g")
    .attr(
      "transform",
      (d, i) => `translate(0, ${i * (barHeight + barGap) + barGap * 3})`
    )
    .selectAll("rect")
    .data(function (d, i) {
      if (!d.amt) return [];
      var arr = new Array(50);
      var amt = d.amt;
      for (var i = 0; i < d.amt - 1; i++) {
        // var temp = i % (Math.ceil((d.amt -1)/2 )) + (25 * Math.floor(i/((d.amt - 1) /2)));
        // console.log(temp)
        arr[i] = { index: i, amt: 1 };
        amt -= 1;
      }
      arr[i] = { index: i, amt: Math.abs(amt) };
      console.log(arr);
      return arr;
    })
    .enter()
    .append("rect")
    .attr("x", function (d, i) {
      return ((i % divisor) * chartWidth) / divisor;
    })
    .attr("width", d =>
      d ? (chartWidth / divisor) * d.amt : chartWidth / divisor
    )
    .attr("y", (d, i) => (Math.floor(i / divisor) * chartWidth) / divisor)
    .attr("height", chartWidth / divisor)
    .attr("class", (d, i) => `bar-${i} index-${classify(d)}`);

  // chartElement
  //   .append("g")
  //   .attr("class", "bars")
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //   .append("g")
  //   .attr("transform", (d, i) => `translate(0, ${i * (barHeight + barGap) + barGap})`)
  //   .selectAll("rect")
  //   .data(function(d, i) {
  //     if (!d.amt) return [];
  //     var arr = new Array(25);
  //     var amt = d.amt;
  //     for (var i = d.amt/2; i < d.amt - 1; i++) {
  //       arr[i] = {'index': i, 'amt': 1 };
  //       amt -= 1;
  //     }
  //     // arr[i] =  {'index': i, 'amt': Math.abs(amt) };
  //     return arr;
  //   })
  //   .enter()
  //   .append("rect")
  //   .attr("x", function(d, i) {
  //     return (i % 25) * chartWidth/25;
  //   })
  //   .attr("width", d => d ? chartWidth/25 * d.amt : chartWidth/25)
  //   .attr("y", (d, i) => 2 * chartWidth/25)
  //   .attr("height", chartWidth/25)
  //   .attr("class", (d, i) => `bar-${i} index-${classify(d)}`);

  // // Render MOE sections
  // chartElement
  //   .append("g")
  //   .attr("class", "moe-bars")
  //   .selectAll("rect")
  //   .data(config.data)
  //   .enter()
  //   .append("rect")
  //   .attr("x", d => d.lower ? xScale(d.lower) : 0)
  //   .attr("width", d => d.amt ? xScale(d.amt - d.lower) : 0)
  //   .attr("y", (d, i) => i * (barHeight + barGap))
  //   .attr("height", barHeight)
  //   .attr("class", (d, i) => `bar-${i} moe inner ${classify(d.label)}`);

  // chartElement
  //   .append("g")
  //   .attr("class", "moe-bars")
  //   .selectAll("rect")
  //   .data(config.data)
  //   .enter()
  //   .append("rect")
  //   .attr("x", d => d.amt ? xScale(d.amt) : 0 )
  //   .attr("width", d => d.amt ? xScale(d.upper - d.amt) : 0 )
  //   .attr("y", (d, i) => i * (barHeight + barGap))
  //   .attr("height", barHeight)
  //   .attr("class", (d, i) => `bar-${i} moe outer`);

  if (false)
    chartElement
      .append("g")
      .attr("class", "moe-lines")
      .selectAll("line")
      .data(config.data)
      .enter()
      .append("line")
      .attr("x1", d => xScale(d.amt))
      .attr("x2", d => xScale(d.amt))
      .attr("y1", (d, i) => i * (barHeight + barGap))
      .attr("y2", (d, i) => i * (barHeight + barGap) + barHeight)
      .attr("class", (d, i) => `line-${i} moe ${classify(d.label)}`);

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
        left: "0",
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", function (d, i) {
      var lWidth = labelWidth;
      var margin = 0;
      if (!d.amt) lWidth = chartWidth + margins.right + labelWidth;
      // if (!d.amt) margin = labelWidth;
      return formatStyle({
        width: lWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px",
        // 'margin-left': margin + "px",
        "text-align": d.amt ? "right" : "left",
      });
    })
    .attr("class", function (d) {
      return classify(d.label);
    })
    .append("span")
    .html(d => d.label);

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("text-anchor", "end")
    .text(function (d) {
      if (d.amt == 1) return '1 time'
      return d.amt ? Number(d.amt).toFixed(1) + " times" : "";
    })
    .attr("x", d => chartWidth + margins.right - 5)
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dy", barHeight / 2 + 3);
};

module.exports = renderBarChart;

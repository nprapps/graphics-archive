var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText, fmtComma, getAPMonth } = require("./lib/helpers");
var { monthDay, yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");
var { inDays } = require("./util");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn, avgColumn } = config;
  var chartData = config.data.filter(function(d, i) {
    return i > (config.data.length - config.daysShown - 1);
  });

  var margins = {
    top: 10,
    right: 15,
    bottom: 20,
    left: 40
  };

  if (config.container.indexOf("deaths") > -1) {
    margins.left = 45;
  }


  var ticksX = 10;
  var ticksY = 4;


  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;

  var chartHeight = 100;
  var Avgoffset = 0;


  if (document.getElementById("topline").classList.value.includes("promo")) {
    var chartHeight = 300;
    var Avgoffset = -40;

  }

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = chartData.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = chartData.map(d => d[valueColumn]);

  // var floors = values.map(
  //   v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  // );
  // var min = Math.min.apply(null, floors);

  // if (min > 0) {
  //   min = 0;
  // }
  var min = 0;

  // var ceilings = values.map(
  //   v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  // );
  // var max = Math.max.apply(null, ceilings);
  var max = Math.max.apply(null, values);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

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

  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      // if (isMobile.matches) {
        // return "\u2019" + yearAbbrev(d);
      // } else {
        return getAPMonth(d);
      // }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      console.log(config)
      if (config.container.indexOf("deaths") > -1) {
        return fmtComma(d)
      }
      return d/1000 + "K"
    });;

  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );


  // render area to chart
  var areaData = [ chartData ]; // new tests
  var area = d3.area()
    .defined(function(d) {
      return d[dateColumn] != null && !isNaN(d[valueColumn]);
    })
    .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y0(chartHeight)
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "area")
    .selectAll("path")
    .data(areaData)
    .enter()
      .append("path")
      .attr("d", d => area(d));

  // Render lines to chart.
  var lineData = [ chartData ]; // rolling average
  var line = d3
    .line()
    // .curve(d3.curveStepBefore)
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[avgColumn]));


  var anomalyData = chartData.filter(function(d) {
    return config.specialDates.includes(inDays(d.reported))
        || config.specialDates.includes(inDays(d.reported) + 1)
        || config.specialDates.includes(inDays(d.reported) - 1);
  }).map(function(d) {
    var n = Object.assign({}, d);
    if (!config.specialDates.includes(inDays(d.reported))) {
      n[valueColumn] = 0;
    }
    return n;
  });

  // Color dates with notable issues yellow
  chartElement
    .append("g")
    .attr("class", "special-area")
    .selectAll("path")
    .data([anomalyData])
    .enter()
      .append("path")
      .attr("d", d => area(d));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(lineData)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    // .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d));


  var annotations = chartElement.append("g").attr("class", "annotations");

  // [ 0, (chartData.length - 1) ].forEach((item, i) => {
  //   // annotations.append("circle")
  //   //   .attr("class", "circle-" + i)
  //   //   .attr("r", 3)
  //   //   .attr("cx", xScale(chartData[item][dateColumn]))
  //   //   .attr("cy", yScale(chartData[item][valueColumn]));
  //   annotations.append("text")
  //     .text(function() {
  //       var specialChar = '';
  //       if (config.specialDates.includes(inDays(chartData[item].reported))) {
  //         specialChar = '*'
  //       }
  //       return monthDay(chartData[item][dateColumn]) + specialChar + " +" + fmtComma(chartData[item][valueColumn])
  //     })
  //     .attr("class", "value-" + i)
  //     .attr("x", xScale(chartData[item][dateColumn]))
  //     .attr("y", chartHeight)
  //     .attr("dx", i == 0 ? -8 : 8)
  //     .attr("dy", -13)
  //     .call(wrapText, margins.right, 11);
  // });
  annotations.append("text")
    .attr("class", "avg")
    .text("7-day avg.")
    .attr("x", xScale(chartData[Math.round((config.daysShown - 1) / 2)][dateColumn]))
    .attr("y", yScale(chartData[Math.round((config.daysShown - 1) / 2)][avgColumn]))
    .attr("dy", 16)
    .attr("dx",Avgoffset)

  // If current date is a special case, add asterisks to overall stats
  if (config.specialDates.includes(inDays(chartData[chartData.length - 1].reported))) {
    var item = d3.select('.' + config.item + '.latest').select('h4');
    item.text(item.text().replace('*', '') + '*')
  }
};

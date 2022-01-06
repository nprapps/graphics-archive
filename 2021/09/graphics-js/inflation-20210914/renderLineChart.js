var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { monthYear, yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 1.2;
  var aspectHeight = 1;

  var margins = {
    top: 5,
    right: 75,
    bottom: 20,
    left: 30
  };

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 1;

  var labelLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    // margins.right = 30;
    // labelLineHeight = 11;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  // var chartHeight =
  //   Math.ceil((config.width * aspectHeight) / aspectWidth) -
  //   margins.top -
  //   margins.bottom;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  if (config.title) {
    containerElement.append("h3")
      .text(config.title);
  }

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.data.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min.apply(null, floors);
  if (min > 0) {
    min = 0;
  }

  if (config.yDomain) {
    min = config.yDomain[0];
  }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  if (config.yDomain) {
    max = config.yDomain[1];
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // var colorScale = d3
  //   .scaleOrdinal()
  //   .domain(
  //     config.data.map(function(d) {
  //       return d.name;
  //     })
  //   )
  //   .range([
  //     COLORS.red3,
  //     COLORS.yellow3,
  //     COLORS.blue3,
  //     COLORS.orange3,
  //     COLORS.teal3
  //   ]);

  // Render the HTML legend.

  // var oneLine = config.data.length > 1 ? "" : " one-line";
  //
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key" + oneLine)
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d.name));
  //
  // legend.append("b").style("background-color", d => colorScale(d.name));
  //
  // legend.append("label").text(d => d.name);

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
      if (isMobile.matches) {
        return "\u2019" + yearAbbrev(d);
      } else {
        return yearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d + "%");

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

  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

  /*
   * Recession bars
   */
  if (config.recession_dates) {
    var recession = chartElement.insert('g','*')
      .attr('class', 'recession')
      .selectAll('rect')
      .data(config.recession_dates)
      .enter()
        .append('rect')
        .attr('x', d => xScale(d['begin']))
        .attr('width', d => xScale(d['end']) - xScale(d['begin']))
        .attr('y', 0)
        .attr('height', chartHeight);
  }

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

  // Render lines to chart.
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    // .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 8)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var suffix = "";
      if (config.idx == 0) {
        suffix = "vs. last month";
      } else if (config.idx == 1) {
        suffix = "vs. this time last year";
      }

      var label = monthYear(item[dateColumn]) + ": +" + value.toFixed(1) + "% " + suffix;

      return label;
    })
    .call(wrapText, margins.right - 8, labelLineHeight);

  if (config.idx == 0) {
    chartElement.append('text')
      .classed('chart-label', true)
      .attr('x', function(){
        var dates = config.recession_dates[config.recession_dates.length - 1];
        return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
      })
      .attr('y', 20)
      .text('Recession');
  }
};

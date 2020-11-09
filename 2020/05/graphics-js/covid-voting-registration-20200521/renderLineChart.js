var d3 = {
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-shape/dist/d3-shape.min'),
  ...require('d3-interpolate/dist/d3-interpolate.min'),
};

var {
  COLORS,
  classify,
  makeTranslate,
  getAPMonth,
  fmtComma,
} = require('./lib/helpers');
var { yearFull, yearAbbrev } = require('./lib/helpers/formatDate');
var { isMobile } = require('./lib/breakpoints');

var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ', ' + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + ' ' + fmtDayYear(d).trim();
var fmtMonthDay = d => getAPMonth(d) + ' ' + d.getDate();

// Render a line chart.
module.exports = function (config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 65,
    bottom: 20,
    left: 60,
  };

  var ticksX = 6;
  var ticksY = 6;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 45;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html('');

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3.scaleTime().domain(extent).range([0, chartWidth]);

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

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  var yScale = d3.scaleLinear().domain([min, max]).range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function (d) {
        return d.name;
      })
    )
    .range([
      '#ddd',
      COLORS.teal3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3,
    ]);

  // Render the HTML legend.

  var legend = containerElement
    .append('ul')
    .attr('class', 'key')
    .selectAll('g')
    .data(config.data)
    .enter()
    .append('li')
    .attr('class', d => 'key-item ' + classify(d.name));

  legend.append('b').style('background-color', d => colorScale(d.name));

  legend.append('label').text(d => d.name);

  // Create the root SVG element.

  var chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
    .attr('transform', `translate(${margins.left},${margins.top})`);

  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function (d, i) {
      return getAPMonth(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function (d, i) {
      if (d == 0) {
        return d;
      }
      return d / 1000000 + ' million';
    });

  // Render axes to chart.

  chartElement
    .append('g')
    .attr('class', 'x axis')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement.append('g').attr('class', 'y axis').call(yAxis);

  // Render grid to chart.

  var xAxisGrid = function () {
    return xAxis;
  };

  var yAxisGrid = function () {
    return yAxis;
  };

  chartElement
    .append('g')
    .attr('class', 'x grid')
    .attr('transform', makeTranslate(0, chartHeight))
    .call(xAxisGrid().tickSize(-chartHeight, 0, 0).tickFormat(''));

  chartElement
    .append('g')
    .attr('class', 'y grid')
    .call(yAxisGrid().tickSize(-chartWidth, 0, 0).tickFormat(''));

  // Render 0 value line.

  if (min < 0) {
    chartElement
      .append('line')
      .attr('class', 'zero-line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0));
  }

  // Render lines to chart.
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append('g')
    .attr('class', 'lines')
    .selectAll('path')
    .data(config.data)
    .enter()
    .append('path')
    .attr('class', d => 'line ' + classify(d.name))
    .attr('stroke', d => colorScale(d.name))
    .attr('d', d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  var annotationData = [
    { name: config.data[0].name, ...lastItem(config.data[0]) },
    { name: config.data[1].name, ...lastItem(config.data[1]) },
    { name: config.data[0].name, ...config.data[0].values[8] },
  ];

  chartElement
    .selectAll('circle')
    .data(annotationData)
    .enter()
    .append('circle')
    .attr('class', 'dots')
    .attr('cx', d => xScale(d[dateColumn]))
    .attr('cy', d => yScale(d[valueColumn]))
    .attr('fill', d => colorScale(d.name))
    .attr('r', 3);

  chartElement
    .append('g')
    .attr('class', 'value')
    .selectAll('text')
    .data(annotationData)
    .enter()
    .append('text')
    .attr('x', function (d) {
      console.log(d)
      var x = xScale(d[dateColumn]);
      if (d.name == '2019 - 2020') {
        return x - 30;
      }
      return x;
    })
    .attr(
      'y',
      d =>
        yScale(d[valueColumn]) + (d.name == '2019 - 2020' ? -12 : 15)
    )
    .text(function (d) {
      var item = d;
      var value = item[valueColumn];
      var label = fmtComma(value);
      return label;
    });
};

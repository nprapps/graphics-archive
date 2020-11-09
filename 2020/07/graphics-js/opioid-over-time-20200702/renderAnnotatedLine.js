/*
 * Render a line chart.
 */

var {
  COLORS,
  classify,
  makeTranslate,
  wrapText
} = require("./lib/helpers");

var { isMobile } = require("./lib/breakpoints");

var { yearAbbrev, yearFull, dayYear, dateFull } = require("./lib/helpers/formatDate");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

module.exports = function(config) {
  /*
   * Setup
   */
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 5,
    right: 20,
    bottom: 40,
    left: 56
  };

  var ticksX = 8;
  var ticksY = 10;
  var roundTicksFactor = 5;

  var annotationXOffset = 10;
  var annotationYOffset = -8;
  var annotationWidth = 80;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 5;
    ticksY = 5;
    margins.right = 40;
    margins.left = 30;
    annotationXOffset = 5;
    annotationYOffset = 0;
    annotationWidth = 72;
    annotationLineHeight = 12;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  /*
   * Create D3 scale objects.
   */
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

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = 850;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      return yearFull(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i) {
      if (d == 0) {
        return 0
      }

      return isMobile.matches ? d : d + ' MME';
    });

  /*
   * Render axes to chart.
   */
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  /*
   * Render grid to chart.
   */

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxis
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxis
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

    // chartElement.append("text").attr("class", "axis-label").attr("y", chartHeight + 40)
    //   .attr("x", chartWidth/2)
    // .text(function(d) {
    //   return "Year";
    // });

    // chartElement.append("text").attr("class", "axis-label").attr("transform", 'translate(-50,' + (chartHeight/2) + ")rotate(-90)")
    // .style("text-anchor", "middle")
    // .text(function(d) {
    //   return 'MME ';
    // })

  /*
   * Render 0 value line.
   */
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  // var order_dates = [
  //   {
  //     begin: new Date(2014, 1, 1),
  //     text: '2014: American Medical Association forms opioid task force',
  //     top: isMobile.matches ? 120 : 210,
  //     left: isMobile.matches ? 105 : 200
  //   },
  //   {
  //     begin: new Date(2017, 1, 1),
  //     text: '2017: President Trump declares opioids a public health emergency',
  //     top: isMobile.matches ? 190 : 290,
  //     left: isMobile.matches ? 105 : 200
  //   }
  // ];

  //   // order line
  // var order = chartElement
  //   .append('g')
  //   .attr('class', 'order')
  //   .selectAll('line')
  //   .data(order_dates)
  //   .enter();

  // order.append('line')
  //     .attr("x1", d => xScale(d['begin']) -2 )
  //     .attr("x2", d => xScale(d['begin']) -2 )
  //     .attr("y1", chartHeight)
  //     .attr("y2", d => yScale(d['value']))
  //     .attr('class', 'median-line')

  // order
  //   .append('text')
  //   .classed('chart-label', true)
  //   .attr('x', function (d) {
  //     return xScale(d['begin']) - d['left'];
  //   })
  //   .attr('y', function(d) {
  //     return d['top'];
  //   })
  //   .html(d => d.text)
  //   .call(wrapText, isMobile.matches ? 90 : 200, annotationLineHeight);

  /*
   * Render lines to chart.
   */
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
    .attr("class", function(d, i) {
      return "line " + classify(d.name);
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));



  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", function(d, i) {
      var last = d.values[d.values.length - 1];
      console.log(last[dateColumn])
      return xScale(last[dateColumn]) + 5;
    })
    .attr("y", function(d) {
      var last = d.values[d.values.length - 1];
      return yScale(last[valueColumn]) + 3;
    });

  var xMultiplier = isMobile.matches ? 1 : 1.5;
  var yMultiplier = isMobile.matches ? 1 : 3;

  /*
   * Render annotations.
   */
  var annotation = chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();

  annotation
    .append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", 3);

  annotation
    .append("text")
    .attr("class", "bold-text")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : yearFull(d[dateColumn]);
      var value = d[valueColumn].toFixed(0);
      return text + ": ";
    })
    .attr("x", d => xScale(d[dateColumn]) + (d.xOffset * xMultiplier) + annotationXOffset)
    .attr("y", d => yScale(d[valueColumn]) + (d.yOffset * yMultiplier) + annotationYOffset)
    .call(wrapText, annotationWidth, annotationLineHeight);

  annotation
    .append("text")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text = hasCustomLabel ? d.label : yearFull(d[dateColumn]);
      var value = d[valueColumn].toFixed(0);
      return value;
    })
    .attr("x", d => xScale(d[dateColumn]) + (d.xOffset * xMultiplier) + annotationXOffset + 30* (Math.max(1, xMultiplier/1.25)))
    .attr("y", d => yScale(d[valueColumn]) + (d.yOffset * yMultiplier) + annotationYOffset)
    .call(wrapText, annotationWidth, annotationLineHeight);
};

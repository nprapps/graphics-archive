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

  console.log("in redraw")

  /*
   * Setup
   */
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;

  var margins = {
    top: 20,
    right: ((config.number == 1 || isMobile.matches) ? 70 : 25),
    bottom: 20,
    left: ((config.number == 1 || isMobile.matches) ? 35 : 0)
  };

  var ticksX = 8;
  var ticksY = 5;
  var roundTicksFactor = 10;

  var annotationXOffset = -7;
  var annotationYOffset = -15;
  var annotationWidth = 80;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
    ticksX = 8;
    ticksY = 5;
    margins.right = 25;
    annotationXOffset = -6;
    annotationYOffset = -20;
    annotationWidth = 72;
    annotationLineHeight = 12;
  }

  // Calculate actual chart dimensions
  var chartWidth = (config.width - margins.left - margins.right)/(isMobile.matches ? 1 : 2);
  var chartHeight = (
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom) * (isMobile.matches ? 1 : .75);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  if (config.number == 1) {
    containerElement.html("");
  }
  

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
  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      '#d61f21',
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

  chartWrapper.append('h3').text(config.chart);

  var legendData = [{label: '% of votes won by ' + config.chart, color: '#999'}];
  if (config.number == 1) {
    legendData.push({label: '% of House seats filled by Republicans', color: '#d61f21'} )
  } else {
    legendData.push({label: '% of House seats filled by Democrats', color: '#237bbd'})
  }
  var legend = chartWrapper
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(legendData)
    .enter()
    .append("li")
    .attr("class", d => "key-item " + d.color);

  legend.append("b").style("background-color", d => d.color);

  legend.append("label").text(d => d.label);

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
      if (yearFull(d) == 1998 || (yearFull(d) % 4)) return;
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
    .tickFormat(d => d == 0 ? d : d + '%');

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
        .tickSize(-chartWidth - ((config.number == 1 && !isMobile.matches) ? 200 : 0), 0, 0)
        .tickFormat("")
    );

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

  var dates = chartElement
    .append('g')
    .attr('class', 'date-annotations')
    .selectAll('line')
    .data(config.chart == "Republicans" ? window.ANNOTATIONS : window.ANNOTATIONS_DEMS)
    .enter();
  // order line
  dates
    .append('line')
    .attr('x1', d => xScale(new Date(d['year'], 0, 1)))
    .attr('x2', d => xScale(new Date(d['year'], 0, 1)))
    .attr('y1', d => yScale(d.value + 3))
    .attr('y2', d => yScale(d.y_start))
    .attr('class', 'median-line');

  dates
    .append('text')
    .classed('chart-label', true)
    .attr('x', function (d) {
      return xScale(new Date(d.year, 0, 1));
    })
    .attr('y', d => yScale(d.value))
    .attr('text-anchor', d => d.anchor)
    .html(d => d.text)
    .call(wrapText, isMobile.matches ? 160 : 200, annotationLineHeight);

  /*
   * Render lines to chart.
   */
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", function(d, i) {
      var last = d.values[d.values.length - 1];
      return xScale(last[dateColumn]) + 5;
    })
    .attr("y", function(d) {
      var last = d.values[d.values.length - 1];
      return yScale(last[valueColumn]) + 3;
    });

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
    .attr("fill", d => '#999')
    .attr("r", 5);

  annotation
    .append("line")
    .attr("class", "anno-lines")
    .attr("x1", d => xScale(d[dateColumn]))
    .attr("x2", d => xScale(d[dateColumn]))
    .attr("y1", d => yScale(d[valueColumn]))
    .attr("y2", d => yScale(d.lineAmt))
    .attr("stroke", d => '#999')
    .attr("stroke-width", .5);

  // annotation
  //   .append("text")
  //   .html(function(d, i) {
  //     var hasCustomLabel = d.label != null && d.label.length > 0;
  //     var text = '';//hasCustomLabel  ? d.label : "Vote:";
      
  //     var value = d[valueColumn].toFixed(0);
  //     // if (i == config.annotations.length - 1) return text + " " + value + '%';
  //     return value;
  //   })
  //   .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annotationXOffset)
  //   .attr("y", d => yScale(d[valueColumn]) + d.yOffset + annotationYOffset)
  //   .attr("fill", "#999")
  //   .call(wrapText, annotationWidth, annotationLineHeight);

  annotation
    .append("text")
    .html(function(d, i) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var text =  ''// : "Seats:"; //hasCustomLabel  ?
      
      var value = d.lineAmt.toFixed(0);
      // if (i == config.annotations.length - 1) return text + " " + value + '%';
      return value;
    })
    .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annotationXOffset)
    .attr("y", d => yScale(d.lineAmt) + d.yLineOffset + annotationYOffset)
    .attr("fill", config.color)
    .call(wrapText, annotationWidth, annotationLineHeight);

    var annos = config.annotations
    var annoData = {color: '#999', values: annos}

    chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data([annoData])
    .enter()
    .append("path")
    .attr("class", function(d, i) {
      return "line votes";
    })
    .attr("stroke", d => d.color)
    .attr("d", d => line(d.values))
    .attr("stroke-width", .5);

    chartElement
    .append("g")
    .attr("class", "year-circles")
    .selectAll("circle")
    .data(config.data[0].values.filter(d => d.amt))
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => config.color)
    .attr("r", 5);

    if (config.number == 2 && !isMobile.matches) {
    chartElement
      .append("g")
      .append("rect")
      .attr("class", "midsection")
      .attr("x", xScale(new Date(1998, 6, 1)))
      .attr("y", 0)
      .attr("width", 4)
      .attr("height", chartHeight + 10);
    }
  
};

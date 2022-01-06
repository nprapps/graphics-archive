var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

var recession_dates = [
    { 'begin': new Date(1950, 0, 1),'end': new Date(2014, 0, 1)  }
];

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 115,
    bottom: 20,
    left: 35
  };

  var ticksX = 10;
  var ticksY = 8;
  var roundTicksFactor = 1;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 40;
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

  var dates = config.data[0].values.map(d => d[dateColumn]);
  dates.push(new Date(2100, 0, 1));
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
  var min = -1;

  if (min > 0) {
    min = 0;
  }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = 9;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      '#666',
      COLORS.teal3,
      COLORS.orange3,
      COLORS.red3,
      // COLORS.orange3,
      // COLORS.teal3
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  var legend = containerElement
    .append("ul")
    .attr("class", "key" + oneLine)
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d.name));

  legend.append("b").style("background-color", d => colorScale(d.name));

  legend.append("label").text(d => d.name);

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
        return yearFull(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat( d => (d == 0 ? d : ((d > 0 ? '+' : '') + d + '°F')));

  /*
   * Recession bars
   */
  var recession = chartElement.insert('g','*')
    .attr('class', 'recession')
    .selectAll('rect')
    .data(recession_dates)
    .enter()
      .append('rect')
      .attr('x', d => xScale(d['begin']))
      .attr('width', d => xScale(d['end']) - xScale(d['begin']))
      .attr('y', 0)
      .attr('height', chartHeight);

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

  // add the area
  var areaGen = d3
    .area()
    // .curve(d3.curveMonotoneY)
    .x(function (d) {
      return xScale(d[dateColumn]);
    })
    .y0(function (d, i) {
      return yScale(Number(config.margins[0].values[i][valueColumn]));
    })
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data([config.margins[1]])
    .enter()
    .append("path")
    .attr("fill", "rgba(23, 128, 126, .2)")
    .attr("d", d => areaGen(d.values.filter(d => d[valueColumn])));

  // add the area
  areaGen = d3
    .area()
    // .curve(d3.curveMonotoneY)
    .x(function (d) {
      return xScale(d[dateColumn]);
    })
    .y0(function (d, i) {
      return yScale(Number(config.margins[2].values[i][valueColumn]));
    })
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data([config.margins[3]])
    .enter()
    .append("path")
    .attr("fill", "rgba(227, 141, 44, .2)")
    .attr("d", d => areaGen(d.values.filter(d => d[valueColumn])));

  areaGen = d3
    .area()
    // .curve(d3.curveMonotoneY)
    .x(function (d) {
      return xScale(d[dateColumn]);
    })
    .y0(function (d, i) {
      return yScale(Number(config.margins[4].values[i][valueColumn]));
    })
    .y1(d => yScale(d[valueColumn]));

console.log(config.margins)
  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data([config.margins[5]])
    .enter()
    .append("path")
    .attr("fill", "rgba(216, 71, 43, .2)")
    .attr("d", d => areaGen(d.values.filter(d => d[valueColumn])));

  areaGen = d3
    .area()
    // .curve(d3.curveMonotoneY)
    .x(function (d) {
      return xScale(d[dateColumn]);
    })
    .y0(function (d, i) {
      return yScale(Number(config.historic[0].values[i][valueColumn]));
    })
    .y1(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data([config.historic[1]])
    .enter()
    .append("path")
    .attr("fill", "rgba(102, 102, 102, .2)")
    .attr("d", d => areaGen(d.values.filter(d => d[valueColumn])));

  var lastItem = d => d.values[d.values.length - 1];

  // Render lines to chart.
  var line = d3
    .line()
    .defined(function(d) { return d[valueColumn]; })
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
    .attr("stroke", d => colorScale(d.name))
    .attr("d", function(d) {
      return line(d.values.filter(v => v[valueColumn] && v[valueColumn] != 'x'))
    });


  //   var line = d3
  //   .line()
  //   .x(d => xScale(d[dateColumn]))
  //   .y(d => yScale(d[valueColumn]));

  // chartElement
  //   .append("g")
  //   .attr("class", "lines")
  //   .selectAll("path")
  //   .data(config.data)
  //   .enter()
  //   .append("path")
  //   .attr("class", d => "line " + classify(d.name))
  //   .attr("stroke", d => colorScale(d.name))
  //   .attr("d", d => line(d.values.filter(v => v[valueColumn])));

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data.slice(1, config.data.length))
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .attr("fill", d => colorScale(d.name))
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = '+' + value.toFixed(1);

      if (!isMobile.matches) {
        label = d.name + ": "  + label;
      }

      return  label + '°F';
    }).call(wrapText, 110, 14);

    chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = recession_dates[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', 20)
    .attr("text-anchor", "middle")
    .text('Historical data')
    .call(wrapText, 105, 14);

    chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', xScale(new Date(2050, 0, 1)))
    .attr('y', 20)
    .attr("text-anchor", "middle")
    .text('Projections')
    .call(wrapText, 105, 14);

    chartElement
    .append("g")
    .attr("class", "end-circles")
    .selectAll("circle")
    .data(config.data.slice(1, config.data.length))
    .enter()
    .append("circle")
    .attr("class", d => "circle " + classify(d.name))
    .attr("fill", d => colorScale(d.name))
    .attr("cx", function (d) {
      return xScale(lastItem(d)[dateColumn]);
    })
    .attr("cy", d => yScale(lastItem(d)[valueColumn]))
    .attr("r", 3);

    chartElement
    .append("g")
    .attr("class", "end-circles")
    .append("circle")
    .attr("fill", '#666')
    .attr("cx", function (d) {
      return xScale(new Date(2099, 11, 1));
    })
    .attr("cy", d => yScale(5.45))
    .attr("r", 3);

    chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', xScale(new Date(2070, 0, 1)))
    .attr('y', yScale(7))
    .attr("text-anchor", "end")
    .text('Margin of error');

    chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("fill", '#666')
    .attr("x", function (d) {
      return xScale(new Date(2099, 11, 1))  + 5;
    })
    .attr("y", d => isMobile.matches ? yScale(5.4) : yScale(5.6))
    .text(isMobile.matches ? "5.4°F" : "Current policies: 5.4°F")
    .call(wrapText, 110, 14);

    //Warming Under Current Policies


    chartElement.append('line')
    .classed('chart-line', true)
    .attr('x1', xScale(new Date(2071, 0, 1)))
    .attr('x2', xScale(new Date(2080, 6, 1)))
    .attr('y1', yScale(7.05))
    .attr('y2', yScale(7.05));
};
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var shelter_dates = [
    { 'begin': '2020-03-17', 'end': '2020-05-08' }
];

shelter_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
  });

var { COLORS, classify, makeTranslate, getAPMonth } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ", " + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + " " + fmtDayYear(d).trim();
var fmtMonthDay = d => getAPMonth(d) + " " + d.getDate();

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 100,
    bottom: 20,
    left: 35
  };

  var ticksX = 5;
  var ticksY = 10;
  var roundTicksFactor = 5;

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
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.orange3,
      COLORS.teal3,
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3
    ]);

  // Render the HTML legend.

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
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
      if (isMobile.matches) {
        return fmtMonthDay(d);
      } else {
        return fmtMonthDay(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i) {
      return d + "%";
    });

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
   * Shelter bars
   */
  var shelter = chartElement.insert('g','*')
    .attr('class', 'shelter')
    .selectAll('rect')
    .data(shelter_dates)
    .enter()
      .append('rect')
      .attr('x', d => xScale(d['begin']))
      .attr('width', d => xScale(d['end']) - xScale(d['begin']))
      .attr('y', 0)
      .attr('height', chartHeight);

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
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  if (!isMobile.matches) {
    chartElement
      .append("g")
      .attr("class", "value")
      .selectAll("text")
      .data(config.data)
      .enter()
      .append("text")
      .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
      .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
      .text(function(d) {
        var item = lastItem(d);
        var value = item[valueColumn];
        var label = value.toFixed(1);

        // if (!isMobile.matches) {
          label = d.name + ": down ";
        // }

        return label;
      });

      chartElement
        .append("g")
        .attr("class", "value")
        .selectAll("text")
        .data(config.data)
        .enter()
        .append("text")
        .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
        .attr("y", d => yScale(lastItem(d)[valueColumn]) + 20)
        .text(function(d) {
          var item = lastItem(d);
          var value = item[valueColumn];
          var label = value.toFixed(1);

          // if (!isMobile.matches) {
            label = label.substring(1) + "% from 2019";
          // }

          return label;
        });
    } else {
      chartElement
        .append("g")
        .attr("class", "value")
        .selectAll("text")
        .data(config.data)
        .enter()
        .append("text")
        .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
        .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
        .text(function(d) {
          var item = lastItem(d);
          var value = item[valueColumn];
          var label = value.toFixed(1);

          label = d.name + ": ";

          return label;
        });
      chartElement
        .append("g")
        .attr("class", "value")
        .selectAll("text")
        .data(config.data)
        .enter()
        .append("text")
        .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
        .attr("y", d => yScale(lastItem(d)[valueColumn]) + 15)
        .text(function(d) {
          var item = lastItem(d);
          var value = item[valueColumn];
          var label = value.toFixed(1);

          label = label + "%";

          return label;
        });
    }

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = shelter_dates[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', 20)
    .text('Shutdown order in effect');
};

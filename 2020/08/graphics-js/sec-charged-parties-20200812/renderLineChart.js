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

var pres_admins = [
  { 'begin':'1983-10-01','end':'1989-01-20', 'name': 'Ronald Reagan', 'last': 'Reagan' },
  { 'begin':'1989-01-20','end':'1993-01-20', 'name': 'George H. W. Bush', 'last': 'G. H.W. Bush' },
  { 'begin':'1993-01-20','end':'2001-01-20', 'name': 'Bill Clinton', 'last': 'Clinton'},
  { 'begin':'2001-01-20','end':'2009-01-20', 'name': 'George W. Bush', 'last': 'G. W. Bush' },
  { 'begin':'2009-01-20','end':'2017-01-20', 'name': 'Barack Obama', 'last': 'Obama' },
  { 'begin':'2017-01-20','end':'2018-10-01', 'name': 'Donald Trump', 'last': 'Trump' }
]

pres_admins.forEach(function(d) {
  [ 'begin', 'end' ].forEach(function(v, k) {
    var [y, m, day] = d[v].split("-").map(Number);
    d[v] = new Date(y, m - 1, day);
  })
})

console.log(pres_admins);

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 75,
    bottom: 20,
    left: 30
  };

  var ticksX = 10;
  var ticksY = 8;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 4;
    ticksY = 5;
    margins.right = 60;
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
    .domain([min, 200])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.teal3
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
      if (isMobile.matches) {
        return "FY " + "\u2019" + yearAbbrev(d);
      } else {
        return "FY " + yearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

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

  // Presidential administration lines
  var administration = chartElement.insert("g", "*")
    .attr("class", "pres-admin")
    .selectAll("rect")
    .data(pres_admins)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d["begin"]))
    .attr('width', d => xScale(d['end']) - xScale(d['begin']))
    .attr('y', 0)
    .attr('height', chartHeight);

  chartElement.append("g")
    .attr("class", "pres-label")
    .selectAll("text")
    .data(pres_admins)
    .enter()
    .append("text")
    .attr("class", d => classify(d.last))
    .attr("x", d => xScale(d["begin"]) + ((xScale(d["end"]) - xScale(d["begin"])) / 2))
    .attr('y', isMobile.matches ? 13 : 15)
    .text(d => d.last)
    .call(wrapText, margins.right - 22, 13);

    document.getElementsByTagName("tspan")[1].setAttribute("dy", "0px");

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

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", d => yScale(lastItem(d)[valueColumn]))
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(0);

      return label = label + " " + d.name + " in FY 2019";
    })
    .call(wrapText, margins.right - 20, 13);
};

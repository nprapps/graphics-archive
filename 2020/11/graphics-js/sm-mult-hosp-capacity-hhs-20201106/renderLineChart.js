var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};
var pym = require("./lib/pym");

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, monthDay, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var highlightStates = ['Nebraska', "New Mexico", "North Dakota", "South Dakota", 'Wisconsin'];

  var { dateColumn, valueColumn } = config;
  var FILTERDATA = [...config.data]

  // sort data
  var sortDate = function(a, b){
    if (a.date > b.date) {
      return 1
    }
    else {
      return -1
    }
  }
  for (i in FILTERDATA) {
     FILTERDATA[i].values = FILTERDATA[i].values.sort(sortDate)
  }

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 75,
    bottom: 20,
    left: 33
  };

  var ticksX = 4;
  var ticksY = 5;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 25;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");


  var dates = FILTERDATA[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);


  var values = FILTERDATA.reduce(
    (acc, d) => acc.concat(d.values.map(v => v[valueColumn])),
    []
  );

  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var min = Math.min.apply(null, floors);

  if (min < 0) {
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
      FILTERDATA.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

  // Render the HTML legend.

  // var oneLine = FILTERDATA.length > 1 ? "" : " one-line";

  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key" + oneLine)
  //   .selectAll("g")
  //   .data(FILTERDATA)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d.name));

  // legend.append("b").style("background-color", d => colorScale(d.name));

  // legend.append("label").text(d => d.name);

  // Create the root SVG element.

  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper " + classify(config.state) )
    .classed("always-show", highlightStates.indexOf(config.state) > -1 );

  chartWrapper.append("div")
    .attr("class", "state-title")
    .html(config.state)

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 axes.

  // var xAxis = d3
  //   .axisBottom()
  //   .scale(xScale)
  //   .ticks(ticksX)
  //   .tickFormat(function(d, i) {
  //       return monthDay(d);
  //   });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d=>d);

  // Render axes to chart.

  // chartElement
  //   .append("g")
  //   .attr("class", "x axis")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  // Render grid to chart.

  // var xAxisGrid = function() {
  //   return xAxis;
  // };

  var yAxisGrid = function() {
    return yAxis;
  };

  // chartElement
  //   .append("g")
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat("")
  //   );

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

  // Render lines to chart.
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  var curve = d3.curveLinear;

  // var area = d3.area()
  //   .curve(curve)
  //   .x(d => xScale(d[dateColumn]))
  //   .y0(d=> yScale(d['lowerLimit']))
  //   .y1(d=> yScale(d['upperLimit']))


  // chartElement
  //   .append("g")
  //   .attr("class", "area")
  //   .selectAll("path")
  //   .data(FILTERDATA.filter(x=>x.name == 'hosp_per_10k'))
  //   .enter()
  //   .append("path")
  //   .attr("class", d => "area " + classify(d.name))
  //   .attr("d", function(d){
  //     return area(d.values.filter(x=>x.state == config.state))
  //   });

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(FILTERDATA.filter(x=>x.name == 'hosp_per_10k'))
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("d", function(d){
      return line(d.values.filter(x=>x.state == config.state))
    });



  var lastItem = d => d.values.filter(x=>x.state == config.state)[d.values.filter(x=>x.state == config.state).length - 1];


  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(FILTERDATA.filter(x=>x.name == 'hosp_per_10k'))
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(1);

      // if (!isMobile.matches) {
      //   label = d.name + ": " + label;
      // }

      return label;
    });








};


var pymChild;
pym.then(child => {
  pymChild = child;
  child.sendHeight();
});

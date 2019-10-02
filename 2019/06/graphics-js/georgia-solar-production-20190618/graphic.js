console.clear();
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var dataProjected = [];

var pymChild;

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, makeTranslate, wrapText } = require("./lib/helpers");

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

//Initialize graphic
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};


//Format graphic data for processing by D3.
var formatData = function() {

  DATA.forEach(function(d) {
    d.date = new Date(d.date, 0, 1);
  });

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {

    if (column == "date") continue;

    else{

    dataSeries.push({
      name: column,
      values: DATA.map(d => ({
        date: d.date,
        amt: +d[column]
      }))
    });

    }

  }
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 10,
    right: 50,
    bottom: 20,
    left: 45
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 2000;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
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
      COLORS.red3,
      COLORS.yellow3,
       "#5ba351",
      COLORS.blue3,
      "#999"

    ]);

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

var fmtComma = n => n.toLocaleString();

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return "\u2019" + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => fmtComma(d));

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

  var noTarget = ["AK", "ID", "WY", "NE", "AR", "LA", "MS", "AL", "FL", "GA", "TN", "KY", "WV"];
  var labeled = ["GA","FL","VA","NC","SC"];

//separate out projected
var projected = [];
var past = [];

  //filter out 2019 and 2020
  for(var state of config.data){
      past.push({
          name: state.name,
          values: state.values.filter(v => v.date <= new Date(2018, 0, 1))
      });

      projected.push({
          name: state.name,
          values: state.values.filter(v => v.date >= new Date(2018, 0, 1))
      });
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
    .data(past)
    .enter()
    .append("path")
    .attr("class", function(d,i){
        var c = "line " + classify(d.name);
        if(noTarget.includes(d.name)) c+= " noTarget";
        return c;
    })
    //.attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

    chartElement
    .append("g")
    .attr("class", "lines projected")
    .selectAll("path")
    .data(projected)
    .enter()
    .append("path")
    .attr("class", function(d,i){
        var c = "line " + classify(d.name);
        if(noTarget.includes(d.name)) c+= " noTarget";
        return c;
    })
    //.attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class", function(d,i){
        var c = "value " + classify(d.name);
        if(noTarget.includes(d.name)) c+= " noTarget";
        return c;
    })
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", function(d){
      var y = yScale(lastItem(d)[valueColumn]);
       if(d.name=="GA") y-= 2;
       if(d.name=="VA") y+= 5;

       return y;
    })
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(1) + "%";

     // label = d.name + ": " + label;
     label = d.name;
     if(labeled.includes(d.name)){
        return label;
     } else if (d.name == "TN"){
        return "TN, AL, AR, MS, LA, KY";
     } 
    })
      .call(wrapText,50,11);

  // chartElement.append('line')
  //     .attr("class", "annotation")
  //     .attr('x1', d => xScale(lastItem(d)[dateColumn]) + 2)
  //     .attr('x2', d => xScale(lastItem(d)[dateColumn]) + 2)
  //     .attr('y1', d => yScale(lastItem(d)[valueColumn]))
  //     .attr('y2', d => yScale(lastItem(d)[valueColumn])+15);



};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

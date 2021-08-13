var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, yearAbbrev, monthDay, dayYear } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 35,
    bottom: 20,
    left: 65
  };

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 4;
    ticksY = 5;
    margins.right = 35;
    margins.left = 40;
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

  // if (min > 0) {
  //   min = 0;
  // }

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min-100000, max+200000])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      // COLORS.red3,
      // COLORS.yellow3,
      // COLORS.blue3,
      COLORS.teal4,
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
    //.tickValues(["Oct. '19", "Jan. '20","April", "July","Oct.","Jan. '21"])
    .tickFormat(function(d, i) {
      //if (isMobile.matches){

      //}
      //else {
        if (yearAbbrev(d)=='19') {
          return monthDay(d).split(" ")[0] + " '" +yearAbbrev(d);
        }

        else if (yearAbbrev(d) == '20' && monthDay(d) == 'Jan. 1'){
          return monthDay(d).split(" ")[0] + " '" +yearAbbrev(d);
        }

        else if (yearAbbrev(d) == '21' && monthDay(d) == 'Jan. 1'){
          return monthDay(d).split(" ")[0] + " '" +yearAbbrev(d);
        }

        else {
          return monthDay(d).split(" ")[0]
        }
        //} else {
        //console.log(yearAbbrev(d))
        //return monthDay(d)//.split(" ")[0]
        //}
      //}
      
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d,i){
      if (isMobile.matches){
        return (d/1000000).toFixed(1) + 'M'
      }

      else {
        return (d/1000000).toFixed(1) + ' million'
      }
      
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
    .curve(d3.curveStepAfter)
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
  var itemOfInterest = d => d.values[4];
  var dropItem = d => d.values[6];

  chartElement
    .append("g")
    .attr("class", "end-circles")
    .selectAll("circle")
    .data(config.data.slice(0, 2))
    .enter()
    .append("circle")
    .attr("class", d => "circle " + classify(d.name))
    .attr("fill", d => COLORS.teal3)
    .attr("stroke", "#ffffff")
    .attr("cx", function (d) {
      return xScale(lastItem(d)[dateColumn]);
    })
    .attr("cy", d => yScale(lastItem(d)[valueColumn]))
    .attr("r", getRadius());


  chartElement
    .append("g")
    .attr("class", "end-circles")
    .selectAll("circle")
    .data(config.data.slice(0, 2))
    .enter()
    .append("circle")
    .attr("class", d => "circle " + classify(d.name))
    .attr("fill", d => COLORS.teal3)
    .attr("stroke", "#ffffff")
    .attr("cx", function (d) {
      return xScale(itemOfInterest(d)[dateColumn]);
    })
    .attr("cy", d => yScale(itemOfInterest(d)[valueColumn]))
    .attr("r", getRadius());

function getRadius() {
  if (isMobile.matches) return "3";
  return "4";
}

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 7)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3)
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = (value/1000000).toFixed(1)
      return label;
    });

    chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(itemOfInterest(d)[dateColumn]) + 3)
    .attr("y", d => yScale(itemOfInterest(d)[valueColumn]) - 8)
    .text(function(d) {
      var item = itemOfInterest(d);
      var value = item[valueColumn];
      var label = (value/1000000).toFixed(1) + ' million jobs'
      return label;
    })

    chartElement
    .append("g")
    .attr("class", "end-circles")
    .selectAll("circle")
    .data(config.data.slice(0, 2))
    .enter()
    .append("circle")
    .attr("class", d => "circle " + classify(d.name))
    .attr("fill", d => COLORS.teal3)
    .attr("stroke", "#ffffff")
    .attr("cx", function (d) {
      return xScale(dropItem(d)[dateColumn]);
    })
    .attr("cy", d => yScale(dropItem(d)[valueColumn]))
    .attr("r", getRadius());

    chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(dropItem(d)[dateColumn]) - 30)
    .attr("y", d => yScale(dropItem(d)[valueColumn]) + 3)
    .text(function(d) {
      var item = dropItem(d);
      var value = item[valueColumn];
      var label = (value/1000000).toFixed(1)
      return label;
    });



};

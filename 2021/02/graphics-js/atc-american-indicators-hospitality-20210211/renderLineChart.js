var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate, wrapText, } = require("./lib/helpers");
var { yearFull, yearAbbrev, monthDay } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = 16;
  var aspectHeight = 9;

  if (config.category == 'unemployment'){
  var margins = {
    top: 5,
    right: 40,
    bottom: 20,
    left: 35
  };
}

  else {
    var margins = {
    top: 5,
    right: 45,
    bottom: 20,
    left: 35
  };
  }

  var width = config.width/2-10;
  //onsole.log(width);

  var ticksX = 4;
  var ticksY = 4;
  var roundTicksFactor = 2;

  // Mobile
  if (isMobile.matches) {
    ticksX = 4;
    ticksY = 4;
    width = config.width
  }

  // Calculate actual chart dimensions
  var chartWidth = width - margins.left - margins.right;
  //console.log(chartWidth)
  var chartHeight =
    Math.ceil((width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  //containerElement.html("");

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
  //console.log(ceilings)
  var max = Math.max.apply(null, ceilings);
  //console.log(max);

  if (config.category != 'unemployment'){
    min = -85
    max = 20
  }

  else {
    max = 60
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  //console.log(config)
  if (config.category == 'unemployment'){
    var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      '#adadad',
      COLORS.teal3,
  ]);

     var yAxis = d3
      .axisLeft()
      .scale(yScale)
      .ticks(ticksY)
      .tickFormat(function(d,i){
        return d + "%"
      });
  }

  else {
    var colorScale = d3
      .scaleOrdinal()
      .domain(
        config.data.map(function(d) {
          return d.name;
        })
      )
      .range([
        COLORS.orange3,
      ]);

     var yAxis = d3
        .axisLeft()
        .scale(yScale)
        //.ticks(ticksY)
        .tickValues([-80,-60,-40,-20,0,20])
        .tickFormat(function(d,i){
          return d + "%"
        });
  }
  

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  var chartWrapper = containerElement
    .append("div")
    .data(config.data)
    .attr("class", d =>  "graphic-wrapper " + classify(d.name));

    if (config.category == 'unemployment'){
      chartWrapper.append("h3")
    .attr("class", "state-title")
    .html("Unemployment rate")
    .style("width",chartWidth + "px")
    }

    else {
      chartWrapper.append("h3")
    .attr("class", "state-title")
    .html("% Change In 2020 Travel Spending Vs. 2019")
    .style("width",chartWidth + "px")
    }
    

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
        return monthDay(d).split(" ")[0]
      
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
    .curve(d3.curveCardinal)
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  var strokes = {"Accommodation":3,"Overall":3}
  //console.log(strokes)
  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => colorScale(d.name))
    .attr("stroke-width", d=> strokes[d.name])
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];
  //console.log(xScale(new Date(2020, 8, 15, 0, 0, 0, 0)))
  //console.log(new Date(2020, 8, 15, 0, 0, 0, 0))
  if (config.category == 'unemployment'){
    chartElement
      .append('text')
      .classed('chart-label', true)
      .attr('x',xScale(new Date(3920, 8, 1, 0, 0, 0, 0)))
      .attr('y', yScale(37))
      .attr('text-anchor', d => (d.anchor == 'left' ? 'end' : 'start'))
      .html('Accommodation workers')
      .call(wrapText, 100, 14);

    chartElement
      .append('text')
      .classed('chart-label', true)
      .attr('x',xScale(new Date(3920, 8, 1, 0, 0, 0, 0)))
      .attr('y', yScale(11))
      .attr('text-anchor', d => (d.anchor == 'left' ? 'end' : 'start'))
      .html('Overall')
      .call(wrapText, 100, 14)
      .style("fill","#adadad");
  }

  // else {

  //   chartElement
  //     .append('text')
  //     .classed('chart-label', true)
  //     .attr('x',xScale(new Date(3920, 3, 1, 0, 0, 0, 0)))
  //     .attr('y', yScale(-15))
  //     .attr('text-anchor', d => (d.anchor == 'left' ? 'end' : 'start'))
  //     .html('Year-over-year % change')
  //     .call(wrapText, 100, 14)
  //     .style("fill","#E38D2C");
  // }

  chartElement
    .append("g")
    .attr("class", "end-circles")
    .selectAll("circle")
    .data(config.data.slice(0, 2))
    .enter()
    .append("circle")
    .attr("class", d => "circle " + classify(d.name))
    .attr("fill", function (d) {
      if (config.category == 'unemployment'){
        if (d.name == 'Overall'){
          return '#adadad'
        }
        else {
          return COLORS.teal3
        }
        
      }

      else {
        return COLORS.orange3
      }
      })
    .attr("stroke", "#ffffff")
    .attr("cx", function (d) {
      return xScale(lastItem(d)[dateColumn]);
    })
    .attr("cy", d => yScale(lastItem(d)[valueColumn]))
    .attr("r", getRadius());

function getRadius() {
  if (isMobile.matches) return "4";
  return "4";
}


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
      //   label = d.name + ": " + label;
      // }

      // if (d.name == 'Travel spending'){
      //   return "Dec. 2020: " + label + "%" 
      // }

      return label + "%";
    });
};

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { wrapText, getAPMonth, COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {

  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 10,
    right: 35,
    bottom: 20,
    left: 30
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 3;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 45;
  }

  // if (config.type == "single") {
  //   margins.right = 30;
  // }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  console.log(containerElement)
  containerElement.html("");

  var dates = config.data[0].values.map(d => d[dateColumn]);
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
      COLORS.teal4,
      COLORS.teal4,
      COLORS.orange4,
      COLORS.orange4
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";

  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key" + oneLine)
  //   .selectAll("g")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("class", d => "key-item " + classify(d.name));

  // legend.append("b").style("background-color", d => colorScale(d.name));

  // legend.append("label").text(d => d.name);

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
      // if (d.getMonth() % 3 && isMobile.matches) {
        // return null;
      // }
      if (d.getMonth() == 0 || (d.getFullYear() == 2020 && d.getMonth() == 3)) {
        return monthYear(d);
      } else {
        return getAPMonth(d);
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

  // var annotationsData = [];

  // for (var i = 0; i < 2; i++) {
  //   if (config.type == "single" && i > 0) {
  //     break;
  //   }

  //   annotationsData.push({
  //     "top":lastItem(config.data[i*2]).amt,
  //     "bottom":lastItem(config.data[i*2 + 1]).amt,
  //     "date":lastItem(config.data[i*2]).date
  //   })    
  // }
  
  var lineAnnotation = d3.line();   

  // chartElement
  //   .append("g")
  //   .attr("class", "note-lines")
  //   .selectAll("path")
  //   .data(annotationsData)
  //   .enter()
  //   .append("path")
  //   .attr("class","note-lines-inner")
  //   .attr("d",function(d){
  //     var begin = [xScale(d.date),yScale(d.top)];
  //     var end =   [xScale(d.date),yScale(d.bottom)];
  //     var arrPoints = [begin,end];
  //     return lineAnnotation(arrPoints)
  //   })

  // chartElement
  //   .append("g")
  //   .attr("class", "note-lines2")
  //   .selectAll("path")
  //   .data(annotationsData)
  //   .enter()
  //   .append("path")
  //   .attr("class","note-lines-inner")
  //   .attr("d",function(d){
  //     var begin = [xScale(d.date),yScale((d.top-d.bottom)/2+d.bottom)];
  //     var end =   [xScale(d.date)+7,yScale((d.top-d.bottom)/2+d.bottom)];
  //     var arrPoints = [begin,end];
  //     return lineAnnotation(arrPoints)
  //   })    

  // if (config.type == "double") {
  //   chartElement
  //     .append("g")
  //     .attr("class", "annote")
  //     .append("text")
  //     .attr("x", d => xScale(lastItem(config.data[0]).date)+5)
  //     .attr("y", 0)
  //     .html(config.labels.elder_upper)
  //     .call(wrapText,margins.right-10,14)

  //   chartElement
  //     .append("g")
  //     .attr("class", "annote")
  //     .append("text")
  //     .attr("x", d => xScale(lastItem(config.data[0]).date)+5)
  //     .attr("y", d => yScale(lastItem(config.data[1]).amt) - 100)
  //     .html(config.labels.elder_lower)
  //     .call(wrapText,margins.right-10,14)      
  // }
  

  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(annotationsData)
  //   .enter()
  //   .append("text")
  //   .attr("x", d => xScale(d.date) + 10)
  //   .attr("y", d => yScale((d.top-d.bottom)/2 + d.bottom) + 4)
  //   .text(function(d) {
      
  //     var value = d.bottom/d.top;
  //     var label = `${value.toFixed(1)}x`;

  //     // if (!isMobile.matches) {
  //       // label = d.name + ": " + label;
  //     // }

  //     return label;
  //   });

  // end values for each line
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class", d => classify(d.name))
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 10)
    .attr("y", d => {
      var scalar = 4;
      if (d.name == "vaxxed_elderly") {
        scalar = -5;
      } else if (d.name == "unvaxxed" && config.type == "double") {
        scalar = 10;
      }
      
      return yScale(lastItem(d)[valueColumn]) + scalar
    })
    .text(function(d) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value > 10 ? value.toFixed(0) : value.toFixed(1);
      return label;
    });      

    // chartElement
    //   .append("g")
    //   .attr("class", "note-lines2")
    //   .selectAll("path")
    //   .data(config.data)
    //   .enter()
    //   .append("path")
    //   .attr("class","note-lines-inner")
    //   .attr("d",function(d){
    //     var scalar = 0;

    //     if (d.name == "vaxxed_elderly") {
    //       scalar = -8;
    //     } else if (d.name == "unvaxxed" && config.type == "double") {
    //       scalar = 5;
    //     }

    //     var begin = [xScale(lastItem(d)[dateColumn]),yScale(lastItem(d)[valueColumn])];
    //     var end =   [xScale(lastItem(d)[dateColumn])+15,yScale(lastItem(d)[valueColumn]) + scalar];
    //     var arrPoints = [begin,end];
    //     return lineAnnotation(arrPoints)
    //   })   
  

  // Render dots
  var dots = chartElement
    .append("g")
    .attr("class", "dots")
    .selectAll("g")
    .data(config.data)
    .enter()
      .append("g")
      .attr('class',d => classify(d.name));

  dots.selectAll("circle")
    .data(function(d, i) {
      d.values.forEach(function(v,k) {
        v.series = d.name;
      });
      return d.values;
    })
    .enter()
      .append("circle")
      .attr("cx", d => xScale(d[dateColumn]))
      .attr("cy", d => yScale(d[valueColumn]))
      .attr("fill", d => colorScale(d.series))
      .attr("stroke-width",function(d){
        var width = 1.5;
        // if (!isMobile.matches) {
        //   width = 0.5;
        // }

        return width;
      })
      .attr("stroke","#fff")
      .attr("r", isMobile.matches ? 5 : 5);

};

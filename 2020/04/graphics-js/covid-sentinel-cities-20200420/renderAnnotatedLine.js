/*
 * Render a line chart.
 */

var {
  COLORS,
  classify,
  makeTranslate,
  wrapText,
  fmtComma,
  getAPMonth
} = require("./lib/helpers");

var {formatDate} = require("./utils")
var { isMobile } = require("./lib/breakpoints");
var { dateFull } = require("./lib/helpers/formatDate");

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
    top: 30,
    right: 5,
    bottom: 20,
    left: 55
  };

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 100;

  var annotationXOffset = -4;
  var annotationYOffset = -24;
  var annotationWidth = 80;
  var annotationLineHeight = 14;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;    
    margins.right = 5;
    annotationXOffset = -6;
    annotationYOffset = -20;
    annotationWidth = 72;
    annotationLineHeight = 12;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  // var chartHeight =
  //   Math.ceil((config.width * aspectHeight) / aspectWidth) -
  //   margins.top -
  //   margins.bottom;
  var chartHeight = 220;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates = config.other_data[4].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  /*
   * Create D3 scale objects.
   */
  var xScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartWidth]);

  var values = config.other_data.reduce(
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
    .scaleLog()
    .domain([1, max])
    .range([chartHeight, 0.1]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.orange3,
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
        return dateFull(d);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => fmtComma(d))

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

  chartElement
    .append("text")    
    .attr("class","yLabel")
    .attr("dx",-9)
    .attr("dy",-20)
    .text("Confirmed Cases")
    .call(wrapText, 50, 12);
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

// formatRange here, draw rect. 
if (range) {
  var annotationRange = chartElement
    .append("g")
    .attr("class","annotationRange")
    .append("rect")
      .attr("class","rectRange")
      .attr("x",xScale(formatDate(range[0])))
      .attr("width",xScale(formatDate(range[1])) - xScale(formatDate(range[0])))     
      .attr("y",0)     
      .attr("height",chartHeight)
}
  


  /*
   * Render lines to chart.
   */
  var line = d3
    .line()
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  chartElement
    .append("g")
    .attr("class", "lines background")
    .selectAll("path")
    .data(config.other_data)
    .enter()
    .append("path")
    .attr("class", function(d, i) {
      return "line " + classify(d.name);
    })
    .attr("d", d => line(d.values));    

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
    .selectAll("text")
    .data(config.annotations)
    .enter();

  // if (isMobile.matches) {
  //   var xOffset = ["xOffsetMobile"];
  //   var yOffset = ["yOffsetMobile"];
  // } else {
    var xOffset = "xOffset";
    var yOffset = "yOffset";
  // }

  annotation
    .append("line")
    .attr("class",d => d.type == "range" ? "hide" : "anno-line " )
    .attr("x1", d => xScale(d[dateColumn]))
    .attr("y1", d => d[valueColumn] ? yScale(d[valueColumn]) + d[yOffset] + annotationYOffset - 7 : yScale(1)+ d[yOffset] + annotationYOffset - 7)
    .attr("x2", d => xScale(d[dateColumn]))
    .attr("y2", d => yScale(1))

  annotation
    .append("text")
    .html(function(d) {
      
      if (d.type == "range") {
        var text = `${d.label}`
      } else {
        var text = `${getAPMonth(d[dateColumn])} ${d[dateColumn].getDate()}: ${d.label}`
      }
      
      return text;
    })
    .attr("x", function(d){
      if (d.type == "range") {
        return xScale(d[dateColumn]) + d[xOffset];
      } else if (d.isLeft) {
        return xScale(d[dateColumn]) - d[xOffset] - annotationXOffset;
      } else {
        return xScale(d[dateColumn]) + d[xOffset] + annotationXOffset;
      }
    })
    .attr("y", function(d){
      if (d.type == "range") {
        return yScale(max) + d[yOffset];
      } else {
        if (!d[valueColumn]) {
          var yAmount = 1;
        } else {
          var yAmount = d[valueColumn];
        }
        return yScale(yAmount) + d[yOffset] + annotationYOffset
      }
    }) 
    .attr("class",function(d){
      if (d.type == "range") {
        return "range"
      } else if (d.isLeft) {
        return "isLeft"
      } else {
        return ""
      }
    })
    .call(wrapText, annotationWidth, annotationLineHeight);



};

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

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 5,
    right: 200,
    bottom: 20,
    left: 33
  };

  var ticksX = 5;
  var ticksY = 5;
  var roundTicksFactor = 5;
  var lineHeight = 13;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
    margins.right = 150;
    lineHeight = 12;
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
      COLORS.blue2
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
   // .ticks(ticksX)
    .tickValues([new Date('1/1/09'),new Date('1/1/11'),new Date('1/1/13'),new Date('1/1/15'),new Date('1/1/17'),new Date('1/1/19')])
    .tickFormat(function(d, i) {
      if (yearFull(d) % 2 == 1){
      if (isMobile.matches) {
        return "\u2019" + yearAbbrev(d);
      } else {
        return yearFull(d);
      }
    }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickValues([0,10,20,30,40])
    .tickFormat(function(d, i) {
      return d + "%"
    })
    //.ticks(ticksY);

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
    //.curve(d3.curveCatmullRom.alpha(0.1))
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
    .attr("d", d => line(d.values))

  var lastItem = d => d.values[d.values.length - 1];
  var firstItem = d => d.values[0];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class","endLabel")
    .attr("x", function (d){
      return xScale(lastItem(d)[dateColumn]) + (isMobile.matches ? 5 :7)
    })
    .attr("y", function (d,i){
      if (i==1){
        return yScale(lastItem(d)[valueColumn]) - (isMobile.matches ? 19 :5)
      }
      else if (i==2){
        return yScale(lastItem(d)[valueColumn]) + 5
      }
      else if (i==4){
        return yScale(lastItem(d)[valueColumn]) - 8
      }
      return yScale(lastItem(d)[valueColumn])
    })
    .text(function(d,i) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(1) + "%";

      if (i == 4){
        return label + " " + d.name;
      }
      label = label + " had " + d.name; 
      return label;
    })
    .call(wrapText,margins.right-5,lineHeight);

    chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("class","boldLabel")
    .attr("x", function (d){
      return xScale(lastItem(d)[dateColumn]) + (isMobile.matches ? 5 :7)
    })
    .attr("y", function (d,i){
      if (i==1){
        return yScale(lastItem(d)[valueColumn]) - (isMobile.matches ? 19 :5)
      }
      else if (i==2){
        return yScale(lastItem(d)[valueColumn]) + 5
      }
      else if (i==4){
        return yScale(lastItem(d)[valueColumn]) - 8
      }
      return yScale(lastItem(d)[valueColumn])
    })
    .text(function(d,i) {
      var item = lastItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(1) + "%";

      // if (i == 4){
      //   return label + " " + d.name;
      // }
      // label = label + " had " + d.name; 
      return label;
    })
    .call(wrapText,margins.right-5,lineHeight);

    chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(firstItem(d)[dateColumn]) + 2)
    .attr("y", d => yScale(firstItem(d)[valueColumn]) - (isMobile.matches ? 6 : 8))
    .text(function(d) {
      var item = firstItem(d);
      var value = item[valueColumn];
      var label = value.toFixed(1) + "%";
      //label = label + " had " + d.name;
      return label;
    })
    .call(wrapText,margins.right,lineHeight);

    //var lastItem = d => d.values[d.values.length - 1];

    chartElement
    .append("g")
    .attr("class", "end-circles")
    .selectAll("circle")
    .data(config.data)
    .enter()
    .append("circle")
    .attr("class", d => "circle " + classify(d.name))
    .attr("fill", d => COLORS.blue1)
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
    .data(config.data)
    .enter()
    .append("circle")
    .attr("class", d => "circle " + classify(d.name))
    .attr("fill", d => COLORS.blue2)
    .attr("stroke", "white")
    .attr("cx", function (d) {
      return xScale(firstItem(d)[dateColumn]);
    })
    .attr("cy", d => yScale(firstItem(d)[valueColumn]))
    .attr("r", getRadiusSmaller());

    function getRadius() {
      if (isMobile.matches) return "3";
      return "4";
    }

    function getRadiusSmaller() {
      if (isMobile.matches) return "3";
      return "3";
    }
};

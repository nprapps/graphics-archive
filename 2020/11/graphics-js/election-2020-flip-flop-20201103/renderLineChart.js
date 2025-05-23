var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var { COLORS, classify, makeTranslate } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile } = require("./lib/breakpoints");

// Render a line chart.
module.exports = function(config) {
  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 40,
    right: 75,
    bottom: 20,
    left: 40
  };

  var ticksX = 10;
  var ticksY = 3;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 3;
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
  containerElement.html("");

  var dates = config.data[0].values.map(d => d.date);
  var extent = [dates[0], dates[dates.length - 1]];

  var yScale = d3
    // .scaleTime()
    .scaleLinear()
    .domain(extent)
    // .range([0, chartWidth]);
    .range([chartHeight, 0]);

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

  var xScale = d3
    .scaleLinear()
    .domain([-50, 50])
    // .range([chartHeight, 0]);
    .range([0, chartWidth]);

  var colorScale = d3
    .scaleThreshold()
    .domain([-55,-25,0,25,55])
      // config.data.map(function(d) {
      //   return d.name;
      // })
    // )
    .range([
      "#275e90",
      "#498dcb",
      "#adcdeb",
      "#f8b1ab",
      "#f05b4e",
      "#c52011",
    ]);


  var marginMin = 0;
  var marginMax = 500000;
  
  var voteScale = d3
     .scaleLinear()
     .domain([marginMin,marginMax])
     .range([2,25])

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
    .axisTop()
    .scale(xScale)
    .ticks(ticksX)


  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    // .ticks(ticksY)
    .tickValues(["2020","2016","2012"])
    .tickFormat(function(d, i) {
      // if (isMobile.matches) {
      //   return "\u2019" + yearAbbrev(d);
      // } else {
      //   return yearFull(d);
      // }
      return d
    });

  // Render axes to chart.

  chartElement
    .append("g")
    .attr("class", "x axis")
    // .attr("transform", makeTranslate(0, chartHeight))
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
    .attr("transform", makeTranslate(0, 0))
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
      .attr("y1", 0)
      .attr("y2", chartHeight)
      .attr("x1", xScale(0))
      .attr("x2", xScale(0));
  }

  // Render lines to chart.
  var line = d3
    .line()
    .curve(d3.curveCatmullRom.alpha(0.5))
    .x(d => xScale(d[valueColumn]))
    .y(d => yScale(d[dateColumn]));

  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    // .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values));



  //Render dots
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
      .attr("cy", d => yScale(d[dateColumn]))
      .attr("cx", d => xScale(d[valueColumn]))
      .attr("fill", d => colorScale(d[valueColumn]))
      .attr("stroke-width",function(d){
        var width = 0.5;
        // if (!isMobile.matches) {
        //   width = 0.5;
        // }

        return width;
      })
      .attr("stroke","#fff")
      .attr("r", 5);

  var lastItem = d => d.values[d.values.length - 1];

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

      if (!isMobile.matches) {
        label = d.name + ": " + label;
      }

      return label;
    });
};

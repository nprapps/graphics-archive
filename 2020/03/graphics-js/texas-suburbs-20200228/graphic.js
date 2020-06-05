var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var charts = ['hays', 'tarrant', 'fortbend'];


// Global vars
var pymChild = null;

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, makeTranslate } = require("./lib/helpers");

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

// Initialize the graphic.
var onWindowLoaded = function() {
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

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  // Render the chart!
  var container = "#column-chart-hays";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  charts.forEach(function(chart, i) {
  renderColumnChart({
    container: "#column-chart-" + chart,
    width,
    data: DATA[chart],
    xDomain: [2000, 2018],
    labelWidth: 80

  });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a column chart.
var renderColumnChart = function(config) {
  // Setup chart container
  var labelColumn = "label";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 2.25 : 9;
  var valueGap = 6;

  var margins = {
    top: 40,
    right: 5,
    bottom: 45,
    left: 50
  };

  var ticksY = 4;
  var roundTicksFactor = 50;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

    //write function

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .range([0, chartWidth])
    .round(true)
    .padding(0.1)
    .domain(
      config.data.map(d => d[labelColumn])
    );

  var floors = config.data.map(
    d => Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max(...ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([-20, 30])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function(d, i) {
      return d; 
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i) {
      if (d >= 0){
        return d;
      } else if(d < 0) {
        return d*-1;
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
  var yAxisGrid = function() {
    return yAxis;
  };

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0)
        .tickFormat("")
    );

chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("x", -25)
    .attr("y", -15)
    .text("GOP")
    .attr("fill", "#D8472B");


chartElement
.append("g")
.attr("class", "value")
.append("text")
.attr("x", -25)
.attr("y", chartHeight + 20)
.text("Dem.")
.attr("fill", "#51AADE");

chartElement
    .append("g")
    .attr("class", "value")
    .attr("id", "margin-of-v")
    .append("text")
    .attr("transform", 'translate(-33,' + (chartHeight/2) + ")rotate(-90)")
    .style("text-anchor", "middle")
    .text("Margin of victory");
    // .attr("fill", "#000000")

  
chartElement
    .append("svg:defs")
    .append("svg:marker")
    .attr("id", "arrow-gop")
    .attr("refX", 0)
    .attr("refY", 3.2)
    .attr("viewBox", "0 0 13 13")
    .attr("markerWidth", 10)
    .attr("markerHeight", 10)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,0 L0,6 L6,3 z")
    .style("fill", "#D8472B");

  chartElement
    .append("line")
    .attr("x1", -33)
    .attr("x2", -33)
    .attr("y1", 5)
    .attr("y2", -10)
    .attr("stroke", "#D8472B")
    .attr("stroke-width", 1.5)
    .attr("marker-end", 'url(#arrow-gop');


    chartElement
    .append("svg:defs")
    .append("svg:marker")
    .attr("id", "arrow-dem")
    .attr("refX", 0)
    .attr("refY", 3.2)
    .attr("viewBox", "0 0 13 13")
    .attr("markerWidth", 10)
    .attr("markerHeight", 10)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,0 L0,6 L6,3 z")
    .style("fill", "#51AADE");

  chartElement
    .append("line")
    .attr("x1", -33)
    .attr("x2", -33)
    .attr("y1", chartHeight -5)
    .attr("y2", chartHeight +10 )
    .attr("stroke", "#51AADE")
    .attr("stroke-width", 1.5)
    .attr("marker-end", 'url(#arrow-dem');


  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d[labelColumn]))
    .attr("y", d => d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn]))
    .attr("width", xScale.bandwidth())
    .attr("height", d => d[valueColumn] < 0
      ? yScale(d[valueColumn]) - yScale(0)
      : yScale(0) - yScale(d[valueColumn])
    )
    .style("fill", function(d) {
      // var value = d.valueColumn;
      if (d[valueColumn] > 0) {
        return "#D8472B";
      } else {
        return "#51AADE";
      }
      })
    .attr("class", function(d) {
      return "bar bar-" + d[labelColumn];
    });

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

  // Render bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(function(d) {
      val = d[valueColumn].toFixed(0);
      if (val >= 0) {
        val = val;
      } else if (val <0) {
        val = val*-1;
      } return val;
    })
    // ( d => d[valueColumn].toFixed(0))
    .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d[valueColumn]))
    .attr("dy", function(d) {
      var textHeight = this.getBBox().height;
      var $this = d3.select(this);
      var barHeight = 0;

      if (d[valueColumn] < 0) {
        barHeight = yScale(d[valueColumn]) - yScale(0);

        if (textHeight + valueGap * 2 < barHeight) {
          $this.classed("in", true);
          return -(textHeight - valueGap / 2);
        } else {
          $this.classed("out", true);
          return textHeight + valueGap;
        }
      } else {
        barHeight = yScale(0) - yScale(d[valueColumn]);

        if (textHeight + valueGap * 2 < barHeight) {
          $this.classed("in", true);
          return textHeight + valueGap;
        } else {
          $this.classed("out", true);
          return -(textHeight - valueGap / 2);
        }
      }
    })
    .attr("text-anchor", "middle");
};




//Initially load the graphic
window.onload = onWindowLoaded;

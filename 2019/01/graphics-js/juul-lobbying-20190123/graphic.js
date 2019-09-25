var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;

var d3 = Object.assign(
  {},
  require("d3-axis"),
  require("d3-scale"),
  require("d3-selection")
);

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
  var container = "#column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderColumnChart({
    container,
    width,
    data: DATA
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
  var aspectHeight = isMobile.matches ? 3 : 9;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 40
  };

  var ticksY = 4;
  var roundTicksFactor = 200000;

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

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .range([0, chartWidth])
    .round(true)
    .padding(0.1)
    .domain(
      config.data.map(function(d) {
        return d[labelColumn];
      })
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
    .domain([min, max])
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
    .ticks(4)
    .tickFormat(function(d) {
      return "$" + (d/1000)+ "K";
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

  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", function(d) {
      return xScale(d[labelColumn]);
    })
    .attr("y", function(d) {
      if (d[valueColumn] < 0) {
        return yScale(0);
      }

      return yScale(d[valueColumn]);
    })
    .attr("width", xScale.bandwidth())
    .attr("height", function(d) {
      if (d[valueColumn] < 0) {
        return yScale(d[valueColumn]) - yScale(0);
      }

      return yScale(0) - yScale(d[valueColumn]);
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
      console.log(d)
      return "$" + (d[valueColumn] / 1000) + "K";
    })
    .attr("x", function(d, i) {
      return xScale(d[labelColumn]) + xScale.bandwidth() / 2;
    })
    .attr("y", function(d) {
      return yScale(d[valueColumn]);
    })
    .attr("dy", function(d) {
      var textHeight = d3
        .select(this)
        .node()
        .getBBox().height;
      var barHeight = 0;

      if (d[valueColumn] < 0) {
        barHeight = yScale(d[valueColumn]) - yScale(0);

        if (textHeight + valueGap * 2 < barHeight) {
          d3.select(this).classed("in", true);
          return -(textHeight - valueGap / 2);
        } else {
          d3.select(this).classed("out", true);
          return textHeight + valueGap;
        }
      } else {
        barHeight = yScale(0) - yScale(d[valueColumn]);

        if (textHeight + valueGap * 2 < barHeight) {
          d3.select(this).classed("in", true);
          return textHeight + valueGap;
        } else {
          d3.select(this).classed("out", true);
          return -(textHeight - valueGap / 2);
        }
      }
    })
    .attr("text-anchor", "middle");
};

//Initially load the graphic
window.onload = onWindowLoaded;

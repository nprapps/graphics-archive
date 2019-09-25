var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "total"];
var { COLORS, makeTranslate, classify } = require("./lib/helpers");
console.clear();

var d3 = {
  ...require("d3-axis"),
  ...require("d3-scale"),
  ...require("d3-selection")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData(window.DATA);
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

// Format graphic data for processing by D3.
var formatData = function(data) {
  data.forEach(function(d) {
    var y0 = 0;

    d.values = [];
    d.total = 0;

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }
      d[key] = +d[key];

      var y1 = y0 + d[key];
      d.total += d[key];

      d.values.push({
        name: key,
        y0: y0,
        y1: y1,
        val: d[key]
      });

      y0 = y1;
    }
  });
  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  var container = "#stacked-column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  // Render the chart!
  renderStackedColumnChart({
    container,
    width,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a stacked column chart.
var renderStackedColumnChart = function(config) {
  // Setup
  var labelColumn = "label";

  var aspectWidth = 16;
  var aspectHeight = 9;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 30
  };

  var ticksY = 5;
  var roundTicksFactor = 50;

  if (isMobile.matches) {
    aspectWidth = 4;
    aspectHeight = 3;
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

  var labels = config.data.map(d => d[labelColumn]);

  // Create D3 scale objects.
  var xScale = d3
    .scaleBand()
    .domain(labels)
    .range([0, chartWidth])
    .padding(0.1);

  var values = config.data.map(d => d.total);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(k => skipLabels.indexOf(k) == -1)
    )
    .range([COLORS.teal5, COLORS.orange5, COLORS.blue3]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", function(d, i) {
      return "key-item key-" + i + " " + classify(d);
    });

  legend.append("b").style("background-color", function(d) {
    return colorScale(d);
  });

  legend.append("label").text(function(d) {
    return d;
  });

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", makeTranslate(margins.left, margins.top));

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickFormat(function(d) {
      if (isMobile.matches) {
        if (d % 5) {
          return null;
        }
      }
      return "'" + d.toString().slice(-2);
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d);

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

  // add projected rectangle
  var projectionStarts = 2020;
  var projection = chartElement
    .append("rect")
    .attr("fill", "#EEE")
    .attr("class", "projections")
    .attr("x", xScale(projectionStarts))
    .attr("y", 0)
    .attr("width", xScale(2025) - xScale(projectionStarts) + xScale.bandwidth())
    .attr("height", chartHeight);

  var projectionLabel = chartElement
    .append("text")
    .attr("fill", "#888")
    .attr("x", xScale(projectionStarts) + 4)
    .attr("y", margins.top + 10)
    .text("Projected")
    .attr("class", "projection-label");

  // Render bars to chart.
  var bars = chartElement
    .selectAll(".bars")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => `bar ${d.label < projectionStarts ? "real" : "projected" }`)
    .attr("transform", function(d) {
      return makeTranslate(xScale(d[labelColumn]), 0);
    });

  bars
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("y", function(d) {
      if (d.y1 < d.y0) {
        return yScale(d.y0);
      }

      return yScale(d.y1);
    })
    .attr("width", xScale.bandwidth())
    .attr("height", function(d) {
      return Math.abs(yScale(d.y0) - yScale(d.y1));
    })
    .style("fill", function(d) {
      return colorScale(d.name);
    })
    .attr("class", d => classify(d.name));

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

  // Render values to chart.
  // Skip this, they're not consistent
  if (false) bars
    .selectAll("text")
    .data(function(d) {
      return d.values;
    })
    .enter()
    .append("text")
    .text(function(d) {
      return d.val;
    })
    .attr("class", function(d) {
      return classify(d.name);
    })
    .attr("x", function(d) {
      return xScale.bandwidth() / 2;
    })
    .attr("y", function(d) {
      try {
        var textHeight = this.getBBox().height;
      } catch (err) {
        // FF doesn't like getBBox on hidden elements
        textHeight = 10;
      }
      var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));

      if (textHeight + valueGap * 2 > barHeight) {
        d3.select(this).classed("hidden", true);
      }

      var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;

      return barCenter + textHeight / 2;
    })
    .attr("text-anchor", "middle");


  chartElement
    .append("g")
    .attr("class", "totals")
    .selectAll("text")
    .data(config.data.filter(d => d.total > 5))
    .enter()
      .append("text")
      .attr("class", "total-label")
      .attr("text-anchor", "middle")
      .attr("data-total", d => d.total)
      .text(d => d.total)
      .attr("x", d => xScale(d.label) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d.total) - 5)
};

// Initially load the graphic
//(NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

console.clear()

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, makeTranslate, classify } = require("./lib/helpers");

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
  var aspectHeight = isMobile.matches ? 3 : 10;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 30
  };

  var ticksY = 4;
  var roundTicksFactor = 25;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");


   // Render a color legend.

  var legendVals = ["a", 'b', 'c', 'd']

  var colorScale = d3
    .scaleOrdinal()
    .domain(legendVals)
    .range([COLORS.blue1, COLORS.red2, COLORS.blue3, COLORS.red4, "#ccc" ]);

  var legend1 = containerElement.append("ul").attr("class", "key key1")
  .selectAll("g")
  .data(legendVals.splice(0,2))
  .enter()
  .append("li")
  .attr("class", function(d, i) {
    return `key-item key-${i} ${classify(d)}`;
  });
  legend1.append("b").style("background-color", d => colorScale(d));
  d3.select(".key1").append("label").text('Winners (Dem/GOP)');

  var legend2 = containerElement.append("ul").attr("class", "key key2")
  .selectAll("g")
  .data(legendVals)
  .enter()
  .append("li")
  .attr("class", function(d, i) {
    return `key-item key-${i} ${classify(d)}`;
  });
  legend2.append("b").style("background-color", d => colorScale(d));
  d3.select(".key2").append("label").text('Other candidates (Dem/GOP)');



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

  var max = 50;

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

  // Render gray bars to chart.
  // chartElement
  //   .append("g")
  //   .attr("class", "bars")
  //   .selectAll("rect")
  //   .data(config.data)
  //   .enter()
  //   .append("rect")
  //   .attr("x", d => xScale(d[labelColumn]))
  //   .attr("y", d => d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn]))
  //   .attr("width", isMobile.matches ? xScale.bandwidth()/3 : xScale.bandwidth()/2 - 1)
  //   .attr("height", d => d[valueColumn] < 0
  //     ? yScale(d[valueColumn]) - yScale(0)
  //     : yScale(0) - yScale(d[valueColumn])
  //   )
  //   .attr("class", function(d) {
  //     return "bar bar-" + d[labelColumn];
  //   });


  var demValueColumn = "D Total"
  var gopValueColumn = "R Total"
  var otherValueColumn = "O Total"

  // Render blue bars to chart.
  chartElement
    .append("g")
    .attr("class", "dem-bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d[labelColumn]) + (xScale.bandwidth()/2) + 1)
    .attr("y", d => d[demValueColumn] < 0 ? yScale(0) : yScale(d[demValueColumn]))
    .attr("width", isMobile.matches ? xScale.bandwidth()/3 : xScale.bandwidth()/2 - 1)
    .attr("height", d => d[demValueColumn] < 0
      ? yScale(d[demValueColumn]) - yScale(0)
      : yScale(0) - yScale(d[demValueColumn])
    )
    .attr("class", function(d) {
      return "bar bar-" + d[labelColumn];
    });


  // Render  red bars to chart.
  chartElement
    .append("g")
    .attr("class", "gop-bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => isMobile.matches ? xScale(d[labelColumn]) + 3 : xScale(d[labelColumn]))
    .attr("y", d => d[gopValueColumn] < 0 ? yScale(0) : yScale(d[gopValueColumn]))
    .attr("width", isMobile.matches ? xScale.bandwidth()/3 : xScale.bandwidth()/2 - 1)
    .attr("height", d => d[gopValueColumn] < 0
      ? yScale(d[gopValueColumn]) - yScale(0)
      : yScale(0) - yScale(d[gopValueColumn])
    )
    .attr("class", function(d) {
      return "bar bar-" + d[labelColumn];
    });


  // Render dark red bars to chart.
  chartElement
    .append("g")
    .attr("class", "gop-win-bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => isMobile.matches ? xScale(d[labelColumn]) + 3 : xScale(d[labelColumn]))
    .attr("y", d => d['RWon'] < 0 ? yScale(0) : yScale(d['RWon']))
    .attr("width", isMobile.matches ? xScale.bandwidth()/3 : xScale.bandwidth()/2 - 1)
    .attr("height", d => d['RWon'] < 0
      ? yScale(d['RWon']) - yScale(0)
      : yScale(0) - yScale(d['RWon'])
    )
    .attr("class", function(d) {
      return "bar bar-" + d[labelColumn];
    });



  // Render dark blue bars to chart.
  chartElement
    .append("g")
    .attr("class", "dem-win-bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth()/2 + 1)
    .attr("y", d => d['DWon'] < 0 ? yScale(0) : yScale(d['DWon']))
    .attr("width", isMobile.matches ? xScale.bandwidth()/3 : xScale.bandwidth()/2 - 1)
    .attr("height", d => d['DWon'] < 0
      ? yScale(d['DWon']) - yScale(0)
      : yScale(0) - yScale(d['DWon'])
    )
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

  // Render gop bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => d[gopValueColumn].toFixed(0))
    .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d[gopValueColumn]))
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



    // Render dem bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(d => d[demValueColumn].toFixed(0))
    .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d[valueColumn]) + (yScale(0) - yScale(d[otherValueColumn])))
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



    // add dividing lines



    config.data.forEach(function(d, i) {


        var oneUnitHeight = chartHeight - yScale(1)

        for (k in [...Array(d['amt']).keys()]) {
          chartElement.append('line')
            .attr("class", "divider")
            .attr("y1", chartHeight - (oneUnitHeight * k))
            .attr("y2", chartHeight - (oneUnitHeight * k))
            .attr("x1", xScale(d[labelColumn]))
            .attr("x2", xScale(d[labelColumn]) + (xScale.bandwidth()))
        }

      })





};

//Initially load the graphic
window.onload = onWindowLoaded;

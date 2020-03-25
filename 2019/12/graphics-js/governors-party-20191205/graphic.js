console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "total"];
var { COLORS, makeTranslate, classify } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  console.log(window.DATA)
  window.DATA = formatData(window.DATA);
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
  var newData = []
  data.forEach(function(d) {

    var partyTotals = {"D": 0, "R": 0, "I": 0};

    for (key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue
      }
      if (partyTotals[d[key]]) {
        partyTotals[d[key]] = partyTotals[d[key]] + 1
      }
      else {
        partyTotals[d[key]] = 1
      }
    }

    partyTotals.label = d.label

    console.log(partyTotals)


    d = partyTotals


    var y0 = 0;

    d.values = [];
    d.total = 0;

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

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
    newData.push(d)
  });
  console.log(newData)
  return newData;
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
    bottom: 35,
    left: 30
  };

  var ticksY = 3;
  var roundTicksFactor = 25;

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
    .range([COLORS.blue3, COLORS.red3, COLORS.yellow3]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", function(d, i) {
      return `key-item key-${i} ${classify(d)}`;
    });

  legend.append("b").style("background-color", d => colorScale(d));

  var partyKey = {"D": "Dem.", "R": "GOP", "I": "Ind."}

  legend.append("label").text(d => partyKey[d]);

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
    .tickFormat(d => isMobile.matches ? "'" + d.toString().slice(-2,) : d);

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .tickValues([0,25,50])
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

  // Render bars to chart.
  var bars = chartElement
    .selectAll(".bars")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", "bar")
    .attr("transform", d => makeTranslate(xScale(d[labelColumn]), 0));

  bars
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("y", d => d.y1 < d.y0 ? yScale(d.y0) : yScale(d.y1))
    .attr("width", xScale.bandwidth())
    .attr("height", d => Math.abs(yScale(d.y0) - yScale(d.y1)))
    .style("fill", d => colorScale(d.name))
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
  bars
    .selectAll("text")
    .data(function(d) {
      return d.values;
    })
    .enter()
    .append("text")
    .text(d => d.val)
    .attr("class", d => classify(d.name))
    .attr("x", xScale.bandwidth() / 2)
    .attr("y", function(d) {
      var textHeight = this.getBBox().height;
      var barHeight = Math.abs(yScale(d.y0) - yScale(d.y1));

      if (textHeight + valueGap * 2 > barHeight) {
        d3.select(this).classed("hidden", true);
      }

      var barCenter = yScale(d.y1) + (yScale(d.y0) - yScale(d.y1)) / 2;

      return barCenter + textHeight / 2;
    })
    .attr("text-anchor", "middle");


    // add in 25 line

    chartElement.append("line")
      .attr("x0", 0)
      .attr('x1', chartWidth)
      .attr("y1", yScale(25))
      .attr("y2", yScale(25))
      .attr('class', "line-25")




    // add in year top label

    chartWrapper.select("svg").append("text")
      .attr("x", chartWidth/2 + margins.left)
      .attr('y', chartHeight + margins.top  + margins.bottom )
      .attr('class', "year-label")
      .text("Year")
};

// Initially load the graphic
//(NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

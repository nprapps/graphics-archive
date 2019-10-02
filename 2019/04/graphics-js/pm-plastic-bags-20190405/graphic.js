var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var pymChild;

var { COLORS, classify, makeTranslate, wrapText } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();

//Initialize graphic
var onWindowLoaded = function() {
  formatData();
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

//Format graphic data for processing by D3.
var formatData = function() {
  // DATA.forEach(function(d) {
  //   var [m, day, y] = d.date.split("/").map(Number);
  //   y = y > 50 ? 1900 + y : 2000 + y;
  //   d.date = new Date(y, m - 1, day);
  // });

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (column == "date") continue;

    dataSeries.push({
      name: column,
      values: DATA.map(d => {
        return ({
          date: d.date,
          amt: d[column]
        })
      })
    });
  }
};

// Render the graphic(s). Called by pym with the container width.

var render = function() {
  // Render the chart!
  var container = "#line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data: dataSeries
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a line chart.
var renderLineChart = function(config) {
  // Setup

  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var labelWidth = isMobile.matches ? 76 : 90;
  var labelLineHeight = isMobile.matches ? 12 : 12;

  var margins = {
    top: 5,
    right: labelWidth,
    bottom: 50,
    left: 45
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 10;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;
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
    // .scaleTime()
    .scaleLinear()
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


  // Render the HTML legend.

  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
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
      return d;
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => {
      return (d > 0) ? "+" + d + "%" : d + "%";
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
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));


  var toHighlight = ['prod_4Gal','prod_8Gal','prod_13Gal','prod_30Gal'];
  var labels = ['4 Gal', '8 Gal', '13 Gal', '30 Gal']

  var colorScale = d3
    .scaleOrdinal()
    .domain(toHighlight)
    .range([
      COLORS.orange3,
      "#777",
      "#777",
      "#777",
      COLORS.teal3
    ]);


  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", d => "line " + classify(d.name))
    .attr("stroke", d => {
      return (toHighlight.includes(d.name)) ? colorScale(d.name) : "#bbb";
    })
    .attr("stroke-width", d => {
      return (toHighlight.includes(d.name)) ? "3px" : "1.5px";
    })
    .attr("opacity", d => {
      return (toHighlight.includes(d.name)) ? "1" : "0.3";
    })
    .attr("d", d => line(d.values));

  var lastItem = d => d.values[d.values.length - 1];

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", function(d) {
      var ypos = yScale(lastItem(d)[valueColumn]);
      var offset = 3;
      if (d3.select('body').classed('newsletter')) {
        if (d.name == "prod_13Gal") {
          offset = 1;
        }
        if (d.name == "prod_30Gal") {
          offset = 8;
        }
      }
      return ypos + offset;
    })
    .text(function(d) {
      if (!toHighlight.includes(d.name)) { return ''; }

      var label = d.name.replace('prod_','').replace('Gal','') + "-gallon bags"

      return label;

    })
    .attr("fill", d => {
      return (toHighlight.includes(d.name)) ? colorScale(d.name) : "#cdcdcd";
    });

  var axisLabel = chartElement
    .append("text")
    .html(LABELS.lbl_xaxis)
    .attr("class", "axis-label")
    .attr('x', chartWidth / 2)
    .attr('y', chartHeight + 40);
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

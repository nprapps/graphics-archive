var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var dataSeries = [];
var annotations = [];
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
var apMonths = [ 'Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.' ];


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

  DATA.forEach(function(d) {
    var [m, day, y] = d.date.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  var skipLabels = ["date", "annotate_states", "annotate_respondents"];

  // Restructure tabular data for easier charting.
  for (var column in DATA[0]) {
    if (skipLabels.includes(column)) continue;

    dataSeries.push({
      name: column,
      values: DATA.filter(d => d[column] != null).map(d => ({
        date: d.date,
        amt: d[column] * 100
      }))
    });


    // There are better ways of doing this

    if (column == "states") {
      DATA.filter(d => d["annotate_states"] != null).forEach(d => {
        var hasCustomLabel = d["annotate_states"] !== true;
        var label = hasCustomLabel ? d["annotate_states"] : null;
        annotations.push({
          date: d.date,
          amt: d[column] * 100,
          series: column,
          label: label
        })
      })
    } 

    if (column == "respondents") {
      DATA.filter(d => d["annotate_respondents"] != null).forEach(d => {
        var hasCustomLabel = d["annotate_respondents"] !== true;
        var label = hasCustomLabel ? d["annotate_respondents"] : '';
        annotations.push({
          date: d.date,
          amt: d[column] * 100,
          series: column,
          label: label
        })
      })
    }
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
    data: dataSeries,
    annotations: annotations
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

  var labelWidth = (isMobile.matches) ? 50 : 76;
  var labelLineHeight = (isMobile.matches) ? 12 : 13;

  var annotationXOffset = -2;
  var annotationYOffset = (isMobile.matches) ? -36 : -40;
  var annotationWidth = (isMobile.matches) ? 120 : 140;
  // var annotationLineHeight = 14;

  var margins = {
    top: 10,
    right: labelWidth + 10,
    bottom: 20,
    left: 36
  };

  var ticksX = 10;
  var ticksY = 10;
  var roundTicksFactor = 5;

  // Mobile
  if (isMobile.matches) {
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
      COLORS.orange3,
      COLORS.teal4,
      // COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

  // Render the HTML legend.

  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(config.data)
    .enter()
    .append("li")
    .attr("class", d => "key-item " + classify(d.name));

  legend.append("b").style("background-color", d => colorScale(d.name));

  legend.append("label").text(d => {
    return (d.name == "states") ? STATES_LEGEND_LABEL : RESPONDENTS_LEGEND_LABEL;
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
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return "\u2019" + fmtYearAbbrev(d);
      } else {
        return fmtYearFull(d);
      }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d + "%");

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
  var steppedLine = d3
    .line()
    .curve(d3.curveStepAfter)
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));

  var defaultLine = d3
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
    .attr("d", d => {
      return (d.name == "states") ? steppedLine(d.values) : defaultLine(d.values)
    });

  var lastItem = d => d.values[d.values.length - 1];

  var lineLabel = chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("x", d => xScale(lastItem(d)[dateColumn]) + 5)
    .attr("y", d => yScale(lastItem(d)[valueColumn]) + 3 + labelLineHeight)

  lineLabel
    .attr("fill", d => colorScale(d.name))
    .text(function(d) {
      var item = lastItem(d);
      var value = Number(item[valueColumn]).toFixed(0);
      return (d.name == "states") ? STATES_LABEL : `${value}%`;
    })
    .call(wrapText, labelWidth, labelLineHeight);

  // pretty janky
  lineLabel
    .insert("tspan", ":first-child")
    .attr("class", "date")
    .html(d => {
      return `${fmtYearFull(lastItem(d)[dateColumn])}:`;
    })
    .attr("dy", labelLineHeight * -1);


  // Render annotations?
  var annotation = chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter()

  annotation
    .append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(d[dateColumn]))
    .attr("cy", d => yScale(d[valueColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", 3);

  var annotationText = annotation
    .data(config.annotations.filter(d => {
      return d.label != null && d.label.length > 0;
    }))
    .append("text")
    .html(d => d.label)
    .attr("x", d => xScale(d[dateColumn]) + annotationXOffset)
    .attr("y", d => yScale(d[valueColumn]) + annotationYOffset)
    .attr("fill", d  => colorScale(d.series))
    .call(wrapText, annotationWidth, labelLineHeight);

  // pretty janky
  annotationText
    .insert("tspan", ":first-child")
    .attr("class", "date")
    .html(d => {
      return `${fmtYearFull(d[dateColumn])}:`;
    })
    .attr("dy", labelLineHeight * -1);


};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

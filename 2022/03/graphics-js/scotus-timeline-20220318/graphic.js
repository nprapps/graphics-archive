var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var charts = [];

// Global vars
var pymChild = null;
var skipLabels = ["label", "values", "offset", "chart","id", "total"];

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle } = require("./lib/helpers");

// Initialize the graphic.
var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    var x0 = 0;

    d.values = [];

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      d[key] = d[key];

      var x1 = x0 + d[key];

      // console.log(typeof d[key])
      if (typeof d[key] != "string") {
        d.values.push({
          name: key,
          x0: x0,
          x1: x1,
          val: d[key]
        });

        x0 = x1;
      }
    }
  });

  charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  console.log(DATA);
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(DATA[1]).filter(d => skipLabels.indexOf(d) == -1)
    )
    .range([ COLORS.teal5, COLORS.teal3, COLORS.teal1]);

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain().concat(["Seat not confirmed"]))
    .enter()
      .append("li")
      .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  // console.log(colorScale.domain().concat(["Seat Not Confirmed"]);

  legend.append("b")
    .style("background-color", d => d != "Seat not confirmed" ? colorScale(d) : "")
    .attr("id", (d, i) => `b-${i}`)

  legend.append("label").text(function(d){
    return d;
  });

  // remove awkward spacing
  var elem = document.getElementById("b-3");
  elem.innerHTML = "\u2715"
  // elem.parentNode.removeChild(elem);

  var dems = ['obama', 'clinton','biden']
  charts.forEach(function(d,i) {
    var chartData = DATA.filter(function(v) {
      return v.chart == d;
    });

    var isDem = (dems.includes(classify(d))) ? "dem": "";

    containerElement.append('div')
      .attr('class', 'chart ' + classify(d) + ' ' + isDem);

    var showLegend = (d == "Overall") ? true : false;
    var showTitle = (d == "Overall") ? false: true;

    renderStackedBarChart({
      container: container + ' .chart.' + classify(d),
      width,
      data: chartData,
      colorScale,
      xDomain: [ -95, 95 ],
      title: d,
      showLegend,
      showTitle
    });
  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderLegend = function(config) {
  var containerElement = d3.select(config.container);
  var colorScale = config.colorScale;

  // Render the legend.
  var legend = containerElement
    .append("ul")
    .attr("class", "key")
    .selectAll("g")
    .data(colorScale.domain())
    .enter()
    .append("li")
    .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

  legend.append("b").style("background-color", colorScale);

  legend.append("label").text(d => d);
}

// Render a stacked bar chart.
var renderStackedBarChart = function(config) {
  // Setup
  var labelColumn = "label";

  // var barHeight = 55;
  var barHeight = 4;
  var barGap = 20;

  var labelWidth = 105;
  var labelMargin = 10;
  var valueGap = 6;
  var circleRadius = 5;

  var margins = {
    top: 0,
    right: 345,
    bottom: 0,
    left: labelWidth + labelMargin
  };

  // Mobile
  if (isMobile.matches) {
    ticksX = 4;
    max = 150;
    marginAxis = 130;
    margins.right = 365;
    circleRadius = 4;
  }

  var ticksX = 4;
  var roundTicksFactor = 20;
  var max = 150;
  var marginAxis = 320;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  if (config.title && config.showTitle) {
    containerElement.append('h3')
      .html(config.title)
      .attr("class", config.title);
  }

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
  var floors = values.map(
    v => Math.floor(v / roundTicksFactor) * roundTicksFactor
  );
  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min(...floors);
  // var max = Math.max(...ceilings);

  if (min > 0) {
    min = 0;
  }

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .rangeRound([0, chartWidth + marginAxis]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(d => skipLabels.indexOf(d) == -1)
    )
    .range([ COLORS.yellow3, COLORS.teal3, COLORS.orange3 ]);

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
    .tickFormat(d => `${d} days`);

  var xAxisBottom = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => `${d} days`);

  // Render axes to chart.
  if (config.title == "Biden") {
    chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, -10))
    .call(xAxis);
  }

  if (config.title == "Ford") {
    chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, 30))
    .call(xAxisBottom);
  }

    // Render axes to chart.
    if (config.title == "Biden") {
      var additional = 10;
    // } else if (config.title == "G. H. W. Bush"){
    //   var additional = 50;
    } else {
      var additional = 60;
    }

    // Render grid to chart.
    var xAxisGrid = () => xAxis;

    chartElement
      .append("g")
      .attr("class", "x grid")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(
        xAxisGrid()
          .tickSize(chartHeight + additional, 0, 0)
          .tickFormat("")
      );

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d.id))
    .attr(
      "transform",
      (d, i) => "translate(0," + ((i * (barHeight + barGap))+10) + ")"
    );

  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", '#ccc')
    .attr("class", d => classify(d.name));

  group
    .selectAll("circle")
    .data(d => d.values)
    .enter()
    .append("circle")
    .attr("cx", d => (d.x0 < d.x1 ? xScale(d.x0) + Math.abs(xScale(d.x1) - xScale(d.x0)) : xScale(d.x1) + Math.abs(xScale(d.x1) - xScale(d.x0))))
    // .attr("cx", function(d) {
    //   if (d.val) {
    //     return d.x0 < d.x1 ? xScale(d.x0) + Math.abs(xScale(d.x1) - xScale(d.x0)) : xScale(d.x1) + Math.abs(xScale(d.x1) - xScale(d.x0));
    //   }
    // })
    .attr("cy", barHeight/2)
    .attr("r",  circleRadius)
    // .style("fill", d => colorScale(d.name))
    .attr("class", d => classify(d.name));

  // render bar values
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(function() {
      console.log(config.data)
      return config.data;
    })
    .enter()
    .append("text")
    .text(d => "Total: " + d.total.toFixed(0) + " days")
    .attr("x", d => xScale(d.total) + 5)
    .attr("y", (d, i) => i * (barHeight + barGap) + 11)
    .attr("dx", function(d) {
      var xStart = xScale(d.total);
      var textWidth = this.getComputedTextLength();

      // Negative case
      if (d.total < 0) {
        var outsideOffset = -(valueGap + textWidth);

        if (xStart + outsideOffset < 0) {
          d3.select(this).classed("in", true);
          return valueGap;
        } else {
          d3.select(this).classed("out", true);
          return outsideOffset;
        }
        // Positive case
      } else {
        // if (xStart + valueGap + textWidth > chartWidth) {
          // d3.select(this).classed("in", true);
          // return -(valueGap + textWidth);
        // } else {
          d3.select(this).classed("out", true);
          return valueGap;
        // }
      }
    })
    .attr("dy", barHeight / 2 + 3);

  // d3.select(".amy-coney-barrett")
  //   .selectAll(".line1")
  //   .data(config.data)
  //   .enter()
  //   .append("line")
  //   .attr('x1', xScale(39))
  //   .attr('x2', xScale(39))
  //   .attr("y1", -5)
  //   .attr("y2", 10)
  //   // .attr("class", "expected-line")
  //   .attr('class', d => `${classify(d.label)} expected-line line1`)

  // d3.select(".amy-coney-barrett")
  //   .append("text")
  //   .attr("class","election-day")
  //   .attr("x", xScale(39)+5)
  //   .attr("y", 7)
  //   .text("Election Day, 2020")

  d3.select(".merrick-garland")
    .append("text")
    .attr("class","election-day")
    .attr("x", 70)
    .attr("y", 7)
    .text("\u2715")

  d3.select(".harriet-miers")
    .append("text")
    .attr("class","election-day")
    .attr("x", 70)
    .attr("y", 7)
    .text("\u2715")

  d3.select(".robert-bork")
    .append("text")
    .attr("class","election-day")
    .attr("x", xScale(114) + 80)
    .attr("y", 7)
    .text("\u2715")

  // Render bar values.
  // group
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(d => d.values)
  //   .enter()
  //   .append("text")
  //   .text(function(d) {
  //     return d.val > 6 ? `${d.val.toFixed(0)} days` : null;
  //   })
  //   .attr("class", d => classify(d.name))
  //   .attr("x", d => xScale(d.x1))
  //   .attr("dx", function(d) {
  //     var textWidth = this.getComputedTextLength();
  //     var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

  //     // Hide labels that don't fit
  //     if (textWidth + valueGap > barWidth) {
  //       d3.select(this).classed("hidden", true);
  //     } else if (textWidth + valueGap > barWidth) {
  //       d3.select(this).classed("centered", true);
  //       return -(valueGap + (textWidth / 2));
  //     }

  //     if (d.x1 < 0) {
  //       return valueGap;
  //     }

  //     return -(valueGap + textWidth) - 4;
  //   })
  //   .attr("dy", barHeight / 2 + 0);

  // Render 0-line.
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", chartHeight);
  }

  // Render bar labels.
  chartWrapper
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
      })
    )
    .selectAll("li")
    .data(config.data)
    .enter()
    .append("li")
    .attr("style", (d, i) =>
      formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + 4 + "px;"
      })
    )
    .attr("class", d => classify(d[labelColumn]))
    .append("span")
    .text(d => d[labelColumn]);
};
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

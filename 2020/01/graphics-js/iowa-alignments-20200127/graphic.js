// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;

var { COLORS, makeTranslate, classify, formatStyle, fmtComma, wrapText } = require("./lib/helpers");

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-fetch/dist/d3-fetch.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

// Initialize the graphic.
var onWindowLoaded = function() {
  // formatData();
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
var render = function() {

  // Format data
  d3.json("iowa_alignments.json").then(function(data) {
    // filter down to a single race, pop that to get the race, then access its results
    var filterOut = ["61562", "59911", "62589", "32324", "51516", "100007"];
    var first = data.races.filter(r => r.id == "17277").pop().results[0];
    var final = data.races.filter(r => r.id == "17278").pop().results[0];
    var firstFiltered = first.candidates.filter(r => !filterOut.includes(r.id));
    var finalFiltered = final.candidates.filter(r => !filterOut.includes(r.id));
    var diff = [];

    // push into array object
    for (var i = 0; i < firstFiltered.length; i++) {
      diff.push({
        label: finalFiltered[i].last,
        first: firstFiltered.find(r => r.id == finalFiltered[i].id).percentage,
        final: finalFiltered[i].percentage,
        diff: finalFiltered[i].percentage - firstFiltered.find(r => r.id == finalFiltered[i].id).percentage // difference between votes
      });
    }

    console.clear();
    console.log(first, final, firstFiltered, finalFiltered, diff);

  // Render the chart!
  var container = "#dumbbell-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderDumbChart({
    container,
    width,
    data: diff
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }

  })
};

// Render a bar chart.
var renderDumbChart = function(config) {
  // Setup
  var labelColumn = "label";
  var firstColumn = "first";
  var finalColumn = "final";
  var diffColumn = "diff";

  var barHeight = 30;
  var barGap = 15;
  var labelWidth = 80;
  var labelMargin = 8;
  var resultLabelWidth = 80;
  var valueGap = 5;

  var margins = {
    top: 30,
    right: (resultLabelWidth + labelMargin) * 2,
    bottom: 20,
    left: labelWidth + labelMargin
  };

  if (isMobile.matches) {
    margins.right = 15;
    barGap = 20;
    valueGap = 5;
  }

  var ticksX = 5;
  var roundTicksFactor = 5;

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      ["Increased", "Decreased"]
    )
    .range([
      COLORS.blue3,
      COLORS.orange3
    ]);

  // Render HTML legend
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
  var floors = config.data.map(
    d => Math.floor(d[finalColumn] / roundTicksFactor) * roundTicksFactor
  );

  var min = Math.min.apply(null, floors);

  if (min > 0) {
    min = 0;
  }

  var ceilings = config.data.map(
    d => Math.ceil(d[finalColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max.apply(null, ceilings);

  var xScale = d3
    .scaleLinear()
    .domain([0, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d) {
      return d + "%";
    });

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = function() {
    return xAxis;
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

  //Render guiding lines
  chartElement
    .append("g")
    .attr("class", "guiding-lines")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("x1", xScale(0))
    .attr("x2", function(d, i) {
      return xScale(max);
    })
    .attr('y1', function(d, i) {
      return i * (barHeight + barGap) + (barHeight / 2);
    })
    .attr('y2', function(d, i) {
      return i * (barHeight + barGap) + (barHeight / 2);
    });

  //Render range arrows to chart.
  var hex = {"blue": "#51AADE", "orange": "#E38D2C", "grey": "#d3d3d3"};
    function marker(color) {
        chartElement.append("svg:defs").append("svg:marker")
        .attr("id", "arrow-" + color)
        .attr("refX", function() {
            if (isMobile) {
                return 4;
            }
            return 3;
        })
        .attr("refY", 3)
        .attr("viewBox", "0 0 13 13")
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,0 L0,6 L6,3 z")
        .attr("fill", hex[color]);
    };
    marker("blue");
    marker("orange");
    // marker("grey");

  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr('x1', function(d) {
              return xScale(d[firstColumn]);
          })
          .attr('x2', function(d) {
              if (d[firstColumn] < d[finalColumn]) {
                  return xScale(d[finalColumn] + 0.5);
              } else {
                  return xScale(d[finalColumn] - 0.5);
              }
          })
          .attr('y1', function(d, i) {
              return i * (barHeight + barGap) + (barHeight / 2);
          })
          .attr('y2', function(d, i) {
              return i * (barHeight + barGap) + (barHeight / 2);
          })
          .attr('marker-end', function(d) {
              if (d[firstColumn] < d[finalColumn]) {
                  return 'url(#arrow-blue)';
              } else if (d[firstColumn] == d[finalColumn]) {
                  return 'url(#arrow-grey)';
              } else {
                  return 'url(#arrow-orange)';
              }

          })
          .attr("stroke", function(d) {
              if (d[firstColumn] < d[finalColumn]) {
                  return "#51AADE";
              } else if (d[firstColumn] == d[finalColumn]) {
                return "#d3d3d3";
              } else {
                  return "#E38D2C";
              }
          });

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
    .attr("style", function(d, i) {
      return formatStyle({
        width: labelWidth + "px",
        height: barHeight + "px",
        left: "0px",
        top: i * (barHeight + barGap) + "px"
      });
    })
    .attr("class", function(d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .text(d => d[labelColumn]);

  // Render alignment bar values on mobile.
  if (isMobile.matches) {
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(function(d) {
      if (d[diffColumn] < 0 ) {
        return d[firstColumn].toFixed(1) + "%" + " (" + d[diffColumn].toFixed(1) + " pts.)";
      } else {
        return d[finalColumn].toFixed(1) + "% (+" + d[diffColumn].toFixed(1) + " pts.)";
      }
    })
    .attr("x", function(d) {
      var textWidth = this.getComputedTextLength();

      if (d[diffColumn] < 0) { // if the arrow is orange, start label at left
        return xScale(d[finalColumn]);
      } else if (textWidth > xScale(d[finalColumn])) { // if arrow if blue and there's not enough room for label, also start at left
        return xScale(d[firstColumn]);
      } else { // start at right
        return xScale(d[firstColumn]) - (textWidth - xScale(d[diffColumn]) - 15);
      }
    })
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dx", function(d) {
      var xStart = xScale(d[finalColumn]);
      var textWidth = this.getComputedTextLength();

      d3.select(this).classed("in", true);
      return -(valueGap);
    })
    .attr("dy", function(d) {
      return barHeight + 3;
    })
    .style("fill", function(d) {
      if (d[finalColumn] > d[firstColumn]) {
        return "#51AADE";
      } else if (d[finalColumn] == d[firstColumn]) {
        return "#999";
      } else {
        return "#E38D2C";
      }
    })
  }

  // Results headers + line
  if (!isMobile.matches) {
    chartElement
      .append("text")
      .text("First")
      .attr("class", "header")
      .attr("transform", makeTranslate((chartWidth + resultLabelWidth - 10), -barGap));

    chartElement
      .append("text")
      .text("Final")
      .attr("class", "header")
      .attr("transform", makeTranslate((chartWidth + margins.right - 20), -barGap));

    chartElement
      .append("line")
      .attr("x1", chartWidth + resultLabelWidth + 10)
      .attr("y1", 0)
      .attr("x2", chartWidth + resultLabelWidth + 10)
      .attr("y2", chartHeight)
      .attr("stroke-width", 1)
      .attr("stroke", "#eee");
  }

  // Return first results to right column
  if (!isMobile.matches) {
    chartWrapper
      .append("ul")
      .attr("class", "results")
      .attr(
        "style",
        formatStyle({
          width: resultLabelWidth + "px",
          top: margins.top + "px",
          left: (margins.left + chartWidth) + "px"
        })
      )
      .selectAll("li")
      .data(config.data)
      .enter()
      .append("li")
      .attr("style", function(d, i) {
        return formatStyle({
          width: resultLabelWidth + "px",
          height: barHeight + "px",
          left: "5px",
          top: i * (barHeight + barGap) + "px"
        });
      })
      .attr("class", function(d) {
        return classify(d[labelColumn] + "-first");
      })
      .append("span")
      .text(d => d[firstColumn].toFixed(1) + "%");
  }

  // Return final results to right column
  if (!isMobile.matches) {
    chartWrapper
      .append("ul")
      .attr("class", "results final")
      .attr(
        "style",
        formatStyle({
          width: resultLabelWidth + "px",
          top: margins.top + "px",
          left: (margins.left + chartWidth + resultLabelWidth) + "px"
        })
      )
      .selectAll("li")
      .data(config.data)
      .enter()
      .append("li")
      .attr("style", function(d, i) {
        return formatStyle({
          width: resultLabelWidth + "px",
          height: barHeight + "px",
          left: "5px",
          top: i * (barHeight + barGap) + "px"
        });
      })
      .append("span")
      .text(d => d[finalColumn].toFixed(1) + "%")
      .append("span")
      .text(function(d) {
        var prefix = "";
        if (d[diffColumn] > 0) {
          prefix =  "+";
        }
        return prefix + d[diffColumn].toFixed(1) + " pts.";
      })
      .style("color", function(d) {
        if (d[finalColumn] > d[firstColumn]) {
          return "#51AADE";
        } else if (d[finalColumn] == d[firstColumn]) {
          return "#999";
        } else {
          return "#E38D2C";
        }
      });
  }

};

// Initially load the graphic
window.onload = onWindowLoaded;

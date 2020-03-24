var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;
var skipLabels = ["label", "values"];

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify, makeTranslate, formatStyle, wrapText } = require("./lib/helpers");

// Initialize the graphic.
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

// Format graphic data for processing by D3.
var formatData = function() {
  DATA.forEach(function(d) {
    var x0 = 0;

    d.values = [];

    for (var key in d) {
      if (skipLabels.indexOf(key) > -1) {
        continue;
      }

      var x1 = x0 + d[key];

      d.values.push({
        name: key,
        x0: x0,
        x1: x1,
        val: d[key]
      });

      x0 = x1;

      // console.log(d.values);
    }
  });
};

// Render the graphic(s). Called by pym with the container width.
var render = function() {
  // Render the chart!
  var container = "#stacked-bar-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderStackedBarChart({
    container,
    width,
    data: DATA
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a stacked bar chart.
var renderStackedBarChart = function(config) {
  // Setup
  var labelColumn = "label";

  var barHeight = 50;
  var barGap = 5;
  var labelWidth = 50;
  var labelMargin = 6;
  var valueGap = 6;

  var margins = {
    top: 60,
    right: 20,
    bottom: 170,
    left: 0
    // left: labelWidth + labelMargin
  };

  var ticksX = 4;
  var roundTicksFactor = 100;

  if (isMobile.matches) {
    ticksX = 4;
    margins.top = 70;
    margins.bottom = 170;
    margins.right = 30;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = (barHeight + barGap) * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var values = config.data.map(d => d.values[d.values.length - 1].x1);
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

  var xScale = d3
    .scaleLinear()
    .domain([0, 180])
    .rangeRound([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      Object.keys(config.data[0]).filter(d => skipLabels.indexOf(d) == -1)
    )
    .range([COLORS.teal5, COLORS.teal4, COLORS.teal3, COLORS.teal2, COLORS.teal1]);

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
    .tickFormat(d => "$" + d + "B");

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // Render grid to chart.
  var xAxisGrid = () => xAxis;

  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(
      xAxisGrid()
        .tickSize(-chartHeight, 0, 0)
        .tickFormat("")
    );

  // Render bars to chart.
  var group = chartElement
    .selectAll(".group")
    .data(config.data)
    .enter()
    .append("g")
    .attr("class", d => "group " + classify(d[labelColumn]))
    .attr(
      "transform",
      (d, i) => "translate(0," + i * (barHeight + barGap) + ")"
    );

  group
    .selectAll("rect")
    .data(d => d.values)
    .enter()
    .append("rect")
    .attr("x", d => (d.x0 < d.x1 ? xScale(d.x0) : xScale(d.x1)))
    .attr("width", d => Math.abs(xScale(d.x1) - xScale(d.x0)))
    .attr("height", barHeight)
    .style("fill", d => colorScale(d.name))
    .attr("class", d => classify(d.name));

  // Render bar values.
  group
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(d => d.values)
    .enter()
    .append("text")
    .text(d => (d.val ? "$" + d.val + "B" : null))
    .attr("class", d => classify(d.name))
    .attr("x", d => xScale(d.x1))
    .attr("dx", function(d) {
      var textWidth = this.getComputedTextLength();
      var barWidth = Math.abs(xScale(d.x1) - xScale(d.x0));

      // Hide labels that don't fit
      if (textWidth + valueGap * 2 > barWidth) {
        d3.select(this).classed("hidden", true);
      }

      if (d.x1 < 0) {
        return valueGap;
      }

      return -(valueGap + textWidth);
    })
    .attr("dy", barHeight / 2 + 4);

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
  // chartWrapper
  //   .append("ul")
  //   .attr("class", "labels")
  //   .attr(
  //     "style",
  //     formatStyle({
  //       width: labelWidth + "px",
  //       top: margins.top + "px",
  //       left: "0"
  //     })
  //   )
  //   .selectAll("li")
  //   .data(config.data)
  //   .enter()
  //   .append("li")
  //   .attr("style", (d, i) =>
  //     formatStyle({
  //       width: labelWidth + "px",
  //       height: barHeight + "px",
  //       left: "0px",
  //       top: i * (barHeight + barGap) + "px;"
  //     })
  //   )
  //   .attr("class", d => classify(d[labelColumn]))
  //   .append("span")
  //   .text(d => d[labelColumn]);

  //Render pullout labels
  var pullLabels = chartElement
    .append('g')
    .attr('class', 'pull-labels')
    .selectAll('text')
    .data(config.data)
    .enter()
    .append('g')
    .attr('class', d => d.name)

  // pullLabels.selectAll('circle')
  //   .data(d => d.values)
  //   .enter()
  //   .append('circle')
  //   .attr('class', function(d, i) {
  //     return "circle-" + i;
  //   })
  //   .attr('cx', function(d) {
  //     // console.log(d.x0);
  //     return xScale(d.val / 2) + xScale(d.x0);
  //   })
  //   .attr('cy', function(d, i) {
  //     return setLineYPos(1, i, chartHeight - (barHeight / 8));
  //   })
  //   .attr('r', 3);

  pullLabels.selectAll('line')
    .data(d => d.values)
    .enter()
    .append('line')
    .attr('class', function(d, i) {
      return "line-" + i;
    })
    .attr('x1', d => xScale(d.val / 2) + xScale(d.x0))
    .attr('x2', d => xScale(d.val / 2) + xScale(d.x0))
    .attr('y1', function(d, i) {
    return setLineYPos(1, i, chartHeight - (barHeight / 8));
  })
  .attr('y2', function(d, i) {
    return setLineYPos(2, i, chartHeight - (barHeight / 8));
  });

  pullLabels.selectAll('text')
    .data(d => d.values)
    .enter()
    .append('text')
    .text(d => d.name)
    .attr("class", d => classify(d.name))
    .attr('x', d => xScale(d.val / 2) + xScale(d.x0))
    .attr('y', function(d, i) {
      return setLabelYPos(i, chartHeight - (barHeight / 4));
    })
    .attr('fill', d => colorScale(d.name))
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
      })
    ).call(wrapText, margins.right - 10, 14);

  //Render top pullout labels
  var topLabels = chartElement
    .append('g')
    .attr('class', 'top-labels')
    .selectAll('text')
    .data(config.data)
    .enter()
    .append('g')
    .attr('class', d => d.name);

  // topLabels.selectAll('circle')
  //   .data(d => d.values)
  //   .enter()
  //   .append('circle')
  //   .attr('class', function(d, i) {
  //     return "circle-" + i;
  //   })
  //   .attr('cx', function(d) {
  //     // console.log(d.x0);
  //     return xScale(d.val / 2) + xScale(d.x0);
  //   })
  //   .attr('cy', function(d, i) {
  //     return setLineYPos(1, i, chartHeight - (barHeight * 2.5));
  //   })
  //   .attr('r', 3);

  topLabels.selectAll('line')
    .data(d => d.values)
    .enter()
    .append('line')
    .attr('class', function(d, i) {
      return "line-" + i;
    })
    .attr('x1', d => xScale(d.val / 2) + xScale(d.x0))
    .attr('x2', d => xScale(d.val / 2) + xScale(d.x0))
    .attr('y1', function(d, i) {
      return setTopLineYPos(1, i, chartHeight - (barHeight * 2.4));
    })
    .attr('y2', function(d, i) {
      return setTopLineYPos(2, i, chartHeight - (barHeight * 2.4));
    });

  topLabels.selectAll('text')
    .data(d => d.values)
    .enter()
    .append('text')
    .text(d => d.name)
    .attr("class", d => classify(d.name))
    .attr('x', d => xScale(d.val / 2) + xScale(d.x0))
    .attr('y', function(d, i) {
      return setTopLabelYPos(i, chartHeight - (barHeight * 2.4));
    })
    .attr('fill', d => colorScale(d.name))
    .attr(
      "style",
      formatStyle({
        width: labelWidth + "px",
        top: margins.top + "px",
        left: "0"
      })
    ).call(wrapText, margins.right - 10, 14);

};

var setLineYPos = function(k, i, chartHeight) {
  var labelPos = setLabelYPos(i, chartHeight);
  switch(k) {
    case 1:
      if (labelPos < 0) {
        return 0;
      } else {
        return chartHeight;
      }
      break;
    case 2:
      if (labelPos < 0) {
        return -10;
      } else {
        return labelPos - 10;
      }
      break;
  }
}

var setLabelYPos = function(i, chartHeight) {
  if (isMobile.matches && i == 4) {
    return chartHeight + 60;
  } else if (i == 4) {
    return chartHeight + 80;
  } else {
    return chartHeight + 30;
  }
}

var setTopLineYPos = function(k, i, chartHeight) {
  var labelPos = setLabelYPos(i, chartHeight);
  switch(k) {
    case 1:
      if (labelPos < 0) {
        return 0;
      } else {
        return chartHeight;
      }
      break;
    case 2:
      if (labelPos < 0) {
        return -10;
      } else {
        return labelPos - 10;
      }
      break;
  }
}

var setTopLabelYPos = function(i, chartHeight) {
  if (i == 2) {
    return chartHeight + 5;
  } else if (i == 1) {
    return chartHeight + 20;
  } else if (isMobile.matches && i == 3) {
    return chartHeight + 5;
  } else {
    return chartHeight + 35;
  }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

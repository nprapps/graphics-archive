console.clear();

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

var { COLORS, makeTranslate, classify, wrapText } = require("./lib/helpers");

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
    top: 49,
    right: 5,
    bottom: 10,
    left: 45
  };

  if (isMobile.matches) {
    margins.top = 55
  }

  var ticksY = 5;
  var roundTicksFactor = 50000000;

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

  var legendVals = ["a", 'b']
  // var partiesStr = "(Dem/GOP/Reform)"

  var colorScale = d3
    .scaleOrdinal()
    .domain(legendVals)
    .range([COLORS.teal2, COLORS.teal6, COLORS.orange2, COLORS.blue4, COLORS.red4, COLORS.orange3 ]);

  var legend1 = containerElement.append("ul").attr("class", "key key1")
  .selectAll("g")
  .data(legendVals.splice(0,1))
  .enter()
  .append("li")
  .attr("class", function(d, i) {
    return `key-item key-${i} ${classify(d)}`;
  });
  legend1.append("b").style("background-color", d => colorScale(d));
  d3.select(".key1").append("label").text('Self-funding');

  var legend2 = containerElement.append("ul").attr("class", "key key2")
  .selectAll("g")
  .data(legendVals)
  .enter()
  .append("li")
  .attr("class", function(d, i) {
    return `key-item key-${i} ${classify(d)}`;
  });
  legend2.append("b").style("background-color", d => colorScale(d));
  d3.select(".key2").append("label").text('Other fundraising');



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
    .domain(config.data.map(d => d[labelColumn]));

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

  var max = 350000000;

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // Create D3 axes.
  // var xAxis = d3
  //   .axisBottom()
  //   .scale(xScale)
  //   .tickFormat(function(d, i) {
  //     return d;
  //   })




  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => "$" + fmtComma((d / 1000000).toFixed(0)) + "M");

  // Render axes to chart.
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight));
  // .call(xAxis);

  var wrapTextLH = 13;


  if (isMobile.matches) {
    wrapTextLH = 10;
  }



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
    .attr("x", d => xScale(d[labelColumn]))
    .attr("y", d => (d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn])))
    .attr("width", xScale.bandwidth())
    .attr("height", d =>
      d[valueColumn] < 0
        ? yScale(d[valueColumn]) - yScale(0)
        : yScale(0) - yScale(d[valueColumn])
    )
    .attr("class", function(d) {
      return "bar bar-" + classify(d[labelColumn]) + " " + d.party + "-party";
    });

  // Render self-funding bars to chart.
  var selfValueColumn = "self_amt";

  chartElement
    .append("g")
    .attr("class", "self-bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d[labelColumn]))
    .attr("y", d =>
      d[selfValueColumn] < 0 ? yScale(0) : yScale(d[selfValueColumn])
    )
    .attr("width", xScale.bandwidth())
    .attr("height", d =>
      d[selfValueColumn] < 0
        ? yScale(d[selfValueColumn]) - yScale(0)
        : yScale(0) - yScale(d[selfValueColumn])
    )
    .attr("class", function(d) {
      return "bar self-bar-" + d[labelColumn] + " " + d.party + "-party";
    });


  chartElement
    .selectAll("text.xaxis")
    .data(config.data)
    .enter()
    .append("text")
    .attr("fill", "currentcolor")
    .attr("class", function(d,i) {
      return "xaxis-faketext " + classify(d[labelColumn].split(": ")[1] + "-" + i)
    })
    .attr("x", function(d, i) {
      return xScale(d[labelColumn]) + xScale.bandwidth() / 2;
    })
    .attr("y", function(d) {
      if (isMobile.matches) {
        return yScale(d[valueColumn]) - 35
      }
      else {
        return d[labelColumn].indexOf("Huntsman") > -1 ? yScale(d[valueColumn]) - 24 : yScale(d[valueColumn]) - 22
      }
    })
    .text(d => d[labelColumn])
    .call(wrapText, xScale.bandwidth() + 9, wrapTextLH);


  d3.selectAll('.xaxis-faketext').each(function(d, i) {
    var paddingVertical = 0


    var thisClass = classify(d[labelColumn].split(": ")[1] + "-" + i)

    var $thisElement = d3.select('.' + thisClass)


    var thisHeight = $thisElement.node().getBBox().height
    var thisY = $thisElement.node().getBBox().y

    console.log(d)
    console.log(thisClass)
    console.log(thisHeight)
    console.log(yScale(d[valueColumn]))
    console.log($thisElement.text())



    console.log(thisY)

    var newY = yScale(d[valueColumn]) - paddingVertical - thisHeight
    console.log(newY)

    $thisElement.attr("y", newY)
    $thisElement.selectAll("tspan").attr("y", newY)

    var thisY = $thisElement.node().getBBox().y
    console.log(thisY)


  })




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

  var showValThreshold = 20000000;
  if (isMobile.matches) {
    showValThreshold = 25000000;
  }
  var scootUpPx = 5;

  if (isMobile.matches) {
    scootUpPx = scootUpPx + 2;
  }

  //   // Render "TOTAL" text.
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .text(function(d) {
  //     if (d[valueColumn] - d[selfValueColumn] > showValThreshold) {
  //       return "Total:"
  //     }
  //     else {return}
  //   })
  //   .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
  //   .attr("y", d => yScale(d[valueColumn]) - scootUpPx)
  //   .attr("dy", function(d) {
  //     var textHeight = this.getBBox().height;
  //     var $this = d3.select(this);
  //     var barHeight = 0;

  //     if (d[valueColumn] < 0) {
  //       barHeight = yScale(d[valueColumn]) - yScale(0);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return -(textHeight - valueGap / 2);
  //       } else {
  //         $this.classed("out", true);
  //         return textHeight + valueGap;
  //       }
  //     } else {
  //       barHeight = yScale(0) - yScale(d[valueColumn]);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return textHeight + valueGap;
  //       } else {
  //         $this.classed("out", true);
  //         return -(textHeight - valueGap / 2);
  //       }
  //     }
  //   })
  //   .attr("text-anchor", "middle");

  // // Render bar values.
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .text(function(d) {
  //     if (d[valueColumn] - d[selfValueColumn] > showValThreshold) {
  //       return "$" + (d[valueColumn]/1000000).toFixed(0) + "M"
  //     }
  //     else {
  //       return
  //     }
  //   })
  //   .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
  //   .attr("y", d => yScale(d[valueColumn]) + 12 - scootUpPx)
  //   .attr("dy", function(d) {
  //     var textHeight = this.getBBox().height;
  //     var $this = d3.select(this);
  //     var barHeight = 0;

  //     if (d[valueColumn] < 0) {
  //       barHeight = yScale(d[valueColumn]) - yScale(0);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return -(textHeight - valueGap / 2);
  //       } else {
  //         $this.classed("out", true);
  //         return textHeight + valueGap;
  //       }
  //     } else {
  //       barHeight = yScale(0) - yScale(d[valueColumn]);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return textHeight + valueGap;
  //       } else {
  //         $this.classed("out", true);
  //         return -(textHeight - valueGap / 2);
  //       }
  //     }
  //   })
  //   .attr("text-anchor", "middle");

  //   // Render "SELF" text.
  // chartElement
  //   .append("g")
  //   .attr("class", "value")
  //   .selectAll("text")
  //   .data(config.data)
  //   .enter()
  //   .append("text")
  //   .text(function(d) {
  //     if (d[selfValueColumn] > showValThreshold) {
  //       return "Self:"
  //     }
  //     return
  //   })
  //   .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
  //   .attr("y", d => yScale(d[selfValueColumn]) - scootUpPx)
  //   .attr("dy", function(d) {
  //     var textHeight = this.getBBox().height;
  //     var $this = d3.select(this);
  //     var barHeight = 0;

  //     if (d[selfValueColumn] < 0) {
  //       barHeight = yScale(d[selfValueColumn]) - yScale(0);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return -(textHeight - valueGap / 2);
  //       } else {
  //         $this.classed("out", true);
  //         return textHeight + valueGap;
  //       }
  //     } else {
  //       barHeight = yScale(0) - yScale(d[selfValueColumn]);

  //       if (textHeight + valueGap * 2 < barHeight) {
  //         $this.classed("in", true);
  //         return textHeight + valueGap;
  //       } else {
  //         $this.classed("out", true);
  //         return -(textHeight - valueGap / 2);
  //       }
  //     }
  //   })
  //   .attr("text-anchor", "middle");

  // Render self bar values.
  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .text(function(d) {
      if (d[selfValueColumn] > showValThreshold) {
        return "$" + (d[selfValueColumn] / 1000000).toFixed(0) + "M";
      }
    })
    .attr("x", d => xScale(d[labelColumn]) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d[selfValueColumn]) - scootUpPx)
    .attr("dy", function(d) {
      var textHeight = this.getBBox().height;
      var $this = d3.select(this);
      var barHeight = 0;

      if (d[selfValueColumn] < 0) {
        barHeight = yScale(d[selfValueColumn]) - yScale(0);

        if (textHeight + valueGap * 2 < barHeight) {
          $this.classed("in", true);
          return -(textHeight - valueGap / 2);
        } else {
          $this.classed("out", true);
          return textHeight + valueGap;
        }
      } else {
        barHeight = yScale(0) - yScale(d[selfValueColumn]);

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

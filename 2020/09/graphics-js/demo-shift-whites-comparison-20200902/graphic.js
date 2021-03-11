// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var charts = [];
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
  // Render the chart!
  var container = "#dumbbell-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var containerElement = d3.select(container);
  containerElement.html("");

  charts = DATA.map(o => o['chart']); // equivalent of underscore _.pluck
  charts = Array.from(new Set(charts)); // dedupe / _.uniq

  charts.forEach(function(d,i) {
    var chartData = DATA.filter(function(v) {
      return v.chart == d;
    });

    containerElement.append('div')
      .attr('class', 'chart ' + classify(d));

    var showLegend = (i == 0) ? true : false;  
  
    renderArrowChart({
      container: container + ' .chart.' + classify(d),
      width,
      data: chartData,
      showLegend
    });
  });


  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a bar chart.
var renderArrowChart = function(config) {
  // Setup
  var labelColumn = "label";
  var firstColumn = "first";
  var finalColumn = "final";
  var diffColumn = "diff";

  var barHeight = 10;
  var barGap = 15;
  var labelWidth = 130;
  var labelMargin = 10;
  var resultLabelWidth = 80;
  var valueGap = 5;

  var margins = {
    top: 60,
    right: 20,
    // right: (resultLabelWidth * 2),
    bottom: 25,
    left: (labelWidth + labelMargin)
  };


  if (isMobile.matches) {
    barHeight = 20;
    margins.right = 15;
    margins.top = 75
    barGap = 20;
    valueGap = 5;
    labelWidth = 90
    margins.left= (labelWidth + labelMargin)
  }


  if (!config.showLegend) {
    margins.top = 30;
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
    .domain( LEGEND.map(d => d.label) )
    .range( LEGEND.map(d => d.color) );

  // Render HTML legend
  // var legend = containerElement
  //   .append("ul")
  //   .attr("class", "key")
  //   .selectAll("g")
  //   .data(colorScale.domain())
  //   .enter()
  //   .append("li")
  //     .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);
  
  // legend.append("b").style("background-color", d => colorScale(d));
  // legend.append("label").text(d => d);

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

if (isMobile.matches) {
  var wrapLength = 80;
} else {
  var wrapLength = 1000;
}

  // create Title of chart
    chartElement.append("text")
      .attr("class","state-name")
      .attr("x",-16)
      .attr("y",0)
      .attr("dy",-16)
      .attr("dx",5)
      .attr("text-anchor","end")
      .text(config.data[0].chart)
      .call(wrapText,wrapLength,13)

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
  var max = 70;
  var xScale = d3
    .scaleLinear()
    .domain([ 0, max])
    // .domain(function() {
    //   if (isMobile.matches) {
    //     return [0, 50];
    //   } else if (!isMobile.matches) {
    //     return [0, 60];
    //   }
    // })
    .range([ 0, chartWidth ]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => d + "%");

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

  // chartElement
  //   .append("g")
  //   .attr("class","x-axis-label")
  //   .append("text")
  //     .attr("x",chartWidth/2)
  //     .attr("y",chartHeight+40)
  //     .attr("text-anchor","middle")
  //     .text(axisLabel)



  //Render guiding lines
  chartElement
    .append("g")
    .attr("class", "guiding-lines")
    .selectAll("line")
    .data(config.data)
    .enter()
    .append("line")
    .attr("x1", xScale(0))
    .attr("x2", function() {
      // if (isMobile.matches) {
      //   return xScale(50);
      // } else if (!isMobile.matches){
      //   return xScale(60);
      // }
      return xScale(max);
    })
    .attr('y1', function(d, i) {
      return i * (barHeight + barGap) + (barHeight / 2);
    })
    .attr('y2', function(d, i) {
      return i * (barHeight + barGap) + (barHeight / 2);
    });


  //Render range arrows to chart.
  LEGEND.forEach(function(d,i) {
    var markerElement = chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-" + classify(d.label))
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto");

    switch(d.symbol) {
      case "arrow":
        markerElement.attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill", colorScale(d.label));
        break;
      case "bar":
        markerElement.attr("refX", function() {
          return 4;
        })
        .attr("refY", 4)
        .append("rect")
          .attr("y", 1)
          .attr("x", 4)
          .attr("width", 2)
          .attr("height",6)
          .attr("fill", colorScale(d.label))
          // .attr("stroke", '#fff');
        break;
      default: // dot
        markerElement.attr("refX", function() {
          return 4;
        })
        .attr("refY", 4)
        .append("circle")
          .attr("cy", 4)
          .attr("cx", 4)
          .attr("r", 2)
          .attr("fill", colorScale(d.label))
          .attr("stroke", '#fff');
        break;
    }
  });

  if (config.showLegend) {  
    var legendPositions = {    
      midpoint: (chartWidth/2),
      offset: 50,
      startingOffset: 5,
      labelYOffset: -2,
      startingY: -20
    }

    if (isMobile.matches) {
      legendPositions.midpoint=(chartWidth/2)-(margins.left/2)+10;  
      legendPositions.startingY = -40
    }
    var legend = chartElement
      .append("g")
      .attr("class","key")

    legend.append("line")
      .attr("class", "legend-bar negative")
      .attr("x1",legendPositions.midpoint-legendPositions.startingOffset)
      .attr("x2",legendPositions.midpoint-legendPositions.offset)
      .attr("y1",legendPositions.startingY)
      .attr("y2",legendPositions.startingY)
      .attr('marker-end', `url(#marker-negative)`)
      .attr("marker-start", `url(#marker-negative2)`)

    legend.append("line")
      .attr("class", "legend-bar positive")
      .attr("x1",legendPositions.midpoint+legendPositions.startingOffset)
      .attr("x2",legendPositions.midpoint+legendPositions.offset)
      .attr("y1",legendPositions.startingY)
      .attr("y2",legendPositions.startingY)
      .attr('marker-end', `url(#marker-positive)`)
      .attr("marker-start", `url(#marker-positive2)`)

    legend.append("text")
      .attr("class","legend-text positive")
      .attr("x",legendPositions.midpoint+legendPositions.offset)
      .attr("y",legendPositions.startingY + legendPositions.labelYOffset)
      .attr("dy",5)
      .attr("dx",5)
      .text(legendLabel1)

    legend.append("text")
      .attr("class","legend-text negative")
      .attr("x",legendPositions.midpoint-legendPositions.offset)
      .attr("y",legendPositions.startingY + legendPositions.labelYOffset)
      .attr("dy",5)
      .attr("dx",-10)
      .attr("text-anchor","end")
      .text(legendLabel2)   

    // legend.append("text")
    //   .attr("class","legend-text mid")
    //   .attr("x",legendPositions.midpoint)
    //   .attr("y",legendPositions.startingY - 10)
    //   .attr("dy",5)
    //   .attr("dx",0)
    //   .attr("text-anchor","middle")
    //   .text("2016")

    legend.append("text")
      .attr("class","legend-text mid master")
      .attr("x",legendPositions.midpoint)
      .attr("y",legendPositions.startingY - 30)
      .attr("dy",5)
      .attr("dx",0)
      .attr("text-anchor","middle")
      .text(legendLabelMaster) 
      .call(wrapText,250,13)
  }

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
        return xScale(d[finalColumn]);
      } else {
        return xScale(d[finalColumn]) + xScale(1);
      }
    })
    .attr('y1', function(d, i) {
      return i * (barHeight + barGap) + (barHeight / 2);
    })
    .attr('y2', function(d, i) {
      return i * (barHeight + barGap) + (barHeight / 2);
    })
    .attr('marker-end', d => `url(#marker-${classify(d.diff_status)})`)
    .attr('marker-start', function(d){
      // if (Math.abs(d.diff) > 1) {
        return `url(#marker-${classify(d.diff_status)}2)`  
      // }
      
    })
    .attr("stroke", d => colorScale(d.diff_status));

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
        top: i * (barHeight + barGap) - 2 + "px"
      });
    })
    .attr("class", function(d) {
      return classify(d[labelColumn]);
    })
    .append("span")
    .text(d => d[labelColumn]);

  // Render first alignment bar value shadows
  if (!isMobile.matches) {
    // chartElement
    //   .append("g")
    //   .attr("class", "rect")
    //   .selectAll("rect")
    //   .data(config.data)
    //   .enter()
    //   .append("rect")
    //   .attr("x", d => xScale(d[firstColumn]) - 40)
    //   .attr("y", (d, i) => i * (barHeight + barGap))
    //   .attr("width", 40)
    //   .attr("height", 20)
    //   .style("fill", "#fff");
  }

  // Render final alignment bar value shadows
  // if (!isMobile.matches) {
    chartElement
    .append("g")
    .attr("class", "rect")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => Math.sign(d.diff) == 1 ? xScale(d[finalColumn]) + 5 : xScale(d[finalColumn]) - 75)
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("width", 70)
    .attr("height", 20)
    .style("fill", "#fff");
  // }

  // Render first alignment bar values
  if (!isMobile.matches) {
    // chartElement
    //   .append("g")
    //   .attr("class", "value")
    //   .selectAll("text")
    //   .data(config.data)
    //   .enter()
    //   .append("text")
    //   .text(d => d.first_label + "%")
    //   .attr("x", function(d) {
    //     var textWidth = this.getComputedTextLength();
    //     var lbl = d3.select(this);

    //     return xScale(d[firstColumn]) - textWidth - 5;
    //   })
    //   .attr("y", (d, i) => i * (barHeight + barGap))
    //   .attr("dy", function(d) {
    //     return (barHeight / 2) + 3;
    //   })
    //   .style("fill", d => colorScale(d.diff_status));
  }

  // Render final alignment bar values
  // if (!isMobile.matches) {
    chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("text-anchor",d => Math.sign(d.diff) == 1 ? "start" : "end")    
    .attr("x", function(d) {
      if (Math.sign(d.diff) == 1) {
        var sign = 1;
      } else {
        var sign = -1;
      }
      return xScale(d[finalColumn]) + (sign*8);
    })
    .attr("y", (d, i) => i * (barHeight + barGap))
    .attr("dy", function(d) {
      return (barHeight / 2) + 3;
    })
    .style("fill", d => colorScale(d.diff_status))
    .attr("class", function(d) {
      return "value-" + classify(d[labelColumn]);
    })
    .text(function(d){
      // return d.final_label + "% (+" + d.diff + " pts.)";
      var sign = Math.sign(d.diff) == 1 ? "+" : ""
      var pts = Math.abs(d.diff) == 1 ? "pt." : "pts."
      return `${d.final_label}% (${sign}${d.diff} ${pts})`;
    })
  // }

  // Render alignment bar values on mobile.
  // if (isMobile.matches) {
  //   chartElement
  //     .append("g")
  //     .attr("class", "value")
  //     .selectAll("text")
  //     .data(config.data)
  //     .enter()
  //     .append("text")
  //       .text(function(d) {
  //         var prefix = d[diffColumn] > 0 ? "+" : "";
  //         var suffix = Math.abs(d[diffColumn]) == 1 ? "pt." : "pts.";
  //         return d.final_label + "% (" + prefix + d[diffColumn] + " " + suffix + ")";
  //       })
  //       .attr("x", function(d) {
  //         var textWidth = this.getComputedTextLength();
  //         var lbl = d3.select(this);

  //         if (d[diffColumn] < 0) { // if the arrow is orange, start label at left
  //           lbl.classed('left', true);
  //           return xScale(d[finalColumn]) + 3;
  //         } else if (textWidth > xScale(d[finalColumn])) { // if arrow if blue and there's not enough room for label, also start at left
  //           lbl.classed('left', true);
  //           return xScale(0) + 3;
  //         } else { // start at right
  //           lbl.classed('right', true);
  //           return xScale(d[finalColumn]) - 3;
  //         }
  //       })
  //       .attr("y", (d, i) => i * (barHeight + barGap))
  //       .attr("dy", function(d) {
  //         return barHeight + 3;
  //       })
  //       .style("fill", d => colorScale(d.diff_status));
  // }

};

// Initially load the graphic
window.onload = onWindowLoaded;

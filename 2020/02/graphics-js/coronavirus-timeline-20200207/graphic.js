var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var dataSeries = [];
var annotations = [];
var skipLabels = ["date", "annotate", "x_offset", "y_offset", "date_label","source","includeCount","rightsideOffset","x_mobile_offset", "y_mobile_offset"];

var {
  COLORS,
  classify,
  getAPMonth,
  makeTranslate,
  wrapText
} = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtYearAbbrev = d => (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ", " + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + " " + fmtDayYear(d).trim();

var fmtNumber = d => d.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');

// function formatNumber(d) {
//   return d.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
// };

/*
 * Initialize graphic
 */
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

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
  DATA.forEach(function(d) {
    var [m, day, y] = d.date.split("/").map(Number);
    d.date = new Date(y, m - 1, day);

    for (var key in d) {
      if (!skipLabels.includes(key) && !!d[key]) {

        // Annotations
        var hasAnnotation = !!d.annotate;
        if (hasAnnotation) {
          var hasCustomLabel = d.annotate !== true;
          var label = hasCustomLabel ? d.annotate : null;


          var xOffset = Number(d.x_offset) || 0;
          var yOffset = Number(d.y_offset) || 0;

          annotations.push({
            date: d.date,
            amt: d[key],
            series: key,
            xOffset: xOffset,
            yOffset: yOffset,
            label: label,
            includeCount: d.includeCount,
            rightsideOffset: d.rightsideOffset,
            x_mobile_offset: d.x_mobile_offset,
            y_mobile_offset: d.y_mobile_offset
          });
        }
      }
    }
  });

  /*
   * Restructure tabular data for easier charting.
   */
  for (var column in DATA[0]) {
    if (skipLabels.includes(column)) {
      continue;
    }

    dataSeries.push({
      name: column,
      values: DATA.map(function(d) {
        return {
          date: d.date,
          amt: d[column]
        };
        // filter out empty data. uncomment this if you have inconsistent data.
        //        }).filter(function(d) {
        //            return d.amt != null;
      })
    });
  }
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
  var container = "#annotated-line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  // Render the chart!
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

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
  /*
   * Setup
   */
  var dateColumn = "date";
  var valueColumn = "amt";

  var aspectWidth = 9;
  var aspectHeight = 16;

  var margins = {
    top: 25,
    right: 25,
    bottom: 25,
    left: 25
  };

  var ticksX = 5;
  var ticksY = 15;
  var roundTicksFactor = 5;

  var annotationXOffset = 0;
  var annotationYOffset = -20 + (margins.top - 25);
  var annotationWidth = 300;
  var dotRadius = 6;

  // Mobile
  if (isMobile.matches) {
    aspectWidth = 3;
    aspectHeight = 12;
    ticksX = 5;
    ticksY = 5;
    annotationWidth = 260;
    margins.right = 10;
    margins.left = 10;
    annotationXOffset = -15;
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

  //hardcoding y axis
  var dateRange = []

  /*
   * Create D3 scale objects.
   */


  var yScale = d3
    .scaleTime()
    .domain(extent)
    .range([0, chartHeight]);

  // var xScale = d3
  //   .scaleTime()
  //   .domain(extent)
  //   .range([0, chartWidth]);    

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

  var xScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([0, chartWidth]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");

  /*
   * Create D3 axes.
   */
  // var yAxis = d3
  //   .axisLeft()
  //   .scale(yScale)
  //   .ticks(ticksY)
  //   .tickFormat(function(d, i) {
  //     return fmtDateFull(d);
  //     if (isMobile) {
  //       return "\u2019" + fmtYearAbbrev(d);
  //     } else {
  //       return fmtYearFull(d);
  //     }
  //   });

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      if (isMobile.matches) {
        return (d == 0) ? 0 : `${d/1000}K`;
      } else {
        return fmtNumber(d);
      }
    });

var xAxis2 = d3
    .axisTop()
    .scale(xScale)
    .ticks(ticksX);    

  /*
   * Render axes to chart.
   */
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  // chartElement
  //   .append("g")
  //   .attr("class", "x axis")
  //   .attr("transform", makeTranslate(0, -30))
  //   .call(xAxis2);

  // chartElement
  //   .append("g")
  //   .attr("class", "y axis")
  //   .call(yAxis);

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function() {
    return xAxis;
  };

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
  var firstDate = new Date(2019,11,8);

  // first "day" is day label, 1 days before start (above axis)
  // var labelDay = [addDays(firstDate,-1.5),"Days since first case"]

  var monthLines = [];
  var dayTick = 10;

  for (var i = 0; i < 7; i++) {
    monthLines.push([addDays(firstDate,dayTick*(i)),dayTick*(i)])
  };

  monthLines[0][1] = "0 days since first case"

  var monthLineGroup = chartElement
    .append("g")
    .attr("class","monthLines")

  monthLineGroup
    .selectAll("date-lines")
    .data(monthLines)
    .enter()
    .append("line")
    .attr("class","date-lines")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", d => yScale(d[0]))
    .attr("y2", d => yScale(d[0]))

  monthLineGroup
    .selectAll("text")
    .data(monthLines)
    .enter()
    .append("text")
    .attr("x",chartWidth)
    .attr("y",d=>yScale(d[0])-5)
    .text(d=> d[1]);

  // monthLineGroup.append("text")
  //   .attr("class","bold")
  //   .attr("x",chartWidth)
  //   .attr("y",yScale(labelDay[0]))
  //   .attr("dy",10)
  //   .text(labelDay[1]);    

  /*
   * Render lines to chart.
   */
  var line = d3
    .line()
    .x(d => xScale(d[valueColumn]))
    .y(d => yScale(d[dateColumn]));
  
  var annoLine = d3
    .line()
    .x(d => d.x)
    .y(d => d.y)

  var area = d3
    .area()
    .x0(d => xScale(0))
    .x1(d => xScale(d[valueColumn]))
    .y(d => yScale(d[dateColumn]));
     
  chartElement
    .append("g")
    .attr("class", "areas")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")    
    // .attr("d", d => line(d.values))
    .attr("d", d => area(d.values))
    .attr("fill", "#cb614e")


  chartElement
    .append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(config.data)
    .enter()
    .append("path")
    .attr("class", function(d, i) {
      return "line " + classify(d.name);
    })
    .attr("stroke", d => colorScale(d.name))
    .attr("d", d => line(d.values))

  chartElement
    .append("g")
    .attr("class", "value")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("y", function(d, i) {
      var last = d.values[d.values.length - 1];
      return yScale(last[dateColumn]) + 5;
    })
    .attr("x", function(d) {
      var last = d.values[d.values.length - 1];
      return xScale(last[valueColumn]) + 3;
    });

  var axisLabel = chartElement
    .append("g")
    .attr("class", "axis-label")

  axisLabel
    .append("text")
    .attr("x", chartWidth/2)
    //hardcoding gap between axis label and x axis
    .attr("y", chartHeight + 45)
    .text("Number of cases confirmed worldwide")

  // axisLabel
  //   .append("text")
  //   .attr("x", chartWidth/2)
  //   //hardcoding gap between axis label and x axis
  //   .attr("y", -60)
  //   .text("Number of cases confirmed worldwide")    

  /*
   * Render annotations.
   */
  var annotation = chartElement
    .append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();




  annotation
    .append("path")
    .attr("class","anno-line")
    .attr("d", function(d) {
      var thisxOffset = 0;

      if (isMobile.matches && Number(d.x_mobile_offset)) {
        thisxOffset = d.x_mobile_offset;
        thisyOffset = d.y_mobile_offset;
      }  else {
        thisxOffset = d.xOffset;
        thisyOffset = d.yOffset;
      }

      if (d.rightsideOffset) {
        var extraOffset = annotationWidth + 10;
        var endOffset = annotationWidth;
      } else {
        var extraOffset = -10;
        var endOffset = 0;
      }

      var coords = [
        {
          x:xScale(d[valueColumn]),
          y:yScale(d[dateColumn])
        },
        {
          x: xScale(d[valueColumn]) + thisxOffset + extraOffset,
          y: yScale(d[dateColumn])
        },
        {
          x: xScale(d[valueColumn]) + thisxOffset + extraOffset,
          y: yScale(d[dateColumn]) + thisyOffset
        },
        {
          x: xScale(d[valueColumn]) + thisxOffset + endOffset,
          y: yScale(d[dateColumn]) + thisyOffset
        }
      ]

      return annoLine(coords);
    })

  var annotDivs = chartWrapper.append("div")
    .attr("id","anno-divs")

  annotDivs.selectAll("div")
    .data(config.annotations)
    .enter()
    .append("div")
    .attr("class","anno-div")    
    .style("left",function(d){
      if (isMobile.matches && Number(d.x_mobile_offset)) {
        thisxOffset = d.x_mobile_offset;
      }  else {
        thisxOffset = d.xOffset;
      }

      return xScale(d[valueColumn]) + thisxOffset + annotationXOffset + "px"
    })
    .style("top",function(d) {
      if (isMobile.matches && Number(d.x_mobile_offset)) {        
        thisyOffset = d.y_mobile_offset;
      }  else {
        thisyOffset = d.yOffset;
      }
      return yScale(d[dateColumn]) + thisyOffset + annotationYOffset + "px"
    })
    .html(function(d){
      var annotationDate = fmtDateFull(d[dateColumn]);
      var annotationCases = d[valueColumn];
      var cases = ""

      if (d.includeCount) {
        if (d[valueColumn] == 1) {
         var cases = `<h4>First confirmed case</h4>`;
        } else {
          if (d.amt == 136) {
            var cases = `<h4>${fmtNumber(annotationCases)} new cases</h4>`;
          } else if (d.amt == 291) {
            var cases = `<h4>At least ${fmtNumber(annotationCases)} cases</h4>`;
          } else {
            var cases = `<h4>${fmtNumber(annotationCases)} confirmed cases</h4>`;
          }          
        }  
      }
      
      var hasCustomLabel = d.label != null && d.label.length > 0;
      var annotationLabel = hasCustomLabel ? d.label : null;
      
      return `
        <div class="header">
          <p>${annotationDate}</p>
          ${cases}          
        </div>
        <div class="anno-body">
          <p>${annotationLabel}</p>
        </div>        
      `;
    }) 
  annotation
    .append("circle")
    .attr("class", "dots")
    .attr("cx", d => xScale(d[valueColumn]))
    .attr("cy", d => yScale(d[dateColumn]))
    .attr("fill", d => colorScale(d.series))
    .attr("r", dotRadius);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

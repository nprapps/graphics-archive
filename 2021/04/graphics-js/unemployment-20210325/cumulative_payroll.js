var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;
var dataSeries = [];
var annotations = [];
var skipLabels = ["date", "annotate", "x_offset", "y_offset"];

var { COLORS, classify, getAPMonth, makeTranslate, wrapText } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");
var fmtYearAbbrev = d => "\u2019" + (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ", " + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + " " + fmtDayYear(d).trim();
var fmtMonthYear = d => getAPMonth(d) + " " + d.getFullYear();

var addDays = function(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// source: http://www.nber.org/cycles.html
var recession_dates = [
    // { 'begin':'1929-08-01','end':'1933-03-01' },
    // { 'begin':'1937-05-01','end':'1938-06-01' },
    { 'begin':'1945-02-01','end':'1945-10-01' },
    { 'begin':'1948-11-01','end':'1949-10-01' },
    { 'begin':'1953-07-01','end':'1954-05-01' },
    { 'begin':'1957-08-01','end':'1958-04-01' },
    { 'begin':'1960-04-01','end':'1961-02-01' },
    { 'begin':'1969-12-01','end':'1970-11-01'  },
    { 'begin':'1973-11-01','end':'1975-03-01' },
    { 'begin':'1980-01-01','end':'1980-07-01' },
    { 'begin':'1981-07-01','end':'1982-11-01'  },
    { 'begin':'1990-07-01','end':'1991-03-01' },
    { 'begin':'2001-03-01','end':'2001-11-01' },
    { 'begin':'2007-12-01','end':'2009-06-01' },
    { 'begin':'2020-02-01','end':'2021-02-01' }
];

/*
 * Initialize graphic
 */
var initialize = function() {
  // (NB: Use window.load to ensure all images have loaded)
  window.onload = onWindowLoaded;
}

var onWindowLoaded = function() {
  formatData();
  render();

  window.addEventListener("resize", render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();

    // pymChild.onMessage("on-screen", function(bucket) {
    //   ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // pymChild.onMessage("scroll-depth", function(data) {
    //   data = JSON.parse(data);
    //   ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });
  });
};

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
  DATA.forEach(function(d,i) {
    var [m, date, y] = d.date.split("/").map(Number);
    d.date = new Date(y, m - 1, date);

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
            amtPrev: DATA[i-1][key],
            series: key,
            xOffset: xOffset,
            yOffset: yOffset,
            label: label
          });
        }
      }
    }
  });

  recession_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
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
      values: DATA.filter(d => d[column]).map(function(d) {
        return {
          date: d.date,
          amt: d[column]
        };
        // filter out empty data. uncomment this if you have inconsistent data.
               // }).filter(function(d) {
                   // return d.amt != null;
      })
    });
  }  

  // add buffer data
  dataSeries[0].values.push({
    "amt": dataSeries[0].values[dataSeries[0].values.length - 1]["amt"],
    "date": addDays(dataSeries[0].values[dataSeries[0].values.length - 1]["date"],15)
  })
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
  var container = "#annotated-line-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var marginLeft = isMobile.matches ? 35 : 62;
  var marginRight = 80;

  // Render the chart!
  renderLineChart({
    container,
    width,
    data: dataSeries,
    annotations: annotations,
    marginLeft,
    marginRight
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

  var aspectWidth = isMobile.matches ? 9 : 9;
  var aspectHeight = isMobile.matches ? 16 : 7;

  var annoConfig = {
    xOffset: 0,
    yOffset: -13,
    width: config.marginRight,
    lineHeight: 14
  }

  var margins = {
    top: 15,
    right: annoConfig.width,
    bottom: 20,
    left: config.marginLeft
  };

  var ticksX = 10;
  var ticksY = 5;
  var roundTicksFactor = 1000;

  // Mobile
  if (isMobile.matches) {
    ticksX = 5;
    ticksY = 5;

    annoConfig = {
      xOffset: 0,
      yOffset: -10,
      width: config.marginRight,
      lineHeight: 12
    }

    margins.right = annoConfig.width + 5;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var dates1 = config.data[0].values.map(d => d.date);
  var dates2 = config.data[0].values.map(d => d.date);
  var extent = [addDays(dates1[0],14), addDays(dates2[dates2.length - 1],0)];

  /*
   * Create D3 scale objects.
   */
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

  var realMin = Math.min.apply(null,values.map(v => v));

  var ceilings = values.map(
    v => Math.ceil(v / roundTicksFactor) * roundTicksFactor
  );
  var max = Math.max.apply(null, ceilings);



  var yScale = d3
    .scaleLinear()
    .domain([ min, max ])
    .range([ chartHeight, 0 ]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(config.data.map(d => d.name))
    .range([ COLORS.red3,]);

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

chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-up")
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill","#000")
          // .append("polyline")
          //   .attr("points","1 1, 9 5, 1 7")

            // <polyline points="1 1, 9 5, 1 7" />

chartElement.append("svg:defs").append("svg:marker")
      .attr("id", "marker-down")
      .attr("viewBox", "0 0 10 10")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .attr("refX", function() {
            return 4;
          })
          .attr("refY", 3)
          .append("path")
            .attr("d", "M0,0 L0,6 L6,3 z")
            .attr("fill",COLORS.red2) 

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(d => {
      var year = "";
      if (getAPMonth(d) == "Jan.") {
        var year = ` ${fmtYearAbbrev(d)}`
      } else if (getAPMonth(d) == "March" && fmtYearAbbrev(d) == "\u201920") {
        var year = ` ${fmtYearAbbrev(d)}`;
      } else if (getAPMonth(d) == "April" && fmtYearAbbrev(d) == "\u201920" && isMobile.matches) {
        var year = ` ${fmtYearAbbrev(d)}`;
      } 
      return getAPMonth(d)+year

      // if (isMobile.matches) {
      //   return getAPMonth(d)+year
      // } else {
      //   return `${getAPMonth(d)} ${fmtYearAbbrev(d)}`
      // }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d) {
      if (d == 0) {
        return d;
      } else {
        var suffix = isMobile.matches ? "M" : " million";
        return d/1000 + suffix;
      }
    });

  /*
   * Render axes to chart.
   */
  chartElement
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis);

  chartElement
    .append("g")
    .attr("class", "y axis")
    .call(yAxis);

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
  };

  // chartElement
  //   .insert('g', '*')
  //   .attr("class", "x grid")
  //   .attr("transform", makeTranslate(0, chartHeight))
  //   .call(
  //     xAxisGrid()
  //       .tickSize(-chartHeight, 0, 0)
  //       .tickFormat("")
  //   );

  chartElement
    .insert('g', '*')
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

  /*
   * Recession bars
   */
  // var recession = chartElement.insert('g','*')
  //   .attr('class', 'recession')
  //   .selectAll('rect')
  //   .data(recession_dates)
  //   .enter()
  //     .append('rect')
  //     .attr('x', d => xScale(d['begin']))
  //     .attr('width', d => xScale(d['end']) - xScale(d['begin']))
  //     .attr('y', 0)
  //     .attr('height', chartHeight);

  /*
   * Render 0 value line.
   */
  if (min < 0) {
    chartElement
      .append("line")
      .attr("class", "zero-line")
      .attr("x1", 0)
      .attr("x2", chartWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0));
  }

  /*
   * Render lines to chart.
   */
  var area = d3.area()
    .curve(d3.curveStep)
    .x(d => xScale(d[dateColumn]))
    .y0(yScale(0))
    .y1(d => yScale(d[valueColumn]));

  var line = d3
    .line()
    .curve(d3.curveStep)
    .x(d => xScale(d[dateColumn]))
    .y(d => yScale(d[valueColumn]));  

  var lineAnnotation = d3.line();    

  // above/below clipping
  // see: http://bl.ocks.org/mbostock/4062844
  // and: http://bl.ocks.org/mbostock/3894205
  chartElement.append('clipPath')
      .attr('id', 'clip-below')
      .append('rect')
      .attr('y', yScale(0))
      .attr('width', chartWidth)
      .attr('height', yScale(yScale.domain()[0]) - yScale(0));

  chartElement.append('clipPath')
      .attr('id', 'clip-above')
      .append('rect')
      .attr('y', yScale(yScale.domain()[1]))
      .attr('width', chartWidth)
      .attr('height', yScale(0) - yScale(yScale.domain()[1]));

  var areaWrapper = chartElement.append('g')
      .attr('class', 'areas');

  [ "above", "below" ].forEach((v, k) => {
    areaWrapper.append('path')
        .datum(config['data'][0]['values'])
        .attr('class', 'area ' + v)
        .attr('clip-path', 'url(#clip-' + v + ')')
        .attr('d', area);
  });

  var lineWrapper = chartElement.append('g')
      .attr('class', 'lines');
  
  [ "above", "below" ].forEach((v, k) => {
    lineWrapper.append('path')
      .datum(config['data'][0]['values'])
      .attr('class', 'line ' + v)
      .attr('clip-path', 'url(#clip-' + v + ')')
      .attr('d', function(d) {
          return line(d);
      });
  })


  // chartElement
  //   .append("g")
  //   .attr("class", "lines")
  //   .selectAll("path")
  //   .data(config.data)
  //   .enter()
  //   .append("path")
  //   .attr("class", function(d, i) {
  //     return "line " + classify(d.name);
  //   })
  //   .attr("stroke", d => colorScale(d.name))
  //   .attr("d", d => line(d.values));


  /*
   * Render annotations.
   */
  var annotation = chartElement.append("g")
    .attr("class", "annotations")
    .selectAll("circle")
    .data(config.annotations)
    .enter();

  annotation.append("path")
    .attr("class", function(d) {
      var polarity = d[valueColumn] < 0 ? "negative" : "positive"
      return "arrow " + polarity;
    })
    .attr("d", function(d){
      var offset = xScale(addDays(d[dateColumn],0)) - xScale(d[dateColumn]);

      var begin = [xScale(d[dateColumn])-offset,yScale(d.amtPrev)];      
      
      var polarity = d.amt-d.amtPrev > 0 ? 1 : -1;

      var end = [xScale(d[dateColumn])-offset,yScale(d.amt)+polarity*5];

      var arrPoints = [begin, end];

      return lineAnnotation(arrPoints);
    })
    .attr('marker-end', function(d){
      if (d.amt-d.amtPrev > 0) {
        return `url(#marker-up)`
      } else {
        return `url(#marker-down)`
      }
      
    });

  
  chartElement.append("g")
    .attr("class","final-annotation")
    .append("path")
    .attr("class","final-annotation-inner")
    .attr("d",function(){
      var begin = [chartWidth+5,yScale(0)]
      var end = [chartWidth+5,yScale(config.data[0].values[config.data[0].values.length-1].amt)-5]

      var arrPoints = [begin,end];
      return lineAnnotation(arrPoints)
    })
    .attr('marker-end', function(d){
      // if (d.amt-d.amtPrev > 0) {
        // return `url(#marker-up)`
      // } else {
        return `url(#marker-down)`
      // }
      
    });

  chartElement.select(".final-annotation")
    .append("path")
    .attr("class","final-annotation-inner upward")
    .attr("d",function(){
      var begin = [chartWidth+5,yScale(realMin)]
      var end = [chartWidth+5,yScale(config.data[0].values[config.data[0].values.length-1].amt)+5]

      var arrPoints = [begin,end];
      return lineAnnotation(arrPoints)
    })
    .attr('marker-end', function(d){
      // if (d.amt-d.amtPrev > 0) {
        // return `url(#marker-up)`
      // } else {
        return `url(#marker-up)`
      // }
      
    });


  //add the jobs missing text
  chartElement.append("g")
    .attr("class","final-annotation-text red")
    .append("text")
    .html(() => {
      var d = config.data[0].values[config.data[0].values.length-1];

      if (Math.abs(d.amt) >= 1000) {
          var value = d.amt/ 1000;
          var displayValue = fmtComma(Math.abs(value.toFixed(1))) + "M";
        } else {
          var displayValue = fmtComma(Math.abs(d.amt)) + "K";
        }


      // var polarity = " jobs less than Jan. 2020";
      var polarity = "Down"
      if (d.amt > 0) {
        // polarity = " jobs more than Jan. 2020";
        var polarity = "Up"
      }

      return `${polarity} ${displayValue} jobs from the start of pandemic`
    })
    .attr("x", chartWidth + 10)
    .attr("y", yScale(config.data[0].values[config.data[0].values.length-1].amt / 2)-20)
    .call(wrapText, annoConfig.width-10, annoConfig.lineHeight);

  //add jobs gained text
  chartElement.append("g")
    .attr("class","final-annotation-text black")
    .append("text")
    .html(() => {
      var d = config.data[0].values[config.data[0].values.length-1];
      var regainedJobs = realMin-d.amt;

      if (Math.abs(regainedJobs) >= 1000) {
          var value = regainedJobs/ 1000;
          var displayValue = fmtComma(Math.abs(value.toFixed(1))) + "M";
        } else {
          var displayValue = fmtComma(Math.abs(regainedJobs)) + "K";
        }


      var detail = " jobs since April 2020 low point"

      return `Up ${displayValue} ${detail}`
    })
    .attr("x", chartWidth + 10)
    .attr("y", () => {
      var thisMonth = config.data[0].values[config.data[0].values.length-1].amt;
      var positionRaw = thisMonth+(realMin-thisMonth)/2;

      return yScale(positionRaw)-20
    })
    .call(wrapText, annoConfig.width-10, annoConfig.lineHeight);
  
  // add annotation header 
  chartElement.append("g")
  .attr("class","final-annotation-text header")
    .append("text")
    .html(() => {
      return `As of ${fmtMonthYear(extent[1])}:`;
    })
    .attr("x", chartWidth + 10)
    .attr("y", 5)
    .call(wrapText, annoConfig.width-10, annoConfig.lineHeight);

  // add annotation text
  annotation.append("text")
    .html(function(d) {
      var hasCustomLabel = d.label != null && d.label.length > 0;
      if (hasCustomLabel) {
        return d.label;
      }
      var text = hasCustomLabel ? d.label : getAPMonth(d.date) + ' ' + fmtYearFull(d.date);
      if (Math.abs(d.amt - d.amtPrev) >= 1000) {
        var value = (d.amt - d.amtPrev) / 1000;
        var displayValue = fmtComma(Math.abs(value.toFixed(1))) + "M";
      } else {
        var displayValue = fmtComma(Math.abs(d.amt - d.amtPrev)) + "K";
      }

      var polarity = " jobs lost";
      if (d.amt - d.amtPrev > 0) {
        polarity = " jobs gained";
      }

      return text + " " + displayValue + polarity ;
    })
    .attr("x", d => xScale(d[dateColumn]) + d.xOffset + annoConfig.xOffset)
    .attr("y", d => yScale(d.amt/2) + d.yOffset + annoConfig.yOffset)
    .call(wrapText, annoConfig.width, annoConfig.lineHeight);

};


module.exports = initialize;

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

var { COLORS, makeTranslate, wrapText, getAPMonth } = require("./lib/helpers");

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");
var fmtYearAbbrev = d => "\u2019" + (d.getFullYear() + "").slice(-2);
var fmtYearFull = d => d.getFullYear();
var fmtDayYear = d => d.getDate() + ", " + d.getFullYear();
var fmtDateFull = d => getAPMonth(d) + " " + fmtDayYear(d).trim();

// important dates
var hk_dates = [
    // { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2019-06-09', 'end': '2019-07-25' }
];

var vet_dates = [
    { 'begin': '2018-12-09', 'end': '2019-02-15' }
];

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


var formatData = function() {
  DATA.forEach(function(d,i) {    
    d.date = new Date(d.date)

    d.amt = parseFloat(d.amt);
  });

  vet_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
  });

  hk_dates.forEach(function(d) {
    [ 'begin', 'end' ].forEach(function(v, k) {
      var [y, m, day] = d[v].split("-").map(Number);
      d[v] = new Date(y, m - 1, day);
    })
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
  var labelColumn = 'date';
  var valueColumn = "amt";

  var aspectWidth = isMobile.matches ? 4 : 16;
  // var aspectHeight = isMobile.matches ? 2.5 : 9;
  var aspectHeight = isMobile.matches ? 2.5 : 4;
  var valueGap = 6;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 40
  };

  if (isMobile.matches) {
    margins.right = 20;
    margins.left = 25;

  }

  var ticksY = 4;
  var roundTicksFactor = 4000;

  var xTickValues = [];
  config['data'].forEach(function(d,i) {   
    if (isMobile.matches) {
      if (d.date.getDate() == 1 && 
          (
            d.date.getMonth() == 0 || 
            d.date.getMonth() == 3 ||
            d.date.getMonth() == 6 ||
            d.date.getMonth() == 9
          )
        ) {
        xTickValues.push(d.date);
      }
    } else {
      if (d.date.getDate() == 1) {
        xTickValues.push(d.date); 
      }
    }    
  });

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

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

  var xScale = d3
    .scaleBand()
    .range([ 0, chartWidth ])
    .padding(0)
    .domain(
      config.data.map(d => d[labelColumn])
    );

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

  var max = Math.max(...ceilings);

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues(xTickValues)
    .tickFormat(function(d, i) {      
      // return 
      // if (!isMobile.matches) {
        return getAPMonth(d) + " " + fmtYearAbbrev(d);
      // } else if (i % 2 == 0 && isMobile.matches) {
      //   return getAPMonth(d) + " " + fmtYearAbbrev(d);
      // }
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d){
      if (!isMobile.matches) {
        return fmtComma(d)
      } else {
        return (d/1000).toFixed(0) + 'K'
      }
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

  /*
   * highlight hk protests bars
   */
  var recession = chartElement.insert('g','*')
    .attr('class', 'highlight')
    .selectAll('rect')
    .data(hk_dates)
    .enter()
      .append('rect')
      .attr('x', d => xScale(d['begin']))
      .attr('width', d => xScale(d['end']) - xScale(d['begin']))
      .attr('y', 0)
      .attr('height', chartHeight);    

  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", function(d){
      return xScale(d[labelColumn])
    })
    .attr("y", d => d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn]))
    .attr("width", xScale.bandwidth())
    .attr("height", d => d[valueColumn] < 0
      ? yScale(d[valueColumn]) - yScale(0)
      : yScale(0) - yScale(d[valueColumn])
    )
    .attr("class", function(d) {
      return "bar bar-" + d[labelColumn];
    });

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

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = hk_dates[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', 20)
    .text('Hong Kong pro-democracy protests')
    .call(wrapText, 100, 12);

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = vet_dates[0];
      if (isMobile.matches) {
        return xScale(dates.begin) + 55;
      } else {
        return xScale(dates.begin) + 75;  
      }
      
    })
    .attr('y', 80)
    .text('Tweets about veterans\u2019 protests suddenly intensify')
    .call(wrapText, 100, 12);
};

//Initially load the graphic
window.onload = onWindowLoaded;

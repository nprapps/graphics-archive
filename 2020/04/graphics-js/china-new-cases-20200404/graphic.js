var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var charts = ['guangdong', 'beijing', 'shanghai', 'fujian', 'chongqing'];


// Global vars
var pymChild = null;

var { COLORS, classify, getAPMonth, makeTranslate, wrapText } = require("./lib/helpers");
var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

var fmtMonth = d => getAPMonth(d)

// Initialize the graphic.
var onWindowLoaded = function() {
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

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {
  // Render the chart!
  var container = "#column-chart-beijing";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  charts.forEach(function(chart, i) {
  renderColumnChart({
    container: "#column-chart-" + chart,
    width,
    data: DATA[chart],
    xDomain: [2000, 2018],
    labelWidth: 80,
  });
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
  var aspectHeight = isMobile.matches ? 2.25 : 9;
  var valueGap = 6;

  var margins = {
    top: 20,
    right: 39.5,
    bottom: 35,
    left: 41
  };

  var ticksY = 4;
  var roundTicksFactor = 50;

  if (isMobile.matches) {
    margins.right = 35.5;
    margins.top = 5;
    margins.left = 40

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

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

    //write function

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
    .domain([0, 100])
    .range([chartHeight, 0]);
    

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues([])
    .tickSize(0)
    // .tickFormat("");

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(function(d, i) {
      if (d >= 0){
        return d;
      } else if(d < 0) {
        return d*-1;
      }
    });
    

  //30 days

  var thirtyDaysDate = [
    { 'begin': '2020-03-03', 'end': '2020-04-02' }
];

chartElement.insert('g','*')
      .attr('class', 'thirty')
      .selectAll('rect')
      .data(thirtyDaysDate)
      .enter()
        .append('rect')
          .attr('x', function(d) {
            return xScale(d['begin']);
          })
          .attr('width', function(d) {
            return xScale(d['end']) - xScale(d['begin']) + xScale.bandwidth();
          })
          .attr('y', 0)
          .attr('height', chartHeight);

  var beginDate = "2020-01-23"
  chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("x", xScale(thirtyDaysDate[0].end) )
    .attr("y", chartHeight + 20)
    .attr("text-anchor", "middle")
    .text("April 2")
    .attr("fill", "#555555");

    chartElement 
    .append("line")
    .attr("x1", xScale(thirtyDaysDate[0].end) + 2)
    .attr("x2", xScale(thirtyDaysDate[0].end) + 2)
    .attr("y1", yScale(0))
    .attr("y2", yScale(-4))
    .attr("stroke", "#ccc")

    chartElement 
    .append("line")
    .attr("x1", xScale(beginDate) + 2)
    .attr("x2", xScale(beginDate) + 2)
    .attr("y1", yScale(0))
    .attr("y2", yScale(-4))
    .attr("stroke", "#ccc")



    chartElement
    .append("g")
    .attr("class", "value")
    .append("text")
    .attr("x", xScale(beginDate))
    .attr("y", chartHeight + 20)
    .attr("text-anchor", "middle")
    .text("Jan. 23")
    .attr("fill", "#555555");

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


  // Change me to change what numbers we're summing to get the last 30 days total.
  var last30Data = 0;
  for (v = config.data.length - 1; v >= config.data.length - 31; v--) {
    last30Data += config.data[v]['amt'] || 0;
  }

  // Change me to change the text/style it differently.
  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = thirtyDaysDate[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', 50)
    .attr("text-anchor", "middle")
    .text(last30Data + ' cases in the')
    .call(wrapText);

  chartElement.append('text')
    .classed('chart-label', true)
    .attr('x', function(){
      var dates = thirtyDaysDate[0];
      return xScale(dates.begin) + ((xScale(dates.end) - xScale(dates.begin)) / 2);
    })
    .attr('y', 65)
    .attr("text-anchor", "middle")
    .text('last 30 days')
    .call(wrapText);

  // Render bars to chart.
  chartElement
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(config.data)
    .enter()
    .append("rect")
    .attr("x", d => xScale(d[labelColumn]))
    .attr("y", d => d[valueColumn] < 0 ? yScale(0) : yScale(d[valueColumn]))
    .attr("width", xScale.bandwidth())
    .attr("height", d => d[valueColumn] < 0
      ? yScale(d[valueColumn]) - yScale(0)
      : yScale(0) - yScale(d[valueColumn])
    )
    .style("fill", "#17807E")
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


};




//Initially load the graphic
window.onload = onWindowLoaded;

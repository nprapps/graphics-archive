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

var { COLORS, makeTranslate, wrapText } = require("./lib/helpers");

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
    top: 5,
    right: 5,
    bottom: 20,
    left: 30
  };

  var ticksY = 4;
  var ticksX = 5;
  var roundTicksFactor = 5;

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
    .domain([min, max])
    .range([chartHeight, 0]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .tickValues(xScale.domain()
      .filter(function(d,i){ 
        return (!((i+1)%5) || 
          (!isMobile.matches && (d == 1971 || d == 2018)) );
      }));

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY)
    .tickFormat(d => d+"%");

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
//2000-2002 annotation
var annotation = chartElement.append('g')
    .attr('class', 'annotation');
  annotation.append('line')
    .attr('x1', xScale(2000))
    .attr('x2', xScale(2003))
    .attr('y1', yScale(16))
    .attr('y2', yScale(16));
  annotation.append('line')
    .attr('x1', xScale(2000))
    .attr('x2', xScale(2000))
    .attr('y1', yScale(16.05))
    .attr('y2', yScale(15.7));

  annotation.append('line')
    .attr('x1', xScale(2003))
    .attr('x2', xScale(2003))
    .attr('y1', yScale(16.05))
    .attr('y2', yScale(15.7));  
  // annotation.append('circle')
  //   .attr('cx', xScale('1963'))
  //   .attr('cy', annotation.select('line').attr('y1'))
  //   .attr('r', 3);
  annotation.append('text')
    .text('11.2 million livestock perished during the winters of 1999-2002.')
    .attr('x', xScale('2000'))
    .attr('y', function(){
      var y = yScale(16)-70;
      return y;
    })
    .attr('dx', -5)
    .call(wrapText, 75, 13);

//2010 annotation
var annotation2 = chartElement.append('g')
    .attr('class', 'annotation');
annotation2.append('text')
    .html("Mongolia's harshest dzud killed 10.3 million livestock during the 2009-2010 winter.")
    .attr('x', function(){
        var x = xScale('2012');
        if(isMobile.matches) x+=5;
        return x;
    })
    .attr('y', function(){
      var y = yScale(23);
      if(isMobile.matches) y = yScale(23);
      return y;
    })
    .attr('dx', -5)
    .call(wrapText, 65, 13)

annotation2.append('line')
    .attr('x1', xScale(2010)+5)
    .attr('x2', xScale(2011)+5)
    .attr('y1', yScale(23))
    .attr('y2', yScale(23));

annotation2.selectAll("tspan").html(function(){
  var text = d3.select(this).text();
  if(text == "dzud killed") return `<tspan class="normal">dzud</tspan> killed`;
  else return text;
});


};

//Initially load the graphic
window.onload = onWindowLoaded;

console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { makeTranslate, classify, formatStyle } = require("./lib/helpers/");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var pymChild = null;
pym.then(function(child) {
  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", render);
  window.addEventListener("resize", () => child.sendHeight());
  

});

var render = function() {

  var svgHeight = 80;

  var containerSelector = '.graphic'
  var containerElement = document.querySelector(containerSelector);
  //remove fallback
  containerElement.innerHTML = "";

  var categories = ["regular testing", "surveillance", "at risk", "no clear plan"]

  // Render labels to left of chart.
  d3.select(containerSelector)
    .append("ul")
    .attr("class", "labels")
    .attr(
      "style",
      formatStyle({
        width: 115 + "px",
        left: "0"
      })
    )
    .selectAll("li")
    .data(categories)
    .enter()
    .append("li")
    .attr("style", function(d, i) {
      return formatStyle({
        width: 105 + "px",
        height: 50 + "px",
        left: "0px",
        top: 13 + (i * svgHeight)  + "px" 
      });
    })
    .attr("class", function(d) {
      return classify(d);
    })
    .append("span")
    .text(d => LABELS[d]);

    console.log(LABELS)

  for (i in categories) {
    var showAxis = i < categories.length - 1 ? false: true;
    renderRow(categories[i], showAxis, svgHeight, i)
  }


  
}

var renderRow = function(category, showAxis, svgHeight, rowIndex) {
  console.log(category)

  var sortSize = function(a,b) {
    if (a['total undergrad'] > b['total undergrad']) {
      return -1
    }
    return 1
  }

  DATA.sort(sortSize)

  // filter data
  DATA = DATA.filter(x=>x['Mode of Instruction: C2i Tiny Categorization'] != 'Primarily or Fully Online')
  DATA = DATA.filter(x=>x['total undergrad'] > 5000)
  DATASLICE = DATA.filter(x=>x['most_aggressive'] == category)



  var containerSelector = '.graphic'
  var containerElement = document.querySelector(containerSelector);
  //remove fallback
  var containerWidth = containerElement.offsetWidth;

  var container = d3.select(containerSelector);
  var margins = {
    top: 0,
    right: 10,
    bottom: 0,
    left: 115
  };
  if (showAxis) {
    margins.bottom = 30;
  }
  var chartHeight = svgHeight - margins.top - margins.bottom



  var chartWidth = containerWidth - margins.left - margins.right;
  var svg = container.append("svg")
      .attr('height', svgHeight)
      .attr('width', containerWidth)
      .attr("class", 'svg-' + classify(category));

  var chartElement = svg.append('g')
    .attr('width', chartWidth)
    .attr('height', chartHeight)
    .attr("transform", makeTranslate(margins.left, margins.top))



  var valueColumn = 'daily_three_wk_cases_per100k'

  var ticksX = 10;

  if (isMobile.matches) {
    ticksX = 5;
  }


  var roundTicksFactor = 10

  var ceilings = DATA.map(
    d => Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor
  );

  var max = Math.max.apply(null, ceilings);
  console.log(DATA)
  // var max = d3.max(DATA=>d['daily_three_wk_cases_per100k'])
  // var max = 115;

  var xScale = d3
    .scaleLinear()
    .domain([0, max])
    .range([0, chartWidth]);

  // Create D3 axes.
  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function (d) {
      if ((d / 1000000) >= 1) {
        d =  d ;
      }
      return d;
    });

  // Render axes to chart.
  if (showAxis) {
    chartElement
      .append("g")
      .attr("class", "x axis")
      .attr("transform", makeTranslate(0, chartHeight))
      .call(xAxis);  

    container
      .append("div")
      .attr("class", "xaxis-label")
      .attr("style", "left: " + chartWidth/2 + "px")
      .text('Average daily cases per 100,000 people');  
  }
  

  // Render grid to chart.
  chartElement
    .append("g")
    .attr("class", "x grid")
    .attr("transform", makeTranslate(0, chartHeight))
    .call(xAxis.tickSize(-chartHeight, 0, 0).tickFormat(""));




    // add in tooltip for individual state display.
    var maxTooltipWidth = 200;
    var tooltip = d3.select('.graphic')
      .append('div')
      .attr('id', 'state-tooltip')
      .style('position', 'absolute')
      .style('z-index', '10')
      .style('visibility', 'hidden')
      .style('background', '#fff')
      .text('');
    var mainTooltipLabel = tooltip.append('div').attr('class', 'label main');
    var tBody = tooltip.append('tbody');



  var circlesG = chartElement.append("g")
  .attr('width', chartWidth)
  .attr('class', 'circles-g');



  var rScale = d3
    .scaleLinear()
    .domain([0, 48000])
    .range([2.2, 28]);

  if (isMobile.matches) {
    rScale.range([1.2, 16])
  }



  circlesG.selectAll("circle")
    .data(DATASLICE)
    .enter()
    .append('circle')
    .attr("cx", d => d.daily_three_wk_cases_per100k > 0 ? xScale(d.daily_three_wk_cases_per100k) : 0)
    .attr("data-casesper", d =>d.daily_three_wk_cases_per100k)
    .attr("cy", chartHeight/2)
    .attr("class", function(d){
      if (d['daily_three_wk_cases_per100k'] >= 25 ) {
        return 'red'
      }
      if (d['daily_three_wk_cases_per100k'] >= 10 ) {
        return 'orange'
      }
      if (d['daily_three_wk_cases_per100k'] >= 1 ) {
        return 'yellow'
      }
        return 'green'
    })
    .attr("r", d => rScale(d['total undergrad']))
    .on('mouseover', function (d) {
      // Don't do tooltips on mobile.
      if (isMobile.matches) {
        return;
      }
      mainTooltipLabel.text(d['Institution Name']);
      tBody.text('');

      var displayCaseNum = d['daily_three_wk_cases_per100k'] > 0 ? d['daily_three_wk_cases_per100k'].toFixed(1) : 0



      tBody.html("<em>"+ LABELS[category] + "</em><br>County's average daily cases per 100,000: <b>" 
        + displayCaseNum + "</b>")

      // Set tooltip positions. If tooltip too far to the right, move
      // to lefthand side of state.
      var radius = parseInt(this.getAttribute('r'));
      var center = [xScale(d['daily_three_wk_cases_per100k']) + margins.left, chartHeight/2];
      if (center[0] < 0) {center[0] = 0};

      var element = tooltip.node();
      var tooltipWidth = 200;
      var leftOffset = center[0] + 5 + radius;
      var topOffset = center[1] + (rowIndex*svgHeight)
      if (leftOffset >= chartWidth - maxTooltipWidth) {
        leftOffset = center[0] - 5 - radius - tooltipWidth;
        topOffset = rowIndex > 0 ? topOffset - 60 : topOffset
      }
      tooltip.style('top', topOffset + 'px');
      tooltip.style('left', leftOffset + 'px');

      return tooltip.style('visibility', 'visible');
    })
    .on('mouseout', function () {
      return tooltip.style('visibility', 'hidden');
    });



  //run your D3 functions here

};

//first render
render();

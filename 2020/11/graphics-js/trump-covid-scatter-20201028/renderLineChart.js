console.clear();

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min")
};
var $ = require('./lib/qsa');

var { COLORS, classify, makeTranslate, wrapText, fmtComma } = require("./lib/helpers");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { isMobile, isLarge } = require("./lib/breakpoints");

var lookupActive = true;

// Render a line chart.
module.exports = function(config) {

  config.page = 'trump_pct';

    var yVar = 'deaths_per100k'
    var xVar = 'trump_win_shift'


 


  // data transformation
  for (i in config.data) {
    config.data[i][yVar] = parseFloat(config.data[i][yVar])
  }
  console.log(config.data)
  console.log(config.data.length)
  config.data = config.data.filter(x=>x[yVar] >0 )
  config.data = config.data.filter(x=>x['total_votes'] >0 )
  console.log(config.data.length)

  var sortVoteSize = function(a,b) {
    return a['total_votes'] > b['total_votes'] ? -1 : 1;
  }

  config.data = config.data.sort(sortVoteSize)


  // Setup
  var { dateColumn, valueColumn } = config;

  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;
  if ( isLarge.matches) {
    aspectHeight = 5;
  }


  var margins = {
    top: 5,
    right: 15,
    bottom: 33,
    left: 95
  };

  var ticksX = 5;
  var ticksY = 10;
  var roundTicksFactor = 50;
  var roundTicksFactorX = .1;

  // Mobile
  if (isMobile.matches) {
    ticksY = 5;
    margins.right = 25;
  }

  if (isLarge.matches) {
    ticksX = 10;
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

  // var pcts = config.data[0].values.map(d => d.date);
  // var extent = [dates[0], dates[dates.length - 1]];
  var XChangeVals = config.data.map(v => parseFloat(v[xVar]));


  var floorsX = XChangeVals.map(
    v => Math.floor(v / roundTicksFactorX) * roundTicksFactorX
  );


  var minX = Math.min.apply(null, floorsX);

  // if (minX > 0) {
  //   minX = 0;
  // }


  var ceilingsX = XChangeVals.map(
    v => Math.ceil(v / roundTicksFactorX) * roundTicksFactorX
  );


  var maxX = Math.max.apply(null, ceilingsX);

  var extentX = [minX, maxX]

  var xScale = d3
    .scaleLinear()
    .domain(extentX)
    // .domain([-.15, .15])
    .range([0, chartWidth]);


  var values = config.data.map(v => parseFloat(v[yVar]));


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

  var yScale = d3
    .scaleLinear()
    .domain([min, max])
    .range([chartHeight, 0]);

  var colorScale = d3
    .scaleOrdinal()
    .domain(
      config.data.map(function(d) {
        return d.name;
      })
    )
    .range([
      COLORS.red3,
      COLORS.yellow3,
      COLORS.blue3,
      COLORS.orange3,
      COLORS.teal3
    ]);

  // Render the HTML legend.

  var oneLine = config.data.length > 1 ? "" : " one-line";


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
    .tickFormat(function(d, i) {
      if (d == 0 && isMobile.matches == false) {
        return "No change"
      }
      return (d*100).toFixed(0) + " pts.";
    });

  var yAxis = d3
    .axisLeft()
    .scale(yScale)
    .ticks(ticksY);

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

  var xAxisGrid = function() {
    return xAxis;
  };

  var yAxisGrid = function() {
    return yAxis;
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

  chartElement
    .append("g")
    .attr("class", "y grid")
    .call(
      yAxisGrid()
        .tickSize(-chartWidth, 0, 0)
        .tickFormat("")
    );

  // add y axis text label

  chartElement.append("text")
    .attr("y", yScale(350))
    .attr("x", 0 - margins.left)
    .text(config.page == 'trump_pct' ? "COVID-19 deaths per 100K residents" : "Past three weeks: average daily COVID-19 cases per 100K residents")
    .attr("class", "y-label")
    .call(wrapText, margins.left - 40, 14)

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


  // add bubbles

  var rScale = d3
    .scaleLinear()
    .domain([0, Math.max.apply(null, config.data.map(x=>x['total_votes']))])
    .range([3, 60]);


    var tooltipWidth = 305;
    // add in tooltip for individual state display.
    var tooltip = d3.select('.graphic')
      .append('div')
      .attr('id', 'state-tooltip')
      .style('position', 'absolute')
      .style('z-index', '10')
      .style('visibility', 'hidden')
      .style('background', '#fff')
      .style('width', tooltipWidth + "px")
      .text('');
    var mainTooltipLabel = tooltip.append('div').attr('class', 'label main');
    var tBody = tooltip.append('tbody');


  

  chartElement.selectAll("circle")
    .data(config.data)
    .enter()
    .append('circle')
    .attr("cx", d => xScale(d[xVar]) )
    .attr("cy", d => yScale(d[yVar]))
    .attr("r", d=> rScale(d['total_votes']))
    .attr("class", d=> "county-circle " + classify(d['NAMELSAD'] +", " + d['Province_State-deaths']))
    .classed("more-gop", d=>d['Trump'] > d['Biden'])
    .classed("more-dem", d=>d['Trump'] < d['Biden'])
    .on('mouseover', function (d) {

      // Don't do tooltips on mobile.
      if (isMobile.matches) {
        return;
      }
      if (lookupActive) {
        d3.selectAll(".county-circle").classed("highlight", false);
      }
      lookupActive = false;
      
      mainTooltipLabel.text(d['NAMELSAD'] +", " + d['Province_State-deaths']);
      tBody.text('');

      var plus20 = d['trump20_win'] > 0 ? "+" : ""
      var moreLess = d[xVar] >= 0 ? "better" : "worse"
      var wonLost  = d['trump20_win'] >= 0 ? 'won' : "lost"

      var lowerTooltipLabel = "";
      var ptsText = d[xVar]*100 == 1 ? "pt." : "pts."
      var xDesc = config.page == "trump_pct" ? "Trump shift" : "Turnout change"
      var yDesc = config.page == "trump_pct" ? "COVID-19 deaths per 100K residents" : "Average daily COVID-19 cases per 100K residents"
      lowerTooltipLabel += '<ul><li>2020 Trump vote: <b>' + wonLost + " by " +  (Math.abs(d['trump20_win'])*100).toFixed(1) + " pts.; "+ (Math.abs(d[xVar])*100).toFixed(1) +" pts. "+ moreLess +" than four years ago</b></li>"
      lowerTooltipLabel += '<li>'+ yDesc +':<b> ' + d[yVar].toFixed(0) + "</b></li>"
      lowerTooltipLabel += '<li>2020 votes cast:<b> ' + fmtComma(d['total_votes']) + "</b></li>"
      lowerTooltipLabel += "</ul>"
      lowerTooltipLabel = lowerTooltipLabel.replace("-0.00", "0.0")



      tBody.html(lowerTooltipLabel)

      // Set tooltip positions. If tooltip too far to the right, move
      // to lefthand side of state.
      var radius = parseInt(this.getAttribute('r'));
      var element = tooltip.node();
      // var leftOffset = 5 + radius + xScale(d[xVar]) + margins.left;
      // if (xScale(d[xVar]) > chartWidth /2) {
      //   leftOffset = xScale(d[xVar]) + margins.left - tooltipWidth;
      // }
      var leftOffset = d3.mouse(this)[0] + margins.left;
      if (xScale(d[xVar]) > chartWidth /2) {
        leftOffset = leftOffset - tooltipWidth;
      }
      // var topOffset = yScale(d[yVar])
      var topOffset = d3.mouse(this)[1];
      tooltip.style('top', topOffset + 'px');
      tooltip.style('left', leftOffset + 'px');

      return tooltip.style('visibility', 'visible');
    })
    .on('mouseout', function () {
      return tooltip.style('visibility', 'hidden');
    });


  // add 0 vert line

  chartElement.append('line')
    .attr('x1' , xScale(0))
    .attr('x2' , xScale(0))
    .attr("y1", yScale(0))
    .attr("y2", 0)
    .attr("class", 'line-zero')



  // INTERACTIVE search


  var countiesCopy = config.data.map(a => ({'NAMELSAD': a['NAMELSAD'], 'Province_State-deaths': a['Province_State-deaths']}));
  // var countiesCopy = config.data.map(a => ({ Admin2: a.id, text: a.name }));

  var sortCounties = function(a, b) {
    if (a['Province_State-deaths'] > b['Province_State-deaths']) {
      return 1
    }
    if (a['Province_State-deaths'] < b['Province_State-deaths']) {
      return -1
    }
    if (a['NAMELSAD'] > b['NAMELSAD']) {
      return 1
    }
    return -1
  }

  countiesCopy.sort(sortCounties);


  var counties = countiesCopy.map(x=>x['NAMELSAD'] + ', ' + x['Province_State-deaths'])



  d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };


  var countyMenu = d3.select('#counties');
  countyMenu
    .selectAll('option')
    .data(counties)
    .enter()
    .append('option')
    .attr('class', 'county-option')
    .text(d => d)
    .attr('value', d => d);


  d3.select(".counties#search").on('change', function() {


    lookupActive = true;


     // var selected = $.one(`input`);
     // console.log(selected)

      var inputVal = document.getElementById('search').value;
      d3.selectAll(".county-circle").classed("highlight", false);
      d3.select("." + classify(inputVal)).classed("highlight", true);
      d3.select("." + classify(inputVal)).moveToFront();

      d = config.data.filter(x=>classify(x['NAMELSAD'] +", " + x['Province_State-deaths']) == classify(inputVal))[0]



      mainTooltipLabel.text(d['NAMELSAD'] +", " + d['Province_State-deaths']);
      tBody.text('');

      var plus20 = d['trump20_win'] > 0 ? "+" : ""
      var moreLess = d[xVar] >= 0 ? "better" : "worse"
      var wonLost  = d['trump20_win'] >= 0 ? 'won' : "lost"

      var lowerTooltipLabel = "";
      var ptsText = d[xVar]*100 == 1 ? "pt." : "pts."
      var xDesc = config.page == "trump_pct" ? "Trump shift" : "Turnout change"
      var yDesc = config.page == "trump_pct" ? "COVID-19 deaths per 100K residents" : "Average daily COVID-19 cases per 100K residents"
      lowerTooltipLabel += '<ul><li>2020 Trump vote: <b>' + wonLost + " by " +  (Math.abs(d['trump20_win'])*100).toFixed(1) + " pts.; "+ (Math.abs(d[xVar])*100).toFixed(1) +" pts. "+ moreLess +" than four years ago</b></li>"
      lowerTooltipLabel += '<li>'+ yDesc +':<b> ' + d[yVar].toFixed(0) + "</b></li>"
      lowerTooltipLabel += '<li>2020 votes cast:<b> ' + fmtComma(d['total_votes']) + "</b></li>"
      lowerTooltipLabel += "</ul>"
      lowerTooltipLabel = lowerTooltipLabel.replace("-0.00", "0.0")



      tBody.html(lowerTooltipLabel)

      // Set tooltip positions. If tooltip too far to the right, move
      // to lefthand side of state.
      var radius = parseInt(this.getAttribute('r'));
      var element = tooltip.node();
      var leftOffset = 5 + radius + xScale(d[xVar]) + margins.left;
      if (xScale(d[xVar]) > chartWidth /2) {
        leftOffset = xScale(d[xVar]) + margins.left - tooltipWidth;
      }
      var topOffset = yScale(d[yVar])
      tooltip.style('top', topOffset + 'px');
      tooltip.style('left', leftOffset + 'px');

      return tooltip.style('visibility', 'visible');



  })



  // annotation

  chartElement.append("line")
    .attr('x1', xScale(.005))
    .attr('x2', xScale(.6))
    .attr('y1', yScale(206))
    .attr('y2', yScale(206))
    .attr('class', 'annot-box')

  var textWidth  =  isMobile.matches ? 95 : 200;
  var textY = isMobile.matches ? 650 : 350;
  var textX = isMobile.matches ? .163 : .3;

  chartElement.append("text")
    .attr("x", xScale(textX))
    .attr("y", yScale(textY))
    .attr("class", 'annot-text')
    .text("Counties above this line had the highest COVID-19 death rates and they increased support for Trump.")
    .call(wrapText, textWidth, 15)






  // bring bubble to front on hover


  // chartElement.selectAll(".county-circle").on('mouseover', function(){
  //   d3.select(this).moveToFront();
  // })









};

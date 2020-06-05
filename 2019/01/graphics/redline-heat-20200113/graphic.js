console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { COLORS, classify, makeTranslate, wrapText, fmtComma } = require("./lib/helpers");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale-chromatic/dist/d3-scale-chromatic.min")
};

var pymChild = null;
pym.then(function(child) {

  pymChild = child;
  child.sendHeight();
  window.addEventListener("resize", render);

  child.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });

});

var render = function() {
  var containerElement = document.querySelector(".graphic");
  //remove fallback
  containerElement.innerHTML = "";
  var containerWidth = containerElement.offsetWidth;


  //put your D3 code here

  var gradeNames = ["A", "B", "C", "D"];
  var rowHeight = 20;
  var labelWidth = 90;
  if (isMobile.matches) {
    labelWidth = 110
  }
  var svgWidth = containerWidth - labelWidth;
  var margins = {'left': 20, "right": 20, "top": 0, "bottom":0};
  var minMax = [-10, 10];
  var xScale = d3.scaleLinear()
                  .domain(minMax)
                  .range([margins.left, svgWidth - margins.right]);
  var ticksX = 10;

  if (isMobile.matches) {
    ticksX = 5
  }



 var topRow = d3.select(".graphic")
    .append("div")
    .attr("class", "grade-row top-row")

  topRow.append('div').attr("class", "grade-label")
    .attr('style', "width: " + labelWidth + "px;")
    .html("Neighborhood rating")

  topRow.append("div")
    .attr('style', "width: " + svgWidth + "px;")
    .attr("class", 'top-row-desc')
    .html("DIFFERENCE BETWEEN AVG. CITY TEMP. AND AVG. NEIGHBORHOOD TEMP")

  for (i=0; i<gradeNames.length; i++) {
    var gradeRow = d3.select(".graphic")
      .append("div")
      .attr("class", "grade-row")
      
    gradeRow.append('div').attr("class", "grade-label")
        .attr('style', "width: " + labelWidth + "px;")
        .html(function(){ 
          if (i == 0) {return gradeNames[i] + " (highest)"} 
          if (i == (gradeNames.length - 1)) {return gradeNames[i] + " (redlined)"} 
          return gradeNames[i];
        })

    gradeRow.append('svg').attr("class", "grade-svg grade-svg-" + gradeNames[i])
      .attr("height", rowHeight)
      .attr("width", svgWidth)
  }


  for (i=0; i<gradeNames.length; i++) {
    var gradeSvg = d3.select(".grade-svg-" + gradeNames[i]) 


    gradeSvg.selectAll('circle')
      .data(DATA)
      .enter()
      .append('circle')
      .attr('class', d=>'row-circle ' + d.City)
      .attr('cx', function(d) {
        return xScale(parseFloat(d[gradeNames[i]]));
      })
      .attr('cy', rowHeight/2)
      .attr("r", 5)
      .attr("stroke-width", 1)
      .attr("fill", d=> d3.interpolateRdBu((-1 * d[gradeNames[i]] / minMax[1] / 2) + .5))

    // var portlandCircle = 

    // gradeSvg.append(portlandCircle)
    //   .html(portlandHtml)

    var portlandCircle = gradeSvg.select('circle.Portland').remove();
    gradeSvg.append(function() {
      return portlandCircle.node();
    });


  }





  // Create D3 axes.

  var xAxis = d3
    .axisBottom()
    .scale(xScale)
    .ticks(ticksX)
    .tickFormat(function(d, i) {
      return d + " F"
    });

  // Render axes to chart.

  var axisRow = d3.select(".graphic")
    .append("div")
    .attr("class", "grade-row")

  axisRow.append('div').attr("class", "grade-label")
    .attr('style', "width: " + labelWidth + "px;")
    .html("&nbsp;")

  var axisSvg = axisRow.append("svg")
    .attr("width", svgWidth)
    .attr("height", rowHeight*2)
    .attr("class", "axis-svg")

  axisSvg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", makeTranslate(0, rowHeight))
    .call(xAxis);

    // add portland label

    dSvg = d3.select('.grade-svg-D')

    dSvg.append("line")
      .attr("x1", xScale(4.806) + 9)
      .attr("x2", xScale(6.5))
      .attr('y1', rowHeight/2)
      .attr('y2', rowHeight/2)
      .attr("class", 'pointer-line')

    dSvg.append("text")
      .attr("x", xScale(6.5) + 3)
      .attr('y', rowHeight*3/4)
      .attr("class", 'pointer-text')
      .text(function(){
        if (isMobile.matches) {
          return "Portland"
        }
        return "Portland, Ore."
        
      })

    // add zero line

    d3.selectAll(".grade-svg")
      .append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", rowHeight)
      .attr("y2", 0)
      .attr('class', 'zero-line')




  pymChild.sendHeight();
};

//first render
render();
console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// var d3 = {
//   ...require("d3-array/dist/d3-array.min"),
//   ...require("d3-axis/dist/d3-axis.min"),
//   ...require("d3-scale/dist/d3-scale.min"),
//   ...require("d3-selection/dist/d3-selection.min")
// };

var pymChild = null;
pym.then(function(child) {

  pymChild = child;
  // render();
  child.sendHeight();
  // window.addEventListener("resize", render);

  child.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });

});

var render = function() {

  d3.select(".fallback").remove();
  // var containerSelector = document.querySelector(".graphic");
  //remove fallback
  // containerSelector.innerHTML = "";
  // var containerWidth = containerSelector.offsetWidth;

  // var container = d3.select(containerSelector);
  // var svg = container.append("svg");

  //put your D3 code here

  var houseSenHeight = 20
  var afterSenSplitWidth = 100
  var afterSenSecondHeight = 12
  // var arrowPointerHeight = 10;
  // var arrowPointerWidth = 5;

  var houseSenArrowSvg = d3.select(".house-sen-arrow")
                    .html("")
                    .attr("height", houseSenHeight)

  var afterSenArrowSvg = d3.select(".after-sen-arrow")
                  .html("")
                  .attr("height", houseSenHeight+ afterSenSecondHeight)

  var svgWidth = houseSenArrowSvg.node().getBoundingClientRect().width

                    // .attr("width", houseSenWidth)

  // var appendArrow = function(selector, x1, x2, y1, y2, pointerWidth, poniterHeight) {
  // houseSenArrowSvg.append('line')
  //   .attr("x1", x1)
  //   .attr("x2", x2)
  //   .attr("y1", y1)
  //   .attr("y2", y2)
  //   .attr('class', "arrow-line")

  // var lineDistance = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2))

  // houseSenArrowSvg.append('line')
  //   .attr("x1", houseSenWidth/2)
  //   .attr("x2", houseSenWidth/2 - arrowPointerWidth)
  //   .attr("y1", houseSenHeight)
  //   .attr("y2", houseSenHeight - arrowPointerHeight)
  //   .attr('class', "arrow-line")

  // houseSenArrowSvg.append('line')
  //   .attr("x1", houseSenWidth/2)
  //   .attr("x2", houseSenWidth/2 + arrowPointerWidth)
  //   .attr("y1", houseSenHeight)
  //   .attr("y2", houseSenHeight - arrowPointerHeight)
  //   .attr('class', "arrow-line")
  // }






  houseSenArrowSvg.append('line')
    .attr("x1", svgWidth/2)
    .attr("x2", svgWidth/2)
    .attr("y1", 0)
    .attr("y2", houseSenHeight)
    .attr('class', "arrow-line")


  afterSenArrowSvg.append('line')
    .attr("x1", svgWidth/2)
    .attr("x2", svgWidth/2)
    .attr("y1", 0)
    .attr("y2", houseSenHeight)
    .attr('class', "arrow-line")

    afterSenArrowSvg.append('line')
    .attr("x1", svgWidth/2 - (afterSenSplitWidth/2))
    .attr("x2", svgWidth/2)
    .attr("y1", houseSenHeight)
    .attr("y2", houseSenHeight)
    .attr('class', "arrow-line")

    afterSenArrowSvg.append('line')
    .attr("x1", svgWidth/2 + (afterSenSplitWidth/2))
    .attr("x2", svgWidth/2)
    .attr("y1", houseSenHeight)
    .attr("y2", houseSenHeight)
    .attr('class', "arrow-line")

    afterSenArrowSvg.append('line')
    .attr("x1", svgWidth/2 + (afterSenSplitWidth/2))
    .attr("x2", svgWidth/2 + (afterSenSplitWidth/2))
    .attr("y1", houseSenHeight)
    .attr("y2", houseSenHeight + afterSenSecondHeight)
    .attr('class', "arrow-line")

    afterSenArrowSvg.append('line')
    .attr("x1", svgWidth/2 - (afterSenSplitWidth/2))
    .attr("x2", svgWidth/2 - (afterSenSplitWidth/2))
    .attr("y1", houseSenHeight)
    .attr("y2", houseSenHeight + afterSenSecondHeight)
    .attr('class', "arrow-line")



     console.log(houseSenArrowSvg.node().getBoundingClientRect())


     // add in pointer for active
     if (ACTIVESTEP == 'n/a') {
       var activeStep = LABELS.active_step;
     }
     else {
       var activeStep = ACTIVESTEP;
     }


     var topPos = d3.select("#step-" + activeStep).node().getBoundingClientRect().top + 5;
     var rightPos = d3.select(".senate-wrapper").node().getBoundingClientRect().right;
     var rightMargin = 5

     console.log(topPos)
     console.log(rightPos)

     d3.select(".active-pointer")
      .attr("style", "top:" + topPos + "px; right: " + (rightPos + 5) + "px;")

    d3.select("#step-" + activeStep).classed("active-step", true)




  // houseSenArrowSvg.append('line')
  //   .attr("x1", houseSenWidth/2)
  //   .attr("x2", houseSenWidth/2 - arrowPointerWidth)
  //   .attr("y1", houseSenHeight)
  //   .attr("y2", houseSenHeight - arrowPointerHeight)
  //   .attr('class', "arrow-line")

  // houseSenArrowSvg.append('line')
  //   .attr("x1", houseSenWidth/2)
  //   .attr("x2", houseSenWidth/2 + arrowPointerWidth)
  //   .attr("y1", houseSenHeight)
  //   .attr("y2", houseSenHeight - arrowPointerHeight)
  //   .attr('class', "arrow-line")


  pymChild.sendHeight();
};

//first render

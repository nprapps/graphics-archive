// Global vars
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var pymChild;

var { COLORS, makeTranslate, classify, formatStyle } = require("./lib/helpers");

var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

// Initialize the graphic.
var onWindowLoaded = function() {

  d3.select('.loan-container').classed('condensed', true);

  expandButton = d3.select('#expand')
    .on('click', function(d, i) {
      showFullGraphic();
    });


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

// show full graphic
var showFullGraphic = function() {
  d3.select('.loan-container').classed('condensed', false);
  d3.selectAll('.loan-name').style('display', 'inline');

  // Update iframe
  if (pymChild) {
      pymChild.sendHeight();
  }
}

// Render the graphic(s).
var render = function() {

  // Hard-coded min and max values for loan name "scores"
  var min = 2;
  var max = 18;

  // Scales to determine bg and font colors
  var backgroundColorScale = d3.scaleLinear()
    .domain([max,min])
    .range(['#eee',COLORS.red6])
    ;

  var colorScale = d3.scaleLinear()
    .domain([max,min])
    .range(['#555',COLORS.red3])
    ;


  var loans = d3.selectAll('.loan-name')
  var numLoans = loans.size();


  loans
    .style("background-color", function(d,i) {
      return backgroundColorScale(Number(this.getAttribute("data-score")))
    })
    .style("color", function(d,i) {
      return colorScale(Number(this.getAttribute("data-score")))
    })
    // Only show a subset of the names when condensed.
    .classed("loan-expand", function(d,i) {
      return (i % 5 != 0);
    })
    ;

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
window.onload = onWindowLoaded;

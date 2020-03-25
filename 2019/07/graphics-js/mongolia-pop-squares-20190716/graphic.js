console.clear();
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var aimag = require("./aimag_proc.geo.json");
var pop = require("./pop.geo.json");


var { COLORS, wrapText, fmtComma} = require("./lib/helpers");
var d3 = {
  ...require("d3/dist/d3.min"),
  ...require("d3-geo-projection/dist/d3-geo-projection.min")
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

  var container = document.querySelector(".graphic");
  //remove fallback
  container.innerHTML = "";

  var aspectWidth = 4;
  var aspectHeight = 3;

  var margins = {
    top: 5,
    right: 5,
    bottom: 20,
    left: 30
  };

  var w = container.offsetWidth - margins.left - margins.right;
  
  var $container = d3.select(container);
  
  var total_2018 = 3238479;
  var total_1991 = 2177218;

  var ub_2018 = 1491375;
  var ub_1991 = 591489;

  var perc_91 = ub_1991/total_1991;
  var perc_2018 = ub_2018/total_2018;

  var numBoxes91 = Math.round(total_1991/1000);
  var numbers = d3.range(numBoxes91).sort(function(a,b){
    return b-a;
  });

  var numBoxes2018 = Math.round(total_2018/1000);
  var numbers2018 = d3.range(numBoxes2018).sort(function(a,b){
    return b-a;
  });

  var bigBox = $container.append("div").attr("class", "bixBox");

  var waffle_91 = bigBox.append("div").attr("class", "waffle 1991");


waffle_91.append("p")
              .html("1991")
              .style("width", "100%")
              .style("text-align", "center")

  waffle_91.selectAll(".block")
                  .data(numbers)
                  .enter()
                  .append('div')
                      .attr("class", "block")
                      .style('background-color', d => (d > (perc_91*numBoxes91) ? '#CCCCCC' : '#FE4A49'));

  waffle_91.append("p")
              .html(fmtComma(total_1991))
              .style("width", "100%")
              .style("text-align", "center");


  var waffle_18 = bigBox.append("div").attr("class", "waffle 2018");

  waffle_18.append("p")
              .html("2018")
              .style("width", "100%")
              .style("text-align", "center");

  waffle_18.selectAll(".block")
                  .data(numbers2018)
                  .enter()
                  .append('div')
                      .attr("class", "block")
                      .style('background-color', d => (d > (perc_2018*numBoxes2018) ? '#CCCCCC' : '#FE4A49'));
  
    waffle_18.append("p")
              .html(fmtComma(total_2018))
              .style("width", "100%")
              .style("text-align", "center");




  pymChild.sendHeight();
};

//first render
render();
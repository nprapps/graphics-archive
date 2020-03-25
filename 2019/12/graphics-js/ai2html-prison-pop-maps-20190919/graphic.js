console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { getParameterByName } = require("./lib/helpers/");
var d3 = {
    ...require("d3-selection/dist/d3-selection.min")
};

pym.then(child => {
    child.sendHeight();

    child.onMessage("on-screen", function(bucket) {
        ANALYTICS.trackEvent("on-screen", bucket);
    });
    child.onMessage("scroll-depth", function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });

    //

    var waupun = {'t': true, 'f': false}[getParameterByName('waupun')]

    if (!waupun) {
        d3.select('.interactive-container').style("display", "block");
    }

   var showCity = function(cityName){
     d3.selectAll(".graphic").style("display", "none")
     d3.select('#graphic-' + cityName ).style("display", "block")
     d3.selectAll(".graphic-mini").style("display", "inline-block")
     d3.selectAll('.graphic-mini' ).classed("selected-city", false)
     d3.select('#graphic-mini-' + cityName ).classed("selected-city", true)
     child.sendHeight();
   }

   d3.selectAll(".graphic-mini").on("click", function(){
        var thisCity = d3.select(this).attr("data-city")
        showCity(thisCity)
   })

   if (waupun) {
    showCity('waupun')
   }
   else {
    showCity('florence')
   }



    //

    window.addEventListener("resize", () => child.sendHeight());

    window.setInterval(function() {
        child.sendHeight()
    }, 250)
});

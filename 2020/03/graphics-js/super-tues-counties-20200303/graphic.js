console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

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

  child.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  child.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });

});

var render = function() {

  var candRowWidth = d3.select(".cand-row").node().getBoundingClientRect().width
  var candNamePhotoHeight = d3.select(".cand-name-container").node().getBoundingClientRect().height
  // var labelWidth = 250;





  var notStackedDivs = d3.selectAll('.not-stacked-bar');

  var maxNotStackedPct = 0;


  for (i in DATA) {
    var thisDATA = DATA[i];
    for (key in DATA[0]) {
      if (thisDATA[key] > maxNotStackedPct) {
        maxNotStackedPct = thisDATA[key]
      }
    }
  }

  console.log(maxNotStackedPct)


  notStackedDivs.each(function(d, ind) {
    var thisd3 = d3.select(this)
    thisd3.attr('style', "margin-top: -" + candNamePhotoHeight + "px; width: " + (candRowWidth) * ((thisd3.attr("data-pct") / maxNotStackedPct)) + "px") 
  })

  d3.selectAll(".pct-label").each(function(d, ind) {
    d3.select(this).attr("style", "margin-top: -" + candNamePhotoHeight + "px; ")
  })




// handle raw vote sizing

var maxVotes = 0;

for (i in CANDDATA) {
  if (CANDDATA[i].total > maxVotes) {
    maxVotes = CANDDATA[i].total;
  }
}

var maxRowHeight = 300;

d3.selectAll(".stacked-bar").each(function(el, ind) {
  var thisd3 = d3.select(this);
  if (thisd3.classed("all")) {
    return
  } 
  var height = maxRowHeight * thisd3.attr('data-raw-votes') / maxVotes;
  if (height < 1) {
    height = 1
  }

  if (thisd3.attr("style").indexOf("height") > -1) {
    return
  }


  thisd3.attr("style", thisd3.attr("style") + "; height:" + height + "px;")
})














  pymChild.sendHeight();
};

//first render
render();
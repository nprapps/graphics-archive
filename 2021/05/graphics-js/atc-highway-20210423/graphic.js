var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var $ = require('./lib/qsa');
var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};


var onWindowLoaded = function() {
  pym.then(child => {

      var mapWrapper = document.querySelector(".graphic");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_pre").classList.add("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_mid").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_post").classList.add("toggleAway");

      mapWrapper.querySelector("#g-_ai2html-graphic-small_pre").classList.add("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_mid").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_post").classList.add("toggleAway");

      $.one('.controls').addEventListener('change', toggleMap);

      setHeightGraphic(mapWrapper)

      child.sendHeight();

      window.addEventListener("resize", () => setHeightGraphic(mapWrapper));
  });
}

var setHeightGraphic = function(mapWrapper) {
  //var mapWrapper = document.querySelector("#graphic");
  var graphicWidth = mapWrapper.getBoundingClientRect().width
  //console.log(mapWrapper.getBoundingClientRect())
  //console.log(`${Math.round(graphicWidth/1.62)}`)
  if (graphicWidth >= 500){
    mapWrapper.style.height = `${Math.round(graphicWidth/1.62)}px`
  }

  else {
    mapWrapper.style.height = `${Math.round(graphicWidth*1.325)}px`
  }
  
  //console.log(mapWrapper.getBoundingClientRect())
  pym.then(child => {
    child.sendHeight();
  });
  
}

var toggledResults = false;
var toggledProjections = false;

var toggleMap = function(evt) {
  var target = evt.srcElement.id;
  var mapWrapper = document.querySelector("#graphic");
  //var chartWrapper = d3.select("#charts");
  //var legendWrapper = d3.select(".key-wrap");

  switch(target) {
    case "mode-pre":

      mapWrapper.querySelector("#g-_ai2html-graphic-wide_pre").classList.add("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_pre").classList.remove("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_mid").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_mid").classList.remove("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_post").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_post").classList.remove("toggleTo");

      mapWrapper.querySelector("#g-_ai2html-graphic-small_pre").classList.add("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_pre").classList.remove("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_mid").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_mid").classList.remove("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_post").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_post").classList.remove("toggleTo");

      mapWrapper.querySelector("#g-ai3-5 p").innerHTML = LABELS.nickerson_label
      mapWrapper.querySelector("#g-ai5-2 p").innerHTML = LABELS.nickerson_label
      break;
    case "mode-mid":
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_pre").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_pre").classList.remove("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_mid").classList.add("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_mid").classList.remove("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_post").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_post").classList.remove("toggleTo");

      mapWrapper.querySelector("#g-_ai2html-graphic-small_pre").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_pre").classList.remove("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_mid").classList.add("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_mid").classList.remove("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_post").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_post").classList.remove("toggleTo");
      

      mapWrapper.querySelector("#g-ai3-5 p").innerHTML = LABELS.nickerson_label
      mapWrapper.querySelector("#g-ai5-2 p").innerHTML = LABELS.nickerson_label
      break;

    case "mode-post":
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_pre").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_pre").classList.remove("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_mid").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_mid").classList.remove("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_post").classList.add("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-wide_post").classList.remove("toggleAway");

      mapWrapper.querySelector("#g-_ai2html-graphic-small_pre").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_pre").classList.remove("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_mid").classList.add("toggleAway");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_mid").classList.remove("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_post").classList.add("toggleTo");
      mapWrapper.querySelector("#g-_ai2html-graphic-small_post").classList.remove("toggleAway");

      mapWrapper.querySelector("#g-ai3-5 p").innerHTML = LABELS.nickerson_after_label
      mapWrapper.querySelector("#g-ai5-2 p").innerHTML = LABELS.nickerson_after_label

      break;
  }

  //pymChild.sendHeight();
}

var renderLegend = function(config) {
  var legendElement = d3.select(config['container']);

  config.data.forEach((item, i) => {
    var keyItem = legendElement.append('li')
      .attr("class", "key-item ");

    keyItem.append('b').style("background",Object.entries(item)[0][1]);

    if (Object.entries(item)[0][0] == 0){
      keyItem.append('label')
      .text('0');
    }

    else if (Object.entries(item)[0][0] > 0){
      keyItem.append('label')
      .text('+' + Object.entries(item)[0][0]);
    }

    else {
      keyItem.append('label')
      .text(Object.entries(item)[0][0]);
    }

    
  });
};

// wait for images to load
window.onload = onWindowLoaded;

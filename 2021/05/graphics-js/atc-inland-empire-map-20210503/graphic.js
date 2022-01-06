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
      mapWrapper.querySelector("#g-_ai2html-map-wide_black").style.display = 'block';
      mapWrapper.querySelector("#g-_ai2html-map-wide_overall").style.display = 'none';
      mapWrapper.querySelector("#g-_ai2html-map-small_black").style.display = 'block';
      mapWrapper.querySelector("#g-_ai2html-map-small_overall").style.display = 'none';
      
      child.sendHeight();

      var colorScale = [{'-25':'#ead79b'},{'0':'#c3dced'},{'25':'#81accd'},{'50':'#407CAD'}]

      renderLegend({
        container: '.key',
        data: colorScale
      })

      

      $.one('.controls').addEventListener('change', toggleMap);

      window.addEventListener("resize", () => child.sendHeight());
  });
}

var renderLegend = function(config) {
  var legendElement = d3.select(config['container']);

  var keyItem = legendElement.append('li')
      .attr("class", "key-item ");

  config.data.forEach((item, i) => {
    var keyItem = legendElement.append('li')
      .attr("class", "key-item ");

    keyItem.append('b').style("background",Object.entries(item)[0][1]);

    if (Object.entries(item)[0][0] == 100){
      keyItem.append('label')
      .text('100+');
    }

    else if (Object.entries(item)[0][0] > 0){
      keyItem.append('label')
      .text(Object.entries(item)[0][0]);
    }

    else {
      keyItem.append('label')
      .text(Object.entries(item)[0][0]);
    }

    if (i == 3) {
      keyItem.append('label')
      .text('75+%');
    }

    
  });

  
};


var toggleMap = function(evt) {
  var target = evt.srcElement.id;
  var mapWrapper = document.querySelector("#graphic");
  //var chartWrapper = d3.select("#charts");
  //var legendWrapper = d3.select(".key-wrap");

  switch(target) {
    case "mode-black":

      mapWrapper.querySelector("#g-_ai2html-map-wide_black").style.display = 'block';
      mapWrapper.querySelector("#g-_ai2html-map-wide_overall").style.display = 'none';
      mapWrapper.querySelector("#g-_ai2html-map-small_black").style.display = 'block';
      mapWrapper.querySelector("#g-_ai2html-map-small_overall").style.display = 'none';
      break;
    case "mode-overall":
      mapWrapper.querySelector("#g-_ai2html-map-wide_black").style.display = 'none';
      mapWrapper.querySelector("#g-_ai2html-map-wide_overall").style.display = 'block';
      mapWrapper.querySelector("#g-_ai2html-map-small_black").style.display = 'none';
      mapWrapper.querySelector("#g-_ai2html-map-small_overall").style.display = 'block';
      break;

  //pymChild.sendHeight();
}
}

// wait for images to load
window.onload = onWindowLoaded;

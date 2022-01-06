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

var onWindowLoaded = function() {
  pym.then(child => {
      child.sendHeight();

      // var legendContainer = document..select(".key-wrap").append('ul')
      // .attr('class', 'key');

      var colorScale = [{'A':'#49b540'},{'B':'#7dacdb'},{'C':'#e3c64a'},{'D':'#d75b6c'},]

      renderLegend({
        container: '.key',
        data: colorScale
      })

      // child.onMessage("on-screen", function(bucket) {
      //     ANALYTICS.trackEvent("on-screen", bucket);
      // });
      // child.onMessage("scroll-depth", function(data) {
      //     data = JSON.parse(data);
      //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
      // });

      window.addEventListener("resize", () => child.sendHeight());
  });
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

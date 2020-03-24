var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// var d3 = {
//   ...require("d3-geo"),
//   ...require("d3-geo-projection"),
//   ...require("d3-selection")
// };

// var topojson = require("topojson-client");
// var geometry = require("world-atlas/countries-110m.json");

var $ = require("./lib/qsa");

console.clear();

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
  var containerWidth = container.offsetWidth;

  // var $container = d3.select(container);
  // var svg = $container.append("svg");
  // console.log(d3);
  // svg
  //   .attr("viewBox", "139 35 681 332")
  //   .attr("preserveAspectRatio", "xMinYMin meet")

  //put your D3 code here

  // var geojson = topojson.feature(geometry, geometry.objects.countries);
  // var projection = d3.geoMiller();
  // var path = d3.geoPath(projection);
  // svg
  //   .append("g")
  //   .selectAll("path")
  //   .data(geojson.features.filter(d => d.properties.name != "Antarctica"))
  //   .enter()
  //     .append("path")
  //     .attr("id", d => d.properties.name)
  //     .attr("d", path)
  //     .attr("fill", "black");

  var paths = $(".graphic path[id]");
  paths.forEach(function(p) {
    var country = p.id;
    var lookup = DATA[country];
    if (!lookup) {
      p.setAttribute("class", "missing");
      // console.log(`No data for ${country}`);
      return;
    }
    p.setAttribute("class", lookup.status);
  });

  if (pymChild) pymChild.sendHeight();
};

//first render
render();
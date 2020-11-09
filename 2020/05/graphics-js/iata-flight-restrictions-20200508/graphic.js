var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { COLORS } = require("./lib/helpers");

var pymChild = null;
pym.then(function(child) {
  pymChild = child;
  child.sendHeight();
});

var d3 = {
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-geo-projection/dist/d3-geo-projection.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

console.clear();

var init = async function() {
  var geoRequest = await fetch("./countries_filtered.json");
  var geojson = await geoRequest.json();

  var lookup = {};
  geojson.features.forEach(function(feature) {
    var name = feature.properties.NAME;
    feature.properties.name = name;
    lookup[name] = feature;
  });

  window.DATA.forEach(function(row) {
    var feature = lookup[row.country];
    if (!feature) {
      // console.log(`No matching feature for ${row.country}`);
      return;
    }
    if (row.ignore) {
      // console.log(`${row.country} marked for ignore`);
      geojson.features = geojson.features.filter(x => x != feature);
    }

    Object.assign(feature.properties, row);
  });

  render(geojson);

  window.addEventListener("resize", () => render(geojson));
}

var render = async function(data) {
  var containerElement = document.querySelector(".graphic");
  //remove fallback
  containerElement.innerHTML = "";
  var containerWidth = containerElement.offsetWidth;
  var aspectRatio = 9 / 16; //isMobile.matches ? 3/4 : 9/16;

  var chartWidth = containerWidth;
  var chartHeight = chartWidth * aspectRatio;

  var container = d3.select(".graphic");
  var svg = container.append("svg");

  svg.attr("width", chartWidth);
  svg.attr("height", chartHeight);

  var projection = d3.geoRobinson()
    .translate([chartWidth / 2, chartHeight / 2.3]) // translate to center of screen
    .scale(chartWidth / 1.6 / Math.PI)
    .center([15, 20]);

  var geoPath = d3.geoPath()
    .projection(projection);

  var counts = {};

  svg.selectAll(".country")
    .data(data.features)
    .enter()
    .append("path")
    .attr("d", geoPath)
    .attr("data-country", d => d.properties.name)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("data-category", function({ properties }) {
      var { name, code } = properties;
      if (!code) {
        // console.log(`No data for ${name}`);
        return "no_data";
      }

      counts[code] = code in counts ? counts[code] + 1 : 1;
      return code;
    });

  for (var key in counts) {
    document.querySelector(`[data-count="${key}"]`).innerHTML = `(${counts[key]})`;
  }

  if (pymChild) pymChild.sendHeight();
};

//first render
init();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
require("component-leaflet-map");
var $ = require("./lib/qsa");
var xhr = require("./lib/xhr");
var colors = require("./lib/helpers/colors");
var rgb = (r, g, b) => `rgb(${r}, ${g}, ${b})`;
var hsl = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;
var gray = g => `rgb(${g * 255}, ${g * 255}, ${g * 255})`;

pym.then(child => {
    child.sendHeight();

    child.onMessage("on-screen", function(bucket) {
        ANALYTICS.trackEvent("on-screen", bucket);
    });
    child.onMessage("scroll-depth", function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });

    window.addEventListener("resize", () => child.sendHeight());
});

var mapElement = $.one("leaflet-map");
var map = mapElement.map;
var L = mapElement.leaflet;

var turnoutMax = 0;
var turnoutBuckets = [];

var mode = $.one(".controls input:checked").value;
console.clear();

var style = function(feature) {
  var { turnout, lightfoot, preckwinkl } = feature.properties;
  var fillColor = "transparent";
  switch (mode) {
    case "winner":
      if (lightfoot - preckwinkl != 0) {
        fillColor = lightfoot > preckwinkl ? colors.orange3 : colors.blue3;
      }
    break;

    case "turnout":
      if (turnout) turnoutBuckets.forEach(function(bucket) {
        var [ edge, color ] = bucket;
        if (turnout >= edge) fillColor = color;
      })
      // fillColor = hsl(ratio * 50, ratio * 80 + 10, ratio * 60 + 20);
    break;
  }
  
  return {
    stroke: 1,
    weight: 2,
    // opacity: .1,
    fillOpacity: 1,
    fillColor,
    color: fillColor
  }
};

var turnoutBuckets = [
  [.1, colors.teal5],
  [.2, colors.teal4],
  [.3, colors.teal3],
  [.4, colors.teal2],
  [.5, colors.teal1]
];

var turnoutKey = $.one(`.key-group[data-mode="turnout"]`);
turnoutKey.innerHTML = turnoutBuckets.map(([edge, color]) => `
  <li>
    <i class="block" style="background: ${color}"></i>
    <span class="label">${edge * 100}%</span>
`).join("");

xhr("./assets/midnight_results_200m.geo.geojson", function(err, data) {
  var geojson = L.geoJSON(data, {
    onEachFeature: function(feature, layer) {
      var { ballotcast, registered } = feature.properties;
      var turnout = ballotcast / registered;
      if (turnout > turnoutMax) turnoutMax = turnout;
      feature.properties.turnout = turnout;
      feature.properties.preckwinkl *= 1;
      feature.properties.lightfoot *= 1;
    }
  });
  var bounds = geojson.getBounds();

  geojson.setStyle(style)
  map.fitBounds(bounds);
  geojson.addTo(map);

  var modeInputs = $(".controls input");

  var onChangeMode = function() {
    mode = $.one(".controls input:checked").value;
    $(".key-group").forEach(group => group.classList.toggle("show", group.dataset.mode == mode));
    geojson.setStyle(style);
  }

  modeInputs.forEach(input => input.addEventListener("change", onChangeMode));

  onChangeMode();

});
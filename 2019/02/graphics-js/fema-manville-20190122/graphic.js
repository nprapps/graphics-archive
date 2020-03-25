var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
require("component-leaflet-map");
var { isMobile } = require("./lib/breakpoints");

console.clear();

var data = require("./manville.geo.json");
var $ = require("./lib/qsa");

var mapElement = $.one("leaflet-map");
var map = mapElement.map;
var leaflet = mapElement.leaflet;

var markerLayer = new leaflet.FeatureGroup();
markerLayer.addTo(map);

data.features.forEach(function(point) {
  var { coordinates } = point.geometry;
  // swap coords because of GeoJSON
  var [ lng, lat ] = coordinates;
  var marker = new leaflet.Marker([ lat, lng ], {
    icon: new leaflet.DivIcon({ className: "fema-marker" })
  });
  marker.addTo(markerLayer);
});

// zoom to fit the bounds of the marker layer
var bounds = markerLayer.getBounds();
map.fitBounds(bounds);

var pymChild = null;

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

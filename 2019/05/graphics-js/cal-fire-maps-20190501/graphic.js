var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
require("component-leaflet-map");
var { isMobile } = require("./lib/breakpoints");
var xhr = require("./lib/xhr");

console.clear();

var data = require("./manville.geo.json");

var $ = require("./lib/qsa");

var mapElement = $.one("leaflet-map");
var map = mapElement.map;
var leaflet = mapElement.leaflet;

xhr("./high-severity-trimmed.json", function(err, data) {
  var shapes = new L.GeoJSON(data, {
    style: function(feature) {
      return {
        color: "blue",
        stroke: false,
        opacity: 1
      }
    }
  });
  shapes.addTo(map);
  markerLayer.addTo(map);
});

// var severityLayer = new leaflet.FeatureGroup();
// severityLayer.addTo(map);
var markerLayer = new leaflet.FeatureGroup();
markerLayer.addTo(map);
// polygons.addTo(map);



// var polygon = L.polygon(severityLayer, {color: 'red'}).addTo(map);

data.features.forEach(function(point) {
  var { coordinates } = point.geometry;
  // swap coords because of GeoJSON
  var [ lng, lat ] = coordinates;
  var marker = new leaflet.Marker([ lat, lng ], {
    icon: new leaflet.DivIcon({ className: "fema-marker" })
  });
  marker.addTo(markerLayer);
  console.log(point)
  var textMarker = new leaflet.Marker([lat, lng], 
  {
    icon: new leaflet.DivIcon({
      className: "fema-text-marker",
      html: "fema-text-marker"
    })
  })
});


// shpData.features.forEach(function(x) {
//   console.log(x)
//   var { coordinates } = point.geometry;
//   // swap coords because of GeoJSON
//   var [ lng, lat ] = coordinates;
//   var marker = new leaflet.Marker([ lat, lng ], {
//     icon: new leaflet.DivIcon({ className: "fema-marker" })
//   });
//   marker.addTo(markerLayer);
// });

// zoom to fit the bounds of the marker layer
var bounds = markerLayer.getBounds();

console.log(bounds)
map.fitBounds(bounds, {
    "paddingTopLeft": [0,0],
    "paddingBottomRight": [0,15]
   });

map.zoom()

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

  window.addEventListener("resize", function(){
   map.fitBounds(bounds, {
    "paddingTopLeft": [0,0],
    "paddingBottomRight": [0,15]
   });
   child.sendHeight()
 });
});

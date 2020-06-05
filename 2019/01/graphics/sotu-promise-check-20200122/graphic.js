var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var pymChild = null;

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))

// Initialize the graphic.
var onWindowLoaded = function() {
    render();

    pym.then(child => {
        pymChild = child;
        child.sendHeight();

        pymChild.onMessage("on-screen", function(bucket) {
            ANALYTICS.trackEvent("on-screen", bucket);
        });
        pymChild.onMessage("scroll-depth", function(data) {
            data = JSON.parse(data);
            ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
        });
    });
    window.addEventListener("resize", render);
};

// Render the graphic(s). Called by pym with the container width.
var render = function(containerWidth) {

    // Render the chart!
    var container = "#table-graphic";
    var element = document.querySelector(container);
    var width = element.offsetWidth;

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }

};

//Initially load the graphic
window.onload = onWindowLoaded;
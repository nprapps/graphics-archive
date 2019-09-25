console.clear()

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");


// Global vars
var pymChild = null;

var d3 = Object.assign({},
    require("d3-axis"),
    require("d3-scale"),
    require("d3-selection"),
    require('d3-format'),
    require('d3-array')
);

var { COLORS, makeTranslate, classify } = require("./lib/helpers");

var fmtComma = s => s.toLocaleString().replace(/\.0+$/, "");

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
    console.log('render')
    // Render the chart!
    // var container = "#column-chart";
    // var element = document.querySelector(container);
    // var width = element.offsetWidth;
    // renderColumnChart({
    //     container,
    //     width,
    //     data: DATA
    // });

    // changeMapColors();

    // Update iframe
    pym.then(child => {
        pymChild = child;
        child.sendHeight();
    })
};



//Initially load the graphic
window.onload = onWindowLoaded;
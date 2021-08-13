console.clear();

var pym = require("./lib/pym");
var $ = require("./lib/qsa");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var template = require("./listTemplate.js");

async function init() {
    if (window.location.hostname == "apps.npr.org") {
        var request = await fetch("https://apps.npr.org/dailygraphics/data/sheets/biden-transition-tracker-20201109.json");
        var copy = await request.json();
        var positions = copy.data.filter(d => d.category_key == window.TRACKER_FILTER && !d.hide);
        var namedPositions = positions.filter(p => p.name).map(template).join("");
        var emptyPositions = positions.filter(p => !p.name).map(template).join("");

        var listEl = $.one(".list");
        listEl.innerHTML = namedPositions + emptyPositions;
    }

    $(".show-more").forEach(function(s) {
        s.addEventListener("click", function(e) {
            var classes = e.target.closest(".words").classList;
            if (classes.contains("show")) {
                // var previous = document.querySelector(".show");
                // if (previous) previous.classList.remove("show");
                classes.remove("show");
                ANALYTICS.trackEvent("hide-more", e.target.closest(".row").classList[1]);
            } else {
                // var previous = document.querySelector(".show");
                // if (previous) previous.classList.remove("show");
                classes.add("show");
                ANALYTICS.trackEvent("show-more", e.target.closest(".row").classList[1]);
            }
            
        })
    });


};

init();

pym.then(child => {
    child.sendHeight();

    // child.onMessage("on-screen", function(bucket) {
    //     ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // child.onMessage("scroll-depth", function(data) {
    //     data = JSON.parse(data);
    //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });

    window.addEventListener("resize", () => child.sendHeight());

    // Default show first named row expanded
    // var rows = $(".row");
    // var firstNamedRow = rows.filter(r => !r.classList.contains("empty"))[0];
    // firstNamedRow.querySelector(".words").classList.add("show");

});

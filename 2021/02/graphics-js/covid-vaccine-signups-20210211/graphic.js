console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");

pym.then(child => {
    child.sendHeight();

    var showState = function(e) {
        var val;
        if (e.target) {
            if (e.target.value == "Select") return;
            val = e.target.value;
        } else {
            val = e;
            $.one("#dropdown").value = e;
        }
    	
    	if ($.one(".state-container.show")) $.one(".state-container.show").classList.remove("show");
    	var stateContainer = $.one(`.state-container.${val}`)
        stateContainer.classList.add("show");
        stateContainer.focus();
    	child.sendHeight();
    };

    $.one("#dropdown").addEventListener("input", showState);

    $.one(".footnotes .last-updated").innerHTML = window.LAST_UPDATED;

    $(".city-label").forEach(function(c) {
        c.addEventListener("click", function(e) {
            if ($.one(".state-container.show")) $.one(".state-container.show").classList.remove("show");
            $.one(`.state-container.${e.target.getAttribute("data-postal")}`).classList.add("show");
            $.one("#dropdown").value = e.target.getAttribute("data-postal");
        })
    })


    var parentURL = new URLSearchParams(location.search).get("parentUrl"); 
    if (parentURL) { var parentState = new URL(parentURL).searchParams.get("state"); }
    var childState = new URLSearchParams(location.search).get("state");
    var state = childState ? childState : parentState;
    if (state) showState(state);

    if (childState) {
        $.one(".footer .credit").innerHTML = `<p>Credit: ${CREDIT}</p>`;
    }

    // child.onMessage("on-screen", function(bucket) {
    //     ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // child.onMessage("scroll-depth", function(data) {
    //     data = JSON.parse(data);
    //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });

    window.addEventListener("resize", () => child.sendHeight());
});

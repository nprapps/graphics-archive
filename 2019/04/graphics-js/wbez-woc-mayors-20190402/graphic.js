var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

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

var $ = require("./lib/qsa");

var onClick = function() {
  $.one(".detail", this).classList.toggle("hidden");
}

$(".row").forEach(el => el.addEventListener("click", onClick));
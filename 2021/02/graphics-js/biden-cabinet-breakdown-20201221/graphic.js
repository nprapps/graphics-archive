var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

pym.then(child => {
    child.sendHeight();

    // child.onMessage("on-screen", function(bucket) {
    //     ANALYTICS.trackEvent("on-screen", bucket);
    // });
    // child.onMessage("scroll-depth", function(data) {
    //     data = JSON.parse(data);
    //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    // });

    var changeMode = function(e) {
    	document.querySelector('#state-table').setAttribute("data-mode", e.target.value);
    	document.querySelector('.key').setAttribute("data-mode", e.target.value);
    };

    window.addEventListener("resize", () => child.sendHeight());
    document.querySelector('.controls').addEventListener('change', changeMode);

});

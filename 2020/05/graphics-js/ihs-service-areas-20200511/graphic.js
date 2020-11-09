var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var onWindowLoaded = function() {
  pym.then(child => {
    var table = $.one("#table-graphic table");
    table.classList.add("collapsed");

    var expandButton = $.one("button.expander");
    expandButton.addEventListener("click", function() {
      var collapsed = table.classList.toggle("collapsed");
      console.log(collapsed);
      expandButton.innerHTML = collapsed ? "Show more" : "Show less";
      child.sendHeight();
      child.scrollParentToChildEl("table-graphic");
    });

      child.sendHeight();

      // child.onMessage("on-screen", function(bucket) {
      //     ANALYTICS.trackEvent("on-screen", bucket);
      // });
      // child.onMessage("scroll-depth", function(data) {
      //     data = JSON.parse(data);
      //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
      // });

      window.addEventListener("resize", () => child.sendHeight());
  });
}

// wait for images to load
window.onload = onWindowLoaded;

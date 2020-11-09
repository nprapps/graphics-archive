var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var pymChild = null;
var totalPostcardsClicked = 0;

var onWindowLoaded = function() {
  pym.then(child => {

    pymChild = child;

    var postcards = document.querySelectorAll("#postcards div.postcard");
    postcards.forEach((item) => {
      item.addEventListener("click", onPostcardClicked);
    }, true);

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

var onPostcardClicked = function(evt) {
  document.querySelectorAll(".active").forEach((item, i) => {
    if (item != this) {
      item.classList.remove("active");
    }
  });
  this.classList.toggle("active");

  pymChild.sendHeight();
  pymChild.scrollParentToChildEl(this.id);

  if (this.classList.contains("active")) {
    totalPostcardsClicked++;
    ANALYTICS.trackEvent("postcard-clicked", this.id);
    ANALYTICS.trackEvent("total-clicked", totalPostcardsClicked);
  }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

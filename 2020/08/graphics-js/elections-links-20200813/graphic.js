var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var onWindowLoaded = function() {
  pym.then(child => {
      child.sendHeight();
      window.addEventListener("resize", () => child.sendHeight());
  });

  // set up analytics clicks
  var links = document.querySelectorAll("a");
  links.forEach((link, i) => {
    link.addEventListener("click", onLinkClicked);
  });
}

var onLinkClicked = function() {
  ANALYTICS.trackEvent("election story box", "click internal link", this.href);
}

// wait for images to load
window.onload = onWindowLoaded;

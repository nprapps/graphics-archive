var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var onWindowLoaded = function() {
  pym.then(child => {
      child.sendHeight();

      window.addEventListener("resize", () => child.sendHeight());
  });

}

// wait for images to load
window.onload = onWindowLoaded;

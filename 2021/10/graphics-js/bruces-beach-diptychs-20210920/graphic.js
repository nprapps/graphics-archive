var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// check if this user has set "prefers reduced motion" in their browser
// thanks: https://since1979.dev/respecting-prefers-reduced-motion-with-javascript-and-react/
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

pym.then(child => {
  var videos = document.querySelectorAll('video.player');

  videos.forEach((item, i) => {
    item.addEventListener('click', playPauseVideo);
    if (reducedMotion.matches) {
      item.pause();
    }
  });

  child.sendHeight();
  window.addEventListener("resize", () => child.sendHeight());
});

var playPauseVideo = function(evt) {
  if (this.paused) {
    this.play();
  } else {
    this.pause();
  }
}

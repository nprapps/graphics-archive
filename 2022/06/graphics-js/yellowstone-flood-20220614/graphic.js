var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile, isDesktop } = require("./lib/breakpoints");

// Global vars
var videoElement = null;

// check if this user has set "prefers reduced motion" in their browser
// https://since1979.dev/respecting-prefers-reduced-motion-with-javascript-and-react/
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

pym.then(child => {
  videoElement = document.querySelector('.player');

  var videoSource = VIDEO_SOURCE;

  if (VIDEO_SOURCE_MOBILE) {
    var videoSource = VIDEO_SOURCE_MOBILE;
    if (isDesktop.matches) {
      videoSource = VIDEO_SOURCE;
    }
  }

  videoElement.innerHTML = '<source src="./synced/' + videoSource + '" type="video/mp4">';

  videoElement.addEventListener('click', playPauseVideo);

  if (reducedMotion.matches) {
    videoElement.pause();
  }

  // Update iframe
  child.sendHeight();

  window.addEventListener("resize", () => child.sendHeight());
});

var playPauseVideo = function(evt) {
  if (videoElement.paused) {
    videoElement.play();
  } else {
    videoElement.pause();
  }
}

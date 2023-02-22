var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile, isDesktop } = require("./lib/breakpoints");

// Global vars
var videoElement = null;
var DEFAULT_WIDTH = 300;

pym.then(child => {
  videoElement = document.querySelector('.player');

  // var videoSource = VIDEO_SOURCE_MOBILE;
  // if (isDesktop.matches) {
  //   videoSource = VIDEO_SOURCE;
  // }
  var videoSource = VIDEO_SOURCE;
  videoElement.innerHTML = '<source src="./synced/' + videoSource + '" type="video/mp4">';

  videoElement.addEventListener('click', playPauseVideo);

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

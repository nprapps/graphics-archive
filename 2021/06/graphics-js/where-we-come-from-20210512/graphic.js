var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// Global vars
var videoElement = null;
var DEFAULT_WIDTH = 300;

pym.then(child => {
  videoElement = document.querySelector('.player');

  if (typeof VIDEO_SOURCE != "undefined") {
    var videoSource = VIDEO_SOURCE;
    // if (window.matchMedia && window.matchMedia('(min-width: 501px)').matches) {
    //   videoSource = 'video1_desktop.mp4';
    // }
    videoElement.innerHTML = '<source src="' + videoSource + '" type="video/mp4">';

    videoElement.addEventListener('click', playPauseVideo);
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

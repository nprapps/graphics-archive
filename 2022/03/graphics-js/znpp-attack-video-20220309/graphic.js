var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile, isDesktop } = require("./lib/breakpoints");

// Global vars
var videoElement = document.querySelector('.player');
var progressElement = document.querySelector(".progress");
var progressInterval = null;

pym.then(child => {
  var videoSource = VIDEO_SOURCE;

  if (VIDEO_SOURCE_MOBILE) {
    var videoSource = VIDEO_SOURCE_MOBILE;
    if (isDesktop.matches) {
      videoSource = VIDEO_SOURCE;
    }
  }

  videoElement.innerHTML = '<source src="./synced/' + videoSource + '" type="video/mp4">';
  videoElement.addEventListener('click', playPauseVideo);
  progressInterval = setInterval(progressLoop);

  // Update iframe
  child.sendHeight();

  window.addEventListener("resize", () => child.sendHeight());
});

var progressLoop = function() {
  if (videoElement.duration) {
    progressElement.value = Math.round(
      (videoElement.currentTime / videoElement.duration) * 100
    );
    // progressElement.innerHTML = Math.round(video.currentTime) + " seconds";
  }
}

var playPauseVideo = function(evt) {
  if (videoElement.paused) {
    videoElement.play();
    progressInterval = setInterval(progressLoop);
  } else {
    videoElement.pause();
    clearInterval(progressInterval);
  }
}

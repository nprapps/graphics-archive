var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

// check if this user has set "prefers reduced motion" in their browser
// https://since1979.dev/respecting-prefers-reduced-motion-with-javascript-and-react/
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

var videoElement = document.querySelector('.player');
var btnMute = document.querySelector('button.mute');
var btnPause = document.querySelector('button.pause');
var progressElement = document.querySelector(".progress");
var progressInterval = null;

pym.then(child => {
  // videoElement.addEventListener('click', playPauseVideo);
  if (reducedMotion.matches) {
    videoElement.pause();
  }

  btnPause.addEventListener('click', playPauseVideo);
  btnMute.addEventListener('click', toggleMute);
  progressInterval = setInterval(progressLoop);

  // only autoplay if the video is visible
  // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  let observer = new IntersectionObserver(videoVisible, { threshold: 0.1 });
  observer.observe(videoElement);

  child.sendHeight();
  window.addEventListener("resize", () => child.sendHeight());
});

var videoVisible = function(e) {
  e.forEach((item, i) => {
    if (item.isIntersecting) {
      // console.log("visible", item);
      videoElement.play();
    } else {
      // console.log("not visible", item);
      videoElement.pause();
    }
  });
}

var playPauseVideo = function(evt) {
  var p = document.querySelector('video.player-' + this.dataset.player);

  if (p.paused) {
    p.play();
    this.ariaPressed = false;
  } else {
    p.pause();
    this.ariaPressed = true;
  }
}

var toggleMute = function(evt) {
  var p = document.querySelector('video.player-' + this.dataset.player);

  if (p.muted) {
    p.muted = false;
    this.ariaPressed = false;
  } else {
    p.muted = true;
    this.ariaPressed = true;
  }
}

var progressLoop = function() {
  if (videoElement.duration) {
    progressElement.value = Math.round(
      (videoElement.currentTime / videoElement.duration) * 100
    );
    // progressElement.innerHTML = Math.round(video.currentTime) + " seconds";
  }
}

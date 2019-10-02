// Global vars
var pymChild = null;
var isMobile = false;
var videoElement = null;

var DEFAULT_WIDTH = 300;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    videoElement = document.querySelector('.drone-video');

    pymChild = new pym.Child({
      polling: 200,
      renderCallback: render
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
      containerWidth = DEFAULT_WIDTH;
    }

    var videoSource = 'riding-mobile.mp4';
    if (window.matchMedia && window.matchMedia('(min-width: 501px)').matches) {
      videoSource = 'riding-desktop.mp4';
    }
    videoElement.innerHTML = '<source src="./assets/' + videoSource + '" type="video/mp4">';

    // videoElement.addEventListener('click', playPauseVideo);

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var playPauseVideo = function(evt) {
  if (videoElement.paused) {
    videoElement.play();
  } else {
    videoElement.pause();
  }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

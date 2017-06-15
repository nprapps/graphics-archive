// Global vars
var pymChild = null;
var isMobile = false;

var player = null;
var playerBtn = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    player = document.querySelector('.player');
    playerBtn = document.querySelector('.player-btn');

    playerBtn.addEventListener('click', onPlayerBtnClick);
    player.addEventListener('ended', onPlayerEnded);
}

var onPlayerBtnClick = function(e) {
    if (player.paused ||!player.currentTime) {
        player.play();
        this.querySelector('.icon').classList.remove('play')
        this.querySelector('.icon').classList.add('pause');
        ANALYTICS.trackEvent('play-audio');
    } else {
        player.pause();
        this.querySelector('.icon').classList.remove('pause');
        this.querySelector('.icon').classList.add('play')
        ANALYTICS.trackEvent('pause-audio');
    }
}

var onPlayerEnded = function(e) {
    playerBtn.querySelector('.icon').classList.remove('pause');
    playerBtn.querySelector('.icon').classList.add('play')
    ANALYTICS.trackEvent('audio-completed')
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }
    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

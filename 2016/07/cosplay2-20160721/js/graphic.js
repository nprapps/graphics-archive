var pymChild = null;
var isMobile = Modernizr.touchevents;
var graphic = null;
var audio = null;
var h1 = null;
var overlay = null;
var playing = false;
var playedTime = null;

var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    graphic = document.querySelector('#graphic');
    audio = document.getElementsByTagName('audio')[0];
    overlay = document.querySelector('.overlay');
    h1 = document.querySelector('.overlay h1.instructions');

    if (isMobile) {
        graphic.addEventListener('click', onTouch);
    } else {
        overlay.addEventListener('mouseenter', onMouseEnter);
        overlay.addEventListener('mouseleave', onMouseLeave);
    }

    audio.addEventListener('ended', onEnded);

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

var onTouch = function() {
    var overlayOpacity = getComputedStyle(overlay)['opacity'];

    if (!playing) {
        playAudio();
        h1.classList.add('playing');
    } else {
        pauseAudio();
        h1.classList.remove('playing');
    }
}

var onMouseEnter = function() {
    if (!playing) {
        playAudio();
    }
}

var onMouseLeave = function() {
    if (playing) {
        pauseAudio();
    }
}


var playAudio = function() {
    audio.play();
    playing = true;
    playedTime = new Date();
    ANALYTICS.trackEvent('audio-played');
}

var pauseAudio = function() {
    audio.pause();
    playing = false;

    var stoppedTime = new Date();
    var timeListened = stoppedTime - playedTime;
    ANALYTICS.trackEvent('audio-stopped', null, timeListened);
}

var onEnded = function() {
    ANALYTICS.trackEvent('audio-completed');
    playing = false;
}

window.onload = onWindowLoaded;

// Global vars
var pymChild = null;
var playing = false;
var imageWrapper = null;
var instructionText = null;
var audioElement = null;

/*
* Initialize the graphic.
*/
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    // define elements
    audioElement = document.querySelector('#audio');
    imageWrapper = document.querySelector('#graphic-image');
    instructionText = document.querySelector('.overlay .instructions');

    // add event listeners
    audioElement.addEventListener('ended', onPlayEnded);
    imageWrapper.addEventListener('click', onTouch);

    // Carebot
    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

var onTouch = function(e) {
    if (!playing) {
        playAudio();
        ANALYTICS.trackEvent('play-audio');
        instructionText.classList.add('playing');
    } else {
        pauseAudio();
    }
}

var playAudio = function(){
    var playPromise = audioElement.play();

    if (playPromise != undefined) {
        playPromise.then(function() {
            playing = true;
        });
    } else {
        playing = true;
    }
}

var pauseAudio = function(){
    audioElement.pause();
    instructionText.classList.remove('playing');
    playing = false;
    ANALYTICS.trackEvent('pause-audio');
}

var onPlayEnded = function(e) {
    playing = false;
    instructionText.classList.remove('playing');
    ANALYTICS.trackEvent('audio-completed');
}


/*
* Initially load the graphic
* (NB: Use window.load to ensure all images have loaded)
*/
window.onload = onWindowLoaded;

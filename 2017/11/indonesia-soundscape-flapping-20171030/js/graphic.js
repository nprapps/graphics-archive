// Global vars
var pymChild = null;
var isMobile = Modernizr.touchevents;
var playing = false;
var h1 = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {

    pymChild = new pym.Child({});

    var graphic = document.querySelector("#graphic");
    h1 = document.querySelector('.overlay h1.instructions');

    var mode = getParameterByName('mode');

    if (mode == 'hp'){
      document.querySelector("#iframeBody").classList.add('homepage');
    }

    if (isMobile) {
        graphic.addEventListener('click', onTouch);
    } else {
        graphic.addEventListener('mouseenter', onMouseEnter);
        graphic.addEventListener('mouseleave', onMouseLeave);
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

var onTouch = function() {
  if (!playing) {
      playAudio();
      h1.classList.add('playing');
  } else {
      pauseAudio();
      h1.classList.remove('playing');
  }
}

var onMouseEnter = function(){
  if (!playing){
    playAudio();
  }
}

var onMouseLeave = function(){
  if (playing){
    pauseAudio();
  }
}

var playAudio = function(){
  var playPromise = document.querySelector('#audio').play();

  if (playPromise != undefined) {
    playPromise.then(function() {
      playing = true;
    });
  }
  else{
    playing = true;
  }

}

var pauseAudio = function(){
  document.querySelector('#audio').pause();
  playing = false;
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

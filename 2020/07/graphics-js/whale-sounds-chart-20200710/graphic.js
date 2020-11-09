console.clear();

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var $ = require("./lib/qsa");
var { isMobile } = require("./lib/breakpoints");

var onWindowLoaded = function() {

  // set up audio players
  var setupAudio = function(url, label) {
    var audio = document.createElement("audio");
    audio.src = url;

    var labels = $(".g-" + label);

    var onClick = function(e) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
      onTime();
    };

    var onTime = function() {
      buttons.forEach(function(b) {
        if (audio.paused) {
          $(".play", b).forEach( p => p.classList.add("show"));
          $(".pause", b).forEach( p => p.classList.remove("show"));
        } else {
          $(".play", b).forEach( p => p.classList.remove("show"));
          $(".pause", b).forEach( p => p.classList.add("show"));
        }
      });

      buttons.forEach(b => b.setAttribute("aria-label", audio.paused ? "play" : "pause"));
    };

    audio.addEventListener("timeupdate", onTime);

    var buttons = [];

    labels.forEach(function(l) {
      var button = document.createElement("button");
      button.setAttribute("aria-label", "play");

      var svgPlay = document.createElement("img");
      svgPlay.src = "./assets/play.svg";
      svgPlay.classList.add("play");
      svgPlay.classList.add("show");
      svgPlay.setAttribute("width", "24px");
      button.appendChild(svgPlay);
      var svgPause = document.createElement("img");
      svgPause.src = "./assets/pause.svg";
      svgPause.classList.add("pause");
      button.appendChild(svgPause);

      buttons.push(button);

      // add near label
      l.appendChild(button);
      button.addEventListener("click", onClick);
    })
    
  }

  setupAudio("./assets/20180525.mp3", "text-2018");
  setupAudio("./assets/20200522b.mp3", "text-2020");

  pym.then(child => {
      child.sendHeight();

      // child.onMessage("on-screen", function(bucket) {
      //     ANALYTICS.trackEvent("on-screen", bucket);
      // });
      // child.onMessage("scroll-depth", function(data) {
      //     data = JSON.parse(data);
      //     ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
      // });

      window.addEventListener("resize", () => child.sendHeight());

  });
}

// wait for images to load
window.onload = onWindowLoaded;

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var $ = require("./lib/qsa");
var { isMobile } = require("./lib/breakpoints");
var tracked = [];

var onWindowLoaded = function() {
  // set up audio players
  var setupAudio = function(player) {
    var audio = document.querySelector("#" + player + " audio");
    var wrapper = document.querySelector("#" + player);

    // setup for analytics
    tracked[player] = false;

    var onClick = function(e) {
      // make sure all audio players are paused
      var audioAll = document.querySelectorAll("audio");

      audioAll.forEach(function(a) {
        // this player
        if (a == audio) {
          if (audio.paused) {
            audio.play();

            if (tracked[player] == false) {
              // console.log("tracked: ", MODULE, player);
              ANALYTICS.trackEvent(MODULE, "play " + player);
              tracked[player] = true;
            }
          } else {
            audio.pause();
          }
        // pause all other players
        } else {
          a.pause();
        }
      });

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

    var button = document.createElement("button");
    button.setAttribute("aria-label", "play");

    var svgPlay = document.createElement("img");
    svgPlay.src = "./img/play.svg";
    svgPlay.classList.add("play");
    svgPlay.classList.add("show");
    svgPlay.setAttribute("width", "24px");
    svgPlay.setAttribute("alt", "Play");
    button.appendChild(svgPlay);
    var svgPause = document.createElement("img");
    svgPause.src = "./img/pause.svg";
    svgPause.classList.add("pause");
    svgPause.setAttribute("alt", "Pause");
    button.appendChild(svgPause);

    buttons.push(button);

    wrapper.prepend(button);
    button.addEventListener("click", onClick);
  }

  setupAudio("player-1");
  setupAudio("player-2");

  pym.then(child => {
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
  });
}

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

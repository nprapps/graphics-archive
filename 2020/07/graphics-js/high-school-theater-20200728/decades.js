var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

/*
 * Initialize the graphic.
 */
var initialize = function() {
  // (NB: Use window.load to ensure all images have loaded)
  window.onload = onWindowLoaded;
}


var onWindowLoaded = function() {
  pym.then(child => {
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
  });

  var plays = document.querySelectorAll('.play');
  plays.forEach((play, i) => {
    play.addEventListener('mouseover', onPlayMouseover);
    play.addEventListener('mouseout', onPlayMouseout);
  });
}

// interaction events
var onPlayMouseover = function(evt) {
  var thisPlay = evt.target.classList[2];
  var allInstances = document.querySelectorAll("." + thisPlay);
  allInstances.forEach((p, i) => {
    p.classList.add("active");
  });
}

var onPlayMouseout = function(evt) {
  var thisPlay = evt.target.classList[2];
  var allInstances = document.querySelectorAll("." + thisPlay);
  allInstances.forEach((p, i) => {
    p.classList.remove("active");
  });
}

module.exports = initialize;

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var gridWrapper = null;
var gridInterval = null;

var getRandomInt = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

var initGrid = function() {
  for (var i = 1; i < 19; i++) {
    var imageId = "image-" + i;
    var image = document.getElementById(imageId);
    var src = "./img/portraits/portrait-";
    var portraitNum = getRandomInt(1, 19);

    // console.log(portraitNum)

    image.src = src + portraitNum + ".jpg";
  }

  pym.then(child => {
    child.sendHeight();
  });
}

var playGrid = function() {
  if (!gridInterval) {
    gridInterval = setInterval(initGrid, 1500);
  }
}

var pauseGrid = function() {
  if (gridInterval) {
    clearInterval(gridInterval);
    gridInterval = null;

    // setTimeout(playGrid, 300);
  } else {
    gridInterval = setInterval(initGrid, 1500);
  }
}

var onWindowLoaded = function() {
  pym.then(child => {
    initGrid();
    playGrid();

    gridWrapper = document.querySelector(".grid-wrapper");
    gridWrapper.addEventListener("click", pauseGrid);

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

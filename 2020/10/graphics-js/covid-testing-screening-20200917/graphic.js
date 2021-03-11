var pym = require("./lib/pym");
var pymChild = null;
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");

// Initialize the graphic.
var onWindowLoaded = function() {
  pym.then(function(child) {
    pymChild = child;
    pymChild.sendHeight();

    // handle the lookup
    var sectorButtons = document.querySelectorAll("nav button");

    var onSectorSelected = function(evt) {
      if (evt.target) {
        // dectivate old one
        var oldSectorElements = document.querySelectorAll(".active");
        oldSectorElements.forEach((el, i) => {
          el.classList.remove("active");
        });

        // activate new one
        var newSector = evt.target.dataset.sector;
        document.querySelector("#" + newSector).classList.add("active");
        document.querySelector("nav ." + newSector).classList.add("active");
      }

      pymChild.sendHeight();
    }

    sectorButtons.forEach((btn, i) => {
      btn.addEventListener("click", onSectorSelected);
    });
  });
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

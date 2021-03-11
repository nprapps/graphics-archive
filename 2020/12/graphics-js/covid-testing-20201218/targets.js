var $ = require("./lib/qsa");
var pym = require("./lib/pym");
var pymChild = null;
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

pym.then(child => {
  pymChild = child;
  child.sendHeight();

  window.addEventListener("resize", () => child.sendHeight());

  // handle the lookup
  var stateSelector = document.querySelector("#state-picker");

  var onStateSelected = function(evt) {
    if (evt.target.value) {
      // console.log(evt);
      if ($.one("#targets")) {
        var t = evt.target.value.toLowerCase();

        document.querySelector("#targets .active").classList.remove("active");
        document.querySelector("#targets #" + t).classList.add("active");
      }

      pymChild.sendHeight();
    }
  }

  stateSelector.addEventListener("change", onStateSelected);
});

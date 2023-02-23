var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");

var onWindowLoaded = function() {
  pym.then(child => {
    var showState = function(e) {
      var val;
      if (e.target) {
        if (e.target.value == "Select") return;
        val = e.target.value;
      } else {
        val = e;
        $.one("#dropdown").value = e;
      }

      if ($.one("article.active")) {
        $.one("article.active").classList.remove("active");
      }

      var stateContainer = $.one(`article.${val}`)
      stateContainer.classList.add("active");
      stateContainer.focus();

      child.sendHeight();
    };

    $.one("#dropdown").addEventListener("input", showState);
    $.one("#dropdown").value = "ohio";
    $.one("#dropdown").dispatchEvent(new Event("input"));

    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
  });
}

window.onload = onWindowLoaded;

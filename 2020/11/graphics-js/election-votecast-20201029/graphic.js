var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild = null;

var onWindowLoaded = function() {
  pym.then(child => {
    pymChild = child;
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());

    var onButtonPressed = function(evt) {
      var q = document.querySelector("." + this.dataset.question);
      q.classList.add("active");
      this.classList.add("inactive");
      pymChild.sendHeight();
    }

    var buttons = document.querySelectorAll("button");
    buttons.forEach((btn, i) => {
      btn.addEventListener("click", onButtonPressed);
    });
  });
}

window.onload = onWindowLoaded;

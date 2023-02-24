var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");

var onWindowLoaded = function() {
  pym.then(child => {
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());

    var captions = document.querySelectorAll(".caption");
    captions.forEach((c, i) => {
      c.classList.add("collapsed");
    });

		// Add toggle button that can collapse/expand the list.
    var toggleButtons = document.querySelectorAll(".toggle-caption");

    toggleButtons.forEach((t, i) => {
      t.addEventListener("click", function() {
        captions.forEach((c, i) => {
          if (c.dataset.name == t.dataset.name) {
            c.classList.toggle("collapsed");

            if (c.classList.contains('collapsed')) {
      				t.textContent = t.dataset.more;
      		    // child.scrollParentToChildEl(table.id);
      	    } else {
      	      t.textContent = t.dataset.less;
      	    }
          }
        });

        child.sendHeight();
      });
    });
  });
}

// wait for images to load
window.onload = onWindowLoaded;

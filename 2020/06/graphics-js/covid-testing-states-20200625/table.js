var $ = require("./lib/qsa");
var pym = require("./lib/pym");
require("./lib/webfonts");
var pymChild = null;

// Initialize the graphic.
var initialize = function() {
  if ($.one("#state-table")) {
    window.Tablesort = require("tablesort");
    require("tablesort/dist/sorts/tablesort.number.min");

    Tablesort(document.querySelector("#state-table"), {
      descending: true
    })
  }

  if ($.one("#state-spotlight")) {
    var stateSelector = document.querySelector("#state-spotlight");

    var onStateSelected = function(evt) {
      if (evt.target.value) {
        document.querySelector(".state-desc.active").classList.remove("active");
        document.querySelector(".state-desc." + evt.target.value).classList.add("active");

        if ($.one("#state-table")) {
          document.querySelector("#state-table .active").classList.remove("active");
          document.querySelector("#state-table .state." + evt.target.value).classList.add("active");
        }

        pymChild.sendHeight();
      }
    }

    stateSelector.addEventListener("change", onStateSelected);
  }

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
  });
}

module.exports = initialize;

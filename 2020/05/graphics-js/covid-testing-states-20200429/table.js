var pym = require("./lib/pym");
require("./lib/webfonts");

// Initialize the graphic.
var initialize = function() {
  // If sortable:
  window.Tablesort = require("tablesort");
  require("tablesort/dist/sorts/tablesort.number.min");

  Tablesort(document.querySelector("#state-table"), {
    descending: true
  })

  var stateSelector = document.querySelector("#state-spotlight");

  var onStateSelected = function(evt) {
    if (evt.target.value) {
      document.querySelector(".state-desc.active").classList.remove("active");
      document.querySelector(".state-desc." + evt.target.value).classList.add("active");
      document.querySelector("#state-table .active").classList.remove("active");
      document.querySelector("#state-table .state." + evt.target.value).classList.add("active");
    }
  }

  stateSelector.addEventListener("change", onStateSelected);

  pym.then(child => {
      child.sendHeight();
      window.addEventListener("resize", () => child.sendHeight());
  });
}

module.exports = initialize;

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var $ = require("./lib/qsa");

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))

pym.then(child => {
  var table = $.one("#table-graphic table");
  table.classList.add("collapsed");

  var expandButton = $.one("button.expander");
  expandButton.addEventListener("click", function() {
    var collapsed = table.classList.toggle("collapsed");
    console.log(collapsed);
    expandButton.innerHTML = collapsed ? "Show more &#9660;" : "Show less &#9650;";
    child.sendHeight();
    child.scrollParentToChildEl("table-graphic");
  });


  child.sendHeight();
  window.addEventListener("resize", () => child.sendHeight());
});

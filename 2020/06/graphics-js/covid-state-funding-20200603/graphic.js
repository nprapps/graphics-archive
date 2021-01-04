var pym = require("./lib/pym");
require("./lib/webfonts");
var $ = require("./lib/qsa");

// If sortable:
window.Tablesort = require("tablesort");
console.log(require("tablesort"));
require("tablesort/dist/sorts/tablesort.number.min");
Tablesort(document.querySelector("#state-table"), { descending: true })

pym.then(child => {
    var table = $.one("#table-graphic table");
    table.classList.add("collapsed");

    var expandButton = $.one("button.expander");
    expandButton.addEventListener("click", function() {
      var collapsed = table.classList.toggle("collapsed");
      table.classList.toggle("open");
      console.log(collapsed);
      expandButton.innerHTML = collapsed ? "Show more ▼" : "Show less ▲";
      child.sendHeight();
      child.scrollParentToChildEl("table-graphic");
    });

    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
});
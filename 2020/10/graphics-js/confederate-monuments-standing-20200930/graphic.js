var pym = require("./lib/pym");
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
      expandButton.innerHTML = collapsed ? "Show All &#9660;" : "Show Less &#9650;";
      child.sendHeight();
      child.scrollParentToChildEl("table-graphic");
    });

    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
});

var pym = require("./lib/pym");
require("./lib/webfonts");
var $ = require("./lib/qsa");

// If sortable:
window.Tablesort = require("tablesort");
require("tablesort/dist/sorts/tablesort.number.min");
Tablesort(document.querySelector("#state-table-1"))
Tablesort(document.querySelector("#state-table-2"))
Tablesort(document.querySelector("#state-table-3"))

pym.then(child => {
	// var table1 = $.one("#state-table-container-1 table");
  var table2 = $.one("#state-table-container-2 table");
  var table3 = $.one("#state-table-container-3 table");

  // table1.classList.add("collapsed");
  table2.classList.add("collapsed");
  table3.classList.add("collapsed");

    // var expandButton1 = $.one("button.expander.e1");
    var expandButton2 = $.one("button.expander.e2");
    var expandButton3 = $.one("button.expander.e3");

    // expandButton1.addEventListener("click", function() {
    //   var collapsed = table1.classList.toggle("collapsed");
    //   console.log(collapsed);
    //   expandButton1.innerHTML = collapsed ? "Show All &#9660;" : "Show Less &#9650;";
    //   child.sendHeight();
    //   child.scrollParentToChildEl("state-table-container-1");
    // });

    expandButton2.addEventListener("click", function() {
      var collapsed = table2.classList.toggle("collapsed");
      // console.log(collapsed);
      expandButton2.innerHTML = collapsed ? "Show All &#9660;" : "Show Less &#9650;";
      child.sendHeight();
      child.scrollParentToChildEl("state-table-container-2");
    });

    expandButton3.addEventListener("click", function() {
      var collapsed = table3.classList.toggle("collapsed");
      // console.log(collapsed);
      expandButton3.innerHTML = collapsed ? "Show All &#9660;" : "Show Less &#9650;";
      child.sendHeight();
      child.scrollParentToChildEl("state-table-container-3");
    });

    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());
});

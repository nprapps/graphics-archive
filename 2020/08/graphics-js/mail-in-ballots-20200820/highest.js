var pym = require("./lib/pym");
require("./lib/webfonts");
var $ = require("./lib/qsa");

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))

pym.then(child => {
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());


    var table = $.one(".rejected-table");
    table.classList.add('collapsed');

    // Add toggle button that can collapse/expand the list.
    var toggleButton = $.one(".toggle-table");
    toggleButton.addEventListener('click', function() {
      table.classList.toggle("collapsed");
      child.sendHeight();

      if (table.classList.contains('collapsed')) {
        toggleButton.textContent = toggleButton.dataset.more;
        child.scrollParentToChildEl(table.id);
      } else {
        toggleButton.textContent = toggleButton.dataset.less;
      }

    });
});

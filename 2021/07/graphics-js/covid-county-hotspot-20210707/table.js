var pym = require("./lib/pym");
var $ = require("./lib/qsa");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");

// If sortable:
window.Tablesort = require("tablesort");
require("tablesort/dist/sorts/tablesort.number.min");
Tablesort(document.querySelector("#state-table"));

pym.then(child => {
  pym.then(child => {

		window.addEventListener("resize", () => child.sendHeight());

		var table = $.one("#table-graphic");
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
		child.sendHeight()
	});

});

console.clear();

var pym = require("./lib/pym");
require("./lib/webfonts");
var $ = require("./lib/qsa");

// If sortable:
// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"))

var pymChild;

pym.then(child => {
    child.sendHeight();
    window.addEventListener("resize", () => child.sendHeight());

    // show/hide interactivity
	var hidden = true;
	var parent = document.querySelector('.graphic');

	// Add toggle button that can collapse/expand the list.
	var toggleButton = $.one(".toggle-table");
	toggleButton.addEventListener('click', function() {
	hidden = !hidden
	parent.classList.toggle("hide-others", hidden);
	if (hidden) {
	  toggleButton.textContent = toggleButton.dataset.more;
	} else {
	  toggleButton.textContent = toggleButton.dataset.less;
	}
	child.sendHeight();

	});

});


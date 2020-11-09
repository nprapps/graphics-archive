var pym = require("./lib/pym");
var $ = require("./lib/qsa");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");

//Initialize graphic
var onWindowLoaded = async function() {

	pym.then(child => {

		window.addEventListener("resize", () => child.sendHeight());

		// var table = $.one(".table-viz");
		// table.classList.add('collapsed');

		// // Add toggle button that can collapse/expand the list.
		// var toggleButton = $.one(".toggle-table");
	 //  toggleButton.addEventListener('click', function() {
		// 	table.classList.toggle("collapsed");
		// 	child.sendHeight();

		// 	if (table.classList.contains('collapsed')) {
		// 		toggleButton.textContent = toggleButton.dataset.more;
		//     child.scrollParentToChildEl(table.id);
	 //    } else {
	 //      toggleButton.textContent = toggleButton.dataset.less;
	 //    }

		// });
	});
};

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;
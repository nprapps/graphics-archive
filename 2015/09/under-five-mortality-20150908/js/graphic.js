/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    var tablesort = new Tablesort(document.getElementById('country-table'));

    pymChild = new pym.Child({});
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

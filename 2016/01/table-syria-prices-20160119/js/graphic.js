var tabs = null;
var tables = null;
var first = 'rice-per-1-kg';
var firstTab = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    tabs = d3.selectAll('.tabs li');
    firstTab = d3.selectAll('.tabs .' + first);
    tables = d3.selectAll('table');

    tabs.on('click', onTabClicked);

    pymChild = new pym.Child({});

    d3.selectAll('.tabs .' + first).each(onTabClicked);
}

var onTabClicked = function() {
    var t = d3.select(this);
    if (t.classed('active') == false) {
        var tbl = d3.select('table.' + t.attr('class'));

        tabs.classed('active', false);
        tables.classed('active', false);

        t.classed('active', true);
        tbl.classed('active', true);

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

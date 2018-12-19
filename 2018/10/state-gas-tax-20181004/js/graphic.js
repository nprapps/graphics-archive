/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    // Uncomment to enable column sorting
     var tablesort = new Tablesort(document.getElementById('state-table'));
     addColors();

    pymChild = new pym.Child({});
}

var addColors = function() {
    var colorScale = d3.scale.linear()
        .domain([1, 0])
        .range(['#ff8c00','#F1C696']); // GOOD orange-azure

    var whiteScale = d3.scale.linear()
        .domain([0, 1])
        .range(['#ffffff','#ffffff']); // GOOD orange-azure

    d3.selectAll('td.cell-shade')
        .style('background', function() {
            var diff = Math.abs(d3.select(this).attr('data-diff'));
            if (d3.select(this).classed('row-total_tax') || d3.select(this).classed('row-state_tax')) {
                return colorScale(diff);
            } else {
                return whiteScale(diff);
            }
        });
};


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

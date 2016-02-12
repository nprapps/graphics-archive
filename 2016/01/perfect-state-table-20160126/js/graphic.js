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
        .domain([0, 10, 25, 150])
        .range(['#ff8c00','#f7b881','#d8e3e2','#d8e3e2']); // GOOD orange-azure

    var raceScale = d3.scale.linear()
        .domain([0, 20, 50, 150])
        .range(['#ff8c00','#f7b881','#d8e3e2','#d8e3e2']); // GOOD orange-azure

    d3.selectAll('td.cell-shade')
        .style('background', function() {
            var diff = Math.abs(d3.select(this).attr('data-diff'));
            if (d3.select(this).classed('row-race')) {
                return raceScale(diff);
            } else {
                return colorScale(diff);
            }
        });
};


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});
    
    var sports = d3.selectAll('.activity')
        .on('mouseover', onSportMouseover)
        .on('mouseout', onSportMouseOut);
}

var onSportMouseover = function() {
    var c = d3.select(this);
    var thisSport = c.attr('class').split(' ')[1];
    d3.selectAll('.' + thisSport)
        .classed('active', true);
}

var onSportMouseOut = function() {
    var c = d3.select(this);
    var thisSport = c.attr('class').split(' ')[1];
    d3.selectAll('.' + thisSport)
        .classed('active', false);
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
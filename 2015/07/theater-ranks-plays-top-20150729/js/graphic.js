/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});
    
    var plays = d3.selectAll('.play')
        .on('mouseover', onPlayMouseover)
        .on('mouseout', onPlayMouseout);
}

var onPlayMouseover = function() {
    var c = d3.select(this);
    var thisPlay = c.attr('class').split(' ')[2];
    d3.selectAll('.' + thisPlay)
        .classed('active', true);
}

var onPlayMouseout = function() {
    var c = d3.select(this);
    var thisPlay = c.attr('class').split(' ')[1];
    d3.selectAll('.' + thisPlay)
        .classed('active', false);
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
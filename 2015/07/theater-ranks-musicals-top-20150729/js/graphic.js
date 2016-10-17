/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});
    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
    
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

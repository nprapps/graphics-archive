var expandButton = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    d3.select('body').classed('condensed', true);
    expandButton = d3.select('#expand')
        .on('click', function(d, i) {
            showFullTimeline();
        });

    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

// show full timeline
var showFullTimeline = function() {
    d3.select('body').classed('condensed', false);

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

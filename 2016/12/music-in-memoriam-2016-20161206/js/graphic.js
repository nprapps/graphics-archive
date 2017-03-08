// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {

    pymChild = new pym.Child({});

    if (Modernizr.touch) {
        d3.select('#grid').classed('touch', true);
    }

    attachEvents();

}

var attachEvents = function() {
    d3.select('#grid').selectAll('a')
        .on('click', function() {
            d3.event.preventDefault();
            var scrollTarget = d3.select(this).attr('data-scroll');
            pymChild.scrollParentTo(scrollTarget);
        });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

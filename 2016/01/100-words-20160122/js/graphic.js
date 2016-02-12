// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    //if (Modernizr.svg) {
        //pymChild = new pym.Child({
            //renderCallback: render
        //});
    //} else {
        pymChild = new pym.Child({});
    //}

    attachEvents();
}

var attachEvents = function() {
    d3.select('#candidates-grid').selectAll('a')
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


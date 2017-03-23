// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({});

    d3.select('#promo-link').on('click', function(e) {
        d3.event.preventDefault();
        ANALYTICS.trackEvent('promo-click', 'clicked');
        pymChild.navigateParentTo('https://www.npr.org/2016/04/18/474256366/why-americas-schools-have-a-money-problem#responsive-embed-school-funding-map-20160408');
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

/*
 * TODO:
 * flip tab labels on mobile?
 * subhed styling
 * all mobile styling
 * remove console.log() statements
 * add map images
 */

var pymChild = null;

// initial vars
var first = 'suburban';
var firstTab = null;
var sections = null;
var tabs = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    tabs = d3.selectAll('.tabs li');
    firstTab = d3.selectAll('.tabs .' + first);
    sections = d3.selectAll('div.section');

    tabs.on('click', onTabClicked);
    d3.selectAll('.tabs .' + first).each(onTabClicked);

    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}


var onTabClicked = function() {
    var t = d3.select(this);
    if (t.classed('active') == false) {
        var section = d3.select('div.section.' + t.attr('class'));

        tabs.classed('active', false);
        sections.classed('active', false);

        t.classed('active', true);
        section.classed('active', true);

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

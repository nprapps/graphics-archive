// Global vars
var pymChild = null;
var isMobile = false;
var toggleTimeout;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    initUI();

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var initUI = function() {
    autoToggle();

    d3.selectAll('.toggle-btn').on('click', function() {
        d3.event.preventDefault();
        d3.select('#map-toggle').classed('clicked', true);
        window.clearTimeout(toggleTimeout);

        if (d3.select(this).attr('id') == 'toggle-2012') {
            d3.select('.map-2012').classed('hidden', false);
            d3.select('#legend-year').text('2012');
        } else {
            d3.select('#legend-year').text('2016');
            d3.select('.map-2012').classed('hidden', true);
        }

        if (!d3.select(this).classed('active')) {
            d3.select('.toggle-btn.active').classed('active', false);
            d3.select(this).classed('active', true);
        }
    });
};

var autoToggle = function() {
    var toggleWrap = d3.select('#map-toggle');

    var yearList = ['2012', '2016', '2012', '2016'];
    toggleStep(0);

    function toggleStep(year_i) {
        if (year_i < yearList.length) {
            var year = yearList[year_i];

            // Don't auto-toggle if someone has clicked
            if (!toggleWrap.classed('clicked')) {
                d3.select('#legend-year').text(year);

                if (year == '2012') {
                    d3.select('.map-2012').classed('hidden', false);
                } else {
                    d3.select('.map-2012').classed('hidden', true);
                }

                d3.select('.toggle-btn.active').classed('active', false);
                d3.select('#toggle-' + year).classed('active', true);

                toggleTimeout = window.setTimeout(toggleStep, 1200, year_i+1);
            }
        }
    }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

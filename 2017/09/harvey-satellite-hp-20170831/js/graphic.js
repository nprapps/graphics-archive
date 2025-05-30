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
        d3.select('#image-toggle').classed('clicked', true);
        window.clearTimeout(toggleTimeout);

        if (d3.select(this).attr('id') == 'toggle-1') {
            d3.select('.image-1').classed('hidden', false);
        } else {
            d3.select('.image-1').classed('hidden', true);
        }

        if (!d3.select(this).classed('active')) {
            d3.select('.toggle-btn.active').classed('active', false);
            d3.select(this).classed('active', true);
        }
    });
};

var autoToggle = function() {
    var toggleWrap = d3.select('#image-toggle');

    var stepList = [1, 2];
    toggleStep(0);

    function toggleStep(step_i) {
        var step = stepList[step_i];

        // Don't auto-toggle if someone has clicked
        if (!toggleWrap.classed('clicked')) {
            var newStep;
            if (step == 1) {
                d3.select('.image-1').classed('hidden', false);
                newStep = step_i + 1;
            } else {
                d3.select('.image-1').classed('hidden', true);
                newStep = step_i - 1;
            }

            d3.select('.toggle-btn.active').classed('active', false);
            d3.select('#toggle-' + step).classed('active', true);

            toggleTimeout = window.setTimeout(toggleStep, 3000, newStep);
        }
    }
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

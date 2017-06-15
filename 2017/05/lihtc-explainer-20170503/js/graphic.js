// Global vars
var pymChild = null;
var isMobile = false;
var currentStep = 0;
var numSteps = 0;

var btnBack = null;
var btnNext = null;
var steps = null;


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    btnBack = d3.select('#btn-back');
    btnNext = d3.select('#btn-next');
    steps = d3.selectAll('.step');
    numSteps = steps[0].length - 1;

    btnBack.on('click', backSlide);
    btnNext.on('click', nextSlide);

    toggleSteps();

    pymChild = new pym.Child({
        renderCallback: render
    });

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

    var aspectWidth = null;
    var aspectHeight = null;

    var containerElement = d3.select('#graphic');

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        aspectWidth = 2;
        aspectHeight = 3;
        containerElement.classed('mobile', true);
        containerElement.classed('desktop', false);
    } else {
        isMobile = false;
        aspectWidth = 16;
        aspectHeight = 9;
        containerElement.classed('mobile', false);
        containerElement.classed('desktop', true);
    }

    containerElement.attr('style', function(d,i) {
        return 'height: ' + Math.ceil((containerWidth * aspectHeight) / aspectWidth) + 'px';
    })

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var backSlide = function() {
    if (currentStep > 0) {
        currentStep--;
        toggleSteps();
    }
};

var nextSlide = function() {
    if (currentStep < numSteps) {
        currentStep++;
    } else {
        currentStep = 0;
    }
    toggleSteps();
};

var toggleSteps = function() {
    // show/hide steps
    steps.classed('active', function(d, i) {
        if (i == currentStep) {
            return true;
        } else {
            return false;
        }
    });

    // swap language in "next" button if it's the last step
    switch (currentStep) {
        case 0:
            btnBack.classed('inactive', true);
            btnNext.classed('active', true);
            btnNext.text('Next');
            break;
        case numSteps:
            btnBack.classed('inactive', false);
            btnNext.classed('active', false);
            btnNext.text('Restart');
            break;
        default:
            btnBack.classed('inactive', false);
            btnNext.classed('active', false);
            btnNext.text('Next');
            break;
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

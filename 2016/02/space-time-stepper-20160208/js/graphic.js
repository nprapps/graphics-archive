// Global vars
var pymChild = null;
var isMobile = false;
var currentStep = 0;
var numSteps = 0;

var btnBack = null;
var btnNext = null;
var btnStart = null;
var btnRestart = null;
var steps = null;
var graphicWrapper = null;


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    btnBack = d3.select('#btn-back');
    btnNext = d3.select('#btn-next');
    btnStart = d3.select('#btn-start');
    btnRestart = d3.select('#btn-restart');
    graphicWrapper = d3.select('#graphic');
    steps = d3.selectAll('.step');
    numSteps = steps[0].length - 1;

    btnBack.on('click', backSlide);
    btnNext.on('click', nextSlide);
    btnStart.on('click', nextSlide);
    btnRestart.on('click', nextSlide);

    toggleSteps();

    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
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
    steps.style('display', function(d, i) {
        if (i == currentStep) {
            return 'block';
        } else {
            return 'none';
        }
    });

    // swap language in "next" button if it's the last step
    switch (currentStep) {
        case 0:
            graphicWrapper.classed('initial', true);
            graphicWrapper.classed('restart', false);
            btnBack.classed('inactive', true);
            btnNext.classed('active', true);
            btnNext.text('Next');
            break;
        case numSteps:
            graphicWrapper.classed('initial', false);
            graphicWrapper.classed('restart', true);
            btnBack.classed('inactive', false);
            btnNext.classed('active', false);
            btnNext.text('Restart');
            break;
        default:
            graphicWrapper.classed('initial', false);
            graphicWrapper.classed('restart', false);
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

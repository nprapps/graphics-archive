// Global vars
var pymChild = null;
var isMobile = false;

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

    initEvents();
    sendPymMessages();

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
    // Get viewport height for sizing

    // Update iframe
    if (pymChild) {
        sendPymMessages();
        pymChild.sendHeight();
    }
}

var sendPymMessages = function() {
    pymChild.sendMessage('get-viewport-height');
};

var sizeQuiz = function(viewportHeight, viewportOffset) {
    // Only do this if the quiz hasn't been answered yet
    if (!d3.select('.quiz-list').classed('answered')) {
        // get viewport height
        var bodyPadding = parseInt(d3.select('body').style('padding-top'));
        var quizWrapHeight = d3.select('#quiz-wrapper').node().getBoundingClientRect().height;
        var modifiedViewport = viewportHeight - viewportOffset;

        // if height of viewport is bigger than height of top-wrapper and quiz wrapper:
        if (modifiedViewport > bodyPadding +  quizWrapHeight) {
            // make quiz-wrapper = viewport_h - top-wrapper
            d3.select('#quiz-wrapper').style('height', (modifiedViewport -  bodyPadding) + 'px');
            // update pym height
            pymChild.sendHeight();
        }
    }
};

var initEvents = function() {
    var quizOptions = d3.selectAll('.quiz-option')
        .select('a')
        .on('click', function() {
            var e = d3.event;
            e.preventDefault();

            if (!d3.select('.quiz-list').classed('answered')) {
                ANALYTICS.trackEvent('quiz-option-clicked');
                d3.select('.quiz-list').classed('answered', true);
                d3.select(this).classed('selected', true);

                d3.select('#quiz-wrapper').style('height', 'auto');

                var responseText = d3.select(this).text();
                updateResponseText(responseText);

                triggerScroll();
            }
        });

    pymChild.onMessage('viewport-data', function(d) {
        var parsedData = JSON.parse(d);
        var viewportHeight = parseInt(parsedData['height'], 10);
        var viewportOffset = parseInt(parsedData['offsetTop'], 10);
        sizeQuiz(viewportHeight, viewportOffset);
    });
};

var triggerScroll = function() {
    // Get vertical offset of response paragraph
    var quizWrapHeight = d3.select('#size-wrapper').node().getBoundingClientRect().bottom;
    pymChild.sendMessage('scroll-position', quizWrapHeight);
};

var updateResponseText = function(responseText) {
    var loweredText = responseText.toLowerCase();
    if (loweredText == 'decreased') {
        var userValue = 'which is the <strong>correct answer</strong>.';
    } else {
        var userValue = 'but the correct answer is <strong>&ldquo;decreased.&rdquo;</strong>';
    }

    var responseData = {
        user_response: loweredText,
        user_value: userValue
    };

    var responseTemplateHTML = d3.select('#response-template').html();
    var responseTemplate = _.template(responseTemplateHTML);
    d3.select('p.user-response')
        .classed('hidden', false)
        .html(responseTemplate(responseData));

    pymChild.sendHeight();

    window.setTimeout(function() {
        d3.select('p.user-response')
            .classed('invisible', false);
    }, 600);
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

// Global vars
var pymChild = null;
var isMobile = false;
var BREAKPOINTS = [ 320, 500 ];
var storyURL = 'https://www.npr.org/2017/02/17/513724796/trump-ethics-monitor-has-the-president-kept-his-promises';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    pymChild = new pym.Child({
        renderCallback: render
    });

    d3.select('#story-link').on('click', function() {
        var e = d3.event;
        e.preventDefault();
        pymChild.navigateParentTo(storyURL);
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

    var sprite = 'assets/filmstrip-' + BREAKPOINTS[BREAKPOINTS.length - 1] + '.jpg';
    for (var i = 0; i < BREAKPOINTS.length; i++) {
        if (i == 0 && containerWidth <= BREAKPOINTS[i]) {
            sprite = 'assets/filmstrip-' + BREAKPOINTS[i] + '.jpg';
        } else if (containerWidth > BREAKPOINTS[(i - 1)] && containerWidth <= BREAKPOINTS[i]) {
            sprite = 'assets/filmstrip-' + BREAKPOINTS[i] + '.jpg';
        }
    }

    d3.selectAll('.photo').html('');

    var canvidControl = canvid({
        selector : '.photo',
        videos: {
            // frames = # of stills
            // cols = # of stills in a row in the filmstrip. in this case,
            //        same as frames.
            // fps = frames per second (animation speed). integers only
            photo: { src: sprite, frames: 130, cols: 130, fps: 24 }
        },
        width: containerWidth,
            // multiply by height, width of original image
            height: Math.floor(containerWidth * 321/520),
        loaded: function() {
            canvidControl.play('photo', true);

            // Update iframe
            if (pymChild) {
                pymChild.sendHeight();
            }

        }
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

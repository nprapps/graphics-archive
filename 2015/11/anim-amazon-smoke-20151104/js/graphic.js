// Global vars
var pymChild = null;
var isMobile = false;
var MOBILE_THRESHOLD = 500;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
     pymChild = new pym.Child({
         renderCallback: render
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

    var sprite = 'assets/burning-600.jpg';
    if (isMobile) {
        sprite = 'assets/burning-375.jpg';
    } else if (containerWidth > 800) {
        sprite = 'assets/burning-1000.jpg';
    }

    d3.selectAll('.burning').html('');

    var canvidControl = canvid({
        selector : '.burning',
        videos: {
            clip1: { src: sprite, frames: 4, cols: 4, fps: 5 }
        },
        width: containerWidth,
        height: Math.floor(containerWidth * 833/1250),
        loaded: function() {
            canvidControl.play('clip1');
            // reverse playback
            // canvidControl.play('clip1', true);

            // Update iframe
            if (pymChild) {
                pymChild.sendHeight();
            }

        }
    });

    // // Update iframe
    // if (pymChild) {
    //     pymChild.sendHeight();
    // }
}

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: 15
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    // Draw here!
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

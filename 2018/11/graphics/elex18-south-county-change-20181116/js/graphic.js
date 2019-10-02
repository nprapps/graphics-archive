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

    // Render the chart!
    renderGraphic({
        container: '#graphic',
        width: containerWidth,
        data: []
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
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
    var chartElement = containerElement.append('div')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .attr("class", "chart-element")


    // add in key

    // var keyWrapper = chartElement.append("div")
    //     .attr("class", "key-wrapper")


    // var opacities = [.2, .4, .6, .8, 1]
    // var colors = ['73,141,203', '240,91,78']

    // for (ci = 0; ci < colors.length; ci++) {

    //     for (i = 0; i < opacities.length; i++) {
    //         var oi = i
    //         if (ci == 0) {
    //             var oi = opacities.length - i - 1
    //             console.log(i)
    //         }
    //         keyWrapper.append("div")
    //             .attr('class', "key-color")
    //             .attr("style", "background: rgba(" + colors[ci] + "," + opacities[oi] + ")")
    //     }
    // }

    // keyWrapper.append("div")
    //     .attr("class", "key-text")
    //     .html("<span>Most voting Dem. ⟶  Most voting GOP</span>")

    // color = '73,141,203';
    //                             break;
    //                         case 'gop':
    //                             color = '240,91,78';

    // add in gifs
    var thisUrlParam = getParameterByName("chartdata") || "south";

    var gifNames = []

    if (thisUrlParam == "south") { 
        gifNames = ["texas", "memphis", "charlotte", "atlanta", "OKC"] 
    }

    if (thisUrlParam == "west") { 
        gifNames = ["denver", "portland", "minneapolis", "chicago"]
    }

    if (thisUrlParam == "east") { 
        gifNames = ["pitt", "rochester", "nyc-philly", "dc"] 
    }

    for (i = 0; i < gifNames.length; i++) {
        chartElement.append("div")
            .attr("class", "gifDiv")
            .append("img")
            .attr("src", "gifs/" + gifNames[i] + ".gif")
            .attr("class", "gifImg")
    }


    // Draw here!
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
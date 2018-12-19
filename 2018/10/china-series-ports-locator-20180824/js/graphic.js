// Global vars
var pymChild = null;
var isMobile = false;
var SVG = null;

var labelPlacement = ({'Rotterdam': {'false': {'y': '-0.6em', 'x': '3em'}, 
                                     'true': {'y': '-10em', 'x': '2em'}}, 
                        'Antwerp': {'false': {'y': '0.3em', 'x': '5.2em'},
                                    'true': {'y': '0.3em', 'x': '5.2em'}},
                        'Zeebrugge': {'false': {'y': '-0.6em', 'x': '0.1em'},
                                      'true': {'y': '-0.6em', 'x': '0.1em'}},
                        'Dunkirk': {'false': {'y': '1.3em', 'x': '1em'},
                                    'true': {'y': '1.3em', 'x': '1em'}},
                        'Vado Ligure': {'false': {'y': '-0.6em', 'x': '3em'},
                                        'true': {'y': '-0.6em', 'x': '3em'}},
                        'Marsaxlokk': {'false': {'y': '1.6em', 'x': '3em'},
                                       'true': {'y': '1.6em', 'x': '3em'}},
                        'France': {'false': {'y': '-4em', 'x': '10em'},
                                   'true': {'y': '-1em', 'x': '6.4em'}},
                        'Morocco': {'false': {'y': '-2em', 'x': '7.2em'},
                                    'true': {'y': '-0.5em', 'x': '6em'}},
                        'Turkey': {'false': {'y': '1em', 'x': '-4.5em'},
                                   'true': {'y': '1em', 'x': '-1.7em'}},
                        'Belgium': {'false': {'y': '0.5em', 'x': '7em'},
                                    'true': {'y': '0.5em', 'x': '6.4em'}},
                        'Italy': {'false': {'y': '0.5em', 'x': '3.5em'},
                                  'true': {'y': '0.5em', 'x': '2.6em'}},
                        'Netherlands': {'false': {'y': '-1.2em', 'x': '8em'},
                                        'true': {'y': '-0.7em', 'x': '7em'}},
                        'Ambarli': {'false': {'y': '-0.7em', 'x': '3em'},
                                    'true': {'y': '-0.7em', 'x': '3em'}},
                        'Greece': {'false': {'y': '0.5em', 'x': '2em'},
                                   'true': {'y': '0.5em', 'x': '2em'}},
                        'Spain': {'false': {'y': '-0.3em', 'x': '3em'},
                                  'true': {'y': '-0.3em', 'x': '2.7em'}},
                        'Egypt': {'false': {'y': '-5.5em', 'x': '1.25em'},
                                  'true': {'y': '-3.5em', 'x': '1.25em'}}
                        });

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) { 
        d3.xml("ports-09132018-v3.svg", "image/svg+xml").get(function(error, xml) {
            if (error) throw error;

            SVG = xml.documentElement;
                
            pymChild = new pym.Child({
                renderCallback: render
            });
            setUpPym();
        })
    } else {
        pymChild = new pym.Child({});
    }


}

/*
 * Setting up pym 
 */
var setUpPym = function() {
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
        width: containerWidth
        // data: []
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
        top: 5,
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
    var chartElement = containerElement.select('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom']);


    // Draw here!
    document.getElementById("graphic")
            .appendChild(SVG);

    containerElement.select('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom']);


    containerElement.select(".country-labels")
    .selectAll('text')
    .filter(function() { 
        return this.innerHTML != "";
    })
    .each(function() {
        d3.select(this)
            .attr("dx", function() {
                if (Object.keys(labelPlacement).includes(this.innerHTML)) {
                    console.log('yo');
                    return labelPlacement[this.innerHTML][isMobile ? 'true' : 'false']['x'];
                }
                return "0em";
            })
            .attr("dy", function() {
                if (Object.keys(labelPlacement).includes(this.innerHTML)) {
                    return labelPlacement[this.innerHTML][isMobile ? 'true' : 'false']['y'];
                }
                return "0em";
            })
    });

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;
var mapTypes = [ 'photoid', 'strictid', 'onlineregistration', 'autoregistration' ];

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
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var gutterWidth = 22;
    var mapWidth = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        mapWidth = containerWidth;
    } else {
        isMobile = false;
        mapWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#state-grid-map');
    containerElement.html('');

    var identificationElement = containerElement.append('div')
        .attr('id', 'identification');
    identificationElement.append('h3')
        .text('Voter Identification');
    identificationElement.append('p')
        .html(DESC_IDENTIFICATION);

    var registrationElement = containerElement.append('div')
        .attr('id', 'registration');
    registrationElement.append('h3')
        .text('Voter Registration');
    registrationElement.append('p')
        .html(DESC_REGISTRATION);

    var colorScale = d3.scale.ordinal()
        .domain([ 1, 2, 3, 4 ])
        .range([ COLORS['orange4'], COLORS['orange2'], '#999', COLORS['yellow4'] ]);

    mapTypes.forEach(function(d,i) {
        var mapContainer = null;

        if (d == 'photoid' || d == 'strictid') {
            mapContainer = identificationElement.append('div');
        }
        if (d == 'onlineregistration' || d == 'autoregistration') {
            mapContainer = registrationElement.append('div');
        }

        mapContainer.attr('id', d)
            .attr('class', 'map');

        if (!isMobile) {
            mapContainer.attr('style', function() {
                var s = '';
                s += 'width: ' + mapWidth + 'px; ';
                s += 'float: left; ';
                if (i % 2 == 0) {
                    s += 'margin-right: ' + gutterWidth + 'px; ';
                    s += 'clear: left; ';
                }
                return s;
            });
        }

        mapContainer.append('h4')
            .text(HEADERS[d]);

        mapContainer.append('div')
            .attr('class', 'map-wrapper');

        // Render the map!
        renderStateGridMap({
            container: '#' + d + ' .map-wrapper',
            width: mapWidth,
            data: DATA,
            column: d,
            colorScale: colorScale
        });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    var dataColumn = config['column'];

    // Define container element
    var containerElement = d3.select(config['container']);

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categories = [];

    _.each(config['data'], function(state) {
        if (state[dataColumn] != null) {
            categories.push(state[dataColumn]);
        }
    });

    categories = d3.set(categories).values().sort();

    // Define color scale
    var colorScale = config['colorScale'];

    // Create legend
    var legendElement = containerElement.select('.key');

    _.each(categories, function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(KEY_TEXT[key]);
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[dataColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state[dataColumn]));
        }
    });

    // Draw state labels
    chartElement.append('g')
        .selectAll('text')
            .data(config['data'])
        .enter().append('text')
            .attr('text-anchor', 'middle')
            .text(function(d) {
                var state = _.findWhere(STATES, { 'name': d['state_name'] });

                return state['usps'];
                // return isMobile ? state['usps'] : state['ap'];
            })
            .attr('class', function(d) {
                return d[dataColumn] !== null ? 'label label-active' : 'label';
            })
            .attr('x', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = chartElement.select(className)[0][0].getBBox();

                return tileBox['x'] + tileBox['width'] * 0.52;
            })
            .attr('y', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = chartElement.select(className)[0][0].getBBox();
                var textBox = d3.select(this)[0][0].getBBox();
                var textOffset = textBox['height'] / 2;

                // if (isMobile) {
                    textOffset -= 1;
                // }

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

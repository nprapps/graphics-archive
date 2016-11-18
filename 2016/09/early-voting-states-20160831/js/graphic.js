// Global config
var MAP_TEMPLATE_ID = '#map-template';

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
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // figure out how many maps there are
    var maps = d3.keys(DATA[0]).filter(function(d) {
        return d != 'state_name';
    });

    // identify the main container div
    var containerElement = d3.select('#state-grid-map');
    containerElement.html('');

    // make mapss
    maps.forEach(function(d,i) {
        var colorScale = null;
        switch(d) {
            case 'early_in_person':
                colorScale = [ COLORS['teal2'], COLORS['teal4'] ];
                break;
            case 'vote_by_mail':
                colorScale = [ COLORS['teal5'] ];
                break;
            case 'absentee_no_excuse':
                colorScale = [ COLORS['teal4'] ];
                break;
            case 'absentee_excuse':
                colorScale = [ COLORS['teal4'] ];
                break;
        }

        if (i == 2) {
            containerElement.append('h3')
                .html('Absentee Voting By Mail');
            containerElement.append('p')
                .attr('class', 'desc')
                .html(HEADERS[d]['desc']);
        }

        var map = containerElement.append('div')
            .attr('class', 'map ' + classify(d));

        if (!isMobile) {
            map.attr('style', function() {
                var s = 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; '
                if (i % 2 == 0) {
                    s += 'margin-right: ' + gutterWidth + 'px; ';
                    s += 'clear: both; ';
                }
                return s;
            });
        }

        if (i < 2) {
            map.append('h3')
                .html(HEADERS[d]['header']);
            map.append('p')
                .attr('class', 'desc')
                .html(HEADERS[d]['desc']);
        } else {
            map.append('h4')
                .html(HEADERS[d]['header']);
        }

        map.append('div')
            .attr('class', 'map-wrapper');

        // Render the map!
        renderStateGridMap({
            container: '.map.' + classify(d) + ' .map-wrapper',
            width: containerWidth,
            data: DATA,
            dataCol: d,
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
    var dataCol = config['dataCol'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categories = [];

    _.each(config['data'], function(state) {
        if (state[dataCol] != null) {
            categories.push(state[dataCol]);
        }
    });

    categories = d3.set(categories).values().sort();

    // Define color scale
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(config['colorScale']);

    // Create legend
    if (categories.length > 1) {
        var legendElement = containerElement.select('.key');

        _.each(colorScale.domain(), function(key, i) {
            var keyItem = legendElement.append('li')
                .classed('key-item', true)

            keyItem.append('b')
                .style('background', colorScale(key));

            keyItem.append('label')
                .text(key);
        });
    }

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[dataCol] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state[dataCol]));
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

                // return isMobile ? state['usps'] : state['ap'];
                return state['usps'];
            })
            .attr('class', function(d) {
                return d[dataCol] !== null ? 'label label-active' : 'label';
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

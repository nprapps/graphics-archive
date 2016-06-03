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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the map!
    renderStateGridMap({
        container: '#state-grid-map',
        width: containerWidth,
        data: DATA
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
    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categories = [];

    _.each(config['data'], function(state) {
        if (state['category'] != null) {
            categories.push(state['category']);
        }
    });

    categories = d3.set(categories).values().sort();

    // Define color scale
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range([ COLORS['orange1'], COLORS['orange3'], COLORS['orange5'], COLORS['teal5'], COLORS['teal3'] ]);

    // Select SVG element
    var chartElement = containerElement.select('svg');


    // Create legend
    var legendOrder = colorScale.domain().reverse();
    var legendTop = 15;
    var legendBoxWidth = 20;
    var legendBoxHeight = 8;
    if (isMobile) {
        legendBoxWidth = 30;
        legendBoxHeight = 5;
        legendTop = 15;
    }
    var legendWidth = (legendOrder.length) * (legendBoxWidth + 1) - 1;
    var legendElement = chartElement.append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + ((436 - legendWidth) / 2) + ',' + legendTop + ')');

    legendElement.selectAll('rect')
        .data(legendOrder)
        .enter().append('rect')
            .attr('x', function(d, i) {
                return i * (legendBoxWidth + 1);
            })
            .attr('y', 0)
            .attr('width', legendBoxWidth)
            .attr('height', legendBoxHeight)
            .attr('fill', function(d) {
                return colorScale(d);
            });

    legendElement.selectAll('text')
        .data(legendOrder)
        .enter().append('text')
            .attr('x', function(d, i) {
                return (i * (legendBoxWidth + 1));
            })
            .attr('y', function() {
                if (isMobile) {
                    return legendBoxHeight + 14;
                } else {
                    return legendBoxHeight + 10;
                }
            })
            .attr('text-anchor', 'middle')
            .text(function(d) {
                return CATEGORIES[d];
            });

    legendElement.append('text')
        .attr('x', (2 * (legendBoxWidth + 1)) - 1)
        .attr('y', function() {
            if (isMobile) {
                // return legendBoxHeight + 14;
                return legendBoxHeight + 26;
            } else {
                // return legendBoxHeight + 10;
                return legendBoxHeight + 19;
            }
        })
        .attr('class', 'national-avg')
        .text('Average');

    legendElement.append('text')
        .attr('class', 'label-less')
        .attr('x', function() {
            if (isMobile) {
                return (2 * (legendBoxWidth + 1)) - 1;
            } else {
                return 0;
            }
        })
        .attr('y', function() {
            if (isMobile) {
                return -5;
            } else {
                return 7;
            }
        })
        .attr('dx', -5)
        .text('Less expensive');

    legendElement.append('text')
        .attr('class', 'label-more')
        .attr('x', function() {
            if (isMobile) {
                return (2 * (legendBoxWidth + 1)) - 1;
            } else {
                return legendWidth;
            }
        })
        .attr('y', function() {
            if (isMobile) {
                return -5;
            } else {
                return 7;
            }
        })
        .attr('dx', 5)
        .text('More expensive');

    legendElement.append('line')
        .attr('x1', (2 * (legendBoxWidth + 1)) - 0.5)
        .attr('y1', -2)
        .attr('x2', (2 * (legendBoxWidth + 1)) - 0.5)
        .attr('y2', legendBoxHeight + 2);


    // Set state colors
    _.each(config['data'], function(state) {
        if (state['category'] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state['category']));
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

                return isMobile ? state['usps'] : state['ap'];
            })
            .attr('class', function(d) {
                return d['category'] !== null ? 'label label-active' : 'label';
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

                if (isMobile) {
                    textOffset -= 1;
                }

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

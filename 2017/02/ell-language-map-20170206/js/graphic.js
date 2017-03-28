// Global config
var MAP_TEMPLATE_ID = '#map-template';
var maps = [ 'spanish', 'chinese', 'vietnamese', 'arabic' ];

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
    var graphicWidth = null;
    var gutterWidth = 22;

    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    maps.forEach(function(d,i) {
        var dataColumn = d;

        renderStateGridMap({
            col: dataColumn,
            container: '#map-' + d,
            width: graphicWidth,
            data: MAPS[d]
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
    var valueColumn = 'category';

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categories = [];

    _.each(config['data'], function(state) {
        if (state[valueColumn] != null) {
            categories.push(state[valueColumn]);
        }
    });

    categories = d3.set(categories).values();

    // Define color scale
    if (config['col'] == 'spanish') {
        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range(['#f6c698','#efac68','#e59136','#dc7427','#B9481D']);
            // .range(['#f3b97f','#e59136','#e28932','#d86524','#cd3a1d']);

    } else {
        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range(['#dddddd', COLORS['blue5'], COLORS['blue3'], COLORS['blue2'], COLORS['blue1']]);
    }

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state, i) {
        if (state[valueColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', function(key) {
                    return colorScale(state[valueColumn]);
                });
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

                // console.log(config);

                if(config['col'] == "spanish") {
                    return isMobile ? state['usps'] : state['ap'];
                } else {
                    return state['usps'];
                }

            })
            .attr('class', function(d) {
                if(config['col'] != "spanish") {
                    if (d[valueColumn] == 'Under 0.5%') {
                        return 'sm-label label';
                    }
                    else {
                        return 'sm-label label label-active';
                    }
                } else {
                    if (d[valueColumn] == 'Under 0.5%') {
                        return 'label';
                    }
                    else {
                        return 'label label-active';
                    }
                }
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

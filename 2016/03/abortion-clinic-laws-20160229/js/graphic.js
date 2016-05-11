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

    var containerElement = d3.select('#graphic');
    var graphicWidth = isMobile ? containerWidth : containerWidth / 2;
    containerElement.html('');

    var mapTypes = ['hospital', 'privileges'];
    var mapColors = ['orange', 'red'];

    mapTypes.forEach(function(map_type, map_i) {
        containerElement.append('div')
            .attr('class', 'graphic')
            .attr('id', 'map-' + map_type);

        // Render the map!
        renderStateGridMap({
            container: '#map-' + map_type,
            width: graphicWidth,
            color: mapColors[map_i],
            data_prefix: map_type + '_',
            data: DATA
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
    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    var categoryKey = config['data_prefix'] + 'category';
    var labelKey = config['data_prefix'] + 'category_label';

    // Extract categories from data
    var categories = [];
    var category_labels = {};

    _.each(config['data'], function(state) {
        if (state[categoryKey] != null) {
            categories.push(state[categoryKey]);
            if (!category_labels[state[categoryKey]]) {
                category_labels[state[categoryKey]] = state[labelKey];
            }
        }
    });

    categories = d3.set(categories).values().sort();

    var color1 = d3.rgb(COLORS[config['color'] + 2]).darker(0.3);
    var color2 = COLORS[config['color'] + 4];

    // Define color scale
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range([color1, color2]);

    // Create legend
    var legendElement = containerElement.select('.key');

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(category_labels[key]);
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[categoryKey] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state[categoryKey]));
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
            })
            .attr('class', function(d) {
                return d[categoryKey] !== null ? 'label label-active' : 'label';
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

                textOffset -= 1;

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

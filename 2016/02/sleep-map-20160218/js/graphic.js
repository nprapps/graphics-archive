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

    var TWEAKED_COLORS = {
        'blue1': d3.rgb(COLORS['blue1']).darker(0.5),
        'blue2': COLORS['blue2'],
        'blue3': COLORS['blue3'],
        'blue4': COLORS['blue4'],
        'blue5': COLORS['blue5'],
        'blue6': d3.rgb(COLORS['blue6']).brighter(0.21)
    };

    var colorScale = d3.scale.threshold()
        .domain([55, 60, 65, 70, 75])
        .range(['#fff', TWEAKED_COLORS['blue6'],TWEAKED_COLORS['blue5'],TWEAKED_COLORS['blue2'],TWEAKED_COLORS['blue1']]);

    // Create legend
    var legendElement = containerElement.select('.key');

    _.each(colorScale.domain().slice(0,-1), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        var label_text = key + '-' + (colorScale.domain()[i+1]-1) + '%';

        if (key == 55) {
            label_text = 'Less than 60%';
        } else if (key == 70) {
            label_text = '70% or higher';
        }

        keyItem.append('label')
            .text(label_text);
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state['pct'] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);
            var stateBucket = colorScale.invertExtent(colorScale(state['pct']));
            var colorClass = ' color-' + stateBucket[0];

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + colorClass + ' state-active')
                .attr('fill', colorScale(state['pct']));
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
                var stateBucket = colorScale.invertExtent(colorScale(d['pct']));
                var colorClass = ' color-' + stateBucket[0];
                return d['pct'] !== null ? 'label label-active' + colorClass : 'label' + colorClass;
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

// Global config
var GRAPHIC_DEFAULT_WIDTH = 730;
var MOBILE_THRESHOLD = 500;
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

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
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the maps!
    renderStateGridMap({
        container: '#current .map',
        width: containerWidth,
        data: CURRENT_DATA,
        categories: [
            'Banned by state law<sup>1</sup><sup>2</sup><sup>3</sup>',
            'Legal by federal court ruling<sup>4</sup>',
            'Legal by state action<sup>5</sup>'
        ],
        colors: [
            COLORS['yellow3'],
            '#4794c2',
            COLORS['blue1'],
        ]
    });

    renderStateGridMap({
        container: '#performance .map',
        width: containerWidth,
        data: PERFORMANCE_DATA,
        categories: [
            'Becomes legal by Supreme Court decision',
            'Remains legal by previous lower federal court ruling',
            'Remains legal by state action<sup>5</sup>'
        ],
        colors: [
            COLORS['blue4'],
            '#4794c2',
            COLORS['blue1']
        ]
    });

    renderStateGridMap({
        container: '#neither .map',
        width: containerWidth,
        data: NEITHER_DATA,
        categories: [
            'Legal status unclear',
            'Remains banned by state law',
            'Remains legal by state action<sup>5</sup>',
        ],
        colors: [
            '#beb797',
            COLORS['yellow3'],
            COLORS['blue1'],
        ]
    });

    // renderStateGridMap({
    //     container: '#recognition .map',
    //     width: containerWidth,
    //     data: RECOGNITION_DATA,
    //     categories: [
    //         'Legal status unclear, but out-of-state marriages are recognized',
    //         'Remains banned by state law, but out-of-state marriages are recognized',
    //         'Remains legal and recognized by state action<sup>2</sup>',
    //     ],
    //     colors: [
    //         '#e0e0e0',
    //         COLORS['yellow5'],
    //         COLORS['blue1'],
    //     ]
    // });

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

    // Define color scale
    var colorScale = d3.scale.ordinal()
        .domain(config.categories)
        .range(config.colors);

    // Create legend
    var legendElement = containerElement.select('.key');

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .html(key);
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

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

                return state['usps'];
            })
            .attr('class', function(d) {
                var cls = 'label';

                if (d['category'] !== null) {
                    cls += ' label-active';
                }

                if (d['category'] == 'Legal status unclear, but out-of-state marriages are recognized' ||
                    d['category'] == 'Legal status unclear') {
                    cls += ' invert'
                }

                return cls;
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

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset - 1;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

// Global config
var MAP_TEMPLATE_ID = '#map-template';
var maps = [ 'waiting', 'universal', 'license', 'registration', 'concealed', 'open', 'long', 'assault', 'domestic' ];

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
    maps.forEach(function(d,i) {
        var dataColumn = d;
        if (dataColumn == 'waiting') {
            dataColumn = 'waiting_type';
        }

        renderStateGridMap({
            col: dataColumn,
            container: '#' + d,
            width: containerWidth,
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
    var categoryColumn = config['col'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categoryColors = [ COLORS['orange1'], COLORS['orange3'], COLORS['orange5'], '#ccc' ];
    var categories = [];
    _.each(config['data'], function(state) {
        if (state[categoryColumn] != null) {
            categories.push(state[categoryColumn]);
        }
    });
    categories = d3.set(categories).values().sort();

    switch(config['col']) {
        case 'universal':
            categories = [
                'Universal',
                'Universal (handguns)',
                'Gun show',
                'Permits required on at least some sales'
            ];
            categoryColors = [ COLORS['orange1'], COLORS['orange2'], COLORS['orange4'], COLORS['orange5'] ];
            break;
        case 'concealed':
            categories = [
                'May issue',
                'Shall issue, discretion',
                'Shall issue, no discretion',
                'No permit required'
            ];
            categoryColors = [ COLORS['orange1'], COLORS['orange3'], COLORS['yellow4'], COLORS['yellow2'] ];
            break;
        case 'open':
            categoryColors = [ COLORS['orange1'], COLORS['orange3'], COLORS['orange5'] ];
            break;
        case 'long':
            categoryColors = [ COLORS['orange1'], COLORS['orange3'] ];
            break;
        case 'assault':
            categoryColors = [ COLORS['orange1'], COLORS['orange3'] ];
            break;
        case 'domestic':
            categoryColors = [ COLORS['orange1'], COLORS['orange3'] ];
            break;
        case 'license':
            categoryColors = [ COLORS['orange1'], COLORS['orange5'] ];
            break;
        case 'registration':
            categories = [
                'Required registration',
                'Some weapons',
                'Registries prohibited'
            ];
            categoryColors = [ COLORS['orange1'], COLORS['orange3'], COLORS['yellow3'] ];
            break;
    }
    // console.log(categories);

    // Define color scale
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(categoryColors);

    // Create legend
    var legendElement = containerElement.select('.key');

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(key);
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[categoryColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state[categoryColumn]));
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
                return d[categoryColumn] !== null ? 'label label-active' : 'label';
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

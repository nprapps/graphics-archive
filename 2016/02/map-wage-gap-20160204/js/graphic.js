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

    // // Extract categories from data
    // var categories = [];
    //
    // _.each(config['data'], function(state) {
    //     if (state['category'] != null) {
    //         categories.push(state['category']);
    //     }
    // });
    //
    // categories = d3.set(categories).values().sort();
    //
    // // Define color scale
    // var colorScale = d3.scale.ordinal()
    //     .domain(categories)
    //     .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);
    //
    // // Create legend
    // var legendElement = containerElement.select('.key');
    //
    // _.each(colorScale.domain(), function(key, i) {
    //     var keyItem = legendElement.append('li')
    //         .classed('key-item', true)
    //
    //     keyItem.append('b')
    //         .style('background', colorScale(key));
    //
    //     keyItem.append('label')
    //         .text(key);
    // });

    // Define color scale
    var colorBins = [ 70, 75, 80, 85, 90 ];
    // var colorRange = [ '#0b403f','#276766','#538f8d','#89b7b5','#c5dfdf' ];
    var colorRange = [ '#0b4847','#366c6b','#619290','#91b8b7','#c5dfdf' ];
    var colorBinsCount = colorBins.length;
    var colorScale = d3.scale.threshold()
        .domain(colorBins)
        .range(colorRange);

    // Render legend
    // var legend = containerElement.insert('ul', ':first-child')
    //     .attr('class', 'key');
    var legend = containerElement.select('.key');

    legend.append('li')
        .attr('class', 'key-item key-0')
        .append('label')
        .html((colorBins[0] - 5) + '&cent;')

    var legendBins = legend.selectAll('li')
        .data(colorBins)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i;
            });
    legendBins.append('b')
        .style('background-color', function(d,i) {
            return colorRange[i];
        });
    legendBins.append('label')
        .html(function(d, i) {
            // if (i == 0) {
            //     return '&lt;&nbsp;' + fmtComma(colorBins[i]) + ' cents';
            // } else if (i == (colorBinsCount - 1)) {
            //     return '&ge;&nbsp;' + fmtComma(colorBins[i-1]) + ' cents';
            // } else {
                // return fmtComma(colorBins[i-1]) + '-' + fmtComma((colorBins[i] - 1)) + ' cents';
            // }
            // return d['key'];

            return fmtComma(colorBins[i]) + '&cent;';
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

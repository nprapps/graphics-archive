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

    var colorBreaks = [0, 10, 25, 150];

    if (containerElement.attr('data-chart') === 'race') {
        colorBreaks = [0, 20, 50, 150];
    }

    var colorScale = d3.scale.linear()
        .domain(colorBreaks)
        .range(['#ff8c00','#f7b881','#d8e3e2','#d8e3e2']); // GOOD orange-azure

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state['diff'] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(Math.abs(state['diff'])));
        }
    });

    // Create legend
    var gradient = chartElement.append('defs')
        .append('linearGradient')
            .attr('id', 'legend-gradient')
            .attr('x1', '0%')
            .attr('y1', '50%')
            .attr('x2', '100%')
            .attr('y2', '50%');

    _.each(colorScale.domain().slice(0,3), function(key, i) {
        gradient.append('stop')
            .attr('offset', (100*key/30) + '%')
            .attr('stop-color', colorScale(key))
            .attr('stop-opacity', 1);
    });

    var svgWidth = 436,
        legend_w = isMobile ? 0.6 * svgWidth : 0.3 * svgWidth;

    var legend_g = chartElement.append('g')
        .attr('transform', 'translate(' + ((svgWidth/2) - (legend_w/2)) + ',0)');

    legend_g.append('rect')
            .attr('width', legend_w)
            .attr('height', 10)
            .attr('y', isMobile ? 18 : 10)
            .style('fill', 'url(#legend-gradient)');

    legend_g.append('text')
        .text('More like U.S.')
        .attr('class', 'legend-label label-below')
        .attr('x', 0)
        .attr('dy', isMobile ? '12px' : '7px')
        .attr('text-anchor', 'start');

    legend_g.append('text')
        .text('Less like U.S.')
        .attr('class', 'legend-label label-below')
        .attr('x', legend_w)
        .attr('dy', isMobile ? '12px' : '7px')
        .attr('text-anchor', 'end');


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
                return d['diff'] !== null ? 'label label-active' : 'label';
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

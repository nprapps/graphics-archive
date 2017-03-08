// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;
var categories = [];
var colorScale = null;
var keyLabels = [];
var maps = [];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

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
 * Format data
 */
var formatData = function() {
    maps = d3.keys(DATA[0]).filter(function(d) {
        return d != 'state_name';
    });

    // Extract categories from data
    _.each(KEY, function(d) {
        categories.push(d['abbr']);
    });

    // Define color scale
    colorScale = d3.scale.ordinal()
        .domain(categories)
        .range([ COLORS['teal2'], COLORS['teal5'], COLORS['yellow3'], ]);

    renderLegend({
        container: '.key',
        data: KEY
    });
}


/*
 * Render legend
 */
var renderLegend = function(config) {
    var legendElement = d3.select(config['container']);

    var leadKeyItem = legendElement.append('li')
        .attr('class', 'key-item lead-in');
    leadKeyItem.append('label')
        .text(LABELS['label_legend']);

    _.each(KEY, function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key['abbr']));

        keyItem.append('label')
            .text(key['label']);
    });
}


/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var mapWidth = containerWidth;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
        mapWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#state-grid-map');
    containerElement.html('');

    _.each(maps, function(d, i) {
        var mapElement = containerElement.append('div')
            .attr('class', 'map ' + classify(d));

        if (!isMobile) {
            mapElement.attr('style', function() {
                var s = '';
                s += 'width: ' + mapWidth + 'px; ';
                s += 'float: left; ';
                if (i > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // Render the map!
        renderStateGridMap({
            container: '#state-grid-map .map.' + classify(d),
            width: mapWidth,
            data: DATA,
            valueColumn: d,
            title: LABELS['label_' + d]
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
    var valueColumn = config['valueColumn'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['title']);

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    var mapWrapper = containerElement.append('div')
        .attr('class', 'map-wrapper');
    mapWrapper.html(template.html());

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[valueColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state[valueColumn]));
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
                return d[valueColumn] !== null ? 'label label-active' : 'label';
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
                var textOffset = (textBox['height'] / 2) - 1;
                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

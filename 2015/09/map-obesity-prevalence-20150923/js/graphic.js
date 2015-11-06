// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
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

//     if (containerWidth <= MOBILE_THRESHOLD) {
//         isMobile = true;
//     } else {
//         isMobile = false;
//     }
    isMobile = true;
    
    // draw the legend and define the color scale
    var colorScale = drawLegend(SCALE);

    // Render the map!
    var containerElement = d3.select('#graphic');
    
    for (map in MAP_DATA) {
        containerElement.append('div')
            .attr('id', map)
            .classed('map', true);
        
        renderStateGridMap({
            title: MAP_DATA[map]['title'],
            container: '#' + map,
            width: containerWidth,
            data: MAP_DATA[map]['data'],
            colorScale: colorScale
        });
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Define categories and draw legend
 */
var drawLegend = function(data) {
    // Extract categories from data
    var categories = [];
    _.each(data, function(val) {
        categories.push(val['value']);
    });
//    categories = d3.set(categories).values();

    // Define color scale
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range([ '#f7e39b','#efb460','#df882b','#c05f26','#a23520' ]);
//        .range([ COLORS['red6'], COLORS['red5'], COLORS['red4'], COLORS['red3'], COLORS['red2'] ]);

    // Create legend
    var legendElement = d3.select('.key ul');
    legendElement.html('');

    _.each(data, function(key, i) {
        var keyItem = legendElement.append('li')
            .attr('class', function() {
                return 'key-item key-' + i;
            });
        
        if (i < 5) {
            keyItem.append('b')
                .style('background', colorScale(key['value']));
        }

        keyItem.append('label')
            .text(key['label']);
    });
    
    return colorScale;
}


/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    var colorScale = config['colorScale'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');
    
    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // add header
    containerElement.select('h3')
        .text(config['title']);

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

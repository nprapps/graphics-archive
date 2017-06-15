// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;
var series = [  'quality','pct' ];

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
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor(containerWidth * 0.48);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#state-grid-map');
    containerElement.html('');

    series.forEach(function(d, i) {
        var chartContainer = containerElement.append('div')
            .attr('class', 'map y-' + d);

        chartContainer.append('h3')
            .html(TITLES[d]);

        var colorRange = null;
        switch(d) {
            case 'pct':
                colorRange = [ COLORS['orange6'], COLORS['orange5'], COLORS['orange4'], COLORS['orange3'], COLORS['orange2'], COLORS['orange1']];
                break;
            case 'quality':
                colorRange = [ COLORS['blue6'], COLORS['blue5'], COLORS['blue3'], COLORS['blue2'], COLORS['blue1'] ];
                break;
        }
        // console.log(colorRange);

        // Render the map!
        renderStateGridMap({
            container: '#state-grid-map .map.y-' + d,
            width: graphicWidth,
            data: DATA,
            dataColumn: 'category_' + d,
            legend: LEGEND[d],
            colorRange: colorRange
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
    var dataColumn = config['dataColumn'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container'])
        .append('div')
        .attr('class', 'map-wrapper');
    // containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categories = [];
    var categoryLabels = [];

    // If custom legend labels are specified
    var legendCatLabels = config['legend']['categories'].split(',');
    var legendValLabels = config['legend']['values'].split(',');
    _.each(legendCatLabels, function(label,i) {
        categories.push(label.trim());
        if (legendValLabels[i]) {
            categoryLabels.push(legendValLabels[i].trim());
        }
    });

    // Define color scale
    var colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(config['colorRange']);
    // console.log(colorScale.range());

    // Create legend
    var legendWrapper = containerElement.select('.key-wrap');
    var legendElement = containerElement.select('.key');
    legendWrapper.classed('numeric-scale', true);

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        if (categoryLabels.length > 2 || i == 0) {
            keyItem.append('label')
                .text(categoryLabels[i]);
        } else if (categoryLabels.length == 2 && i == colorScale.domain().length - 1) {
            keyItem.append('label')
                .text(categoryLabels[1]);
        }
        // Add the optional upper bound label on numeric scale
        //if (config['isNumeric'] && i == categories.length - 1) {
            //if (LABELS['max_label'] && LABELS['max_label'] !== '') {
                //keyItem.append('label')
                    //.attr('class', 'end-label')
                    //.text(LABELS['max_label']);
            //}
        //}
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[dataColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state[dataColumn]));
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
                return d[dataColumn] !== null ? 'label label-active' : 'label';
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

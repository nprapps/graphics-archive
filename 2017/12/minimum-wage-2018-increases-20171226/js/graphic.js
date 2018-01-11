// Global config
var MAP_TEMPLATE_ID = '#map-template';
var maps = ['minimum-wage','percent-change'];

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
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // define graphic width
    var gutterWidth = 11;
    var graphicWidth = isMobile ?
        containerWidth :
        Math.floor((containerWidth - gutterWidth) / 2);

    var dataFilter = {
        'minimum-wage': function(data) {
            return data.map === 'minimum-wage'
        },
        'percent-change': function(data) {
            return data.map === 'percent-change'
        }
    }

    var chartAbbr = {
        'minimum-wage': 'mw',
        'percent-change': 'pc'
    }

    var chartWrapper = d3.select('#chart-wrapper');
    chartWrapper.html('');

    maps.forEach(function(d) {
        var slug = d;
        var abbr = chartAbbr[d];
        var thisChartContainer = '#chart-' + slug;
        var thisChartHead = LABELS['hdr_' + abbr];
        var thisChartData = eval(abbr.toUpperCase() + '_DATA');

        if (LABELS[abbr + '_is_numeric'] && LABELS[abbr + '_is_numeric'].toLowerCase() == 'true') {
            var isNumeric = true;
        } else {
            var isNumeric = false;
        }

        // Render the map!
        renderStateGridMap({
            container: thisChartContainer,
            width: graphicWidth,
            data: thisChartData,
            header: thisChartHead,
            // isNumeric will style the legend as a numeric scale
            isNumeric: isNumeric,
            abbr: abbr
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
    // console.log(config);
    var valueColumn = 'category';

    // Clear existing graphic (for redraw)
    var chartWrapper = d3.select('#chart-wrapper');
    var containerElement = chartWrapper.append('div')
        .attr('id', config['container'])
        .attr('class', 'graphic');
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Add map header
    containerElement.select('h3').text(config['header']);

    // Extract categories from data
    var categories = [];

    if (LABELS[config['abbr'] + '_legend_labels'] && LABELS[config['abbr'] + '_legend_labels'] !== '') {
        // If custom legend labels are specified
        var legendLabels = LABELS[config['abbr'] + '_legend_labels'].split(',');
        _.each(legendLabels, function(label) {
            // Pushed using parseFloat() to turn the categories into numbers to better
            // work with the threshold scale used below.
            categories.push(parseFloat(label.trim()));
        });
    } else {
        // Default: Return sorted array of categories
         _.each(config['data'], function(state) {
            if (state[valueColumn] != null) {
                categories.push(state[valueColumn]);
            }
        });

        categories = d3.set(categories).values().sort();
    }

    // Create legend
    var legendWrapper = containerElement.select('.key-wrap');
    var legendElement = containerElement.select('.key');

    legendElement.classed('key-' + config['abbr'], true)

    if (config['isNumeric'] && config['container'] == '#chart-minimum-wage') {
        legendWrapper.classed('numeric-scale', true);

        // Used a threshold scale instead of a ordinal scale to better bucket the values to colors.
        // Added grey to the range for any value less than categories[0]
        var colorScale = d3.scale.threshold()
            .domain(categories)
            .range(['#ccc', COLORS['teal5'], COLORS['teal4'], COLORS['teal3'], COLORS['teal2'], COLORS['teal1']]);

        // Testing for threshold scales
        // console.log(6.25, COLORS['teal6'], thresholdScale(6.25));
        // console.log(7.8, COLORS['teal5'], thresholdScale(7.8));
        // console.log(10.20, COLORS['teal3'], thresholdScale(10.20));
        // console.log(11.5, COLORS['teal2'], thresholdScale(11.5));
        // console.log(null, null, thresholdScale(''));
    }
    else if (config['isNumeric'] && config['container'] == '#chart-percent-change') {
        legendWrapper.classed('numeric-scale', true);

        var colorScale = d3.scale.threshold()
            .domain(categories)
            .range(['#ccc', COLORS['orange5'], COLORS['orange4'], COLORS['orange3'], COLORS['orange2'], COLORS['orange1']]);

    } else {
        // Define color scale
        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);
    }

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        if (config['container'] == '#chart-minimum-wage') {
            if (i != 0) {
                keyItem.append('label')
                    .text('$' + key);
            }
        } else {
            if (i != 0) {
                keyItem.append('label')
                    .text(key + '%');
            }
        }

        // Add the optional upper bound label on numeric scale
        if (config['isNumeric'] && i == categories.length - 1) {
            if (LABELS[config['abbr'] + '_max_label'] && LABELS[config['abbr'] + '_max_label'] !== '') {
                keyItem.append('label')
                    .attr('class', 'end-label end-label-' + config['abbr'])
                    .text(LABELS[config['abbr'] + '_max_label']);
            }
        }
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // resize map (needs to be explicitly set for IE11)
    chartElement.attr('width', config['width'])
        .attr('height', function() {
            var s = d3.select(this);
            var viewBox = s.attr('viewBox').split(' ');
            return Math.floor(config['width'] * parseInt(viewBox[3]) / parseInt(viewBox[2]));
        });

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[valueColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);
            var categoryClass = 'category-' + classify(state[valueColumn]);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active ' + categoryClass)
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

                return state['usps'];
            })
            .attr('class', function(d) {
                return d[valueColumn] !== null ? 'category-' + classify(d[valueColumn]) + ' label label-active' : 'label';
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

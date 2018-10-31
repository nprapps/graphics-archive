// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'state_name', 'state_abbr' ];

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
 * Format graphic data.
 */
var formatData = function() {
    DATA.forEach(function(d, i) {
        for (key in d) {
            if (!_.contains(skipLabels, key)) {
                d[key] = +d[key];
            }
        }
    });

    if (LABELS["show_territories"].toLowerCase() === "false") {
        var territories = ["Puerto Rico", "U.S. Virgin Islands", "Guam", "Northern Mariana Islands", "American Samoa"];

        DATA = DATA.filter(function(d) {
            return territories.indexOf(d["state_name"]) == -1;
        });
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

    var graphicWidth = containerWidth;
    var gutterWidth = 22;

    if (!isMobile) {
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    if (LABELS['is_numeric'] && LABELS['is_numeric'].toLowerCase() == 'true') {
        var isNumeric = true;
    } else {
        var isNumeric = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#state-grid-map');
    containerElement.html('');

    // Render the map!
    MAPS.forEach(function(d,i) {
        var mapWrapper = containerElement.append('div')
            .attr('class', 'map ' + classify(d['label']));

        if (!isMobile) {
            mapWrapper.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        var colors = [];
        if (d['label'] == 'pct_change_category') {
            colors.push(COLORS['teal6']);
        };
        for (var k = 6; k > 0; k--) {
            colors.push(COLORS[d['color'] + k]);
        }

        renderStateGridMap({
            container: '#state-grid-map .map.' + classify(d['label']),
            width: graphicWidth,
            data: DATA,
            valueColumn: d['label'],
            // isNumeric will style the legend as a numeric scale
            isNumeric: isNumeric,
            title: d['title'],
            colors: colors,
            legend_labels: d['legend_labels'],
            max_label: d['max_label']
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
    // containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    var categories = [];

    if (config['legend_labels'] && config['legend_labels'] !== '') {
        // If custom legend labels are specified
        var legendLabels = config['legend_labels'].split(',');
        _.each(legendLabels, function(label) {
            categories.push(label.trim());
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
    var legendTitle = containerElement.select('.title');
    var legendWrapper = containerElement.select('.key-wrap');
    var legendElement = containerElement.select('.key');

    if (config['isNumeric']) {
        legendWrapper.classed('numeric-scale', true);
        legendTitle.text(config['title']);

        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range(config['colors']);
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

        var keyLabel = key;
        if (valueColumn == 'pct_change_category' && key > 0) {
            keyLabel = '+' + key;
        }

        keyItem.append('label')
            .text(keyLabel);

        // Add the optional upper bound label on numeric scale
        if (config['isNumeric'] && i == categories.length - 1) {
            if (config['max_label'] && config['max_label'] !== '') {
                keyItem.append('label')
                    .attr('class', 'end-label')
                    .text(config['max_label']);
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
            var categoryClass = 'category-' + state[valueColumn];

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

                // return isMobile ? state['usps'] : state['ap'];
                return state['usps'];
            })
            .attr('class', function(d) {
                return d[valueColumn] !== null ? 'category-' + d[valueColumn] + ' label label-active' : 'label';
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

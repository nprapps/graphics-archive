// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
    
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
    if (LABELS["show_territories"].toLowerCase() === "false") {
        var territories = ["Puerto Rico", "U.S. Virgin Islands", "Guam", "Northern Mariana Islands", "American Samoa"];

        DATA = DATA.filter(function(d) {
            return territories.indexOf(d["state_name"]) == -1;
        });
    }

    DATA.forEach(function(d) {
        if (d.category == null) {
            d.category = "no_avr";
        }
    })

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

    if (LABELS['is_numeric'] && LABELS['is_numeric'].toLowerCase() == 'true') {
        var isNumeric = true;
    } else {
        var isNumeric = false;
    }

    // Render the map!
    renderStateGridMap({
        container: '#state-grid-map',
        width: containerWidth,
        data: DATA,
        categories: CATEGORIES,
        // isNumeric will style the legend as a numeric scale
        isNumeric: isNumeric
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
    var valueColumn = 'category';

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Extract categories from data
    // var categories = [];
    // if (LABELS['legend_labels'] && LABELS['legend_labels'] !== '') {
    //     // If custom legend labels are specified
    //     var legendLabels = LABELS['legend_labels'].split(',');
    //     legendLabels.forEach(function(label) {
    //         categories.push(label.trim());
    //     });
    // } else {
    //     // Default: Return sorted array of categories
    //      config['data'].forEach(function(state) {
    //         if (state[valueColumn] != null) {
    //             categories.push(state[valueColumn]);
    //         }
    //     });

    //     categories = d3.set(categories).values().sort();
    // }

    // Categories from sheet
    var categories = Object.keys(config.categories);


    // Create legend
    var legendWrapper = containerElement.select('.key-wrap');
    var legendElement = containerElement.select('.key');

    if (config['isNumeric']) {
        legendWrapper.classed('numeric-scale', true);

        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range([COLORS['teal6'], COLORS['teal5'], COLORS['teal4'], COLORS['teal3'], COLORS['teal2'], COLORS['teal1']]);
    } else {
        // Define color scale
        var colorScale = d3.scale.ordinal()
            .domain(categories)
            .range([COLORS['teal3'], COLORS['teal5'], "#ddd", COLORS['teal3'], COLORS['teal3']]);
    }

    colorScale.domain().forEach(function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(config.categories[key]);

        // Add the optional upper bound label on numeric scale
        if (config['isNumeric'] && i == categories.length - 1) {
            if (LABELS['max_label'] && LABELS['max_label'] !== '') {
                keyItem.append('label')
                    .attr('class', 'end-label')
                    .text(LABELS['max_label']);
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
    config['data'].forEach(function(state) {
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
                var state = STATES.filter(function(v) { return v['name'] == d['state_name'] }).pop();

                return isMobile ? state['usps'] : state['ap'];
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

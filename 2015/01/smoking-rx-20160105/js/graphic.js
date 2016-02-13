// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;

var colorBins = [0.13, 0.22, 1];
var colorRange = [COLORS['red6'], COLORS['red4'], COLORS['red2']];
var colorLabels = ['Less than 13 prescriptions per 100 smokers',
                   '13-22 prescriptions per 100 smokers',
                   'More than 22 prescriptions per 100 smokers',
                   'State extended Medicaid eligibility'];
var colorBinsCount = colorBins.length;
var colorScale = null;

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

    var valueColumn = 'value';

    // Extract categories from data
    var categories = [];

    _.each(config['data'], function(state) {
        if (state[valueColumn] != null) {
            categories.push(state[valueColumn]);
        }
    });

    categories = d3.set(categories).values().sort();

    // Define color scale
    var colorScale = d3.scale.threshold()
        .domain(colorBins)
        .range(colorRange);

    // Create legend
    var legendElement = containerElement.select('.key');

    var keyItem = legendElement.append('li')
        .attr('class', 'key-item key-expanded');

    keyItem.append('b');
    keyItem.append('label')
        .text(colorLabels[3]);

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorRange[i]);

        keyItem.append('label')
            .text(colorLabels[i]);
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state[valueColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);
            var appendClass = ' state-active';

            if (state['expanded_med']) {
                appendClass = appendClass + ' state-expanded';
            }

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + appendClass)
                .attr('fill', colorScale(state[valueColumn]));
        }
    });

    d3.selectAll('.state-expanded').moveToFront();

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
            .attr('fill', function(d) {
                var fillColor = d3.rgb(colorScale(d[valueColumn])).darker(1.2);
                return fillColor;
            })
            .attr('class', function(d) {
                var appendClass = ' label-active';

                if (d['expanded_med']) {
                    appendClass = appendClass + ' state-expanded';
                }
                return d[valueColumn] !== null ? 'label' + appendClass : 'label';
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

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

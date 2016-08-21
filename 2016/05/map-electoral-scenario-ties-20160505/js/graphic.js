// Global config
var MAP_TEMPLATE_ID = '#map-template';
var SWING_STATES = [ 'colorado', 'florida', 'michigan', 'nevada', 'north-carolina', 'ohio', 'pennsylvania', 'virginia', 'wisconsin' ];

// Global vars
var pymChild = null;
var isMobile = false;
var categories = [ 'dem', 'gop' ];
var colorRange = [ COLORS['blue2'], COLORS['red2'] ];
var colorScale = null;

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
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(colorRange);
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;

    // tiny maps. ALWAYS mobile.
    isMobile = true;

    if (containerWidth <= MOBILE_THRESHOLD) {
        // isMobile = true;
        graphicWidth = containerWidth;
    } else {
        // isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Render the map!
    var containerElement = d3.select('#state-grid-map');
    // containerElement.html('');

    var tie1 = containerElement.select('.tie1')
        .attr('style', function() {
            if (containerWidth > MOBILE_THRESHOLD) {
                return 'width: ' + graphicWidth + 'px; margin-right: ' + gutterWidth + 'px; float: left;';
            }
        });

    renderStateGridMap({
        container: '#state-grid-map .tie1 .map',
        width: containerWidth,
        data: DATA,
        dataColumn: 'tie1'
    });

    var tie1 = containerElement.select('.tie2')
        .attr('style', function() {
            if (containerWidth > MOBILE_THRESHOLD) {
                return 'width: ' + graphicWidth + 'px; float: right;';
            }
        });

    renderStateGridMap({
        container: '#state-grid-map .tie2 .map',
        width: containerWidth,
        data: DATA,
        dataColumn: 'tie2'
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
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

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

    SWING_STATES.forEach(function(d,i) {
        containerElement.select('path.state-' + d).moveToFront();
    })

    // Draw state labels
    var labelLineHeight = 9;
    if (isMobile) {
        labelLineHeight = 11;
    }
    var stateLabels = chartElement.append('g')
        .selectAll('text')
            .data(config['data'])
        .enter().append('text')
            .attr('text-anchor', 'middle')
            .attr('class', function(d) {
                return d['category'] !== null ? 'label label-active' : 'label';
            })
            .attr('dx', 0)
            .attr('dy', 0);

    stateLabels.append('tspan')
        .text(function(d) {
            var state = _.findWhere(STATES, { 'name': d['state_name'] });
            return isMobile ? state['usps'] : state['ap'];
        })
        .attr('dy', (0 * labelLineHeight) + 'px');

    stateLabels.append('tspan')
        .text(function(d) {
            d['votes_tie'] = +d['votes_tie'];
            return d['votes_tie'].toFixed(0);
        })
        .attr('dx', 0)
        .attr('dy', (1 * labelLineHeight) + 'px');

    stateLabels.attr('x', function(d) {
            var className = '.state-' + classify(d['state_name']);
            var tileBox = chartElement.select(className)[0][0].getBBox();
            var xPos = tileBox['x'] + tileBox['width'] * 0.52;

            d3.select(this).selectAll('tspan')
                .attr('x', xPos);

            return xPos;
        })
        .attr('y', function(d) {
            var className = '.state-' + classify(d['state_name']);
            var tileBox = chartElement.select(className)[0][0].getBBox();
            var textBox = d3.select(this)[0][0].getBBox();
            var textOffset = (tileBox['height'] - textBox['height']) + 1;

            if (isMobile) {
                textOffset += 8;
            }

            var yPos = tileBox['y'] + textOffset;

            // if (d['state_name'] == 'Iowa') {
            //     console.log('tileBox', tileBox.y, tileBox.height);
            //     console.log('textBox', textBox.y, textBox.height);
            //     console.log(yPos, textOffset);
            // }

            d3.select(this).selectAll('tspan')
                .attr('y', yPos);

            return yPos;
        });
}


/*
 * Select an element and move it to the front of the stack
 */
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

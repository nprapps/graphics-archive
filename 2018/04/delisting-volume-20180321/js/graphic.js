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
 * Render the graphic.
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

    // Render the chart!
    renderGraphic({
        container: '#graphic',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
    var aspectWidth = 4,
        aspectHeight = 3,
        labelMargin = 50;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: 15
    };

    var max = d3.max(config.data, function(d) {
        return d.value;
    });

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    var circleScale = d3.scale.sqrt()
        .domain([0, max])
        .range([0, (chartHeight) / 2]);

    var colorScale = d3.scale.ordinal()
        .domain([0, 1])
        .range([COLORS['blue4'], COLORS['blue6']]);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')')
        .attr('class', 'chart-element');

    // Draw here!
    var circles = chartElement.selectAll('circle')
        .data(config.data)
        .enter()
        .append('circle')
        .attr('class', 'circles');

    circles.attr('cx', chartWidth / 2)
        .attr('cy', function(d) {
            return chartHeight - circleScale(d.value);
        })
        .attr('r', function(d) {
            return circleScale(d.value);
        })
        .attr('fill', function(d, i) {
            return colorScale(i);
        });

    var labels = chartElement.selectAll('text')
        .data(config.data)
        .enter()
        .append('text')
        .attr('class', 'labels');

    labels.attr('x', chartWidth / 2)
        .attr('y', function(d) {
            return chartHeight - (2 * circleScale(d.value)) + labelMargin;
        })
        .text(function(d) {
            return (d.value / 1000000).toFixed(2) + ' million ' + d.label;
        });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

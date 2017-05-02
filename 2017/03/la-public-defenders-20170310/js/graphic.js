// Global vars
var pymChild = null;
var isMobile = false;
var annotations = [];

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
    DATA.forEach(function(d) {
        d['amt'] = +d['amt'];

        if (d['annotate'] == 'yes') {
            annotations.push({ 'label': d['label'], 'amt': d['amt'], 'dist': +d['dist'] });
        }
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

    // Render the chart!
    renderDotChart({
        container: '#dot-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderDotChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var barHeight = 50;
    var barGap = 5;
    var valueMinWidth = 30;
    var dotRadius = Math.floor(barHeight * .4);

    var margins = {
        top: 30,
        right: 5,
        bottom: 80,
        left: 0
    };

    var ticksX = 6;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = ((barHeight + barGap) * config['data'].length);
    var chartHeight = barHeight;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var min = 0;
    var max = 5;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Render range bar.
     */
    chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', xScale(xScale.domain()[0]))
        .attr('y', 0)
        .attr('width', chartWidth)
        .attr('height', chartHeight);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d) {
            if (d > 1) {
                return d + 'x';
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, 0))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('line')
            .attr('x1', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('x2', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y1', 0)
            .attr('y2', barHeight)
            .attr('class', function(d) {
                var c = 'dist-' + d['dist'] + ' ' + classify(d[labelColumn]);
                if (d['annotate'] == 'yes') {
                    c += ' annotate';
                }
                if (d[valueColumn] > 1) {
                    c += ' over';
                } else if (d[valueColumn] < 1) {
                    c += ' under';
                }
                return c;
            });

    chartElement.select('.dots .annotate').moveToFront();
    chartElement.select('.dots .state-average').moveToFront();
    chartElement.select('.dots .recommended').moveToFront();

    var annot = chartElement.append('g')
        .attr('class', 'annotations')
    _.each(annotations, function(d,i) {
        var lineY = chartHeight + 7;
        if (i == 0) {
            lineY = -1;
        }

        annot.append('line')
            .attr('class', 'dist-' + d['dist'] + ' ' + classify(d[labelColumn]))
            .attr('x1', xScale(d[valueColumn]))
            .attr('x2', xScale(d[valueColumn]))
            .attr('y1', lineY)
            .attr('y2', lineY - 6);

        var label = d[labelColumn] + ': ' + d[valueColumn].toFixed(2);
        switch (i) {
            case 0:
                label = d[labelColumn];
                break;
            case 1:
                label += 'x the recommended limit';
                break;
        }

        var labelY = chartHeight + 18;
        var labeldx = 0;
        if (i == 0) {
            labelY = -33;
        }
        if (d['dist'] == 17 && isMobile) {
            labeldx = 10;
        }

        annot.append('text')
            .text(label)
            .attr('class', 'dist-' + d['dist'] + ' ' + classify(d[labelColumn]))
            .attr('x', xScale(d[valueColumn]))
            .attr('y', labelY)
            .attr('dx', labeldx)
            .call(wrapText, 60, 12)
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

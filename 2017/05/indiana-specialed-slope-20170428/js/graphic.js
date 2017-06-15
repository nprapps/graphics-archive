/*
TODO
- voronoi for mouseovers
- show # of voucher schools in each district?
*/


// Global config
var SIDEBAR_THRESHOLD = 280;

// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;

/*
 * Initialize graphic
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
        d['start'] = +d['start'];
        d['end'] = +d['end'];
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

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // Render the chart!
    renderSlopegraph({
        container: '#slopegraph',
        width: containerWidth,
        data: DATA,
        labels: LABELS
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderSlopegraph = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var startColumn = 'start';
    var endColumn = 'end';

    var startLabel = config['labels']['start_label'];
    var endLabel = config['labels']['end_label'];

    var margins = {
        top: 70,
        right: 12,
        bottom: 80,
        left: 150
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;
    var dotRadius = 4;
    var labelGap = 12;
    var maxLabelWidth = 50;
    var chartHeight = 170;

    if (isMobile) {
        chartHeight = 125;
        margins['left'] = 110;
        ticksX = 4;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];


    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = 0;
    var max = d3.max(config['data'], function(d) {
        var rowMax = d3.max([d[startColumn], d[endColumn]]);
        return Math.ceil(rowMax / roundTicksFactor) * roundTicksFactor;
    });

    var xScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ 0, chartWidth ]);

    var yScale = d3.scale.ordinal()
        .domain([ endLabel, startLabel ])
        .range([ chartHeight, 0 ]);

    /*
     * Create D3 axes.
     */
    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d + '%';
        });

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d + '%';
        });

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
     * Render axes to chart.
     */
    chartElement.append('rect')
        .attr('class', 'bg')
        .attr('x', xScale(xScale.domain()[0]))
        .attr('y', yScale(yScale.domain()[1]))
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .attr('fill', '#f1f1f1');
    chartElement.append('g')
        .attr('class', 'x axis')
        .call(xAxisTop);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
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
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    var lines = chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('class', function(d, i) {
                return 'line ' + 'line-' + i + ' ' + classify(d[labelColumn]);
            })
            .attr('data-id', function(d,i) {
                return i;
            })
            .attr('x1', function(d) {
                return xScale(d[startColumn]);
            })
            .attr('x2', function(d) {
                return xScale(d[endColumn]);
            })
            .attr('y1', yScale(startLabel))
            .attr('y2', yScale(endLabel));

    // left-side annotations
    var axisLabels = chartWrapper.append('div')
        .attr('class', 'axis-labels');

    axisLabels.append('div')
        .html(LABELS['hdr_start'])
        .attr('style', function() {
            var s = '';
            s += 'top: ' + (margins['top'] - 4) + 'px; ';
            s += 'width: ' + (margins['left'] - labelGap) + 'px; ';
            return s;
        });
    axisLabels.append('div')
        .html(LABELS['hdr_end'])
        .attr('style', function() {
            var s = '';
            s += 'bottom: ' + margins['bottom'] + 'px; ';
            s += 'width: ' + (margins['left'] - labelGap) + 'px; ';
            return s;
        });

    // dot annotations
    var createDotAnnotations = function(dist) {
        var distData = config['data'].filter(function(d,i) {
            return d[labelColumn] == dist;
        });

        /*
         * Move a particular line to the front of the stack
         */
        chartElement.selectAll('.lines line')
            .classed('highlight', function(d,i) {
                if (d[labelColumn] == dist) {
                    return true;
                } else {
                    return false;
                }
            });
        chartElement.selectAll('.lines .highlight').moveToFront();

        // delete existing annotations
        containerElement.selectAll('.annotations').remove();

        // create new annotations
        var annotations = chartElement.append('g')
            .attr('class', 'annotations')
            .selectAll('circle')
            .data(distData)
            .enter();

        // dots
        _.each([ 'start', 'end' ], function(v,k) {
            annotations.append('circle')
                .attr('cx', function(d) {
                    return xScale(d[eval(v + 'Column')]);
                })
                .attr('cy', yScale(eval(v + 'Label')))
                .attr('class', function(d) {
                    return 'highlight ' + v + ' ' + classify(d[labelColumn]);
                })
                .attr('r', dotRadius);
        });

        // text
        var textAnnotations = chartWrapper.append('div')
            .attr('class', 'annotations')
            .selectAll('div')
            .data(distData)
            .enter();

        textAnnotations.append('div')
            .attr('class', 'desc public')
            .html(function(d,i) {
                var txt = '';
                txt += '<strong>' + d[labelColumn] + ': ' + d[startColumn].toFixed(1) + '%</strong> ';
                txt += LABELS['desc_public'];
                return txt;
            })
            .attr('style', function(d,i) {
                var s = '';
                s += 'bottom: ' + (chartHeight + margins['bottom'] + 28) + 'px; ';
                s += 'left: ' + (margins['left'] + xScale(d[startColumn]) - 75) + 'px; ';
                return s;
            });

        textAnnotations.append('div')
            .attr('class', 'desc voucher')
            .html(function(d,i) {
                var txt = '';
                txt += LABELS['desc_voucher1'] + '<strong>' + d[endColumn].toFixed(1) + '%</strong> ';
                txt += LABELS['desc_voucher2'] + d[labelColumn] + '.'
                return txt;
            })
            .attr('style', function(d,i) {
                var s = '';
                s += 'top: ' + (margins['top'] + chartHeight + 25) + 'px; ';
                s += 'left: ' + (margins['left'] + xScale(d[endColumn]) - 75) + 'px; ';
                return s;
            });

        selector.property('value', dist);
    }

    // set up selectbox
    var selectorWrapper = containerElement.insert('div', '.graphic-wrapper')
        .attr('class', 'selector');
    selectorWrapper.append('label')
        .attr('for', 'districts')
        .html(LABELS['selector_label']);

    var selector = selectorWrapper.append('select')
        .attr('name', 'districts')
        .attr('class', 'district-selector');

    selector.append('option')
        .attr('selected', 'selected')
        .attr('value', 'default')
        .html('Select one&hellip;');

    var selectorData = config['data'].sort(function(a, b){
        return d3.ascending(a[labelColumn], b[labelColumn]);
    });

    selectorData.forEach(function(d,i) {
        selector.append('option')
            .attr('value', d[labelColumn])
            .html(d[labelColumn]);
    });

    var onChangeSelector = function() {
        if (d3.select(this).property('selectedIndex') > 0) {
            var selected = d3.select(this).property('value');
            createDotAnnotations(selected);
        }
    }

    selector.on('change', onChangeSelector);

    // tooltips
    if (!isMobile) {
        lines.on('mouseover', function(d) {
            createDotAnnotations(d[labelColumn]);
        });
    }

    // default annotation
    createDotAnnotations(LABELS['default_district']);
}


/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

// calculate optimal x/y tooltip position
var calculateXPos = function(xPos, width, graphicWidth) {
    var newXPos = null;
    var offset = 5;
    var ttWidth = xPos + offset + width;
    if (ttWidth > graphicWidth) {
        // newXPos = xPos - width - offset;
        newXPos = graphicWidth - width - offset;
    } else {
        newXPos = xPos + offset;
    }
    return newXPos;
}
var calculateYPos = function(yPos, height, graphicHeight) {
    var newYPos = null;
    var offset = 25;
    var ttHeight = yPos + offset + height;
    if (ttHeight > graphicHeight) {
        newYPos = yPos - height - offset;
    } else {
        newYPos = yPos + offset;
    }
    return newYPos;
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

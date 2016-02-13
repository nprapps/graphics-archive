// Global vars
var pymChild = null;
var isMobile = false;
var stateValues = [];
var hsStateValues = [];

var msTab = null;
var hsTab = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        msTab = d3.select('.tabs .ms')
        hsTab = d3.select('.tabs .hs')

        msTab.on('click', function() {
            msTab.classed('active', true);
            hsTab.classed('active', false);
            d3.select('#dot-chart').style('display', 'block');
            d3.select('#hs-dot-chart').style('display', 'none');
        })
        hsTab.on('click', function() {
            msTab.classed('active', false);
            hsTab.classed('active', true);
            d3.select('#dot-chart').style('display', 'none');
            d3.select('#hs-dot-chart').style('display', 'block');
        })

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        var values = [];
        for (key in d) {
            if (key != 'label' && key != 'range') {
                d[key] = +d[key];

                if(key != 'median' && key != 'min' && key != 'max' && !isNaN(d[key])) {
                    values.push({ 'state': key, 'value': d[key] });
                }
            }
        }
        stateValues.push(values);
    });

    DATA_HS.forEach(function(d) {
        var values = [];
        for (key in d) {
            if (key != 'label' && key != 'range') {
                d[key] = +d[key];

                if(key != 'median' && key != 'min' && key != 'max' && !isNaN(d[key])) {
                    values.push({ 'state': key, 'value': d[key] });
                }
            }
        }
        hsStateValues.push(values);
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
        data: DATA,
        valueData: stateValues
    });

    renderDotChart({
        container: '#hs-dot-chart',
        width: containerWidth,
        data: DATA_HS,
        valueData: hsStateValues
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
    var valueColumn = 'median';
    var minColumn = 'min';
    var maxColumn = 'max';

    var barHeight = 55;
    var barGap = 5;
    var labelWidth = 175;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var stateDotRadius = 4;
    var medianDotRadius = 6;

    if (isMobile) {
        labelWidth = 110;
        barHeight = 65;
    }

    var margins = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 6;
        margins['right'] = 30;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

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
    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[maxColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d + '%';
        });

    /*
     * Render axes to chart.
     */
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
     * Render range bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('x1', function(d, i) {
                return xScale(d[minColumn]);
            })
            .attr('x2', function(d, i) {
                return xScale(d[maxColumn]);
            })
            .attr('y1', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('y2', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            });

    /*
     * Render dots to chart.
     */
    // state dots
    var stateDots = chartElement.append('g')
        .attr('class', 'state-dots')
        .selectAll('g')
        .data(config['valueData'])
        .enter().append('g')
            .attr('class', function(d,i) {
                return 'dots dots-' + i;
            })
            .attr('transform', function(d,i) {
                return 'translate(0,' + (i * (barHeight + barGap)) + ')';
            });

    stateDots.selectAll('circle')
        .data(function(d) {
            return d;
        })
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d['value']);
            })
            .attr('cy', (barHeight / 2) )
            .attr('r', stateDotRadius);

    stateDots.selectAll('text')
        .data(function(d) {
            var vals = [];
            var sorted = _.sortBy(d, 'value');
            vals.push(sorted[0], sorted[sorted.length - 1]);
            return vals;
        })
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d['value']);
            })
            .attr('y', function(d,i) {
                return (barHeight / 2) - 9;
            })
            .text(function(d) {
                return d['state'];
            });

    // median dot
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('cx', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('cy', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', medianDotRadius)

    /*
     * median values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d,i) {
                return i * (barHeight + barGap) + (barHeight / 2) + 20;
            })
            .text(function(d) {
                return d[valueColumn].toFixed(1) + '%';
            });


    /*
     * Render bar labels.
     */
    containerElement
        .append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .html(function(d) {
                    return d[labelColumn];
                });

    msTab.on('click')();
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

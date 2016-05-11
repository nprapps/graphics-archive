// Global vars
var pymChild = null;
var isMobile = false;

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
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['amt'] = +d['amt'];
        d['2012'] = +d['2012'];
        d['2015'] = +d['2015'];
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

    var containerElement = d3.select('#dot-chart');
    containerElement.html('');

    var chart_groups = ['Eat less red meat', 'Eat about the same', 'Eat more red meat'];
    for (var i=0; i<chart_groups.length; i++) {
        var chart_id = classify(chart_groups[i]);
        containerElement.append('div')
            .attr('class', 'chart-wrapper')
            .attr('id', chart_id);

        var start_i = 2 * i,
            end_i = 2 * (i+1);

        // Render the chart!
        renderDotChart({
            container: '#' + chart_id,
            width: containerWidth,
            header: 'Share of respondents who ' + chart_groups[i],
            data: DATA.slice(start_i, end_i),
            overallData: DATA
        });
    }

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
    var minColumn = '2012';
    var maxColumn = '2015';

    var barHeight = isMobile ? 30 : 20;
    var barGap = 5;
    var labelWidth = isMobile ? 70 : 90;
    var labelMargin = 20;
    var valueMinWidth = 30;
    var dotRadius = 4;

    var margins = {
        top: 0,
        right: 35,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = isMobile? 4 : 6;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 6;
        margins['right'] = 40;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['header']);

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
    var max = d3.max(config['overallData'], function(d) {
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
            .attr('class', function(d) {
                var label_class = d[valueColumn] < 0 ? 'negative' : 'positive';
                return label_class;
            })
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
    // Dot for 2012
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('class', function(d) {
                var label_class = d[valueColumn] < 0 ? 'negative' : 'positive';

                return label_class;
            })
            .attr('cx', function(d, i) {
                return xScale(d[minColumn]);
            })
            .attr('cy', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', dotRadius)

    // Arrow for 2015
    chartElement.append('g')
        .attr('class', 'arrows')
        .selectAll('path.arrow')
        .data(config['data'])
        .enter().append('path')
            .attr('class', function(d) {
                var label_class = d[valueColumn] < 0 ? 'negative' : 'positive';

                return 'arrow ' + label_class;
            })
            .attr('d', 'M 0 0 L 8 4 L 0 8 z')
            .attr('transform', function(d, i) {
                var x_offset = d[valueColumn] < 0 ? -4 : 0;
                var arrow_x = xScale(d[maxColumn]) + x_offset;
                var arrow_y = (i * (barHeight + barGap) + (barHeight / 2)) - 4;
                var rotate_str = d[valueColumn] < 0 ? ' rotate(180, 4, 4)' : '';
                return 'translate(' + arrow_x + ',' + arrow_y + ')' + rotate_str;
            });

    /*
     * Render bar labels.
     */
    chartWrapper
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
                .text(function(d) {
                    return d[labelColumn];
                });

    /*
     * Render bar values.
     */
    _.each(['shadow', 'value'], function(cls) {
        chartElement.append('g')
            .attr('class', cls)
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('text-anchor', function(d) {
                    return d[valueColumn] < -0.5 ? 'end' : 'start';
                })
                .attr('x', function(d, i) {
                    var x_offset = d[valueColumn] < -0.5 ? -6 : 10;
                    return xScale(d[maxColumn]) + x_offset;
                })
                .attr('y', function(d,i) {
                    return i * (barHeight + barGap) + (barHeight / 2) + 3;
                })
                .text(function(d) {
                    var plus_sign = d[valueColumn] > 0 ? '+' :'';
                    return plus_sign + d[valueColumn].toFixed(1) + '%';
                });
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

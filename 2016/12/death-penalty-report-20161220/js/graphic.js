// Global vars
var pymChild = null;
var isMobile = false;
var charts = [];
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
    charts = d3.keys(DATA);
    console.log(charts);

    charts.forEach(function(v,k) {
        console.log(k);
        var chartData = DATA[v];
        annotations[v] = [];

        chartData.forEach(function(d) {
            d['amt'] = +d['amt'];
            d['label'] = d3.time.format('%Y').parse(d['label']);
            if (d['annotate'] == 'yes') {
                annotations[v].push(d);
            }
        });
    });
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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    var containerElement = d3.select('#column-chart');
    containerElement.html('');

    charts.forEach(function(v,k) {
        var chartId = 'chart-' + classify(v);

        var chartElement = containerElement.append('div')
            .attr('class', 'graphic')
            .attr('id', chartId);

        if (!isMobile) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'float: left; ';
                s += 'width: ' + graphicWidth + 'px; ';
                if (k % 2 > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // Render the chart!
        renderColumnChart({
            container: '#' + chartId,
            width: graphicWidth,
            data: DATA[v],
            yDomain: [ 0, 350 ],
            title: v
        });
    })

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var aspectWidth = 4;
    var aspectHeight = 3;
    var valueGap = 6;

    var margins = {
        top: 10,
        right: 5,
        bottom: 20,
        left: 30
    };

    var ticksY = 6;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
    .text('Number of ' + config['title']);

    /*
     * Create D3 scale objects.
     */
    var min = config['yDomain'][0];
    var max = config['yDomain'][1];

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

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
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (i % 6 == 0) {
                return '\u2019' + fmtYearAbbrev(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                return xScale(d[labelColumn]);
            })
            .attr('y', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(0);
                }

                return yScale(d[valueColumn]);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(d[valueColumn]) - yScale(0);
                }

                return yScale(0) - yScale(d[valueColumn]);
            })
            .attr('class', function(d) {
                return 'bar bar-' + d[labelColumn];
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    /*
     * Create annotations
     */

     var annotatedPoints = chartElement.append('g')
        .attr('class', 'annotations')
        .selectAll('.annot')
        .data(annotations[config['title']])
        .enter()
            .append('g')
            .attr('class', 'annot');

    annotatedPoints.append('line')
        .attr('y1', function(d) {
            return yScale(d[valueColumn]);
        })
        .attr('y2', function(d) {
            return yScale(d[valueColumn]) - 15;
        })
        .attr('x1', function(d) {
            return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
        })
        .attr('x2', function(d) {
            return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
        });

    annotatedPoints.append('text')
        .text(function(d) {
            var val = (d[valueColumn]).toFixed(0);
            return fmtComma(val);
        })
        .attr('x', function(d) {
            return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
        })
        .attr('y', function(d) {
            return yScale(d[valueColumn]) - 20;
        });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

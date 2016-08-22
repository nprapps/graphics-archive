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

        for (key in d) {
            if (_.contains([ 'label', 'label_mobile' ], key)) {
                continue;
            };

            d[key] = +d[key];
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
    var y2008Column = 'pct_2008';
    var y2014Column = 'pct_2014';
    var diffColumn = 'pct_diff';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 7;

    var margins = {
        top: 15,
        right: 5,
        bottom: 40,
        left: 35
    };

    var ticksY = 6;
    var roundTicksFactor = 5;

    if (isMobile) {
        dotRadius = 16;
        labelColumn = 'label_mobile';
        margins['bottom'] = 30;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

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
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
             return d[labelColumn];
        }));

    var min = 0;
    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[y2008Column] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ chartHeight, 0 ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
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

    var axisLineHeight = 15;
    if (isMobile) {
        axisLineHeight = 13;
    }
    chartElement.selectAll('.x text')
        .attr('y', function() {
            var t = Number(d3.select(this).attr('y'));
            if (isMobile) {
                return (t + 8);
            } else {
                return (t + 10);
            }
        })
        .attr('dy', 0)
        .call(wrapText, xScale.rangeBand(), axisLineHeight);

    /*
     * Render range bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'guide-bars')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('x1', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('x2', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y1', function(d, i) {
                return yScale(0);
            })
            .attr('y2', function(d, i) {
                return yScale(d[y2014Column]);
            });

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
                return classify(d[labelColumn]);
            })
            .attr('x1', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('x2', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y1', function(d, i) {
                return yScale(d[y2008Column]);
            })
            .attr('y2', function(d, i) {
                return yScale(d[y2014Column]);
            });

    /*
     * Render bar values.
     */
    _.each(['2008', '2014'], function(cls) {
        var dy = null;
        switch(cls) {
            case '2008':
                dy = -6;
                break;
            case '2014':
                dy = 15;
                break;
        }
        var valueElement = chartElement.append('g')
            .attr('class', 'value y-' + cls);
        valueElement.selectAll('text')
            .data(config['data'])
            .enter().append('text')
                .attr('class', function(d) {
                    return 'c-' + classify(d[labelColumn]) + ' val';
                })
                .attr('x', function(d, i) {
                    return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
                })
                .attr('y', function(d,i) {
                    return yScale(d[ eval('y' + cls + 'Column') ]);
                })
                .attr('dy', dy)
                .text(function(d) {
                    return d[ eval('y' + cls + 'Column') ].toFixed(1) + '%';
                });

        if (cls == '2014') {
            valueElement.selectAll('.diff')
                .data(config['data'])
                .enter().append('text')
                    .text(function(d) {
                        return '(' + d[diffColumn].toFixed(1) + ' pts.)';
                    })
                    .attr('class', function(d) {
                        return 'year-label diff c-' + classify(d[labelColumn]);
                    })
                    .attr('x', function(d) {
                        return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
                    })
                    .attr('y', function(d,i) {
                        var t = valueElement.select('.c-' + classify(d[labelColumn]))[0][0].getBBox();
                        return (t.y + t.height + 10);
                    });
        }

        var overallValue = valueElement.select('text.c-overall');
        if (cls == '2008') {
            overallValue.attr('y', function() {
                var t = Number(d3.select(this).attr('y'));
                return t -= 13;
            })
        }
        var overallValueDimensions = overallValue[0][0].getBBox();
        if (cls == '2014') {
            overallValueDimensions = valueElement.select('.diff.c-overall')[0][0].getBBox();
        }
        valueElement.append('text')
            .text('in ' + cls)
            .attr('class', 'year-label')
            .attr('x', (xScale(xScale.domain()[0]) + (xScale.rangeBand() / 2)))
            .attr('y', overallValueDimensions.y + overallValueDimensions.height + 11);
    });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

// Global vars
var pymChild = null;
var isMobile = false;
var charts = [];
var skipLabels = [ 'chart', 'label', 'labels', 'values', 'total',
                   'bracket_1_label', 'bracket_2_label', 'bracket_3_label', 'bracket_4_label',
                   'bracket_5_label', 'bracket_6_label', 'bracket_7_label',
                   'bracket_1_rate', 'bracket_2_rate', 'bracket_3_rate', 'bracket_4_rate',
                   'bracket_5_rate', 'bracket_6_rate', 'bracket_7_rate' ];
var bracketLabels = [ 'bracket_1_label', 'bracket_2_label', 'bracket_3_label', 'bracket_4_label',
                      'bracket_5_label', 'bracket_6_label', 'bracket_7_label' ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    // if (Modernizr.svg) {
    //     formatData();
    //
    //     pymChild = new pym.Child({
    //         renderCallback: render
    //     });
    // } else {
        pymChild = new pym.Child({});
    // }

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
        var y0 = 0;

        d['values'] = [];
        d['labels'] = [];
        d['total'] = 0;

        for (var key in d) {
            if (_.contains(bracketLabels, key)) {
                if (isNaN(d[key])) {
                    d['labels'].push(d[key]);
                } else if (d[key] != null) {
                    d[key] = +d[key];
                    d['labels'].push(d[key]);
                }
                continue;
            }

            if (_.contains(skipLabels, key)) {
                continue;
            }

            d[key] = +d[key];

            var y1 = y0 + d[key];
            d['total'] += d[key];

            d['values'].push({
                'name': key,
                'y0': y0,
                'y1': y1,
                'val': d[key],
                'rate': +d[key + '_rate']
            })

            y0 = y1;
        }
    });

    charts = _.uniq(_.pluck(DATA, 'chart'));
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var gutterWidth = 22;
    var numCols = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 1;
    } else {
        isMobile = false;
        numCols = 2;
    }

    var graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1))) / numCols);
    var roundTicksFactor = 50;

    var min = d3.min(DATA, function(d) {
        return Math.floor(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(DATA, function(d) {
        return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-column-chart');
    containerElement.html('');

    charts.forEach(function(d,i) {
        var chartData = DATA.filter(function(v, k) {
            return v['chart'] == d;
        });

        var chartElement = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        if (numCols > 1) {
            chartElement.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (i % numCols != 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // Render the chart!
        renderStackedColumnChart({
            container: '#stacked-column-chart .chart.' + classify(d),
            width: graphicWidth,
            data: chartData,
            title: d,
            roundTicksFactor: roundTicksFactor,
            min: min,
            max: max
        });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var aspectWidth = 16;
    var aspectHeight = 9;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 100,
        bottom: 20,
        left: 100
    };

    var ticksY = 5;
    var roundTicksFactor = config['roundTicksFactor'];

    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = 500;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
        .html(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeBands([ 0, chartWidth ], .05)

    var min = config['min'];
    var max = config['max'];

    var yScale = d3.scale.linear()
        .domain([ min, max ])
        .rangeRound([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        // .range([ COLORS['teal6'], COLORS['teal5'], COLORS['teal4'], COLORS['teal3'], COLORS['teal2'], COLORS['teal1'] ]);
        .range([ '#f3d469','#d5c56e','#b7b873','#99a976','#789c79','#528e7c','#17807e' ]);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d;
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    // chartElement.append('g')
    //     .attr('class', 'y axis')
    //     .call(yAxis);

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    // chartElement.append('g')
    //     .attr('class', 'y grid')
    //     .call(yAxisGrid()
    //         .tickSize(-chartWidth, 0)
    //         .tickFormat('')
    //     );

    /*
     * Render bars to chart.
     */
    var bars = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter().append('g')
            .attr('class', function(d,i) {
                console.log(d);
                return 'bar ' + classify(d['label']);
            })
            .attr('transform', function(d) {
                return makeTranslate(xScale(d[labelColumn]), 0);
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            // .style('fill', function(d) {
            //     return colorScale(d['name']);
            // })
            .attr('class', function(d) {
                return classify(d['name']);
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
     * Render values to chart.
     */
    bars.selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                return d['rate'].toFixed(1) + '%';
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
                return xScale.rangeBand() / 2;
            })
            .attr('y', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

                // if (textHeight > barHeight) {
                //     d3.select(this).classed('hidden', true);
                // }
                if (d['rate'] == 0) {
                    d3.select(this).classed('hidden', true);
                }

                var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);

                return barCenter + (textHeight / 2) - 3;
            })
            .attr('text-anchor', 'middle');

    /*
     * annotations
     */
    var annotations = chartElement.append('g')
        .attr('class', 'annotations')
    var lines = annotations.selectAll('.lines')
        .data([ config['data'][0]['labels'], config['data'][1]['labels'] ])
        .enter()
            .append('g')
            .attr('class', function(d, i) {
                return 'lines lines-' + i;
            });
    lines.selectAll('line')
        .data(function(d, i) {
            return d;
        })
        .enter()
            .append('line')
            .attr('x1', function(d,i) {
                if (i == 0) {
                    console.log(config['data']);
                    // return config['data']
                }
                console.log(d,i);
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

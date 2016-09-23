// Global vars
var DATA_URL = 'delegates.json';
var pymChild = null;
var isMobile = false;
var graphicData = null;
var parties = [];
var lastUpdated = '';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadData(DATA_URL);
    } else {
        pymChild = new pym.Child({});

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
    }
}

/*
 * Load data from a CSV
 */
var loadData = function(url) {
    d3.json(url, function(error, data) {
        graphicData = data['nation'];
        parties = d3.keys(graphicData);

        formatData(data);

        lastUpdated = data['last_updated'];
        var source = d3.select('.footer p');
        var sourceText = source.text() + ' as of ' + lastUpdated + ' EDT';
        source.text(sourceText);

        pymChild = new pym.Child({
            renderCallback: render
        });

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function(data) {
    parties.forEach(function(p,i) {
        graphicData[p].forEach(function(d) {
            d['delegates_count'] = +d['delegates_count'];
            d['superdelegates_count'] = +d['superdelegates_count'];
            d['pledged_delegates_count'] = d['delegates_count'] - d['superdelegates_count'];
            d['d1'] = +d['d1'];
            d['prior'] = d['delegates_count'] - d['d1'];
            d['party_need'] = +d['party_need'];

            d['values'] = [];
            d['values'].push({
                'name': 'Delegates through March 14',
                'x0': 0,
                'x1': d['prior'],
                'val': d['prior']
            });
            d['values'].push({
                'name': 'New pickups',
                'x0': d['prior'],
                'x1': d['delegates_count'],
                'val': d['d1']
            });

            // d['values'].push({
            //     'name': 'Pledged delegates',
            //     'x0': 0,
            //     'x1': d['pledged_delegates_count'],
            //     'val': d['pledged_delegates_count']
            // });
            // d['values'].push({
            //     'name': 'Superdelegates',
            //     'x0': d['pledged_delegates_count'],
            //     'x1': (d['pledged_delegates_count'] + d['superdelegates_count']),
            //     'val': d['superdelegates_count']
            // });

            d['values'].push({
                'name': 'Remaining',
                'x0': d['delegates_count'],
                'x1': d['party_need'],
                'val': (d['party_need'] - d['delegates_count'])
            });
        });

        graphicData[p] = graphicData[p].filter(function(d) {
            return d['last'] != 'Carson' && d['last'] != 'Bush' && d['last'] != 'Paul' && d['last'] != 'Huckabee' && d['last'] != 'Fiorina' && d['last'] != 'Gilmore' && d['last'] != 'Christie';
        });
        graphicData[p] = _.sortBy(graphicData[p], 'delegates_count');
        graphicData[p].reverse();
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

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-bar-chart');
    containerElement.html('');

    // Render the chart!
    parties.forEach(function(p, i) {
        var chart = containerElement.append('div')
            .attr('class', 'chart ' + p)
            .attr('style', 'width: ' + graphicWidth + 'px;');

        var hdr = chart.append('h3');
        switch(p) {
            case 'dem':
                hdr.text('Democratic Delegates');
                break;
            case 'gop':
                hdr.text('Republican Delegates');
                break;
        }

        renderStackedBarChart({
            container: '.chart.' + p,
            width: graphicWidth,
            data: graphicData[p],
            party: p,
            min: 0,
            max: graphicData[p][0]['party_need'],
            legend: [ 'Delegates through March 14', 'New pickups', 'Remaining' ]
        });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'last';

    var barHeight = 50;
    var barGap = 2;
    var labelWidth = 46;
    var labelMargin = 6;
    var valueGap = 6;

    var isPromo = false;
    if (isPromo) {
        barHeight = 70;
        labelMargin = 15;
    }

    var margins = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var min = 0;
    var max = config['max'];
    var tickValues = [ min, max ];

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.linear()
         .domain([ min, max ])
         .rangeRound([0, chartWidth]);

    var demColorScale = d3.scale.ordinal()
        .domain(config['legend'])
        .range([ COLORS['blue5'], COLORS['blue3'], '#f1f1f1' ]);

    var gopColorScale = d3.scale.ordinal()
        .domain(config['legend'])
        .range([ COLORS['red5'], COLORS['red3'], '#f1f1f1' ]);

    var colorScale = d3.scale.ordinal()
         .domain(config['legend']);

    switch(config['party']) {
        case 'dem':
            colorScale.range( demColorScale.range() );
            break;
        case 'gop':
            colorScale.range( gopColorScale.range() );
            break;
    }

    /*
     * Render the legend.
     */
    if (config['party'] == 'dem' && isMobile) {
        var legend = d3.select('.graphic').insert('ul', config['container'])
    		.attr('class', 'key')
    		.selectAll('g')
    			.data(colorScale.domain())
    		.enter().append('li')
    			.attr('class', function(d, i) {
    				return 'key-item key-' + i + ' ' + classify(d);
    			});

        legend.append('b')
            .style('background-color', function(d) {
                return demColorScale(d);
            });

        legend.append('b')
            .style('background-color', function(d) {
                return gopColorScale(d);
            });

        legend.append('label')
            .text(function(d) {
                return d;
            });
    }

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
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(tickValues)
        .tickFormat(function(d, i) {
            if (i == 0) {
                return d;
            }
            if (i == 1) {
                return 'Needed: ' + fmtComma(d);
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    // right-align instead of center-align the last one
    chartElement.selectAll('.tick text')
        .style('text-anchor', function(d,i) {
            if (i == 0) {
                return 'begin';
            }
            if (i == 1) {
                return 'end';
            }
        })
        .attr('dx', function(d,i) {
            if (i == 0) {
                return 2;
            }
            if (i == 1) {
                return 1;
            }
        });

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
     * Render bars to chart.
     */
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[labelColumn]);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }

                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .style('fill', function(d) {
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     /*
      * Render bar values.
      */
    group.append('g')
        .attr('class', 'value total')
        .append('text')
            .text(function(d) {
                var val = fmtComma(d['delegates_count']);
                if (d['d1'] > 0) {
                    val += ' (+' + d['d1'] + ') ';
                }
                return val;
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('x', function(d) {
                var val = +d['delegates_count'];
 				return xScale(val);
            })
            .attr('dx', valueGap)
            .attr('dy', function() {
                if (config['party'] == 'dem') {
                    return (barHeight / 2) - 8;
                } else {
                    return (barHeight / 2) + 4;
                }
            });

    if (config['party'] == 'dem') {
        group.append('g')
            .attr('class', 'value pledged')
            .append('text')
                .text(function(d) {
                    var val = fmtComma(d['pledged_delegates_count']) + ' pledged + ';
                    return val;
                })
                .attr('class', function(d) {
                    return classify(d[labelColumn]);
                })
                .attr('x', function(d) {
                    var val = +d['delegates_count'];
     				return xScale(val);
                })
                .attr('dx', valueGap)
                .attr('dy', (barHeight / 2) + 5);

        group.append('g')
            .attr('class', 'value super')
            .append('text')
                .text(function(d) {
                    var val = fmtComma(d['superdelegates_count']) + ' super';
                    return val;
                })
                .attr('class', function(d) {
                    return classify(d[labelColumn]);
                })
                .attr('x', function(d) {
                    var val = +d['delegates_count'];
     				return xScale(val);
                })
                .attr('dx', valueGap)
                .attr('dy', (barHeight / 2) + 16);
    }

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
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
     * Render the legend.
     */
    if (config['party'] == 'dem' && !isMobile) {
        var legend = containerElement.append('ul')
    		.attr('class', 'key')
            .attr('style', 'margin-left: ' + margins['left'] + 'px;')
    		.selectAll('li')
    			.data(colorScale.domain())
    		.enter().append('li')
    			.attr('class', function(d, i) {
    				return 'key-item key-' + i + ' ' + classify(d);
    			});

        legend.append('b')
            .style('background-color', function(d) {
                return demColorScale(d);
            });

        legend.append('b')
            .style('background-color', function(d) {
                return gopColorScale(d);
            });

        legend.append('label')
            .text(function(d) {
                return d;
            });
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

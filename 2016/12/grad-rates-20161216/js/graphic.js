// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var calloutStates = [ 'united-states', 'alabama' ];

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
        d['date'] = d3.time.format('%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': DATA.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column],
                    'key': classify(column)
                };
    // filter out empty data. uncomment this if you have inconsistent data.
            }).filter(function(d) {
               return d['amt'] != null;
            })
        });
    }
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
    renderLineChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 150,
        bottom: 20,
        left: 30
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        margins['right'] = 90;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return d3.max(d['values'], function(v) {
            return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

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

    var tooltip = chartWrapper.append('div')
        .attr('class', 'tooltip inactive')
        .attr('style', function(d) {
            var s = '';
            s += 'width: 100px;'
            s += 'position: absolute; ';
            s += 'right: 0; ';
            return s;
        });

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            var yr = fmtYearFull(d);
            return YEAR_LABELS[yr];
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (d > 0) {
                return '+' + d;
            } else {
                return d;
            }
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
        .call(yAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    var voronoi = d3.geom.voronoi()
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return xScale(d[valueColumn]);
        })
        .clipExtent([ [ 0, 0 ], [ chartWidth, chartHeight ] ]);

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate('linear')
        .defined(function(d) {
            return d[valueColumn] != null;
        })
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    var annotations = chartWrapper.append('div')
        .attr('class', 'annotations');

    _.each(calloutStates, function(d,i) {
        var stateData = _.find(config['data'], function(v,k) {
            var classifiedName = classify(v['name']);
            return classifiedName == d;
        })
        var last = stateData['values'][stateData['values'].length - 1];
        var lastValue = last[valueColumn];
        var firstYear = YEAR_LABELS[fmtYearFull(stateData['values'][0][dateColumn])];

        // move highlight lines to the front
        chartElement.select('path.' + d).moveToFront();

        // then add annotations
        annotations.append('div')
            .attr('class', d)
            .attr('style', function() {
                var s = '';
                s += 'width: ' + (margins['right'] - 10) + 'px; ';
                s += 'position: absolute; ';
                s += 'top: ' + (yScale(lastValue) - 5) + 'px; ';
                s += 'right: 0; ';
                return s;
            })
            .html(function() {
                var txt = '';
                if (stateData['name'] == 'United States') {
                    txt += '<strong class="state">Nationally</strong>, ';
                } else {
                    txt += 'In <strong class="state">' + stateData['name'] + '</strong>, ';
                }
                txt += 'the graduation rate has ';
                if (lastValue > 0) {
                    txt += 'risen by <strong class="change">' + lastValue.toFixed(1) + ' points</strong> ';
                } else if (lastValue == 0) {
                    txt += 'stayed the same ';
                } else if (lastValue < 0) {
                    txt += 'fallen by <strong class="change">' + lastValue.toFixed(1) + ' points</strong> ';
                }
                txt += 'since the ' + firstYear + ' school&nbsp;year.'
                return txt;
            });
    });

    // zero line
    chartElement.append('line')
        .attr('class', 'zero-line')
        .attr('x1', xScale(xScale.domain()[0]))
        .attr('x2', xScale(xScale.domain()[1]))
        .attr('y1', yScale(0))
        .attr('y2', yScale(0))

    // voronoi for better mouseover targets
    // references:
    // https://github.com/nprapps/graphics-archive/blob/master/2014/12/nursing-home-rx/js/graphic.js#L548-L574
    // https://bl.ocks.org/mbostock/8033015
    // https://bl.ocks.org/mbostock/8027835
    // http://www.visualcinnamon.com/2015/07/voronoi.html
    if (!isMobile) {
        var onLineMouseover = function(v, k) {
            var thisLine = chartElement.select('.line.' + v['key']);
            var thisLineData = thisLine.data()[0];
            var lastData = thisLineData['values'][ thisLineData['values'].length - 1 ];
            var lastValue = lastData['amt'];
            var lastDate = lastData['date'];
            var firstYearLabel = YEAR_LABELS[fmtYearFull(thisLineData['values'][0]['date'])];
            var lastValueLabel = lastValue + '&nbsp;points';
            if (lastValue > 0) {
                lastValueLabel = '+' + lastValueLabel;
            }

            chartElement.select('.line.' + classify(v['key'])).classed('active', true).moveToFront();
            tooltip.classed('inactive', false)
                .html('<strong>' + thisLineData['name'] + ':</strong> ' + lastValueLabel + ' since ' + firstYearLabel)
                .attr('style', function() {
                    var s = '';
                    s += 'top: ' + (yScale(lastValue)) + 'px; ';
                    s += 'width: ' + (margins['right'] - 3) + 'px; ';
                    return s;
                });
        }
        var onLineMouseout = function(v, k) {
            chartElement.select('.line.' + classify(v['key'])).classed('active', false);
            tooltip.classed('inactive', true);

            // move highlight lines back to the front
            _.each(calloutStates, function(d,i) {
                chartElement.select('path.' + d).moveToFront();
            });
        }

        var voronoi = d3.geom.voronoi()
            .x(function(d) {
                return xScale(d[dateColumn]);
            })
            .y(function(d) {
                return yScale(d[valueColumn]);
            })
            .clipExtent([ [ 0, 0 ], [ chartWidth, chartHeight ] ]);

        // var voronoiDataOld = [];
        // _.each(config['data'], function(d,i) {
        //     voronoiDataOld = voronoiDataOld.concat(d['values']);
        // });
        var voronoiData = d3.nest()
            .key(function(d) {
                return xScale(d[dateColumn]) + ',' + yScale(d[valueColumn]);
            })
            .rollup(function(v) {
                // console.log(v);
                return v[0];
            })
            .entries(d3.merge(config['data'].map(function(d) {
                return d['values'];
            })))
            .map(function(d) {
                return d['values'];
            });
        var voronoiCellData = voronoi(voronoiData);

        var voronoiGroup = chartElement.append('g')
            .attr('class', 'voronoi')
            .selectAll('path')
            .data(voronoiCellData)
            .enter().append('path')
                .attr('d', function(d, i) {
                    return 'M' + d.join('L') + 'Z';
                })
                .datum(function(d, i) {
                    return d['point'];
                })
                .attr('class', function(d,i) {
                    return 'voronoi ' + d['key'];
                })
                // .style('stroke', '#2074A0')
                .style('fill', 'none')
            	.style('pointer-events', 'all')
                .on('mouseover', onLineMouseover)
                .on('mouseout', onLineMouseout);
    }
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

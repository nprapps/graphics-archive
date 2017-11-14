// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var projected = [
    { 'begin': '2016', 'end': '2030' }
];

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

    projected.forEach(function(d) {
        d['begin'] = d3.time.format('%Y').parse(d['begin']);
        d['end'] = d3.time.format('%Y').parse(d['end']);
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
                    'amt': d[column]
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
        data: dataSeries,
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
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 15,
        right: 130,
        bottom: 20,
        left: 90
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 2000000;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 6;
        margins['right'] = 30;
        margins['left'] = 30;
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

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range(['#666', COLORS['teal3'], COLORS['red3']]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
        .data(config['data'])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item ' + classify(d['name']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['name']);
        });

    legend.append('label')
        .text(function(d) {
            return d['name'];
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

    /* Textures */

    var textureProjected = textures.lines()
        .size(4)
        .strokeWidth(1)
        .stroke('#DDD');

    chartWrapper.select('svg')
        .call(textureProjected);


    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (isMobile) {
                if (d == 0) {
                    return d;
                } else {
                    return (d / 1000000) + 'M';
                }
            } else {
                if (d == 0){
                    return d;
                }
                else{
                    return d/(1000000) + ' million';
                }
            }
        });

    var projectedYears = chartElement.append('g')
        .attr('class', 'projected')
        .selectAll('rect')
        .data(projected)
        .enter()
            .append('rect')
                .attr('x', function(d) {
                    return xScale(d['begin']);
                })
                .attr('width', function(d) {
                    return xScale(d['end']) - xScale(d['begin']);
                })
                .attr('y', 0)
                .attr('height', chartHeight)
                .attr('fill', textureProjected.url());

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
     * Render y axis label to chart
     */
    if (!isMobile) {
        chartElement.append('text')
            .text(config['labels']['yLabel'])
            .data(config['data'])
            .attr('class', 'y-label')
            .attr('x', - (chartHeight / 2))
            .attr('y', 20 - margins['left'])
            .attr('transform', 'rotate(-90)');
    }

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

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
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .interpolate('monotone')
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
            .attr('stroke', function(d) {
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    chartElement.select('.line.current-effort').moveToFront();

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];
                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                if (isMobile){
                    switch (d['name']) {
                        case 'Increased effort':
                            return yScale(last[valueColumn]) + 9;
                            break;
                        default:
                            return yScale(last[valueColumn]) + 3;
                    }
                } else {
                    switch (d['name']) {
                        case 'Current effort':
                            return yScale(last[valueColumn]) + 3;
                            // return yScale(last[valueColumn]) - 6;
                            break;
                        case 'Increased effort':
                            return yScale(last[valueColumn]) + 9;
                            break;
                        default:
                            return yScale(last[valueColumn]) + 3;
                    }
                }
            })
            .attr('class', function(d,i) {
                return 'label-text ' + classify(d['name']);
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];
                var abbrNum = (last[valueColumn] / 1000000).toFixed(1) + 'M';

                if (!isMobile) {
                    abbrNum = d['name'] + ': ' + abbrNum;
                }

                return abbrNum;
            })
            .call(wrapText, 165, 13);

        var projectedLabel = chartElement.append('text')
            .data(projected)
            .text('Projected')
            .attr('class', 'projectedLabel')
            .attr('x', function(d){
                return (xScale(d['begin']) + xScale(d['end'])) / 2;
            })
            .attr('y', function(d) {
                return 15;
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

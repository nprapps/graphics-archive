// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var charts = [];

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
    charts = d3.keys(DATA);

    charts.forEach(function(v,k) {
        DATA[v].forEach(function(d) {
            d['age'] = +d['age'];

            for (var key in d) {
                if (key != 'age' && d[key] != null && d[key].length > 0) {
                    d[key] = +d[key];
                }
            }
        });

        dataSeries[v] = [];

        /*
         * Restructure tabular data for easier charting.
         */
        for (var column in DATA[v][0]) {
            if (column == 'age') {
                continue;
            }

            dataSeries[v].push({
                'name': column,
                'values': DATA[v].map(function(d) {
                    return {
                        'age': d['age'],
                        'amt': d[column]
                    };
        // filter out empty data. uncomment this if you have inconsistent data.
        //        }).filter(function(d) {
        //            return d['amt'] != null;
                })
            });
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

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - (gutterWidth * (charts.length - 1))) / charts.length);
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    charts.forEach(function(v,k) {
        var units = null;
        switch(v) {
            case 'wages':
                units = 'dollars';
                break;
            case 'gap':
                units = 'percent';
                break;
        }

        var chartContainer = containerElement.append('div')
            .attr('class', 'chart ' + classify(v));

        if (!isMobile) {
            chartContainer.attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'float: left; ';
                if (k > 0) {
                    s += 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            })
        }

        // Render the chart!
        renderLineChart({
            container: '.chart.' + classify(v),
            width: graphicWidth,
            data: dataSeries[v],
            units: units,
            title: LABELS['hed_' + v],
            id: v
        });
    });

    // Upage iframe
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

    // console.log(config['data']);

    var ageColumn = 'age';
    var valueColumn = 'amt';

    var aspectWidth = 16;
    var aspectHeight = 9;
    // var aspectWidth = isMobile ? 4 : 16;
    // var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 105,
        bottom: 33,
        left: 55
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = null;
    if (config['id'] == 'wages'){
        roundTicksFactor = 20000;
    } else {
        roundTicksFactor = 10;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right']-10;
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    // title
    containerElement.append('h3')
        .text(config['title']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.linear()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['age'];
        }))
        .range([ 0, chartWidth ]);
    xScale.domain([ 20, 59 ]);

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
        .range([ COLORS['blue4'], COLORS['orange4'] ]);

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
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            switch(config['units']) {
                case 'dollars':
                    if (d > 0){
                        return '$' + d3.format(",")(d);
                    }
                    else{
                        return d
                    }
                    break;
                case 'percent':
                    if (d > 0){
                    return d + '%';
                    }
                    else{
                        return d
                    }
                    break;
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

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );
/*
    chartElement.append("text")
    .attr('class','value')
    .attr("text-anchor", "middle")
    .attr("transform", "translate("+ (chartWidth/20) +","+(chartHeight+(30))+")")
    .text("Age");
*/


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
        // .interpolate('monotone')
        .x(function(d) {
            return xScale(d[ageColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    /*
     * Render area to chart.
     */
    var area = d3.svg.area()
        .x(function(d) {
            return xScale(d[ageColumn]);
        })
        .y0(function(d) {
            if (config['id'] == 'wages') {
                return yScale(d['Men']);

            } else {
                return yScale(d['Men:']);
            }
        })
        .y1(function(d) {
            if (config['id'] == 'wages') {
                return yScale(d['Women']);

            } else {
                return yScale(d['Women:']);
            }
        });
/*
     var areaAboveLine = d3.svg.area()
        .x(function(d) {
            return xScale(d[ageColumn]);
        })
        .y0(function(d) {
            if (config['id'] == 'wages') {
                return yScale(d['Men']);

            } else {
                return yScale(d['Men:']);
            }
        })
        .y1(0);


     var areaBelowLine = d3.svg.area()
        .x(function(d) {
            return xScale(d[ageColumn]);
        })
        .y0(function(d) {
            if (config['id'] == 'wages') {
                return yScale(d['Men']);

            } else {
                return yScale(d['Men:']);
            }
        })
        .y1(chartHeight);



    chartElement.append('path')
        .datum(DATA[config['id']])
        .attr('class', 'area2')
        .attr('d', areaAboveLine);

*/

    chartElement.append('path')
        .datum(DATA[config['id']])
        .attr('class', 'area')
        .attr('d', area);

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

    var dots = chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('g')
        .data(config['data'])
        .enter().append('g')
            .attr('class', function(d, i) {
                return classify(d['name']);
            });
/*
    dots.selectAll('circle')
        .data(function(d,i) {
            return d['values'];
        })
        .enter().append('circle')
            .attr('cx', function(d,i) {
                return xScale(d[ageColumn]);
            })r
            .attr('cy', function(d,i) {
                return yScale(d[valueColumn]);
            })
            .attr('r', 4)
            .attr('fill', function(d) {
                var c = d3.select(this.parentElement)[0][0]['__data__']['name'];
                return colorScale(c);
            });
                commented out to remove dots

*/

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[ageColumn]) + 10;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];
                var label = '';



                switch(config['units']) {
                    case 'dollars':
                         if (config['data'].length > 1) {
                        label += d['name'] + ': ';
                        }
                        label += '$' + d3.format(",")(value.toFixed(0));
                        break;
                    case 'percent':
                         if (config['data'].length > 1) {
                        label += d['name'] + ' ';
                        }
                        label += value.toFixed(1) + '%';
                        break;
                    default:
                        label += value.toFixed(1);
                        break;
                }

                return label;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

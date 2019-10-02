// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var charts = [];

// source: http://www.nber.org/cycles.html
var recession_dates = [
    { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
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
    charts = d3.keys(DATA);

    charts.forEach(function(v,k) {
        var cData = DATA[v];

        cData.forEach(function(d){
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

    dataSeries[v] = [];
    for (var column in cData[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries[v].push({
            'name': column,
            'values': cData.map(function(d) {
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
});
        recession_dates.forEach(function(d) {
        d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
        d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
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

    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    var xDomain = d3.extent(dataSeries['amt'][0]['values'], function(d) {
        return d['date'];
    });

    charts.forEach(function(v,k) {
        var chartId = 'chart-' + classify(v);

        var roundTicksFactor = null;
        var units = null;
        switch(v) {
            case 'amt':
                roundTicksFactor = 50;
                units = null;
                break;
            case 'pct':
                roundTicksFactor = 100;
                units = 'pct';
                break;
        }

        var chartElement = containerElement.append('div')
            .attr('class', 'chart')
            .attr('id', chartId);

        if (!isMobile) {
            chartElement.attr('style', function(){
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
        renderLineChart({
            container: '#' + chartId,
            width: graphicWidth,
            data: dataSeries[v],
            roundTicksFactor: roundTicksFactor,
            title: LABELS['hed_' + v],
            xDomain: xDomain,
            units: units
        });
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

    var aspectWidth = isMobile ? 12 : 4;
    var aspectHeight = isMobile ? 6 : 3;

    var margins = {
        top: 10,
        right: 30,
        bottom: 20,
        left: 37
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = config['roundTicksFactor'];
    var units = '';
    //if (config['units'] == 'pct') {
      //  units = '%';
    //}

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 30;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h2')
        .text(config['title']);

    /*
     * Create D3 scale objects.
     */
     var xScale = d3.time.scale()
         .domain(config['xDomain'])
         .range([ 0, chartWidth ])

     var min = d3.min(config['data'], function(d) {
         return d3.min(d['values'], function(v) {
             return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
         })
     });

     var min = -.3;
     var max = .6;

     /*if (min > 0) {
         min = 0;
     }


     var max = d3.max(config['data'], function(d) {
         return d3.max(d['values'], function(v) {
             return Math.ceil(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
         })
     });
*/
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

    // colorScale
    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['orange3']]);

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
        .tickFormat(function(d){
            return fmtComma(d) + units;
        });


        // recession bars
    var recession = chartElement.append('g')
        .attr('class', 'recession')
        .selectAll('rect')
        .data(recession_dates)
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
                .attr('fill', '#ebebeb');

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
    //    .interpolate('monotone')
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

    chartElement.append('g')
        .attr('class', 'value value-end')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 2;
            })
            .attr('y', function(d, i) {
                // var otherI = 0;
                // if (i == 0) {
                //     otherI = 1;
                // }

                var last = d['values'].length - 1;
                var thisLastValue = config['data'][i]['values'][last][valueColumn];
                // var otherLastValue = config['data'][otherI]['values'][last][valueColumn];
                var offset = -6;
                // if (thisLastValue < otherLastValue) {
                //     offset = 12;
                // }

                return yScale(thisLastValue) + offset;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = fmtComma(last[valueColumn].toFixed(0)) + units;
                return "";
                //return label;
            });

  /*  chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
            .data(config['data'])
                .enter()
        .append('circle')
            .attr('cx', function(d, i) {
                var last = d['values'][0];

                return xScale(last[dateColumn]);
            })
            .attr('cy', function(d) {
                var last = d['values'][0];

                return yScale(last[valueColumn]);
            })
            .attr('r', 3)
            .attr('fill', function(d) {
                return colorScale(d['name']);
            });*/

   /* chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
            .data(config['data'])
                .enter()
        .append('circle')
            .attr('cx', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]);
            })
            .attr('cy', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]);
            })
            .attr('r', 3)
            .attr('fill', function(d) {
                return colorScale(d['name']);
            });*/
 // recession label
    chartElement.append('text')
        .classed('chart-label', true)
        .attr('x', function(){
            var dates = recession_dates[1];
            if (isMobile) {
                dates = recession_dates[1];
            }
            return xScale(dates['begin']) + ((xScale(dates['end']) - xScale(dates['begin'])) / 2);
        })
        .attr('y', 15)
        .text('Recession');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

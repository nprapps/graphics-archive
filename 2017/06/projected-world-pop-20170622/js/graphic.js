// Global vars
var pymChild = null;
var isMobile = false;
var africaDataSeries = [];
var asiaDataSeries = [];
var europeDataSeries = [];
var latinamDataSeries = [];
var northamDataSeries = [];
var oceaniaDataSeries = [];

var projected_dates = [
    { 'begin': '2018', 'end': '2100' }
]

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData(AFRICA_DATA, africaDataSeries);
        formatData(ASIA_DATA, asiaDataSeries);
        formatData(EUROPE_DATA, europeDataSeries);
        formatData(LATINAM_DATA, latinamDataSeries);
        formatData(NORTHAM_DATA, northamDataSeries);
        formatData(OCEANIA_DATA, oceaniaDataSeries);
        formatProjData();

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
var formatData = function(data, dataSeries) {
    data.forEach(function(d) {
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
    for (var column in data[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': data.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
            })
        });
    }
}

var formatProjData = function() {
    projected_dates.forEach(function(d) {
        d['begin'] = d3.time.format('%Y').parse(d['begin']);
        d['end'] = d3.time.format('%Y').parse(d['end']);
    })
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    var continents = ['africa', 'asia', 'europe', 'latinam', 'northam', 'oceania'];

    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;
    var numCols = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        numCols = 2;
    } else {
        isMobile = false;
        numCols = 3;
    }
    graphicWidth = Math.floor((containerWidth - (gutterWidth * (numCols - 1))) / numCols);

    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    var charts = [ 'africa', 'asia', 'europe', 'latinam', 'northam', 'oceania' ];
    charts.forEach(function(d,i) {
        var thisData = eval(d + 'DataSeries');
        var thisHed = '';
        switch(d) {
            case 'africa':
                thisHed = 'Africa';
                break;
            case 'asia':
                thisHed = 'Asia';
                break;
            case 'europe':
                thisHed = 'Europe';
                break;
            case 'latinam':
                thisHed = 'Latin America and the Caribbean';
                break;
            case 'northam':
                thisHed = 'North America';
                break;
            case 'oceania':
                thisHed = 'Oceania';
                break;
        }

        var thisChart = containerElement.append('div')
            .attr('class', 'chart')
            .attr('id', d + '-chart')
            .attr('style', 'width: ' + graphicWidth + 'px;');
        thisChart.attr('style', function() {
            var s = '';
            s += 'width: ' + graphicWidth + 'px;';
            if (i % numCols > 0) {
                s += 'margin-left: ' + gutterWidth + 'px;';
            }
            return s;
        });

        renderLineChart({
            container: '#' + d + '-chart',
            width: graphicWidth,
            data: thisData,
            chartHead: thisHed
        });
    })

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

    var aspectWidth = isMobile ? 1 : 4;
    var aspectHeight = isMobile ? 1 : 3;

    // var aspectWidth = 4;
    // var aspectHeight = 3;

    var margins = {
        top: 24,
        right: 40,
        bottom: 20,
        left: 25
    };

    var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['chartHead']);

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

    var max = 5000000;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

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
            if (d === 0) {
                return '';
            } else {
                return (d / 1000000) + 'B';
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

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
var projected = chartElement.append('g')
    .attr('class', 'projected')
    .selectAll('rect')
    .data(projected_dates)
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
                return COLORS['teal3'];
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

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

                return yScale(last[valueColumn]) + 3;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var formatComma = d3.format(",");
                var label = formatComma((last[valueColumn] / 1000000).toFixed(2) ) + 'B';

                // if (!isMobile) {
                //     label = d['name'] + ': ' + label;
                // }

                return label;
            });

    chartElement.append('text')
        .classed('chart-label', true)
        .attr('x', function(){
            var dates = projected_dates[0];
            if (isMobile) {
                return xScale(dates['begin']) + ((xScale(dates['end']) - xScale(dates['begin'])) / 4);
            } else {
                return xScale(dates['begin']) + ((xScale(dates['end']) - xScale(dates['begin'])) / 2.5);
            }
        })
        .attr('y', function() {
            switch (config['chartHead']) {
                case 'Asia':
                    return -15;
                    break;
                default:
                    return -5;
            }
        })
        .text('Projected');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

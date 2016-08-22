// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var spiralPeriods = [
    { 'start': d3.time.format('%m/%d/%Y').parse('7/15/2002'),
      'end': d3.time.format('%m/%d/%Y').parse('10/28/2003') },
    { 'start': d3.time.format('%m/%d/%Y').parse('6/3/2005'),
      'end': d3.time.format('%m/%d/%Y').parse('2/27/2006') },
    { 'start': d3.time.format('%m/%d/%Y').parse('3/20/2006'),
      'end': d3.time.format('%m/%d/%Y').parse('10/29/2014') },
    { 'start': d3.time.format('%m/%d/%Y').parse('11/26/2014'),
      'end': d3.time.format('%m/%d/%Y').parse('2/3/2016') }
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
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
    });

    dataSeries['stops'] = DATA.filter(function(d) {
        return _.contains([ 'Traffic stop', 'Parking ticket' ], d['type']);
    });

    dataSeries['fines'] = DATA.filter(function(d) {
        if (d['fine'] != null) {
            d['fine'] = d['fine'].substr(1);
            d['fine'] = +d['fine'];
            return d;
        }
        // return d['fine'] != null;
    });

    dataSeries['warrants'] = DATA.filter(function(d) {
        return _.contains([ 'Warrant issued' ], d['violation']);
    });

    dataSeries['license'] = DATA.filter(function(d) {
        return _.contains([ 'License suspended', 'License reinstated' ], d['license']);
    });

    dataSeries['resolved'] = DATA.filter(function(d) {
        if (_.contains([ 'Case resolved', 'Multiple cases resolved' ], d['cleared'])) {
            d['cleared_count'] = +d['cleared_count'];
            return d;
        }
        // return _.contains([ 'Case resolved', 'Multiple cases resolved' ], d['cleared']);
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
    var containerElement = d3.select('#timeline');
    containerElement.html('');

    d3.keys(dataSeries).forEach(function(d, i) {
        var chartTitle = null;
        var colorRange = null;
        var legendKeys = null;
        var legendColumn = null;
        switch(d) {
            case 'stops':
                chartTitle = 'Traffic stops and parking tickets';
                legendKeys = [ 'Traffic stop', 'Parking ticket' ];
                legendColumn = 'type';
                colorRange = [ COLORS['blue2'], COLORS['orange4'] ];
                break;
            case 'fines':
                chartTitle = 'Fines assessed';
                legendKeys = [ 'Fine assessed' ];
                legendColumn = 'fine';
                colorRange = [ COLORS['teal3'] ];
                break;
            case 'warrants':
                chartTitle = 'Warrants Issued';
                legendKeys = [ 'Warrant issued' ];
                legendColumn = 'violation';
                colorRange = [ COLORS['blue2'] ];
                break;
            case 'license':
                chartTitle = 'Driver\'s License';
                legendKeys = [ 'License suspended', 'License reinstated' ];
                legendColumn = 'license';
                colorRange = [ COLORS['blue3'], COLORS['yellow3'] ];
                break;
            case 'resolved':
                chartTitle = 'Cases resolved';
                legendKeys = [ 'Case resolved' ];
                legendColumn = 'cleared';
                colorRange = [ COLORS['yellow3'] ];
                break;
        }

        var chart = containerElement.append('div')
            .attr('class', 'chart ' + classify(d));

        renderTimeline({
            container: '#timeline .chart.' + classify(d),
            width: containerWidth,
            data: dataSeries[d],
            legendKeys: legendKeys,
            legendColumn: legendColumn,
            colorRange: colorRange,
            chartTitle: chartTitle,
            chart: d
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
var renderTimeline = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var legendColumn = config['legendColumn'];
    var legendKeys = config['legendKeys'];

    var barHeight = 35;

    var margins = {
        top: 0,
        right: 5,
        bottom: 20,
        left: 15
    };

    var ticksX = 20;

    if (isMobile) {
        margins['left'] = 8;
        margins['right'] = 5;
        ticksX = 10;
        barHeight = 20;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = barHeight;



    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    var headerElement = containerElement.append('div')
        .attr('class', 'header');
    headerElement.append('h3')
        .text(config['chartTitle']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain([
            d3.time.format('%Y').parse('2002'),
            d3.time.format('%m/%d/%Y').parse('7/31/2016')
        ])
        .range([ 0, chartWidth ])

    var colorScale = d3.scale.ordinal()
        .domain(legendKeys)
        .range(config['colorRange']);

    /*
     * Render the HTML legend.
     */
    if (legendKeys.length > 1) {
        var legend = headerElement.append('ul')
            .attr('class', 'key')
            .selectAll('g')
            .data(colorScale.domain())
            .enter().append('li')
                .attr('class', function(d, i) {
                    return 'key-item ' + classify(d);
                });

        legend.append('b')
            .style('background-color', function(d) {
                return colorScale(d);
            });

        legend.append('label')
            .text(function(d) {
                if (config['chart'] == 'license') {
                    var label = d.split(' ');
                    return label[1].charAt(0).toUpperCase() + label[1].slice(1);;
                    // via http://stackoverflow.com/questions/1026069/capitalize-the-first-letter-of-string-in-javascript
                } else {
                    return d;
                }
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
        .ticks(ticksX)
        .tickFormat(function(d, i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    // highlight spiral periods
    chartElement.append('g')
        .attr('class', 'spirals')
        .selectAll('rect')
        .data(spiralPeriods)
        .enter().append('rect')
            .attr('x', function(d) {
                return xScale(d['start']);
            })
            .attr('width', function(d) {
                return xScale(d['end']) - xScale(d['start']);
            })
            .attr('y', 0)
            .attr('height', chartHeight);

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
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    if (config['chart'] == 'fines' || config['chart'] == 'resolved') {
        var radiusDomain = null;
        switch(config['chart']) {
            case 'fines':
                radiusDomain = 1000;
                break;
            case 'resolved':
                radiusDomain = 20;
                break;
        }
        var radius = d3.scale.sqrt()
            .domain([ 0, radiusDomain ])
            // .range([0, 25 * scaleFactor]);
            .range([ 0, (chartHeight / 2) ]);

        var events = chartElement.append('g')
            .attr('class', 'events ' + classify(config['chart']))
            .selectAll('circle')
            .data(config['data'])
            .enter()
                .append('circle')
                    .attr('cx', function(d) {
                        return xScale(d[dateColumn]);
                    })
                    .attr('cy', (chartHeight / 2))
                    .attr('r', function(d) {
                        switch(config['chart']) {
                            case 'fines':
                                return radius(d['fine']);
                                break;
                            case 'resolved':
                                return radius(d['cleared_count']);
                                break;
                        }
                    });
    } else {
        chartElement.append('g')
            .attr('class', 'events')
            .selectAll('line')
            .data(config['data'])
            .enter().append('line')
                .attr('x1', function(d) {
                    return xScale(d[dateColumn]);
                })
                .attr('x2', function(d) {
                    return xScale(d[dateColumn]);
                })
                .attr('y1', 0)
                .attr('y2', chartHeight)
                .attr('class', function(d) {
                    return classify(d[legendColumn]);
                })
                .attr('stroke', function(d) {
                    return colorScale(d[legendColumn]);
                });
    }

    // if (config['chart'] == 'stops') {
    //     var annotations = chartElement.append('g')
    //         .attr('class', 'annotations');
    //     annotations.append('text')
    //         .text('9 stops in 16 mos.')
    //         .attr('x', (xScale(spiralPeriods[0]['start']) + (xScale(spiralPeriods[0]['end']) - xScale(spiralPeriods[0]['start']))/2 ))
    //         .attr('y', -10);
    //     annotations.append('text')
    //         .text('9 stops in 9 mos.')
    //         .attr('x', (xScale(spiralPeriods[1]['start']) + (xScale(spiralPeriods[1]['end']) - xScale(spiralPeriods[1]['start']))/2 ))
    //         .attr('y', -10);
    //     annotations.append('text')
    //         .text('9 stops in 9 yrs., 8 mos.')
    //         .attr('x', (xScale(spiralPeriods[2]['start']) + (xScale(spiralPeriods[2]['end']) - xScale(spiralPeriods[2]['start']))/2 ))
    //         .attr('y', -10);
    //     annotations.append('text')
    //         .text('9 stops in 16 mos.')
    //         .attr('x', (xScale(spiralPeriods[3]['start']) + (xScale(spiralPeriods[3]['end']) - xScale(spiralPeriods[3]['start']))/2 ))
    //         .attr('y', -10);
    //
    //     if (isMobile) {
    //         annotations.selectAll('text')
    //             .attr('y', -30)
    //             .call(wrapText, 50, 11);
    //     }
    // }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

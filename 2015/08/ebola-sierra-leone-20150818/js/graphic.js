// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var annotationData = [];

// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtDateFull = d3.time.format('%b %d, %Y');
var fmtMonthYearFull = d3.time.format('%B %Y');
var fmtYearFull = d3.time.format('%Y');

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = data;

        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d) {
        d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
        
        if (d['annotate'] == 'True') {
            annotationData.push( { 'date': d['date'], 'amt': d['amt'] });
        }

        delete d['week'];
        delete d['annotate'];

        for (var key in d) {
            if (key != 'date' && key != 'annotate') {
                d[key] = +d[key];
            }
        }
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#graphic',
        width: containerWidth,
        data: graphicData
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
        top: 8,
        right: 70,
        bottom: 30,
        left: 30
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 100;
    var dotRadius = 4;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['top'] = 30;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var formattedData = {};

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in graphicData[0]) {
        if (column == dateColumn) {
            continue;
        }

        formattedData[column] = graphicData.map(function(d) {
            return {
                'date': d[dateColumn],
                'amt': d[column]
            };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'], function(d) {
            return d[dateColumn];
        }))
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ 0, d3.max(d3.entries(formattedData), function(c) {
                return d3.max(c['value'], function(v) {
                    var n = v[valueColumn];
                    return Math.ceil(n / roundTicksFactor) * roundTicksFactor;
                });
            })
        ])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(key) {
            return key !== dateColumn;
        }))
        .range([ COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

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
            return fmtMonthYearFull(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);
    chartElement.selectAll('.x.axis text')
        .call(wrapText, 55, 20);

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
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

    var annotations = chartElement.append('g')
        .attr('class', 'annotations')
        .selectAll('g')
            .data(annotationData)
        .enter().append('g')
            .attr('class', function(d, i) {
                return 'annotation-' + i;
            });
    
    annotations.append('circle')
        .attr('cx', function(d) {
            return xScale(d['date']);
        })
        .attr('cy',function(d) {
            return yScale(d['amt']);
        })
        .attr('r', dotRadius)
        .attr('fill', COLORS['red3']);

    var annotationText = annotations.append('text')
        .attr('x', function(d) {
            return xScale(d['date']);
        })
        .attr('y',function(d) {
            return yScale(d['amt']) - 37;
        })
        .attr('dx', 0)
        .attr('dy', 0)
        .text(function(d) {
            var val = 'Week of/' + abbrevDates(d['date']) + '/' + d['amt'];
            if (d['amt'] == 1) {
                val += ' case';
            } else {
                val += ' cases';
            }
            return val;
        })
        .call(wrapText, 60, 14, true);
}


/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight, annot) {
    texts.each(function() {
        var text = d3.select(this);
        if (annot) {
            var words = text.text().split('/').reverse();
        } else {
            var words = text.text().split(/\s+/).reverse();
        }

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        if (dx == null || isNaN(dx)) {
            dx = 0;
        }
        
        var dy = parseFloat(text.attr('dy'));
        if (text.attr('dy') == '.71em') {
            dy = 8;
        } else if (dy == null || isNaN(dy)) {
            dy = 0;
        }

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}

var abbrevDates = function(d) {
    var fmtMM = d3.time.format('%B')
    var fmtDD = d3.time.format('%d')
    var fmtYY = d3.time.format('%Y')
    
    var val;
    switch(fmtMM(d)) {
        case 'January':
            val = 'Jan.'
            break;
        case 'February':
            val = 'Feb.'
            break;
        case 'August':
            val = 'Aug.'
            break;
        case 'September':
            val = 'Sept.'
            break;
        case 'October':
            val = 'Oct.'
            break;
        case 'November':
            val = 'Nov.'
            break;
        case 'December':
            val = 'Dec.'
            break;
        default:
            val = fmtMM(d);
            break;
    }
    
    val += ' ' + parseInt(fmtDD(d));
    val += ', ' + fmtYY(d);
    
    return val;
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

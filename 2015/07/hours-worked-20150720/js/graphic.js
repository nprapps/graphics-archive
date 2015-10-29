// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var countryList = ['South Korea', 'United States', 'France', 'Germany']

// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var commaFormat = d3.format("0,000");

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

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
        d['date'] = d3.time.format('%Y').parse(d['date']);

        for (var key in d) {
            if (key != 'date') {
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
        top: 15,
        right: 155,
        bottom: 20,
        left: 25
    };
    
    var scaleMove = 10;

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 75;
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
                'amt': d[column]/52
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
        .domain([ 20, 60])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(key) {
            return key !== dateColumn;
        }))
        .range(["#ccc"]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(d3.entries(formattedData))
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['key']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['key']);
        });

    legend.append('label')
        .text(function(d) {
            return d['key'];
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
        .ticks(ticksY);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        // .attr('transform', makeTranslate(scaleMove, 0))
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
        .defined(function(d) { return d[valueColumn] != ''; })
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
                if (_.contains(countryList, String(d['key']))) {
                    return 'line selected-country ' + classify(d['key']);
                } else {
                    return 'line ' + classify(d['key']);
                } 
            })
            .attr('stroke', function(d) {
                return colorScale(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formattedData))
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['value'][d['value'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .attr('class', function(d, i) {
                if (_.contains(countryList, String(d['key']))) {
                    return 'text-label selected ' + i + ' ' + classify(d['key']);
                } else {
                    return 'text-label ' + i + ' ' + classify(d['key']);                    
                } 
            })            
            .text(function(d) {
                var last = d['value'][d['value'].length - 1];
                var value = last[valueColumn];

                var label = last[valueColumn].toFixed(0);

                if (!isMobile) {
                    label = d['key'] + ': ' + commaFormat(label) + ' hours';
                } else {
                    label = d['key']
                }

                return label;
            });

    var findFirst = function(data) {
        var value = _.find(data, function(num) { 
            return num['amt'] > 0;
        });
        return value;
    }
    
    if (!isMobile) {
        chartElement.append('g')
            .attr('class', 'value')
            .selectAll('first-text')
            .data(d3.entries(formattedData))
            .enter().append('text')
                .attr('x', function(d, i) {
                    var first = d['value'];
                    var firstValue = findFirst(first);
                    return xScale(firstValue['date']) - 5;
                })
                .attr('y', function(d) {
                    var first = d['value'];
                    var firstValue = findFirst(first);
                    return yScale(firstValue['amt']) + 3;
                })
                .attr('class', function(d, i) {
                    if (_.contains(countryList, String(d['key']))) {
                        return 'text-label selected ' + i + ' start ' + classify(d['key']);
                    } else {
                        return 'text-label ' + i + ' start ' + classify(d['key']);                    
                    } 
                })
                .attr('text-anchor', 'end')            
                .text(function(d) {
                    var first = d['value']
                    var firstValue = findFirst(first)
                    var value = firstValue['amt'];

                    var label = firstValue['amt'].toFixed(0);

                    if (!isMobile) {
                        label = d['key'] + ': ' + commaFormat(label) + ' hours';
                    } else { 
                        label = d['key']
                    }
                    return label;
                }).moveToFront;
        
    }
    chartElement.classed('initial-view', true);

    d3.selectAll('.selected-country').moveToFront();
    d3.select('.start.france')
        .attr('text-anchor', 'start')
        .attr('dx', 3)
        .attr('dy', -15)
        .moveToFront();
    d3.select('.start.sweden')
        .attr('text-anchor', 'start')
        .attr('dx', 3)
        .attr('dy', -12)
        .moveToFront();
    d3.selectAll('.start.united-states')
        .attr('text-anchor', 'start')
        .attr('dx', 3)
        .attr('dy', -15)
        .moveToFront();

    d3.select('#dropdown-country').on('change', onCountrySelected);
}


////////////////////////////////
// first dropdown
////////////////////////////////

var onCountrySelected = function() {
    var selectedValue = document.getElementById('dropdown-country').value;
    var selectedName = classify(selectedValue)

    d3.selectAll('.text-label').classed('selected', false)
    d3.selectAll('.line').classed('selected-country', false)
    d3.selectAll('.' + selectedName ).classed('selected', true)

    d3.select('.line' + '.' + selectedName )
        .classed('selected-country', true)
        .moveToFront();
        
    d3.select('.initial-view').classed('initial-view', false);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

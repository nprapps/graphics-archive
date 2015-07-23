// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = [];
var countryData = [];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData();
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function() {
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
    REGION_DATA.forEach(function(d) {
        if (d['lowest'] != null && d['highest'] != null) {
            d['pct_registered'] = +d['pct_registered'];
            d['lowest'] = +d['lowest'];
            d['highest'] = +d['highest'];
            graphicData.push(d);
        }
    });
    
    COUNTRY_DATA.forEach(function(d) {
        if (d['pct_registered'] != 'n/a' && d['flag'] != 'exclude' && d['region'] != null) {
            d['pct_registered'] = +d['pct_registered'];
            countryData.push(d);
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
    renderBarChart({
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
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'region';
    var valueColumn = 'pct_registered';

    var barHeight = 25;
    var barGap = 15;
    var labelWidth = 100;
    var labelMargin = 6;
    var valueMinWidth = 30;
    var dotRadiusRegion = 6;
    var dotRadiusCountry = 4;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key');
    
    var avg = legend.append('li')
        .attr('class', 'key-item key-0 regional-average');
    avg.append('b');
    avg.append('label')
        .text('Regional averages');

    var dev = legend.append('li')
        .attr('class', 'key-item key-2 least-developed');
    dev.append('b');
    dev.append('label')
        .html('Developing countries');

    var country = legend.append('li')
        .attr('class', 'key-item key-1 country');
    country.append('b');
    country.append('label')
        .text('Other countries');


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
     * Create D3 scale objects.
     */
    var xScale = d3.scale.linear()
        .domain([0, d3.max(config['data'], function(d) {
            return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d.toFixed(0) + '%';
        });

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
    };

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render range bars
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                return xScale(d['lowest']);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('width', function(d) {
                return xScale(d['highest'] - d['lowest']);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            });

    d3.selectAll('.bars rect')
        .attr('height', 11)
        .attr('y', function(d) {
            var newY = parseInt(d3.select(this).attr('y')) + ((barHeight - 10) / 2);
            console.log(newY);
            return newY;
        });

    /*
     * Render country dots
     */
    var countryDots = chartElement.append('g')
        .attr('class', 'countries')
        .selectAll('line')
            .data(countryData)
        .enter()
            .append('circle')
            .attr('class', function(d) {
                var c = classify(d['region']) + ' ' + classify(d['country']);
                if (d['least developed'] == 'True') {
                    c += ' least-developed';
                }
                return c;
            })
            .attr('cx', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('cy', function(d, i) {
                var groupBar = d3.select('.bars .' + classify(d['region']));
                return parseInt(groupBar.attr('y')) + (parseInt(groupBar.attr('height')) / 2);
            })
            .attr('r', dotRadiusCountry);

    /*
     * Render region dots
     */
    var regionDots = chartElement.append('g')
        .attr('class', 'regions')
        .selectAll('line')
            .data(config['data'].filter(function(d) {
                console.log(d);
                if (!isNaN(d['pct_registered'])) {
                    return d;
                }
            }))
        .enter()
            .append('circle')
            .attr('class', function(d) {
                return classify(d['region']);
            })
            .attr('cx', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('cy', function(d, i) {
                return i * (barHeight + barGap) + (barHeight / 2);
            })
            .attr('r', dotRadiusRegion);


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
     * Render region values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', function(d) {
                if (!isNaN(d[valueColumn])) {
                    return xScale(d[valueColumn]);
                } else {
                    return xScale(77);
                }
            })
            .attr('y', function(d, i) {
                return (i * (barHeight + barGap)) + barHeight;
            })
            .attr('dy', 6)
            .attr('text-anchor', 'middle')
            .attr('class', function(d) {
                var c = classify(d[labelColumn]);
                return c;
            })
            .text(function(d) {
                if (!isNaN(d[valueColumn])) {
                    return d[valueColumn].toFixed(0) + '%';
                } else {
                    return 'Average not available';
                }
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

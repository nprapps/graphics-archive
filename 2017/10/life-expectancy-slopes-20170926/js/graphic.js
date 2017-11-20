// Global config
var SIDEBAR_THRESHOLD = 280;

// Global vars
var pymChild = null;
var isMobile = false;
var isSidebar = false;
var charts = ['low','middle'];


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
        d['start'] = +d['start'];
        d['end'] = +d['end'];
        d['change'] = +d['change'];
        d['start_adj'] = +d['start_adj'];
        d['end_adj'] = +d['end_adj'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= TABLET_THRESHOLD) {
        isTablet = true;
    } else {
        isTablet = false;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (containerWidth <= SMALL_MOBILE_THRESHOLD) {
        isSmallMobile = true;
    } else {
        isSmallMobile = false;
    }

    if (containerWidth <= SIDEBAR_THRESHOLD) {
        isSidebar = true;
    } else {
        isSidebar = false;
    }

    // define container element and empty out existing contents
    var containerElement = d3.select('#chart-wrapper');
    containerElement.html('');

    // define graphic width
    var gutterWidth = 12;
    var graphicWidth = isTablet ?
        containerWidth :
        Math.floor((containerWidth - gutterWidth) / 2);

    var topCountries = DATA.filter(function(d, i) {
        return d['change'] > 5;
    });

    var importantCountries = DATA.filter(function(d, i) {
        return d['highlight'] === 'yes';
    });

    var chartFilter = {
        'low': function(d) {
            return d['sdi'] === 'Low';
        },
        'middle': function(d) {
            return d['sdi'] === 'Middle' || d['sdi'] === 'Low-middle';
        }
    };

    charts.forEach(function(slug) {
        var thisChart = 'chart-' + slug;
        var thisChartData = topCountries.filter(chartFilter[slug]);

        var thisChartHead = function() {
            if (slug === 'middle') {
                return 'Low-middle/Middle SDI';
            } else if (slug === 'low') {
                return 'Low SDI'
            } else {
                return slug;
            }
        }

        // Add a sub-container to hold each of our maps
        var chartElement = containerElement.append('div')
            .attr('id', thisChart)
            .attr('class', 'graphic');

        // Render the chart!
        renderSlopegraph({
            container: '#' + thisChart,
            width: graphicWidth,
            data: thisChartData,
            labels: LABELS,
            chartHead: thisChartHead
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
var renderSlopegraph = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var startColumn = 'start';
    var endColumn = 'end';

    var startLabel = config['labels']['start_label'];
    var endLabel = config['labels']['end_label'];

    var aspectWidth = 3;
    var aspectHeight = 3.5;

    var margins = {
        top: 20,
        right: 180,
        bottom: 20,
        left: 28
    };

    var ticksX = 2;
    var ticksY = 10;
    var roundTicksFactor = 4;
    var dotRadius = 3;
    var labelGap = 32;

    // Mobile
    if (isSidebar) {
        aspectWidth = 2;
        aspectHeight = 3;
        margins['left'] = 30;
        margins['right'] = 105;
        labelGap = 32;
    }  else if (isSmallMobile) {
        aspectWidth = 3;
        aspectHeight = 3.5;
        margins['right'] = 170;
    } else if (isMobile) {
        aspectWidth = 3;
        aspectHeight = 2.5;
        margins['right'] = 215;
    } else if (isTablet) {
        aspectWidth = 4;
        aspectHeight = 3;
        margins['right'] = 180;
    }

    // Calculate actual chart dimensions
    var chartWidth = (config['width'] - margins['left'] - margins['right']) > 200 ? 200 : (config['width'] - margins['left'] - margins['right']);
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3').text(config['chartHead']);

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain([startLabel, endLabel])
        .range([0, chartWidth])

    var min = d3.min(config['data'], function(d) {
        var rowMin = d3.min([d[startColumn], d[endColumn]]);
        return Math.floor(rowMin / roundTicksFactor) * roundTicksFactor;
    });

    var max = d3.max(config['data'], function(d) {
        var rowMax = d3.max([d[startColumn], d[endColumn]]);
        return Math.ceil(rowMax / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([50, 85])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .range([ '#999' ]);

    /*
     * Create D3 axes.
     */
    var xAxisTop = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
        });

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d;
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
     * Render axes to chart.
     */
     chartElement.append('g')
         .attr('class', 'x axis')
         .call(xAxisTop);

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render line background to chart
     */
    chartElement.append('rect')
        .attr('class', 'background')
        .data(config['data'])
        .attr('x', function(d) {
            return 0;
        })
        .attr('y', function(d) {
            return 0;
        })
        .attr('width', function(d) {
            return chartWidth;
        })
        .attr('height', function(d) {
            return chartHeight;
        })
        .attr('fill', '#ebebeb');

    /*
     * Render lines to chart.
     */
    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('line')
        .data(config['data'])
        .enter()
        .append('line')
            .attr('class', function(d, i) {
                return 'line ' + classify(d[labelColumn]);
            })
            .attr('x1', xScale(startLabel))
            .attr('y1', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('x2', xScale(endLabel))
            .attr('y2', function(d) {
                return yScale(d[endColumn]);
            })
            .style('stroke', function(d) {
                var color = "COLORS['" + d['color'] + "']"
                return eval(color);
            });

    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots start')
        .selectAll('circle')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('cx', xScale(startLabel))
            .attr('cy', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('class', function(d) {
                return 'line ' + classify(d[labelColumn]);
            })
            .attr('r', dotRadius)
            .style('fill', function(d) {
                var color = "COLORS['" + d['color'] + "']"
                return eval(color);
            });

    chartElement.append('g')
        .attr('class', 'dots end')
        .selectAll('circle')
        .data(config['data'])
        .enter()
        .append('circle')
            .attr('cx', xScale(endLabel))
            .attr('cy', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('class', function(d) {
                return 'line ' + classify(d[labelColumn]);
            })
            .attr('r', dotRadius)
            .style('fill', function(d) {
                var color = "COLORS['" + d['color'] + "']"
                return eval(color);
            });

    /*
     * Render values.
     */
    chartElement.append('g')
        .attr('class', 'value start')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(startLabel))
            .attr('y', function(d) {
                return yScale(d[startColumn]);
            })
            .attr('text-anchor', 'end')
            .attr('dx', -6)
            .attr('dy', function(d) {
                return 3 + d['start_adj'];
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                return d[startColumn].toFixed(1);
            });

    chartElement.append('g')
        .attr('class', 'value end')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                return yScale(d[endColumn]);
            })
            .attr('text-anchor', 'begin')
            .attr('dx', 6)
            .attr('dy', function(d) {
                return 3 + d['end_adj'];
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .text(function(d) {
                if (isSidebar) {
                    return d[endColumn].toFixed(0);
                }

                if (d['label'] == 'Portugal') {
                    return '';
                }

                return d[endColumn].toFixed(1);
            });

    /*
     * Render labels.
     */
    chartElement.append('g')
        .attr('class', 'label')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('x', xScale(endLabel))
            .attr('y', function(d) {
                return yScale(d[endColumn]) + d['end_adj'];
            })
            .attr('text-anchor', 'begin')
            .attr('dx', function(d) {
                return labelGap;
            })
            .attr('dy', function(d) {
                return 3;
            })
            .attr('class', function(d, i) {
                return classify(d[labelColumn]);
            })
            .html(function(d) {
                    return d[labelColumn] + ' (+' + d['change'] + ')';
            })
            .call(wrapText, (margins['right'] - labelGap), 16);
            // .call(wrapText, 145, 14);
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

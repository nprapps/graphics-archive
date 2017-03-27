// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
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
        d['ells'] = +d['ells'];
        d['non-ells'] = +d['non-ells'];
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
    if (isMobile) {
        renderFlippedLineChart({
            container: '#graphic',
            width: containerWidth,
            data: graphicData
        });
    } else {
        renderLineChart({
            container: '#graphic',
            width: containerWidth,
            data: graphicData
        });
    }

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
    var labelColumn = 'abbr';
    var xColumn = 'ells';
    var yColumn = 'non-ells';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 6;

    var margins = {
        top: 5,
        right: 10,
        bottom: 40,
        left: 35
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

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

    /*
     * Render the legend.
     */
    var legendKeys = ['English Language Learners', 'Non-English Language Learners']
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(legendKeys)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d);
            });

    legend.append('b')
        .style('background-color', function(d) {
            if (d == 'English Language Learners') {
                return COLORS['blue1'];
            } else {
                return COLORS['blue3'];
            }
        });

    legend.append('label')
        .text(function(d) {
            return d;
        });

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .rangeBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var yScale = d3.scale.linear()
        .domain([ 0, 20 ])
        .range([ chartHeight, 0 ]);

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
        .tickFormat(function(d) {
            return d;
        })

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d + '%'
        })

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

    chartElement.selectAll('.x.axis .tick line')
    .attr('y2', function(d,i) {
        if (i%2 == 1) {
            return 15;
        } else {
            return 5;
        }
    });

    chartElement.selectAll('.x.axis .tick text')
        .attr('dy', function(d,i) {
            if (i%2 == 1) {
                return 18;
            } else {
                return 6;
            }
        });

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
     * Render dots to chart.
     */
    chartElement.append('g')
       .attr('class', 'dots')
       .selectAll('circle')
       .data(config['data'])
       .enter().append('circle')
           .attr('fill', function(d) {
               return COLORS['blue3']
           })
           .attr('r', 4)
           .attr('cx', function(d) {
               return xScale(d['abbr']) + (xScale.rangeBand() / 2);
           })
           .attr('cy', function(d) {
               return yScale(d['non-ells']);
           })
           .attr('class', function(d) {
               return d['abbr'] + ' non-ells';
           });

   chartElement.append('g')
      .attr('class', 'dots')
      .selectAll('circle')
      .data(config['data'])
      .enter().append('circle')
          .attr('fill', function(d) {
              return COLORS['blue1']
          })
          .attr('r', 4)
          .attr('cx', function(d) {
              return xScale(d['abbr']) + (xScale.rangeBand() / 2);
          })
          .attr('cy', function(d) {
              return yScale(d['ells']);
          })
          .attr('class', function(d) {
              return d['abbr'] + ' ells';
          });
}

var renderFlippedLineChart = function(config) {
    /*
     * Setup
     */
    // config['data'] = config['data'].sort(function(a, b) {
    //     return d3.ascending(a['amt'], b['amt']);
    // });

    var labelColumn = 'state_ap';
    var ellColumn = 'ells';
    var nonEllColumn = 'non-ells';

    var barHeight = 15;
    var barGap = 2;
    var labelWidth = 40;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 10;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Render the legend.
     */
    var legendKeys = ['English Language Learners', 'Non-English Language Learners']
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(legendKeys)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d);
            });

    legend.append('b')
        .style('background-color', function(d) {
            if (d == 'English Language Learners') {
                return COLORS['blue1'];
            } else {
                return COLORS['blue3'];
            }
        });

    legend.append('label')
        .text(function(d) {
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
     * Create D3 scale objects.
     */
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[ellColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[ellColumn] / roundTicksFactor) * roundTicksFactor;
    })

    var xScale = d3.scale.linear()
        .domain([min, 20])
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
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('cricle')
        .data(config['data'])
        .enter().append('circle')
            .attr('class', function(d) {
                return classify(d['abbr'])
            })
            .attr('fill', COLORS['blue1'])
            .attr('r', 4)
            .attr('cx', function(d) {
                return xScale(d[ellColumn]);
            })
            .attr('cy', function(d, i) {
                return (i * (barHeight + barGap)) + (barHeight / 2);
            });

    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('cricle')
        .data(config['data'])
        .enter().append('circle')
            .attr('class', function(d) {
                return classify(d['abbr'])
            })
            .attr('fill', COLORS['blue3'])
            .attr('r', 4)
            .attr('cx', function(d) {
                return xScale(d[nonEllColumn]);
            })
            .attr('cy', function(d, i) {
                return (i * (barHeight + barGap)) + (barHeight / 2);
            });

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

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
                var c = classify(d[labelColumn]);
                if (d['annotate'] == 'yes') {
                    c += ' annotated';
                }
                return c;
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

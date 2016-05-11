// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
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
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        var x0 = 0;
        var party = d['party'];

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'type' || key == 'party') {
                continue;
            }

            d[key] = +d[key];

            if (key == 'total') {
                continue;
            }

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key,
                'party': party,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
        }
    });

    DATA = DATA.sort(function(a, b) {
        return d3.descending(a['total'], b['total']);
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

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#stacked-bar-chart');
    containerElement.html('');

    // get a list of unique candidates
    var candidates = d3.map(DATA, function(d){
        return d['label'];
    }).keys();

    // set common y-axis domain for all charts
    var roundTicksFactor = 50000000;
    if (isMobile) {
        var roundTicksFactor = 100000000;
    }
    var max = d3.max(DATA, function(d) {
        return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
    });
    var xDomain = [ 0, max ]

    // make bar charts for each candidate
    candidates.forEach(function(d, i) {
        var cDiv = classify(d);
        var cData = DATA.filter(function(v, k) {
            return v['label'] == d;
        });

        // make sure 'raised' always appears above 'spent'
        cData = cData.sort(function(a, b) {
            return d3.ascending(a['type'], b['type']);
        });

        var cWrapper = containerElement.append('div')
            .classed('stacked-bar', true)
            .attr('id', cDiv);

        cWrapper.append('h3')
            .text(d);

        // Render the chart!
        renderStackedBarChart({
            container: '#' + cDiv,
            width: containerWidth,
            data: cData,
            xDomain: xDomain
        });
    })

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'type';

    var barHeight = 30;
    var barGap = 5;
    var labelWidth = 50;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 20,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;

    if (isMobile) {
        ticksX = 2;
        margins['right'] = 30;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
     var xScale = d3.scale.linear()
         .domain(config['xDomain'])
         .rangeRound([0, chartWidth]);

     var colorScaleDem = d3.scale.ordinal()
         .domain(d3.keys(config['data'][0]).filter(function(d) {
             return d != labelColumn && d != 'values' && d != 'total' && d != 'label' && d != 'party';
         }))
         .range([ COLORS['blue2'], COLORS['blue5'] ]);

     var colorScaleGOP = d3.scale.ordinal()
         .domain(colorScaleDem.domain())
         .range([ COLORS['red2'], COLORS['red5'] ]);

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
            var t = d / 1000000;
            if (d == 0) {
                return '$0';
            } else if (d < 1000000) {
                return '$' + t.toFixed(1) + 'M';
            } else {
                return '$' + t.toFixed(0) + 'M';
            }
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
     var group = chartElement.selectAll('.group')
         .data(config['data'])
         .enter().append('g')
             .attr('class', function(d) {
                 return 'group ' + classify(d[labelColumn]);
             })
             .attr('transform', function(d,i) {
                 return 'translate(0,' + (i * (barHeight + barGap)) + ')';
             });

     group.selectAll('rect')
         .data(function(d) {
             return d['values'];
         })
         .enter().append('rect')
             .attr('x', function(d) {
                 if (d['x0'] < d['x1']) {
                     return xScale(d['x0']);
                 }

                 return xScale(d['x1']);
             })
             .attr('width', function(d) {
                 return Math.abs(xScale(d['x1']) - xScale(d['x0']));
             })
             .attr('height', barHeight)
             .style('fill', function(d) {
                switch(d['party']) {
                    case 'd':
                        return colorScaleDem(d['name']);
                        break;
                    case 'r':
                        return colorScaleGOP(d['name']);
                        break;
                 }
             })
             .attr('class', function(d) {
                 return classify(d['name']);
             });

     /*
      * Render bar values.
      */
     chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .text(function(d) {
                var t = d['total'] / 1000000;

                if (t == 0) {
                    return 'Total: $' + t.toFixed(0);
                } else if (t < 1) {
                    return 'Total: <$1M';
                } else {
                    return 'Total: $' + t.toFixed(1) + 'M'
                }


                return '$' + d['total'];
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .attr('x', function(d) {
 				return xScale(d['total']);
            })
            .attr('dx', function(d) {
                return valueGap;
            })
            .attr('y', function(d,i) {
                return i * (barHeight + barGap);
            })
            .attr('dy', (barHeight / 2) + 4)

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
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

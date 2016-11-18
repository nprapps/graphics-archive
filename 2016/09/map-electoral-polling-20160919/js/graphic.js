// Global vars
var pymChild = null;
var isMobile = false;
var lastUpdated = '';
var electoralData = [];
var categories = [];
var categoryLabels = [];
var colorScale = null;
var districtStates = [ { 'abbr': 'ME', 'votes': 4 },
                       { 'abbr': 'NE', 'votes': 5 } ];

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

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format data for D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['electoral_votes'] = +d['electoral_votes'];
    });

    // Extract categories from data
    var colorRange = [];
    _.each(LEGEND, function(key) {
        categories.push(key['text']);
        colorRange.push(eval(key['color']));
    });

    colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(colorRange);

    // format totals
    TOTALS.forEach(function(d) {
        var x0 = 0;

        d['values'] = [];

        for (var key in d) {
            if (key == 'label' || key == 'values') {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key.slice(-1),
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
        }
    });
}

/*
 * Render the graphic.
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
    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    var barContaienr = containerElement.append('div')
        .attr('class', 'bar-chart');

    renderStackedBarChart({
        container: '.bar-chart',
        width: containerWidth,
        data: TOTALS
    });

    // var legendContainer = containerElement.append('ul')
    //     .attr('class', 'key');
    //
    // renderLegend({
    //     container: '.key'
    // })

    var mapContainer = containerElement.append('div')
        .attr('class', 'map');

    renderElectoralMap({
        container: '.map',
        width: containerWidth,
        data: DATA
    });

    // renderBoxes({
    //     container: '#graphic',
    //     width: containerWidth,
    //     data: DATA
    // });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Draw legend
 */
var renderLegend = function(config) {
    // Create legend
    var legendElement = d3.select(config['container']);

    var legendSequence = [ 1, 3, 5 ];
    _.each(legendSequence, function(d, i) {
        var keyData = LEGEND[d];
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(keyData['text']));

        keyItem.append('label')
            .text(keyData['text']);
    });
};


/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var barHeight = 20;
    var barGap = 5;
    var valueGap = 6;

    var margins = {
        top: 30,
        right: 0,
        bottom: 0,
        left: 0
    };

    var ticksX = 4;
    var roundTicksFactor = 100;

    if (isMobile) {
        ticksX = 2;
        barHeight = 14;
        margins['top'] = 22;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    // var chartHeight = ((barHeight + barGap) * config['data'].length);
    var chartHeight = barHeight * config['data'].length;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var min = 0;
    var max = 538;

    var xScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([0, chartWidth]);

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
        .orient('top')
        .tickValues([ 270 ])
        .tickFormat(function(d) {
            return d;
        });

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

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
                 return colorScale(d['name']);
             })
             .attr('class', function(d) {
                 return classify(LEGEND[d['name']]['text']);
             });

    // var barLabels = group.append('g')
    //     .attr('class', 'bar-labels')
    //         .selectAll('text')
    //             .data(function(d) {
    //                 return d['values'];
    //             })
    //             .enter().append('text')
    //                 .text(function(d) {
    //                    return d['val'];
    //                 })
    //                 .attr('x', function(d) {
    //                      return xScale(d['x0'] + (d['x1'] - d['x0']) / 2);
    //                  })
    //                  .attr('dy', isMobile ? 11 : 14);

    // annotations
    var annotations = chartElement.append('g')
        .attr('class', 'annotations');

    annotations.append('line')
        .attr('x1', xScale(270))
        .attr('x2', xScale(270))
        .attr('y1', -3)
        .attr('y2', chartHeight);

    annotations.append('text')
        .text('270')
        .attr('class', 'winner-line')
        .attr('x', xScale(270))
        .attr('y', -8);

    annotations.append('text')
        .text(function() {
            return 'Clinton: ' + config['data'][0]['category-1'];
        })
        .attr('class', 'candidate dem')
        .attr('x', xScale(0))
        .attr('y', -10);

    annotations.append('text')
        .text(function() {
            return 'Trump: ' + config['data'][0]['category-5'];
        })
        .attr('class', 'candidate gop')
        .attr('x', xScale(538))
        .attr('y', -10);
}


/*
 * Render an electoral map
 */
var renderElectoralMap = function(config) {
    var dataColumn = 'category';

    // Copy map template
    var containerElement = d3.select(config['container'])
        .append('div')
        .attr('class', 'map-wrapper');
    var template = d3.select('#electoral-map');
    containerElement.html(template.html());
    var mapElement = containerElement.select('svg');

    var scaleFactor = 30;
    config['data'].forEach(function(d,i) {
        var st = d['usps'];
        var stCategory = LEGEND[d[dataColumn]]['text'];
        var stCategoryClass = classify(stCategory);

        var stBox = mapElement.select('.' + classify(st))
            .classed(stCategoryClass, true);

        var stRect = stBox.select('rect')
            .attr('fill', colorScale(d['category']));

        if (d['flag'] != null) {
            stRect.classed(classify(d['flag']), true);
        }

        var stLabel = stBox.select('text');
        if (d['electoral_votes'] < 6) {
            stLabel.classed('small', true);
        }

        if (stLabel[0][0] != null) {
            stLabel.attr('x', function() {
                    var boxX = Number(stRect.attr('x'));
                    var boxWidth = Number(stRect.attr('width'));

                    return (boxX + (boxWidth / 2));
                })
                .attr('y', function() {
                    var boxY = Number(stRect.attr('y'));
                    var boxHeight = Number(stRect.attr('height'));
                    var labelBbox = stLabel[0][0].getBBox();

                    return (boxY + (boxHeight / 2) + (labelBbox.height / 3));
                })
                .attr('class', 'state-abbr');

            if (!isMobile) {
                stLabel.attr('y', Number(stLabel.attr('y')) - 5);
                stBox.append('text')
                    .attr('class', 'votes')
                    .text(d['electoral_votes'])
                    .attr('x', stLabel.attr('x'))
                    .attr('y', Number(stLabel.attr('y')) + 10);
            }
        }
    });

    // address the states w/ districts
    districtStates.forEach(function(d,i) {
        var stBox = mapElement.select('.' + classify(d['abbr']));
        var stLabel = stBox.select('text')
            .classed('small', true);
        if (!isMobile) {
            stLabel.text(function() {
                return d['abbr'] + ' (' + d['votes'] + ')';
            });
        }
    });
}


/*
 Draw boxes that can be the basis of a cartogram
 */
var renderBoxes = function(config) {
    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 5,
        right: 5,
        bottom: 5,
        left: 5
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    // Draw here!
    var scaleFactor = 200;
    var row = 0;
    var colPos = 0;
    chartElement.append('g')
        .attr('class', 'boxes total')
        .selectAll('rect')
        .data(config['data'])
        .enter()
            .append('rect')
            .attr('class', function(d) {
                return classify(d['usps']);
            })
            .attr('width', function(d) {
                return Math.floor(Math.sqrt(d['electoral_votes'] * scaleFactor));
            })
            .attr('height', function(d) {
                return Math.floor(Math.sqrt(d['electoral_votes'] * scaleFactor));
            })
            .attr('x', function(d,i) {
                if (i % 10 == 0 && i != 0) {
                    colPos = 0;
                }
                var newPos = colPos + 10;
                colPos = newPos + Math.sqrt(d['electoral_votes'] * scaleFactor);
                return newPos;
            })
            .attr('y', function(d,i) {
                if (i % 10 == 0 && i != 0) {
                    row++;
                }
                return row * 110;
            });

    chartElement.append('g')
        .attr('class', 'state-labels')
        .selectAll('text')
        .data(config['data'])
        .enter()
            .append('text')
            .text(function(d){
                return d['usps'];
            })
            .attr('class', function(d) {
                return classify(d['usps']);
            })
            .attr('x', function(d,i) {
                var box = d3.select('.boxes.total .' + classify(d['usps']));
                var boxX = Number(box.attr('x'));
                return boxX;
            })
            .attr('y', function(d,i) {
                var box = d3.select('.boxes.total .' + classify(d['usps']));
                var boxY = Number(box.attr('y'));
                return boxY + 10;
            })
            .attr('dx', 3)
            .attr('dy', 3);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

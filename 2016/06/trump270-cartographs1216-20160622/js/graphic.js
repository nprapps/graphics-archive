// Global vars
var JUMBO_THRESHOLD = 800;
var pymChild = null;
var isMobile = false;
var isJumbo = false;
var lastUpdated = '';
var electoralData = [];
var categories = [];
var categoryLabels = [];
var colorScale = null;

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

    DATA_2016.forEach(function(d) {
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

    TOTALS_2016.forEach(function(d) {
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

    var graphicWidth = null;
    var gutterWidth = 33;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        isJumbo = false;
        graphicWidth = containerWidth;
    } else if (containerWidth >= JUMBO_THRESHOLD) {
        isMobile = false;
        isJumbo = true;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    } else {
        isMobile = false;
        isJumbo = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Render the chart!
    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    var wrapperContainer = containerElement.append('div')
        .attr('class', 'wrapper');

    var y2012Container = wrapperContainer.append('div')
        .attr('class', 'y2012')
        .attr('style', function() {
            if (!isMobile) {
                return 'width: ' + graphicWidth + 'px;';
            }
        });

    var barContainer = y2012Container.append('div')
        .attr('class', 'bar-chart y2012');

    renderStackedBarChart({
        container: '.bar-chart.y2012',
        width: graphicWidth,
        data: TOTALS,
        headers: HEADERS,
        year: '2012'
    });

    // var legendContainer = y2012Container.append('ul')
    //     .attr('class', 'key y2012');

    // renderLegend({
    //     container: '.key.y2012'
    // });

    var mapContainer = y2012Container.append('div')
        .attr('class', 'map y2012');

    renderElectoralMap({
        container: '.map.y2012',
        width: graphicWidth,
        data: DATA,
        year: '2012'
    });


    var y2016Container = wrapperContainer.append('div')
        .attr('class', 'y2016')
        .attr('style', function() {
            if (!isMobile) {
                return 'width: ' + graphicWidth + 'px;';
            }
        });

    var barContainer_2016 = y2016Container.append('div')
        .attr('class', 'bar-chart y2016');

    renderStackedBarChart({
        container: '.bar-chart.y2016',
        width: graphicWidth,
        data: TOTALS_2016,
        headers: HEADERS,
        year: '2016'
    });

    // var legendContainer_2016 = y2016Container.append('ul')
    //     .attr('class', 'key y2016');
    // renderLegend({
    //     container: '.key.y2016'
    // });

    var mapContainer_2016 = y2016Container.append('div')
        .attr('class', 'map y2016');
    renderElectoralMap({
        container: '.map.y2016',
        width: graphicWidth,
        data: DATA_2016,
        year: '2016'
    });

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

    var legendSequence = [ 1, 2];
    // different key sort order on mobile
    if (isMobile) {
        legendSequence = [ 1, 2];
    }
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

var stackedheader = function(config) {
    return config.headers[config.year+'_header'];
}


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


    d3.select(config['container']).append('h4')
        .html(stackedheader(config));

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

    var barLabels = group.append('g')
        .attr('class', 'bar-labels')
            .selectAll('text')
                .data(function(d) {
                    return d['values'];
                })
                .enter().append('text')
                    .text(function(d) {
                       return d['val'];
                    })
                    .attr('x', function(d) {
                         return xScale(d['x0'] + (d['x1'] - d['x0']) / 2);
                     })
                     .attr('dy', isMobile ? 11 : 14);

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
            var nums = config['data'][0];
            var total = nums['category-1'];
            return 'Democrats: ' + total;
        })
        .attr('class', 'candidate dem')
        .attr('x', xScale(0))
        .attr('y', -10);

    annotations.append('text')
        .text(function() {
            var nums = config['data'][0];
            var total = nums['category-2'];
            return 'Republicans: ' + total;
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
    var template = d3.select('#electoral-map-2012');
    containerElement.html(template.html());
    var mapElement = containerElement.select('svg');

    var scaleFactor = 30;
    config['data'].forEach(function(d,i) {
        var st = d['usps'];
        var stCategory = LEGEND[d[dataColumn]]['text'];
        var stCategoryClass = classify(stCategory);

        var stBox = mapElement.select('.' + classify(st))
            .classed(stCategoryClass, true);

        var stRect = stBox.select('rect');
        if (d['flag'] != null) {
            //highlight flip states with opacity
            stRect.classed(classify(d['flag']), true);
            stRect.attr({
                //'fill': color,
                'fill-opacity': 1});
        }
        else {
             stRect.attr('fill-opacity', 0.5);
        }
        stRect.attr('fill', colorScale(d['category']));

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
                });
        }
    });

    // address the states w/ districts
    var districtStates = [ 'ME', 'NE' ];
    districtStates.forEach(function(d,i) {
        var stBox = mapElement.select('.' + classify(d));
        var stLabel = stBox.select('text')
            .classed('small', true);
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

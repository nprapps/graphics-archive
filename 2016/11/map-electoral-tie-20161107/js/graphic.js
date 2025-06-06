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

    var mapWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        mapWidth = containerWidth;
    } else {
        isMobile = false;
        mapWidth = Math.floor((containerWidth - gutterWidth) / 2);
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

    var mapContainer1 = containerElement.append('div')
        .attr('class', 'map tie1');

    renderElectoralMap({
        container: '.map.tie1',
        width: mapWidth,
        data: DATA,
        dataCol: 'category',
        flagCol: 'flag'
    });

    var mapContainer2 = containerElement.append('div')
        .attr('class', 'map tie2');

    renderElectoralMap({
        container: '.map.tie2',
        width: mapWidth,
        data: DATA,
        dataCol: 'category_2',
        flagCol: 'flag_2'
    });

    if (!isMobile) {
        mapContainer1.attr('style', 'width: ' + mapWidth + 'px; float: left;');
        mapContainer2.attr('style', 'width: ' + mapWidth + 'px; float: right;');
    }

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
            var nums = config['data'][0];
            var safe = nums['category-1'];
            // var lean = nums['category-2'];
            var lean = 0;
            var total = lean + safe;
            return 'Clinton: ' + total;
        })
        .attr('class', 'candidate dem')
        .attr('x', xScale(0))
        .attr('y', -10);

    annotations.append('text')
        .text(function() {
            var nums = config['data'][0];
            // var lean = nums['category-4'];
            var lean = 0;
            var safe = nums['category-5'];
            var total = lean + safe;
            return 'Trump: ' + total;
        })
        .attr('class', 'candidate gop')
        .attr('x', xScale(538))
        .attr('y', -10);
}


/*
 * Render an electoral map
 */
var renderElectoralMap = function(config) {
    var dataColumn = config['dataCol'];
    var flagColumn = config['flagCol'];
    // console.log(dataColumn, flagColumn);

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
            .attr('fill', colorScale(d[dataColumn]));

        if (d[flagColumn] != null) {
            stRect.classed(classify(d[flagColumn]), true);
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
        }
    });

    // address the states w/ districts
    districtStates.forEach(function(d,i) {
        var stBox = mapElement.select('.' + classify(d['abbr']));
        var stLabel = stBox.select('text')
            .classed('small', true);
    });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

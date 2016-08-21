// Global config
var MAP_TEMPLATE_ID = '#map-template';

// Global vars
var pymChild = null;
var isMobile = false;
var categories = [];
var colorRange = [];
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
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
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
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
        }
    });

    // Extract categories from data
    _.each(LEGEND, function(key) {
        categories.push(key['text']);
        colorRange.push(eval(key['color']));
    });

    colorScale = d3.scale.ordinal()
        .domain(categories)
        .range(colorRange);
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
    renderStackedBarChart({
        container: '#stacked-bar-chart',
        width: containerWidth,
        data: TOTALS
    });

    // Render the map!
    renderStateGridMap({
        container: '#state-grid-map',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Create legend
    var legendElement = containerElement.select('.key');
    var legendSequence = [ 0, 1, 2, 3, 4 ];
    // different key sort order on mobile
    if (isMobile) {
        legendSequence = [ 0, 1, 2, 4, 3 ];
    }
    _.each(legendSequence, function(d, i) {
        var keyData = LEGEND[d];
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(keyData['text']));

        keyItem.append('label')
            .text(function() {
                switch(keyData['text']) {
                    case 'D-Safe':
                        return 'D-Safe/Likely';
                        break;
                    case 'R-Safe':
                        return 'R-Safe/Likely';
                        break;
                    default:
                        return keyData['text'];
                        break;
                }
            });
    });

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // add blocks for NE and ME
    /*
    var districtAnnotations = chartElement.append('g')
        .attr('class', 'districts')
        .attr('transform', 'translate(330, 227)');

    districtAnnotations.append('text')
        .text('Proportional states')
        .attr('x', 0)
        .attr('y', 0);

    var districtBlockWidth = 10;
    var maineDistricts = 4;
    var maine = districtAnnotations.append('g')
        .attr('class', 'maine districts')
        .attr('transform', 'translate(0, 5)');
    maine.append('text')
        .text('Maine')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', function() {
            if (isMobile) {
                return 9;
            } else {
                return 7;
            }
        });
    for (var i = 0; i < maineDistricts; i++) {
        maine.append('rect')
            .attr('class', 'maine-' + (i + 1))
            .attr('x', function() {
                var maineLabelBox = maine.select('text')[0][0].getBBox();
                var xOffset = maineLabelBox['width'] + 6;
                return xOffset + (i * districtBlockWidth) + (i * 1);
            })
            .attr('y', 0)
            .attr('width', districtBlockWidth)
            .attr('height', districtBlockWidth);
    }

    var nebraskaDistricts = 5;
    var nebraska = districtAnnotations.append('g')
        .attr('class', 'nebraska districts')
        .attr('transform', 'translate(0, 17)');
    nebraska.append('text')
        .text('Neb.')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', function() {
            if (isMobile) {
                return 9;
            } else {
                return 7;
            }
        });
    for (var i = 0; i < nebraskaDistricts; i++) {
        nebraska.append('rect')
            .attr('class', 'nebraska-' + (i + 1))
            .attr('x', function() {
                var maineLabelBox = maine.select('text')[0][0].getBBox();
                var xOffset = maineLabelBox['width'] + 6;
                return xOffset + (i * districtBlockWidth) + (i * 1);
            })
            .attr('y', 0)
            .attr('width', districtBlockWidth)
            .attr('height', districtBlockWidth);
    }
    // Set district colors
    _.each(DISTRICTS, function(district) {
        if (district['category'] !== null) {
            var districtClass = 'districts .' + classify(district['district_name']);

            chartElement.select('.' + districtClass)
                .attr('class', districtClass + ' district-active')
                .attr('fill', colorScale(district['category_verbose']));
        }
    });
    */

    // Set state colors
    _.each(config['data'], function(state) {
        if (state['category'] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', colorScale(state['category_verbose']));
        }
    });

    // Draw state labels
    var labelLineHeight = 9;
    if (isMobile) {
        labelLineHeight = 11;
    }
    var stateLabels = chartElement.append('g')
        .selectAll('text')
            .data(config['data'])
        .enter().append('text')
            .attr('text-anchor', 'middle')
            .attr('class', function(d) {
                return d['category'] !== null ? 'label label-active' : 'label';
            })
            .attr('dx', 0)
            .attr('dy', 0);

    stateLabels.append('tspan')
        .text(function(d) {
            var state = _.findWhere(STATES, { 'name': d['state_name'] });
            return isMobile ? state['usps'] : state['ap'];
        })
        .attr('dy', (0 * labelLineHeight) + 'px');

    stateLabels.append('tspan')
        .text(function(d) {
            d['votes'] = +d['votes'];
            return d['votes'].toFixed(0);
        })
        .attr('dx', 0)
        .attr('dy', (1 * labelLineHeight) + 'px');

    stateLabels.attr('x', function(d) {
            var className = '.state-' + classify(d['state_name']);
            var tileBox = chartElement.select(className)[0][0].getBBox();
            var xPos = tileBox['x'] + tileBox['width'] * 0.52;

            d3.select(this).selectAll('tspan')
                .attr('x', xPos);

            return xPos;
        })
        .attr('y', function(d) {
            var className = '.state-' + classify(d['state_name']);
            var tileBox = chartElement.select(className)[0][0].getBBox();
            var textBox = d3.select(this)[0][0].getBBox();
            var textOffset = (tileBox['height'] - textBox['height']) + 1;

            if (isMobile) {
                textOffset += 8;
            }

            var yPos = tileBox['y'] + textOffset;

            // if (d['state_name'] == 'Iowa') {
            //     console.log('tileBox', tileBox.y, tileBox.height);
            //     console.log('textBox', textBox.y, textBox.height);
            //     console.log(yPos, textOffset);
            // }

            d3.select(this).selectAll('tspan')
                .attr('y', yPos);

            return yPos;
        });
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
     * Render axes to chart.
     */
    // chartElement.append('g')
    //     .attr('class', 'x axis')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    // chartElement.append('g')
    //     .attr('class', 'x grid')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxisGrid()
    //         .tickSize(-chartHeight, 0, 0)
    //         .tickFormat('')
    //     );

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
                 return classify(d['name']);
             });

    var bar_labels = group.append('g')
        .attr('class', 'bar-labels')
            .selectAll('text')
                .data(function(d) {
                    return d['values'];
                })
                .enter().append('text')
                .attr('x', function(d) {
                     if (d['x0'] < d['x1']) {
                         return xScale(d['x0'] + (d['x1'] - d['x0'])/2);
                     }
                     return xScale(d['x1']);
                 })
                 .attr('dy', isMobile ? 11 : 14)
                 .text(function(d) {
                    return d['val'];
                 });

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
            var lean = +nums['D-Lean'];
            // var likely = +nums['D-Likely'];
            var safe = +nums['D-Safe'];
            // var total = lean + likely + safe;
            var total = lean + safe;
            return 'Clinton: ' + total;
        })
        .attr('class', 'candidate dem')
        .attr('x', xScale(0))
        .attr('y', -10);

    annotations.append('text')
        .text(function() {
            var nums = config['data'][0];
            var lean = +nums['R-Lean'];
            // var likely = +nums['R-Likely'];
            var safe = +nums['R-Safe'];
            // var total = lean + likely + safe;
            var total = lean + safe;
            return 'Trump: ' + total;
        })
        .attr('class', 'candidate gop')
        .attr('x', xScale(538))
        .attr('y', -10);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

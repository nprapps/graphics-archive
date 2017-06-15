// Global vars
var pymChild = null;
var isMobile = false;
var years = [ 2010, 2011, 2012, 2013, 2014, 2015 ];
var yearIdx = 0;

var valueColumn = null;
var colYScale = null;
var cols = null;
var colLabels = null;
var colChartHeight = null;
var valueGap = 12;

var mapContainer = null;

var animate = null;
var animateInterval = 1500;

var sliderBrush = null;
var sliderScale = null;
var yearLabel = null;

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
    DATA.forEach(function(d, i) {
        for (key in d) {
            if (key != 'label' && d[key] != null) {
                d[key] = +d[key];
            }
        }
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    pauseAnimation();
    yearIdx = 0;

    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    var sliderWidth = Math.floor(containerWidth * .8);
    if (sliderWidth < 300) {
        sliderWidth = 300;
    }
    renderSlider({
        container: '#slider',
        // width: containerWidth,
        width: sliderWidth,
        data: years
    });

    renderColumnChart({
        container: '#column-chart',
        width: containerWidth,
        data: DATA,
        title: 'Share of people under 65 without insurance'
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    valueColumn = 'amt_' + years[yearIdx];

    var chartWidth = 245;
    colChartHeight = 25;
    var minLeftMargin = 0;
    var minRightMargin = 0;
    var sideMarginPadding = Math.floor((config['width'] - chartWidth - minLeftMargin - minRightMargin) / 2);

    var margins = {
        top: 31,
        right: sideMarginPadding + minRightMargin,
        bottom: 12,
        left: sideMarginPadding + minLeftMargin
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['title']);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', colChartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([ 0, chartWidth ], .03)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var min = 0;
    var max = 1200;

    colYScale = d3.scale.linear()
        .domain([ min, max ])
        .range([ colChartHeight, 0 ]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (i == 0) {
                return d + '%';
            } else {
                return d;
            }
        });

    var yAxis = d3.svg.axis()
        .scale(colYScale)
        .orient('left')
        .tickValues([ colYScale.domain()[1] ])
        .tickFormat(function(d, i) {
            return '';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, colChartHeight))
        .call(xAxis);

    // Shift tick marks
    chartElement.selectAll('.x.axis .tick')
        .attr('transform', function() {
            var el = d3.select(this);
            var transform = d3.transform(el.attr('transform'));

            transform.translate[0] = transform.translate[0] - (xScale.rangeBand() / 2) - ((xScale.rangeBand() * .1) / 2);
            transform.translate[1] = -colChartHeight - margins['top'] + 7;

            return transform.toString();
        })

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Render columns to chart.
     */
    chartElement.append('g')
        .attr('class', 'key-bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                return xScale(d[labelColumn]);
            })
            .attr('y', -margins['top'])
            .attr('width', xScale.rangeBand())
            .attr('height', 10)
            .attr('class', function(d, i) {
                return 'bar key-bar bar-' + i;
            });

    cols = chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                return xScale(d[labelColumn]);
            })
            .attr('y', 0)
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                return colYScale(0) - colYScale(d[valueColumn]);
            })
            .attr('class', function(d, i) {
                return 'bar bar-' + i;
            });

    /*
     * Render bar values.
     */
    colLabels = chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d) {
                return fmtComma(d[valueColumn].toFixed(0));
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                return colChartHeight - colYScale(d[valueColumn]);
            })
            .attr('dy', valueGap)
            .attr('class', 'out')
            .attr('text-anchor', 'middle');

    containerElement.append('h4')
        .text('Number of counties in each range');

    // show the appropriate map
    mapContainer = d3.select('#map');
    mapContainer.selectAll('.map')
        .classed('active', false);
    mapContainer.select('.map-' + years[yearIdx])
        .classed('active', true);

    startAnimation();
}


// draw slider bar
var renderSlider = function(config) {
    var firstYear = +config['data'][0];
    var lastYear = +config['data'][config['data'].length - 1];

    var toggleWidth = 85;
    var sliderHeight = 60;
    var sliderMargins = {
        top: 25,
        right: (toggleWidth + 30),
        bottom: 0,
        left: 15
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('')
        .attr('style', 'max-width: ' + config['width'] + 'px;');


    var sliderElement = containerElement.append('svg')
            .attr('width', config['width'])
            .attr('height', sliderHeight);

    // define scale
    sliderScale = d3.scale.linear()
        .domain([ firstYear, lastYear ])
        .range([ 0, (config['width'] - sliderMargins['left'] - sliderMargins['right']) ])
        .clamp(true);

    var sliderAxis = sliderElement.append('g')
        .attr('class', 'x axis')
        .call(d3.svg.axis()
            .scale(sliderScale)
            .orient('bottom')
            .tickValues(years)
            .tickFormat(function(d,i) {
                return d;
            })
            .tickSize(8)
            .tickPadding(5)
        )
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')');

    var sliderTicks = d3.selectAll('#slider .x.axis .tick');
    sliderTicks[0].forEach(function(d,i) {
        var tick = d3.select(d);
        var text = tick.select('text').text();
        if (text == '') {
            tick.select('line')
                .attr('y2', 7);
        } else {
            tick.select('line')
                .attr('y2', 10);
        }
    });

    yearLabel = sliderAxis.append('text')
          .attr('id','year-label')
          .attr('text-anchor', 'middle')
          .attr('dy', -15)
          .text(firstYear);

    var sliderBar = sliderElement.append('g')
        .attr('class', 'xbar')
        .append('line')
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .attr('x1', sliderScale(firstYear))
        .attr('x2', sliderScale(lastYear));

    var sliderBarHalo = sliderElement.append('g')
        .attr('class', 'xbar-halo')
        .append('line')
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .attr('x1', sliderScale(firstYear))
        .attr('x2', sliderScale(lastYear));

    sliderBrush = d3.svg.brush()
        .x(sliderScale)
        .extent([ firstYear, lastYear ])
        .on('brush', onBrushed);

    var slider = sliderElement.append('g')
        .attr('class', 'slider')
        .attr('height', sliderHeight)
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .call(sliderBrush);

    sliderHandle = slider.append('svg:image')
        .attr('class', 'handle')
        .attr('transform', 'translate(0,' + -10 + ')')
        .attr('xlink:href', 'assets/slider.png')
        .attr('width', 150)
        .attr('height', 20)
        .attr('x', sliderScale(firstYear) - 75 );

    // add play/pause buttons
    var toggle = containerElement.append('div')
        .attr('id', 'toggle');

    toggle.append('div')
        .attr('id', 'btn-play')
        .html('<i class="icon-play"></i> Play')
        .attr('style', 'display: none;')
        .on('click', onPlayClicked);

    toggle.append('div')
        .attr('id', 'btn-pause')
        .html('<i class="icon-pause"></i> Pause')
        .on('click', onPauseClicked);

    toggle.attr('style', function() {
        var s = '';
        s += 'right: 0;';
        s += 'bottom: 19px;';
        s += 'width: ' + toggleWidth + 'px;';
        return s;
    });
}

var onPauseClicked = function() {
    pauseAnimation();
}
var onPlayClicked = function() {
    startAnimation();
}

var startAnimation = function() {
    animate = setInterval(animateMap, animateInterval);
    animateMap();
    d3.select('#btn-play').attr('style', 'display: none;');
    d3.select('#btn-pause').attr('style', 'display: block;');
}

var pauseAnimation = function() {
    clearInterval(animate);
    d3.select('#btn-play').attr('style', 'display: block;');
    d3.select('#btn-pause').attr('style', 'display: none;');
}

var onBrushed = function() {
    pauseAnimation();

    var thisYear = Math.round(sliderBrush.extent()[0]);

    if (d3.event.sourceEvent) { // not a programmatic event
        thisYear = Math.round(sliderScale.invert(d3.mouse(this)[0]));
    }
    sliderBrush.extent([ thisYear, thisYear ]);
    sliderHandle.attr('x', sliderScale(thisYear) - 75);

    for (var i = 0; i < years.length; i++) {
        if (years[i] == thisYear) {
            yearIdx = i;
        }
    }

    animateMap();
}

var animateMap = function() {
    var year = years[yearIdx];

    if (year == undefined) {
        pauseAnimation();
        yearIdx = 0;
    } else {
        valueColumn = 'amt_' + years[yearIdx];

        // animate the column chart
        cols.transition()
            .attr('height', function(d) {
                return colYScale(0) - colYScale(d[valueColumn]);
            });

        // animate the labels on the column chart
        colLabels.transition()
            .text(function(d) {
                return fmtComma(d[valueColumn].toFixed(0));
            })
            .attr('y', function(d) {
                return colChartHeight - colYScale(d[valueColumn]);
            })
            .attr('dy', valueGap);

        // show the appropriate map
        mapContainer.selectAll('.map')
            .classed('active', false);
        mapContainer.select('.map-' + years[yearIdx])
            .classed('active', true);

        // adjust the slider bar
        sliderHandle.attr('x', sliderScale(year) - 75);

        yearLabel.attr('x', sliderScale(year))
            .text(year);

        yearIdx++;
    }
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

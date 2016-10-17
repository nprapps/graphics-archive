// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var activePlay = 'Bye Bye Birdie';
var pymChild = null;
var isMobile = false;
var filteredData = [];
var graphicData = null;
var graphicWidth = null;
var playIndex = [];
var ranksShown = 10;
var years = [ 1960, 1970, 1980, 1990, 2000, 2010 ];


// D3 formatters
var fmtComma = d3.format(',');

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            data = JSON.parse(data);
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
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
    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
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
    graphicData.forEach(function(d,i) {
        var isTopPlay = false;

        playIndex[d['play']] = i;

        years.forEach(function(y, j) {
            if (d[y + '_rank'] != 'n/a') {
                d[y + '_rank'] = +d[y + '_rank'];
            }
            if (d[y + '_rank'] <= 5) {
                isTopPlay = true;
            }
            delete d[y];
        });

        if (isTopPlay) {
            filteredData.push(d);
            playIndex[ d['play'] ] = filteredData.length - 1;
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

    graphicWidth = containerWidth;

    // make play drop-down
    var playSelectorWrapper = d3.select('#graphic')
        .html('')
        .append('div')
            .attr('class', 'play-selector');

    playSelectorWrapper.append('label')
        .attr('for', 'play')
        .text('Select a musical');

    var playSelector = playSelectorWrapper.append('select')
        .attr('name', 'play');

    filteredData.forEach(function(d, i) {
        playSelector.append('option')
            .attr('value', function() {
                return d['play'];
            })
            .text(function() {
                return d['play'];
            });
    });
    playSelector.on('change', onPlaySelected);

    // Render the chart!
    var chartContainerElement = d3.select('#graphic')
        .append('div')
        .attr('id', 'ratings');

    playSelector.property('value', activePlay).each(onPlaySelected);

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var onPlaySelected = function() {
    activePlay = d3.select(this).property('value');

    renderColumnChart({
        container: '#ratings',
        width: graphicWidth,
        data: filteredData[ playIndex[activePlay] ],
        years: years
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
    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 7;
    var valueGap = 6;

    var margins = {
        top: 20,
        right: 0,
        bottom: 20,
        left: 0
    };

    var ticksY = 4;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    var barHeight = Math.floor(chartHeight / ranksShown) - 1;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Add play info
    var metaInfo = containerElement.append('div')
        .attr('class', 'meta');

    if (config['data']['img']) {
        metaInfo.append('img')
            .attr('src', 'assets/' + config['data']['img'])
            .attr('alt', 'Illustration: ' + config['data']['play']);
    }

    metaInfo.append('h3')
        .text(config['data']['play']);

    if (config['data']['description']) {
        metaInfo.classed('featured', true);
        metaInfo.append('p')
            .attr('class', 'description')
            .html('Trivia: ' + config['data']['description']);
    }

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
    var xScale = d3.scale.ordinal()
        .rangeBands([0, chartWidth], .15)
        .domain(config['years']);

    var yDomain = [];
    var counter = ranksShown;
    while (counter > 0) {
        yDomain.push(counter);
        counter--;
    }

    var yScale = d3.scale.ordinal()
        .rangeRoundBands([ chartHeight, 0 ], .1)
        .domain(yDomain);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('top')
        .tickSize(0)
        .tickPadding(6)
        .tickFormat(function(d, i) {
            return d + 's';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .call(xAxis);

    /*
     * Render bars to chart.
     */
    for (year in config['years']) {
        var thisYear = config['years'][Number(year)];
        var nextYear = config['years'][(Number(year) + 1)];
        var rankThisYear = config['data'][thisYear + '_rank'];
        var rankNextYear = config['data'][nextYear + '_rank'];

        // draw connecting polygons
        // via: http://stackoverflow.com/questions/13204562/proper-format-for-drawing-polygon-data-in-d3
        if (rankThisYear <= ranksShown && rankNextYear <= ranksShown) {
            var coordinates = [ { 'x': (xScale(thisYear) + xScale.rangeBand()), 'y': yScale(rankThisYear) },
                                { 'x': (xScale(thisYear) + xScale.rangeBand()), 'y': (yScale(rankThisYear) + yScale.rangeBand()) },
                                { 'x': xScale(nextYear), 'y': (yScale(rankNextYear) + yScale.rangeBand()) },
                                { 'x': xScale(nextYear), 'y': yScale(rankNextYear) } ];

            chartElement.selectAll('.poly')
                .data([coordinates])
                .enter().append('polygon')
                    .attr('class', 'rank-connector')
                    .attr('points', function(d) {
                        return d.map(function(d) {
                            return [ d['x'], d['y'] ].join(',');
                        }).join(' ');
                    });
        }

        // draw rank bars
        var yearBar = chartElement.append('g')
            .attr('class', 'bars bar-' + thisYear);

        for (i = 1; i <= ranksShown; i++) {
            var thisRank = i;
            yearBar.append('rect')
                .attr('class', 'rank-' + thisRank)
                .attr('x', xScale(thisYear))
                .attr('y', yScale(i))
                .attr('width', xScale.rangeBand())
                .attr('height', yScale.rangeBand());
        }

        // highlight this play's ranks
        if (rankThisYear <= ranksShown) {
            var thisRankBar = chartElement.select('.bar-' + thisYear + ' rect.rank-' + rankThisYear)
                .classed('active', true);

            chartElement.append('text')
                .attr('class', 'rank-value')
                .attr('x', xScale(thisYear) + (xScale.rangeBand() / 2))
                .attr('y', yScale(rankThisYear) + (barHeight / 2) + 4)
                .text(rankThisYear);
        } else {
            chartElement.append('text')
                .attr('class', function(d) {
                    var c = 'rank-value below';
                    if (isNaN(rankThisYear)) {
                        c += ' na';
                    }
                    return c;
                })
                .attr('x', xScale(thisYear) + (xScale.rangeBand() / 2))
                .attr('y', chartHeight + 15)
                .text(function(d) {
                    if (isMobile) {
                        return rankThisYear;
                    } else {
                        return 'Rank: ' + rankThisYear;
                    }
                });
        }

    }

    metaInfo.attr('style', function() {
        var s = '';
        s += 'padding-left: ' + xScale(config['years'][0]) + 'px;';
        s += 'padding-right: ' + xScale(config['years'][0]) + 'px;';
        return s;
    });

    d3.select('#graphic .play-selector')
        .attr('style', function() {
            var s = '';
            s += 'padding-left: ' + xScale(config['years'][0]) + 'px;';
            s += 'padding-right: ' + xScale(config['years'][0]) + 'px;';
            return s;
        });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

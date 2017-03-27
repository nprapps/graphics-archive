// Global config
var GEO_DATA_URL = 'world-110m.json';
var scaleKey = [ 5, 15 ];

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;
var columnChartFunction;
var fakeData = [];
var globalColorScale;

// some vars for consistent style animations
var dotRadius = isMobile ? 3 : 4.5;
var dotOpacity = .5;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();
        loadJSON();
        setupEventListener();

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
 * Add event listener
 */
var setupEventListener = function() {
    d3.select('#play-animation')
        .on('click', function() {
            var e = d3.event;
            e.preventDefault();
            var animBtn = d3.select('#play-animation');

            if (animBtn.classed('disabled') == false) {
                animBtn.classed('disabled', true);
                animateGraphics();
            }
        });
}

var animateGraphics = function() {
    var button = d3.select(this);
    var map = d3.select('#locator-map');
    var chart = d3.select('#column-chart');
    var timeInterval = 750;
    var yearIndex = 0;

    emptyFakeData();
    columnChartFunction['updateBars']();

    map.selectAll('circle')
        .attr('r', 0)
        .classed('hidden', true);

    chart.selectAll('.value-text')
        .classed('hidden', true);

    var mapTimer = window.setInterval(function(elapsed) {
        if (yearIndex >= COL_DATA.length) {
            window.clearInterval(mapTimer);
            d3.select('#play-animation').classed('disabled', false);
        } else {
            var year = COL_DATA[yearIndex]['YEAR'];
            columnChartFunction['updateBars'](yearIndex);

            var yearDots = map.selectAll('circle.year-' + year)
                .classed('hidden', false)
                .transition()
                    .duration(200)
                    .attr('fill-opacity', 1)
                    .attr('r', 7);

            yearDots
                .transition()
                    .duration(350)
                    .attr('fill-opacity', dotOpacity)
                    .attr('r', dotRadius);

            chart.selectAll('.value-text.year-' + year)
                .classed('hidden', false);

            yearIndex++;
        }
    },timeInterval);
}

var emptyFakeData = function() {
    fakeData.forEach(function(d) {
        d['amt'] = 0;
    })
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    COL_DATA.forEach(function(d, i) {
        var fakeD = {};
        d['amt'] = +d['amt'];
        fakeD['amt'] = 0;
        d['YEAR'] = d['label'];
        fakeD['YEAR'] = d['YEAR'];
        d['label'] = d3.time.format('%Y').parse(d['label']);
        fakeD['label'] = d['label'];
        fakeData.push(fakeD);
    });

    createColorScale();
}

/*
 * Load graphic data from a CSV.
 */
var loadJSON = function() {
    d3.json(GEO_DATA_URL, function(error, data) {
        geoData = data;
        // console.log(geoData);

        // recast amts as numbers
        DATA.forEach(function(d, i) {
            for (key in d) {
                if (key != 'PATHOGEN_NAME' && d[key] != null) {
                    d[key] = +d[key];
                }
            }
        });

        _.sortBy(DATA, 'YEAR');
        DATA.reverse();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

var createColorScale = function() {
    var yearExtent = d3.extent(COL_DATA, function(d) {
        return +d['YEAR'];
    });

    globalColorScale = d3.scale.linear()
        .domain(yearExtent)
        .range([COLORS['blue2'], COLORS['yellow3']]);
};

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

    // Render the charts!
    columnChartFunction = renderColumnChart({
        container: '#column-chart',
        width: document.getElementById('column-chart').getBoundingClientRect().width,
        data: COL_DATA
    });

    renderWorldMap({
        container: '#locator-map',
        width: document.getElementById('locator-map').getBoundingClientRect().width,
        data: geoData,
        pandemicsData: DATA
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
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 2 : 16;
    var aspectHeight = isMobile ? 1 : 5;
    var valueGap = 6;

    var margins = {
        top: 25,
        right: 5,
        bottom: 40,
        left: 30
    };

    var ticksY = 4;
    var roundTicksFactor = 10;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

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
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (isMobile) {
                if (i % 2 == 0) {
                    var yearFull = fmtYearFull(d);
                    var bucketEnd = (parseInt(yearFull) + 4).toString().slice(-2);
                    return '\u2019' + fmtYearAbbrev(d) + '-' + bucketEnd;
                }
            } else {
                var yearFull = fmtYearFull(d);
                var bucketEnd = (parseInt(yearFull) + 4).toString().slice(-2);
                return yearFull + '-' + bucketEnd;
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
        });

    /*
     * Render axes to chart.
     */
    var xAxisRender = chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    xAxisRender.selectAll('text')
        .attr('dy', function(d,i) {
            if (i%2 == 0) {
                return '0.65em';
            } else {
                return '1.7em';
            }
        });

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
     * Render bars to chart.
     */
    var bars = chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('fill', function(d) {
                return globalColorScale(d['YEAR']);
            })
            .attr('class', function(d) {
                //return 'bar bar-' + classify(d[labelColumn]);
                return 'bar';
            })
            .attr('x', function(d) {
                return xScale(d[labelColumn]);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', 0)
            .attr('y', yScale(0))

        bars
            .transition()
                .duration(1000)
            .attr('height', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(d[valueColumn]) - yScale(0);
                }

                return yScale(0) - yScale(d[valueColumn]);
            })
            .attr('y', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(0);
                }

                return yScale(d[valueColumn]);
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value') //HERE
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .attr('class', function(d,i) {
                return 'value-text year-' + d['YEAR'];
            })
            .text(function(d) {
                return d[valueColumn].toFixed(0);
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = 0;

                if (d[valueColumn] < 0) {
                    barHeight = yScale(d[valueColumn]) - yScale(0);

                    if (textHeight + valueGap * 2 < barHeight) {
                        d3.select(this).classed('in', true);
                        return -(textHeight - valueGap / 2);
                    } else {
                        d3.select(this).classed('out', true)
                        return textHeight + valueGap;
                    }
                } else {
                    barHeight = yScale(0) - yScale(d[valueColumn]);

                    if (textHeight + valueGap * 2 < barHeight) {
                        d3.select(this).classed('in', true)
                        return textHeight + valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return -(textHeight - valueGap / 2);
                    }
                }
            })
            .attr('text-anchor', 'middle');

    var updateBars = function(yearIndex) {
        if(yearIndex || yearIndex === 0) {
            var yearAmt = COL_DATA[yearIndex]['amt'];
            fakeData[yearIndex]['amt'] = yearAmt;
        }

        bars.data(fakeData)
            .attr('x', function(d) {
                return xScale(d[labelColumn]);
            })
            .attr('width', xScale.rangeBand())
            .attr('class', function(d) {
                return 'bar bar-' + d[labelColumn];
            })
            .transition()
                .attr('y', function(d) {
                    if (d[valueColumn] < 0) {
                        return yScale(0);
                    }
                    return yScale(d[valueColumn]);
                })
                .attr('height', function(d) {
                    if (d[valueColumn] < 0) {
                        return yScale(d[valueColumn]) - yScale(0);
                    }

                    return yScale(0) - yScale(d[valueColumn]);
                });

    }

    return { updateBars:updateBars };
}

var renderWorldMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 1.92;
    var aspectHeight = 1;

    var defaultScale = 95;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);
    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;

    /*
     * Extract topo data.
     */
    var mapData = {};
    if (config['data']) {
        for (var key in config['data']['objects']) {
            mapData[key] = topojson.feature(config['data'], config['data']['objects'][key]);
        }
    } else {
        return false;
    }

    /*
     * Create the map projection.
     */
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / DEFAULT_WIDTH;

    var projection = d3.geo.miller()
        .scale(mapScale)
        .translate([ mapWidth / 2 * 0.97, mapHeight / 2 * 1.27 ]);

    path = d3.geo.path()
        .projection(projection);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartElement = containerElement.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')
        .attr('transform', 'translate(0,0)');

    /*
     * Render countries.
     */
    chartElement.append('g')
        .attr('class', 'countries')
        .selectAll('path')
            .data(mapData['countries']['features'])
            .enter()
                .append('path')
                .attr('d', path)
                .attr('class', function(d) {
                    return 'country-' + d['id'];
                });

    /*
     * Render pandemics
     */
    var radius = d3.scale.sqrt()
        .domain([0, 15])
        .range([0, 20 * scaleFactor]);

    var pandemics = chartElement.append('g')
        .attr('class', 'pathogens');

    pandemics.selectAll('circle')
        .data(config['pandemicsData'])
        .enter()
            .append('circle')
                .attr('transform', function(d) {
                    var centroid = [ d['Longitude'], d['Latitude'] ];
                    return 'translate(' + projection(centroid) + ')'; }
                )
                .attr('stroke', function(d) {
                    return globalColorScale(d['YEAR']);
                })
                .attr('fill', function(d) {
                    return globalColorScale(d['YEAR']);
                })
                .attr('fill-opacity', dotOpacity)
                .attr('r', function(d, i) {
                    return dotRadius;
                })
                .attr('class', function(d, i) {
                    var c = classify(d['PATHOGEN_NAME']);
                    return c + ' year-' + d['YEAR'];
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

// Global config
var GEO_DATA_URL = 'us-states.json';

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;
var scaleKey = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadJSON()
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
 * Load graphic data from a CSV.
 */
var loadJSON = function() {
    d3.json(GEO_DATA_URL, function(error, data) {
        geoData = data;

        // recast population figures as numbers
        DATA.forEach(function(d, i) {
            if (d['latitude'] != null) {
                d['latitude'] = +d['latitude'];
            }
            if (d['longitude'] != null) {
                d['longitude'] = +d['longitude'];
            }
            if (d['amt_billions'] != null) {
                d['amt_billions'] = +d['amt_billions'];
            }
        });

        DATA = DATA.sort(function(a, b){
            return d3.descending(a['amt_billions'], b['amt_billions']);
        });

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
    });
}


/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var gutterWidth = 22;
    var headerWidth = null;
    var mapWidth = null;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        scaleKey = [ 40, 120 ];
        mapWidth = containerWidth;
    } else {
        isMobile = false;
        scaleKey = [ 50, 120 ];
        mapWidth = Math.floor((containerWidth - gutterWidth) * .65);
        headerWidth = Math.floor((containerWidth - gutterWidth) * .35);
    }

    d3.select('.header')
        .attr('style', function() {
            var s = '';
            if (!isMobile) {
                s += 'width: ' + headerWidth + 'px; ';
                s += 'float: left; ';
            }
            return s;
        });
    d3.select('#graphic')
        .attr('style', function() {
            var s = '';
            if (!isMobile) {
                s += 'width: ' + mapWidth + 'px; ';
                s += 'float: right; ';
            }
            return s;
        });

    // Render the map!
    renderUSAMap({
        container: '#graphic',
        width: mapWidth,
        geoData: geoData,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderUSAMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 3;
    var aspectHeight = 1.95;
    var defaultScale = 820;

    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;

    var dataColumn = 'amt_billions';

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    /*
     * Extract topo data.
     */
    var mapData = config['geoData']['features'];

    /*
     * Create the map projection.
     */
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / DEFAULT_WIDTH;

    projection = d3.geo.albersUsa()
        .scale(mapScale) // zoom level or size
        .translate([ mapWidth / 2, mapHeight / 2 ]);

    path = d3.geo.path()
        .projection(projection);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')
        .attr('transform', 'translate(0,0)');

    /*
     * Render countries.
     */
    // Land outlines
    chartElement.append('g')
        .attr('class', 'states')
        .selectAll('path')
            .data(mapData)
            .enter()
                .append('path')
                .attr('d', path)
                .attr('class', function(d) {
                    return 'state-' + classify(d['properties']['name']);
                });

    // draw population circles
    var radius = d3.scale.sqrt()
        .domain([0, 120])
        .range([1, 35 * scaleFactor]);

    var initiatives = chartElement.append('g')
        .attr('class', 'initiatives');

    initiatives.selectAll('circle')
        .data(config['data'])
        // .data(config['data'].filter(function(d, i) {
        //    return d[dataColumn] != null;
        // }))
        .enter()
            .append('circle')
                .attr('transform', function(d,i) {
                    var centroid = [ d['longitude'], d['latitude'] ];
                    return 'translate(' + projection(centroid) + ')'; }
                )
                .attr('r', function(d, i) {
                    if (d[dataColumn] != null) {
                        return radius(d[dataColumn]);
                    } else {
                        return radius(.2);
                    }
                })
                .attr('class', function(d, i) {
                    var c = classify(d['city']);
                    if (d[dataColumn] == null) {
                        c += ' empty';
                    }
                    return c;
                })
                .on('mouseover', function(d, i) {
                    var t = d3.select(this);
                    var centroid = projection([ t.datum()['longitude'], t.datum()['latitude'] ]);
                    var r = +t.attr('r');
                    var tooltipWidth = 112;

                    t.classed('active', true);
                    tooltip.classed('active', true)
                        .html(function() {
                            var tText = d['city'];
                            if (d[dataColumn]) {
                                tText += ': $';

                                if (d[dataColumn] < 1) {
                                    tText += d[dataColumn].toFixed(2)
                                } else {
                                    tText += d[dataColumn].toFixed(1)
                                }

                                tText += ' billion';

                                if (d['tax_duration']) {
                                    tText += ' over ' + d['tax_duration'] + ' years';
                                }
                            }
                            return tText;
                        })
                        .attr('style', function() {
                            var topPos = centroid[1] + r;
                            var leftPos = centroid[0] + r;
                            if ((leftPos + tooltipWidth) > mapWidth) {
                                leftPos = centroid[0] - r - tooltipWidth;
                            }

                            var s = '';
                            s += 'top: ' + topPos + 'px; '
                            s += 'left: ' + leftPos + 'px; '
                            return s;
                        });
                })
                .on('mouseout', function(d, i) {
                    var t = d3.select(this);
                    t.classed('active', false);
                    tooltip.classed('active', false);
                });

    // add city annotations
    var cityLabels = chartElement.append('g')
        .attr('class', 'city-labels');
    var citiesShown = config['data'].filter(function(d,i) {
        return d[dataColumn] >= 10;
    });
    citiesShown.forEach(function(d,i) {
        var cLabel = d['city'];
        var centroid = projection([ d['longitude'], d['latitude'] ]);
        var cBubble = initiatives.select('.' + classify(d['city']));
        var cRadius = +cBubble.attr('r');

        cityLabels.append('text')
            .text(cLabel)
            .attr('x', centroid[0])
            .attr('y', centroid[1])
            .attr('dy', 4)
            .call(wrapText, (cRadius * 2) + 10, 12);

        cBubble.classed('highlight', true);
    })

    // add scale
    var scaleDots = chartElement.append('g')
        .attr('class', 'key');

    scaleKey.forEach(function(d, i) {
        scaleDots.append('circle')
            .attr('r', radius(d))
            .attr('cx', mapWidth - radius(scaleKey[1]) - 2)
            .attr('cy', mapHeight - radius(d) - 1);

        scaleDots.append('text')
            .attr('x', mapWidth - radius(scaleKey[1]) - 2)
            .attr('y', mapHeight - (radius(d) * 2))
            .attr('dy', function() {
                if (isMobile) {
                    return 7;
                } else {
                    return 12;
                }
            })
            .text(function() {
                return '$' + fmtComma(d) + 'B';
            });
    })

    // add tooltip
    var tooltip = chartWrapper.append('div')
        .attr('id', 'tooltip');
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

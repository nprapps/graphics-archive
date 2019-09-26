// Global config
var GEO_DATA_URL = 'ne_50m_admin.json';
// var US_DATA_URL = 'data/us-10m.json';

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;
var dataIndexed = [];

var curveoffset = 50;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();
        loadGeoData();
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
 * Format data for D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        var id = d['flight'];
        if (d['amt'] != null) {
            d['amt'] = +d['amt'];
        }
        // if (d['lat'] != null) {
        //     d['lat'] = +d['lat'];
        // }
        // if (d['lon'] != null) {
        //     d['lon'] = +d['lon'];
        // }
        if (d['start_lat'] != null) {
            d['start_lat'] = +d['start_lat'];
        }
        if (d['start_lng'] != null) {
            d['start_lng'] = +d['start_lng'];
        }
        if (d['end_lat'] != null) {
            d['end_lat'] = +d['end_lat'];
        }
        if (d['end_lng'] != null) {
            d['end_lng'] = +d['end_lng'];
        }
        dataIndexed[id] = d;
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadGeoData = function() {
    d3.json(GEO_DATA_URL, function(error, data) {
        geoData = data;

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
    renderLocatorMap({
        container: '#world-map',
        width: containerWidth,
        geoData: geoData,
        data: DATA,
        dataIndexed: dataIndexed
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var dataColumn = 'amt';

    var aspectWidth = 1.92;
    var aspectHeight = 1;
    var defaultScale = 275;

    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    /*
     * Extract topo data.
     */
    var topoData = {};

    for (var key in config['geoData']['objects']) {
        topoData[key] = topojson.feature(config['geoData'], config['geoData']['objects'][key]);
    }

    /*
     * Create the map projection.
     */
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / DEFAULT_WIDTH;

    var projection = d3.geo.miller()
        .center([-100,29]) // test to center the map on US, namely texas
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
    chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = containerElement.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')
        .attr('transform', 'translate(0,0)');

    var tooltip = containerElement.append('div')
        .attr('id', 'tooltip');

    /*
     * Render countries.
     */
    // Land outlines
    chartElement.append('g')
        .attr('class', 'countries background')
        .selectAll('path')
            .data(topoData['ne_50m_admin_0_countries_lakes']['features'])
            .enter()
                .append('path')
                .attr('d', path)
                .attr('class', function(d) {
                  return classify(d['properties']['ADM0_A3']);
                });

    // State outlines
    chartElement.append('g')
        .attr('class', 'state boundaries')
        .selectAll('path')
            .data(topoData['ne_50m_admin_1_states_provinces_lines']['features'])
            .enter()
                .append('path')
                .attr('d', path);

    /*
     * Display data on the map
     */
    if (DATA_DISPLAY == 'choropleth') {
        if (DATA_POSITIONING == 'country') {
            // Define color bins
            // You'll probabaly want to change the bins, but here's a starting point.
            var maxValue = d3.max(config['data'], function(d) {
                return d[dataColumn];
            });
            // var colorBins = [ 1, 500, 5000, 10000, 50000 ];
            var colorBins = [ 1,
                              Math.floor(maxValue/3),
                              Math.floor(maxValue/3) * 2,
                              maxValue + 1 ];
            var colorRange = [ '#DDD', COLORS['teal5'], COLORS['teal3'], COLORS['teal1'] ];
            var colorNoData = 'red';
            var colorBinsCount = colorBins.length;
            var colorScale = d3.scale.threshold()
                .domain(colorBins)
                .range(colorRange);

            // Render legend
            var legend = containerElement.insert('ul', ':first-child')
                .attr('class', 'key');

            var legendBins = legend.selectAll('li')
                .data(colorBins)
                .enter().append('li')
                    .attr('class', function(d, i) {
                        return 'key-item key-' + i;
                    });
            legendBins.append('b')
                .style('background-color', function(d,i) {
                    return colorRange[i];
                });
            legendBins.append('label')
                .html(function(d, i) {
                    if (i == 0) {
                        return 'None';
                    } else if (i == (colorBinsCount - 1)) {
                        return '&ge;&nbsp;' + fmtComma(colorBins[i-1]);
                    } else {
                        return fmtComma(colorBins[i-1]) + '-' + fmtComma((colorBins[i] - 1));
                    }
                    return d['key'];
                });

            var legendNoData = legend.append('li')
                .attr('class', 'key-item key-' + colorBinsCount);
            legendNoData.append('b')
                .style('background-color', colorNoData);
            legendNoData.append('label')
                .text('Data not available');

            // Fill in the countries
            var countryWrapper = chartElement.select('.countries')
                .classed('background', false);

            var countries = countryWrapper.selectAll('path')
                .attr('fill', function(d) {
                    var id = d['id'];
                    // Does this country exist in the spreadsheet?
                    if (typeof config['dataIndexed'][id] == 'undefined') {
                        console.log('no data for: ' + id);
                        return colorNoData;
                    // Is it null in the spreadsheet?
                    } else if (config['dataIndexed'][id][dataColumn] == null) {
                        console.log('no data for: ' + config['dataIndexed'][id]['name']);
                        return colorNoData;
                    // Or does it have actual data?
                    } else {
                        return colorScale(config['dataIndexed'][id][dataColumn]);
                    }
                });
        } else {
            console.warn('WARNING: If you want to display data on the map as a choropleth (rather than as a bubble map), data_display must be set to \'country\' in the content spreadsheet. Choropleth display will not work with \'latlon\' data.');
        }
    }
    if (DATA_DISPLAY == 'bubble') {
        // define scale
        var radiusMax = 25 * scaleFactor;
        var rounding = 1000;
        var scaleMax = d3.max(config['data'], function(d) {
            return Math.ceil(d[dataColumn] / rounding) * rounding;
        });
        var scaleMin = Math.floor(scaleMax / 3);

        var radius = d3.scale.sqrt()
            .domain([0, scaleMax])
            .range([0, radiusMax]);

        var scaleKey = [ scaleMin, scaleMax ];


        // draw bg
        // var bg = chartElement.append('g')


        // draw arcs
        var arcs = chartElement.append('g')
            .attr('class', 'arcs')
            .selectAll('path.datamaps-arc')
                // .data(config['data'].filter(function(d, i) {
                //     return d[dataColumn] != null;
                // }).sort(function(a, b) {
                //     return d3.descending(a[dataColumn], b[dataColumn]);
                // }))
                .data(config['data'])
                .enter()
                    .append('path')
                    .attr('class', 'arc')
                    .attr('d', function(d){
                        // http://bl.ocks.org/vigorousnorth/e95a867b10de1239ab3a
                        // if (d['lat'] != null && d['lon'] != null) {

                            var origin = projection([Number(d['start_lng']), Number(d['start_lat'])]);
                            var dest = projection([Number(d['end_lng']), Number(d['end_lat'])]);
                            var mid = [ (origin[0] + dest[0]) / 2, (origin[1] + dest[1]) / 2];

                            //define handle points for Bezier curves. Higher values for curveoffset will generate more pronounced curves.
                            // var curveoffset = 20;
                            var midcurve = [mid[0]+curveoffset, mid[1]-curveoffset]

                            // the scalar variable is used to scale the curve's derivative into a unit vector
                            var scalar = Math.sqrt(Math.pow(dest[0],2) - 2*dest[0]*midcurve[0]+Math.pow(midcurve[0],2)+Math.pow(dest[1],2)-2*dest[1]*midcurve[1]+Math.pow(midcurve[1],2));

                            // move cursor to origin
                            return "M" + origin[0] + ',' + origin[1]
                            // smooth curve to offset midpoint
                                + "S" + midcurve[0] + "," + midcurve[1]
                            //smooth curve to destination
                                + "," + dest[0] + "," + dest[1];
                        // }
                    })
                    .style('stroke-width', function(d) {
                        return 1.5;
                    })
                    ;

        // draw bubbles
        var bubbles = chartElement.append('g')
            .attr('class', 'bubbles')
            .selectAll('circle')
            .data(config['data'])
            .enter();

        // start bubble
        bubbles.append('circle')
            .attr('transform', function(d,i) {
                var id = d['id'];
                var centroid = [ 0, 0 ];
                if (d['start_lat'] != null && d['start_lng'] != null) {
                    centroid = [ d['start_lng'], d['start_lat'] ];
                }
                d['centroid'] = centroid;

                return 'translate(' + projection(centroid) + ')';
            })
            .attr('r', function(d, i) {
                return 1.5;
            })
            .attr('class', 'start');

        // end bubble
        bubbles.append('circle')
            .attr('transform', function(d,i) {
                var id = d['id'];
                var centroid = [ 0, 0 ];
                if (d['start_lat'] != null && d['end_lng'] != null) {
                    centroid = [ d['end_lng'], d['end_lat'] ];
                }
                d['centroid'] = centroid;

                return 'translate(' + projection(centroid) + ')';
            })
            .attr('r', function(d, i) {
                return 1.5;
            })
            .attr('class', 'end')
    }
}

/*
 * Move a set of D3 elements to the front of the canvas.
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

// calculate optimal x/y tooltip position
var calculateXPos = function(xPos, width, graphicWidth) {
    var newXPos = null;
    var offset = 5;
    var ttWidth = xPos + offset + width;
    if (ttWidth > graphicWidth) {
        newXPos = xPos - width - offset;
    } else {
        newXPos = xPos + offset;
    }
    return newXPos;
}
var calculateYPos = function(yPos, height, graphicHeight) {
    var newYPos = null;
    var offset = 5;
    var ttHeight = yPos + offset + height;
    if (ttHeight > graphicHeight) {
        newYPos = yPos - height - offset;
    } else {
        newYPos = yPos + offset;
    }
    return newYPos;
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

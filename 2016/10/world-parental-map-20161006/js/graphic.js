// Global config
// var GEO_DATA_URL = 'data/world-110m.json';
var GEO_DATA_URL = 'data/world-topo.json';

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;
var dataIndexed = [];
var colorBins = [];

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
        var id = null;
        if (d['id'] != null) {
            id = d['id'].toLowerCase();
        }
        // if (d['amt'] != null) {
        //     d['amt'] = +d['amt'];
        // }
        if (d['lat'] != null) {
            d['lat'] = +d['lat'];
        }
        if (d['lon'] != null) {
            d['lon'] = +d['lon'];
        }
        dataIndexed[id] = d;
    });

    colorBins = _.pluck(DATA, 'amt');
    colorBins = _.uniq(colorBins);
    colorBins = colorBins.filter(function(d) {
        return d != null;
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
    var defaultScale = 95;

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

    // console.log(topojson.feature(config['geoData'], config['geoData']['objects']['world-geo']));
    for (var key in config['geoData']['objects']) {
        topoData[key] = topojson.feature(config['geoData'], config['geoData']['objects'][key]);
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
    chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = containerElement.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')
        .attr('transform', 'translate(0,0)');

    /*
     * Render countries.
     */
    // Land outlines
    chartElement.append('g')
        .attr('class', 'countries background')
        .selectAll('path')
            .data(topoData['world-geo']['features'])
            .enter()
                .append('path')
                .attr('d', path)
                .attr('class', function(d) {
                    var id = d['id'].toLowerCase();
                    var adm_id = d['properties']['ADM0_A3'].toLowerCase();
                    var c = 'country-' + id;
                    if (id != adm_id) {
                        c += ' country-' + adm_id;

                        // console.log(id, adm_id);

                        if (_.contains([ 'BEL', 'BIH', 'IOT', 'GBR', 'FLK', 'PSX', 'GIB', 'IRQ', 'NOR', 'KOS', 'PRT', 'UMI', 'NLD', 'CYN', 'PNG', 'SRB', 'SOM', 'SOL', 'SYR', 'TWN', 'SAH', 'TZA', 'GEO', 'KOR', 'PRK', 'USG' ], d['properties']['ADM0_A3'])) {
                            d['id'] = d['properties']['ADM0_A3'];
                        }
                    }
                    return c;
                });

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
            var colorRange = [ COLORS['teal3'], COLORS['teal3'], COLORS['teal5'], COLORS['orange4'] ];
            var colorNoData = '#EEE';
            var colorBinsCount = colorBins.length;
            var colorScale = d3.scale.threshold()
                .domain(colorBins)
                .range(colorRange);
            // console.log('bins: ' + colorBins);
            // console.log('range: ' + colorScale.range());
            // console.log('domain: ' + colorScale.domain());

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
                .style('background-color', function(d, i) {
                    // console.log(d, colorScale(d), colorScale.range()[i]);
                    return colorScale(d);
                });
            legendBins.append('label')
                .html(function(d, i) {
                    return d;
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
                    var id = d['id'].toLowerCase();
                    // Does this country exist in the spreadsheet?
                    if (typeof config['dataIndexed'][id] == 'undefined') {
                        // console.log('no data for: ' + id);
                        return colorNoData;
                    // Is it null in the spreadsheet?
                    } else if (config['dataIndexed'][id][dataColumn] == null) {
                        // console.log('no data for: ' + config['dataIndexed'][id]['name']);
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
}

/*
 * Move a set of D3 elements to the front of the canvas.
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

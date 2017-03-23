// Global config
var GEO_DATA_URL = 'world-110m.json';
var scaleKey = [ 5, 15 ];

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadJSON();
    } else {
        pymChild = new pym.Child({});
    }
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
                if (key != 'ECOSYSTEM_NAME' && d[key] != null) {
                    d[key] = +d[key];
                }
            }
        });

        _.sortBy(DATA, 'PRODUCTIVITY_TREND');
        DATA.reverse();

        pymChild = new pym.Child({
            renderCallback: render
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
    renderWorldMap({
        container: '#locator-map',
        width: containerWidth,
        data: geoData,
        fisheryData: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
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

    for (var key in config['data']['objects']) {
        mapData[key] = topojson.feature(config['data'], config['data']['objects'][key]);
        // console.log(mapData[key]);
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
     * Render fisheries
     */
    var radius = d3.scale.sqrt()
        .domain([0, 15])
        .range([0, 20 * scaleFactor]);

    var populations = chartElement.append('g')
        .attr('class', 'populations');

    populations.selectAll('circle')
        .data(config['fisheryData'].filter(function(d, i) {
           return d['PRODUCTIVITY_TREND'] != null;
        }))
        .enter()
            .append('circle')
                .attr('transform', function(d) {
                    var centroid = [ d['Longitude'], d['Latitude'] ];
                    return 'translate(' + projection(centroid) + ')'; }
                )
                .attr('r', function(d, i) {
                    if (d['PRODUCTIVITY_TREND'] != null) {
                        return radius(Math.abs(d['PRODUCTIVITY_TREND']));
                    } else {
                        return radius(0);
                    }
                })
                .attr('class', function(d, i) {
                    var c = classify(d['ECOSYSTEM_NAME']);
                    if (d['PRODUCTIVITY_TREND'] < 0) {
                        c += ' negative';
                    } else {
                        c += ' positive';
                    }
                    return c;
                });

        // add scale
        var scaleDots = chartElement.append('g')
            .attr('class', 'key')
            .attr('transform', function(d) {
                var coords = [ 0, (mapHeight - (radius(scaleKey[0]) * 2) - 50) ];
                if (isMobile) {
                    coords = [ 8, (mapHeight - (radius(scaleKey[0]) * 2) - 50) ];
                }
                return 'translate(' + coords + ')';
            });

        scaleDots.append('text')
            .attr('x', radius(scaleKey[0]) * 2)
            .attr('y', 10)
            .text('Magnitude');
        scaleDots.append('text')
            .attr('x', radius(scaleKey[0]) * 2)
            .attr('y', 22)
            .text('of change');

        scaleKey.forEach(function(d, i) {
            scaleDots.append('circle')
                .attr('r', radius(d))
                .attr('cx', radius(scaleKey[0]) * 2)
                .attr('cy', radius(d) + 1 + 25);

            scaleDots.append('text')
                .attr('x', radius(scaleKey[0]) * 2)
                .attr('y', (radius(d) * 2) + 25)
                .attr('dy', function() {
                    if (isMobile) {
                        return -2;
                    } else {
                        return -5;
                    }
                })
                .text(function() {
                    return d.toFixed(0) + '%';
                });
        })
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

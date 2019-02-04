/* TODO:
 - state labels for visited states?
*/

// Global config
var GEO_DATA_URL = 'data/us-states.json';

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;
var statesToLabel = [];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadJSON()
    } else {
        pymChild = new pym.Child({});

        pymChild.onMessage('liveblog', function(isLiveblog) {
            if (isLiveblog == 'true') {
                d3.select('body').classed('liveblog', true);
            } else {
                d3.select('body').classed('liveblog', false);
            }
        });

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

        statesToLabel = _.uniq(_.pluck(STOPS, 'state'));

        pymChild = new pym.Child({
            renderCallback: render
        });

        pymChild.onMessage('liveblog', function(isLiveblog) {
            if (isLiveblog == 'true') {
                d3.select('body').classed('liveblog', true);
            } else {
                d3.select('body').classed('liveblog', false);
            }
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
        container: '#locator-map',
        width: containerWidth,
        data: geoData,
        statesToLabel: statesToLabel,
        pixelOffset: [0, 0]
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
    var chartWrapper = null;
    var chartElement = null;

    var aspectWidth = 2;
    var aspectHeight = 1.1;
    var cityDotRadius = 2;
    var defaultScale = 350;
    var mapProjection = null;
    var path = null;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((mapWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Extract topo data.
     */
    var mapData = {};

    for (var key in config['data']['objects']) {
        mapData[key] = topojson.feature(config['data'], config['data']['objects'][key]);
    }

    /*
     * Create the map projection.
     */
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var pixelOffset = config['pixelOffset'] || [0, 0];

    mapProjection = d3.geo.albersUsa()
        .scale(mapScale)
        .translate([ pixelOffset[0] + mapWidth/2, pixelOffset[1] + mapHeight/2 ]);

    path = d3.geo.path()
        .projection(mapProjection);

    /*
     * Create the root SVG element.
     */
    chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    chartElement = chartWrapper.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')

    /*
     * Render states.
     */
    // Land outlines
    chartElement.append('g')
        .attr('class', 'states')
        .selectAll('path')
            .data(config['data']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                var thisState = d['properties']['name'];
                var c = 'fips-' + d['id'] + ' ' + classify(d['properties']['name']);
                if (typeof STATES[thisState] != 'undefined') {
                    c += ' visited-' + STATES[thisState]['visited'];
                }
                return  c;
            })
            .attr('d', path);

    d3.selectAll('.states path.visited-yes')
        .moveToFront();

    /*
     * Render state labels.
     */
    statesToLabel = config['statesToLabel'];

    /*
     * Render city dots
     */
    var cities = chartElement.append('g')
        .attr('class', 'cities')
        .selectAll('circle')
            .data(STOPS)
            .enter()
                .append('circle')
                    .attr('transform', function(d,i) {
                        var id = classify(d['city'] + ' ' + d['state']);
                        var centroid = [ 0, 0 ];

                        if (d['lat'] != null && d['lon'] != null) {
                            centroid = [ +d['lon'], +d['lat'] ];
                        }

                        return 'translate(' + mapProjection(centroid) + ')';
                    })
                    .attr('r', cityDotRadius)
                    .attr('class', function(d, i) {
                        return 'place ' + classify(d['city'] + ' ' + d['state']);
                    });
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

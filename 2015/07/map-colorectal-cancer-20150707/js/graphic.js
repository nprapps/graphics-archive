// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var GEO_DATA_URL = 'data/geodata.json';

var LABEL_DEFAULTS = {
    'text-anchor': 'start',
    'dx': '6',
    'dy': '4'
}

// Global vars
var pymChild = null;
var isMobile = false;
var isRendered = false;
var geoData = null;
var cancerData = [];

// Map vars
var aspectWidth = 2;
var aspectHeight = 1.2;
var path = null;
var projection = null;
var defaultScale = 800;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        /*
         * Original plan: Draw all counties and then loop through to decide which to turn on.
         * Current plan: Use QGIS to extract only hotspot counties and save smaller shapefile.
         */
//         formatData();
        loadJSON('data/geodata.json')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a CSV.
 */
var loadJSON = function(url) {
    d3.json(url, function(error, data) {
        geoData = data;

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    _.each(MAP_DATA, function(d) {
        var fips = d['fips_text'];
        cancerData[fips] = { 'county': d['NAMELSAD10'],
                             'state': d['StateName'],
                             'fips': d['fips_text'],
                             'hotspot': d['HotspotNum'] };
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

    // Render the chart!
    if (!isRendered) {
        renderLocatorMap({
            container: '#graphic',
            width: containerWidth,
            data: geoData
        });
    } else {
        resizeLocatorMap({
            container: '#graphic',
            width: containerWidth
        });
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var bbox = config['data']['bbox'];
    var defaultScale = 800;
    var cityDotRadius = 3;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var chartWrapper = null;
    var chartElement = null;

    /*
     * Extract topo data.
     */
    var mapData = {};

    for (var key in config['data']['objects']) {
        mapData[key] = topojson.feature(config['data'], config['data']['objects'][key]);
//         console.log(key, mapData[key]);
    }

    /*
     * Create the map projection.
     */
    var centroid = [((bbox[0] + bbox[2]) / 2), ((bbox[1] + bbox[3]) / 2)];
    var mapScale = (mapWidth / GRAPHIC_DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / GRAPHIC_DEFAULT_WIDTH;

    projection = d3.geo.albersUsa()
        .scale(mapScale)
        .translate([ mapWidth/2, mapHeight/2 ]);

    path = d3.geo.path()
        .projection(projection);

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
     * Render landmass
     */
    chartElement.append('g')
        .attr('class', 'landmass')
        .selectAll('path')
            .data(mapData['states']['features'])
        .enter().append('path')
            .attr('d', path);

    /*
     * Render counties.
     */
    chartElement.append('g')
        .attr('class', 'counties')
        .selectAll('path')
            .data(mapData['counties']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                var fips = d['id'];
                var c = 'c-' + fips;
//                 if (cancerData[fips] != undefined) {
//                     c += ' active';
//                 }
                return c;
            })
            .attr('d', path);

    /*
     * Render state outlines
     */
    chartElement.append('g')
        .attr('class', 'states')
        .selectAll('path')
            .data(mapData['states']['features'])
        .enter().append('path')
            .attr('d', path);
    
    isRendered = true;
}


/*
 * Update a map that's already been drawn to the page
 */
var resizeLocatorMap = function(config) {
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((mapWidth * aspectHeight) / aspectWidth);
    var mapScale = (mapWidth / GRAPHIC_DEFAULT_WIDTH) * defaultScale;
    
    var svg = d3.select(config['container'] + ' svg');

    projection.scale(mapScale)
        .translate([ mapWidth/2, mapHeight/2 ]);

    path.projection(projection);

    svg.attr('width', mapWidth)
        .attr('height', mapHeight)
        .selectAll('path')
            .attr('d', path);
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

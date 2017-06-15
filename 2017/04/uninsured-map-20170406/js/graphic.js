// Global config
var GEO_DATA_URL = 'data/geodata.json';

// Global vars
var pymChild = null;
var isMobile = false;
var isRendered = false;
var geoData = null;
var rateData = [];
var colorBins = [ 0, 5, 10, 15, 20, 25, 50 ];
var colorRange = [ '#ddd', COLORS['orange6'], COLORS['orange5'], COLORS['orange4'], COLORS['orange3'], COLORS['orange2'], COLORS['orange1'] ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();
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
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    _.each(DATA, function(d) {
        var fips = d['fips'];
        switch(fips) {
            case '46102': // Shannon/Oglala Lakota, S.D.
                fips = 46113;
                break;
            case '02158': // Wade Hampton/Kusilvak
                fips = '02270';
                break;
        }
        rateData[fips] = { 'fips': fips,
                           'uninsured': +d['pctui'] };
    });
    loadJSON();
}

/*
 * Load graphic data from a CSV.
 */
var loadJSON = function() {
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

    renderKey({ container: '#locator-map' });

    // Render the chart!
    renderLocatorMap({
        container: '#locator-map',
        width: containerWidth,
        data: geoData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderKey = function(config) {
    var legendWrapper = d3.select('.key-wrap');
    var legendElement = legendWrapper.select('.key')
        .html('');

    var legendBins = [];
    _.each(colorBins, function(d,i) {
        switch(i) {
            case 0:
                legendBins.push('');
                legendBins.push(d + '%');
                break;
            case (colorBins.length - 2):
                legendBins.push(d + '+');
                break;
            case (colorBins.length - 1):
                break;
            default:
                legendBins.push(d);
                break;
        }
    });

    var colorScale = d3.scale.ordinal()
        .domain(legendBins)
        .range(colorRange);

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true);

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(key);

        // // Add the optional upper bound label on numeric scale
        // if (LABELS['max_label'] && LABELS['max_label'] !== '') {
        //     keyItem.append('label')
        //         .attr('class', 'end-label')
        //         .text(LABELS['max_label']);
        // }
    });
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 2;
    var aspectHeight = 1.2;

    var bbox = config['data']['bbox'];
    var defaultScale = 800;
    var cityDotRadius = 3;

    var colorScale = d3.scale.threshold()
        .domain(colorBins)
        .range(colorRange);

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

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
    }

    /*
     * Create the map projection.
     */
    var centroid = [((bbox[0] + bbox[2]) / 2), ((bbox[1] + bbox[3]) / 2)];
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / DEFAULT_WIDTH;

    projection = d3.geo.albersUsa()
        .scale(mapScale)
        .translate([ mapWidth/2, mapHeight/2 ]);

    path = d3.geo.path()
        .projection(projection)
        .pointRadius(cityDotRadius * scaleFactor);

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
     * Render counties.
     */
    chartElement.append('g')
        .attr('class', 'counties')
        .selectAll('path')
            .data(mapData['counties']['features'])
        .enter().append('path')
            .attr('class', function(d, i) {
                return 'c-' + d['id'];
            })
            .attr('fill', function(d) {
                var fips = d['id'];
                if (typeof rateData[fips] != 'undefined') {
                    return colorScale(rateData[fips]['uninsured']);
                } else {
                    // console.log('no data: ' + fips);
                }
            })
            .attr('d', path)
            .on('mouseover', function(d) {
                var fips = d['id'];
                console.log(fips, rateData[fips]['uninsured']);
            });

    /*
     * Render state outlines
     */
    chartElement.append('g')
        .attr('class', 'states')
        .selectAll('path')
            .data(mapData['states']['features'])
        .enter().append('path')
            .attr('d', path)
            .attr('class', function(d) {
                var c = classify(d['id'])
                var st = d['id'].toLowerCase();
                if (typeof MEDICAID[st] != 'undefined') {
                    c += ' expanded';
                }
                return c;
            });
    chartElement.selectAll('.states .expanded').moveToFront();

    isRendered = true;
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

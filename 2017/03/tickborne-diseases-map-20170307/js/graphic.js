// Global config
var GEO_DATA_URL = 'us-states.json';
var diseases = [ 'Ehrlichiosis', 'Anaplasmosis', 'Babesiosis' ];
// var diseases = [ 'Lyme', 'Ehrlichiosis', 'Anaplasmosis', 'Babesiosis' ];



// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;
var colorData = null;

var color_bins = [1, 10, 100, 250, 500, 1000];
var legend_labels = ['10', '100', '250', '500'];
// var color_range = [ '#fff', '#eee', COLORS['teal5'], COLORS['teal4'], COLORS['teal3'], COLORS['teal2'], COLORS['teal1'] ];
// var color_range = [ '#fff', '#eee', COLORS['teal5'], COLORS['teal4'], COLORS['teal3'], COLORS['teal2'], COLORS['teal1'] ];
var color_bins_count = color_bins.length;
var color_range = ['#fff', '#c5dbdb', '#7eb7b6', '#348b8a', '#146e6c'];

//Create color scale
var colorScale = d3.scale.threshold()
    .domain(color_bins) // bins
    .range(color_range); // color palette

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
    var graphicWidth = null;
    var gutterWidth = 22;

    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
    }

    // Render the charts!
    diseases.forEach(function(d, i) {
        renderLocatorMap({
            container: '#map-' + d,
            width: graphicWidth,
            data: geoData,
            map: d
        });
    });

    //Legend
    // Create legend
    var mapWrapper = d3.select('.map-wrapper');
    var legendWrapper = mapWrapper.select('.key-wrap');
    var legendElement = mapWrapper.select('.key');

    legendElement.html('');

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item key-item-' + i, true);

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .attr('class', 'end-label')
            .text(legend_labels[i]);
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
    var aspectWidth = 2;
    var aspectHeight = 1.2;

    var bbox = config['data']['bbox'];
    var defaultScale = 750;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['map']);

    containerElement.append('p')
        .attr('class', 'origin-year')
        .text(function() {
            var mapInfo = config['map'];
            var mapYear = classify(mapInfo) + '_year';
            var mapLoc = classify(mapInfo) + '_origin';
            return 'First reported: ' + LABELS[mapLoc] + ' (' + LABELS[mapYear] + ')';
        });

    containerElement.append('p')
        .attr('class', 'yearly-avg')
        .text(function() {
            var mapInfo = config['map'];
            var mapAvg = classify(mapInfo) + '_avg';
            return 'Five-year average: ' + LABELS[mapAvg] + ' cases per year';
        });

    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;


    /*
     * Create the map projection.
     */
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / DEFAULT_WIDTH;

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
     * Render countries.
     */
    chartElement.append('g')
        .attr('class', 'states ' + classify(config['map']))
        .selectAll('path')
            .data(config['data']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                return 'fips-' + d['id'] + ' ' + classify(d['properties']['name']);
            })
            .attr('d', path);

    //Fill based on bucket
    _.each(DATA, function(d, i) {
        chartElement.select('.states .' + classify(d['State']))
            .attr('fill', function() {
                // console.log(d['State'], +d[config['map']], colorScale(+d[config['map']]));
                return colorScale(+d[config['map']]);
            });
    });
};

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

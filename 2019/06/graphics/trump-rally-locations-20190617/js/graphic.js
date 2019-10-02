/* TODO:
 - state labels for visited states?
*/

// Global config
var GEO_DATA_URL = 'data/us-states.json';

var LABEL_DEFAULTS = {
    'text-anchor': 'start',
    'dx': '6',
    'dy': '4'
}

var CITY_LABEL_ADJUSTMENTS = {
    'Billings': { 'text-anchor': 'end', 'dx': -6, 'dy': 10 },
    'Charlotte': { 'dy': 10 },
    'Evansville': { 'text-anchor': 'end', 'dx': -6, 'dy': -4 },
    'Fargo': { 'text-anchor': 'end', 'dx': -6 },
    'Great Falls': { 'dy': -4 },
    'Johnson City': { 'text-anchor': 'end', 'dx': -6, 'dy': 10 },
    'Missoula': { 'text-anchor': 'end', 'dx': -6, 'dy': -4 },
    'Rochester': { 'text-anchor': 'end', 'dx': -6, 'dy': -4 },
    'Springfield': { 'text-anchor': 'end', 'dx': -6, 'dy': 10 },
    'Topeka': { 'text-anchor': 'end', 'dx': -6, 'dy': -4 },
    'Wheeling': { 'dy': -4 }
}

var COUNTRY_LABEL_ADJUSTMENTS = {
    'Nepal': { 'text-anchor': 'end', 'dx': -50, 'dy': -20 },
    'Bangladesh': { 'text-anchor': 'end', 'dx': -10 }
}

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

        // renderLegend();

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

var renderLegend = function() {
    // Define legend categories
    var scaleCategories = [];
    if (LEGEND['legend_labels'] && LEGEND['legend_labels'] !== '') {
        // If custom legend labels are specified
        var legendLabels = LEGEND['legend_labels'].split(',');
        _.each(legendLabels, function(label) {
            scaleCategories.push(label.trim());
        });
    }

    // Create legend
    var legendWrapper = d3.select('.key-wrap');
    var legendElement = d3.select('.key');

    var colorScale = d3.scale.ordinal()
        .domain(scaleCategories)
        .range([ COLORS['teal6'], COLORS['teal5'], COLORS['teal4'], COLORS['teal3'], COLORS['teal2'], COLORS['teal1'] ]);

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .attr('class', function() {
                key = +key;

                var c = 'key-item';
                if (key < 0) {
                    c += ' d margin-' + Math.abs(key);
                } else {
                    c += ' r margin-' + Math.abs(key);
                }
                return c;
            });

        keyItem.append('b');
            // .style('background', colorScale(key));

        var itemLabel = key;
        if (key == 15){
        //(i == 0) {

            itemLabel = key + '+';
        }
        keyItem.append('label')
            .text(itemLabel);

        // Add the optional upper bound label on numeric scale
        if (i == scaleCategories.length - 1) {
            if (LEGEND['max_label'] && LEGEND['max_label'] !== '') {
                keyItem.append('label')
                    .attr('class', 'end-label')
                    .text(LEGEND['max_label']);
            }
        }
    });
};

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
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

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
                var t = d3.select(this);
                var thisState = d['properties']['name'];
                var c = 'fips-' + d['id'] + ' ' + classify(d['properties']['name']);
                if (typeof STATES[thisState] != 'undefined') {
                    c += ' winner-' + STATES[thisState]['winner'];
                    c += ' visited-' + STATES[thisState]['visited'];
                    c += ' ' + classify(STATES[thisState]['cook-rating']);
                }
                return  c;
            })
            .attr('d', path);

    // d3.select('.countries path.' + primaryCountryClass)
    //     .moveToFront()
    //     .classed('primary ' + primaryCountryClass, true);

    /*
     * Apply adjustments to label positioning.
     */
    var positionLabel = function(adjustments, id, attribute) {
        if (adjustments[id]) {
            if (adjustments[id][attribute]) {
                return adjustments[id][attribute];
            } else {
                return LABEL_DEFAULTS[attribute];
            }
        } else {
            return LABEL_DEFAULTS[attribute];
        }
    }

    /*
     * Render state labels.
     */
    statesToLabel = config['statesToLabel'];

    // chartElement.append('g')
    //     .attr('class', 'country-labels')
    //     .selectAll('.label')
    //         .data(mapData['countries']['features'])
    //     .enter().append('text')
    //         .attr('class', function(d) {
    //             return 'label ' + classify(d['id']);
    //         })
    //         .attr('transform', function(d) {
    //             return 'translate(' + path.centroid(d) + ')';
    //         })
    //         .attr('text-anchor', function(d) {
    //             return positionLabel(COUNTRY_LABEL_ADJUSTMENTS, d['id'], 'text-anchor');
    //         })
    //         .attr('dx', function(d) {
    //             return positionLabel(COUNTRY_LABEL_ADJUSTMENTS, d['id'], 'dx');
    //         })
    //         .attr('dy', function(d) {
    //             return positionLabel(COUNTRY_LABEL_ADJUSTMENTS, d['id'], 'dy');
    //         })
    //         .text(function(d) {
    //             return COUNTRIES[d['properties']['country']] || d['properties']['country'];
    //         });

    // Highlight primary country
    // var primaryCountryClass = classify(config['primaryCountry']);
    //
    // d3.select('.country-labels text.' + primaryCountryClass)
    //     .classed('label primary ' + primaryCountryClass, true);

    /*
     * Render city labels.
     */

    // draw city dots
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
                      var c = 'place ' + classify(d['city'] + ' ' + d['state']);
                      return c;
                    });

    var layers = [
        // 'city-labels shadow',
        // 'city-labels',
        'city-labels shadow primary',
        'city-labels primary'
    ];

    layers.forEach(function(layer) {
        var data = STOPS;

        chartElement.append('g')
            .attr('class', layer)
            .selectAll('.label')
                .data(data)
            .enter().append('text')
                .text(function(d) {
                    // return CITIES[d['properties']['city']] || d['properties']['city'];
                    return d['city'];
                })
                .attr('class', function(d) {
                    var c = 'label';
                    c += ' ' + classify(d['city'] + ' ' + d['state']);
                    if (d['hide_desktop'] == 'yes') {
                        c += ' no-desktop';
                    }
                    if (d['hide_mobile'] == 'yes') {
                        c += ' no-mobile';
                    }
                    return c;
                })
                .attr('transform', function(d) {
                    var centroid = [ 0, 0 ];

                    if (d['lat'] != null && d['lon'] != null) {
                        centroid = [ +d['lon'], +d['lat'] ];
                    }

                    return 'translate(' + mapProjection(centroid) + ')';
                })
                .attr('style', function(d) {
                    return 'text-anchor: ' + positionLabel(CITY_LABEL_ADJUSTMENTS, d['city'], 'text-anchor');
                })
                .attr('dx', function(d) {
                    return positionLabel(CITY_LABEL_ADJUSTMENTS, d['city'], 'dx');
                })
                .attr('dy', function(d) {
                    return positionLabel(CITY_LABEL_ADJUSTMENTS, d['city'], 'dy');
                });
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

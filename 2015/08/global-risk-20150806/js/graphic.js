// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = GRAPHIC_DATA;
var topoData = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        d3.json('world-110m.json', function(data) {
            topoData = data;

            pymChild = new pym.Child({
                renderCallback: render
            });
        })
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Render the graphic.
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

    // Render the map!
    renderGraphic({
        container: '#graphic',
        width: containerWidth,
        mapData: topoData,
        data: graphicData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
    var aspectWidth = 1.92;
    var aspectHeight = 1;

    var defaultScale = 95;

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    var countryRisk = {};

    _.each(graphicData, function(d) {
        countryRisk[d['id']] = d['risk'];
    });

    // Calculate actual chart dimensions
    var mapWidth = config['width'] - margins['left'] - margins['right'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    /*
     * Extract topo data.
     */
    var mapData = {};

    for (var key in config['mapData']['objects']) {
        mapData[key] = topojson.feature(config['mapData'], config['mapData']['objects'][key]);
    }

    /*
     * Create the map projection.
     */
    var mapScale = (mapWidth / GRAPHIC_DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / GRAPHIC_DEFAULT_WIDTH;

    var projection = d3.geo.miller()
        .scale(mapScale)
        .translate([ mapWidth / 2 * 0.97, mapHeight / 2 * 1.27 ]);

    var path = d3.geo.path()
        .projection(projection)

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Scales
    var colorScale = d3.scale.ordinal()
        .domain([ 'Low Risk', 'Medium Risk', 'High Risk', 'Extreme Risk', 'Large, rapidly developing country', 'Unsure / no data' ])
        .range([ '#7ac796', COLORS['yellow4'], '#e99249', COLORS['red3'], '#888', '#ccc' ]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(colorScale.domain())
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
        });

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', mapWidth + margins['left'] + margins['right'])
        .attr('height', mapHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    chartElement.append('g')
        .attr('class', 'countries')
        .selectAll('path')
            .data(mapData['countries']['features'])
            .enter()
                .append('path')
                .attr('d', path)
                .attr('class', function(d) {
                    return 'country-' + d['id'];
                })
                .style('fill', function(d) {
                    var risk = countryRisk[d['id']];

                    if (risk == undefined) {
                        return '#ccc';
                    }

                    return colorScale(risk);
                })
                .style('stroke', function(d) {
                    var risk = countryRisk[d['id']];

                    if (risk == undefined) {
                        return '#ccc';
                    }

                    return '#fff';
                });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

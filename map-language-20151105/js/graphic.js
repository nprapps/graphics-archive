// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = GRAPHIC_DATA;
var totalData = [];
var topoData = null;

var colorBins = [1, 2, 3, 4];
var colorRange = [ COLORS['teal3'], COLORS['teal5'], COLORS['orange5'], COLORS['orange3'], '#000' ];
var colorBinsCount = colorBins.length;

// D3 formatters
var fmtComma = d3.format(',');


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

    // colorScale = d3.scale.threshold()
    //     .domain(colorBins)
    //     .range(colorRange);

    // Render the map!
    renderWorldMap({
        container: '#graphic',
        width: containerWidth,
        mapData: topoData,
        data: graphicData.sort(function(a, b){
            return d3.descending(a['ConsHeavyQuart'], b['ConsHeavyQuart']);
        })
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a world map
 */
var renderWorldMap = function(config) {
    var aspectWidth = 1.92;
    var aspectHeight = 1;

    var defaultScale = 95;

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    // Calculate actual chart dimensions
    var mapWidth = config['width'] - margins['left'] - margins['right'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
//    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

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

    /*
     * Render the HTML legend.
     */
    var colorScale = d3.scale.ordinal()
        .domain(colorBins)
        .range(colorRange);

    // containerElement.append('h3')
    //     .text('Recorded cases per country');
    //
    var legend = containerElement.append('ul')
        .attr('class', 'key');

    var bins = legend.selectAll('li')
        .data(KEY_DATA)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i;
            });

    d3.select('.key-0')
        .append('label')
        .text(function(){
            if (isMobile) {
                return KEY_DATA[0]['label_mobile'];
            } else {
                return KEY_DATA[0]['label'];
            }
        });

    bins.append('b')
        .style('background-color', function(d,i) {
            return colorScale(d['value']);
        });

    d3.select('.key-3')
        .append('label')
        .text(function(){
            if (isMobile) {
                return KEY_DATA[3]['label_mobile'];
            } else {
                return KEY_DATA[3]['label'];
            }
        });

    // var noData = legend.append('li')
    //     .attr('class', 'key-item key-' + colorBinsCount);
    // noData.append('b')
    //     .style('background-color', '#ddd');
    // noData.append('label')
    //     .text('Data not available');

    // Create container
    var mapElement = containerElement.append('svg')
        .attr('width', mapWidth + margins['left'] + margins['right'])
        .attr('height', mapHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    mapElement.append('g')
        .attr('class', 'countries')
        .selectAll('path')
            .data(mapData['countries']['features'])
            .enter()
                .append('path')
                .attr('d', path)
                .attr('class', function(d) {
                    return 'country-' + d['id'];
                });

    // draw dots
    var languageDots = mapElement.append('g')
        .classed('dots', true)
        .selectAll('circle')
            .data(GRAPHIC_DATA)
            .enter()
                .append('circle')
                .attr('class', function(d) {
                    return 'dot dot-' + d['ConsHeavyQuart'];
                })
                .attr('cx', function(d) {
                   var coords = projection([ +d['Long'], +d['Lat'] ]);
                    // var coords = projection([ +d['LapsydLong'], +d['LapsydLat'] ]);
                    return coords[0];
                })
                .attr('cy', function(d) {
                    var coords = projection([ +d['Long'], +d['Lat'] ]);
                    // var coords = projection([ +d['LapsydLong'], +d['LapsydLat'] ]);
                    return coords[1];
                })
                .attr('r', 3 * scaleFactor)
                .attr('fill', function(d) {
                    return colorScale(d['ConsHeavyQuart']);
                });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

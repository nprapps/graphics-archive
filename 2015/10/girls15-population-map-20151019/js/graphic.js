// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = GRAPHIC_DATA;
var topoData = null;
var scaleKey = [ 100000000, 25000000 ];

// D3 formatters
var fmtComma = d3.format(',');


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        d3.json('world-110m.json', function(data) {
            topoData = data;
            
            // recast population figures as numbers
            graphicData.forEach(function(d, i) {
                if (d['population'] != null) {
                    d['population'] = +d['population'];
                }
            });
            
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
    renderWorldMap({
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
                });
    
    
    // draw population circles
    var radius = d3.scale.sqrt()
        .domain([0, 100000000])
        .range([0, 35 * scaleFactor]);

    var populations = chartElement.append('g')
        .attr('class', 'populations');
    
    populations.selectAll('circle')
        .data(graphicData.filter(function(d, i) {
           return d['population'] != null; 
        }))
        .enter()
            .append('circle')
                .attr('transform', function(d) { 
                    var id = d['id'];
                    var country = d3.select('.country-' + id);
                    var centroid = [ 0, 0 ];

                    if (country[0][0] != null) {
                        centroid = d3.geo.centroid(country[0][0]['__data__'])
                        
                        if (d['name'] == 'United States') {
                            centroid = [ -98.579500, 39.828175 ];
                        }
                    }
                    
                    return 'translate(' + projection(centroid) + ')'; }
                )
                .attr('r', function(d, i) {
                    if (d['population'] != null) {
                        return radius(d['population']);
                    } else {
                        return radius(0);
                    }
                })
                .attr('class', function(d, i) {
                    return classify(d['name']);
                });
    
    populations.selectAll('text')
        .data(graphicData.filter(function(d, i) {
           return d['featured'] == 'True'; 
        }))
        .enter()
            .append('text')
                .text(function(d) {
                    return d['name'];
                })
                .attr('transform', function(d) { 
                    var id = d['id'];
                    var country = d3.select('.country-' + id);
                    var centroid = [ 0, 0 ];

                    if (country[0][0] != null) {
                        centroid = d3.geo.centroid(country[0][0]['__data__'])
                        
                        if (d['name'] == 'United States') {
                            centroid = [ -98.579500, 39.828175 ];
                        }
                    }
                    
                    return 'translate(' + projection(centroid) + ')'; }
                )
                .attr('dy', function(d) {
                    if (isMobile) {
                        switch(d['name']) {
                            case 'India':
                                return 11;
                                break;
                            case 'China':
                                return 0;
                                break;
                            default:
                                return 3;
                                break;
                        }
                    } else {
                        switch(d['name']) {
                            case 'India':
                                return 15;
                                break;
                            default:
                                return 5;
                                break;
                        }
                    }
                })
                .attr('class', function(d, i) {
                    return classify(d['name']);
                });
    

    // add scale
    var scaleDots = chartElement.append('g')
        .attr('class', 'key');
    
    scaleKey.forEach(function(d, i) {
        scaleDots.append('circle')
            .attr('r', radius(d))
            .attr('cx', radius(scaleKey[0]) + 1)
            .attr('cy', mapHeight - radius(d) - 1);

        scaleDots.append('text')
            .attr('x', radius(scaleKey[0]))
            .attr('y', mapHeight - (radius(d) * 2))
            .attr('dy', function() {
                if (isMobile) {
                    return 9;
                } else {
                    return 12;
                }
            })
            .text(function() {
                var amt = d / 1000000;
                return amt.toFixed(0) + 'M'; 
            });
    })
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

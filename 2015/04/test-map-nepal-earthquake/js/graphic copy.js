// global vars
var $graphic = null;
var pymChild = null;

var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var isMobile = false;
var initLoad = false;

var MAP_BASE_WIDTH = 960;
var MAP_BASE_HEIGHT = 500;
//var MAP_BASE_SCALE = 160;
var MAP_BASE_SCALE = 6000;
var MAP_CENTROID = [-75.1180329, 40.0047528];
var mapHeight = null;
var mapProjection = null;
var mapScale = null;
var mapWidth = null;

// geo data
var MAP_DATA_URL = 'data.csv';
var TEST_DATA_URL = 'topo.json';
var WORLD_DATA_URL = 'world-110m.json';
var geoTest = null;
var geoLand = null;

var defs;
var feMerge;
var filter;
var path;
var svg;

var color = null;
var color_bins = [10, 25, 100, 175, 250, 500];
var color_range = ['#F5D1CA', '#ECA395', '#E27560', '#D8472B', '#A23520', '#6C2315'];
var color_bins_count = color_bins.length;


// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // load the data
        queue() // load multiple files and wait until they're all loaded to act
            .defer(d3.json, TEST_DATA_URL)
            .defer(d3.json, WORLD_DATA_URL)
            .defer(d3.csv, MAP_DATA_URL)
            .await(ready);
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * RENDER THE GRAPHIC
 */
var ready = function(error, data_test, data_countries, graphic_data) {
    console.log('READY');
    // uncompress topojson into geojson
//    console.log(data_test);
    console.log('data_test original', data_test['objects']['output']['geometries'][0]);
    console.log('data_countries original', data_countries['objects']['land']);

    geoTest = topojson.feature(data_test, data_test['objects']['output']['geometries'][0]);
//    geoTest = data_test['features'][0];
    geoLand = topojson.feature(data_countries, data_countries['objects']['land']);
    console.log('geoTest', geoTest);
    console.log('geoLand', geoLand);
    
    // setup pym
    pymChild = new pym.Child({
        renderCallback: render
    });
}

var render = function(width) {
    // if the map hasn't been initially drawn yet, draw it
    if (!initLoad) {
        draw_map(width);
    // otherwise, the map already exists. update its size.
    } else {
        update_map(width);
    }

    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE MAP
 */
function draw_map(width) {
    console.log('DRAW_MAP');

    $graphic.empty();

    update_dimensions();

    color = d3.scale.threshold()
        .domain(color_bins) // bins
        .range(color_range); // color palette
    
    mapProjection = d3.geo.mercator()
        .scale(mapScale) // zoom level or size
        .center(MAP_CENTROID);
//        .translate([mapWidth/2 * .97, mapHeight/2 * 1.27]);
    
    path = d3.geo.path()
        .projection(mapProjection); // apply projection to the map

    // draw the map
    svg = d3.select('#graphic').append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight);
    
//     var land = svg.append('path')
//         .attr('class', 'land')
//         .datum(geoLand)
//         .attr('d', path)
//         .attr('fill', '#000');

    var testLand = svg.append('g')
        .attr('class', 'test-layer')
        .datum(geoTest)
        .attr('d', path)
        .style('fill', '#ddd')
        .style('stroke', '#fff');
    
    initLoad = true;
}

function update_dimensions() {
//     console.log('UPDATE_DIMENSIONS');
    mapWidth = window.innerWidth;
    mapHeight = Math.ceil(mapWidth * MAP_BASE_HEIGHT / MAP_BASE_WIDTH);
    mapScale = (mapWidth / MAP_BASE_WIDTH) * MAP_BASE_SCALE;
//     console.log(mapWidth,mapHeight,mapScale);
}

function update_map() {
    console.log('UPDATE_MAP');

    update_dimensions();

    projection.scale(mapScale)
        .center(MAP_CENTROID);
//        .translate([mapWidth/2 * .97, mapHeight/2 * 1.27]);
//        .translate([mapWidth/2, mapHeight/2]);

    path.projection(mapProjection);

    svg.attr('width', mapWidth)
        .attr('height', mapHeight)
        .selectAll('path')
            .attr('d', path);

//     svg.selectAll('circle')
//         .attr('transform', function(d) { 
//             return 'translate(' + path.centroid(d) + ')';
//         })
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

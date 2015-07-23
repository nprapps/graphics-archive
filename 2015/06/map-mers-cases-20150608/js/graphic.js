/* TODO
- un-shade french guyana 
- fallback img
- check in with WHO again about data
- reduce map detail
*/


// global vars
var $graphic = null;
var pymChild = null;

var MAP_DEFAULT_WIDTH = 624;
var MAP_DEFAULT_HEIGHT = 325;
var MAP_DEFAULT_SCALE = 100;
var CITY_DOT_RADIUS = 3;
var MOBILE_THRESHOLD = 500;

var COLOR_BINS = [6, 21, 101, 501, 2000];
var COLOR_RANGE = ['#f5d1ca','#ea9b87','#ce6952','#a2402b','#6c2315'];
var NUM_BINS = COLOR_BINS.length;

// geo data
var GEO_DATA_URL = 'data/geodata.json';
var MERS_CASES = [];
var geoData = null;


/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    d3.json(GEO_DATA_URL, onDataLoaded);
    $graphic = $('#graphic');
}


/*
 * LOAD THE DATA
 */
var onDataLoaded = function(error, data) {
    geoData = data;
    
    GRAPHIC_DATA.forEach(function(d) {
        if (d['admo_a3'] != '-99' && d['cases'] != null) {
            MERS_CASES[d['admo_a3']] = { 'cases': +d['cases'], 'deaths': +d['deaths'] };
        }
    });
    delete GRAPHIC_DATA;
    
    pymChild = new pym.Child({
        renderCallback: drawMap
    });
}

/*
 * DRAW THE MAP
 */
function drawMap(containerWidth) {
    // fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = MAP_DEFAULT_WIDTH;
    }

    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // dimensions
    var mapWidth = containerWidth;
    var mapHeight = mapWidth * MAP_DEFAULT_HEIGHT / MAP_DEFAULT_WIDTH;
    var mapScale = (mapWidth / MAP_DEFAULT_WIDTH) * MAP_DEFAULT_SCALE;
    var scaleFactor = mapWidth / MAP_DEFAULT_WIDTH;

    // data vars
    var bbox = geoData['bbox'];
    var mapCentroid = [ ((bbox[0] + bbox[2])/2), ((bbox[1] + bbox[3])/2) + 15 ];

    var geoCountries = topojson.feature(geoData, geoData['objects']['countries']);

    // delete existing map
    $graphic.empty();


    // draw the legend
    var legend = d3.select('#graphic')
        .append('ul')
            .attr('class', 'key');
    
    var bins = legend.selectAll('g')
        .data(COLOR_BINS)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i;
            });
    bins.append('b')
        .style('background-color', function(d,i) {
            return COLOR_RANGE[i];
        });
    bins.append('label')
        .text(function(d, i) {
            if (i == 0) {
                return (COLOR_BINS[i] - 1) + ' or fewer';
            } else if (i == (NUM_BINS - 1)) {
                return COLOR_BINS[i-1] + ' or more';
            } else {
                return COLOR_BINS[i-1] + '-' + (COLOR_BINS[i] - 1);
            }
            return d['key'];
        });
        
//     var legend = d3.select('#graphic ul.key')
//         .append('li')
//             .attr('class', 'key-item key-' + NUM_BINS);
//     legend.append('b')
//         .style('background-color', '#ddd');
//     legend.append('label')
//         .text('Data not available');


    // draw the map
    var color = d3.scale.threshold()
        .domain(COLOR_BINS) // bins
        .range(COLOR_RANGE); // color palette

    var svg = d3.select('#graphic').append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight);

    var projection = d3.geo.miller()
        .center(mapCentroid)
        .scale(mapScale)
        .translate([ mapWidth/2, mapHeight/2 ]);

    var path = d3.geo.path()
        .projection(projection)
        .pointRadius(CITY_DOT_RADIUS * scaleFactor);

    svg.append('path')
        .attr('class', 'landmass')
        .datum(geoCountries)
        .attr('filter', 'url(#landshadow)')
        .attr('d', path);

    svg.append('g')
        .attr('class', 'countries')
        .selectAll('path')
            .data(geoCountries['features'])
        .enter().append('path')
            .attr('class', function(d) {
                var c = ''
                var id = d['id'];

                console.log(d['id'] + '|' + d['properties']['country']);
                if (id != '-99') {
                    c += classify(d['id']);
                }

                if (typeof(MERS_CASES[id]) != 'undefined') {
                    c += ' primary';
                }

                return c;
            })
            .attr('d', path)
            .attr('fill', function(d) {
                var id = d['id'];
                if (typeof(MERS_CASES[id]) == 'undefined') {
                    return '#ebebeb';
                } else {
                    return color(MERS_CASES[id]['cases']);
                }
            });

//     d3.select('.countries path.' + classify(PRIMARY_COUNTRY))
//         .moveToFront()
//         .attr('class', 'primary ' + classify(PRIMARY_COUNTRY));

    var scaleBarDistance = calculateOptimalScaleBarDistance(bbox, 10);
    var scaleBarStart = [10, mapHeight - 20];
    var scaleBarEnd = calculateScaleBarEndPoint(projection, scaleBarStart, scaleBarDistance);

    svg.append('g')
        .attr('class', 'scale-bar')
        .append('line')
        .attr('x1', scaleBarStart[0])
        .attr('y1', scaleBarStart[1])
        .attr('x2', scaleBarEnd[0])
        .attr('y2', scaleBarEnd[1]);

    d3.select('.scale-bar')
        .append('text')
        .attr('x', scaleBarEnd[0] + 5)
        .attr('y', scaleBarEnd[1] + 3)
        .text('100 miles');

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

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

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

var $graphic;

var base_width = 960;
var base_height = 500;
var base_scale = 160;
var color;
var defs;
var feMerge;
var filter;
var geo_countries;
var geo_land;
var height;
var init_load = false;
var path;
var projection;
var rate_by_id = {};
var scale;
var svg;
var width;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var color_bins = [15, 25, 35, 45, 55];
var color_range = ['#C5DFDF', '#8BC0BF', '#51A09E', '#2E706F', '#0B403F'];
var color_bins_count = color_bins.length;

/*
 * Render the graphic
 */
function ready(error, data_countries, data_soda) {
    // uncompress topojson into geojson
    geo_countries = topojson.feature(data_countries, data_countries['objects']['countries']).features;
    geo_land = topojson.feature(data_countries, data_countries['objects']['land']);

    data_soda.forEach(function(d) {
        if (d['rate'] != undefined && d['rate'].length > 0) {
            rate_by_id[d.id] = +d['rate'];
        }
    });

    // setup pym
    pymChild = new pym.Child({
        renderCallback: render
    });
}

function render(width) {
    // if the map hasn't been initially drawn yet, draw it
    if (!init_load) {
        draw_map(width);
    // otherwise, the map already exists. update its size.
    } else {
        update_map(width);
    }
}

function draw_map(width) {
//    console.log('DRAW_MAP');

    $graphic.empty();

    update_dimensions();

    color = d3.scale.threshold()
        .domain(color_bins) // bins
        .range(color_range); // color palette

    projection = d3.geo.miller()
        .scale(scale) // zoom level or size
        .translate([width/2 * .97, height/2 * 1.27]);

    path = d3.geo.path()
        .projection(projection); // apply projection to the map

    // draw the legend
    var legend = d3.select('#graphic')
        .append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(color_bins)
            .enter().append('li')
                .attr('class', function(d, i) {
                    return 'key-item key-' + i;
                });
    legend.append('b')
        .style('background-color', function(d,i) {
            return color_range[i];
        });
    legend.append('label')
        .text(function(d, i) {
            if (i == 0) {
                return 'Less than ' + color_bins[i] + '%';
            } else if (i == (color_bins_count - 1)) {
                return color_bins[i-1] + '% and above';
            } else {
                return color_bins[i-1] + '-' + (color_bins[i] - 1) + '%';
            }
            return d['key'];
        });

    var legend_no_data = d3.select('#graphic ul.key')
        .append('li')
            .attr('class', 'key-item key-' + color_bins_count);
    legend_no_data.append('b')
        .style('background-color', '#ebebeb');
    legend_no_data.append('label')
        .text('Data not available');


    // draw the map
    svg = d3.select('#graphic').append('svg')
        .attr('width', width)
        .attr('height', height);

    defs = svg.append('defs');
    filter = defs.append('filter')
        .attr('id', 'dropshadow');
    filter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('result', 'blurOut')
        .attr('stdDeviation', '10');

    var land = svg.append('path')
        .attr('class', 'land')
        .datum(geo_land)
        .attr('d', path)
        .attr('fill', '#c0deee')
        .attr('filter', 'url(#dropshadow)');

    svg.append('g')
        .attr('class', 'countries')
        .selectAll('path')
            .data(geo_countries)
            .enter()
                .append('path')
                .attr('d', path)
                .style('fill', function(d) {
                    if (rate_by_id[d['id']] == undefined) {
                        return '#ebebeb';
                    } else {
                        return color(rate_by_id[d.id]);
                    }
                })
                .style('stroke', function(d) {
                    if (rate_by_id[d['id']] == undefined) {
                        return '#ccc';
                    } else {
                        return '#fff';
                    }
                });
/*                .on('mouseover', function(d) {
                    // console.log(rate_by_id[d['id']]);
                    d3.select(this).attr('class', 'active');
                })
                .on('mouseout', function(d) {
                    d3.select(this).attr('class', '');
                }); */

    if (pymChild) {
        pymChild.sendHeightToParent();
    }

    init_load = true;
}

function update_dimensions() {
//    console.log('UPDATE_DIMENSIONS');
    width = window.innerWidth;
    height = width * base_height / base_width;
    scale = (width / base_width) * base_scale;
//    console.log(width,height,scale);
}

function update_map() {
//    console.log('UPDATE_MAP');

    update_dimensions();

    projection.scale(scale)
        .translate([width/2 * .97, height/2 * 1.27]);
//        .translate([width/2, height/2]);

    path.projection(projection);

    svg.attr('width', width)
        .attr('height', height)
        .selectAll('path')
            .attr('d', path);

    svg.selectAll('circle')
        .attr('transform', function(d) {
            return 'translate(' + path.centroid(d) + ')';
        })

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}


/*
 * Helper functions
 */
function classify(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // load the data
        queue() // load multiple files and wait until they're all loaded to act
            .defer(d3.json, 'world-110m.json')
            .defer(d3.csv, 'data.csv')
            .await(ready);
    } else {
        pymChild = new pym.Child({ });
    }
})

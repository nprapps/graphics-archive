var $graphic;

var base_width = 960;
var base_height = 600;
var base_scale = 1200;
var color;
var data;
var defs;
var feMerge;
var filter;
var geo_states;
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

var color_bins = [.5, .9, 1.1, 1.5, 10];
var color_range = [colors['orange4'], colors['orange6'], '#f7f7f7', colors['blue6'], colors['blue4']];
var color_bins_count = color_bins.length;

/*
 * Render the graphic
 */
function ready(error, data_states, graphic_data) {
    data = graphic_data;
    geo_states = data_states['features'];

    data.forEach(function(d) {
        if (d['difference_multiplier'] != undefined && d['difference_multiplier'].length > 0) {
            rate_by_id[d['state_name']] = +d['difference_multiplier'];
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
    $graphic.empty();
    update_dimensions();

    color = d3.scale.threshold()
        .domain(color_bins) // bins
        .range(color_range); // color palette

    projection = d3.geo.albersUsa()
        .scale(scale) // zoom level or size
        .translate([width/2, height/2]);

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

    d3.select(legend[0][0]).insert('label','b')
        .text('Fewer');

    d3.select(legend[0][legend[0].length - 1]).append('label')
        .text('More');


    // draw the map
    svg = d3.select('#graphic').append('svg')
        .attr('width', width)
        .attr('height', height);

    svg.append('g')
        .attr('class', 'states')
        .selectAll('path')
            .data(geo_states)
            .enter()
                .append('path')
                .attr('class', function(d) {
                    return d['properties']['name'].toLowerCase();
                })
                .attr('d', path)
                .style('fill', function(d,i) {
                    var s = d['properties']['name'];
                    if (rate_by_id[s] == undefined) {
                        return '#ebebeb';
                    } else {
                        return color(rate_by_id[s]);
                    }
                })
                .style('stroke', '#666');
                /*
                .on('mouseover', function(d) {
                    // console.log(d['properties']['name'], rate_by_id[d['properties']['name']]);
                })
                .on('mouseout', function(d) {
                });*/

    // top 5 states
    data.sort(dynamic_sort('-difference_multiplier'));
    $('#top-states').find('ul').append(list_states());

    // bottom 5 states
    data.sort(dynamic_sort('difference_multiplier'));
    $('#bottom-states').find('ul').append(list_states());

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
}

function update_map() {
//    console.log('UPDATE_MAP');

    update_dimensions();

    projection.scale(scale)
        .translate([width/2, height/2]);

    path.projection(projection);

    svg.attr('width', width)
        .attr('height', height)
        .selectAll('path')
            .attr('d', path);

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

function dynamic_sort(property) { // via: http://stackoverflow.com/a/4760279
    var sortOrder = 1;
    if(property[0] === '-') {
        sortOrder = -1;
        property = property.substr(1);
    }
    return function(a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    }
}

function list_states() {
    var list = '';
    for (var i = 0; i < 5; i++) {
        var val = +data[i]['difference_multiplier'];
        if (i == 0) {
            list += '<li><b>' + data[i]['state_name'] + '</b> residents sent in ' + val.toFixed(2) + ' times as many comments as might have been expected given the size of its&nbsp;population.</li>';
        } else {
            list += '<li><strong>' + data[i]['state_name'] + '</strong> <span>' + val.toFixed(2) + ' times</span></li>';
        }
    }
    return list;
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
            .defer(d3.json, 'us-states.json')
            .defer(d3.csv, 'data.csv')
            .await(ready);
    } else {
        pymChild = new pym.Child({ });
    }
})

var $graphic;

var base_width = 960;
var base_height = 600;
var base_scale = 1200;
var color;
//var data;
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
    'red1': '#a23520', 'red2': '#c14c33', 'red3': '#d86b51', 'red4': '#e88b75', 'red5': '#f2ad9d', 'red6': '#f5d1ca',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var color_bins = [ 1, 3, 5, 10 ];
var color_range = [ '#f5d1ca','#ec9782','#d26046','#a23520' ];
var color_bins_count = color_bins.length;

/*
 * Render the graphic
 */
function ready(error, data_states) {
    geo_states = data_states['features'];
    
    GRAPHIC_DATA.forEach(function(d) {
        if (d['amt'] != null) {
            d['amt'] = +d['amt'];
        }
        rate_by_id[d['state']] = d['amt'];
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
    legend.append('label')
        .text(function(d, i) {
            if (i == 0) {
                return 'Less than ' + color_bins[i] + '%';
            } else if (i == (color_bins_count - 1)) {
                return color_bins[i-1] + '% or more';
            } else {
                return color_bins[i-1] + '-' + (color_bins[i] - .1) + '%';
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
                    if (rate_by_id[s] == undefined || rate_by_id[s] == null) {
                        return '#ebebeb';
                    } else {
                        return color(rate_by_id[s]);
                    }
                })
                .style('stroke', '#fff');
//                 .on('mouseover', function(d) {
//                     console.log(d['properties']['name'], rate_by_id[d['properties']['name']], color(rate_by_id[d['properties']['name']]));
//                 })
//                 .on('mouseout', function(d) {
//                 });

    if (pymChild) {
        pymChild.sendHeight();
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
        pymChild.sendHeight();
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
            .await(ready);
    } else {
        pymChild = new pym.Child({ });
    }
})

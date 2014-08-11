var $graphic;

var graphic_aspect_width = 16;
var graphic_aspect_height = 9;
var graphic_data;
var graphic_data_url = 'data.csv';
var graphic_default_width = 600;
var mobile_threshold = 480;
var pymChild = null;

var fmt_comma = d3.format(',');
var fmt_hour = d3.time.format('%H');

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};


/*
 * Render the graphic
 */
function draw_graphic(container_width) {
    if (!container_width) {
        container_width = graphic_default_width;
    }

    var margin = {top: 10, right: 10, bottom: 40, left: 37};
    var width = container_width - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];
    var last_data_point = graphic_data.length - 1;
    var num_x_ticks = 5;
    var num_y_ticks = 5;

    // clear out existing graphics
    $graphic.empty();

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d,i) {
            return fmt_hour(d).slice(1,2);
        });
        
    var x_axis_grid = function() { return xAxis; }

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else {
                return d.toFixed(2) + '%';
            }
        });
    
    var y_axis_grid = function() { return yAxis; }

    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) { return x(d['time']); })
        .y(function(d) { return y(d['amt']); });
    
    // parse data into columns
    var lines = {};
    for (var column in graphic_data[0]) {
        if (column == 'time') continue;
        lines[column] = graphic_data.map(function(d) {
            return { 'time': d['time'], 'amt': d[column] };
        }).filter(function(d) {
            return d['amt'].length > 0;
        });
    }
    
    var legend = d3.select('#graphic').append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(d3.entries(lines))
            .enter().append('li')
                .attr('class', function(d, i) { 
                    return 'key-item key-' + i + ' ' + classify(d['key']);
                });
    legend.append('b')
    legend.append('label')
        .text(function(d) {
            return d['key'];
        });
        
    var svg = d3.select('#graphic').append('svg')
        .attr("width", width + margin['left'] + margin['right'])
        .attr("height", height + margin['top'] + margin['bottom'])
        .append("g")
        .attr("transform", "translate(" + margin['left'] + "," + margin['top'] + ")");
    
    x.domain(d3.extent(graphic_data, function(d) { 
        return d['time'];
    }));
    y.domain([0, .1]);
    
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);
    
    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

    svg.append('g').selectAll('path')
        .data(d3.entries(lines))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });
    
/*
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(d3.entries(lines))
        .enter()
        .append('text')
            .attr('class', function(d, i) {
                return 'value-' + i + ' ' + classify(d['key']);
            })
            .attr('x', function(d) { 
                return x(d['value'][last_data_point]['time']) + 6;
            })
            .attr('y', function(d) { 
                var ypos = y(d['value'][last_data_point]['amt']);
                return ypos;
            })
            .attr('dy', 2)
            .attr('text-anchor', 'left')
            .text(function(d) { 
                return (d['value'][last_data_point]['amt'] * 100).toFixed(0) + '%';
            });
*/

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // load data
        d3.csv(graphic_data_url, function(error, data) {
            graphic_data = data;

            graphic_data.forEach(function(d) {
                d['time'] = d3.time.format('%H.%M').parse(d['time']);
            });
            
            // setup pym
            pymChild = new pym.Child({
                renderCallback: draw_graphic
            });
        });
    } else {
        pymChild = new pym.Child();
    }
})
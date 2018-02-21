var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%m/%y');
var fmt_year_full = d3.time.format('%b-%Y');
var fmt_year_short = d3.time.format('%b-%y');
var fmt_date_full = d3.time.format('%m/%d/%y');
var graphic_data;
var graphic_data_url = 'date2.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 540;
var pymChild = null;

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
function render(container_width) {
    var graphic_width;

    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }

    // clear out existing graphics
    $graphic.empty();

    draw_graph(container_width);

    if (pymChild) {
        pymChild.sendHeight();
    }
}

function draw_graph(width) {
    var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3'], colors['orange3'], colors['teal3'] ]);
    var graphic_aspect_height;
    var graphic_aspect_width;
    var height;
    var margin = { top: 15, right: 15, bottom: 50, left: 50 };
    var num_x_ticks;
    var num_x_ticks2;
    var num_y_ticks;

    if (is_mobile) {
        graphic_aspect_width = 4;
        graphic_aspect_height = 3;
        num_x_ticks2 = 16;
        num_x_ticks = 5;
        num_y_ticks = 5;
    } else {
        graphic_aspect_width = 16;
        graphic_aspect_height = 9;
        num_x_ticks = 5;
        num_x_ticks2 = 16;
        num_y_ticks = 10;
    }

    width = width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

    var x = d3.time.scale()
        .range([0, width])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    var area = d3.svg.area()
        .x(function(d) { return x(d['date']); })
        .y0(height)
        .y1(function(d) { return y(d['amt']); });

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        // .tickValues([
        //         fmt_date_full.parse('9/14/13'),
        //         fmt_date_full.parse('7/1/14'),
        //         fmt_date_full.parse('1/29/14')
        //         // fmt_year_full.parse('1979'),
        //         // fmt_year_full.parse('1986'),
        //         // fmt_year_full.parse('1995'),
        //         // fmt_year_full.parse('2013')
        //     ])
        .tickFormat(function(d,i) {
                // console.log('date',d)

            if (is_mobile) {
                return fmt_year_short(d) ;
            } else {
                return fmt_year_full(d);
            }
        });

        var xAxis2 = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks2)
        // .tickValues([
        //         fmt_date_full.parse('9/14/13'),
        //         fmt_date_full.parse('7/1/14'),
        //         fmt_date_full.parse('1/29/14')
        //         // fmt_year_full.parse('1979'),
        //         // fmt_year_full.parse('1986'),
        //         // fmt_year_full.parse('1995'),
        //         // fmt_year_full.parse('2013')
        //     ])
        .tickFormat(function(d,i) {
                // console.log('date',d)

            if (is_mobile) {
                return fmt_year_short(d) ;
            } else {
                return fmt_year_full(d);
            }
        });

    var x_axis_grid = function() { return xAxis2; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks)
        .tickFormat(function(d,i) {
                        return '$' + d;
                });


    var y_axis_grid = function() { return yAxis; };

    var line = d3.svg.line()
        .interpolate('basis')
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    color.domain(d3.keys(graphic_data[0]).filter(function(key) {
        return key !== 'date';
    }));

    // parse data into columns
    var formatted_data = {};
    for (var column in graphic_data[0]) {
        if (column == 'date') continue;
        formatted_data[column] = graphic_data.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
        }).filter(function(d) {
            return d['amt'].length > 0;
        });
    }


    // set the data domain
    x.domain(d3.extent(graphic_data, function(d) {
        return d['date'];
    }));

    y.domain([ 0, d3.max(d3.entries(formatted_data), function(c) {
            return d3.max(c['value'], function(v) {
                var n = v['amt'];
                return Math.ceil(n/5) * 5; // round to next 5
            });
        })
    ]);

    // draw the chart
    var svg = d3.select('#graphic')
        .append('svg')
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    var xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + (height+10) + ')')
        .call(xAxis);

    var yTop = svg.append('g') // Add the Y Axis
        .attr('class', 'y axis')
        .call(yAxis);

    var xGrid = svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    var yGrid = svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );
    var ylabel = svg.append('text')
        .attr('class', 'peak-textbook')
        .attr('x', x(fmt_date_full.parse('1/29/14'))-6)
        .attr('y', y(270))
        .attr('text-anchor', 'end')
        .text('Highest Price: $299.57');

    var ylabel2 = svg.append('text')
        .attr('class', 'peak-textbook')
        .attr('x', x(fmt_date_full.parse('8/10/13'))-3)
        .attr('y', y(50))
        .attr('text-anchor', function(d) {
            if (is_mobile) {
            return 'start'
            } else {
            return 'start'
            }
        })
        .text('Lowest Summer Price: $22.99');

    var lineGuide = svg.append('line')
        .attr('class','guide-line')
        .attr('x1', x(fmt_date_full.parse('8/10/13')))
        .attr('x2', x(fmt_date_full.parse('8/10/13')))
        .attr('y1', y(30))
        .attr('y2', y(46))
        .style('stroke', '#000');
    // var ylabel2 = svg.append('line')
    //     .attr('class', 'peak-textbook')
    //     .attr('x', x(fmt_date_full.parse('10/22/14'))+3)
    //     .attr('y', y(40))
    //     .attr('text-anchor', 'end')
    //     .text('Bottom Textbook Price: $4.24');

    var lines = svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formatted_data))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                return color(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });
}


/*
 * Helper functions
 */
function classify(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(graphic_data_url, function(error, data) {
            graphic_data = data;

            graphic_data.forEach(function(d) {
                d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);
            });

            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

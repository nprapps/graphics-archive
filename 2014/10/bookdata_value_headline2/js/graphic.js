var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var fmt_comma = d3.format(',');
var graphic_data;
var graphic_data_url = 'bookdata-value-total.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 600;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var headers = { 'tot': 'Average Amount Students Spend On Textbooks, By Year'}


/*
 * Render the graphi2
 */
function render(container_width) {
    var graphic_width;

    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
        graphic_width = container_width;
    } else {
        is_mobile = false;
        graphic_width = Math.floor(container_width / 1.3);
    }

    // clear out existing graphics
    $graphic.empty();

    // var legend = d3.select('#graphic').append('ul')
    //     .attr('class', 'key')
    //     .append('li')
    //         .attr('class', 'key-item recession');
    // legend.append('b')
    //     .attr('style', 'background-color: #ebebeb;');
    // legend.append('label')
    //     .text('Periods of economic recession');
    draw_graph('tot', graphic_width);

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function draw_graph(id, graphic_width) {
    var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3'], colors['orange3'], colors['teal3'] ]);
    var graphic_aspect_height = 3;
    var graphic_aspect_width = 4;
    var height;
    var margin = { top: 5, right: 15, bottom: 30, left: 40 };
    var num_x_ticks = 5;
    var num_y_ticks = 5;

    width = graphic_width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

    var x = d3.time.scale()
        .range([0, width])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d,i) {
            if (is_mobile) {
                return fmt_year_full(d);
            } else {
                return '\u2019' + fmt_year_abbr(d);
            }
        });

    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            switch(id) {
                case 'new':
                    return d + '%';
                    break;
                case 'tot':
                    if (d == 0) {
                        return d;
                    } else {
                        return "$" + d ;
                    }
                    break;
            }
        });

    var y_axis_grid = function() { return yAxis; };

    var line = d3.svg.line()
        .interpolate('linear')
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    color.domain(d3.keys(graphic_data[0]).filter(function(key) {
        return key == id;
    }));

    // parse data into columns
    var formatted_data = {};
    for (var column in graphic_data[0]) {
        if (column != id) continue;
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

    var min = 0;
    // var max = 0;

    // if (id = 'tot') {min = 0}
    // if (id == 'tot') {
    //     console.log("tot");
    //     min = 450}


    y.domain([ min, d3.max(d3.entries(formatted_data), function(c) {
            return d3.max(c['value'], function(v) {
                var n = v['amt'];
                // console.log(n)
                switch(id) {
                    case 'tot':
                        return Math.ceil(n/300) * 300; // round to next 5
                        break;
                    case 'new':
                        return Math.ceil(n/100) * 100; // round to next 5
                        break;
                }
            });
        })
    ]);




console.log(formatted_data)

    // draw the chart
    var chart = d3.select('#graphic')
        .append('div')
            .attr('class', 'chart ' + id)
            .attr('style', 'width: ' + graphic_width + 'px;');

    var header = chart.append('h1')
        .text(headers[id]);

    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // var recession = svg.append('g')
    //     .attr('class', 'recession')
    //     .selectAll('rect')
    //     .data(recession_dates)
    //     .enter()
    //         .append('rect')
    //             .attr('x', function(d) {
    //                 return x(d['begin']);
    //             })
    //             .attr('width', function(d) {
    //                 return x(d['end']) - x(d['begin']);
    //             })
    //             .attr('y', 0)
    //             .attr('height', height)
    //             .attr('fill', '#ebebeb');

    var xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
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

    var lines = svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formatted_data))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-'+ classify(d['key']);
            })
            .attr('stroke', function(d) {
                switch(id) {
                    case 'amt':
                        return colors['teal3'];
                        break;
                    case 'pct':
                        return colors['orange3'];
                        break;
                }
//                return color(d['key']);
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
                d['date'] = d3.time.format('%Y').parse(d['date']);
            });


            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

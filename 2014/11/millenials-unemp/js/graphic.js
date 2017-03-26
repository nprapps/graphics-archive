var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_data;
var graphic_data_url = 'gen-unemp2.csv';
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

var recession_dates = [
    { 'begin': '1969-12-01', 'end': '1970-11-01' },
    { 'begin': '1973-11-01', 'end': '1975-03-01' },
    { 'begin': '1980-01-01', 'end': '1980-07-01' },
    { 'begin': '1981-07-01', 'end': '1982-11-01' },
    { 'begin': '1990-07-01', 'end': '1991-03-01' },
    { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
];


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
        pymChild.sendHeightToParent();
    }
}

function draw_graph(width) {
    var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3']]);
    var graphic_aspect_height;
    var graphic_aspect_width;
    var height;
    var margin = { top: 5, right: 20, bottom: 30, left: 35 };
    var num_x_ticks;
    var num_y_ticks;

    if (is_mobile) {
        graphic_aspect_width = 4;
        graphic_aspect_height = 3;
        num_x_ticks = 5;
        num_y_ticks = 5;
    } else {
        graphic_aspect_width = 16;
        graphic_aspect_height = 9;
        num_x_ticks = 10;
        num_y_ticks = 10;
    }

    width = width - margin['left'] - margin['right'];
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
                return '\u2019' + fmt_year_abbr(d);
            } else {
                return fmt_year_full(d);
            }
        });

    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
                    return d + '%';
        });

    var y_axis_grid = function() { return yAxis; };

    var line = d3.svg.line()
        .interpolate('basis')
        .defined(function(d) { return d['amt'] != null; })
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

    // console.log(formatted_data)


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


	// draw the legend
	var legend = d3.select('#graphic')
		.append('ul')
			.attr('class', 'key');

    var recession_key = d3.select('#graphic ul.key')
        .append('li')
            .attr('class', 'key-item recession');
    recession_key.append('b')
    	.attr('style', 'background-color: #ebebeb;');
    recession_key.append('label')
        .text('Periods of economic recession');

    // draw the chart
    var svg = d3.select('#graphic')
        .append('svg')
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    var recession = svg.append('g')
        .attr('class', 'recession')
        .selectAll('rect')
        .data(recession_dates)
        .enter()
            .append('rect')
                .attr('x', function(d) {
                    return x(d['begin']);
                })
                .attr('width', function(d) {
                    return x(d['end']) - x(d['begin']);
                })
                .attr('y', 0)
                .attr('height', height)
                .attr('fill', '#ebebeb');

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

  var bbLine = svg.append('line')
        .attr('class','lines-annote')
        .attr('x1', x(graphic_data[0]['date']))
        .attr('x2', x(graphic_data[0]['date']))
        .attr('y1', y(15.7))
        .attr('y2', y(8.5))
        .style('stroke-dasharray', '3,5')
        .style('stroke', function(d) {return colors['red3'];});

    var bbLabel = svg.append('text')
        .attr('class', 'annote')
        .attr('x', x(graphic_data[0]['date']))
        .attr('y', y(16))
        .attr('text-anchor','start')
        .style('fill', function(d) {return colors['red3'];})
        .text('Boomers Turn 20')

    var bbLine2 = svg.append('line')
        .attr('class','lines-annote')
        .attr('x1', x(graphic_data[260]['date']))
        .attr('x2', x(graphic_data[260]['date']))
        .attr('y1', function(d) {
            if (is_mobile) {
                return y(3.8)
                } else {
                return y(3.8)
                }
            })
        .attr('y2', y(10.5))
        .style('stroke-dasharray', '3,5')
        .style('stroke', function(d) {return colors['yellow3'];});

    var bbLabel2 = svg.append('text')
        .attr('class', 'annote')
        .attr('x', function(d) {
            if (is_mobile) {
                return x(graphic_data[250]['date'])
                } else {
                return x(graphic_data[260]['date'])
                }
            })
        .attr('y', y(3))
        .style('fill', function(d) {return colors['yellow3'];})
        .attr('text-anchor','start')
        .text('GenXers Turn 20')

    var bbLine3 = svg.append('line')
        .attr('class','lines-annote')
        .attr('x1', x(graphic_data[444]['date']))
        .attr('x2', x(graphic_data[444]['date']))
        .attr('y1', function(d) {
            if (is_mobile) {
                return y(17.5)
                } else {
                return y(16.5)
                }
            })
        .attr('y2', y(7.8))
        .style('stroke', function(d) {return colors['blue3'];})
        .style('stroke-dasharray', '3,5');

    var bbLabel3 = svg.append('text')
        .attr('class', 'annote')
        .attr('x', x(graphic_data[444]['date']))
        .attr('y', function(d) {
            if (is_mobile) {
                return y(18)
                } else {
                return y(17)
                }
            })
        .attr('text-anchor','start')
        .style('fill', function(d) {return colors['blue3'];})
        .text('Millennials Turn 20')



// console.log(formatted_data)

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
            // .attr("stroke", "url(#line-gradient)");

// console.log(graphic_data[444]['genx '])
//     var bbcircle = svg.append('circle')
//         .attr('class', 'annote-circle')
//         .attr('r', 5)
//         .attr('cx', x(graphic_data[447]['date']))
//         .attr('cy', y(parseInt(graphic_data[447]['millennials'])))
//         .attr('text-anchor','end')
//         .text('Last GenXer Turn 24')
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
                d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
            });

            recession_dates.forEach(function(d) {
                d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
                d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
            });

            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

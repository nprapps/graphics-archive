var $graphic = $('#graphic');

var fmt_comma = d3.format(',');
var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_data;
var graphic_data_url = 'data.csv';
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
        pymChild.sendHeightToParent();
    }
}

function draw_graph(width) {
    var color = d3.scale.ordinal()
        .range([ colors['yellow2'], colors['yellow3'], colors['yellow5'] ]);
    var graphic_aspect_height;
    var graphic_aspect_width;
    var height;
    var margin = { top: 5, right: 35, bottom: 35, left: 55 };
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
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width);

    var x = d3.time.scale()
        .range([0, width])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues([
        	fmt_year_full.parse('1965'),
        	fmt_year_full.parse('1979'),
        	fmt_year_full.parse('1986'),
        	fmt_year_full.parse('1995'),
        	fmt_year_full.parse('2013')
        ])
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
        	if(d != 0) {
        		return '$' + fmt_comma(d);
        	} else {
        		return d;
        	}
        });

    var y_axis_grid = function() { return yAxis; };

    var line = d3.svg.line()
        .interpolate('monochrome')
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
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }
    
    
    // set the data domain
    x.domain(d3.extent(graphic_data, function(d) { 
        return d['date'];
    }));

    y.domain([
    	d3.min(d3.entries(formatted_data), function(c) { 
            return d3.min(c['value'], function(v) { 
                var n = v['amt'];
                return Math.floor(n/10000) * 10000; // round to prev 10K
            }); 
        }),
    	d3.max(d3.entries(formatted_data), function(c) { 
            return d3.max(c['value'], function(v) { 
                var n = v['amt'];
                return Math.ceil(n/10000) * 10000; // round to next 10K
            }); 
        })
    ]);


    // draw the legend
    var legend = d3.select('#graphic')
        .append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(d3.entries(formatted_data))
            .enter().append('li')
                .attr('class', function(d, i) { 
                    return 'key-item key-' + i + ' ' + classify(d['key']);
                });
    legend.append('b')
        .style('background-color', function(d) {
            return color(d['key']);
        });
    legend.append('label')
        .text(function(d) {
            return d['key'];
        });


    // draw the chart
    var svg = d3.select('#graphic')
        .append('svg')
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

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
        
    var y_labels = svg.append('g')
    	.attr('class', 'y axis');
    
    y_labels.append('text')
    	.attr('x', x(fmt_year_full.parse('1965')))
    	.attr('y', height + 33)
    	.attr('text-anchor', 'middle')
    	.text('Silent');

    y_labels.append('text')
    	.attr('x', x(fmt_year_full.parse('1983')))
    	.attr('y', height + 33)
    	.attr('text-anchor', 'middle')
    	.text('Boomer');

    y_labels.append('text')
    	.attr('x', x(fmt_year_full.parse('1995')))
    	.attr('y', height + 33)
    	.attr('text-anchor', 'middle')
    	.text('Gen X');

    y_labels.append('text')
    	.attr('x', x(fmt_year_full.parse('2013')))
    	.attr('y', height + 33)
    	.attr('text-anchor', 'middle')
    	.text('Millennials');

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
            
    var dots_1 = svg.append('g')
        .attr('class', 'dot')
        .selectAll('circle')
        .data(d3.entries(formatted_data)[0]['value'])
        .enter()
        .append('circle')
            .attr('cx', function(d) { 
                return x(d['date']); 
            })
            .attr('cy', function(d) { 
            	return y(d['amt']);
            })
            .attr('r', 4)
            .attr('fill', function(d) {
            	return color.range()[0];
            })
            .attr('stroke', '#fff');

    var dots_2 = svg.append('g')
        .attr('class', 'dot')
        .selectAll('circle')
        .data(d3.entries(formatted_data)[1]['value'])
        .enter()
        .append('circle')
            .attr('cx', function(d) { 
                return x(d['date']); 
            })
            .attr('cy', function(d) { 
            	return y(d['amt']);
            })
            .attr('r', 4)
            .attr('fill', function(d) {
            	return color.range()[1];
            })
            .attr('stroke', '#fff');

    var dots_3 = svg.append('g')
        .attr('class', 'dot')
        .selectAll('circle')
        .data(d3.entries(formatted_data)[2]['value'])
        .enter()
        .append('circle')
            .attr('cx', function(d) { 
                return x(d['date']); 
            })
            .attr('cy', function(d) { 
            	return y(d['amt']);
            })
            .attr('r', 4)
            .attr('fill', function(d) {
            	return color.range()[2];
            })
            .attr('stroke', '#fff');

    var values_1 = svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formatted_data)[0]['value'])
        .enter()
        .append('text')
            .attr('x', function(d) { 
                return x(d['date']); 
            })
            .attr('y', function(d) { 
            	return y(d['amt']);
            })
            .attr('dx', 0)
            .attr('dy', -10)
            .attr('text-anchor', function(d,i) {
            	if (i == 0) {
            		return 'begin';
            	} else if (i == 4) {
            		return 'end';
            	} else { 
            		return 'middle';
            	}
            })
            .text(function(d) { 
                return '$' + fmt_comma(d['amt']);
            });

    var values_2 = svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formatted_data)[1]['value'])
        .enter()
        .append('text')
            .attr('x', function(d) { 
                return x(d['date']); 
            })
            .attr('y', function(d) { 
            	return y(d['amt']);
            })
            .attr('dx', 0)
            .attr('dy', -10)
            .attr('text-anchor', function(d,i) {
            	if (i == 0) {
            		return 'begin';
            	} else if (i == 4) {
            		return 'end';
            	} else { 
            		return 'middle';
            	}
            })
            .text(function(d) { 
                return '$' + fmt_comma(d['amt']);
            });

    var values_3 = svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(d3.entries(formatted_data)[2]['value'])
        .enter()
        .append('text')
            .attr('x', function(d) { 
                return x(d['date']); 
            })
            .attr('y', function(d) { 
            	return y(d['amt']);
            })
            .attr('dx', 0)
            .attr('dy', -6)
            .attr('text-anchor', function(d,i) {
            	if (i == 0) {
            		return 'begin';
            	} else if (i == 4) {
            		return 'end';
            	} else { 
            		return 'middle';
            	}
            })
            .text(function(d) { 
                return '$' + fmt_comma(d['amt']);
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
                d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);
            });
            
            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
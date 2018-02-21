var $graphic;

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var fmt_comma = d3.format(',');
var graphic_default_width = 600;
var height;
var is_mobile;
var margin;
var mobile_threshold = 500;
var pymChild = null;
var tooltip;
var width;
var x;
var y;

var continents = [ 'Africa', 'Latin America', 'Asia', 'Oceania', 'Europe', 'Northern America' ];

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [{"region":"Carribbean","continent":"Latin America","rate":39,"gdp":6990},
{"region":"Central America","continent":"Latin America","rate":29,"gdp":7930},
{"region":"Eastern Africa","continent":"Africa","rate":38,"gdp":546},
{"region":"Eastern Asia","continent":"Asia","rate":28,"gdp":6975},
{"region":"Eastern Europe","continent":"Europe","rate":43,"gdp":10669},
{"region":"Middle Africa","continent":"Africa","rate":36,"gdp":1450},
{"region":"Northern Africa","continent":"Africa","rate":18,"gdp":3191},
{"region":"Northern America","continent":"Northern America","rate":19,"gdp":47836},
{"region":"Northern Europe","continent":"Europe","rate":17,"gdp":47523},
{"region":"Oceania","continent":"Oceania","rate":17,"gdp":34530},
{"region":"South America","continent":"Latin America","rate":32,"gdp":7740},
{"region":"South-central Asia","continent":"Asia","rate":26,"gdp":1273},
{"region":"Southeastern Asia","continent":"Asia","rate":36,"gdp":2668},
{"region":"Southern Africa","continent":"Africa","rate":15,"gdp":5183},
{"region":"Southern Europe","continent":"Europe","rate":18,"gdp":30898},
{"region":"Western Africa","continent":"Africa","rate":28,"gdp":1113},
{"region":"Western Asia","continent":"Asia","rate":26,"gdp":11150},
{"region":"Western Europe","continent":"Europe","rate":12,"gdp":46116}];

var labels = { 
	'left': 'Abortions per 1,000 women aged 15-44', 
	'bottom': 'Per capita GDP' 
};

var trend_data = [[ 0, 31.7, 60000, 11.1 ]];


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

function draw_graph(graphic_width) {
    var color = d3.scale.ordinal()
        .range([ colors['red2'], colors['red4'], colors['orange4'], colors['yellow4'], colors['yellow2'], colors['yellow1'] ]);
    var graphic_aspect_height = 3;
    var graphic_aspect_width = 4;
    var num_x_ticks;
    var num_y_ticks;

    margin = { top: 5, right: 25, bottom: 45, left: 45 };

    if (is_mobile) {
        num_x_ticks = 5;
        num_y_ticks = 3;
    } else {
        num_x_ticks = 5;
        num_y_ticks = 6;
    }

    width = graphic_width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width);

    x = d3.scale.linear()
        .range([0, width])
		.domain([ 
			d3.min(graphic_data, function(d) { 
				var n = d['gdp'];
				return Math.floor(n/20000) * 20000; // round to prev 20K
			}), 
			d3.max(graphic_data, function(d) { 
				var n = d['gdp'];
				return Math.ceil(n/20000) * 20000; // round to next 20K
			})
		]);

    y = d3.scale.linear()
        .range([ height, 0 ])
		.domain([ 
			d3.min(graphic_data, function(d) { 
				var n = d['rate'];
				return Math.floor(n/20) * 20; // round to prev 20
			}), 
			d3.max(graphic_data, function(d) { 
				var n = d['rate'];
				return Math.ceil(n/20) * 20; // round to next 20
			})
		]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d) {
        	return '$' + fmt_comma(d);
        });
        
    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks);

    var y_axis_grid = function() { return yAxis; };

    color.domain(continents);

    // draw the legend
    var legend = d3.select('#graphic')
        .append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(continents)
            .enter().append('li')
                .attr('class', function(d, i) { 
                    return 'key-item key-' + i + ' ' + classify(d);
                });
    legend.append('b')
        .style('background-color', function(d) {
            return color(d);
        });
    legend.append('label')
        .text(function(d) {
            return d;
        });


    // draw the chart
    var chart = d3.select('#graphic')
    	.append('div')
    	.attr('class', 'chart');

    var svg = chart.append('svg')
		.attr('width', width + margin['left'] + margin['right'])
		.attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
    
    var bg = svg.append('rect')
    	.attr('class', 'bg')
    	.attr('x', 0)
    	.attr('y', 0)
    	.attr('width', width)
    	.attr('height', height);

    var xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    var x_label = svg.append('text')
    	.attr('class', 'axis label')
    	.attr('text-anchor', 'middle')
    	.attr('x', width/2 + margin['top'])
    	.attr('y', height + margin['top'] + margin['bottom'] - 10)
    	.text(labels['bottom']);
    
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
    
    var y_label = svg.append('text')
    	.attr('class', 'axis label')
    	.attr('transform', 'rotate(-90)')
    	.attr('text-anchor', 'middle')
    	.attr('x', -height/2 + margin['top'])
    	.attr('y', -margin['left'] + 10)
    	.text(labels['left']);

	// trend line
	var trendline = svg.selectAll('.trendline')
		.data(trend_data);
			
	trendline.enter()
		.append('line')
		.attr('class', 'trendline')
		.attr('x1', function(d) { 
			return x(d[0]);
		})
		.attr('y1', function(d) { 
			return y(d[1]);
		})
		.attr('x2', function(d) { 
			return x(d[2]);
		})
		.attr('y2', function(d) {
			return y(d[3]);
		});

    
    // scatterplot
    var dots = svg.append('g')
    	.attr('class', 'dots')
    	.selectAll('circle')
    	.data(graphic_data)
    	.enter()
    		.append('circle')
    		.attr('class', function(d) {
    			return 'dot ' + classify(d['region']);
    		})
    		.attr('cx', function(d) {
    			return x(d['gdp']);
    		})
    		.attr('cy', function(d) {
    			return y(d['rate']);
    		})
    		.attr('r', function(d) {
    			if (is_mobile) {
    				return 4;
    			} else {
    				return 5;
    			}
    		})
    		.attr('fill', function(d) {
				return color(d['continent']);
    		})
			.on('mouseover', on_mouseover)
            .on('mouseout', on_mouseout);
    
    tooltip = chart.append('div')
    	.attr('id', 'tooltip');
}


/*
 * Helper functions
 */
function on_mouseover(e) {
	if (!is_mobile) {
		var dot = d3.select('.dot.' + classify(e['region']));
		dot.classed('active', true);
		tooltip.html(function(d) {
				var t = '';
				t += '<strong>' + e['region'] + '</strong><br />';
				t += '<strong>' + e['rate'] + '</strong> abortions per 1,000 women aged 15-44<br />';
				t += '<strong>$' + fmt_comma(e['gdp']) + '</strong> per capita GDP';
				return t;
			})
			.attr('style', function(d) {
				var dot_y = y(e['rate']) + margin['top'];
				var dot_x = x(e['gdp']) + margin['left'];
				var tt_left;
				var tt_top;
				var tt_height = 90;
				var tt_width = 175;
				var s = '';
				
				tt_top = dot_y - tt_height;
				if (tt_top < margin['top']) {
					tt_top = margin['top'];
				}
				if ((tt_top + tt_height) > dot_y) {
					tt_top = dot_y + 10;
				}

				tt_left = dot_x - (tt_width / 2);
				if (tt_left < margin['left']) {
					tt_left = margin['left'];
				}
				if ((tt_left + tt_width) > (width + margin['left'])) {
					tt_left = width + margin['left'] - tt_width;
				}

				s += 'top: ' + tt_top + 'px;';
				s += 'left: ' + tt_left + 'px;';
				return s;
			})
			.classed('active', true);
	}
}

function on_mouseout(e) {
	if (!is_mobile) {
		var dot = d3.select('.dot.' + classify(e['region']));
		dot.classed('active', false);
		tooltip.classed('active', false);
	}
}

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
        $tooltip = d3.select('#tooltip');
        
		var pymChild = new pym.Child({
			renderCallback: render
		});
    } else {
        pymChild = new pym.Child({ });
    }
})

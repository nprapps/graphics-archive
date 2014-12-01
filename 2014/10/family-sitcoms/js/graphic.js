var $graphic = $('#graphic');

var bar_gap = 2;
var bar_height = 30;
var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_data;
var graphic_data_url = 'data.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 480;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var categories = [];

var decade_bars = [
    { 'begin': '1950-01-01', 'end': '1959-12-31' },
    { 'begin': '1970-01-01', 'end': '1979-12-31' },
    { 'begin': '1990-01-01', 'end': '1999-12-31' },
    { 'begin': '2010-01-01', 'end': '2015-01-01' },
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
    
    graphic_width = container_width;

    // clear out existing graphics
    $graphic.empty();

    draw_graph(graphic_width);

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function draw_graph(graphic_width) {
    var color = d3.scale.ordinal()
        .range([ '#111', colors['blue3'], colors['yellow3'], colors['orange3'] ]);
    var graph = d3.select('#graphic');
    var margin = { top: 20, right: 15, bottom: 20, left: 15 };
    var num_bars = graphic_data.length;
    var num_x_ticks;
    var width = graphic_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);
    
    if (is_mobile) {
    	num_x_ticks = 5;
    } else {
    	num_x_ticks = 10;
    }
    
    color.domain(categories);
    
    var x = d3.time.scale()
        .domain([ 
        	d3.time.format('%m/%d/%Y').parse('01/01/1950'),
        	d3.time.format('%m/%d/%Y').parse('01/01/2015')
	    ])
	    .range([0, width]);
	
    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d) {
        	return fmt_year_full(d);
        });
        
    var xAxis_top = d3.svg.axis()
        .scale(x)
        .orient('top')
        .ticks(num_x_ticks)
        .tickFormat(function(d) {
        	return fmt_year_full(d);
        });
        
    var x_axis_grid = function() { 
        return xAxis;
    }

    // draw the legend
    var legend = graph.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(categories)
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

	// draw the graphic
	var chart = graph.append('div')
		.attr('class', 'chart');

    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'decades')
        .selectAll('rect')
        .data(decade_bars)
        .enter()
            .append('rect')
                .attr('x', function(d) {
                    return x(d['begin']);
                })
                .attr('width', function(d) {
                    return x(d['end']) - x(d['begin']);
                })
                .attr('y', 0)
                .attr('height', height);

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'x axis top')
        .attr('transform', 'translate(0,' + -bar_gap + ')')
        .call(xAxis_top);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );
    
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
        	.attr('x', function(d) {
        		return x(d['first_episode']);
        	})
            .attr('y', function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr('width', function(d) {
            	return x(d['last_episode']) - x(d['first_episode']);
            })
            .attr('height', bar_height)
            .attr('class', function(d, i) { 
                return 'bar-' + i + ' ' + classify(d['show']);
            })
            .attr('fill', function(d) {
            	return color(d['group']);
            });

	chart.append('div')
        .attr('class', 'labels')
        .attr('style', function(d) {
        	var s = '';
        	s += 'margin-left: ' + margin['left'] + 'px;';
        	s += 'margin-top: ' + margin['top'] + 'px;';
        	return s;
        })
        .selectAll('span')
            .data(graphic_data)
        .enter().append('span')
            .attr('class', function(d) {
            	var c = classify(d['show']);
				if (d['duration'] >= 3.5 || d['show'] == 'The Lucille Ball-Desi Arnaz Show') {
        			c += ' major';
        		}
                return c;
            })
        	.attr('style', function(d, i) {
        		var s = '';
        		var xpos = x(d['first_episode']);
        		
        		s += 'top: ' + (i * (bar_height + bar_gap)) + 'px;';
        		
        		if (xpos < 125) {
        			s += 'left: ' + (x(d['last_episode']) + 6) + 'px;';
        			s += 'text-align: left;';
        		} else {
        			s += 'right: -' + (x(d['first_episode']) - 6) + 'px;';
        			s += 'text-align: right;';
        		}
        		
        		return s;
        	})
			.html(function(d) { 
				var l = '<strong>' + d['show'] + '</strong> ';
				
				if (d['duration'] >= 3.5 || d['show'] == 'The Lucille Ball-Desi Arnaz Show') {
					switch (d['show']) {
						case 'Modern Family':
							l += '(' + fmt_year_full(d['first_episode']) + '-present)';
							break;
						case 'Cristela':
							l += '(' + fmt_year_full(d['first_episode']) + ')';
							break;
						case 'Black-ish':
							l += '(' + fmt_year_full(d['first_episode']) + ')';
							break;
						case 'Fresh Off The Boat':
							l += '(' + fmt_year_full(d['first_episode']) + ' mid-season)';
							break;
						default:
							l += '(' + fmt_year_full(d['first_episode']) + '-' + fmt_year_full(d['last_episode']) + ')';
							break;
					}
				}
				return l;
			});

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
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(graphic_data_url, function(error, data) {
        	var categories_all = [];
            graphic_data = data;

            graphic_data.forEach(function(d) {
                d['first_episode'] = d3.time.format('%m/%d/%Y').parse(d['first_episode']);
                d['last_episode'] = d3.time.format('%m/%d/%Y').parse(d['last_episode']);
                d['duration'] = +d['duration'];
                categories_all.push(d['group']);
            });
            
            categories = d3.set(categories_all).values();
            
			decade_bars.forEach(function(d) {
				d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
				d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
			});

            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
var $graphic;

var bar_gap = 5;
var bar_height = 30;
var color;
var graphic_margin = 6;
var is_mobile = false;
var label_width = 30;
var mobile_threshold = 480;
var num_x_ticks = 5;
var pymChild = null;
var round_increment = 10;

var fmt_comma = d3.format(',');
var fmt_year_abbrev = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');

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
	var graphic_width = Math.floor((container_width - 22) / 2);

    if (container_width <= mobile_threshold) {
    	is_mobile = true;
    } else {
    	is_mobile = false;
    }

    // clear out existing graphics
    $graphic.empty();
    
    draw_chart('house', graphic_width);    
    draw_chart('senate', graphic_width);    
}

function draw_chart(id, graphic_width) {
	var graphic_data = eval('data_' + id);
	var majority = eval('majority_' + id);
	var majority_rounded = Math.ceil(majority / round_increment) * round_increment;
    var margin = { top: 20, right: 10, bottom: 20, left: (label_width + 6) };
    var num_bars = graphic_data.length;
    var width = graphic_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);
    
    var graph = d3.select('#graphic')
    	.append('div')
    		.attr('class', 'chart ' + classify(id))
    		.attr('width', graphic_width);

    var header = graph.append('h3')
    	.attr('style', 'margin-left: ' + margin['left'] + 'px;')
		.text(eval('header_' + id));
    
    var x = d3.scale.linear()
        .domain([0,
        	d3.max(graphic_data, function(d) { 
				return Math.ceil(d['seats'] / round_increment) * round_increment;
            })
	    ]);
	
	if (x.domain()[1] < majority_rounded) {
		x.domain()[1] = majority_rounded;
	}
	
	x.range([0, width]);
	
    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks);
        
    var x_axis_grid = function() { 
        return xAxis;
    }

    var svg = graph.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

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
            .attr('y', function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr('width', 0)
            .attr('height', bar_height)
            .attr('class', function(d, i) { 
                return 'bar-' + i + ' ' + classify(d['party']);
            })
            .transition()
				.attr('width', function(d){
					return x(d['seats']);
				});
            	
    
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d) { 
                return x(d['seats']);
            })
            .attr('y', function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr('dx', function(d) {
            	if (x(d['seats']) > 20) {
            		return -6;
            	} else {
            		return 6;
            	}
            })
            .attr('dy', (bar_height / 2) + 3)
            .attr('text-anchor', function(d) {
            	if (x(d['seats']) > 20) {
            		return 'end';
            	} else {
            		return 'begin';
            	}
            })
            .attr('fill', function(d) {
            	if (x(d['seats']) > 20) {
            		return '#fff';
            	} else {
            		return '#999';
            	}
            })
            .attr('class', function(d) { 
                return classify(d['party']);
            })
            .text(function(d) { 
                return d['seats'].toFixed(0);
            });

	svg.append('g')
        .attr('class', 'labels')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
        	.attr('x', -margin['left'] + 6)
        	.attr('y', function(d,i) {
        		return (i * (bar_height + bar_gap));
        	})
        	.attr('dx', -6)
            .attr('dy', (bar_height / 2) + 4)
        	.attr('text-anchor', 'begin')
            .attr('class', function(d) {
                return classify(d['party']);
            })
			.text(function(d) { 
				return d['party_abbr'];
			});
	
	var majority_marker = svg.append('g')
		.attr('class', 'majority');
	
	majority_marker.append('line')
		.attr('x1', x(majority))
		.attr('y1', 0)
		.attr('x2', x(majority))
		.attr('y2', height)
		.attr('stroke', '#000');

	majority_marker.append('text')
		.attr('class', 'majority')
		.attr('x', x(majority))
		.attr('y', 0)
		.attr('dx', '1')
		.attr('dy', '-6')
		.attr('text-anchor', 'end')
		.html('Majority: ' + majority + '&#11022;');

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}


$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // setup pym
        pymChild = new pym.Child({
            renderCallback: render,
            polling: 500
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
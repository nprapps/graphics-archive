var $graphic;

var bar_height = 30;
var bar_gap = 5;
var color;
var label_width = 75;
var label_right_margin = 6;
var chart_gutter = 11;
var mobile_threshold = 500;
var pymChild = null;

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

var graphic_data = [
    { 'label': 'Prediabetes', 	'cases': 86009000,	'prevalence': 37.2,	'cost': 510 },
    { 'label': 'Diagnosed', 	'cases': 22291000,	'prevalence': 7.0, 	'cost': 10970 },
    { 'label': 'Undiagnosed', 	'cases': 8129000,	'prevalence': 3.4, 	'cost': 4030 },
    { 'label': 'Gestational', 	'cases': 222000,	'prevalence': 5.5, 	'cost': 5800 }
];


/*
 * Render the graphic
 */
function render(container_width) {
	var graphic_width = Math.floor((container_width - label_width - label_right_margin - chart_gutter) / 2);

    // clear out existing graphics
    $graphic.empty();

	// draw new graphs
	draw_labels();
	draw_graph('cases', graphic_width);
	draw_graph('cost', graphic_width);
}

function draw_labels() {
    var graph = d3.select('#graphic');

    var labels = d3.select('#graphic').append('ul')
        .attr('class', 'labels')
        .attr('style', function() {
        	var s = '';
        	s += 'width: ' + label_width + 'px; ';
        	s += 'height: 10px; ';
        	s += 'margin-right: ' + label_right_margin + 'px; ';
        	return s;
        })
        .selectAll('li')
            .data(graphic_data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + label_width + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return classify(d['label']);
            })
            .append('span')
                .text(function(d) { 
                    return d['label'];
                });
}

function draw_graph(id, graphic_width) {
    var margin = { top: 0, right: 20, bottom: 20, left: 6 };
    var num_bars = graphic_data.length;
    var width = graphic_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);
    var num_x_ticks;
    var x_domain = [];
    
    switch(id) {
    	case 'cases':
    		x_domain = [0,100000000];
    		num_x_ticks = 3;
    		break;
    	case 'cost':
    		x_domain = [0,12000];
    		num_x_ticks = 4;
    		break;
    	case 'prevalence':
    		x_domain = [0,40];
    		num_x_ticks = 4;
    		break;
    }
    
    var graph = d3.select('#graphic')
    	.append('div')
    		.attr('class', 'chart ' + id)
    		.attr('style', function() {
    			var s = '';
    			s += 'width: ' + graphic_width + 'px; ';
    			if (id == 'cases') {
    				s += 'margin-right: ' + chart_gutter + 'px; ';
    			}
    			return s;
    		});

    var x = d3.scale.linear()
        .domain(x_domain)
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d) {
        	switch(id) {
				case 'cases':
					if (d == 0) {
						return 0;
					} else {
						return Math.ceil(d/1000000) + '  mil.';
					}
					break;
				case 'cost':
					return '$' + fmt_comma(d.toFixed(0));
					break;
				case 'prevalence':
					return d.toFixed(0) + '%';
					break;
			}
        });
        
    var x_axis_grid = function() { 
        return xAxis;
    }
    
    var header = graph.append('h3')
    	.attr('style', 'margin-left: ' + margin['left'] + 'px;')
    	.html(eval('hdr_' + id));

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
            .attr("y", function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr("width", function(d){ 
                return x(d[id]);
            })
            .attr("height", bar_height)
            .attr('class', function(d, i) { 
                return 'bar-' + i + ' ' + classify(d['label']);
            });
    
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d) { 
                return x(d[id]);
            })
            .attr('y', function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr('dx', function(d) {
            	if (x(d[id]) < 60) {
            		return 6;
            	} else {
					return -6;
				}
            })
            .attr('dy', (bar_height / 2) + 3)
            .attr('text-anchor', function(d) {
            	if (x(d[id]) < 60) {
            		return 'begin';
            	} else {
					return 'end';
				}
            })
            .attr('class', function(d) { 
                var c = classify(d['label'])
            	if (x(d[id]) < 60) {
            		c += ' out';
            	} else {
					c += ' in';
				}
                return c;
            })
            .attr('fill', function(d) {
            	if (x(d[id]) < 60) {
            		return '#999';
            	} else {
					return '#fff';
				}
            })
            .text(function(d) { 
				switch(id) {
					case 'cases':
						if (d[id] >= 1000000) {
							return (d[id]/1000000).toFixed(1) + ' million';
						} else {
							return fmt_comma(d[id].toFixed(0));
						}
						break;
					case 'cost':
						return '$' + fmt_comma(d[id].toFixed(0));
						break;
					case 'prevalence':
						return d[id].toFixed(0) + '%';
						break;
				}
            });

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
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
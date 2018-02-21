var $graphic = $('#graphic');

var fmt_month = d3.time.format('%B %Y');
var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_default_width = 600;
var is_mobile;
var min_height = 450;
var mobile_threshold = 540;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [
    { 'key': 'Ground beef', 'type': 'beef', 'value': [{ 'date': 'September 2013', 'amt': 3.502 }, { 'date': 'September 2014', 'amt': 4.096 } ]},
    { 'key': 'Chuck roast (USDA choice, boneless)', 'type': 'beef', 'value': [{ 'date': 'September 2013', 'amt': 4.542 }, { 'date': 'September 2014', 'amt': 5.519 }] },
    { 'key': 'Round roast (USDA choice, boneless)', 'type': 'beef', 'value': [{ 'date': 'September 2013', 'amt': 4.661 }, { 'date': 'September 2014', 'amt': 5.584 }] },
    { 'key': 'Sirloin steak (USDA choice boneless)', 'type': 'beef', 'value': [{ 'date': 'September 2013', 'amt': 6.808 }, { 'date': 'September 2014', 'amt': 8.233 }] },
    { 'key': 'Bacon (sliced)', 'type': 'pork', 'value': [{ 'date': 'September 2013', 'amt': 5.680 }, { 'date': 'September 2014', 'amt': 5.953 } ]},
    { 'key': 'Pork chops (all)', 'type': 'pork', 'value': [{ 'date': 'September 2013', 'amt': 3.609 }, { 'date': 'September 2014', 'amt': 4.173 }] },
    { 'key': 'Chicken breast (boneless)', 'type': 'chicken', 'value': [{ 'date': 'September 2013', 'amt': 3.608 }, { 'date': 'September 2014', 'amt': 3.481 }] }
];

var labels = [
    { 'bold': 'Ground beef', 'more': null },
    { 'bold': 'Chuck roast', 'more': 'USDA Choice' },
    { 'bold': 'Round roast', 'more': 'USDA Choice' },
    { 'bold': 'Sirloin steak', 'more': 'USDA Choice' },
    { 'bold': 'Bacon', 'more': null },
    { 'bold': 'Pork chops', 'more': null },
    { 'bold': 'Chicken breast', 'more': 'boneless' }
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
        pymChild.sendHeight();
    }
}

function draw_graph(graphic_width) {
    var graphic = d3.select('#graphic');
    var min_width = 25;
    var max_width = 100;
    var margin = { top: 40, right: 160, bottom: 5, left: 50 };
    var width = graphic_width - margin['left'] - margin['right'];
    var height = min_height - margin['top'] - margin['bottom'];
    
    if (width < min_width) {
        width = min_width;
        margin['right'] = graphic_width - width - margin['left'];
    } else if (width > max_width) {
        width = max_width;
        margin['right'] = graphic_width - width - margin['left'];
    }
    
    var start_month = fmt_month.parse('September 2013');
    var end_month = fmt_month.parse('September 2014');

    var x = d3.time.scale()
        .range([0, width])
        .domain([start_month, end_month]);

    var y = d3.scale.linear()
        .range([height, 0])
        .domain([3.4, 8.3]);
    
    var line = d3.svg.line()
        .x(function(d) { return x(d['date']); })
        .y(function(d) { return y(d['amt']); });
    
    var svg = graphic.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
    
    svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(graphic_data)
        .enter()
            .append('path')
                .attr('class', function(d, i) {
                    return 'line line-' + i + ' ' + classify(labels[i]['bold']) + ' ' + d['type'];
                })
                .attr('d', function(d) {
                    return line(d['value']);
                });

    svg.append('g')
        .attr('class', 'dot begin')
        .selectAll('circle')
            .data(graphic_data)
        .enter().append('circle')
            .attr('cx', function(d, i) { 
                return x(d['value'][0]['date']);
            })
            .attr('cy', function(d, i) { 
                return y(d['value'][0]['amt']);
            })
            .attr('r', 3)
            .attr('class', function(d, i) {
            	return d['type'];
            });

    svg.append('g')
        .attr('class', 'dot end')
        .selectAll('circle')
            .data(graphic_data)
        .enter().append('circle')
            .attr('cx', function(d, i) { 
                return x(d['value'][1]['date']);
            })
            .attr('cy', function(d, i) { 
                return y(d['value'][1]['amt']);
            })
            .attr('r', 3)
            .attr('class', function(d, i) {
            	return d['type'];
            });

    svg.append('g')
        .attr('class', 'value begin')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][0]['date']);
            })
            .attr('y', function(d, i) { 
                var ypos = y(d['value'][0]['amt']);
                return ypos;
            })
            .attr('dx', -10)
            .attr('dy', function(d,i) {
            	switch(labels[i]['bold']) {
            		case 'Round roast':
            			return 4;
            			break;
            		case 'Chuck roast':
            			return 8;
            			break;
            		case 'Pork chops':
            			return 2;
            			break;
            		case 'Chicken breast':
            			return 500; // hide it - overlaps w/ pork chops
            			break;
            		case 'Ground beef':
            			return 8;
            			break;
            		default:
						return 4;
						break;
            	}
            })
            .attr('text-anchor', 'end')
            .attr('class', function(d, i) { 
                return 'value-' + i + ' ' + classify(labels[i]['bold']); 
            })
            .text(function(d) { 
                return '$' + d['value'][0]['amt'].toFixed(2);
            });

    svg.append('g')
        .attr('class', 'value end')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][1]['date']);
            })
            .attr('y', function(d, i) { 
                var ypos = Math.round(y(d['value'][1]['amt'])) + position_label(d, labels[i]['bold']);
                return ypos;
            })
            .attr('dx', 10)
            .attr('dy', 0)
            .attr('text-anchor', 'start')
            .attr('class', function(d, i) { 
                return 'value-' + i + ' ' + classify(labels[i]['bold']); 
            ; })
            .text(function(d) { 
                return '$' + d['value'][1]['amt'].toFixed(2);
            });

/*
    svg.append('g')
        .attr('class', 'value change end')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][1]['date']);
            })
            .attr('y', function(d, i) { 
                var ypos = Math.round(y(d['value'][1]['amt'])) + position_label(d, labels[i]['bold']);
                return ypos;
            })
            .attr('dx', 77)
            .attr('dy', 0)
            .attr('text-anchor', 'end')
            .attr('class', function(d, i) { 
                return 'value-' + i + ' ' + classify(labels[i]['bold']); 
            ; })
            .text(function(d) { 
            	if (d['change'] > 0) {
            		return '+' + d['change'] + '%';
            	} else { 
            		return d['change'] + '%';
            	}
            });
*/

    // axis year labels
    graphic.append('h4')
        .attr('class', 'axis label')
        .attr('style', function(d,i) {
            var s = '';
            s += 'left: 0; ';
            s += 'top: 0; ';
            s += 'width: ' + margin['left'] + 'px; ';
            return s;
        })
        .text(fmt_month(start_month));

    graphic.append('h4')
        .attr('class', 'axis label')
        .attr('style', function(d,i) {
            var s = '';
            s += 'left: ' + (x(end_month) + margin['left']) + 'px; ';
            s += 'top: 0; ';
            s += 'width: ' + margin['left'] + 'px; ';
            return s;
        })
        .text(fmt_month(end_month));

    graphic.append('ul')
        .attr('class', 'label end')
        .attr('style', function(d,i) {
            var s = '';
            s += 'left: ' + margin['left'] + 'px; ';
            s += 'top: ' + margin['top'] + 'px; ';
            return s;
        })
        .selectAll('li')
            .data(graphic_data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'left: ' + (x(d['value'][1]['date']) + 50) + 'px; ';
                s += 'top: ' + (Math.round(y(d['value'][1]['amt'])) - 9.9 + position_label(d, labels[i]['bold'])) + 'px; ';
                s += 'width: ' + (margin['right'] - 55) + 'px;';
                return s;
            })
            .attr('class', function(d, i) { 
                return 'label-' + i + ' ' + classify(labels[i]['bold']); 
            })
            .html(function(d, i) { 
                var lbl = '<strong>' + labels[i]['bold'] + '</strong>';
                if (labels[i]['more']) {
                    lbl += ' (' + labels[i]['more'] + ')';
                }
                return lbl;
            });
}


/*
 * Helper functions
 */
function classify(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}
function position_label(d, lbl) {
	switch(lbl) {
		case 'Round roast':
			return -7;
			break;
		case 'Chuck roast':
			return 15;
			break;
		case 'Pork chops':
			return -2;
			break;
		case 'Ground beef':
			return 6;
			break;
		default:
			return 3;
			break;
	}
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        
        graphic_data.forEach(function(v,k) {
            v['value'][0]['date'] = d3.time.format('%B %Y').parse(v['value'][0]['date']);
            v['value'][1]['date'] = d3.time.format('%B %Y').parse(v['value'][1]['date']);
            v['change'] = Math.round(((v['value'][1]['amt'] - v['value'][0]['amt']) / v['value'][0]['amt']) * 100);
        });
        
        var pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

var $graphic;

var bar_height = 20;
var bar_gap = 10;
var bar_gap_mini = Math.ceil(bar_gap / 5);
var color;
var is_mobile = false;
var mobile_threshold = 500;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [
{"key":"White", "value": [{ "generation": "Millennials", "amt":0.560402108 }, { "generation": "Overall population", "amt":0.62210608 }] },
{"key":"Hispanic", "value": [{ "generation": "Millennials", "amt":0.210190183 }, { "generation": "Overall population", "amt":0.173117533 }] },
{"key":"Black", "value": [{ "generation": "Millennials", "amt":0.13901704 }, { "generation": "Overall population", "amt":0.12380865 }] },
{"key":"Asian", "value": [{ "generation": "Millennials", "amt":0.056231817 }, { "generation": "Overall population", "amt":0.051885459 }] },
{"key":"Two or more races", "value": [{ "generation": "Millennials", "amt":0.023771984 }, { "generation": "Overall population", "amt":0.020004247 }] },
{"key":"Native American", "value": [{ "generation": "Millennials", "amt":0.008293453 }, { "generation": "Overall population", "amt":0.007377881 }] },
{"key":"Pacific Islander", "value": [{ "generation": "Millennials", "amt":0.002093415 }, { "generation": "Overall population", "amt":0.001700151 }] }
];


/*
 * Render the graphic
 */
function render(container_width) {
    var num_bars = graphic_data.length;
    var margin = { top: 0, right: 15, bottom: 20, left: 75 };
    var width = container_width - margin['left'] - margin['right'];
    var height = (((bar_height * 2) + bar_gap_mini + bar_gap) * num_bars) - (bar_gap_mini * 2);
    
    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }
    
    // clear out existing graphics
    $graphic.empty();

    var x = d3.scale.linear()
        .domain([0, .7])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([ height, 0 ]);
        
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues([0,0.1,0.2,0.3,0.4,0.5,0.6,0.7])
        .tickFormat(function(d) {
            return (d * 100).toFixed(0) + '%';
        });
        
    var x_axis_grid = function() { return xAxis; }
    
    // draw the legend
    var legend = d3.select('#graphic')
        .append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(graphic_data[0]['value'])
            .enter().append('li')
                .attr('class', function(d, i) { 
                    return 'key-item key-' + i + ' ' + classify(d['generation']);
                });
    legend.append('b')
        .style('background-color', function(d) {
        	return color(d['generation']);
        });
    legend.append('label')
        .text(function(d) {
            return d['generation'];
        });
        
    // draw the chart
    var chart = d3.select('#graphic').append('div')
        .attr('class', 'chart');
    
    var svg = chart.append('svg')
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
        
    var group = svg.selectAll('.group')
        .data(graphic_data)
        .enter().append('g')
            .attr('class', 'g')
            .attr('transform', function(d,i) { 
                var group_height = (bar_height * d['value'].length) + (bar_gap_mini * (d['value'].length - 1));
                if (i == 0) {
                    return 'translate(0,0)';
                } else {
                    return 'translate(0,' + ((group_height + bar_gap) * i) + ')';
                }
            });
            
    group.selectAll('rect')
        .data(function(d) { return d['value']; })
        .enter().append('rect')
            .attr('height', bar_height)
            .attr('x', function(d, i) { 
                return 0;
            })
            .attr('y', function(d, i) { 
                if (i == 0) {
                    return 0;
                } else {
                    return (bar_height * i) + (bar_gap_mini * i);
                }
            })
            .attr('width', function(d) { 
                return x(d['amt']);
            })
            .style('fill', function(d) {
            	return color(d['generation']);
            })
            .attr('class', function(d) { 
                return 'y-' + d['generation'];
            });
    
    group.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(function(d) { return d['value']; })
        .enter().append('text')
            .attr('x', function(d) { 
                return x(d['amt']); 
            })
            .attr('y', function(d, i) { 
                if (i == 0) {
                    return 0;
                } else {
                    return (bar_height * i) + bar_gap_mini;
                }
            })
            .attr('dx', 6)
            .attr('dy', (bar_height / 2) + 4)
            .attr('text-anchor', 'begin')
            .attr('class', function(d) { 
                return d['key'];
            })
            .text(function(d) { 
            	v = (d['amt'] * 100).toFixed(0);
            	if (d['amt'] > 0 && v == 0) {
            		v = '<1';
            	}
                return v + '%';
            });
    
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + margin['left'] + 'px; top: 4px;')
        .selectAll('li')
            .data(graphic_data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + (margin['left'] - 10) + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_height + bar_gap_mini + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d,i) {
                return classify(d['key']);
            })
            .append('span')
                .text(function(d) { return d['key'] });

    if (pymChild) {
        pymChild.sendHeight();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}


$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // load the data
        color = d3.scale.ordinal()
            .range([colors['yellow3'], colors['yellow5']])
            .domain(d3.keys(graphic_data[0]).filter(function(key) { return key !== 'group'; }));

        /*
        graphic_data.forEach(function(d) {
            var x0 = 0;
            d['ratings'] = color.domain().map(function(name) { 
                return { name: name, x0: x0, x1: x0 += +d[name], val: +d[name] }; 
            });
            d['total'] = d['ratings'][d['ratings'].length - 1]['x1'];
        });
        */
        
        // setup pym
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

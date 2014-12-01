var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_default_width = 600;
var is_mobile;
var label_width = 60;
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
    { 'key': '15–19 years', 'value': [{ 'date': '2000', 'amt': 13.0 }, { 'date': '2010', 'amt': 11.7 }] },
    { 'key': '20–24 years', 'value': [{ 'date': '2000', 'amt': 21.4 }, { 'date': '2010', 'amt': 22.2 }] },
    { 'key': '25–34 years', 'value': [{ 'date': '2000', 'amt': 19.6 }, { 'date': '2010', 'amt': 22.5 }] },
    { 'key': '35–44 years', 'value': [{ 'date': '2000', 'amt': 22.8 }, { 'date': '2010', 'amt': 24.6 }] },
    { 'key': '45–54 years', 'value': [{ 'date': '2000', 'amt': 22.4 }, { 'date': '2010', 'amt': 30.4 } ]},
    { 'key': '55–64 years', 'value': [{ 'date': '2000', 'amt': 19.4 }, { 'date': '2010', 'amt': 27.7 } ]},
    { 'key': '≥ 65 years', 'value': [{ 'date': '2000', 'amt': 31.1 }, { 'date': '2010', 'amt': 29.0 }] }
];

var graphic_data_key = [ 
    { 'key': '2000', 'color': colors['blue5'] },
    { 'key': '2010', 'color': colors['blue2'] }
];

var header_text = {
    'all': 'All Households',
    'smoke': 'At Least One Adult Smoker',
    'no': 'No Adult Smokers'
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
    
    graphic_width = Math.floor((container_width - label_width));
    
    // clear out existing graphics
    $graphic.empty();
    
    draw_graph('all', (graphic_width + label_width));

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function draw_graph(id, graphic_width) {
    var bar_height;
    var bar_gap;
    var dot_radius;
    var height;
    var margin;
    var num_bars = graphic_data.length;
    var tick_values = [];
    var underbar_height;
    var underbar_offset;
    var width;

    if (is_mobile) {
        tick_values = [ 0, 25, 50 ];
        bar_height = 20;
        bar_gap = 2;
        margin = { top: 20, right: 5, bottom: 20, left: 5 };
    } else {
        tick_values = [ 0, 10, 20, 30, 40, 50 ];
        bar_height = 30;
        bar_gap = 2;
        margin = { top: 20, right: 15, bottom: 20, left: 15 };
    }
    underbar_height = bar_height / 2;
    underbar_offset = (bar_height - underbar_height) / 2;
    dot_radius = underbar_height / 2;

    if (id == 'all') {
        margin['left'] += label_width;
    }

    width = graphic_width - margin['left'] - margin['right'];
    height = ((bar_height + bar_gap) * num_bars);
    
    var x = d3.scale.linear()
        .range([ 0, width ])
        .domain([ 0,40 ]);

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues(tick_values)
        .tickFormat(function(d) {
            return d;
        });

    var xAxisTop = d3.svg.axis()
        .scale(x)
        .orient('top')
        .tickValues(tick_values)
        .tickFormat(function(d) {
            return d;
        });

    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(0);
    
    // draw the legend
    if (id == 'all') {
        var legend = d3.select('#graphic')
            .insert('ul', '.headers')
                .attr('class', 'key')
                .selectAll('g')
                    .data(graphic_data_key)
                .enter().append('li')
                    .attr('class', function(d, i) { 
                        return 'key-item key-' + i + ' ' + classify(d['key']);
                    });
        legend.append('b')
            .style('background-color', function(d) {
                return d['color'];
            });
        legend.append('label')
            .text(function(d) {
                return d['key'];
            });
    }


    // draw the chart
    var svg = d3.select('#graphic')
        .append('svg')
            .attr('width', graphic_width)
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // show state labels
    if (id == 'all') {
        var state_names = svg.append('g')
            .attr('class', 'label')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', -margin['left'])
                .attr('y', function(d, i) { 
                    return i * (bar_height + bar_gap);
                })
                .attr('dx', margin['left'] - 6)
                .attr('dy', (bar_height / 2) + 4)
                .attr('text-anchor', 'end')
                .attr('class', function(d) { 
                    return classify(d['key'])
                })
                .text(function(d,i) { 
                    return d['key']
                });
    }
    
    var shaded_rows = svg.append('g')
        .attr('class', 'rows')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr('class', 'bg-row')
            .attr('fill', '#f1f1f1')
            .attr('width', width)
            .attr('height', bar_height)
            .attr('x', 0)
            .attr('y', function(d,i) {
                return (bar_height + bar_gap) * i;
            });

    var xTop = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,0)')
        .call(xAxisTop);

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
        
    var underbars = svg.append('g')
        .attr('class', 'underbars')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr('width', function(d,i) {
                var x0 = d['value'][0]['amt'];
                var x1 = d['value'][1]['amt'];
                return Math.abs(x(x1) - x(x0));
            })
            .attr('height', underbar_height)
            .attr('x', function(d,i) {
                if (d['decrease']) {
                    return x(d['value'][1]['amt']);
                } else {
                    return x(d['value'][0]['amt']);
                }
            })
            .attr('y', function(d,i) {
                return ((bar_height + bar_gap) * i) + underbar_offset;
            })
            .attr('fill', colors['blue6']);

    var dots_20000 = svg.append('g')
        .attr('class', 'dots dots-2000')
        .selectAll('circle')
            .data(graphic_data)
        .enter().append('circle')
            .attr('cy', function(d,i) { 
                return ((bar_height + bar_gap) * i) + (bar_height / 2);
            })
            .attr('cx', function(d) { 
                return x(d['value'][0]['amt']);
            })
            .attr('r', dot_radius)
            .attr('class', function(d) { 
                return classify(d['key']);
            })
            .attr('fill', colors['blue5']);

    var dots_2010 = svg.append('g')
        .attr('class', 'dots dots-2010')
        .selectAll('circle')
            .data(graphic_data)
        .enter().append('circle')
            .attr('cy', function(d,i) { 
                return ((bar_height + bar_gap) * i) + (bar_height / 2);
            })
            .attr('cx', function(d) { 
                return x(d['value'][1]['amt']);
            })
            .attr('r', dot_radius)
            .attr('class', function(d) { 
                return classify(d['key']);
            })
            .attr('fill', colors['blue2']);
        
    var values_2000 = svg.append('g')
        .attr('class', 'value value-2000')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d) {
                return x(d['value'][0]['amt']);
            })
            .attr('y', function(d, i) { 
                return ((bar_height + bar_gap) * i);
            })
            .attr('dx', function(d) {
                if (d['decrease']) {
                    return dot_radius + 3;
                } else {
                    return -(dot_radius + 3);
                }
             })
            .attr('dy', (bar_height / 2) + 4)
            .attr('text-anchor', function(d) {
                if (d['decrease']) {
                    return 'begin';
                } else {
                    return 'end';
                }
            })
            .attr('class', function(d) { 
                return classify(d['key'])
            })
            .text(function(d,i) { 
                return d['value'][0]['amt'].toFixed(0);
            });
    var values_2010 = svg.append('g')
        .attr('class', 'value value-2010')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d) {
                return x(d['value'][1]['amt']);
            })
            .attr('y', function(d, i) { 
                return ((bar_height + bar_gap) * i);
            })
            .attr('dx', function(d) {
                if (d['decrease']) {
                    return -(dot_radius + 3);
                } else {
                    return dot_radius + 3;
                }
             })
            .attr('dy', (bar_height / 2) + 4)
            .attr('text-anchor', function(d) {
                if (d['decrease']) {
                    return 'end';
                } else {
                    return 'begin';
                }
            })
            .attr('class', function(d) { 
                return classify(d['key'])
            })
            .text(function(d,i) { 
                return d['value'][1]['amt'].toFixed(0);
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
        
        graphic_data.forEach(function(v,k) {
            console.log(v,k);
            var amt0 = v['value'][0]['amt'];
            var amt1 = v['value'][1]['amt'];
            var decrease = false;
            
            if (amt1 < amt0) {
                decrease = true;
            }
            
            v['decrease'] = decrease;
        });

        var pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
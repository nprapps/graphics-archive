var $graphic;

var bar_height;
var bar_height_desktop = 30;
var bar_height_mobile = 20;
var bar_gap = 5;
var color;
var is_mobile;
var graph_margin = 6;
var label_width;
var label_width_desktop = 100;
var label_width_mobile = 70;
var margin;
var margin_desktop = { top: 0, right: 15, bottom: 25, left: 10 };
var margin_mobile = { top: 0, right: 0, bottom: 0, left: 0 };
var mobile_threshold = 480;
var tick_values_x_desktop = [0,25,50,75,100];
var tick_values_x_mobile = [0,50,100];
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data_destress = [
    { 'group': 'Socializing', 'yes': 71, 'no': 29 },
    { 'group': 'Meditation or prayer', 'yes': 57, 'no': 43 },
    { 'group': 'Time outdoors', 'yes': 57, 'no': 43 },
    { 'group': 'Healthful eating', 'yes': 55, 'no': 45 },
    { 'group': 'Exercise', 'yes': 49, 'no': 51 },
    { 'group': 'Time with pets', 'yes': 47, 'no': 53 },
    { 'group': 'Hobbies', 'yes': 46, 'no': 54 },
    { 'group': 'Medication', 'yes': 36, 'no': 64 },
    { 'group': 'Professional help', 'yes': 35, 'no': 65 },
    { 'group': 'Time off work', 'yes': 25, 'no': 75 }
];

var graphic_data_effective = [
    { 'group': 'Socializing', 'yes': 83, 'no': 17 },
    { 'group': 'Meditation or prayer', 'yes': 85, 'no': 15 },
    { 'group': 'Time outdoors', 'yes': 94, 'no': 6 },
    { 'group': 'Healthful eating', 'yes': 63, 'no': 37 },
    { 'group': 'Exercise', 'yes': 89, 'no': 11 },
    { 'group': 'Time with pets', 'yes': 87, 'no': 13 },
    { 'group': 'Hobbies', 'yes': 93, 'no': 7 },
    { 'group': 'Medication', 'yes': 70, 'no': 30 },
    { 'group': 'Professional help', 'yes': 65, 'no': 35 },
    { 'group': 'Time off work', 'yes': 79, 'no': 21 }
];


/*
 * Render the graphic
 */
function render(container_width) {
    if (container_width <= mobile_threshold) {
        is_mobile = true;
        bar_height = bar_height_mobile;
        label_top = 22;
        label_width = label_width_mobile;
        margin = margin_mobile;
        tick_values_x = tick_values_x_mobile;
    } else {
        is_mobile = false;
        bar_height = bar_height_desktop;
        label_top = 27;
        label_width = label_width_desktop;
        margin = margin_desktop;
        tick_values_x = tick_values_x_desktop;
    }
    
    var graph_width = (container_width - label_width) / 2 - graph_margin;

    // clear out existing graphics
    $graphic.empty();

    var grouping = d3.select('#graphic').append('div')
        .attr('class', 'grouping')
        .style('padding-left', label_width + 'px');
        
    var labels = grouping.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + label_width + 'px; top: ' + label_top + 'px; left: 0;')
        .selectAll('li')
            .data(d3.entries(graphic_data_destress))
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
                return classify(d['value']['group']);
            })
            .append('span')
                .text(function(d) { 
                    return d['value']['group'];
                });
    
    draw_chart(graphic_data_destress, graph_width, 'Strategies');
    draw_chart(graphic_data_effective, graph_width, 'Effectiveness');
}

function draw_chart(graphic_data, graph_width, title) {
    var num_bars = graphic_data.length;
    var width = graph_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);
    
    var x = d3.scale.linear()
        .domain([0, 100])
        .rangeRound([0, width]);

    var y = d3.scale.ordinal()
        .domain(graphic_data.map(function(d) { return d['group']; }));
        
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues(tick_values_x)
        .tickFormat(function(d) {
            return d + '%';
        });
        
    var x_axis_grid = function() { return xAxis; }
    
    var chart = d3.select('#graphic .grouping').append('div')
        .attr('class', 'chart')
        .attr('style', 'width: ' + graph_width + 'px; margin-left: ' + graph_margin + 'px;');
    
    var header = chart.append('h3')
        .attr('style', 'margin-left: ' + margin['left'] + 'px')
        .text(title);
    
    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
    
    if (!is_mobile) {
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
    }
        
    var group = svg.selectAll('.group')
        .data(graphic_data)
        .enter().append('g')
            .attr('class', 'g')
            .attr('transform', function(d,i) { 
//                return 'translate(0,' + y(d['group']) + ')';
                return 'translate(0,' + (bar_height + bar_gap) * i + ')';
            });
            
    group.selectAll('rect')
        .data(function(d) { return d['ratings']; })
        .enter().append('rect')
            .attr('height', bar_height)
            .attr('x', function(d) { 
                return x(d['x0']); 
            })
            .attr('width', function(d) { 
                return x(d['x1']) - x(d['x0']);
            })
            .style('fill', function(d) { 
                return color(d['name']);
            })
            .attr('class', function(d) { 
                return classify(d['name']);
            });

    group.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(function(d) { return d['ratings']; })
        .enter().append('text')
            .attr('x', function(d, i) { 
                if (i == 0 || i == 1) {
                    return x(d['x1']);
                } else if (i == 2) {
                    return x((d['x1'] - d['x0']) / 2 + d['x0']);
                } else {
                    return x(d['x0']);
                }
            })
            .attr('dx', function(d, i) {
                if (i == 0 || i == 1) {
                    return -6;
                } else if (i == 2) {
                    return 0;
                } else {
                    return 6;
                }
            })
            .attr('dy', (bar_height / 2) + 4)
            .attr('text-anchor', function(d, i) {
                if (i == 0 || i == 1) {
                    return 'end';
                } else if (i == 2) {
                    return 'middle';
                } else {
                    return 'begin';
                }
            })
            .attr('class', function(d) { 
                return classify(d['name']);
            })
            .text(function(d) { 
                return d['val'] + '%';
            });
    
    if (pymChild) {
        pymChild.sendHeight();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}

function process_data(data) {
    data.forEach(function(d) {
        var x0 = 0;
        d['ratings'] = color.domain().map(function(name) { 
            return { name: name, x0: x0, x1: x0 += +d[name], val: +d[name] }; 
        });
        d['total'] = d['ratings'][d['ratings'].length - 1]['x1'];
    });
}


$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // process the data
        color = d3.scale.ordinal()
            .range([colors['red3'], '#f1f1f1'])
            .domain(d3.keys(graphic_data_destress[0]).filter(function(key) { return key !== 'group'; }));
        
        process_data(graphic_data_destress);
        process_data(graphic_data_effective);

        // setup pym
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

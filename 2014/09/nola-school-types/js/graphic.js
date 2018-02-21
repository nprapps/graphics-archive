var $graphic;

var bar_height = 30;
var bar_gap = 5;
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
    { 'group': 'Traditional', '2004': 126, '2014': 6 },
    { 'group': 'Private', '2004': 93, '2014': 67 },
    { 'group': 'Charter', '2004': 3, '2014': 74 },
    { 'group': 'Other', '2004': 1, '2014': 1 }
];

var header_text = [ '2004-05', '2014-15' ];


/*
 * Render the graphic
 */
function render(container_width) {
    var num_bars = graphic_data.length;
    var margin = { top: 0, right: 15, bottom: 20, left: 75 };
    var width = container_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);
    
    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }
    
    // clear out existing graphics
    $graphic.empty();

    var x = d3.scale.linear()
        .domain([-150, 150])
        .rangeRound([0, width]);

    var y = d3.scale.ordinal()
        .domain(graphic_data.map(function(d) { return d['group']; }))
        .rangeRoundBands([0, height], .1);
        
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues(function(){
            if (is_mobile) {
                return [-150,-100,-50,0,50,100,150];
            } else {
                return [-150,-125,-100,-75,-50,-25,0,25,50,75,100,125,150];
            }
        })
        .tickFormat(function(d) {
            return Math.abs(d);
        });
        
    var x_axis_grid = function() { return xAxis; }
    
    var headers = d3.select('#graphic').append('ul')
        .attr('class', 'headers')
        .attr('style', function() {
            var s = '';
            s += 'margin-left: ' + margin['left'] + 'px; ';
            s += 'width: ' + width + 'px;';
            return s;
        });
    
    headers.append('li')
        .attr('class', 'header-1')
        .text(header_text[0]);

    headers.append('li')
        .attr('class', 'header-2')
        .text(header_text[1]);
    
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
            .attr('transform', function(d) { 
                return 'translate(0,' + y(d['group']) + ')';
            });
            
    group.selectAll('rect')
        .data(function(d) { return d['ratings']; })
        .enter().append('rect')
            .attr('height', bar_height)
            .attr('x', function(d, i) { 
                if (i == 0) {
                    return x(-d['val']);
                } else {
                    return x(0); 
                }
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
                if (i == 0) {
                    return x(-d['val']);
                } else {
                    return x(d['val']); 
                }
            })
            .attr('dx', function(d, i) {
                var bar_width = x(d['x1']) - x(d['x0']);
                if (i == 0) {
                    if (bar_width < 15) {
                        return -6;
                    } else {
                        return 6;
                    }
                } else {
                    if (bar_width < 15) {
                        return 6;
                    } else {
                        return -6;
                    }
                }
            })
            .attr('dy', (bar_height / 2) + 4)
            .attr('text-anchor', function(d, i) {
                var bar_width = x(d['x1']) - x(d['x0']);
                if (i == 0) {
                    if (bar_width < 15) {
                        return 'end';
                    } else {
                        return 'begin';
                    }
                } else {
                    if (bar_width < 15) {
                        return 'begin';
                    } else {
                        return 'end';
                    }
                }
            })
            .attr('class', function(d,i) { 
                var bar_width = x(d['x1']) - x(d['x0']);
                var cl = classify(d['name']);
                if (i == 0) {
                    if (bar_width < 15) {
                        cl += ' out';
                    } else {
                        cl += ' in';
                    }
                } else {
                    if (bar_width < 15) {
                        cl += ' out';
                    } else {
                        cl += ' in';
                    }
                }
                return cl;
            })
            .text(function(d) { 
                return d['val'];
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
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d,i) {
                return classify(d['group']);
            })
            .append('span')
                .text(function(d) { return d['group'] });

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
            .range([colors['blue4'], colors['blue2']])
            .domain(d3.keys(graphic_data[0]).filter(function(key) { return key !== 'group'; }));

        graphic_data.forEach(function(d) {
            var x0 = 0;
            d['ratings'] = color.domain().map(function(name) { 
                return { name: name, x0: x0, x1: x0 += +d[name], val: +d[name] }; 
            });
            d['total'] = d['ratings'][d['ratings'].length - 1]['x1'];
        });

        // setup pym
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

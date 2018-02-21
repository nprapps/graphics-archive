var $graphic;

var color;
var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var mobile_threshold = 540;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [{'year':2000,'Research grants':19690332,'Remaining budget':7974405,'Federal stimulus funding':null},
{'year':2001,'Research grants':22093503,'Remaining budget':8745583,'Federal stimulus funding':null},
{'year':2002,'Research grants':24213580,'Remaining budget':9536491,'Federal stimulus funding':null},
{'year':2003,'Research grants':25764092,'Remaining budget':11816968,'Federal stimulus funding':null},
{'year':2004,'Research grants':26340338,'Remaining budget':11739021,'Federal stimulus funding':null},
{'year':2005,'Research grants':25824034,'Remaining budget':11502929,'Federal stimulus funding':null},
{'year':2006,'Research grants':24775134,'Remaining budget':10788042,'Federal stimulus funding':null},
{'year':2007,'Research grants':24227373,'Remaining budget':10644706,'Federal stimulus funding':null},
{'year':2008,'Research grants':23498491,'Remaining budget':10130673,'Federal stimulus funding':null},
{'year':2009,'Research grants':23402858,'Remaining budget':10273373,'Federal stimulus funding':5522459},
{'year':2010,'Research grants':23216233,'Remaining budget':10372092,'Federal stimulus funding':5894366},
{'year':2011,'Research grants':22426374,'Remaining budget':9801877,'Federal stimulus funding':null},
{'year':2012,'Research grants':22305707,'Remaining budget':9691415,'Federal stimulus funding':null},
{'year':2013,'Research grants':20389457,'Remaining budget':9293921,'Federal stimulus funding':null},
{'year':2014,'Research grants':20615185,'Remaining budget':9460545,'Federal stimulus funding':null}];


/*
 * Render the graphic
 */
function render(container_width) {
    var graphic_aspect_height;
    var graphic_aspect_width;
    var margin = { top: 10, right: 15, bottom: 25, left: 67 };
    var num_y_ticks = 6;
    var height;
    var width;
    
    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }
    
    if (is_mobile) {
        graphic_aspect_width = 4;
        graphic_aspect_height = 3;
    } else {
        graphic_aspect_width = 16;
        graphic_aspect_height = 9;
    }

    width = container_width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

    // clear out existing graphics
    $graphic.empty();

    var x = d3.scale.ordinal()
        .domain(graphic_data.map(function(d) { 
            return d['year'];
        }))
        .rangeRoundBands([0, width], .1, 0);

    var y = d3.scale.linear()
        .rangeRound([height, 0])
        .domain([0, 50000000000]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (is_mobile) {
                if (i%2 == 0) {
                    return '\u2019' + fmt_year_abbr(d);
                }
            } else {
                    return '\u2019' + fmt_year_abbr(d);
            }
        });
        
    var x_axis_grid = function() { return xAxis; }
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .ticks(num_y_ticks)
        .orient('left')
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else {
                return '$' + d/1000000000 + ' billion';
            }
        });
    
    var y_axis_grid = function() { return yAxis; }
    
    var legend = d3.select('#graphic').append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(graphic_data[0]['budget'])
            .enter().append('li')
                .attr('class', function(d, i) { 
                    return 'key-item key-' + i + ' ' + classify(d['name']); 
                });
    legend.append('b')
        .style('background-color', function(d,i) { 
            return color(d['name']);
        })
    legend.append('label')
        .text(function(d) {
            return d['name'];
        });

    var chart = d3.select('#graphic').append('div')
        .attr('class', 'chart');
    
    var svg = chart.append('svg')
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

    var yGrid = svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );
    
    var year = svg.selectAll('.year')
        .data(graphic_data)
        .enter().append('g')
            .attr('class', 'year')
            .attr('transform', function(d) { 
                return 'translate(' + x(d['year']) + ',0)';
            });
            
    year.selectAll('rect')
        .data(function(d) { 
            return d['budget'];
        })
        .enter().append('rect')
            .attr('width', x.rangeBand())
            .attr('x', function(d) { 
                return x(d['x0']); 
            })
            .attr('y', function(d) { 
                return y(d['y1']);
            })
            .attr('height', function(d) { 
                return y(d['y0']) - y(d['y1']);
            })
            .style('fill', function(d) { 
                return color(d['name']);
            })
            .attr('class', function(d) { 
                return classify(d['name']);
            });

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
            .range([ colors['red2'], colors['red4'], colors['red6'] ])
            .domain(d3.keys(graphic_data[0]).filter(function(key) { return key !== 'year'; }));

        graphic_data.forEach(function(d) {
            var y0 = 0;
            d['year'] = d3.time.format('%Y').parse(d['year'].toString());
            d['budget'] = color.domain().map(function(name) { 
                if (d[name] != null) {
                    d[name] = +d[name] * 1000;
                }
                return { name: name, y0: y0, y1: y0 += +d[name], val: +d[name] };
            });
            d['total'] = d['budget'][d['budget'].length - 1]['y1'];
        });
        
        // setup pym
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

var $graphic;
var graphic_aspect_width = 4;
var graphic_aspect_height = 3;
var graphic_default_width = 600;
var is_mobile = false;
var mobile_threshold = 625;
var graphic_mobile_threshold = 480;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data_prisoners = [
    { 'year': '1997', 'amt': 41070 },
    { 'year': '1998', 'amt': 42966 },
    { 'year': '1999', 'amt': 43300 },
    { 'year': '2000', 'amt': 44200 },
    { 'year': '2001', 'amt': 40200 },
    { 'year': '2002', 'amt': 40800 },
    { 'year': '2003', 'amt': 60300 },
    { 'year': '2004', 'amt': 69900 },
    { 'year': '2005', 'amt': 66500 },
    { 'year': '2006', 'amt': 80200 },
    { 'year': '2007', 'amt': 76600 },
    { 'year': '2008', 'amt': 77800 },
    { 'year': '2009', 'amt': 79100 },
    { 'year': '2010', 'amt': 124400 }
];

var graphic_data_percent = [
    { 'year': '1997', 'amt': 3.44 },
    { 'year': '1998', 'amt': 3.45 },
    { 'year': '1999', 'amt': 3.32 },
    { 'year': '2000', 'amt': 3.32 },
    { 'year': '2001', 'amt': 2.99 },
    { 'year': '2002', 'amt': 2.96 },
    { 'year': '2003', 'amt': 4.28 },
    { 'year': '2004', 'amt': 4.88 },
    { 'year': '2005', 'amt': 4.55 },
    { 'year': '2006', 'amt': 5.33 },
    { 'year': '2007', 'amt': 5.00 },
    { 'year': '2008', 'amt': 5.03 },
    { 'year': '2009', 'amt': 5.10 },
    { 'year': '2010', 'amt': 8.06 }
];

var labels = {
    'prisoners': 'Number Of Prisoners Age 55 And Older',
    'percent': 'As A Share Of The Prison Population'
};

/*
 * Render the graphic
 */
function draw_graphic(container_width) {
    if (!container_width) {
        container_width = graphic_default_width;
    }
    var graphic_width = container_width;

    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
        graphic_width = Math.floor((container_width - 22) / 2);
    }

    // clear out existing graphics
    $graphic.empty();

    // load in new graphics
    render_bar_chart(graphic_data_prisoners, 'prisoners', graphic_width)
    render_line_chart(graphic_data_percent, 'percent', graphic_width)
}

function render_bar_chart(data, id, container_width) {
    var graphic_data = data;
    var last_data_point = graphic_data.length - 1;
    var margin = { top: 10, right: 10, bottom: 20, left: 53 };
    var num_y_ticks = 5;
    var width = container_width - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(graphic_data.map(function(d) { return d['year']; }));

    var y = d3.scale.linear()
        .range([height, 0])
        .domain([0, d3.max(graphic_data, function(d) { 
            var n = parseInt(d['amt']);
            return Math.ceil(n/50000) * 50000; // round to next 50K
        })]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            if (container_width <= graphic_mobile_threshold) {
                if ((i % 2) == 1) {
                    var fmt = d3.time.format('%y');
                    return '\u2019' + fmt(d);
                }
            } else {
                var fmt = d3.time.format('%Y');
                return fmt(d);
            }
        });
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks);

    var y_axis_grid = function() { return yAxis; }
    
    var container = d3.select('#graphic').append('div')
        .attr('id', 'graph-' + id)
        .attr('class', 'graph')
        .attr('style', function(d) {
            if (!is_mobile) {
                return 'width: ' + (width + margin['left'] + margin['right']) + 'px';
            }
        });
    
    var headline = container.append('h3')
        .text(labels[id]);
    
    var svg = container.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr('x', function(d) { 
                return x(d['year']);
            })
            .attr('y', function(d) { 
                return y(d['amt']);
            })
            .attr('width', x.rangeBand())
            .attr('height', function(d){ 
                return height - y(d['amt']);
            })
            .attr('class', function(d, i) {
                return 'bar bar-' + i;
            });
                
    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function render_line_chart(data, id, container_width) {
    var graphic_data = data;
    var margin = { top: 10, right: 30, bottom: 20, left: 33 };
    var width = container_width - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin.top - margin.bottom;
    var last_data_point = graphic_data.length - 1;
    var num_y_ticks = 5;

    var x = d3.time.scale()
        .range([0, width])
        .domain(d3.extent(graphic_data, function(d) { 
            return d['year'];
        }));;

    var y = d3.scale.linear()
        .range([height, 0])
        .domain([0, d3.max(graphic_data, function(d) { 
            var n = parseInt(d['amt']);
            return Math.ceil(n/10) * 10; // round to next 10
        })]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            if (container_width <= graphic_mobile_threshold) {
                if ((i % 2) == 1) {
                    var fmt = d3.time.format('%y');
                    return '\u2019' + fmt(d);
                }
            } else {
                var fmt = d3.time.format('%Y');
                return fmt(d);
            }
        });
        
    var x_axis_grid = function() { return xAxis; }

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            return d + '%';
        });
    
    var y_axis_grid = function() { return yAxis; }

    var line = d3.svg.line()
        .x(function(d) { return x(d['year']); })
        .y(function(d) { return y(d['amt']); });
    
    // parse data into columns
    var lines = {};
    for (var column in graphic_data[0]) {
        if (column == 'year') continue;
        lines[column] = graphic_data.map(function(d) {
            return { 'year': d['year'], 'amt': d[column] };
        });
    }
   
    var container = d3.select('#graphic').append('div')
        .attr('id', 'graph-' + id)
        .attr('class', 'graph')
        .attr('style', function(d) {
            if (!is_mobile) {
                return 'width: ' + (width + margin['left'] + margin['right']) + 'px';
            }
        });
    
    var headline = container.append('h3')
        .text(labels[id]);
    
    var svg = container.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
    
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);
    
    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

    svg.append('g').selectAll('path')
        .data(d3.entries(lines))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });
    
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(d3.entries(lines))
        .enter()
            .append('text')
                .attr('class', function(d, i) {
                    return 'value-' + i + ' ' + classify(d['key']);
                })
                .attr('x', function(d) { 
                    return x(d['value'][last_data_point]['year']) + 6;
                })
                .attr('y', function(d) { 
                    return y(d['value'][last_data_point]['amt']);
                })
                .attr('dy', 2)
                .attr('text-anchor', 'left')
                .text(function(d) { 
                    return d['value'][last_data_point]['amt'].toFixed(0) + '%';
                });

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        graphic_data_prisoners.forEach(function(d) {
            d['year'] = d3.time.format('%Y').parse(d['year']);
        });

        graphic_data_percent.forEach(function(d) {
            d['year'] = d3.time.format('%Y').parse(d['year']);
        });

        // setup pym
        pymChild = new pym.Child({
            renderCallback: draw_graphic
        });
    } else {
        pymChild = new pym.Child();
    }
})

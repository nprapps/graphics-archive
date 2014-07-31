var $graphic;
var graphic_aspect_width = 4;
var graphic_aspect_height = 3;
var graphic_default_width = 600;
var mobile_threshold = 480;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [
    { 'date': '1/1/1989', 'Stay-at-home fathers': 1064772 },
    { 'date': '1/1/1990', 'Stay-at-home fathers': 1034155 },
    { 'date': '1/1/1991', 'Stay-at-home fathers': 1261800 },
    { 'date': '1/1/1992', 'Stay-at-home fathers': 1420350 },
    { 'date': '1/1/1993', 'Stay-at-home fathers': 1580262 },
    { 'date': '1/1/1994', 'Stay-at-home fathers': 1469336 },
    { 'date': '1/1/1995', 'Stay-at-home fathers': 1371402 },
    { 'date': '1/1/1996', 'Stay-at-home fathers': 1321460 },
    { 'date': '1/1/1997', 'Stay-at-home fathers': 1327054 },
    { 'date': '1/1/1998', 'Stay-at-home fathers': 1274992 },
    { 'date': '1/1/1999', 'Stay-at-home fathers': 1306862 },
    { 'date': '1/1/2000', 'Stay-at-home fathers': 1280163 },
    { 'date': '1/1/2001', 'Stay-at-home fathers': 1287000 },
    { 'date': '1/1/2002', 'Stay-at-home fathers': 1452961 },
    { 'date': '1/1/2003', 'Stay-at-home fathers': 1665141 },
    { 'date': '1/1/2004', 'Stay-at-home fathers': 1538063 },
    { 'date': '1/1/2005', 'Stay-at-home fathers': 1508298 },
    { 'date': '1/1/2006', 'Stay-at-home fathers': 1621172 },
    { 'date': '1/1/2007', 'Stay-at-home fathers': 1543557 },
    { 'date': '1/1/2008', 'Stay-at-home fathers': 1653634 },
    { 'date': '1/1/2009', 'Stay-at-home fathers': 2104892 },
    { 'date': '1/1/2010', 'Stay-at-home fathers': 2215259 },
    { 'date': '1/1/2011', 'Stay-at-home fathers': 2135340 },
    { 'date': '1/1/2012', 'Stay-at-home fathers': 2028163 } 
];

var recession_dates = [
    { 'begin': '1990-07-01', 'end': '1991-03-01' },
    { 'begin': '2001-03-01', 'end': '2001-11-01' },
    { 'begin': '2007-12-01', 'end': '2009-06-01' }
];


/*
 * Render the graphic
 */
function render(container_width) {
    if (!container_width) {
        container_width = graphic_default_width;
    }

    var margin = {top: 10, right: 55, bottom: 20, left: 65};
    var width = container_width - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];
    var last_data_point = graphic_data.length - 1;
    var num_x_ticks = 10;
    var num_y_ticks = 5;
    if (container_width < mobile_threshold) {
        num_x_ticks = 5;
    }

    // clear out existing graphics
    $graphic.empty();

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(num_x_ticks)
        .tickFormat(function(d) {
            var fmt = d3.time.format('%y');
            return '\u2019' + fmt(d);
        });
        
    var x_axis_grid = function() { return xAxis; }

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks)
        .tickFormat(function(d, i) {
            var t = (d / 1000000).toFixed(1);
            if (t > 0) {
                t += ' million';
            }
            return t;
        });
    
    var y_axis_grid = function() { return yAxis; }
    
    var line = d3.svg.line()
//        .interpolate('monotone')
        .x(function(d) { return x(d['date']); })
        .y(function(d) { return y(d['amt']); });
    
    // parse data into columns
    var lines = {};
    for (var column in graphic_data[0]) {
        if (column == 'date') continue;
        lines[column] = graphic_data.map(function(d) {
            return { 'date': d['date'], 'amt': +d[column] };
        });
    }
    
    var legend = d3.select('#graphic').append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(d3.entries(lines))
        .enter().append('li')
            .attr('class', function(d, i) { 
                return 'key-item key-' + i + ' ' + classify(d['key']);
            });
    legend.append('b')
    legend.append('label')
        .text(function(d) {
            return d['key'];
        });
        
    var recession_key = d3.select('#graphic ul.key')
        .append('li')
            .attr('class', 'key-item recession');
    recession_key.append('b');
    recession_key.append('label')
        .text('Periods of economic recession');

    var svg = d3.select('#graphic').append('svg')
        .attr("width", width + margin['left'] + margin['right'])
        .attr("height", height + margin['top'] + margin['bottom'])
        .append("g")
        .attr("transform", "translate(" + margin['left'] + "," + margin['top'] + ")");
    
    x.domain(d3.extent(graphic_data, function(d) { 
        return d['date'];
    }));
    y.domain([
        0,
        d3.max(d3.entries(lines), function(c) { 
            return d3.max(c['value'], function(v) { 
                var n = parseInt(v['amt']);
                return Math.ceil(n/500000) * 500000; // round to next 500K
            }); 
        })
    ]);

    svg.append('g')
        .attr('class', 'recession')
        .selectAll('rect')
        .data(recession_dates)
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
                return x(d['value'][last_data_point]['date']) + 6;
            })
            .attr('y', function(d) { 
                var ypos = y(d['value'][last_data_point]['amt']);
                return ypos;
            })
            .attr('dy', 2)
            .attr('text-anchor', 'left')
            .text(function(d) { 
                return (d['value'][last_data_point]['amt'] / 1000000).toFixed(1) + ' million';
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

        graphic_data.forEach(function(d) {
            d['date'] = d3.time.format('%x').parse(d['date']);
        });

        recession_dates.forEach(function(d) {
            d['begin'] = d3.time.format('%Y-%m-%d').parse(d['begin']);
            d['end'] = d3.time.format('%Y-%m-%d').parse(d['end']);
        });

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
var $graphic;

var graphic_aspect_width = 4;
var graphic_aspect_height = 3;
var graphic_default_width = 600;
var mobile_threshold = 480;
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
    { 'year': '1989', 'amt': 892926 },
    { 'year': '1990', 'amt': 623854 },
    { 'year': '1991', 'amt': 423426 },
    { 'year': '1992', 'amt': 374202 },
    { 'year': '1993', 'amt': 229773 },
    { 'year': '1994', 'amt': 164977 },
    { 'year': '1995', 'amt': 129852 },
    { 'year': '1996', 'amt': 152814 },
    { 'year': '1997', 'amt': 77863 },
    { 'year': '1998', 'amt': 78557 },
    { 'year': '1999', 'amt': 96293 },
    { 'year': '2000', 'amt': 75223 },
    { 'year': '2001', 'amt': 63717 },
    { 'year': '2002', 'amt': 54638 },
    { 'year': '2003', 'amt': 32193 },
    { 'year': '2004', 'amt': 16026 },
    { 'year': '2005', 'amt': 10674 },
    { 'year': '2006', 'amt': 25217 },
    { 'year': '2007', 'amt': 1040 },
    { 'year': '2008', 'amt': 4619 },
    { 'year': '2009', 'amt': 3190 },
    { 'year': '2010', 'amt': 1797 },
    { 'year': '2011', 'amt': 1058 },
    { 'year': '2012', 'amt': 542 },
    { 'year': '2013', 'amt': 148 }
];


/*
 * Render the graphic
 */
function draw_graphic(container_width) {
    if (!container_width) {
        container_width = graphic_default_width;
    }

    var margin = {top: 10, right: 10, bottom: 40, left: 65};
    var width = container_width - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];
    var last_data_point = graphic_data.length - 1;
    var num_x_ticks = 5;
    var num_y_ticks = 5;

    // clear out existing graphics
    $graphic.empty();

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d) {
            if (width <= mobile_threshold) {
                return '\u2019' + fmt_year_abbrev(d);
            } else {
                return fmt_year_full(d);
            }
        });
        
    var x_axis_grid = function() { return xAxis; }

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks);
    
    var y_axis_grid = function() { return yAxis; }

    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) { return x(d['year']); })
        .y(function(d) { return y(d['amt']); });
    
    // parse data into columns
    var lines = {};
    for (var column in graphic_data[0]) {
        if (column == 'year') continue;
        lines[column] = graphic_data.map(function(d) {
            return { 'year': d['year'], 'amt': +d[column] };
        });
    }
    
    var svg = d3.select('#graphic').append('svg')
        .attr("width", width + margin['left'] + margin['right'])
        .attr("height", height + margin['top'] + margin['bottom'])
        .append("g")
        .attr("transform", "translate(" + margin['left'] + "," + margin['top'] + ")");
    
    x.domain(d3.extent(graphic_data, function(d) { 
        return d['year'];
    }));
    y.domain([
        0,
        d3.max(d3.entries(lines), function(c) { 
            return d3.max(c['value'], function(v) { 
                var n = v['amt'];
                return Math.ceil(n/200000) * 200000; // round to next 100K
            }); 
        })
    ]);
    
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
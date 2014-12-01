var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_default_width = 600;
var is_mobile;
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
    {'date':'1/2006','amt':4.7},
    {'date':'2/2006','amt':4.8},
    {'date':'3/2006','amt':4.7},
    {'date':'4/2006','amt':4.7},
    {'date':'5/2006','amt':4.6},
    {'date':'6/2006','amt':4.6},
    {'date':'7/2006','amt':4.7},
    {'date':'8/2006','amt':4.7},
    {'date':'9/2006','amt':4.5},
    {'date':'10/2006','amt':4.4},
    {'date':'11/2006','amt':4.5},
    {'date':'12/2006','amt':4.4},
    {'date':'1/2007','amt':4.6},
    {'date':'2/2007','amt':4.5},
    {'date':'3/2007','amt':4.4},
    {'date':'4/2007','amt':4.5},
    {'date':'5/2007','amt':4.4},
    {'date':'6/2007','amt':4.6},
    {'date':'7/2007','amt':4.7},
    {'date':'8/2007','amt':4.6},
    {'date':'9/2007','amt':4.7},
    {'date':'10/2007','amt':4.7},
    {'date':'11/2007','amt':4.7},
    {'date':'12/2007','amt':5.0},
    {'date':'1/2008','amt':5.0},
    {'date':'2/2008','amt':4.9},
    {'date':'3/2008','amt':5.1},
    {'date':'4/2008','amt':5.0},
    {'date':'5/2008','amt':5.4},
    {'date':'6/2008','amt':5.6},
    {'date':'7/2008','amt':5.8},
    {'date':'8/2008','amt':6.1},
    {'date':'9/2008','amt':6.1},
    {'date':'10/2008','amt':6.5},
    {'date':'11/2008','amt':6.8},
    {'date':'12/2008','amt':7.3},
    {'date':'1/2009','amt':7.8},
    {'date':'2/2009','amt':8.3},
    {'date':'3/2009','amt':8.7},
    {'date':'4/2009','amt':9.0},
    {'date':'5/2009','amt':9.4},
    {'date':'6/2009','amt':9.5},
    {'date':'7/2009','amt':9.5},
    {'date':'8/2009','amt':9.6},
    {'date':'9/2009','amt':9.8},
    {'date':'10/2009','amt':10.0},
    {'date':'11/2009','amt':9.9},
    {'date':'12/2009','amt':9.9},
    {'date':'1/2010','amt':9.7},
    {'date':'2/2010','amt':9.8},
    {'date':'3/2010','amt':9.9},
    {'date':'4/2010','amt':9.9},
    {'date':'5/2010','amt':9.6},
    {'date':'6/2010','amt':9.4},
    {'date':'7/2010','amt':9.5},
    {'date':'8/2010','amt':9.5},
    {'date':'9/2010','amt':9.5},
    {'date':'10/2010','amt':9.5},
    {'date':'11/2010','amt':9.8},
    {'date':'12/2010','amt':9.4},
    {'date':'1/2011','amt':9.1},
    {'date':'2/2011','amt':9.0},
    {'date':'3/2011','amt':9.0},
    {'date':'4/2011','amt':9.1},
    {'date':'5/2011','amt':9.0},
    {'date':'6/2011','amt':9.1},
    {'date':'7/2011','amt':9.0},
    {'date':'8/2011','amt':9.0},
    {'date':'9/2011','amt':9.0},
    {'date':'10/2011','amt':8.8},
    {'date':'11/2011','amt':8.6},
    {'date':'12/2011','amt':8.5},
    {'date':'1/2012','amt':8.2},
    {'date':'2/2012','amt':8.3},
    {'date':'3/2012','amt':8.2},
    {'date':'4/2012','amt':8.2},
    {'date':'5/2012','amt':8.2},
    {'date':'6/2012','amt':8.2},
    {'date':'7/2012','amt':8.2},
    {'date':'8/2012','amt':8.1},
    {'date':'9/2012','amt':7.8},
    {'date':'10/2012','amt':7.8},
    {'date':'11/2012','amt':7.8},
    {'date':'12/2012','amt':7.9},
    {'date':'1/2013','amt':7.9},
    {'date':'2/2013','amt':7.7},
    {'date':'3/2013','amt':7.5},
    {'date':'4/2013','amt':7.5},
    {'date':'5/2013','amt':7.5},
    {'date':'6/2013','amt':7.5},
    {'date':'7/2013','amt':7.3},
    {'date':'8/2013','amt':7.2},
    {'date':'9/2013','amt':7.2},
    {'date':'10/2013','amt':7.2},
    {'date':'11/2013','amt':7.0},
    {'date':'12/2013','amt':6.7},
    {'date':'1/2014','amt':6.6},
    {'date':'2/2014','amt':6.7},
    {'date':'3/2014','amt':6.7},
    {'date':'4/2014','amt':6.3},
    {'date':'5/2014','amt':6.3},
    {'date':'6/2014','amt':6.1},
    {'date':'7/2014','amt':6.2}
];

var election_years = [
    { 'begin': '2006-01', 'end': '2007-01' },
    { 'begin': '2010-01', 'end': '2011-01' },
    { 'begin': '2014-01', 'end': '2014-07' }
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
    
    // clear out existing graphics
    $graphic.empty();

    draw_graph(container_width);

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function draw_graph(width) {
    var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3'], colors['orange3'], colors['teal3'] ]);
    var graphic_aspect_height;
    var graphic_aspect_width;
    var height;
    var margin = { top: 5, right: 15, bottom: 30, left: 35 };
    var num_x_ticks;
    var num_y_ticks;

    if (is_mobile) {
        graphic_aspect_width = 4;
        graphic_aspect_height = 3;
        num_x_ticks = 6;
        num_y_ticks = 6;
    } else {
        graphic_aspect_width = 16;
        graphic_aspect_height = 9;
        num_x_ticks = 6;
        num_y_ticks = 6;
    }

    width = width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

    var x = d3.time.scale()
        .range([0, width])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d,i) {
            if (is_mobile) {
                return '\u2019' + fmt_year_abbr(d);
            } else {
                return fmt_year_full(d);
            }
        });

    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            return d + '%';
        });

    var y_axis_grid = function() { return yAxis; };

    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) { 
            return x(d['date']);
        })
        .y(function(d) { 
            return y(d['amt']);
        });
        
    color.domain(d3.keys(graphic_data[0]).filter(function(key) { 
        return key !== 'date';
    }));

    // parse data into columns
    var formatted_data = {};
    for (var column in graphic_data[0]) {
        if (column == 'date') continue;
        formatted_data[column] = graphic_data.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }
    
    
    // set the data domain
    x.domain(d3.extent(graphic_data, function(d) { 
        return d['date'];
    }));

    y.domain([ 0, 12]);


    // draw the legend
    var legend = d3.select('#graphic').append('ul')
            .attr('class', 'key');
        
    var midterm_key = d3.select('#graphic ul.key')
        .append('li')
            .attr('class', 'key-item midterm');
    midterm_key.append('b')
        .attr('style', 'background-color: #f1f1f1');
    midterm_key.append('label')
        .text('Midterm election years');


    // draw the chart
    var svg = d3.select('#graphic')
        .append('svg')
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    var midterms = svg.append('g')
        .attr('class', 'midterm')
        .selectAll('rect')
        .data(election_years)
        .enter()
            .append('rect')
                .attr('x', function(d) {
                    return x(d['begin']);
                })
                .attr('width', function(d) {
                    return x(d['end']) - x(d['begin']);
                })
                .attr('y', 0)
                .attr('height', height)
                .attr('fill', '#f1f1f1');

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

    var yGrid = svg.append('g')         
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

    var lines = svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formatted_data))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('stroke', function(d) {
                return color(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
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

        graphic_data.forEach(function(d) {
            d['date'] = d3.time.format('%m/%Y').parse(d['date']);
        });
        
        election_years.forEach(function(d) {
            d['begin'] = d3.time.format('%Y-%m').parse(d['begin']);
            d['end'] = d3.time.format('%Y-%m').parse(d['end']);
        });

        var pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
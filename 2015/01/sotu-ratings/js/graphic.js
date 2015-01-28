var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_aspect_width;
var graphic_aspect_height;
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

var graphicData = [
    {'year':1993,'amt':66.900,'president':'clinton'},
    {'year':1994,'amt':45.800,'president':'clinton'},
    {'year':1995,'amt':42.200,'president':'clinton'},
    {'year':1996,'amt':40.900,'president':'clinton'},
    {'year':1997,'amt':41.100,'president':'clinton'},
    {'year':1998,'amt':53.077,'president':'clinton'},
    {'year':1999,'amt':43.500,'president':'clinton'},
    {'year':2000,'amt':31.478,'president':'clinton'},
    {'year':2001,'amt':39.793,'president':'bush'},
    {'year':2002,'amt':51.773,'president':'bush'},
    {'year':2003,'amt':62.061,'president':'bush'},
    {'year':2004,'amt':43.411,'president':'bush'},
    {'year':2005,'amt':38.382,'president':'bush'},
    {'year':2006,'amt':41.699,'president':'bush'},
    {'year':2007,'amt':45.486,'president':'bush'},
    {'year':2008,'amt':37.515,'president':'bush'},
    {'year':2009,'amt':52.373,'president':'obama'},
    {'year':2010,'amt':48.009,'president':'obama'},
    {'year':2011,'amt':42.789,'president':'obama'},
    {'year':2012,'amt':37.752,'president':'obama'},
    {'year':2013,'amt':33.497,'president':'obama'},
    {'year':2014,'amt':33.299,'president':'obama'}
];

var presidents = [ 'clinton', 'bush', 'obama' ];

// var recession_dates = [
//     '2006-03', '2006-06', '2006-09', '2006-12',
//     '2010-03', '2010-06', '2010-09', '2010-12',
//     '2014-03', '2014-06'
// ];


/*
 * Render the graphic
 */
function render(width_container) {
    if (!width_container) {
        width_container = graphic_default_width;
    }
    
    var width_graphic = width_container;
    
    if (width_container <= mobile_threshold) {
        is_mobile = true;
        graphic_aspect_width = 4;
        graphic_aspect_height = 3;
    } else {
        is_mobile = false;
        graphic_aspect_width = 16;
        graphic_aspect_height = 9;
    }
    
    // clear out existing graphics
    $graphic.empty();

    render_bar_chart(width_graphic);

    if (pymChild) {
        pymChild.sendHeight();
    }
}

function render_bar_chart(width_graphic) {
    var color = d3.scale.ordinal()
        .range([ colors['blue4'], colors['red4'], colors['blue4'] ]);
    var data = graphicData;
    var margin = { top: 20, right: 5, bottom: 20, left: 60 };
    var num_y_ticks = 6;
    var width = width_graphic - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];
    
    if (is_mobile) {
        num_y_ticks = 4;
    }

    // assign a color to each type
    color.domain(presidents);
    
    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(data.map(function(d) { 
            return d['year']; 
        }));
    
    var y = d3.scale.linear()
        .range([height, 0])
        .domain([ 0, d3.max(graphicData, function(c) {
                var n = c['amt'];
                return Math.ceil(n/10) * 10; // round to next 10
            })
        ]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            if ((i % 3) == 0 && is_mobile) {
                return '\u2019' + fmt_year_abbr(d);
            } else if ((i % 2) == 0 && !is_mobile) {
                return '\u2019' + fmt_year_abbr(d);
//                return fmt_year_full(d);
            }
        });
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            if (d > 0) {
                return d + ' million';
            } else { 
                return d;
            }
        });

    var y_axis_grid = function() { return yAxis; }
    
    // draw the legend
//     var legend = d3.select('#graphic').append('ul')
//             .attr('class', 'key');
        
    // draw the chart itself
    var svg = d3.select('#graphic').append('svg')
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
            .data(data)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['year']);
            })
            .attr('y', function(d) {
                if (d['amt'] < 0) { 
                    return y(0);
                } else {
                    return y(d['amt']);
                }
            })
            .attr('width', x.rangeBand())
            .attr('height', function(d){ 
                if (d['amt'] < 0) { 
                    return y(d['amt']) - y(0);
                } else {
                    return y(0) - y(d['amt']);
                }
            })
            .attr('class', function(d) {
                return 'bar bar-' + d['president'];
            })
            .attr('fill', function(d) {
                return color(d['president']);
            });
    
    svg.append('line')
        .attr('class', 'y grid grid-0')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0));
    
    var labels = svg.append('g')
        .attr('class', 'labels');
    
    labels.append('text')
        .attr('x', x(graphicData[3]['year']) + (x(graphicData[1]['year'])/2))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .text('Clinton');
    
    labels.append('text')
        .attr('x', x(graphicData[11]['year']) + (x(graphicData[1]['year'])/2))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .text('Bush');
    
    labels.append('text')
        .attr('x', x(graphicData[19]['year']))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .text('Obama');
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
        
        graphicData.forEach(function(d) {
            d['year'] = d3.time.format('%Y').parse(d['year'].toString());
        });

//         recession_dates.forEach(function(d,i) {
//             recession_dates[i] = d3.time.format('%Y-%m').parse(d);
//         });
// 
        var pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_aspect_width;
var graphic_aspect_height;
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 530;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [
    {'year':1988,'amt':24},
    {'year':1990,'amt':27},
    {'year':1992,'amt':28},
    {'year':1994,'amt':28},
    {'year':1996,'amt':30},
    {'year':1998,'amt':31},
    {'year':1999,'amt':32},
    {'year':2001,'amt':33},
    {'year':2003,'amt':36.0},
    {'year':2005,'amt':38.5},
    {'year':2007,'amt':44.8},
    {'year':2009,'amt':50.3},
    {'year':2011,'amt':54.3}
];

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
    var data = graphic_data;
    var margin = { top: 10, right: 5, bottom: 20, left: 25 };
    var num_y_ticks = 6;
    var width = width_graphic - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];
    
    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(data.map(function(d) { 
            return d['year']; 
        }));
    
    var y = d3.scale.linear()
        .range([height, 0])
        .domain([0, d3.max(data, function(d) { 
            var n = d['amt'];
            return Math.ceil(n/10) * 10; // round to next 10
        })]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            if (is_mobile) {
                if ((i % 2) == 1) {
                    return '\u2019' + fmt_year_abbr(d);
                }
            } else {
                return '\u2019' + fmt_year_abbr(d);
            }
        });
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks);

    var y_axis_grid = function() { return yAxis; }
    
    var container = d3.select('#graphic').append('div')
        .attr('class', 'graph');
    
    // draw the chart itself
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
            .data(data)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['year']);
            })
            .attr('y', function(d) { 
                return y(d['amt']);
            })
            .attr('width', x.rangeBand())
            .attr('class', function(d) {
                return 'bar bar-' + d['year'];
            })
            .attr('fill', colors['red3'])
            .attr('y', function(d) { 
                return y(d['amt']);
            })
            .attr('height', function(d){ 
                return height - y(d['amt']);
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
            d['year'] = fmt_year_full.parse(d['year'].toString());
        });
        var pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

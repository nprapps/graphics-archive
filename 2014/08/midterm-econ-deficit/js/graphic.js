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

var graphic_data = [
{'year':2006,'amt':-1.813},
{'year':2007,'amt':-1.122},
{'year':2008,'amt':-3.108},
{'year':2009,'amt':-9.801},
{'year':2010,'amt':-8.751},
{'year':2011,'amt':-8.446},
{'year':2012,'amt':-6.754},
{'year':2013,'amt':-4.087},
{'year':2014,'amt':-2.846},
{'year':2015,'amt':-2.585},
{'year':2016,'amt':-2.808},
{'year':2017,'amt':-2.875},
{'year':2018,'amt':-2.991},
{'year':2019,'amt':-3.303},
{'year':2020,'amt':-3.527},
{'year':2021,'amt':-3.696}
];

var election_years = [
    { 'begin': '2006-01', 'end': '2007-01' },
    { 'begin': '2010-01', 'end': '2011-01' },
    { 'begin': '2014-01', 'end': '2015-01' },
    { 'begin': '2018-01', 'end': '2019-01' }
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
    var margin = { top: 5, right: 5, bottom: 20, left: 37 };
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
        .domain([-10, 2]);
    
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
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            return d + '%';
        });

    var y_axis_grid = function() { return yAxis; }
    
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

    // draw the chart itself
    var svg = d3.select('#graphic').append('svg')
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
                return y(0);
            })
            .attr('width', x.rangeBand())
            .attr('height', function(d){ 
                return y(d['amt']) - y(0);
            })
            .attr('class', function(d) {
                return 'bar bar-' + d['year'];
            })
            .attr('fill', function(d) {
                var yr = fmt_year_full(d['year']);
                if (yr >= 2014) {
                    return colors['red5'];
                } else {
                    return colors['red3'];
                }
            });
    
    svg.append('line')
        .attr('class', 'y grid grid-0')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0));
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

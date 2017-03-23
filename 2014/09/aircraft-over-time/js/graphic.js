var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_aspect_width = 3;
var graphic_aspect_height = 2;
var graphic_data = [];
var graphic_data_url = 'data.json';
var graphic_default_width = 600;
var graphic_width;
var is_mobile;
var mobile_threshold = 540;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

/*
 * Render the graphic
 */
function render(container_width) {
    var graphic_width;

    $graphic.empty();

    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }


    if (container_width >= 1000) {
        num_across = 4;
    } else if (container_width >= 750 && container_width < 1000) {
        num_across = 3;
    } else if (container_width >= 500 && container_width < 750) {
        num_across = 2;
    } else {
        num_across = 1;
    }

    if (num_across == 1) {
        graphic_width = container_width;
    } else {
        graphic_width = Math.floor((container_width - (num_across * 11)) / num_across);
    }

    for (i=0; i<graphic_data.length; i++) {
        render_bar_chart(graphic_data[i], graphic_width);
    }

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function render_bar_chart(data, container_width) {
    var label = classify(data['name']);
    var last_data_point = graphic_data.length - 1;
    var margin = { top: 10, right: 10, bottom: 20, left: 60 };
    var num_y_ticks = 5;
    var width = container_width - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];
    var format = d3.format('0,.0f');
    var tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return '$' + format(d['amt'])});

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(data['values'].map(function(d) {
            return d['year'];
        }));

    var y = d3.scale.linear()
        .range([height, 0])
        .domain([0, d3.max(data['values'], function(d) {
            var n = parseInt(d['amt']);
            return Math.ceil(n/500000) * 500000; // round to next 500K
        })]);
//        .domain([0, 800000000]);

    // console.log(y.domain());

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            return '\u2019' + fmt_year_abbr(d);
        });

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else {
                return '$' + (d/1000000) + 'm';
            }
        });

    var y_axis_grid = function() { return yAxis; }

    var container = d3.select('#graphic').append('div')
        .attr('id', label)
        .attr('class', 'graph')
        .attr('style', function(d) {
            return 'width: ' + (width + margin['left'] + margin['right']) + 'px';
        });

    var title = container.append('h3')
        .text(data['name']);

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

    svg.call(tip)

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(data['values'])
        .enter().append('rect')
            .attr("class", "bar")
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
            .attr('class', function(d) {
                return 'bar bar-' + d['year'];
            })
            .attr('fill', function(d) {
                return colors['blue4'];
            })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);


    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

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

        d3.json(graphic_data_url, function(error, data) {
            // console.log(data.length);

            data.forEach(function(d) {
                if (d['2006'] != null || d['2007'] != null || d['2008'] != null || d['2009'] != null || d['2010'] != null || d['2011'] != null || d['2012'] != null || d['2013'] != null || d['2014'] != null) {

                    var v = {
                        'id': +d['id'],
                        'name': d['name'],
                        'values': [
                            { 'year': d3.time.format('%Y').parse('2006'), 'amt': +d['2006'] },
                            { 'year': d3.time.format('%Y').parse('2007'), 'amt': +d['2007'] },
                            { 'year': d3.time.format('%Y').parse('2008'), 'amt': +d['2008'] },
                            { 'year': d3.time.format('%Y').parse('2009'), 'amt': +d['2009'] },
                            { 'year': d3.time.format('%Y').parse('2010'), 'amt': +d['2010'] },
                            { 'year': d3.time.format('%Y').parse('2011'), 'amt': +d['2011'] },
                            { 'year': d3.time.format('%Y').parse('2012'), 'amt': +d['2012'] },
                            { 'year': d3.time.format('%Y').parse('2013'), 'amt': +d['2013'] },
                        ]
                    };

                    graphic_data[d['id']] = v;

                }
            });

            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

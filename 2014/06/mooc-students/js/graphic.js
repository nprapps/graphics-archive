var $graphic;
var graphic_data;
var graphic_data_url = 'data.csv';
var width_ratio = 16;
var height_ratio = 9;
var mobile_threshold = 500;
var num_ticks = 6;
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
    var margin = { top: 10, right: 1, bottom: 35, left: 55 };
    var width = container_width - margin['left'] - margin['right'];
    var height = (width * height_ratio) / width_ratio;
    
    if (container_width <= mobile_threshold) {
        num_ticks = 3;
    }

    $graphic.empty();

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(graphic_data.map(function(d) { 
            return d['year']; 
        }));

    var y = d3.scale.linear()
        .range([height, 0])
        .domain([0, d3.max(graphic_data, function(d) { 
            var n = parseInt(d['amt'])
            return Math.ceil(n/2) * 2; // round to next 2
        })]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            if ((i % 2) == 0) {
                if (width <= mobile_threshold) {
                    var fmt = d3.time.format('%y');
                    return '\u2019' + fmt(d);
                } else {
                    var fmt = d3.time.format('%Y');
                    return fmt(d);
                }
            }
        });
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_ticks)
        .tickFormat(function(d,i) {
            if (d == 0) {
                return d;
            } else {
                return d.toFixed(0) + ' million';
            }
        });

    var y_axis_grid = function() { return yAxis; }

    var svg = d3.select('#graphic').append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr("transform", "translate(" + margin['left'] + "," + margin['top'] + ")");

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
            .attr("x", function(d) { 
                return x(d['year']);
            })
            .attr("y", function(d) { 
                return y(d['amt']); 
            })
            .attr("width", x.rangeBand())
            .attr("height", function(d){ 
                return height - y(d['amt']); 
            })
            .attr('class', function(d) { 
                var fmt = d3.time.format('%Y');
                return 'year-' + fmt(d['year']);
            });

    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['year']) + (x.rangeBand() / 2);
            })
            .attr('y', function(d) { 
                return y(d['amt']) + 22;
            })
            .attr('text-anchor', 'middle')
            .attr('class', function(d) { 
                var fmt = d3.time.format('%Y');
                return 'l-' + fmt(d['year']);
            })
            .text(function(d) { 
                return d['amt'].toFixed(1);
            });

    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        d3.csv(graphic_data_url, function(error, data) {
            graphic_data = data;
        
            graphic_data.forEach(function(d) {
                d['year'] = d3.time.format('%Y').parse(d['year']);
                d['amt'] = +d['amt'] / 1000000;
            });

            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

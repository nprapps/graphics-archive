var $graphic;

var bar_height = 25;
var bar_gap = 5;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [
    { 'label': 'F.D. Roosevelt', 'amt': 4 },
    { 'label': 'Truman', 'amt': 0 },
    { 'label': 'Eisenhower', 'amt': 4 },
    { 'label': 'Nixon', 'amt': 3 },
    { 'label': 'Ford', 'amt': 2 },
    { 'label': 'Carter', 'amt': 2 },
    { 'label': 'Reagan', 'amt': 4 },
    { 'label': 'G.H.W. Bush', 'amt': 6 },
    { 'label': 'Clinton', 'amt': 5 },
    { 'label': 'G.W. Bush', 'amt': 4 },
    { 'label': 'Obama', 'amt': 5 }
];
	

/*
 * Render the graphic
 */
function render(container_width) {
    var num_bars = graphic_data.length;
    var margin = { top: 0, right: 10, bottom: 0, left: 85 };
    var width = container_width - margin.left - margin.right;
    var height = ((bar_height + bar_gap) * num_bars) - bar_gap;
    
    // clear out existing graphics
    $graphic.empty();

    var x = d3.scale.linear()
        .domain([0, d3.max(graphic_data, function(d) { 
            var n = +d['amt'];
            return n;
//            return Math.ceil(n/5) * 5; // round to next 5
        })])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(7);
        
    var x_axis_grid = function() { return xAxis; }

    var svg = d3.select('#graphic').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr("y", function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr("width", function(d){ 
                return x(d['amt']);
            })
            .attr("height", bar_height)
            .attr('class', function(d) { 
                return classify(d['label']);
            });
    
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d) { 
                return x(d['amt']);
            })
            .attr('y', function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr('dx', function(d) {
                if (d['amt'] == 0) {
                    return 0;
                } else {
                    return -6;
                }
            })
            .attr('dy', 17)
            .attr('text-anchor', function(d) {
                if (d['amt'] == 0) {
                    return 'begin';
                } else {
                    return 'end';
                }
            })
            .attr('class', function(d) { 
                return classify(d['label']);
            })
            .text(function(d) { 
                return d['amt'];
            });
    
    svg.append('g')
        .attr('class', 'label')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', 0)
            .attr('y', function(d, i) { 
                return i * (bar_height + bar_gap); 
            })
            .attr('dx', -6)
            .attr('dy', 17)
            .attr('text-anchor', 'end')
            .attr('class', function(d) { 
                return classify(d['label']);
             })
            .text(function(d) { 
                return d['label']
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
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

var $graphic;

var bar_height = 40;
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
    { 'label': 'Mountain Dew', 'amt': 72.31, 'type': 'Soda'},
    { 'label': 'Mug Root Beer', 'amt': 66.94, 'type': 'Soda' },
    { 'label': 'Minute Maid 100% Apple Juice', 'amt': 65.77, 'type': 'Juice' },
    { 'label': 'Pepsi', 'amt': 65.71, 'type': 'Soda' },
    { 'label': 'Coca-Cola', 'amt': 62.52, 'type': 'Soda' },
    { 'label': 'Dr Pepper', 'amt': 61.42, 'type': 'Soda' },
    { 'label': 'Arizona Iced Tea with Lemon Flavor', 'amt': 59.28, 'type': 'Soda' },
    { 'label': 'Ocean Spray 100% Cranberry Juice', 'amt': 55.44, 'type': 'Juice' },
    { 'label': 'Kool-Aid Jammers', 'amt': 49.02, 'type': 'Juice' },
    { 'label': '7-Up', 'amt': 45.80, 'type': 'Soda' },
    { 'label': 'Hawaiian Punch', 'amt': 40.96, 'type': 'Juice' },
    { 'label': 'Sunny D', 'amt': 32.77, 'type': 'Juice' },
    { 'label': 'Tropicana 100% Orange Juice', 'amt': 28.27, 'type': 'Juice' },
    { 'label': 'Gatorade Lemon-Lime', 'amt': 23.19, 'type': 'Soda' }
];


/*
 * Render the graphic
 */
function render(container_width) {
    var num_bars = graphic_data.length;
    var margin = { top: 0, right: 10, bottom: 25, left: 115 };
    var width = container_width - margin.left - margin.right;
    var height = ((bar_height + bar_gap) * num_bars);
    
    // clear out existing graphics
    $graphic.empty();

    var x = d3.scale.linear()
        .domain([0, d3.max(graphic_data, function(d) { 
            var n = parseInt(d['amt'])
            return Math.ceil(n/10) * 10; // round to next 10
        })])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(7);
        
    var x_axis_grid = function() { return xAxis; }
    
    var chart = d3.select('#graphic').append('div')
        .attr('class', 'chart');
    
    var svg = chart.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

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
                return classify(d['label']) + ' ' + classify(d['type']);
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
            .attr('dx', -6)
            .attr('dy', (bar_height / 2) + 4)
            .attr('text-anchor', 'end')
            .attr('class', function(d) { 
                return classify(d['label']);
            })
            .text(function(d) { 
                return d['amt'].toFixed(1);
            });
    
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + margin.left + 'px; top: ' + margin.top + 'px;')
        .selectAll('li')
            .data(graphic_data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + (margin.left - 5) + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return 'l-' + classify(d['label']);
            })
            .append('span')
                .text(function(d) { return d.label });

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

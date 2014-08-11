var $graphic = null;

var bar_height = 40;
var bar_gap = 10;
var domain_x_max = null;
var mobile_threshold = 480;
var num_bars = null;
var num_ticks = 4;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = {
    'bush': [
        { 'label': 'Two Democratic senators', 'amt': 50 },
        { 'label': 'Two Republican senators', 'amt': 37 },
        { 'label': 'One Democratic senator', 'amt': 7 },
        { 'label': 'No senators', 'amt': 7 }
    ],
    'obama': [
        { 'label': 'Two Republican senators', 'amt': 57 },
        { 'label': 'One Republican senator', 'amt': 31 },
        { 'label': 'Two Democratic senators', 'amt': 11 },
        { 'label': 'No senators', 'amt': 0 }
    ]
};

var graphic_labels = {
    'bush': 'Bush administration (through May 23, 2006)',
    'obama': 'Obama administration (through May 23, 2014)'
};


/*
 * Render the graphic
 */
function render(container_width) {
    $graphic.empty();
    
    draw_graphic('bush', container_width);
    draw_graphic('obama', container_width);
}

function draw_graphic(id, container_width) {
    var data = graphic_data[id];
    num_bars = data.length;
    
    if (container_width > mobile_threshold) {
        container_width = Math.floor((container_width - 22) / 2);
        domain_x_max = 80;
    } else {
        domain_x_max = 60;
    }
    
    var margin = { top: 10, right: 20, bottom: 0, left: 95 };
    var width = container_width - margin.left - margin.right;
    var height = ((bar_height + bar_gap) * num_bars) - bar_gap;
    
    var x = d3.scale.linear()
        .domain([0, domain_x_max])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_ticks)
        .tickFormat(function(d, i) {
            return d + '%';
        });
        
    var x_axis_grid = function() { return xAxis; }
    
    var container = d3.select('#graphic')
        .append('div')
            .attr('class', 'chart-wrap')
            .attr('id', id)
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + container_width + 'px; ';
                return s;
            });
            
    container.append('h3')
        .text(graphic_labels[id]);
    
    var graph = container.append('div')
        .attr('class', 'chart');
    
    var svg = graph.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(data)
        .enter().append('rect')
            .attr("y", function(d, i) { return i * (bar_height + bar_gap); })
            .attr("width", function(d){ return x(d.amt); })
            .attr("height", bar_height)
            .attr('class', function(d) { return 'bar-' + d.label.replace(/\s+/g, '-').toLowerCase() });
    
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(data)
        .enter().append('text')
            .attr('x', function(d) { return x(d.amt) })
            .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
            .attr('dx', 6)
            .attr('dy', (bar_height / 2 + 4))
            .attr('text-anchor', 'begin')
            .attr('class', function(d) { return 'l-' + d.label.replace(/\s+/g, '-').toLowerCase() })
            .text(function(d, i) { 
                return d.amt + '%' 
            });
    
    var labels = graph.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + margin.left + 'px; top: ' + margin.top + 'px;')
        .selectAll('li')
            .data(data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + (margin.left - 5) + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) { return 'l-' + d.label.replace(/\s+/g, '-').toLowerCase() })
            .append('span')
                .text(function(d) { return d.label });
    
    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
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

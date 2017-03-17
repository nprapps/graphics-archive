var $graphic;

var bar_height = 40;
var bar_gap = 5;
var mobile_threshold = 480;
var pymChild = null;

var data = {
    'Coffee': [
        { 'label': 'Coffee futures fund', 'amt': 21, 'url': 'https://www.npr.org/blogs/thesalt/2013/06/27/194204241/Uri-coffee-tk' }
    ],
    'Stock market': [
        { 'label': 'U.S. broad market', 'amt': 26, 'url': 'https://www.npr.org/2013/06/05/188306471/resisting-the-temptation-to-win-when-investing' },
        { 'label': 'U.S. dividend equity', 'amt': 19, 'url': 'https://www.npr.org/2013/06/05/188306471/resisting-the-temptation-to-win-when-investing' },
        { 'label': 'Total world stock', 'amt': 16, 'url': 'https://www.npr.org/2013/06/05/188306471/resisting-the-temptation-to-win-when-investing' }
    ],
    'Real estate': [
        { 'label': 'Real estate investment trust index', 'amt': 4, 'url': 'https://www.npr.org/2013/06/13/188979111/how-to-invest-in-real-estate-without-being-a-landlord' }
    ],
};


/*
 * Render the graphic
 */
function render(container_width) {
    $graphic.empty();
    
    draw_graph('Coffee', container_width);
    draw_graph('Stock market', container_width);
    draw_graph('Real estate', container_width);
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}

function draw_graph(id, graph_width) {
    var chart_data = data[id];
    var num_bars = chart_data.length;
    var tick_count = 7;
    if (width <= mobile_threshold) {
        tick_count = 3;
    }

    var margin = { top: 0, right: 15, bottom: 0, left: 150 };
    var width = graph_width - margin.left - margin.right;
    var height = ((bar_height + bar_gap) * num_bars);

    var x = d3.scale.linear()
        .domain([0, 50])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(tick_count)
        .tickFormat(function(d) {
            return d + '%';
        });

    var x_axis_grid = function() { return xAxis; }
    
    var header = d3.select('#graphic').append('h3')
        .text(id);
    
    var chart = d3.select('#graphic').append('div')
        .attr('class', 'chart ' + classify(id));
    
    var svg = chart.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(chart_data)
        .enter().append('rect')
            .attr("y", function(d, i) { return i * (bar_height + bar_gap); })
            .attr("width", function(d){ return x(d.amt); })
            .attr("height", bar_height)
            .attr('class', function(d) { return 'bar-' + d.label.replace(/\s+/g, '-').toLowerCase() });
    
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(chart_data)
        .enter().append('text')
            .attr('x', function(d) { return x(d.amt) })
            .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
            .attr('dx', 6)
            .attr('dy', (bar_height / 2) + 3)
            .attr('text-anchor', 'start')
            .attr('class', function(d) { 
                return 'l-' + classify(d['label']);
            })
            .text(function(d) { return d.amt + '% return' });
    
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + margin.left + 'px; top: ' + margin.top + 'px;')
        .selectAll('li')
            .data(chart_data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + (margin.left - 8) + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) { 
                return 'l-' + classify(d['label']);
            })
            .append('span')
                .append('a')
                    .attr('href', function(d) {
                        return d.url;
                    })
                    .attr('target', '_blank')
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
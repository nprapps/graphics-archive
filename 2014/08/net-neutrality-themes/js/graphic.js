var $graphic;

var bar_height = 45;
var bar_gap = 5;
var color;
var graphic_margin = 6;
var label_width = 150;
var mobile_threshold = 500;
var num_x_ticks;
var pymChild = null;

var fmt_comma = d3.format(',');
var fmt_year_abbrev = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [
    { 'label': 'A "pay-to-play" system will harm the diversity of the Internet', 'amt': 15 },
    { 'label': 'All content should be equally accessible', 'amt': 9 },
    { 'label': '"Fast lanes" will destroy the Internet', 'amt': 7 },
    { 'label': 'Need for equality in promoting the American Dream', 'amt': 7 },
    { 'label': 'New regulations would strengthen ISP monopolies, harming competition', 'amt': 6 },
    { 'label': 'The government is corrupted by corporate interests', 'amt': 6 },
    { 'label': '"Fast lanes" inhibit innovation', 'amt': 5 },
    { 'label': 'New regulations would only help ISPs become more profitable', 'amt': 5 },
    { 'label': 'New regulations allow big business to harm startups and the American people', 'amt': 3 },
    { 'label': 'Thomas Wheeler\'s telecom background is a conflict of interest', 'amt': 3 }
];


/*
 * Render the graphic
 */
function render(container_width) {
    var margin = { top: 0, right: 15, bottom: 20, left: (label_width + 6) };
    var num_bars = graphic_data.length;
    var width = container_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);
    
    // clear out existing graphics
    $graphic.empty();
    
    var graph = d3.select('#graphic');

    var x = d3.scale.linear()
        .domain([0, 15])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues([0,5,10,15])
        .tickFormat(function(d) {
            return d.toFixed(0) + '%';
        });
        
    var x_axis_grid = function() { 
        return xAxis;
    }

    var svg = graph.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

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
            .attr('class', function(d, i) { 
                return 'bar-' + i + ' ' + classify(d['label']);
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
            .attr('dy', (bar_height / 2) + 3)
            .attr('text-anchor', 'end')
            .attr('class', function(d) { 
                return classify(d['label']);
            })
            .text(function(d) { 
                return d['amt'].toFixed(0) + '%';
            });

    var labels = d3.select('#graphic').append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + label_width + 'px; top: 0; left: 0;')
        .selectAll('li')
            .data(graphic_data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + label_width + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return classify(d['label']);
            })
            .append('span')
                .text(function(d) { 
                    return d['label'];
                });

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}


$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // setup pym
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
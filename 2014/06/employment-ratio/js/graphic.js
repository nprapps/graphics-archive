var $graphic;
var IS_MOBILE = false;
var mobile_threshold = 480;
var num_ticks;
var pymChild = null;
var min_height = 325;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = {
    'Age 16-19': [{ 'year': '2003', 'amt': 36.8 }, { 'year': '2013', 'amt': 26.6 }],
    'Age 20-24': [{ 'year': '2003', 'amt': 67.8 }, { 'year': '2013', 'amt': 61.7 }],
    'Age 25-34': [{ 'year': '2003', 'amt': 77.9 }, { 'year': '2013', 'amt': 75.2 }],
    'Age 35-44': [{ 'year': '2003', 'amt': 79.7 }, { 'year': '2013', 'amt': 77.4 }],
    'Age 45-54': [{ 'year': '2003', 'amt': 78.8 }, { 'year': '2013', 'amt': 75.2 }],
    'Age 55-64': [{ 'year': '2003', 'amt': 59.9 }, { 'year': '2013', 'amt': 60.9 }],
    'Age 65+':   [{ 'year': '2003', 'amt': 13.5 }, { 'year': '2013', 'amt': 17.7 }]
};

var reasons = [ 'Age 16-19', 'Age 20-24', 'Age 25-34', 'Age 35-44', 'Age 45-54', 'Age 55-64', 'Age 65+'  ];


/*
 * Render the graphic
 */
function render(container_width) {
    var margin = {top: 32, right: 95, bottom: 0, left: 35};
    var year_fmt = d3.time.format('%Y');
    
    var start_year = year_fmt.parse('2003');
    var end_year = year_fmt.parse('2013');

    if (container_width < mobile_threshold) {
        margin.left = 30;
        margin.right = 90;
        IS_MOBILE = true;
    } else {
        IS_MOBILE = false;
    }

    var width = container_width - margin.left - margin.right;
    var height = min_height - margin.top - margin.bottom;

    // clear out existing graphics
    $graphic.empty();

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var line = d3.svg.line()
        .x(function(d) { return x(d['year']); })
        .y(function(d) { return y(d['amt']); });
    
    // parse data into columns
    var lines = graphic_data;
   
    var svg = d3.select('#graphic').append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    x.domain([start_year, end_year]);
    y.domain([10, 80]);
    
    svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(lines))
        .enter()
            .append('path')
                .attr('class', function(d, i) {
                    return 'line line-' + i + ' ' + classify(d['key']);
                })
                .attr('d', function(d) {
                    return line(d.value);
                });

    svg.append('g')
        .attr('class', 'value begin')
        .selectAll('text')
            .data(d3.entries(lines))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][0]['year']);
            })
            .attr('y', function(d, i) { 
                var ypos = y(d['value'][0]['amt']);
                switch(d['key']) {
                    case 'Age 25-34':
                        ypos += 8;
                        break;
                    case 'Age 35-44':
                        ypos -= 8;
                        break;
                }
                return ypos;
            })
            .attr('dx', -6)
            .attr('dy', 4)
            .attr('text-anchor', 'end')
            .attr('class', function(d, i) { 
                return 'value-' + i + ' ' + classify(d['key']); 
            })
            .text(function(d) { 
                return d['value'][0]['amt'].toFixed(0) + '%';
            });

    svg.append('g')
        .attr('class', 'value end')
        .selectAll('text')
            .data(d3.entries(lines))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][1]['year']);
            })
            .attr('y', function(d, i) { 
                var ypos = y(d['value'][1]['amt']);
                switch(d['key']) {
                    case 'Age 20-24':
                        ypos -= 3;
                        break;
                    case 'Age 35-44':
                        ypos -= 4;
                        break;
                    case 'Age 45-54':
                        ypos += 12;
                        break;
                    case 'Age 55-64':
                        ypos += 6;
                        break;   
                }
                return ypos;
            })
            .attr('dx', 6)
            .attr('dy', 4)
            .attr('text-anchor', 'start')
            .attr('class', function(d, i) { 
                return 'value-' + i + ' ' + classify(d['key']); 
            ; })
            .text(function(d) { 
                return d['value'][1]['amt'].toFixed(0) + '%';
            });

    svg.append('g')
        .attr('class', 'label end')
        .selectAll('text')
            .data(d3.entries(lines))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][1]['year']);
            })
            .attr('y', function(d, i) { 
                var ypos = y(d['value'][1]['amt']);
                switch(d['key']) {
                    case 'Age 20-24':
                        ypos -= 3;
                        break;
                    case 'Age 35-44':
                        ypos -= 4;
                        break;
                    case 'Age 45-54':
                        ypos += 12;
                        break;
                    case 'Age 55-64':
                        ypos += 6;
                        break;   
                }
                return ypos;
            })
            .attr('dx', 35)
            .attr('dy', 4)
            .attr('text-anchor', 'start')
            .attr('class', function(d, i) { 
                return 'label-' + i + ' ' + classify(d['key']); 
            })
            .text(function(d) { 
                return d['key'];
            });
    
    // axis year labels
    svg.append('text')
        .attr('class', 'axis label begin')
        .attr('x', function() {
            return x(start_year) - 6;
        })
        .attr('y', -22)
        .attr('text-anchor', 'end')
        .text(year_fmt(start_year));

    svg.append('text')
        .attr('class', 'axis label begin')
        .attr('x', function() {
            return x(end_year) + 6;
        })
        .attr('y', -22)
        .attr('text-anchor', 'start')
        .text(year_fmt(end_year));


    if (pymChild) {
        pymChild.sendHeight();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        
        reasons.forEach(function(k,v) {
            graphic_data[k][0]['year'] = d3.time.format('%Y').parse(graphic_data[k][0]['year']);
            graphic_data[k][1]['year'] = d3.time.format('%Y').parse(graphic_data[k][1]['year']);
        });
        
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        // responsive iframe
        pymChild = new pym.Child({ });
    }
})

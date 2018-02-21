var $graphic;

var dot_radius = 5;
var color;
var graphic_height = 350;
var mobile_threshold = 500;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data = [
    { 'subject': 'Overall', 'Men': 2.90, 'Women': 3.10 },
    { 'subject': 'Math', 'Men': 2.57, 'Women': 2.73 },
    { 'subject': 'Science', 'Men': 2.61, 'Women': 2.78 },
    { 'subject': 'English', 'Men': 2.69, 'Women': 3.01 },
    { 'subject': 'Social Studies', 'Men': 2.79, 'Women': 3.00 }
];


/*
 * Render the graphic
 */
function render(container_width) {
    var num_subjects = graphic_data.length;
    var num_y_ticks = 8;
    var margin = { top: 5, right: 1, bottom: 10, left: 27 };
    var width = container_width - margin['left'] - margin['right'];
    var height = graphic_height - margin.top - margin.bottom;
    
    if (container_width <= mobile_threshold) {
        num_y_ticks = 4;
    }
    
    // clear out existing graphics
    $graphic.empty();

    var x = d3.scale.ordinal()
        .domain(graphic_data.map(function(d) { 
            return d['subject'];
        }))
        .rangeRoundBands([0, width], .1);
        
    var y = d3.scale.linear()
        .range([height, 0])
        .domain([0, 4]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');
        
    var x_axis_grid = function() { return xAxis; }

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            return d.toFixed(1);
        });
        
    var y_axis_grid = function() { return yAxis; }
    
    var chart = d3.select('#graphic').append('div')
        .attr('class', 'chart');
    
    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + width + 'px; margin-left: ' + margin['left'] + 'px;')
        .selectAll('li')
            .data(graphic_data)
        .enter().append('li')
            .attr('style', 'width: ' + 100/num_subjects + '%')
            .attr('class', function(d,i) {
                return classify(d['subject']);
            })
            .text(function(d) { return d['subject'] });

    var svg = chart.append('svg')
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
        .attr('class', 'y axis')
        .call(yAxis);

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );
    
    var subject = svg.selectAll('.subject')
        .data(graphic_data)
        .enter().append('g')
            .attr('class', function(d) {
                return 'subject ' + classify(d['subject'])
            })
            .attr('transform', function(d) { 
                return 'translate(' + x(d['subject']) + ', 0)';
            });

    subject.append('rect')
        .attr('x', function(d) {
            return (x.rangeBand() - (dot_radius * 2)) / 2;
        })
        .attr('y', function(d) {
            return y(d['Women']); 
        })
        .attr('height', function(d) {
            return y(d['Men']) - y(d['Women']);
        })
        .attr('width', dot_radius * 2)
        .attr('class', function(d) { 
            return 'gap ' + classify(d['subject']);
        });

    subject.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(function(d) {
            return d['gpa'];
        })
        .enter().append('circle')
            .attr('cy', function(d) { 
                return y(d['val']);
            })
            .attr('cx', function(d) { 
                return x.rangeBand() / 2;
            })
            .attr('r', dot_radius)
            .attr('class', function(d) { 
                return classify(d['name']);
            });

    subject.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(function(d) { 
                return d['gpa'];
            })
        .enter().append('text')
            .attr('x', function(d) {
                return x.rangeBand() / 2;
            })
            .attr('y', function(d, i) {
                return y(d['val']);
            })
            .attr('dy', function(d, i) {
                switch(d['name']) {
                    case 'Men':
                        return 16 + (dot_radius / 2);
                        break;
                    case 'Women':
                        return -8 - (dot_radius / 2);
                        break;
                }
            })
            .attr('text-anchor', 'middle')
            .attr('class', function(d) { 
                return classify(d['name']);
            })
            .text(function(d) { 
                return d['val'].toFixed(2);
            });

    subject.append('g')
        .attr('class', 'value gender')
        .selectAll('text')
            .data(function(d) { 
                return d['gpa'];
            })
        .enter().append('text')
            .attr('x', function(d) {
                return x.rangeBand() / 2;
            })
            .attr('y', function(d, i) {
                return y(d['val']);
            })
            .attr('dy', function(d, i) {
                switch(d['name']) {
                    case 'Men':
                        return 33 + (dot_radius / 2);
                        break;
                    case 'Women':
                        return -23 - (dot_radius / 2);
                        break;
                }
            })
            .attr('text-anchor', 'middle')
            .attr('class', function(d) { 
                return classify(d['name']);
            })
            .text(function(d) { 
                return d['name'];
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

        // process the data
        color = d3.scale.ordinal()
            .range([colors['blue3'], colors['orange4']])
            .domain(d3.keys(graphic_data[0]).filter(function(key) { 
                return key !== 'subject';
            }));
        
        graphic_data.forEach(function(d) {
            d['gpa'] = color.domain().map(function(name) { 
                return { name: name, val: +d[name] }; 
            });
        });

        // setup pym
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

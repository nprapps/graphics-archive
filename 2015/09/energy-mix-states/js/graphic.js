var $graphic;
var IS_MOBILE;
var graphic_data;
var min_height = 250;
var mobile_threshold = 480;
var num_across = 5;
var num_ticks;
var pymChild = null;
var year_fmt = d3.time.format('%Y');

var fuels = [ 'Coal', 'Petroleum', 'Natural gas', 'Nuclear', 'Hydro', 'Renewables', 'Other'];

var label_pos = {
    'Alabama': { 
        'left': { 'Natural gas': 8, 'Hydro': 0 },
        'right': { 'Coal': -6, 'Nuclear': 8 }
    },
    'Alaska': {
        'right': { 'Coal': 2 }
    },
    'Arizona': {
        'right': { 'Hydro': 2, 'Renewables': 6 }
    },
    'Arkansas': {
        'right': { 'Nuclear': -3, 'Natural gas': 7 }
    },
    'California': {
        'right': { 'Hydro': 2 }
    },
    'Colorado': {
        'left': { 'Hydro': 0, 'Renewables': 6 }
    },
    'Connecticut': {
        'left': { 'Natural gas': 0, 'Coal': 6, 'Petroleum': 0, 'Renewables': 0, 'Hydro': 8 },
        'right': { 'Coal': -26, 'Renewables': -17, 'Other': -6, 'Petroleum': 0, 'Hydro': 10 }
    },
    'Delaware': {
        'left': { 'Natural gas': 0, 'Petroleum': 8 },
        'right': { 'Renewables': -4 }
    },
    'Florida': {
        'left': { 'Coal': -1, 'Natural gas': 9, 'Petroleum': 0, 'Nuclear': 4 }
    },
    'Georgia': {
        'right': { 'Coal': -4, 'Natural gas': 7 }
    },
    'Hawaii': {
        'left': { 'Renewables': 2 }
    },
    'Idaho': {
        'right': { 'Natural gas': 0 }
    },
    'Illinois': {
        'left': { 'Natural gas': -4 },
        'right': { 'Renewables': -2 }
    },
    'Indiana': {
        'left': { 'Natural gas': -2 }
    },
    'Iowa': {
        'left': { 'Nuclear': 2, 'Renewables': -6, 'Hydro': 2, 'Natural gas': 8 },
        'right': { 'Natural gas': 0, 'Hydro': 8 }
    },
    'Kansas': {
        'left': { 'Natural gas': -9, 'Petroleum': 1, 'Renewables': 8 }
    },
    'Kentucky': {
        'left': { 'Hydro': 0, 'Petroleum': 8 },
        'right': { 'Hydro': 0, 'Petroleum': 6 }
    },
    'Louisiana': {
        'left': { 'Natural gas': -2, 'Coal': 8 }
    },
    'Maine': {
        'left': { 'Hydro': 1, 'Renewables': 3, 'Petroleum': 6,'Coal': 1, 'Other': 10 },
        'right': { 'Renewables': 8, 'Coal': 8, 'Petroleum': -10, 'Other': 1 }
    },
    'Maryland': {
        'left': { 'Petroleum': -6, 'Hydro': 0, 'Natural gas': 2, 'Renewables': 8 },
        'right': { 'Coal': 2, 'Natural gas': -6, 'Hydro': -3, 'Renewables': 2, 'Petroleum': 8 }
    },
    'Massachusetts': {
        'left': { 'Hydro': 8, 'Nuclear': 2, 'Renewables': -7, 'Other': 0 },
        'right': { 'Nuclear': -9, 'Coal': 0, 'Hydro': -4, 'Petroleum': 10, 'Other': 5, 'Renewables': -9 }
    },
    'Minnesota': {
        'left': { 'Natural gas': 0, 'Petroleum': 8 },
        'right': { 'Nuclear': 0 }
    },
    'Missouri': {
        'left': { 'Hydro': 8 },
        'right': { 'Natural gas': 4, 'Hydro': 7 }
    },
    'Montana': {
        'left': { 'Petroleum': 0, 'Renewables': 8 },
        'right': { 'Petroleum': 8, 'Natural gas': -2, 'Renewables': -2 }
    },
    'Nebraska': {
        'left': { 'Renewables': 8 },
        'right': { 'Renewables': 0, 'Hydro': 6 }
    },
    'Nevada': {
        'left': { 'Hydro': 2, 'Renewables': 8 },
        'right': { 'Renewables': 5, 'Hydro': 8 }
    },
    'New Hampshire': {
        'left': { 'Natural gas': -4, 'Coal': 6, 'Petroleum': 2, 'Renewables': 10 },
        'right': { 'Hydro': 10, 'Coal': 0, 'Renewables': -9 }
    },
    'New Jersey': {
        'left': { 'Petroleum': 2, 'Renewables': 10 },
        'right': { 'Coal': -6, 'Renewables': 3, 'Petroleum': 8 }
    },
    'New York': {
        'left': { 'Petroleum': 8, 'Natural gas': 0 },
        'right': { 'Renewables': -8, 'Coal': 1 }
    },
    'Ohio': {
        'right': { 'Natural gas': 0 }
    },
    'Oklahoma': {
        'left': { 'Renewables': 8 },
        'right': { 'Natural gas': 9, 'Coal': -2 }
    },
    'Pennsylvania': {
        'left': { 'Natural gas': 0, 'Renewables': 8 },
        'right': { 'Renewables': 2, 'Petroleum': 8 }
    },
    'South Dakota': {
        'left': { 'Natural gas': 2, 'Renewables': 8 },
        'right': { 'Coal': 2, 'Renewables': 6 }
    },
    'Tennessee': {
        'right': { 'Coal': 2 }
    },
    'Texas': {
        'left': { 'Natural gas': 2, 'Coal': 6 },
        'right': { 'Coal': 6, 'Nuclear': -4, 'Renewables': 6 }
    },
    'Utah': {
        'left': { 'Hydro': 8 },
        'right': { 'Hydro': -4, 'Renewables': 8 }
    },
    'Virginia': {
        'left': { 'Petroleum': 1, 'Natural gas': 6 },
        'right': { 'Coal': 10, 'Renewables': 1, 'Petroleum': 8 }
    },
    'Washington': {
        'left': { 'Coal': -2, 'Nuclear': 0, 'Natural gas': 8 },
        'right': { 'Natural gas': -9, 'Nuclear': -4, 'Coal': 12 }
    },
    'Wisconsin': {
        'left': { 'Natural gas': -2, 'Hydro': 5, 'Renewables': 10 },
        'right': { 'Renewables': -2 }
    }
};


/*
 * Render the graphic
 */
function render(container_width) {
    var graphic_width;

    // clear out existing graphics
    $graphic.empty();
    
    if (container_width >= 1000) {
        num_across = 5;
    } else if (container_width >= 900 && container_width < 1100) {
        num_across = 4;
    } else if (container_width >= 700 && container_width < 900) {
        num_across = 3;
    } else if (container_width >= 500 && container_width < 700) {
        num_across = 2;
    } else {
        num_across = 1;
    }
    
    if (num_across == 1) {
        graphic_width = container_width;
    } else {
        graphic_width = Math.floor((container_width - (num_across * 11)) / num_across);
    }
    
    data.forEach(function(d, i) {
        if (d['name'] != 'United States') {
            draw_graph(graphic_width, d);
        }
    });
}

function adjust_labels(state, fuel, side) {
    var dy = 4;

    if (label_pos[state] && label_pos[state][side]) {
        if (label_pos[state][side][fuel] != undefined) {
            dy = label_pos[state][side][fuel];
        }
    }
    return dy;
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}

function format_pct(num) {
    return (num * 100).toFixed(0);
}

function draw_graph(graphic_width, graphic_data) {
    var margin = { top: 0, right: 100, bottom: 11, left: 25 };
    var width = graphic_width - margin.left - margin.right;
    var height = min_height - margin.top - margin.bottom;
    var lines = graphic_data['fuels'];

    var x = d3.time.scale()
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);
    
    var line = d3.svg.line()
        .x(function(d) { return x(d['year']); })
        .y(function(d) { return y(d['amt']); });
    
    var wrapper = d3.select('#graphic').append('div')
        .attr('class', 'chart ' + classify(graphic_data['name']))
        .attr('style', 'width: ' + graphic_width + 'px');
        
    wrapper.append('h3')
        .attr('style', 'margin-left: ' + margin.left + 'px')
        .text(graphic_data['name']);
    
    var years = wrapper.append('h4');
    years.append('span')
        .attr('style', 'left: ' + margin.left + 'px')
        .text('\u2019' + '03');
    years.append('span')
        .attr('style', 'right: ' + margin.right + 'px')
        .text('\u2019' + '13');

    var svg = wrapper.append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    x.domain([ year_fmt.parse('2003'), year_fmt.parse('2013') ]);
    y.domain([0, 1.0]);
    
    svg.append('rect')
        .attr('class', 'bg')
        .attr('width', width)
        .attr('height', height);    
    
    svg.append('g').selectAll('path')
        .data(d3.entries(lines))
        .enter()
            .append('path')
                .attr('class', function(d, i) {
                    return 'line line-' + i + ' ' + classify(d['key']) + ' val-a' + (d['value'][0]['amt'] * 100).toFixed(0) + ' val-b' + (d['value'][1]['amt'] * 100).toFixed(0);
                })
                .attr('d', function(d) {
                    return line(d['value']);
                });

    svg.append('g')
        .attr('class', 'value begin')
        .selectAll('text')
            .data(d3.entries(lines))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][0]['year']);
            })
            .attr('y', function(d) { 
                var ypos = y(d['value'][0]['amt']);
                return ypos;
            })
            .attr('dx', -6)
            .attr('dy', function(d) {
                return adjust_labels(graphic_data['name'], d['key'], 'left');
            })
            .attr('text-anchor', 'end')
            .attr('class', function(d) { 
                return classify(d['key']) + ' val-a' + format_pct(d['value'][0]['amt']) + ' val-b' + format_pct(d['value'][1]['amt']);
            })
            .text(function(d) { 
                return format_pct(d['value'][0]['amt']);
            });

    svg.append('g')
        .attr('class', 'value end')
        .selectAll('text')
            .data(d3.entries(lines))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][1]['year']);
            })
            .attr('y', function(d) { 
                var ypos = y(d['value'][1]['amt']);
                return ypos;
            })
            .attr('dx', 27)
            .attr('dy', function(d) {
                return adjust_labels(graphic_data['name'], d['key'], 'right');
            })
            .attr('text-anchor', 'end')
            .attr('class', function(d) { 
                return classify(d['key']) + ' val-a' + format_pct(d['value'][0]['amt']) + ' val-b' + format_pct(d['value'][1]['amt']);
            })
            .text(function(d) { 
                return format_pct(d['value'][1]['amt']) + '%';
            });

    svg.append('g')
        .attr('class', 'label end')
        .selectAll('text')
            .data(d3.entries(lines))
        .enter().append('text')
            .attr('x', function(d, i) { 
                return x(d['value'][1]['year']);
            })
            .attr('y', function(d) { 
                var ypos = y(d['value'][1]['amt']);
                return ypos;
            })
            .attr('dx', 32)
            .attr('dy', function(d) {
                return adjust_labels(graphic_data['name'], d['key'], 'right');
            })
            .attr('text-anchor', 'start')
            .attr('class', function(d) { 
                return classify(d['key']) + ' val-a' + (d['value'][0]['amt'] * 100).toFixed(0) + ' val-b' + (d['value'][1]['amt'] * 100).toFixed(0);
            })
            .text(function(d) { 
                return d['key'];
            });
    
    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}


$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        
        data.forEach(function(e,i) {
            var state_fuels = data[i]['fuels'];
            fuels.forEach(function(f) {
                state_fuels[f][0]['year'] = year_fmt.parse(state_fuels[f][0]['year']);
                state_fuels[f][1]['year'] = year_fmt.parse(state_fuels[f][1]['year']);
            });
        });
        
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        // responsive iframe
        pymChild = new pym.Child();
    }
})

var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_default_width = 600;
var is_mobile;
var label_width = 45;
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
{"state":"U.S. average","state_abbr":"USA","state_ap_abbr":"Overall","all_1991":43.0,"all_2010":83.0,"no_1991":56.7,"no_2010":91.4,"smoke_1991":9.6,"smoke_2010":46.1},
{"state":"Alabama","state_abbr":"AL","state_ap_abbr":"Ala.","all_1991":38.7,"all_2010":80.9,"no_1991":54.1,"no_2010":91.3,"smoke_1991":6.7,"smoke_2010":38.4},
{"state":"Alaska","state_abbr":"AK","state_ap_abbr":"Alaska","all_1991":50.8,"all_2010":85.6,"no_1991":68.0,"no_2010":94.7,"smoke_1991":14.1,"smoke_2010":56.5},
{"state":"Arizona","state_abbr":"AZ","state_ap_abbr":"Ariz.","all_1991":54.1,"all_2010":91.0,"no_1991":68.2,"no_2010":96.4,"smoke_1991":17.2,"smoke_2010":64.8},
{"state":"Arkansas","state_abbr":"AR","state_ap_abbr":"Ark.","all_1991":33.1,"all_2010":73.1,"no_1991":46.7,"no_2010":85.5,"smoke_1991":5.3,"smoke_2010":35.9},
{"state":"California","state_abbr":"CA","state_ap_abbr":"Calif.","all_1991":59.0,"all_2010":91.5,"no_1991":71.6,"no_2010":94.9,"smoke_1991":19.0,"smoke_2010":67.9},
{"state":"Colorado","state_abbr":"CO","state_ap_abbr":"Colo.","all_1991":47.8,"all_2010":87.4,"no_1991":62.9,"no_2010":93.3,"smoke_1991":10.2,"smoke_2010":55.6},
{"state":"Connecticut","state_abbr":"CT","state_ap_abbr":"Conn.","all_1991":44.7,"all_2010":84.6,"no_1991":58.4,"no_2010":92.5,"smoke_1991":11.7,"smoke_2010":47.5},
{"state":"District of Columbia","state_abbr":"DC","state_ap_abbr":"D.C.","all_1991":40.0,"all_2010":80.4,"no_1991":52.2,"no_2010":90.2,"smoke_1991":9.9,"smoke_2010":39.1},
{"state":"Delaware","state_abbr":"DE","state_ap_abbr":"Del.","all_1991":41.3,"all_2010":80.7,"no_1991":52.8,"no_2010":89.3,"smoke_1991":5.5,"smoke_2010":31.7},
{"state":"Florida","state_abbr":"FL","state_ap_abbr":"Fla.","all_1991":50.1,"all_2010":88.3,"no_1991":64.8,"no_2010":94.5,"smoke_1991":13.2,"smoke_2010":57.1},
{"state":"Georgia","state_abbr":"GA","state_ap_abbr":"Ga.","all_1991":41.4,"all_2010":84.9,"no_1991":55.1,"no_2010":91.5,"smoke_1991":7.9,"smoke_2010":51.9},
{"state":"Hawaii","state_abbr":"HI","state_ap_abbr":"Hawaii","all_1991":51.2,"all_2010":85.1,"no_1991":64.6,"no_2010":89.9,"smoke_1991":12.7,"smoke_2010":57.3},
{"state":"Idaho","state_abbr":"ID","state_ap_abbr":"Idaho","all_1991":50.0,"all_2010":88.6,"no_1991":66.1,"no_2010":95.1,"smoke_1991":11.5,"smoke_2010":61.6},
{"state":"Illinois","state_abbr":"IL","state_ap_abbr":"Ill.","all_1991":38.5,"all_2010":79.2,"no_1991":51.3,"no_2010":89.0,"smoke_1991":7.2,"smoke_2010":38.1},
{"state":"Indiana","state_abbr":"IN","state_ap_abbr":"Ind.","all_1991":33.9,"all_2010":73.9,"no_1991":47.6,"no_2010":86.3,"smoke_1991":7.8,"smoke_2010":31.4},
{"state":"Iowa","state_abbr":"IA","state_ap_abbr":"Iowa","all_1991":35.9,"all_2010":78.4,"no_1991":48.0,"no_2010":89.4,"smoke_1991":5.6,"smoke_2010":41.4},
{"state":"Kansas","state_abbr":"KS","state_ap_abbr":"Kan.","all_1991":39.6,"all_2010":81.1,"no_1991":54.9,"no_2010":91.8,"smoke_1991":4.9,"smoke_2010":43.1},
{"state":"Kentucky","state_abbr":"KY","state_ap_abbr":"Ky.","all_1991":25.6,"all_2010":69.4,"no_1991":39.2,"no_2010":84.5,"smoke_1991":3.6,"smoke_2010":29.3},
{"state":"Louisiana","state_abbr":"LA","state_ap_abbr":"La.","all_1991":37.0,"all_2010":82.5,"no_1991":47.8,"no_2010":92.0,"smoke_1991":11.6,"smoke_2010":45.6},
{"state":"Maine","state_abbr":"ME","state_ap_abbr":"Maine","all_1991":39.5,"all_2010":82.0,"no_1991":57.5,"no_2010":90.6,"smoke_1991":8.1,"smoke_2010":50.5},
{"state":"Maryland","state_abbr":"MD","state_ap_abbr":"Md.","all_1991":42.4,"all_2010":84.3,"no_1991":56.7,"no_2010":90.6,"smoke_1991":6.3,"smoke_2010":48.9},
{"state":"Massachusetts","state_abbr":"MA","state_ap_abbr":"Mass.","all_1991":40.2,"all_2010":84.1,"no_1991":51.2,"no_2010":91.8,"smoke_1991":10.0,"smoke_2010":42.2},
{"state":"Michigan","state_abbr":"MI","state_ap_abbr":"Mich.","all_1991":35.0,"all_2010":76.3,"no_1991":49.1,"no_2010":87.2,"smoke_1991":6.1,"smoke_2010":36.0},
{"state":"Minnesota","state_abbr":"MN","state_ap_abbr":"Minn.","all_1991":39.6,"all_2010":84.2,"no_1991":53.8,"no_2010":92.8,"smoke_1991":7.8,"smoke_2010":48.9},
{"state":"Mississippi","state_abbr":"MS","state_ap_abbr":"Miss.","all_1991":40.9,"all_2010":80.2,"no_1991":53.9,"no_2010":88.8,"smoke_1991":9.1,"smoke_2010":47.4},
{"state":"Missouri","state_abbr":"MO","state_ap_abbr":"Mo.","all_1991":34.1,"all_2010":74.1,"no_1991":46.0,"no_2010":87.1,"smoke_1991":7.6,"smoke_2010":36.0},
{"state":"Montana","state_abbr":"MT","state_ap_abbr":"Mont.","all_1991":42.8,"all_2010":82.8,"no_1991":56.8,"no_2010":91.5,"smoke_1991":7.4,"smoke_2010":49.7},
{"state":"Nebraska","state_abbr":"NE","state_ap_abbr":"Neb.","all_1991":40.0,"all_2010":82.3,"no_1991":52.2,"no_2010":90.8,"smoke_1991":8.6,"smoke_2010":49.2},
{"state":"Nevada","state_abbr":"NV","state_ap_abbr":"Nev.","all_1991":45.5,"all_2010":86.5,"no_1991":62.5,"no_2010":94.3,"smoke_1991":10.3,"smoke_2010":55.1},
{"state":"New Hampshire","state_abbr":"NH","state_ap_abbr":"N.H.","all_1991":38.3,"all_2010":83.5,"no_1991":51.5,"no_2010":92.5,"smoke_1991":7.3,"smoke_2010":44.4},
{"state":"New Jersey","state_abbr":"NJ","state_ap_abbr":"N.J.","all_1991":45.5,"all_2010":86.1,"no_1991":58.3,"no_2010":92.7,"smoke_1991":10.1,"smoke_2010":47.5},
{"state":"New Mexico","state_abbr":"NM","state_ap_abbr":"N.M.","all_1991":45.4,"all_2010":84.4,"no_1991":58.8,"no_2010":90.9,"smoke_1991":11.4,"smoke_2010":54.7},
{"state":"New York","state_abbr":"NY","state_ap_abbr":"N.Y.","all_1991":41.4,"all_2010":81.2,"no_1991":53.7,"no_2010":89.8,"smoke_1991":8.1,"smoke_2010":36.5},
{"state":"North Carolina","state_abbr":"NC","state_ap_abbr":"N.C.","all_1991":34.1,"all_2010":79.4,"no_1991":46.2,"no_2010":90.2,"smoke_1991":8.6,"smoke_2010":36.7},
{"state":"North Dakota","state_abbr":"ND","state_ap_abbr":"N.D.","all_1991":40.9,"all_2010":81.2,"no_1991":53.0,"no_2010":90.6,"smoke_1991":8.3,"smoke_2010":47.7},
{"state":"Ohio","state_abbr":"OH","state_ap_abbr":"Ohio","all_1991":35.0,"all_2010":73.7,"no_1991":47.9,"no_2010":86.4,"smoke_1991":6.0,"smoke_2010":34.3},
{"state":"Oklahoma","state_abbr":"OK","state_ap_abbr":"Okla.","all_1991":39.1,"all_2010":76.4,"no_1991":55.2,"no_2010":90.3,"smoke_1991":6.0,"smoke_2010":40.5},
{"state":"Oregon","state_abbr":"OR","state_ap_abbr":"Ore.","all_1991":49.8,"all_2010":90.8,"no_1991":64.5,"no_2010":95.9,"smoke_1991":13.1,"smoke_2010":65.6},
{"state":"Pennsylvania","state_abbr":"PA","state_ap_abbr":"Pa.","all_1991":39.6,"all_2010":78.5,"no_1991":52.7,"no_2010":88.3,"smoke_1991":7.9,"smoke_2010":39.9},
{"state":"Rhode Island","state_abbr":"RI","state_ap_abbr":"R.I.","all_1991":38.9,"all_2010":79.4,"no_1991":52.6,"no_2010":90.1,"smoke_1991":6.6,"smoke_2010":37.5},
{"state":"South Carolina","state_abbr":"SC","state_ap_abbr":"S.C.","all_1991":39.9,"all_2010":78.0,"no_1991":54.3,"no_2010":88.7,"smoke_1991":7.4,"smoke_2010":33.1},
{"state":"South Dakota","state_abbr":"SD","state_ap_abbr":"S.D.","all_1991":36.7,"all_2010":80.8,"no_1991":50.0,"no_2010":89.8,"smoke_1991":5.2,"smoke_2010":52.5},
{"state":"Tennessee","state_abbr":"TN","state_ap_abbr":"Tenn.","all_1991":33.9,"all_2010":75.0,"no_1991":48.8,"no_2010":87.7,"smoke_1991":4.6,"smoke_2010":35.8},
{"state":"Texas","state_abbr":"TX","state_ap_abbr":"Texas","all_1991":46.3,"all_2010":85.1,"no_1991":60.3,"no_2010":92.5,"smoke_1991":10.6,"smoke_2010":51.7},
{"state":"Utah","state_abbr":"UT","state_ap_abbr":"Utah","all_1991":69.4,"all_2010":93.6,"no_1991":82.8,"no_2010":97.3,"smoke_1991":20.9,"smoke_2010":68.4},
{"state":"Vermont","state_abbr":"VT","state_ap_abbr":"Vt.","all_1991":39.0,"all_2010":85.0,"no_1991":54.6,"no_2010":92.1,"smoke_1991":8.3,"smoke_2010":56.1},
{"state":"Virginia","state_abbr":"VA","state_ap_abbr":"Va.","all_1991":39.0,"all_2010":85.6,"no_1991":53.8,"no_2010":93.2,"smoke_1991":7.4,"smoke_2010":46.1},
{"state":"Washington","state_abbr":"WA","state_ap_abbr":"Wash.","all_1991":54.3,"all_2010":90.7,"no_1991":69.5,"no_2010":95.2,"smoke_1991":16.9,"smoke_2010":70.2},
{"state":"West Virginia","state_abbr":"WV","state_ap_abbr":"W.Va.","all_1991":27.9,"all_2010":69.0,"no_1991":41.8,"no_2010":82.9,"smoke_1991":4.0,"smoke_2010":27.2},
{"state":"Wisconsin","state_abbr":"WI","state_ap_abbr":"Wis.","all_1991":36.5,"all_2010":83.1,"no_1991":50.4,"no_2010":91.4,"smoke_1991":5.9,"smoke_2010":49.4},
{"state":"Wyoming","state_abbr":"WY","state_ap_abbr":"Wyo.","all_1991":38.5,"all_2010":78.8,"no_1991":52.8,"no_2010":90.3,"smoke_1991":6.2,"smoke_2010":41.1}
];

var graphic_data_key = [ 
    { 'key': '1991-92', 'color': colors['red5'] },
    { 'key': '2010-11', 'color': colors['red2'] }
];

var header_text = {
    'all': 'All Households',
    'smoke': 'At Least One Adult Smoker',
    'no': 'No Adult Smokers'
};


/*
 * Render the graphic
 */
function render(container_width) {
    var graphic_width;

    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }
    
    graphic_width = Math.floor((container_width - label_width) / 3);
    
    // clear out existing graphics
    $graphic.empty();
    
    var headers = d3.select('#graphic').append('div')
        .attr('class', 'headers')
        .attr('style', function(d) {
            return 'margin-left:' + label_width + 'px';
        })
        .selectAll('h3')
            .data(d3.entries(header_text))
        .enter()
            .append('h3')
            .attr('style', function(d) {
                return 'width: ' + graphic_width + 'px';
            })
            .text(function(d) {
                return d['value'];
            });

    draw_graph('all', (graphic_width + label_width));
    draw_graph('smoke', graphic_width);
    draw_graph('no', graphic_width);

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function draw_graph(id, graphic_width) {
    var bar_height;
    var bar_gap;
    var dot_radius;
    var height;
    var margin;
    var num_bars = graphic_data.length;
    var tick_values = [];
    var underbar_height;
    var underbar_offset;
    var width;

    if (is_mobile) {
        tick_values = [ 0, 50, 100 ];
        bar_height = 15;
        bar_gap = 2;
        margin = { top: 20, right: 5, bottom: 20, left: 5 };
    } else {
        tick_values = [ 0, 25, 50, 75, 100 ];
        bar_height = 20;
        bar_gap = 2;
        margin = { top: 20, right: 15, bottom: 20, left: 15 };
    }
    underbar_height = bar_height / 2;
    underbar_offset = (bar_height - underbar_height) / 2;
    dot_radius = underbar_height / 2;

    if (id == 'all') {
        margin['left'] += label_width;
    }

    width = graphic_width - margin['left'] - margin['right'];
    height = ((bar_height + bar_gap) * num_bars);
    
    var x = d3.scale.linear()
        .range([ 0, width ])
        .domain([ 0,100 ]);

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues(tick_values)
        .tickFormat(function(d) {
            if (d == 50 && !is_mobile) {
                return d;
            }
        });

    var xAxisTop = d3.svg.axis()
        .scale(x)
        .orient('top')
        .tickValues(tick_values)
        .tickFormat(function(d) {
            if (d == 50 && !is_mobile) {
                return d;
            }
        });

    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(0);

    var line = d3.svg.line()
        .interpolate('basis')
        .x(function(d) { 
            return x(d['date']);
        })
        .y(function(d) { 
            return y(d['amt']);
        });
        
    // draw the legend
    if (id == 'all') {
        var legend = d3.select('#graphic')
            .insert('ul', '.headers')
                .attr('class', 'key')
                .selectAll('g')
                    .data(graphic_data_key)
                .enter().append('li')
                    .attr('class', function(d, i) { 
                        return 'key-item key-' + i + ' ' + classify(d['key']);
                    });
        legend.append('b')
            .style('background-color', function(d) {
                return d['color'];
            });
        legend.append('label')
            .text(function(d) {
                return d['key'];
            });
    }


    // draw the chart
    var svg = d3.select('#graphic')
        .append('svg')
            .attr('width', graphic_width)
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // show state labels
    if (id == 'all') {
        var state_names = svg.append('g')
            .attr('class', 'label')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', -margin['left'])
                .attr('y', function(d, i) { 
                    return i * (bar_height + bar_gap);
                })
                .attr('dx', 0)
                .attr('dy', (bar_height / 2) + 4)
                .attr('text-anchor', 'begin')
                .attr('class', function(d) { 
                    return classify(d['state_abbr'])
                })
                .text(function(d,i) { 
                    return d['state_ap_abbr']
                });
    }
    
    var shaded_rows = svg.append('g')
        .attr('class', 'rows')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr('class', 'bg-row')
            .attr('fill', function(d,i) {
                if (d['state_abbr'] == 'USA') {
                    return '#dedede';
                } else {
                    return '#f1f1f1';
                }
            })
            .attr('width', width)
            .attr('height', bar_height)
            .attr('x', 0)
            .attr('y', function(d,i) {
                return (bar_height + bar_gap) * i;
            });

    var xTop = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,0)')
        .call(xAxisTop);

    var xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);
    
    var xTopBounds = svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,0)');
    xTopBounds.append('text')
        .attr('x', x(0))
        .attr('y', -9)
        .attr('text-anchor', 'begin')
        .text('0');
    xTopBounds.append('text')
        .attr('x', x(100) + 5)
        .attr('y', -9)
        .attr('text-anchor', 'end')
        .text('100%');

    var xBotBounds = svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')');
    xTopBounds.append('text')
        .attr('x', x(0))
        .attr('y', height + 17)
        .attr('text-anchor', 'begin')
        .text('0');
    xTopBounds.append('text')
        .attr('x', x(100) + 5)
        .attr('y', height + 17)
        .attr('text-anchor', 'end')
        .text('100%');

    var yTop = svg.append('g') // Add the Y Axis
        .attr('class', 'y axis')
        .call(yAxis);

    var xGrid = svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );
        
    var underbars = svg.append('g')
        .attr('class', 'underbars')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr('width', function(d,i) {
                var x0 = d[id + '_1991'];
                var x1 = d[id + '_2010'];
                return x(x1) - x(x0);
            })
            .attr('height', underbar_height)
            .attr('x', function(d,i) {
                return x(d[id + '_1991']);
            })
            .attr('y', function(d,i) {
                return ((bar_height + bar_gap) * i) + underbar_offset;
            })
            .attr('fill', colors['red6'])
            .on('mouseover', on_mouseover)
            .on('mouseout', on_mouseout);

    var dots_1991 = svg.append('g')
        .attr('class', 'dots dots-1991')
        .selectAll('circle')
            .data(graphic_data)
        .enter().append('circle')
            .attr('cy', function(d,i) { 
                return ((bar_height + bar_gap) * i) + (bar_height / 2);
            })
            .attr('cx', function(d) { 
                return x(d[id + '_1991']);
            })
            .attr('r', dot_radius)
            .attr('class', function(d) { 
                return classify(d['state_abbr']);
            })
            .attr('fill', colors['red5']);

    var dots_2010 = svg.append('g')
        .attr('class', 'dots dots-2010')
        .selectAll('circle')
            .data(graphic_data)
        .enter().append('circle')
            .attr('cy', function(d,i) { 
                return ((bar_height + bar_gap) * i) + (bar_height / 2);
            })
            .attr('cx', function(d) { 
                return x(d[id + '_2010']);
            })
            .attr('r', dot_radius)
            .attr('class', function(d) { 
                return classify(d['state_abbr']);
            })
            .attr('fill', colors['red2']);
        
    if (!is_mobile) {
        var values_1991 = svg.append('g')
            .attr('class', 'value value-1991')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', function(d) {
                    return x(d[id + '_1991']);
                })
                .attr('y', function(d, i) { 
                    return ((bar_height + bar_gap) * i);
                })
                .attr('dx', -(dot_radius + 3))
                .attr('dy', (bar_height / 2) + 4)
                .attr('text-anchor', 'end')
                .attr('class', function(d) { 
                    return classify(d['state_abbr'])
                })
                .text(function(d,i) { 
                    return d[id + '_1991'].toFixed(0);
                });
        var values_2010 = svg.append('g')
            .attr('class', 'value value-2010')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', function(d) {
                    return x(d[id + '_2010']);
                })
                .attr('y', function(d, i) { 
                    return ((bar_height + bar_gap) * i);
                })
                .attr('dx', dot_radius + 3)
                .attr('dy', (bar_height / 2) + 4)
                .attr('text-anchor', 'begin')
                .attr('class', function(d) { 
                    return classify(d['state_abbr'])
                })
                .text(function(d,i) { 
                    return d[id + '_2010'].toFixed(0);
                });
    }
}

function on_mouseover(e) {
    $('.value').find('.' + e['state_abbr'].toLowerCase()).show();
}

function on_mouseout(e) {
    $('.value').find('.' + e['state_abbr'].toLowerCase()).hide();
}


/*
 * Helper functions
 */
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
        
        var pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
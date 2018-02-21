var $graphic = $('#graphic');

var active_chart;
var init_load = false;
var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_aspect_width = 16;
var graphic_aspect_height = 9;
var graphic_data = [];
var graphic_data_url = 'data.json';
var graphic_default_width = 600;
var graphic_width;
var is_mobile;
var mobile_threshold = 540;
var pymChild = null;
var typeahead_init = false;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var search_data = [];


/*
 * Render the graphic
 */
function render(container_width) {
    if (!container_width) {
        container_width = graphic_default_width;
    }
    
    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }
    
    graphic_width = container_width - 22;;

    // clear out existing graphics
    $graphic.empty();
    
    // draw the graphic
    if (active_chart != null) {
        render_bar_chart(graphic_data[active_chart], graphic_width);
    }
    
    if (pymChild) {
        pymChild.sendHeight();
    }
}

function render_bar_chart(data, container_width) {
    var y = d3.scale.linear()
        .domain([0, d3.max(data['values'], function(d) { 
            var n = parseInt(d['amt']);
            return Math.ceil(n/1000000) * 1000000; // round to next 1M
        })]);
        
    var y_max = y.domain()[1]/1000000;
    
    if(y_max > 8 && y_max < 30) {
        y.domain()[1] = Math.ceil(y.domain()[1]/5000000) * 5000000; // round to next 5M
    } else if (y_max >= 30 && y_max < 60) {
        y.domain()[1] = Math.ceil(y.domain()[1]/10000000) * 10000000; // round to next 10M
    } else if (y_max >= 60 && y_max < 150) {
        y.domain()[1] = Math.ceil(y.domain()[1]/20000000) * 20000000; // round to next 20M
    } else if (y_max >= 150 && y_max < 500) {
        y.domain()[1] = Math.ceil(y.domain()[1]/50000000) * 50000000; // round to next 50M
    } else if (y_max >= 400) {
        y.domain()[1] = Math.ceil(y.domain()[1]/100000000) * 100000000; // round to next 100M
    }
    y_max = y.domain()[1]/1000000;

    var label = 'org-' + classify(data['org']);
    var last_data_point = graphic_data.length - 1;
    var margin = { top: 10, right: 10, bottom: 20, left: 63 };
    if (y_max > 99) {
        margin['left'] = 77;
    } else if (y_max > 9 || y_max < 4) {
        margin['left'] = 73;
    }

    var num_y_ticks = 5;
    var width = container_width - margin['left'] - margin['right'];
    var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];
    
    active_chart = data['id'];
    
    // clear out existing graphics
    $graphic.empty();

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(data['values'].map(function(d) { 
            return d['year']; 
        }));
    
    y.range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d,i) {
            if (is_mobile) {
                if ((i % 2) == 1) {
                    return '\u2019' + fmt_year_abbr(d);
                }
            } else {
                return '\u2019' + fmt_year_abbr(d);
            }
        });
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            } else {
                var amt = d/1000000;
                var y_max = y.domain()[1];

                if (y_max >= 4000000) {
                    amt = amt.toFixed(0)
                } else {
                    amt = amt.toFixed(1);
                }
                return '$' + amt + ' million';
            }
        });

    var y_axis_grid = function() { return yAxis; }
    
    var container = d3.select('#graphic').append('div')
        .attr('id', label)
        .attr('class', 'graph')
        .attr('style', function(d) {
            if (!is_mobile) {
                return 'width: ' + (width + margin['left'] + margin['right']) + 'px';
            }
        });
    
    var title = container.append('h3')
        .text(data['org']);
    
    var address = title.append('span')
        .text(' in ' + data['city'] + ', ' + data['state']);
    
    // draw the legend
    var legend = container.append('div')
        .attr('class', 'key');
    
    $('.key').append('<li class=\"key-item key-0\"><b style=\"background-color: ' + colors['red3'] + '\"></b><label>Grants awarded</label></li><li class=\"key-item key-1\"><b style=\"background-color: ' + colors['red5'] + '\"></b><label>Grants awarded in stimulus years</label></li>');
    // yes, i just did that. sigh.

    // draw the chart itself
    var svg = container.append('svg')
        .attr('width', width + margin['left'] + margin['right']);

    if (!init_load) {
        // animate the chart
        svg.attr('height', 0)
            .transition()
                .duration(1000)
                .attr('height', height + margin['top'] + margin['bottom'])
                .each('end', on_height_adjusted);
        init_load = true;
    } else {
        svg.attr('height', height + margin['top'] + margin['bottom']);
    }
    
    var chart = svg.append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    chart.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    chart.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    chart.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );

    chart.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(data['values'])
        .enter().append('rect')
            .attr('x', function(d) { 
                return x(d['year']);
            })
            .attr('y', function(d) { 
                return y(d['amt']);
            })
            .attr('width', x.rangeBand())
            .attr('class', function(d) {
                return 'bar bar-' + d['year'];
            })
            .attr('fill', function(d) {
                var yr = fmt_year_full(d['year']);
                if (yr == '2009' || yr == '2010') {
                    return colors['red5'];
                } else {
                    return colors['red3'];
                }
            })
            .attr('y', function(d) { 
                return y(0);
            })
            .attr('height', 0)
            .transition()
            .attr('y', function(d) { 
                return y(d['amt']);
            })
            .attr('height', function(d){ 
                return height - y(d['amt']);
            });
            
    if (data['footnote'] != null) {
        container.append('div')
            .attr('class', 'footnotes')
            .append('p')
                .html('<strong>Note:</strong> ' + data['footnote']);
    }

    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Helper functions
 */
function classify(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}

function substringMatcher(strs) {
    return function findMatches(q, cb) {
        q = q.toUpperCase();
        
        // an array that will be populated with substring matches
        var matches = [];

        // regex used to determine if a string contains the substring `q`
        var substrRegex = new RegExp(q, 'i');
        
        // iterate through the pool of strings and for any string that
        // contains the substring `q`, add it to the `matches` array
        $.each(strs, function(i, str) {
            if (substrRegex.test(str['search_all'])) {
                // the typeahead jQuery plugin expects suggestions to a
                // JavaScript object, refer to typeahead docs for more info
                matches.push({ value: str });
            }
        });
        
        cb(matches);
    };
}

function typeahead_suggestion(obj) {
    return '<p>' + obj['value']['search'] + '</p>';
}

function typeahead_empty(obj) {
    return '<p>No matching institutions found.</p>';
}

function on_typeahead_selected(event, selection) {
//    console.log($tt[0].innerHTML);
    render_bar_chart(graphic_data[selection['value']['id']], graphic_width);
}

function on_height_adjusted(e) {
    if (pymChild) {
        pymChild.sendHeight();
    }
}
function on_school_click(e) {
    var matches = [];
    var school = e.target.innerHTML.replace(',', '');
    var substrRegex = new RegExp('^' + school, 'i');
    
    $.each(search_data, function(i, school) {
        if (substrRegex.test(search_data[i]['search_all'])) {
            matches.push(search_data[i]['id']);
        }
    });
    
    render_bar_chart(graphic_data[matches[0]], graphic_width);
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.json(graphic_data_url, function(error, data) {
            data.forEach(function(d,i) {
                if (d['2000Adj'] != null || d['2001Adj'] != null || d['2002Adj'] != null || d['2003Adj'] != null || d['2004Adj'] != null || d['2005Adj'] != null || d['2006Adj'] != null || d['2007Adj'] != null || d['2008Adj'] != null || d['2009Adj'] != null || d['2010Adj'] != null || d['2011Adj'] != null || d['2012Adj'] != null || d['2013Adj'] != null) {
                    var s = {
                        'id': i,
                        'search': d['NPR_NAME'] + ' (' + d['EditCity'] + ', ' + d['AP_State'] + ')',
                        'search_all': d['NPR_NAME'] + ' ' + d['EditCity'] + ' ' + d['AP_State'] + ' ' + d['ORG_STATE'] + ' ' + d['StateFull']
                    }

                    var v = {
                        'id': i,
                        'org': d['NPR_NAME'],
                        'city': d['EditCity'],
                        'state': d['AP_State'],
                        'state_postal': d['ORG_STATE'],
                        'state_full': d['StateFull'],
                        'search': d['NPR_NAME'] + ' ' + d['EditCity'] + ' ' + d['AP_State'] + ' ' + d['ORG_STATE'] + ' ' + d['StateFull'],
                        'footnote': d['Footnote'],
                        'values': [
                            { 'year': d3.time.format('%Y').parse('2000'), 'amt': +d['2000Adj'] },
                            { 'year': d3.time.format('%Y').parse('2001'), 'amt': +d['2001Adj'] },
                            { 'year': d3.time.format('%Y').parse('2002'), 'amt': +d['2002Adj'] },
                            { 'year': d3.time.format('%Y').parse('2003'), 'amt': +d['2003Adj'] },
                            { 'year': d3.time.format('%Y').parse('2004'), 'amt': +d['2004Adj'] },
                            { 'year': d3.time.format('%Y').parse('2005'), 'amt': +d['2005Adj'] },
                            { 'year': d3.time.format('%Y').parse('2006'), 'amt': +d['2006Adj'] },
                            { 'year': d3.time.format('%Y').parse('2007'), 'amt': +d['2007Adj'] },
                            { 'year': d3.time.format('%Y').parse('2008'), 'amt': +d['2008Adj'] },
                            { 'year': d3.time.format('%Y').parse('2009'), 'amt': +d['2009Adj'] },
                            { 'year': d3.time.format('%Y').parse('2010'), 'amt': +d['2010Adj'] },
                            { 'year': d3.time.format('%Y').parse('2011'), 'amt': +d['2011Adj'] },
                            { 'year': d3.time.format('%Y').parse('2012'), 'amt': +d['2012Adj'] },
                            { 'year': d3.time.format('%Y').parse('2013'), 'amt': +d['2013Adj'] }
                        ]
                    };
                    
                    graphic_data[i] = v;
                    search_data.push(s);
                }
            });

            $('.typeahead').typeahead({
                hint: false,
                highlight: true,
                minLength: 2
            },
            {
                name: 'search_data',
                displayKey: 'search',
                source: substringMatcher(search_data),
                templates: {
                    empty: typeahead_empty,
                    suggestion: typeahead_suggestion
                }
            });
            
            $('.typeahead').on('typeahead:selected', on_typeahead_selected);
            
            $('.declines').find('li').on('click', on_school_click);
            $('.increases').find('li').on('click', on_school_click);

            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

var $graphic;

var color;
var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var mobile_threshold = 540;
var pymChild = null;
var fmtComma = d3.format(',');

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#a1ded9',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

// var graphic_data = [{"Group":"Lowest","Difference":4850.125348},
// {"Group":"Second","Difference":10239.15351},
// {"Group":"Third","Difference":12933.66759},
// {"Group":"Fourth","Difference":8622.445063},
// {"Group":"Top","Difference":-732907.8304}]
var graphic_data = [{"Group":"Lowest","Difference":3281.873933},
{"Group":"Second","Difference":6928.400526},
{"Group":"Third","Difference":8751.663822},
{"Group":"Fourth","Difference":5834.442548},
{"Group":"Fifth","Difference":17311.40519},
{"Group":"Top","Difference":-824844.3152}]

 // * Render the graphic
 // */
function render(container_width) {
    var graphic_aspect_height;
    var graphic_aspect_width;
    var margin;
    var num_y_ticks = 6;
    var height;
    var width;
    
    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }
    
    if (is_mobile) {
        margin = { top: 20, right: 15, bottom: 25, left: 60 };
        graphic_aspect_width = 4;
        graphic_aspect_height = 3;
    } else {
        margin = { top: 60, right: 50, bottom: 25, left: 100 };        
        graphic_aspect_width = 16;
        graphic_aspect_height = 9;
    }

    width = container_width - margin['left'] - margin['right'];
    height = 10000;

    // clear out existing graphics
    $graphic.empty();
    var quintilesGroup = ['Lowest', 'Second', 'Third', 'Fourth', 'Top']

    var x = d3.scale.ordinal()
        .domain(['Lowest', 'Second', 'Third', 'Fourth', 'Fifth', 'Top'])
        .rangeRoundBands([0, width], .1, 0);

    if (is_mobile) {x.rangeRoundBands([0, width], .05, 0);}

    console.log(graphic_data)
    var y = d3.scale.linear()
        .rangeRound([height, 0])
        .domain([-830000, 20000]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (!is_mobile) {
                return d + " Quintile"
            } else {
                return d ;
            }
        });
        
    var x_axis_grid = function() { return xAxis; }
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .ticks(num_y_ticks)
        .orient('left')
        .tickFormat(function(d) {
                return '$' + fmtComma(d);
        })
        .tickValues([-800000, -750000, -700000, -650000, -600000, -550000, -500000, -450000, -400000, -350000, -300000, -250000, -200000, -150000, -100000, -50000, 0, 5000, 10000, 15000, 20000]);

    
    var y_axis_grid = function() { return yAxis; }
    
    // var legend = d3.select('#graphic').append('ul')
    //         .attr('class', 'key')
    //         .selectAll('g')
    //             .data(graphic_data[0]['value'])
    //         .enter().append('li')
    //             .attr('class', function(d, i) { 
    //                 return 'key-item key-' + i + ' ' + classify(d['name']); 
    //             });
    // legend.append('b')
    //     .style('background-color', function(d,i) { 
    //         return color(d['name']);
    //     })
    // legend.append('label')
    //     .text(function(d) {
    //         return d['name'];
    //     });

    var chart = d3.select('#graphic').append('div')
        .attr('class', 'chart');

    
    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
    
    // var xBottom = svg.append('g') // Add the X Axis
    //     .attr('class', 'x axis')
    //     .attr('transform', 'translate(0,' + height + ')')
    //     .call(xAxis);

    var yTop = svg.append('g') // Add the Y Axis
        .attr('class', 'y axis')
        .attr('transform', 'translate(-5,0)')
        .call(yAxis);

    var yGrid = svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );
    
    var hash = svg.append('defs')
      .append('pattern')
        .attr('id', 'diagonalHatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
      .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', colors['red3'])
        .attr('stroke-width', 1);   

    var year = svg.selectAll('.year')
        .data(graphic_data)
        .enter().append('g')
            .attr('class', function(d) {
                return d['Group'] + "-bars"
            })
            .attr('transform', function(d) { 
                return 'translate(' + x(d['Group']) + ',0)';
            });

    year.selectAll('rect')
        .data(function(d) { 
            return d['value'];
        })
        .enter().append('rect')
            .attr('width', x.rangeBand())
            .attr('x', function(d) { 
                return x(d['x0']); 
            })
            .attr('y', function(d) { 
                if (d['val'] < 0) { 
                    return y(0);
                } else {
                    return y(d['y1']);
                }
            })
            .attr('height', function(d) {
                if (d['val'] > 0) { 
                    return y(d['y0']) - y(d['y1']);
                } else {
                    return y(d['y1']) - y(d['y0']);
                }
            })
            .style('fill', function(d) { 
                return color(d['name']);
            })
            .attr('class', function(d) { 
                console.log(d)
                return classify(d['name']);
            });

    year.selectAll('text')
        .data(function(d) { 
            return d['value'];
        })
        .enter().append('text')
            // .attr('width', x.rangeBand())
            .attr('x', function(d) { 
                return x(d['x0']); 
            })
            .attr('y', function(d) { 
                    return y(d['y1']);
            })
            .attr('dy', function(d) {
                if (d['val'] < 0) {
                    return 15;
                } else {
                    return -10;
                }
            })            
            .attr('class', 'value-amt')
            .text(function(d) {
                if (is_mobile) {
                    return '$' + fmtComma(Math.round(d['val']));
                } else {
                    return '$' + fmtComma(Math.round(d['val'])) + " more";
                }

            });
    
        var groupLabels = svg.selectAll('text-labels')
            .data(graphic_data)
            .enter().append('text')
                .attr('class', function(d) {
                    return "text-labels " + d['Group'] + "-label"
                })
                .attr('y', y(26000))
                .attr('dy', 25)

                .attr('x', function(d) { 
                    return x(d['Group']);
                });


        var groupLabels3 = svg.append('text')
                .attr('class', "text-labels3 ")
                .attr('y', y(26000))
                .attr('dy',25)
                .attr('text-anchor', 'end')
                .attr('x', -15)
                .text('For households');       

        svg.append('text')
                .attr('class', "text-labels3 ")
                .attr('y', y(26000))
                .attr('dy',37)
                .attr('text-anchor', 'end')
                .attr('x', -15)
                .text('earning an');        

        svg.append('text')
                .attr('class', "text-labels3 ")
                .attr('y', y(26000))
                .attr('dy',49)
                .attr('text-anchor', 'end')
                .attr('x', -15)
                .text('average of');

        var groupLabels4 = svg.selectAll('text-labels4')
            .data(graphic_data)
            .enter().append('text')
                .attr('class', function(d) {
                    return "text-labels " + d['Group'] + "-label4"
                })
                .attr('y', y(26000))
                .attr('dy', 38)
                .attr('x', function(d) { 
                    return x(d['Group']);
                });


            d3.select('.Top-label').text('$1,410,000')
            d3.select('.Lowest-label').text('$12,000')
            d3.select('.Second-label').text('$30,000')
            d3.select('.Third-label').text('$52,000')
            d3.select('.Fourth-label').text('$84,000')            
            d3.select('.Fifth-label').text('$122,000')  

            d3.select('.Top-label4').text('(top 1%)')
            d3.select('.Lowest-label4').text('(0-20%)')
            d3.select('.Second-label4').text('(20-40%)')
            d3.select('.Third-label4').text('(40-60%)')
            d3.select('.Fourth-label4').text('(60-80%)')            
            d3.select('.Fifth-label4').text('(80-99%)')            

            d3.selectAll('.Top-bars .difference text').style('fill', colors['red3'])
            d3.selectAll('.Top-bars .difference').style('fill', 'url(#diagonalHatch)')
            d3.selectAll('.Lowest-bars .difference').style('fill', colors['teal6'])
            d3.selectAll('.Second-bars .difference').style('fill', colors['teal5'])
            d3.selectAll('.Third-bars .difference').style('fill', colors['teal4'])
            d3.selectAll('.Fourth-bars .difference').style('fill', colors['teal3'])
            d3.selectAll('.Fifth-bars .difference').style('fill', colors['teal2'])
            d3.selectAll('.Top-bars .value-amt').text("$824,844 less")
            d3.selectAll('.value-amt').moveToFront();


            if (!is_mobile) {
                $('.key').hide();
                $('.key-description').hide();

            } else {
                $('.key').show()
                $('.key-description').show()
                $('.text-labels').hide();
                $('.text-labels2').hide();
                $('.text-labels3').hide();
                d3.selectAll('.Top-bars .value-amt').text("-$824,844")
                // d3.selectAll('.value-amt').style('font', "Helvetica");
                d3.selectAll('.value-amt').style('font-size', "10px").style('font-family', "Helvetica");

            }

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

        // load the data
        color = d3.scale.ordinal()
            .range([ '#a7f3b4'])
            .domain(d3.keys(graphic_data[0]).filter(function(key) { return key !== 'Group'; }));

        graphic_data.forEach(function(d) {
            var y0 = 0;
            d['value'] = color.domain().map(function(name) { 
                return { name: name, y0: y0, y1: y0 += +d[name], val: +d[name] };
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
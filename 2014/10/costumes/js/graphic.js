var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_data;
var graphic_data_url = 'new_rank4.csv';
var graphic_data_url2 = 'costumes-long4.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 500;
var pymChild = null;
var costume_data;

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
   });
};

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#ce5219', 'orange4': '#fc501a', 'orange5': '#faa355', 'orange6': '#f47e30',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7',
    'black': '#1a1108', 'black2': '#26150d', 'black3': '#341c12', 'black4': '#7DBFE6', 'black5': '#A8D5EF', 'black6': '#D3EAF7'
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
    
    // clear out existing graphics
    $graphic.empty();

    draw_graph(container_width);

    if (pymChild) {
        pymChild.sendHeight();
    }
}

function draw_graph(width) {
    var color = d3.scale.ordinal()
        .range([ colors['orange6'],colors['orange5'],colors['orange4'],
             colors['orange3'],
             colors['orange2'],
             colors['orange1']
             ]);
    var graphic_aspect_height;
    var graphic_aspect_width;
    var height;
    if (is_mobile) {
    var margin = { top: 40, right: 30, bottom: 50, left: 55 };
    } else {
    var margin = { top: 55, right: 80, bottom: 50, left: 90 };
    }
    
    var num_x_ticks;
    var num_y_ticks;

    if (is_mobile) {
        graphic_aspect_width = 3;
        graphic_aspect_height = 8;
        num_x_ticks = 5;
        num_y_ticks = 13;
    } else {
        graphic_aspect_width = 3;
        graphic_aspect_height = 8;
        num_x_ticks = 5;
        num_y_ticks = 13;
    }

    width = width - margin['left'] - margin['right'];
    height = (is_mobile) ? 450 : 600;

    var x = d3.time.scale()
        .range([0, width])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .innerTickSize(8)
        .tickPadding(6)        
        .tickFormat(function(d,i) {
            if (is_mobile) {
                return '\u2019' + fmt_year_abbr(d);
            } else {
                return fmt_year_full(d);
            }
        });

    var xAxistop = d3.svg.axis()
        .scale(x)
        .orient('top')
        .ticks(num_x_ticks)
        .innerTickSize(8)
        .tickPadding(6)                
        .tickFormat(function(d,i) {
            if (is_mobile) {
                return '\u2019' + fmt_year_abbr(d);
            } else {
                return fmt_year_full(d);
            }
        });

    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks)
        .tickFormat(function(d) {
            switch (d) {
                case 1:
                    return d + 'st';
                    break;
                case 2:
                    return d + 'nd';
                    break;
                case 3:
                    return d + 'rd';
                    break;
                default:
                    return d + 'th';
                    break;
            }
        });

    var y_axis_grid = function() { return yAxis; };

    var line = d3.svg.line()
        .interpolate('monotone')
        .defined(function(d) { return d != null; })
        .x(function(d) { 
            return x(d['date']);
        })
        .y(function(d) { 
            return y(d['amt']);
        });
        
    color.domain(d3.keys(graphic_data[0]).filter(function(key) { 
        return key !== 'date';
    }));

    // parse data into columns
    // parse data into columns
    var formatted_data = {};
    for (var column in graphic_data[0]) {
        if (column == 'date') continue;
        formatted_data[column] = graphic_data.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
        }).filter(function(d) {
            return d['amt'].length > 0;
        });
    }
    var formatted_data2 = {};
    for (var column in graphic_data[0]) {
        if (column == 'date') continue;
        formatted_data[column] = graphic_data.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
        }).filter(function(d) {
            return d['amt'].length > 0;
        });
    }
    
    // set the data domain
    x.domain(d3.extent(graphic_data, function(d) { 
        return d['date'];
    }));

    y.domain([13,1])
 
    // draw the chart
    var svg = d3.select('#graphic')
        .append('svg')
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
    
    var heightAdj = height + 15;
    var heightTop = -15;
    if (is_mobile) {
    var yAxisadj = 23;    
    } else {
    var yAxisadj = 45;
    }

    if (is_mobile) {
    var yXAxisadj = 0;    
    } else {
    var yXAxisadj = -2;
    }
    
    // hatching
    svg.append('defs')
    .append('pattern')
        .attr('id', 'diagonalHatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 5)
        .attr('height', 5)
    .append('path')
        .attr('fill','transparent')
        .attr('d', 'M0 5L5 0ZM6 4L4 6ZM-1 1L1 -1Z')
        .attr('stroke', '#a0a0a0')
        .attr('stroke-width', 1);

    var xTop = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + heightTop + ')')
        .call(xAxistop);

    var xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + heightAdj + ')')
        .call(xAxis);

    var yTop = svg.append('g') // Add the Y Axis
        .attr('class', 'y axis')
        .attr('transform', 'translate(' + -1*yAxisadj + ',' + yXAxisadj + ')')        
        .call(yAxis);

    var xGrid = svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    var widthAdj = width + yAxisadj;

    var format = d3.time.format('%Y')
    var start = format.parse("2009");
    var start2010 = format.parse("2010");
    var start2011 = format.parse("2011");
    var start2012 = format.parse("2012");
    var start2013 = format.parse("2013");

    var boxWidth = (is_mobile) ? 55 : 80;
    var boxAdjust = (is_mobile) ? 27 : 40;
    var boxHeight = (is_mobile) ? 75 : 93;
    var boxHeight2 = (is_mobile) ? 108 : 140;

// #batman    
    if (!is_mobile)
    {
    var batman = svg.append('g')
                    .attr('class', 'char')
                    .attr('id','batman')
                    .attr('width', '50')
                    .attr('height', '50');
    d3.xml("assets/batman.svg",  "image/svg+xml", function(xml) {
        var importedNode = document.importNode(xml.documentElement, true);
        var batmanSVG = d3.select("#batman").node().appendChild(importedNode);
    })

    batman
        .style('opacity', '.8')    
        .attr('transform', 'translate(' + (x(start2012)+25) + ',' + (y(1)+5) + ')scale(.13)');

    var clown = svg.append('g')
                    .attr('class', 'char')
                    .attr('id','clown')
                    .attr('width', '50')
                    .attr('height', '50');    

    d3.xml("assets/clown.svg",  "image/svg+xml", function(xml) {
        var importedNode = document.importNode(xml.documentElement, true);
        var clownSVG = d3.select("#clown").node().appendChild(importedNode);
    })
    clown
        .style('opacity', '.8')    
        .attr('transform', 'translate(' + (x(start2012)+15) + ',' + y(10) + ')scale(.13)');



    var zombie = svg.append('g')
                    .attr('class', 'char')
                    .attr('id','zombie')
                    .attr('width', '50')
                    .attr('height', '50');

    d3.xml("assets/zombie.svg",  "image/svg+xml", function(xml) {
        var importedNode = document.importNode(xml.documentElement, true);
        var zombieSVG = d3.select("#zombie").node().appendChild(importedNode);
    })
    zombie
        .style('opacity', '.8')    
        .attr('transform', 'translate(' + (x(start2010)+25) + ',' + y(3) + ')scale(.13)');

    var fairy = svg.append('g')
                    .attr('class', 'char')
                    .attr('id','fairy')
                    .attr('width', '50')
                    .attr('height', '50');

    d3.xml("assets/fairy.svg",  "image/svg+xml", function(xml) {
        var importedNode = document.importNode(xml.documentElement, true);
        var fairySVG = d3.select("#fairy").node().appendChild(importedNode);
    })
    fairy
        .style('opacity', '.8')    
        .attr('transform', 'translate(' + (x(start)+20) + ',' + y(7) + ')scale(.13)');


    var witch = svg.append('g')
                    .attr('class', 'char')
                    .attr('id','witch')
                    .attr('width', '50')
                    .attr('height', '50');

    d3.xml("assets/witch.svg",  "image/svg+xml", function(xml) {
        var importedNode = document.importNode(xml.documentElement, true);
        var witchSVG = d3.select("#witch").node().appendChild(importedNode);
    })
    witch
        .style('opacity', '.8')
        .attr('transform', 'translate(' + (x(start)+10) + ',-50  )scale(.13)');

    }

////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////

    var lines = svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formatted_data))
        .enter()
        .append('path')
        .attr('class', function(d, i) {
            return 'line line-' + classify(d['key']);
        })
        .attr('stroke', function(d) {
            return color(d['key']);
        })
        .attr('d', function(d) {
            return line(d['value']);
        });


if (is_mobile) {
    var boxes = svg.append('g')
        .attr('class', 'boxgroup')
        .selectAll(".costumeboxes")
        .data(costume_data)
        .enter().append("rect")
        .attr('class', function(d, i) {
                return 'costumeboxes rank-' + d['rank'] + ' box-' + classify(d['value']);
        })
        .attr('width', 50)
        .attr('height', 20)
        .attr('x', function(d) {
                return x(d['date'])-25;
            })
        .attr('y', function(d) {
                return y(d['rank'])-10;
            })
        .attr('ry', '5')
        .attr('rx', '5')
        .attr('stroke-width', '2')        
        .attr('stroke', '#fff')        
        .attr('stroke-linejoin', 'round')        
        .on('mouseover', mouseover);   
    } else {
    var boxes = svg.append('g')
        .attr('class', 'boxgroup')
        .selectAll(".costumeboxes")
        .data(costume_data)
        .enter().append("rect")
        .attr('class', function(d, i) {
                return 'costumeboxes rank-' + d['rank'] + ' box-' + classify(d['value']);
        })
        .attr('width', 70)
        .attr('height', 30)
        .attr('x', function(d) {
                return x(d['date'])-35;
            })
        .attr('y', function(d) {
                return y(d['rank'])-16;
            })
        .attr('ry', '10')
        .attr('rx', '10')
        .attr('stroke-width', '2')        
        .attr('stroke', '#fff')        
        .attr('stroke-linejoin', 'round')        
        .on('mouseover', mouseover);  

}


    var labels = svg.append('g')
        .attr('class', 'labelgroup')
        .selectAll(".costumelabel")
        .data(costume_data)
        .enter().append("text")
        .attr("class", "costumelabel")
        .attr('cx', line.x())
        .attr('x', function(d) {
                return x(d['date']);
            })
        .attr('y', function(d) {
            if (is_mobile) {
                return y(d['rank'])+3;
            } else {
                return y(d['rank'])+3;
            }
            })  
        .text(function(d) {
                return d['value'];
        })
        .attr('text-anchor', 'middle')
        .attr('fill', function(d) {
                return '#eee';
        })
        .on('mouseover', mouseover);   

    function mouseover(d) {
        //selecting lines
        // d3.selectAll('.char').attr('transform', 'translate(' + svgX + ',-30 )scale(.001)');
        d3.selectAll('.selected').classed( "selected", false );
        d3.selectAll('.line-' + classify(d['value'])).classed('selected', true);
        
        // selecting boxes
        d3.selectAll('.selected-opaque').classed( "selected-opaque", false );        
        d3.selectAll('.box-' + classify(d['value'])).classed('selected-opaque', true);
        labels.moveToFront();
        boxes.moveToFront();

    }

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

        d3.csv(graphic_data_url, function(error, data) {
            graphic_data = data;

            graphic_data.forEach(function(d) {
                d['date'] = d3.time.format('%Y').parse(d['date']);
            });

			d3.csv(graphic_data_url2, function(error, data2) {
				costume_data = data2;

				costume_data.forEach(function(d) {
					d['rank'] = +d['rank'];
					d['date'] = d3.time.format('%Y').parse(d['date']);
				});

				var pymChild = new pym.Child({
					renderCallback: render
				});            
			})
        });
    } else {
        pymChild = new pym.Child({ });
    }
});

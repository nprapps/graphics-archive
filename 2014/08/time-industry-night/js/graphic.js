var $graphic = $('#graphic');


var fmt_year_abbr = d3.time.format('%I');
var fmt_year_full = d3.time.format('%H');
var graphic_data;
var graphic_data_url = 'time-occ.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 540;
var pymChild = null;
var area;
var test;
var lines;
var linesAll;
var formatted_data = {};
var svg;
var test;
var areas;

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
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
        pymChild.sendHeightToParent();
    }
}

function draw_graph(width) {
    var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3'], colors['orange3'], colors['teal3'] ]);
    var graphic_aspect_height;
    var graphic_aspect_width;
    var height;
    var margin = { top: 5, right: 30, bottom: 30, left: 20 };
    var num_x_ticks;
    var num_y_ticks;

    if (is_mobile) {
        graphic_aspect_width = 3.4;
        graphic_aspect_height = 4;
        num_x_ticks = 5;
        num_y_ticks = 5;
    } else {
        graphic_aspect_width = 16;
        graphic_aspect_height = 14;
        num_x_ticks = 10;
        num_y_ticks = 10;
    }



    width = width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

     x = d3.time.scale()
        .range([0, width])

     y = d3.scale.linear()
        .range([ height, 0 ]);

// console.log(graphic_data[24]['date']);
// console.log(graphic_data[24]['date']);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d,i) {
            // console.log(fmt_year_full(d))
            if (fmt_year_full(d)=="00") {
                return "midnight";
                } else {
                if (fmt_year_full(d)=="12") {
                    return "noon";
                    } else {
                        if (fmt_year_full(d)>="12") {
                            return  fmt_year_abbr(d) + " p.m.";
                        } else {
                            return fmt_year_abbr(d) + " a.m.";
                    }
                }
            }
        });

    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks)
        .tickFormat(function(d){ return d + "%";});



    var y_axis_grid = function() { return yAxis; };

    line = d3.svg.line()
        .interpolate('basis')
        .defined(function(d) { return d['amt'] != null; })
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

     areas = d3.svg.area()
        .interpolate('basis')
        .defined(line.defined())
        .x(function(d) { return x(d['date']); })
        .y0(function(d) { return y(0); })
        .y1(function(d) { return y(d['amt']); });

    color.domain(d3.keys(graphic_data[0]).filter(function(key) {
        return key !== 'date';
    }));


    // parse data into columns
    for (var column in graphic_data[0]) {
        if (column == 'date') continue;
        formatted_data[column] = graphic_data.map(function(d) {
            return { 'date': d['date'], 'amt': d[column], 'occupation': classify(column), 'occupation-full': column};
        }).filter(function(d) {
            return d['amt'].length > 0;
        });
    }

    x.domain(d3.extent(graphic_data, function(d) {
        return d['date'];
    }));

    y.domain([0,100])

    // draw the chart
    svg = d3.select('#graphic')
        .append('svg')
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');




// gradients
/////////////////////////

var gradient = svg.append("svg:defs")
  .append("svg:linearGradient")
    .attr("id", "gradient")
    .attr("x1", "100%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%")
    .attr("spreadMethod", "pad");

gradient.append("svg:stop")
    .attr("offset", "0%")
    .attr("stop-color", "#dddeaf")
    .attr("stop-opacity", 1);

gradient.append("svg:stop")
    .attr("offset", "100%")
    .attr("stop-color", "#ffff0a")
    .attr("stop-opacity", 1);


// hatching
  svg.append('defs')
  .append('pattern')
    .attr('id', 'diagonalHatch')
    .attr('patternUnits', 'userSpaceOnUse')
    // .attr('patternTransform', 'rotate(45 2 2)')
    .attr('width', 10)
    .attr('height', 10)
  .append('path')

    // #waves
    .attr('d', ' M 0,0 C 0 0, 5 5, 10 0 ')

    // #triangles
    // .attr('d', ' M 0,2 v 3 h 8 Z')
    .attr('fill','transparent')
    // .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
    .attr('stroke', function(d) {return colors['blue3'];})
    // .attr('stroke', function(d) {return colors['teal6'];})
    .attr('stroke-width', 1);


// <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
//   <line x1="0" y1="0" x2="0" y2="10" style="stroke:black; stroke-width:1" />
// </pattern>



    var workDay = svg.append('rect')
        .attr('class','workday')
        .attr("x",x(graphic_data[9]['date']))
        .attr("width",x(graphic_data[17]['date'])-x(graphic_data[9]['date']))
        .attr('height',height)
        .attr('y', 0);

        // .attr('y2', y(95))
        // .style('stroke-width',".2")
        // .style('stroke-dasharray', '8, 5');

    var xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    var yTop = svg.append('g') // Add the Y Axis
        .attr('class', 'y axis')
        .attr('transform', 'translate(' + -width/100 + ',0)')
        .call(yAxis);

    var yGrid = svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

if (is_mobile) {;} else {
    var voronoi = d3.geom.voronoi()
        .x(function(d) { return x(d['date']); })
        .y(function(d) { return y(d['amt']); })
        .clipExtent([[-margin.left, -margin.top], [width + margin.right, height + margin.bottom]]);

    var amLine = svg.append('line')
        .attr('class','annote-day')
        .attr("x1",x(graphic_data[9]['date']))
        .attr("x2",x(graphic_data[9]['date']))
        .attr('y1', y(0))
        .attr('y2', y(95))
        .style('stroke',"black")
        .style('stroke-width',".2")
        .style('stroke-dasharray', '8, 5');

    var pmLine = svg.append('line')
        .attr('class','annote-day')
        .attr("x1",x(graphic_data[17]['date']))
        .attr("x2",x(graphic_data[17]['date']))
        .attr('y1', y(0))
        .attr('y2', y(95))
        .style('stroke',"black")
        .style('stroke-width',".2")
        .style('stroke-dasharray', '8, 5');
};
    // var dayAnnote = svg.append('text')
    //     .attr('class','annote-day-text2')
    //     .attr("x",x(graphic_data[1]['date'])-18)
    //     // .attr("x2",x(graphic_data[16]['date']))
    //     // .attr('y1', y(0))
    //     .attr('y', y(95))
    //     .text('Click To Compare Different Workdays');

    var dayAnnote = svg.append('text')
        .attr('class','annote-day-text')
        .attr("x",x(graphic_data[13]['date']))
        // .attr("x2",x(graphic_data[16]['date']))
        // .attr('y1', y(0))
        .attr('y',y(95))
        .text('Standard Workday');

    var dayAnnote = svg.append('text')
        .attr('class','annote-day-text')
        .attr("x",x(graphic_data[13]['date']))
        // .attr("x2",x(graphic_data[16]['date']))
        // .attr('y1', y(0))
        .attr('y', function(d) {
            if(is_mobile) {
                return y(89);
            } else {
                return y(90);
            }
        })
        .text('9 a.m. - 5 p.m.');

      svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("refX", 2) /*must be smarter way to calculate shift*/
        .attr("refY", 2)
        .attr("markerWidth", 6)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
            .attr("d", "M 0,0 V 4 L6,2 Z");

if (is_mobile) {;} else {

      svg.append("line")
        .attr('class', 'arrow')
        .attr("x1",x(graphic_data[10]['date'])+5)
        .attr("y1", y(96))
        .attr("x2",x(graphic_data[9]['date'])+10)
        .attr("y2", y(96))
        .attr("marker-end", "url(#arrowhead)");

      svg.append("line")
        .attr('class', 'arrow')
        .attr("x1",x(graphic_data[16]['date'])-5)
        .attr("y1", y(96))
        .attr("x2",x(graphic_data[17]['date'])-10)
        .attr("y2", y(96))
        .attr("marker-end", "url(#arrowhead)");

}


 lines = svg.append('g')
    .attr('id', 'lines-thin')
    .selectAll('path')
    .data(d3.entries(formatted_data))
    .enter()
    .append('path')
        .attr('class', function(d, i) {
            return 'main-line line-' + classify(d['key']);
        })
        .attr('d', function(d) {
            d.line = this;
            return line(d['value']);
        });



 linesAll = svg.append('g')
    .attr('class', 'lines')
    .selectAll('path')
    .data(d3.entries(formatted_data).filter(function(d){return d['key'] =="All Jobs"}))
    .enter()
    .append('path')
        .attr('class', function(d, i) {
            return 'line line-' + i + ' ' + classify(d['key']);
        })
        .attr('d', function(d) {
            return line(d['value']);
        });



 area2  = svg.append('g')
        .attr('class', 'area2')
        .selectAll('path')
        .data(d3.entries(formatted_data).filter(function(d){return d['key'] =="All Jobs"}))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                    return 'area2 area-' + i + ' ' + classify(d['key']);
                })
                .attr('d', function(d) {
                    return areas(d['value']);
                })


 linesAll2 = svg.append('g')
    .attr('class', 'lines2')
    .selectAll('path')
    .data(d3.entries(formatted_data).filter(function(d){return d['key'] =="All Jobs"}))
    .enter()
    .append('path')
        .attr('class', function(d, i) {
            return 'line2 line-' + i + ' ' + classify(d['key']);
        })
        .attr('d', function(d) {
            return line(d['value']);
        });






 area  = svg.append('g')
        .attr('class', 'area')
        .selectAll('path')
        .data(d3.entries(formatted_data).filter(function(d){return d['key'] =="All Jobs"}))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                    return 'area area-' + i + ' ' + classify(d['key']);
                })
                .attr('d', function(d) {
                    return areas(d['value']);
                })
        .style("fill", "url(#diagonalHatch)");


 var focus = svg.append("g")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus");

      focus.append("text")
          .attr("y", -10);



var formatted_data2 = d3.entries(formatted_data).filter(function(d){return d['key'] !="Clear"});

if (is_mobile) {;} else {

var voronoiGroup = svg.append("g")
  .attr("class", "voronoi")
  .selectAll("path")
      .data(voronoi(d3.nest()
          .key(function(d) { return x(d['date']) + "," + y(d['amt']); })
          .rollup(function(v) { return v[0]; })
          .entries(d3.merge(formatted_data2.map(function(d) { return d['value']; })))
          .map(function(d) { return d['values']; })))
    .enter().append("path")
      .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
      .datum(function(d) { return d.point; })
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .on("click", selected);

};

    function mouseover(d) {
        d3.select(".line-" + d['occupation']).classed("occupation-hover",true).moveToFront();
        focus.attr("transform", "translate(" + x(d['date']) + "," + y(d['amt']) + ")");
        focus.select("text").text(d['occupation-full']);

    }

    function mouseout(d) {
        d3.select(".line-" + d['occupation']).classed("occupation-hover", false);
        focus.attr("transform", "translate(-100,-100)");
    }


    function selected(d) {

        var clickedoccupation = d['occupation-full'];
        var smalldata = d3.entries(formatted_data).filter(function(d){return d['key'] ==clickedoccupation})

        areaTransition(".small-area",smalldata,area)
        lineTransition(".small-line",smalldata,linesAll)

        $('#occupation2').val(clickedoccupation);

    }

}


////////////////////////////////
// first dropdown
////////////////////////////////

$( "#occupation2" ).change(function() {

    var clickedoccupation = document.getElementById('occupation2').value;
    var smalldata = d3.entries(formatted_data).filter(function(d){return d['key'] ==clickedoccupation})


    areaTransition(".small-area",smalldata,area)
    lineTransition(".small-line",smalldata,linesAll)
});



////////////////////////////////
// second dropdown
////////////////////////////////

$( "#occupation" ).change(function() {
var clickedoccupation = document.getElementById('occupation').value;
var smalldata = d3.entries(formatted_data).filter(function(d){return d['key'] ==clickedoccupation})
    areaTransition(".small-area2",smalldata,area2)
    lineTransition(".small-line2",smalldata,linesAll2)
});



/*
 * Helper functions
 */
function classify(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


function areaTransition(areaClass,data,areaObject) {
var newarea;

var smallarea = svg.selectAll(areaClass)
    .data(data)
    .enter()
    .append('path')
        .attr('class', function(d, i) {
            return 'small-' + i + ' ' + classify(d['key']);
        })
        .transition().duration(300)
        .attr('d', function(d) {
            newarea = areas(d['value']);
            return null;
        });

    areaObject.transition().duration(550).ease('cubic-in-out')
    .attr('d', newarea);
}

function lineTransition(lineClass,data,lineObject) {
var newpath;

var smallLine = svg.selectAll(lineClass)
        .data(data)
        .enter()
        .append('path')
        .attr('class', function(d, i) {
            return 'small-' + i + ' ' + classify(d['key']);
        })
        .attr("d", function(d) {
             newpath = line(d['value']);
             // line(d['value']);
            return  null;
        });

    lineObject.transition().duration(550).ease('cubic-in-out')
    .attr('d', newpath);
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
                d['date'] = d3.time.format('%j-%H').parse(d['date']);
            });

            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

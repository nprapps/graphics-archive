var $graphic = $('#graphic');


var fmt_year_abbr = d3.time.format('%I');
var fmt_year_full = d3.time.format('%H');
var graphic_data;
var graphic_data_url = 'hist-job-selects-shares-loss-totally.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 540;
var pymChild = null,
    area,
    test,
    lines,
    linesAll,
    linesAll2,
    svg,
    xAxis,
    xgrid,
    xAxisGrid,
    yAxis,
    yAxisGrid,
    ygrid,
    yaxis,
    voronoiGroup,
    focus,
    test,
    formatted_data,
    formatted_data2,
    clickedoccupation2,
    areas;
var formatPercent = d3.format(".1%");
var formatted_data = {};
var formatYear = d3.time.format("%Y")


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
    var margin = { top: 5, right: 30, bottom: 30, left: 50 };
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

    // console.log(graphic_data)

    xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks);

    xAxisGrid = function() { return xAxis; };

    yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks)
        .tickFormat(formatPercent);



    yAxisGrid = function() { return yAxis; };

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
    y.domain([0,.045])

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
    .attr('width', 4)
    .attr('height', 4)
  .append('path')
    .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
    .attr('stroke', function(d) {return colors['red3'];})
    .attr('stroke-width', 1);

    xBottom = svg.append('g') // Add the X Axis
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,' + height + ')')
    .call(xAxis);

    yaxis = svg.append('g') // Add the Y Axis
    .attr('class', 'y axis yaxis')
    .attr('transform', 'translate(-5,0)')
    .call(yAxis);

    ygrid = svg.append('g')
    .attr('class', 'y grid')
    .call(yAxisGrid()
        .tickSize(-width, 0, 0)
        .tickFormat('')
    );

if (is_mobile) {;} else {
    var voronoi = d3.geom.voronoi()
        .x(function(d) { return x(d['date']); })
        .y(function(d) { return y(d['amt']); })
        .clipExtent([[-margin.left, -margin.top], [width + margin.right, height + margin.bottom]]);
};


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
    .data(d3.entries(formatted_data).filter(function(d){return d['key'] =="carpenters"}))
    .enter()
    .append('path')
        .attr('class', function(d, i) {
            return 'line line-' + i + ' ' + classify(d['key']);
        })
        .attr('d', function(d) {
            return line(d['value']);
        });


 area  = svg.append('g')
        .attr('class', 'area')
        .selectAll('path')
        .data(d3.entries(formatted_data).filter(function(d){return d['key'] =="carpenters"}))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                    return 'area area-' + i + ' ' + classify(d['key']);
                })
                .attr('d', function(d) {
                    return areas(d['value']);
                })
        .style("fill", "url(#diagonalHatch)");

    // focus
    focus = svg.append("g")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus");

    focus
    .append('rect')
    .attr('class', 'focus-box')
      .attr('width', 100)
      .attr('height', 25)
      // .style('stroke', 'black')
      // .style('fill', 'none')
      .attr("dx", -20)
      .attr("y", -18)
      .attr("rx", 3)
      .attr("ry", 3);
    focus
    .append("text")
    .attr('class', 'focus-text')

    focusfirstvalDot = svg.append("circle")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-first-dot")
      .attr('r', 3);

    focuslastvalDot = svg.append("circle")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-last-dot")
      .attr('r', 3);

    focusDot = svg.append("circle")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-dot")
      .attr('r', 6);

    focusfirstVal = svg.append("g")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-first");

    focusfirstVal.append("text")
      .attr("y", 0);

    focusfirstDate = svg.append("g")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-first");

    focusfirstDate.append("text")
      .attr("y", 0);

    focuslastVal = svg.append("g")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-last");

    focuslastVal.append("text")
      .attr("y", 0);

    focuslastDate = svg.append("g")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-last");

    focuslastDate.append("text")
      .attr("y", 0);

    focusData = svg.append("g")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-data");

    focusData.append("text")
      .attr("y", -10);

    focusDate = svg.append("g")
      .attr("transform", "translate(-100,-100)")
      .attr("class", "focus-date");

    focusDate.append("text")
      .attr("y", -10);



    formatted_data2 = d3.entries(formatted_data).filter(function(d){return d['key'] !="Clear"});

if (!is_mobile) {

    function mouseover(d) {
        // console.log('mouseover', d.occupation.toLowerCase())
        if (clickedoccupation2 == d['occupation']) {
            // console.log(d['occupation'])

            focusDate.attr("transform", "translate(" + x(d['date']) + "," + y(d['amt']) + ")");
            focusDate.select("text").text(formatYear(d['date'])).attr("dy", -10);

            focusData.attr("transform", "translate(" + x(d['date']) + "," + y(d['amt']) + ")");
            focusData.select("text").text(formatPercent(d['amt'])).attr("dy", 10);
        } else {
            d3.select(".line-" + d['occupation']).classed("occupation-hover",true).moveToFront();

            focus.select("text").text(d['occupation-full']);

            var boxWidth;
            var text = d3.selectAll('.focus-text')

            text
            .each(function() {
                box = this.getBBox();
            });

            var boxWidth = box['width']+20
            d3.selectAll('.focus-box')
              .attr('width', boxWidth)
              .attr("x",  -boxWidth/2)
            var xMove =  x(d['date'])
            var yMove =  y(d['amt']) - 10
            focus.attr("transform", "translate(" + xMove +  "," + yMove + ")")

            focusDate.attr("transform", "translate(-100,-100)");
            focusData.attr("transform", "translate(-100,-100)");


        }
    }

    function mouseout(d) {
        d3.select(".line-" + d['occupation']).classed("occupation-hover", false);
        // console.log(d['amt'])
        // console.log(d['occupation'])
        focus.attr("transform", "translate(-100,-100)");
        focusDate.attr("transform", "translate(-100,-100)");
        focusData.attr("transform", "translate(-100,-100)");
    }


    function selected(d) {

        clickedoccupation2 = d['occupation'];
        var clickedoccupation = d['occupation-full'];
        focus.attr("transform", "translate(-100,-100)");

        var smalldata = d3.entries(formatted_data).filter(function(d){return d['key'] ==clickedoccupation})

        var firstValue = smalldata[0]['value'][0]
        var lastvalueTemp = smalldata[0]['value']
        var lastValue = smalldata[0]['value'][lastvalueTemp.length -1]

        areaTransition(".small-area",smalldata,area)
        lineTransition(".small-line",smalldata,linesAll)
        dotTransition(smalldata)

        $('#occupation2').val(clickedoccupation);

    }

    function drawVoronoi(data) {
        d3.selectAll('.voronoi').remove();
        voronoiGroup = svg.append("g")
        .attr("class", "voronoi")
        .selectAll("path")
        .data(voronoi(d3.nest()
            .key(function(d) { return x(d['date']) + "," + y(d['amt']); })
            .rollup(function(v) { return v[0]; })
            .entries(d3.merge(data.map(function(d) { return d['value']; })))
                  .map(function(d) { return d['values']; })))
            .enter().append("path")
              .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
              .datum(function(d) { return d.point; })
              .on("mouseover", mouseover)
              .on("mouseout", mouseout)
              .on("click", selected);
        };

    drawVoronoi(formatted_data2);
}


////////////////////////////////
// first dropdown
////////////////////////////////

$( "#occupation2" ).change(function() {
    // console.log(clickedoccupation)
    var clickedoccupation = document.getElementById('occupation2').value;
    var smalldata = d3.entries(formatted_data).filter(function(d){return d['key'] ==clickedoccupation})


    areaTransition(".small-area",smalldata,area)
    lineTransition(".small-line",smalldata,linesAll)
    if (!is_mobile) {
        dotTransition(smalldata)
    }
});


/*
 * Helper functions
 */
function classify(Text)
{
    return Text
        .toLowerCase()
        .replace(/[^\w ]+/g,'')
        .replace(/ +/g,'-')
        ;
}

function dotTransition(data) {
        var firstValue = data[0]['value'][0]
        var lastvalueTemp = data[0]['value']
        var lastValue = data[0]['value'][lastvalueTemp.length -1]

        areaTransition(".small-area",data,area)
        lineTransition(".small-line",data,linesAll)


        focusfirstvalDot.transition().duration(300).ease('linear')
            .attr("transform", "translate(" + x(firstValue['date']) + "," + y(firstValue['amt']) + ")");
        focusfirstDate.attr("transform", "translate(" + x(firstValue['date']) + "," + y(firstValue['amt']) + ")");
        focusfirstDate.select("text").text(formatYear(firstValue['date'])).attr("dy", -10);
        focusfirstVal.attr("transform", "translate(" + x(firstValue['date']) + "," + y(firstValue['amt']) + ")")
        focusfirstVal.select("text").text(formatPercent(firstValue['amt'])).attr("dy", 20);

        focuslastvalDot.transition().duration(300).ease('linear')
            .attr("transform", "translate(" + x(lastValue['date']) + "," + y(lastValue['amt']) + ")");
        focuslastDate.attr("transform", "translate(" + x(lastValue['date']) + "," + y(lastValue['amt']) + ")");
        focuslastDate.select("text").text(formatYear(lastValue['date'])).attr("dy", -10);
        focuslastVal.attr("transform", "translate(" + x(lastValue['date']) + "," + y(lastValue['amt']) + ")")
        focuslastVal.select("text").text(formatPercent(lastValue['amt'])).attr("dy", 20);
}

function areaTransition(areaClass,data,areaObject) {
    var newDomain = [ 0, d3.max(data, function(c) {
            // console.log(c)
            return d3.max(c['value'], function(v) {
                var n = v['amt'];
                var w = n*.8
                var q = +n+.01
                return Math.min(q, .15) ; // round to next 5
            });
        })
    ];

    rescale(newDomain)
    if (!is_mobile) {
        drawVoronoi(formatted_data2);
    }
    drawLines(formatted_data)
    drawArea(formatted_data)

var newarea;
var smallarea = svg.selectAll(areaClass)
    .data(data)
    .enter()
    .append('path')
        .attr('class', function(d, i) {
            return 'remove-small ' + i + ' ' + classify(d['key']);
        })
        .transition().duration(300)
        .attr('d', function(d) {
            newarea = areas(d['value']);
            return null;
        });

d3.selectAll('.remove-small').remove()


    areaObject.transition().duration(550).ease('cubic-in-out')
    .attr('d', newarea);
}

function drawLines(data) {

 lines
    .data(d3.entries(formatted_data))
    .transition().duration(600)
    .attr('d', function(d) {
        d.line = this;
        return line(d['value']);
    });

}

function drawArea(data) {

    area
        .data(d3.entries(formatted_data))
        .transition().duration(600)
        .attr('d', function(d) {
            return areas(d['value']);
        });

}

function rescale(newdomain) {
    y.domain(newdomain)  // change scale to 0, to between 10 and 100
    ygrid
        svg.selectAll('.y.grid')
            .transition().duration(600).ease("sin-in-out")
            .call(yAxisGrid()
                .tickSize(-width, 0, 0)
                .tickFormat('')
            );

    yAxis.tickFormat(formatPercent);

    yaxis
        svg.select('.yaxis')
            .transition().duration(600).ease("sin-in-out")
            .call(yAxis);

}

    function lineTransition(lineClass,data,lineObject) {
    var newpath;

    var smallLine = svg.selectAll(lineClass)
            .data(data)
            .enter()
            .append('path')
            .attr('class', function(d, i) {
                return 'remove-small ' + i + ' ' + classify(d['key']);
            })
            .attr("d", function(d) {
                 newpath = line(d['value']);
                return  null;
            });

    d3.selectAll('.remove-small').remove()

        lineObject.transition().duration(550).ease('cubic-in-out')
        .attr('d', newpath);
    }

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

            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

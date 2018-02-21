// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'firstjob_major_d3_3.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_GUTTER = 10;
var LABEL_WIDTH = 33;
var MOBILE_THRESHOLD = 600;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': 'rgba(225, 40, 64, .95)', 'red4': 'rgba(225, 40, 64, .9)', 'red5': 'rgba(225, 40, 64, .8)', 'red6': 'rgba(225, 40, 64, .7)',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77231B', 'yellow2': '#B39429', 'yellow3': '#EFDC56', 'yellow4': '#DFD060', 'yellow5': '#F8EC77', 'yellow6': '#F8EC77',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': 'rgba(#2736FF63, 143, 232, 1)', 'blue4': 'rgba(23, 143, 232, 1)', 'blue5': 'rgba(23, 143, 232, .9)', 'blue6': 'rgba(23, 143, 232, .8)',
    'green1': "#29A97E", 'gray1':'#CCC'
};


var modelDates = {1850 : 0,
                   1860 : 1,
                   1870 : 2,
                   1880 : 3,
                   1900 : 4,
                   1910 : 5,
                   1920 : 6,
                   1930 : 7,
                   1940 : 8,
                   1950 : 9,
                   1960 : 10,
                   1970 : 11,
                   1980 : 12,
                   1990 : 13,
                   2000 : 14,
                   2005 : 15,
                   2010 : 16,
                   2013 : 17 }

var dates =  [      1850,
                    1860,
                    1870,
                    1880,
                    1900,
                    1910,
                    1920,
                    1930,
                    1940,
                    1950,
                    1960,
                    1970,
                    1980,
                    1990,
                    2000,
                    2010,
                    2013 ]

function getNearestNumber(a, n){
    if((l = a.length) < 2)
        return l - 1;
    for(var l, p = Math.abs(a[--l] - n); l--;)
        if(p < (p = Math.abs(a[l] - n)))
            break;
    return a[l + 1];
}

var COLOR1 = colors['red3'] //red
var COLOR4 = colors['red5'] //orange
var COLOR5 = colors['red6'] //pink
var COLOR7 = colors['blue5'] //pea green
var COLOR8 = colors['blue6'] // pea yellow


var COLOR10 = colors['yellow5']
var bisectDate = d3.bisector(function(d) { return d.time; }).left;

var COLOR3 = colors['blue4'] //blue

var COLOR6 = '#DD488F' // skyblue
var COLOR2 = colors['green1'] //red
var COLOR11 = colors['gray1']
var COLOR9 = colors['yellow4'] // lemon yellow

var jobs = {
    "service": COLOR9,
    "white-collar": COLOR6,
    "blue-collar": COLOR3,
    "farming": COLOR2,
    "other": COLOR11
}

var domain1,
    domain2,
    area,
    line,
    svg,
    x,
    y,
    y1,
    y0,
    stack,
    layers,
    state,
    names,
    ticksY,
    ticksX,
    xaxis,
    xAxis,
    xgrid,
    xAxisGrid,
    yAxis,
    yAxisGrid,
    ygrid,
    yaxis,
    height,
    percentFormat,
    areaMultiples,
    inverted,
    values,
    marginBox,
    margin,
    width,
    tooltip,
    mouseX,
    bisectDate,
    majorLabels,
    place;
var graphicData = null;
var graphicData2 = null;
var isMobile = false;
var graph_status;
var yAdj = 5;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var formatPercent = d3.format(".0%");
var fmtYearFull = d3.time.format('%Y');
var fmtYearFull2 = d3.time.format('%Y').parse;

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
   });
};


var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;
            graphicData.forEach(function(d) {
            });

            pymChild = new pym.Child({
                renderCallback: render
            });
        });

    } else {
        pymChild = new pym.Child({ });
    }
}


function render(container_width) {

    var graphic_width;

    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
    	isMobile = false;
    }

    // clear out existing graphics
    $graphic.empty();

    // console.log(graphicData)
    draw_graph(container_width);

    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * DRAW THE GRAPH
 */
var draw_graph = function(graphicWidth) {
    graph_status = 'expand';
    var aspectHeight,
        aspectWidth;
    var graph = d3.select('#graphic');
    // params that depend on the container width
    if (isMobile) {
        margin = { top: 30, right: 30, bottom: 30, left: 70 };
        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 5;
        ticksY = 3;
    } else {
        margin = { top: 30, right: 10, bottom: 30, left: 80 };
        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 15;
        ticksY = 10;
    }

    // define chart dimensions
        width = graphicWidth - margin['left'] - margin['right'];
        height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

        x = d3.time.scale()
        .range([ 0, width ])

        y  = d3.scale.linear()
        .rangeRound([ height, 0 ])
        .nice(true);

    percentFormat = d3.format(".0%");

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d,i) {
            // if (isMobile) {
                // return '\u2019' + fmtYearAbbrev(d);
            // } else {
                return fmtYearFull(d);
            // }
        });

    xAxisGrid = function() {
        return xAxis;
    }

   yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .tickFormat(function(d) {
            if (graph_status != 'default1') {
            return formatPercent(d);
            } else {
            return d/1000000 + ' million'
            }
        });

    yAxisGrid = function() {
        return yAxis;
    }

    tooltip = d3.select('#graphic')
        .append('div')
        .attr('id', 'tooltip');

    stack = d3.layout.stack()
        .offset(graph_status)
        .order('reverse')
        .values(function(d) { return d['values']; });

    line = d3.svg.line()
        .interpolate("basis")
        .defined(function(d) { return d['y'] != ''; })
        .x(function(d) { return x(d['year']); })
        .y(function(d) { return y(d['y0']); });

    area = d3.svg.area()
        .defined(line.defined())
        .x(function(d) { return x(d['year']); })
        .y0(function(d) { return y(d['y0']); })
        .y1(function(d) { return y(d['y0'] + d['y']); });

    names = d3.keys(graphicData[0]).filter(function(key) { return key !== "year"; });

    dataTransform();
    d3.selectAll('.levels-button').classed('clicked', false)
    d3.selectAll('.shares-button').classed('clicked', true)


    x.domain([d3.time.format('%Y').parse('1850'), d3.time.format('%Y').parse('2013')]);

    // draw the chart
    svg = graph.append('svg')
		.attr('width', width + margin['left'] + margin['right'])
		.attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')')
        .attr('class', 'svg-container');

// hatching
  svg.append('defs')
  .append('pattern')
    .attr('id', 'diagonalHatch')
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', 4)
    .attr('height', 4)
  .append('path')

    // .attr('d', ' M0,1 l2,-2 ')
    .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
    .attr('stroke', function(d) {return COLOR3;})
    // .attr('stroke', function(d) {return colors['teal6'];})
    .attr('stroke-width', 1);

    // x-axis (bottom)
    xaxis = svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // y-axis (left)
    yaxis = svg.append('g')
        .attr('transform', 'translate(-1,0)')
        .attr('class', 'y axis')
        .call(yAxis);

    // y-axis gridlines
    ygrid = svg.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

    // x-axis gridlines
    xgrid = svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    layers = svg.append('g')
        .attr("class", "layer-group")
        .selectAll("path")
        .data(formattedData)
      .enter().append("path")
        .attr('class', function(d) {
            return  'layers ' + classify(d.name)})
        .attr("d", function(d) { return area(d.values); })
        .style("fill", function(d) { return majorColor(d.name); })
        .on('mousemove', function(d){
            selected(d);
        })

   yearLines = svg.append('line')
        .attr("class", "year");

    d3.selectAll(".levels-button").on("click", function() {
      changeLevel();
      d3.event.stopPropagation();
    });

    d3.selectAll(".shares-button").on("click", function() {
      changeShare();
      d3.event.stopPropagation();
    });

    groupLabels = svg.append('g')
    .attr('class', 'group-names')


    groupLabels
    .append('text')
    .attr('class', 'group-label group-other')
    .attr('x', width/2)
    .attr('y', y(.05) )
    .text('Other');


    groupLabels
    .append('text')
    .attr('class', 'group-label group-farmers')
    .attr('x', width/6)
    .attr('y', y(.85) )
    .text('Farming');


    groupLabels
    .append('text')
    .attr('class', 'group-label group-service')
    .attr('x', 3*width/4)
    .attr('y', y(.61) )
    .text('Services')


    groupLabels
    .append('text')
    .attr('class', 'group-label group-blue-collar')
    .attr('x', width/2)
    .attr('y', y(.65) )
    .text('Blue Collar')

    groupLabels
    .append('text')
    .attr('class', 'group-label group-white-collar')
    .attr('x', width/1.5)
    .attr('y', y(.2) )
    .text('White Collar')

    if (isMobile) {
        d3.selectAll('.group-label')
        .attr('dx', '-30px')
           d3.select('.group-other')
            .attr('x', width/2)
            .attr('y', y(.05) );

            d3.select('.group-farmers')
            .attr('x', width/5)
            .attr('y', y(.75) );

            d3.select('.group-service')
            .attr('x', 3*width/4)
            .attr('y', y(.51) )
            .text('Services');

            d3.select('.group-blue-collar')
            .attr('x', width/2)
            .attr('y', y(.65) );

            d3.select('.group-white-collar')
            .attr('x', width/1.5)
            .attr('y', y(.2) );
    }

        if (isMobile) {
            $('.shares-button').html('Percent')
        } else {
            $('.shares-button').html('Percent Of Jobs')
        }
        if (isMobile) {
            $('.levels-button').html('Number')
        } else {
            $('.levels-button').html('Number of jobs')
        }

}

/*
 * HELPER FUNCTIONS
 */

 function updateLabels() {
    d3.selectAll('.text-labels')
        .attr('startOffset', '95%')
        .attr('class', function(d) {
            // console.log(classify(d.name))
            return  'label-' + classify(d.name)})
        .attr('xlink:href', function(d) { return '#path-'+ classify(d.name); })
        .attr('text-anchor', 'end')
        .text(function(d) {
            // console.log(d)
            return (d['name'])});

 }

 function selected(data) {
    mouseX = d3.mouse(document.querySelector(".svg-container"))[0]
    mouseY = d3.mouse(document.querySelector(".svg-container"))[1]
    invertedX = x.invert(mouseX);
    invertedY = y.invert(d3.mouse(document.querySelector(".svg-container"))[1]);
    hoverBox(data, mouseX, mouseY, invertedX, invertedY)

    var selectedMajor = classify(data['name']);
    d3.selectAll('.layers').classed('selected', false);
    d3.select('.' + selectedMajor).classed('selected', true).moveToFront();
 }

function hoverBox(d, mouseX, mouseY, positionX, positionY) {
    // marginBox = _.clone(margin)

        var dotX = mouseX;
        var dotY = mouseY;

        var tt_top;
        var tt_left;
        var tt_height = 115;
        var tt_width = 100;
        var tt_text = '';


        var nearestYear = getNearestNumber(dates, fmtYearFull(d3.time.year(positionX)))
        var nearestObs = modelDates[nearestYear];
        var nearestDate = d3.time.format('%Y').parse(nearestYear.toString());
        var workerValue = d['values'][nearestObs]['y'];
        var workervalueStart = d['values'][nearestObs]['y0'];
        var workerValueFormatted = (graph_status != 'expand') ? fmtComma(d3.round(workerValue,0)) : formatPercent(d3.round(workerValue,3));

        d3.selectAll('.year').classed('selected-year', false)
        d3.select('.year')
            .attr('x1', x(nearestDate))
            .attr('x2', x(nearestDate))
            .attr('y1', y(workervalueStart))
            .attr('y2', y(workervalueStart+workerValue))
            .classed('selected-year', true).moveToFront();


        if ( d.name.toLowerCase() == 'other' ) {
                    if (graph_status != 'expand') {
                        tt_text += 'In ' + nearestYear + '<br />';
                        tt_text += '<strong>' + workerValueFormatted + '</strong> people <br/> worked in ' + d.name.toLowerCase() + ' <br/>sectors of the economy<br/>';
                    } else {
                        tt_text += 'In ' + nearestYear + '<br />';
                        tt_text += '<strong>' + workerValueFormatted + '</strong><br/> of workers were in ' + d.name.toLowerCase() + " industries" ;
                    }
        } else if (graph_status != 'expand') {
            tt_text += 'In ' + nearestYear + '<br />';
            tt_text += 'there were </br><strong>' + workerValueFormatted + '</strong><br/>' + d.name.toLowerCase() + ' <br/> workers in the the economy<br/>';
        } else {
            tt_text += 'In ' + nearestYear + '<br />';
            tt_text += '<strong>' + workerValueFormatted + '</strong><br/> of workers were in ' + d.name.toLowerCase() + " jobs" ;
        }

        tt_top = dotY - tt_height;
        tt_left = dotX - (tt_width/3);

        // define tooltip position
        if (tt_top < margin['top']) {
            // if (!isMobile) {
                tt_top = margin['top'];
            // } else {
                // tt_top = margin['top']/2;
            // }

        }
        if ((tt_top + tt_height) > dotY) {
            if (!isMobile) {
                tt_top = dotY + 10;
            } else {
                tt_top = dotY;
            }
        }

        tt_left = dotX - (tt_width / 3);
        if (tt_left < margin['left']) {
            tt_left = margin['left'];
        }

        if ((tt_left + tt_width) > (width + margin['right'])) {
            if (!isMobile) {
                tt_left = width - tt_width;
            } else {
                tt_left = width - tt_width/3;
            }
        }

        // if (!isMobile) {
        tooltip
            .html(tt_text)
            .style('top', tt_top + 'px')
            .style('left', tt_left + 'px')
            .classed('active', true);
        // }
}

function dataTransform() {
    stack.offset(graph_status);
    formattedData = stack(names.map(function(name) {
        return {
            name: name,
            values: graphicData.map(function(d) {
                return {x: +d['year'], y: +d[name], year: d3.time.format('%Y').parse(d['year'])} ;
            })
        };
    }));


    if (graph_status == "expand") {
        y.domain([ 0, 1]);
    } else {
        y.domain([0,140000000]);
    }

}



//default or expand
function graphTransition() {
    dataTransform();

    yAxis.tickFormat(function(d) {
            if (graph_status == 'expand') {
            return formatPercent(d);
            } else {
            return d/1000000 + ' million'
            }
        });


if (!isMobile) {

    layers
        .data(formattedData)
        .transition()
          .duration(800)
        .attr("d", function(d) { return area(d.values); })
        .style("fill", function(d) { return majorColor(d.name); });

        yaxis.transition().duration(800)
        .call(yAxis);

        d3.select('#tooltip')
            .classed('active', false);
        d3.selectAll('.year').classed('selected-year', false)

        if (graph_status == "default") {
            d3.select('.group-other')
            .transition()
            .duration(800)
            .attr('x', 3*width/4)
            .attr('y', y(1000000) )

            d3.select('.group-farmers')
            .transition()
            .duration(800)
            .attr('x', width/4)
            .attr('y', y(20000000) )

            d3.select('.group-service')
            .transition()
            .duration(800)
            .attr('x', 4*width/5)
            .attr('y', y(70000000) )

            d3.select('.group-blue-collar')
            .transition()
            .duration(800)
            .attr('x', 4.2*width/5)
            .attr('y', y(100000000) )

            d3.select('.group-white-collar')
            .transition()
            .duration(800)
            .attr('x', 4*width/5)
            .attr('y', y(20000000) )

        } else {

            d3.select('.group-other')
            .transition()
            .duration(800)
            .attr('x', width/2)
            .attr('y', y(.05) );

            d3.select('.group-farmers')
            .transition()
            .duration(800)
            .attr('x', width/6)
            .attr('y', y(.85) );

            d3.select('.group-service')
            .transition()
            .duration(800)
            .attr('x', 3*width/4)
            .attr('y', y(.61) )
            .text('Service');

            d3.select('.group-blue-collar')
            .transition()
            .duration(800)
            .attr('x', width/2)
            .attr('y', y(.65) );

            d3.select('.group-white-collar')
            .transition()
            .duration(800)
            .attr('x', width/1.5)
            .attr('y', y(.2) );

        }

    } else {


    layers
        .data(formattedData)
        .attr("d", function(d) { return area(d.values); })
        .style("fill", function(d) { return majorColor(d.name); });

        yaxis
        .call(yAxis);

        d3.select('#tooltip')
            .classed('active', false);
        d3.selectAll('.year').classed('selected-year', false)

        if (graph_status == "default") {
            d3.select('.group-other')
            .attr('x', 3*width/4)
            .attr('y', y(1000000) )

            d3.select('.group-farmers')
            .attr('x', width/4)
            .attr('y', y(20000000) )

            d3.select('.group-service')
            .attr('x', 4*width/5)
            .attr('y', y(70000000) )

            d3.select('.group-blue-collar')
            .attr('x', 4.2*width/5)
            .attr('y', y(100000000) )

            d3.select('.group-white-collar')
            .attr('x', 4*width/5)
            .attr('y', y(20000000) )

        } else {

            d3.select('.group-other')
            .attr('x', width/2)
            .attr('y', y(.05) );

            d3.select('.group-farmers')
            .attr('x', width/5)
            .attr('y', y(.75) );

            d3.select('.group-service')
            .attr('x', 3*width/4)
            .attr('y', y(.51) )
            .text('Service');

            d3.select('.group-blue-collar')
            .attr('x', width/2)
            .attr('y', y(.65) );

            d3.select('.group-white-collar')
            .attr('x', width/1.5)
            .attr('y', y(.2) );

        }

    }

}

function newDomain(values) {
       y
       .rangeRound([120, 0])
       .clamp(true)
       .domain([0, d3.max(values,function(data) {
            return data['y']; })]);
}

var classify = function(str) { // clean up strings to use as CSS classes
    var spaceWord =  str.replace(/\W+/g, ' ').toLowerCase();
    var spaceWord2 = spaceWord.replace(/\s+/g, ' ').toLowerCase();
    var spaceWord3 = spaceWord2.replace(/[ \t]+$/g, '').toLowerCase();
    return spaceWord3.replace(/\s{1}/g, '-').toLowerCase();
}

function majorColor(name) {
    var nameClean = classify(name)
    var colorPicked = jobs[nameClean];
    return colorPicked;

    return null;
}

function stretchBottomAxis() {
    heightAdj = height-50

    //push x axis
    xgrid
        .transition()
        .duration(800)
        .attr('transform', 'translate(0,' + heightAdj + ')')
        .call(xAxisGrid);

    xaxis
        .transition()
        .duration(800)
        .attr('transform', 'translate(0,' + heightAdj + ')');

    //hide yaxis for now.
    yaxis.style('display','none')
    xaxis.style('display','none')
    xgrid.style('display','none')
    ygrid.style('display','none')


}

function changeState(status) {
    graph_status = status
    // console.log(graph_status)

    yAdj = graph_status != 'expand' ? 5 : 1;
    graphTransition()
}

function changeLevel() {
    changeState('default')
    d3.selectAll('.shares-button').classed('clicked', false)
    d3.selectAll('.levels-button').classed('clicked', true)
}

function changeShare() {
    changeState('expand')
    d3.selectAll('.levels-button').classed('clicked', false)
    d3.selectAll('.shares-button').classed('clicked', true)
}

function addHeight(newHeight) {
    height = newHeight;
    d3.select('.svg-container').attr('height', height);
    // resize
    pymChild.sendHeight()
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

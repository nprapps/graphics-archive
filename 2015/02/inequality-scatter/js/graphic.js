// global vars
var $graphic = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var graphicData = null;
var isMobile = false;
var isLoaded = false;

var BASE_WIDTH = 960;
var BASE_HEIGHT = 600;
var BASE_SCALE = 1200;
var margin;

var TOGGLE_WIDTH = 85;
var SLIDER_HEIGHT = 30;
var SLIDER_OFFSET = {
    top: -75,
    right: 0,
    bottom: 0,
    left: (TOGGLE_WIDTH-5)
};
var mapHeight = null;
var mapScale = null;
var svgHeight = null;
var svgWidth = null;
var sliderBrush;
var x2;
var x;
var y;
var currentYear;
var downArrow;
var aspectHeight;
var aspectWidth;
var isAnimating = false;


// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var line90;
var line1;

var dates = [];
for (var i = 1918; i <= 2012; i++) {
    if (i%4 == 0) {
        dates.push(i);
    }
}

var datesWide = [];
for (var i = 1918; i <= 2012; i++) {
    if (i%8 == 0) {
        datesWide.push(i);
    }
}

var datesMobile = [];
for (var i = 1918; i <= 2012; i++) {
    if (i%20 == 0) {
        datesMobile.push(i);
    }
}

/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;
            graphicData.forEach(function(d) {
                d['year'] = +d['year']
                d['d1'] = +d['d1']
                d['d90'] = +d['d90']

            });

            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * RENDER THE GRAPHIC
 */
var render = function(containerWidth) {
    // fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // clear out existing graphics
    $graphic.empty();
    

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth) {
        // reset things if this is a reload
    if (isLoaded) {
        pauseAnimation();
    }
    currentYear = 0;
    var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3'], colors['orange3'], colors['teal3'] ]);
    var graph = d3.select('#graphic');
    var ticksX;
    var ticksY;
    // params that depend on the container width
    if (isMobile) {
        margin = {
            top: 90,
            right: 0,
            bottom: 0,
            left: 45
        };


        aspectWidth = 3;
        aspectHeight = 5;
        ticksX = 4;
        ticksY = 5;
        annoteSize = '10px';
    } else {
        margin = {
            top: 90,
            right: 15,
            bottom: 0,
            left: 45
        };


        aspectWidth = 4;
        aspectHeight = 3;
        ticksX = 10;
        ticksY = 10;
        annoteSize = '12px';

    }



    // define chart dimensions
    // var width = graphicWidth - margin['left'] - margin['right'];
    // var height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];
    updateDimensions(graphicWidth);

    x = d3.scale.linear()
        .range([0, svgWidth - SLIDER_OFFSET['left'] - SLIDER_OFFSET['right'] ])



        x2 = d3.scale.linear()
            .domain([ 1920, 2012 ])
            .range([0, svgWidth - SLIDER_OFFSET['left'] - SLIDER_OFFSET['right'] - TOGGLE_WIDTH ])
            .clamp(true);

    y = d3.scale.linear()
        .range([svgHeight+4*SLIDER_OFFSET['top'], 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d,i) {
            var value = d/1000
            if (value >= 1000) {
            return "$" + d/1000000 + "m"
            } else {
            return "$" + d/1000 + "k"                
            }
        });


    sliderBrush = d3.svg.brush()
        .x(x2)
        .extent([1920,1920])
        .on('brush', onBrushed);


    var xAxisGrid = function() {
        return xAxis;
    }



    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickFormat(function(d,i) {
            return "$" + d/1000 + "k"
        });

    var yAxisGrid = function() {
        return yAxis;
    }

  x.domain(d3.extent(graphicData, function(d) { return d['d1']; })).nice();
  y.domain(d3.extent(graphicData, function(d) { return d['d90']; })).nice();

    var datesLabels = (isMobile) ? datesMobile : datesWide;

    // draw the chart
    var svg = graph.append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + 1.6*margin['top'] + ')');

    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + (svgHeight+4*SLIDER_OFFSET['top']) + ')')
        .call(xAxis);

    // y-axis (left)
    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + (svgHeight+4*SLIDER_OFFSET['top']) + ')')
        .call(xAxisGrid()
            .tickSize(-(svgHeight+4*SLIDER_OFFSET['top']), 0, 0)
            .tickFormat('')
        );

    // y-axis gridlines
    svg.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-(svgWidth - SLIDER_OFFSET['left'] - SLIDER_OFFSET['right']), 0, 0)
            .tickFormat('')
        );


    svg.append("defs").append("marker")
        .attr("id", "arrowhead90")
        .attr("refX", 2) /*must be smarter way to calculate shift*/
        .attr("refY", 2)
        .attr("markerWidth", 6)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
            .attr("d", "M 0,0 V 4 L6,2 Z");


    svg.append("defs").append("marker")
        .attr("id", "arrowhead1")
        .attr("refX", 2) /*must be smarter way to calculate shift*/
        .attr("refY", 2)
        .attr("markerWidth", 6)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
            .attr("d", "M 0,0 V 4 L6,2 Z");

    slider = svg.append('g')
        .attr('class', 'x axis')
        .call(d3.svg.axis()
            .scale(x2)
            .orient('bottom')
            .tickValues(datesLabels)
            .tickFormat(function(d) {
                return d;
            })
            .tickSize(10)
            .tickPadding(5)
        )
        .attr('transform', 'translate(' + SLIDER_OFFSET['left'] + ',' + (0 + SLIDER_OFFSET['top']) + ')');
    
    var sliderBar = svg.append('g')
        .attr('class', 'xbar')
        .append('line')
        .attr('transform', 'translate('+ SLIDER_OFFSET['left'] + ',' + (0 + SLIDER_OFFSET['top']) + ')')
        .attr('x1', x2(1917))
        .attr('x2', x2(2012));
    
    var sliderBarHalo = svg.append('g')
        .attr('class', 'xbar-halo')
        .append('line')
        .attr('transform', 'translate(' + SLIDER_OFFSET['left'] + ',' + (0 + SLIDER_OFFSET['top']) + ')')
        .attr('x1', x2(1917))
        .attr('x2', x2(2012));

    slider.append('text')
          .attr('id','year-label')
          .attr('text-anchor', 'middle')
          .attr('dy', -15)
          .text('1920');

    slider = svg.append('g')
        .attr('class', 'slider')
        .attr('height', SLIDER_HEIGHT)
        .attr('transform', 'translate('+ SLIDER_OFFSET['left'] + ', ' + (SLIDER_OFFSET['top'] - 10) + ')')
        .call(sliderBrush);

    slider.selectAll('.background, .extent, .resize')
        .remove();

    sliderHandle = slider.append('svg:image')
        .attr('class', 'handle')
        .attr('transform', 'translate(0,' + 0 + ')')
        .attr('xlink:href', 'slider.png')    
        .attr('width', 150)
        .attr('height', 20)
        .attr('x', x2(1917)-75);

    // add play/pause buttons
    toggle = $('<div id="toggle"><div id="btn-play"><i class="fa fa-play"></i> Play</div><div id="btn-pause"><i class="fa fa-pause"></i> Pause</div></div>').css({
        'left': '10px',
        'top': '50px',
        'width': TOGGLE_WIDTH + 'px'
    });

    downArrow = $('<div class="arrow-down"></div>').css({
        'left': '10px',
        'top': '120px'
    });

    $('#graphic').append(downArrow);
    $('#graphic').append(toggle);
    
    $pauseButton = $('#btn-pause');
    $playButton = $('#btn-play');
    
    $pauseButton.on('click', onPauseClicked);
    $playButton.on('click', onPlayClicked);
    $pauseButton.hide();

    isLoaded = true;

    // startAnimation();

    svg.selectAll(".dot")
      .data(graphicData)
    .enter().append("circle")
      .attr("class", function(d) {
        return 'y-' + d['year'] + " greydot"
        })
      .attr("r", 5)
      .attr("cx", function(d) { return x(d['d1']); })
      .attr("cy", function(d) { return y(d['d90']); });

      svg.selectAll(".dot")
      .data(graphicData)
    .enter().append("circle")
      .attr("class", function(d) {
        return 'not-selected y-' + d['year'] + " dot"
        })
      .attr("r", 7)
      .attr("cx", function(d) { return x(d['d1']); })
      .attr("cy", function(d) { return y(d['d90']); })
      .style('fill', function(d) {return changeColor(d)});    

    svg.selectAll(".text")
      .data(graphicData)
    .enter().append("text")
      .attr("class", function(d,i) {
        if (i % 3 == 0) {
        return "not-selected year-label y-" + d['year']
        } else {
        return "not-selected no-label year-label y-" + d['year']
        }
        })
      .attr("r", 3.5)
      .attr("x", function(d) { return x(d['d1']); })
      .attr("y", function(d) { return y(d['d90']); })
      .attr('dx', '10px')
      .attr('dy', '5px')
      .text(function(d) {return d['year']})
      .style('font-size', '10px')
      .style('fill', function(d) {return changeColor(d)});

    if (isMobile) {
        d3.selectAll('.no-label').remove()
    }

    line90 = svg.append("line")
        .attr("class", 'annote-line bottom-90')
        .attr('x1', x(420000))
        .attr('x2', x(420000))
        .attr('y1', y(10000))
        .attr('y2', y(10000));


    line1 = svg.append("line")
        .attr("class", 'annote-line top-1')
        .attr('x1', x(350000))
        .attr('x2', x(350000))
        .attr('y1', y(38000))
        .attr('y2', y(38000));

    var yLabelX = isMobile ? 10000: 60000;


    var ylabel = svg.append("text")
        .attr("class", 'annotation ylabel')
        .attr('x', x(yLabelX))
        .attr('y', y(40000))
        .attr('dy', '-30px')
        .attr('dx', '-15px')
        // .attr('transform', 'rotate(-90)')
        .text('Average income for the bottom 90%')   
        .style('font-size', annoteSize)
        .style('text-anchor', 'start');
    // var ylabel2 = svg.append("text")
    //     .attr("class", 'annotation ylabel')
    //     .attr('x', x(yLabelX))
    //     .attr('y', y(36000))
    //     .attr('dy', '-4px')
    //     .attr('dx', '-15px')
    //     // .attr('transform', 'rotate(-90)')
    //     .text('for the bottom 90%')   
    //     .style('font-size', annoteSize)
    //     .style('text-anchor', 'start');

    var xLabelY = isMobile ? 2000: 2200;

    var xlabel = svg.append("text")
        .attr("class", 'annotation xlabel')
        .attr('x', x(600000))
        .attr('y', y(xLabelY))
        .attr('dy', '10px')
        // .attr('dx', '-10px')
        .text('Average income for the top 1%')   
        .style('font-size', annoteSize)
        .style('text-anchor', 'middle');

    if (!isMobile) {
    var annote1 = svg.append("text")
        .attr("class", 'annotation group1')
        .attr('x', x(350000))
        .attr('y', y(39500))
        .attr('dy', '-25px')
        .text('After 1980, only the top 1% saw their incomes rise.')
        .style('font-size', annoteSize)
        .style('opacity', '0');        
    } else {

    var annote1 = svg.append("text")
        .attr("class", 'annotation group1')
        .attr('x', x(350000))
        .attr('y', y(39500))
        .text('After 1980, only the')  
        .style('font-size', annoteSize)
        .style('opacity', '0');
    
    var annote1_bottom = svg.append("text")
        .attr("class", 'annotation group1')
        .attr('x', x(350000))
        .attr('y', y(39500))
        .attr('dy', '10px')
        .text('the top 1% saw their incomes rise.')
        .style('font-size', annoteSize)
        .style('opacity', '0');


    }

        // .call(wrap, 300);
   var xDirectionsY = isMobile ? 46500: 48500;

   var annote1 = svg.append("text")
        .attr("class", 'annotation group1')
        .attr('x', x(100000))
        .attr('y', y(xDirectionsY))
        .attr('dy', '-13px')
        .attr('dx', '-40px')
        .text('Press Play To Watch The Fall And Rise Of Inequality')
        .style('font-size', annoteSize)
        .style('font-style', 'italic')
        .style('opacity', '1');


    if (!isMobile) {
    var annote90 = svg.append("text")
        .attr("class", 'annotation group90')
        .attr('x', x(440000))
        .attr('y', y(20000))
        .text('Between 1930 and 1970s, only the bottom 90% saw their incomes rise.')
        .style('font-size', annoteSize)
        .style('opacity', '0');

    } else {

    var annote90 = svg.append("text")
        .attr("class", 'annotation group90')
        .attr('x', x(440000))
        .attr('y', y(20000))
        .text('Between 1930 and 1970s, only the')  
        .style('font-size', annoteSize)
        .style('opacity', '0');
    
    var annote90_bottom = svg.append("text")
        .attr("class", 'annotation group90')
        .attr('x', x(440000))
        .attr('y', y(20000))
        .attr('dy', '10px')
        .text('bottom 90% saw their incomes rise.')
        .style('font-size', annoteSize)
        .style('opacity', '0');

    }


    changeData(1920);
}


/*
 * HELPER FUNCTIONS
 */

var changeColor = function(d) {
        if (d['year'] <= 1940 ) {
            return colors['yellow3'];
        } else if (d['year'] > 1940 && d['year'] <= 1970) {
            return colors['teal4']            
        } else if (d['year'] > 1970 && d['year'] <= 1982) {
            return colors['yellow3']
        } else if (d['year'] > 1982) {
            return colors['red4']
        }  

}
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}

var updateDimensions = function(graphicWidth) {
    svgWidth = graphicWidth;
    chartHeight = Math.ceil((svgWidth * aspectHeight) / aspectWidth) - margin['bottom'];
    // chartHeight = svgWidth * BASE_HEIGHT / BASE_WIDTH;
    chartScale = (svgWidth / BASE_WIDTH) * BASE_SCALE;
    // svgHeight = chartHeight + 200
    svgHeight = Math.ceil(chartHeight + (-4*SLIDER_OFFSET['top']));
}

var onPauseClicked = function() {
    pauseAnimation();
}
var onPlayClicked = function() {
    startAnimation();
}

var startAnimation = function() {
       
    isAnimating = true;
    animationTimer = setInterval(function() {
        var year = dates[currentYear];
        changeYear(year)
        currentYear++;
        if (currentYear == dates.length) {
            pauseAnimation();
            currentYear = 0;


        }
        sliderHandle.attr('x', x2(year) - 75);
    },350);
    $playButton.hide();
    $pauseButton.show();
}

var pauseAnimation = function() {
    if (isAnimating == true) {
        clearInterval(animationTimer);
    }
    isAnimating = false;
    
    $pauseButton.hide();
    $playButton.show();
}

var onBrushed = function() {
    pauseAnimation();
    var valueTemp = Math.round(sliderBrush.extent()[0]);
    var value = getNearestNumber(dates, valueTemp);

    if (d3.event.sourceEvent) { // not a programmatic event
        var valueTemp = Math.round(x2.invert(d3.mouse(this)[0]));
        value = getNearestNumber(dates, valueTemp);
        sliderBrush.extent([ value, value ]);
    }
    sliderHandle.attr('x', x2(value) - 75);
    changeYear(value);
}

var getNearestNumber = function(a, n) {
    if((l = a.length) < 2)
        return l - 1;
    for(var l, p = Math.abs(a[--l] - n); l--;)
        if(p < (p = Math.abs(a[l] - n)))
            break;
    return a[l + 1];
}

var changeYearLabel = function(year) {
    d3.select('#year-label')
        .attr('x', x2(year))
        .text(year);
}



var changeYear = function(year) {

    if (year > 1982) {
        d3.selectAll(".group1")
        .transition()
        .duration(500)
        .style('opacity',1)
    } else {
        d3.selectAll(".group1")
        .transition()
        .duration(500)
        .style('opacity',0)        
    }

    if (year > 1940) {
        d3.selectAll(".group90")
        .transition()
        .duration(500)
        .style('opacity',1)
    } else {
        d3.selectAll(".group90")
        .transition()
        .duration(500)
        .style('opacity',0)        
    }

    extendLines90(year)
    extendLines1(year)

    changeYearLabel(year);
    d3.selectAll('.year-label')
    .classed('not-selected', true);
    d3.selectAll('.dot')
    .classed('not-selected', true);

    changeData(year);

}

var extendLines90 = function(year) {
    var linePercent90 = ((year-1970)/30) + 1.0000001
    var length90 = 10000 + linePercent90*18000

    if (linePercent90 > 1) {
        length90 = 28000
    }

    line90
    .transition()
    .duration(300)
    .attr('y2', y(length90))
    .style('opacity', '1');

    if (linePercent90 > .05) {
    line90.attr("marker-end", "url(#arrowhead90)");
    }

    if (year < 1938) {
        line90
        .transition()
        .duration(100)        
        .style('opacity', '0');
    }
}

var extendLines1 = function(year) {

    if (year > 1982) {
        var linePercent1 = ((year-2012)/30) + 1.000000001
        var length1 = 500000 + linePercent1*500000

        if (linePercent1 > 1) {
            length1 = 1050000
        }

        line1
        .transition()
        .duration(150)
        .attr('x2', x(length1))
        .style('opacity', '1');

        if (linePercent1 > .05) {
        line1.attr("marker-end", "url(#arrowhead1)");
        }

    } else {
        line1
        .transition()
        .duration(100)
        .style('opacity', '0')
    }

}

var changeData = function(year) {
    for (var i = 1917; i <= year; i++) {
        d3.selectAll('.y-' + i)
        .classed('not-selected', false);
    }

}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}
/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

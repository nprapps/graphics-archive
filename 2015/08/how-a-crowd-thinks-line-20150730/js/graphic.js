
// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var chartElement,
    dayLabel,
    formattedData,
    slider,
    counter,
    line,
    area,
    yScale,
    xScale,
    margins,
    averageWeight,
    highlightLine,
    zeroAPR,
    subPrimeText,
    subPrimeText2,
    areas;
var transitionTime = 350

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};



var isLoaded = false;

var TOGGLE_WIDTH = 100;
var SLIDER_HEIGHT = 30;

var SLIDER_OFFSET;

var isAnimating = false;
var isLoaded = false;
var isMobile = false;
var animationTimer = null;
var slider = null;
var sliderBrush = null;
var sliderHandle = null;
var i = null;
var toggle = null;
var x = null;

var hourLabels = [];
for (var i = 2001; i <= 2013; i += 3) {
        hourLabels.push(i)
}

var hourLabelsShortened = [];
for (var i = 1; i <= 116; i++) {
    if (i%10 == 0) {
        hourLabelsShortened.push(i);
    }
}

var startValue = hourLabels[0];
var endValue = hourLabels[hourLabels.length-1];

// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var fmtComma = d3.format("0,000")
/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = data;

        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d) {
        d['range'] = +d['range'];

        for (var key in d) {
            if (key != 'range') {
                d[key] = +d[key];
            }
        }
    });
}


/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderLineChart({
        container: '#graphic',
        width: containerWidth,
        data: graphicData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */

    if (isLoaded) {
        pauseAnimation();
    }


    margins = {
        top: 80,
        right: 15,
        bottom: 60,
        left: 60
    };

    counter = 0
    var dateColumn = 'range';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 3 : 12;
    var aspectHeight = isMobile ? 4 : 9;


    var ticksX = 5;
    var ticksY = 10;
    var roundTicksFactor = 5;
    // Mobile
    if (isMobile) {
    
    TOGGLE_WIDTH = 60;
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
        margins['left'] = 30;
        margins['bottom'] = 30;
    SLIDER_OFFSET = {
        top: -70,
        right: -10,
        bottom: 0,
        left: TOGGLE_WIDTH
        }
    }else {

    TOGGLE_WIDTH = 120;

    margins['right'] = 15;
    margins['left'] = 60;
    margins['bottom'] = 60;

    SLIDER_OFFSET = {
        top: -70,
        left: (TOGGLE_WIDTH-20),
        bottom: 0,
        right: -80
    };        

    }
    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');
  
    formattedData = {};

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in graphicData[0]) {
        if (column == dateColumn) {
            continue;
        }

        formattedData[column] = graphicData.map(function(d) {
            return {
                'range': d[dateColumn],
                'amt': d[column]
            };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    /*
     * Create D3 scale objects.
     */
    
    // Set up the slider


    xScale = d3.scale.linear()
        .domain([-2,32])
        .range([ 0, chartWidth ])

    yScale = d3.scale.linear()
        .domain([0,18000000])
        // .domain([0,.20])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(key) {
            return key !== dateColumn;
        }))
        .range([ "#ccc"]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
            .data(d3.entries(formattedData))
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i + ' ' + classify(d['key']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['key']);
        });

    legend.append('label')
        .text(function(d) {
            return d['key'];
        });

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

        chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xTicks = isMobile ? [-2,4,8,12,16,20,24,28,32] : [-2, 0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32]
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickValues(xTicks)        
        .tickFormat(function(d, i) {
          return fmtComma(d) + "%"
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (!isMobile) {
                return d/1000000 + " million";

            } else {    
                return d/1000000 + "M";
            }
        });


    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    line = d3.svg.line()
        .interpolate('step-after')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });


    areas = d3.svg.area()
        .interpolate('step-after')
        .x(function(d) {return xScale(d[dateColumn]);})        
        .y0(function(d) { return yScale(0); })
        .y1(function(d) {return yScale(d[valueColumn]);});


    chartElement.append("clipPath")
          .attr("id", "clip-section1")
        .append("rect")
          .attr("height", chartHeight)
          .attr("x", xScale(-2))          
         .attr("width", xScale(0));

      
    chartElement.append("clipPath")
          .attr("id", "clip-section2")
        .append("rect")
          .attr("x", xScale(0))
          .attr("height", chartHeight)
          .attr("width", xScale(8)-xScale(0));
    
    chartElement.append("clipPath")
          .attr("id", "clip-section3")
        .append("rect")
          .attr("x", xScale(8))
          .attr("height", chartHeight)
          .attr("width", xScale(20)-xScale(8));    
    
    chartElement.append("clipPath")
          .attr("id", "clip-section4")
        .append("rect")
          .attr("x", xScale(20))
          .attr("height", chartHeight)
          .attr("width", xScale(22)-xScale(20));    

    chartElement.append("clipPath")
          .attr("id", "clip-section5")
        .append("rect")
          .attr("x", xScale(22))
          .attr("height", chartHeight)
          .attr("width", xScale(30)-xScale(22));


   highlightArea = chartElement.append('g')
        .attr('class', 'area')
        .selectAll('path')
        .data(["section1", "section2", "section3", "section4", "section5"])
        .enter()
        .append('path')
        .attr('class', function(d, i) {
                    return 'area area-' + d;
        })
        .attr("clip-path", function(d) { return "url(#clip-" + d + ")"; })
        .datum(d3.entries(formattedData).filter(function(d){return d['key'] =="hour-" + hourLabels[0]}))
                .attr('d', function(d) {
                    return areas(d[0]['value']);
                });
                     
   highlightLine = chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData).filter(function(d){return d['key'] =="hour-" + hourLabels[0]}))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                    return 'line line-' + i + ' ' + classify(d['key']);
                })
                .attr('d', function(d) {
                    return line(d['value']);
                });

    chartElement
        .append('text')
        .attr('class','axis')
        .attr('text-anchor', 'start')
        .attr('transform', makeTranslate(0,0))
        .attr('dy', -9)
        .text('Number Of Households')        

    chartElement
        .append('text')
        .attr('class','axis')
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(' + chartWidth/2 + ',' + ( chartHeight ) + ')')
        .attr('dy', 45)
        .attr('dx', -20)
        .text('Interest Rate (APR)')    

    d3.select(".axis:nth-child(1)").select('g').select('text').text('No')
    
    d3.select(".axis:nth-child(1)")       
        .append('text')
        .attr('transform', makeTranslate(-7,29))
        .text(' Interest')

    x = d3.scale.linear()
        .domain([ 2001, 2013 ])
        .range([0, chartWidth  - SLIDER_OFFSET['left'] ])
        .clamp(true);

    sliderBrush = d3.svg.brush()
        .x(x)
        .extent([2001,2013])
        .on('brush', onBrushed);

    var sliderBar = chartElement.append('g')
        .attr('class', 'xbar')
        .append('line')
        .attr('transform', 'translate('+ SLIDER_OFFSET['left'] + ',' + ( SLIDER_OFFSET['top']) + ')')
        .attr('x1', x(startValue))
        .attr('x2', x(endValue));

    var sliderBarHalo = chartElement.append('g')
        .attr('class', 'xbar-halo')
        .append('line')
        .attr('transform', 'translate(' + SLIDER_OFFSET['left'] + ',' + ( SLIDER_OFFSET['top']) + ')')
        .attr('x1', x(startValue))
        .attr('x2', x(endValue));             


    slider = chartElement.append('g')
        .attr('class', 'slider-axis')
        .attr('height', SLIDER_HEIGHT)
        .call(d3.svg.axis()
                .scale(x)
                .orient('bottom')
                .tickSize(10)
                .tickPadding(5)
                .ticks(4)
                .tickValues([2001,2004,2007,2010,2013])
                .tickFormat(d3.format("d"))
            )                                
        .attr('transform', 'translate('+ SLIDER_OFFSET['left'] + ',' + ( SLIDER_OFFSET['top']) + ')')
        .call(sliderBrush);

    slider.append('text')
          .attr('id','hour-label')
          .attr('text-anchor', 'middle')
          .attr('dy', -14)
          .text(startValue);

    slider.selectAll('.background, .extent, .resize')
        .remove();

    sliderHandle = slider.append('svg:image')
        .attr('class', 'handle')
        .attr('transform', 'translate(0,-10)')
        .attr('xlink:href', 'slider.png')    
        .attr('width', 150)
        .attr('height', 20)
        .attr('x', x(startValue)-75);

    // add play/pause buttons
    if (!isMobile) {
        toggle = $('<div id="toggle"><div id="btn-play"><i class="fa fa-play"></i> Next <span class="arrow">&#8250;</span></div><div id="btn-pause"><i class="fa fa-pause"></i> Start Over</div></div>').css({
            'top' : '-3px',
            'left': '6px',
            'bottom': '10px',
            'height': '50px',
            'width': TOGGLE_WIDTH + 'px'
        });

    } else {
   
        toggle = $('<div id="toggle"><div id="btn-play"><i class="fa fa-play"></i> Next <span class="arrow">&#8250;</span></div><div id="btn-pause"><i class="fa fa-pause"></i> Start Over</div></div>').css({
                'top' : '-3px',
                'left': '6px',
                'bottom': '10px',
                'height': '50px',
                'width': TOGGLE_WIDTH + 'px'
        });
    }
    $('.graphic-wrapper').append(toggle);
    
    $pauseButton = $('#btn-pause');
    $playButton = $('#btn-play');
    
    $pauseButton.on('click', onPauseClicked);
    $playButton.on('click', onPlayClicked);
    $pauseButton.hide();
    // $playButton.hide();
    

    // get things going
    // startAnimation();
    
    isLoaded = true;

    zeroAPR = d3.select('.graphic-wrapper')
        .append('div')
        .attr('class','annote-label')
        .attr('text-anchor', 'start')
        .style('left', xScale(-2) + margins['left'] + "px")
        .style('top', yScale(3000000))
        .style('opacity', '0')    
        .html('The rise of 0% APR');
    
    subPrimeText = d3.select('.graphic-wrapper')
        .append('div')
        .attr('pointer-events', 'none')
        .attr('class','annote-label')
        .style('text-align', 'right')        
        .style('right', '10px')
        .style('top', yScale(1500000) + "px")
        .style('opacity', '0')        
        .style('width', function() {
            if (isMobile) {
            return '100px'
            } else {
            return '200px';
            }
        })
        .html('Companies began to sell cards to people with bad credit, at higher rates.');
    
    flattenDistText = d3.select('.graphic-wrapper')
        .append('div')
        .attr('class','annote-label')
        .style('left', chartWidth/3 + "px")
        .style('top', yScale(13000000) + "px")
        .style('text-align', 'center')
        .style('opacity', '0')
        .style('width', function() {
            if (isMobile) {
            return '150px'
            } else {
            return '300px';
            }
        })                
        .html("Interest rates become more evenly spread out.")

}

var updateArea = function(number) {
    d3.select('.line.hour-' + number)
        .attr('opacity', .7).moveToFront();

    zeroInterestGraf(number)
    riseOfSubPrime(number);
    flattenDist(number);

    highlightLine
        .data(d3.entries(formattedData).filter(function(d){return d['key'] =="hour-" + number }))
        .transition()
        .duration(transitionTime)
        .attr('d', function(d) {
                return line(d['value']);
        });

    highlightArea
        .datum(d3.entries(formattedData).filter(function(d){return d['key'] =="hour-" + number }))
        .transition()
        .duration(transitionTime)
        .attr('d', function(d) {
                return areas(d[0]['value']);
        });

}

var changeHourLabel = function(hour) {

    d3.select('#hour-label')
        .attr('x', x(hour))
        .text(hour)
        
}

var onPauseClicked = function() {
    pauseAnimation();
}
var onPlayClicked = function() {
    counter++
    if (counter == 5) {
        // pauseAnimation();
        d3.selectAll('.line').attr('opacity', 0)
        counter = 0;
    }
    
    if (counter == 4) {
        d3.select(this).html('Restart');
    } else {
        d3.select(this).html('Next <span class="arrow">&rsaquo;</span>');
    }

    var hour = hourLabels[counter];
    changeHour(hour)
    sliderHandle.attr('x', x(hour) - 75);

    // startAnimation();
}

var changeHour = function(hour) {
    changeHourLabel(hour);
    selectedHour = hour;
    updateArea(hour);
}

var zeroInterestGraf = function(number) {

    if (number == 2004) {
        zeroAPR
            .transition()
            .duration(transitionTime)
            .style('top', yScale(8800000) +  margins['top'] + "px")
            .style('opacity', '1')
            // .text('Rise Of 0% APR')

        d3.select('.area.area-section1').classed('area-highlight', true)

    } else if (number == 2007) {
        zeroAPR
            .transition()
            .duration(transitionTime)
            .style('top', yScale(6700000) +  margins['top'] + "px")
            .style('opacity', '1')
    } else if (number == 2010) {
        zeroAPR
            .transition()
            .duration(transitionTime)
            .style('top', yScale(5600000) +  margins['top'] + "px")
            .style('opacity', '1')
    } else if (number == 2013) {
        zeroAPR
            .transition()
            .duration(transitionTime)
            .style('top', yScale(7200000) +  margins['top'] + "px")
            .style('opacity', '1')
    } else {
        zeroAPR
            .transition()
            .duration(transitionTime)
            .style('top', yScale(3400000) + "px")
            .style('opacity', '0')
        d3.select('.area.area-section1').classed('area-highlight', false)            

    }
  
}

var flattenDist = function(number) {
    if (number > 2010) {
        flattenDistText 
            .transition()
            .duration(transitionTime)    
            .style('top', function() {
                if (isMobile) {
                return yScale(10500000) + margins['top'] + "px"
                } else {
                return yScale(10000000) + margins['top'] + "px"
                }
            })
            .style('opacity', '1')
    
    d3.select('.area.area-section3').classed('area-highlight', true)

    } else {
        flattenDistText 
            .transition()
            .duration(transitionTime)    
            .style('top', yScale(11500000) + margins['top'] + "px")
            .style('opacity', '0')  
    d3.select('.area.area-section3').classed('area-highlight', false)

    }
}

var riseOfSubPrime = function(number) {
    if (number > 2007) {

        subPrimeText
            .transition()
            .duration(transitionTime)
            .style('top', yScale(4100000))
            .attr('dx', 3 )
            .style('opacity', '1')       

    d3.select('.area.area-section5').classed('area-highlight', true)

    } else {

        subPrimeText
            .transition()
            .duration(transitionTime)
            .style('top', yScale(1500000))
            .style('opacity', '0')       
    d3.select('.area.area-section5').classed('area-highlight', false)

    }

}
var pauseAnimation = function() {
    clearInterval(animationTimer);
    isAnimating = false;
    
    $pauseButton.hide();
    $playButton.show();
}

var getNearestNumber = function(a, n) {
    if((l = a.length) < 2)
        return l - 1;
    for(var l, p = Math.abs(a[--l] - n); l--;)
        if(p < (p = Math.abs(a[l] - n)))
            break;
    return a[l + 1];
}

var onBrushed = function() {
    pauseAnimation();
    var valueTemp = Math.round(sliderBrush.extent()[0]);
    var value = getNearestNumber(hourLabels, valueTemp);
    if (d3.event.sourceEvent) { // not a programmatic event
        var valueTemp = Math.round(x.invert(d3.mouse(this)[0]));
        value = getNearestNumber(hourLabels, valueTemp);
        sliderBrush.extent([ value, value ]);
    }
    sliderBrush.extent([ value, value ]);
    sliderHandle.attr('x', x(value) - 75);
    changeHour(value);
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

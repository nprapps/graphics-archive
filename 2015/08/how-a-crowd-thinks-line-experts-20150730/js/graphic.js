
var averageWeight =  [
1343.12,
1294.5294,
1248.2264,
1221.9393,
1231.9149,
1224.8493,
1229.7182,
1224.4133,
1233.7477,
1269.2763,
1275.0529,
1272.2541,
1269.0555,
1256.4545,
1255.4771,
1259.8588,
1257.7376,
1252.5008,
1259.0219,
1254.4183,
1271.1321,
1271.7907,
1269.5855,
1266.8506,
1265.3082,
1265.8593,
1263.6148,
1261.3933,
1260.3467,
1279.3117,
1279.813,
1278.8717,
1276.3884,
1276.1736,
1275.187,
1275.6845,
1275.4733,
1275.1621,
1274.9257,
1273.7925,
1273.7003,
1272.6644,
1272.0011,
1271.8693,
1272.4974,
1272.3482,
1272.3274,
1271.9077,
1271.5671,
1272.7064,
1272.8278,
1272.8278,
1272.4643,
1272.9438,
1272.9554,
1273.4375,
1273.1795,
1272.9474,
1272.8605,
1272.6993,
1272.7182,
1272.7182,
1272.3415,
1272.2493,
1272.868,
1272.5193,
1272.7117,
1272.8528,
1271.7709,
1272.1022,
1271.6592,
1271.4288,
1271.4896,
1271.5808,
1271.8889,
1271.323,
1271.0957,
1271.1419,
1271.4398,
1271.5768,
1271.5521,
1271.6326,
1271.8264,
1271.7688,
1271.7688,
1271.7688,
1271.8718,
1271.5215,
1272.2328,
1271.8837,
1273.8833,
1275.5419,
1274.7973,
1274.6265,
1273.0766,
1272.7619,
1275.9175,
1275.948,
1275.1985,
1276.3215,
1276.7902,
1274.5336,
1274.0815,
1272.8374,
1273.0518,
1272.7975,
1273.0287,
1272.8713,
1272.9505,
1272.6582,
1272.8489,
1272.4908,
1272.3935,
1271.8457,
1272.7424,
1272.4293,
1272.42]

var timeRawDay = ["Fri. 3 PM",
"Fri 4 PM",
"Fri 5 PM",
"Fri 6 PM",
"Fri 7 PM",
"Fri 8 PM",
"Fri 9 PM",
"Fri 10 PM",
"Fri 11 PM",
"Sat 12 AM",
"Sat 1 AM",
"Sat 2 AM",
"Sat 3 AM",
"Sat 4 AM",
"Sat 5 AM",
"Sat 6 AM",
"Sat 7 AM",
"Sat 8 AM",
"Sat 9 AM",
"Sat 10 AM",
"Sat 11 AM",
"Sat 12 PM",
"Sat 1 PM",
"Sat 2 PM",
"Sat 3 PM",
"Sat 4 PM",
"Sat 5 PM",
"Sat 6 PM",
"Sat 7 PM",
"Sat 8 PM",
"Sat 9 PM",
"Sat 10 PM",
"Sat 11 PM",
"Sun 12 AM",
"Sun 1 AM",
"Sun 2 AM",
"Sun 3 AM",
"Sun 4 AM",
"Sun 5 AM",
"Sun 6 AM",
"Sun 7 AM",
"Sun 8 AM",
"Sun 9 AM",
"Sun 10 AM",
"Sun 11 AM",
"Sun 12 PM",
"Sun 1 PM",
"Sun 2 PM",
"Sun 3 PM",
"Sun 4 PM",
"Sun 5 PM",
"Sun 6 PM",
"Sun 7 PM",
"Sun 8 PM",
"Sun 9 PM",
"Sun 10 PM",
"Sun 11 PM",
"Mon 12 AM",
"Mon 1 AM",
"Mon 2 AM",
"Mon 3 AM",
"Mon 4 AM",
"Mon 5 AM",
"Mon 6 AM",
"Mon 7 AM",
"Mon 8 AM",
"Mon 9 AM",
"Mon 10 AM",
"Mon 11 AM",
"Mon 12 PM",
"Mon 1 PM",
"Mon 2 PM",
"Mon 3 PM",
"Mon 4 PM",
"Mon 5 PM",
"Mon 6 PM",
"Mon 7 PM",
"Mon 8 PM",
"Mon 9 PM",
"Mon 10 PM",
"Mon 11 PM",
"Tues 12 AM",
"Tues 1 AM",
"Tues 2 AM",
"Tues 3 AM",
"Tues 4 AM",
"Tues 5 AM",
"Tues 6 AM",
"Tues 7 AM",
"Tues 8 AM",
"Tues 9 AM",
"Tues 10 AM",
"Tues 11 AM",
"Tues 12 PM",
"Tues 1 PM",
"Tues 2 PM",
"Tues 3 PM",
"Tues 4 PM",
"Tues 5 PM",
"Tues 6 PM",
"Tues 7 PM",
"Tues 8 PM",
"Tues 9 PM",
"Tues 10 PM",
"Tues 11 PM",
"Wed  12 AM",
"Wed  1 AM",
"Wed  2 AM",
"Wed  3 AM",
"Wed  4 AM",
"Wed  5 AM",
"Wed  6 AM",
"Wed  7 AM",
"Wed  8 AM",
"Wed  9 AM",
"Wed  10 AM",
"Wed  11 AM",
"Wed  12 PM",
"Wed  1 PM"]

var numberOfDays = {    "Friday" : "Start Day",
                        "Saturday" : "1 Day",
                        "Sunday" : "2 Days",
                        "Monday" : "3 Days",
                        "Tuesday" : "4 Days",
                        "Wednesday" : "5 Days"}

var dayShort = ["Friday",
"Friday",
"Friday",
"Friday",
"Friday",
"Friday",
"Friday",
"Friday",
"Friday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Saturday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Sunday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Monday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Tuesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday",
"Wednesday"]

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
    averageWeight,
    highlightLine,
    areas;

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};



var isLoaded = false;

var TOGGLE_WIDTH = 85;
var SLIDER_HEIGHT = 30;
var SLIDER_OFFSET = {
    top: 65,
    right: (TOGGLE_WIDTH + 10),
    bottom: 0,
    left: -12
};

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
for (var i = 1; i <= 116; i++) {
    if (i%1 == 0) {
        hourLabels.push(i);
    }
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

    counter = 0
    var dateColumn = 'range';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 4;
    var aspectHeight = isMobile ? 3 : 3;

    var margins = {
        top: 25,
        right: 75,
        bottom: 130,
        left: 50
    };

    var ticksX = 8;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['right'] = 25;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

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
    x = d3.scale.linear()
        .domain([ startValue, endValue ])
        .range([0, chartWidth  - SLIDER_OFFSET['right'] ])
        .clamp(true);

    var xScale = d3.scale.linear()
        .domain([0,2500])
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([0,900])
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
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d, i) {
          return fmtComma(d) + " pounds"
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickValues([0,100,200,300,400,500,600,700,800,900])        
        .ticks(ticksY);
        // .tickFormat(function(d, i) {
        // if (isMobile) {
        //     return d + " votes";
        // } else {
        //     return fmtYearFull(d);
        // }
        // });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight+5))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .attr('transform', makeTranslate(-8,0))        
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
        // .attr('transform', makeTranslate(-15, chartHeight))        
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' ' + classify(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            })
        .attr('opacity', 0);


    highlightLine = chartElement.append('g')
        .attr('class', 'highlight-lines')
        .selectAll('path')
        .data(d3.entries(formattedData).filter(function(d){return d['key'] =="hour-" + hourLabels[0]}))
        .enter()
        .append('path')
        .attr('class', 'highlight-line')
        .attr('d', function(d) {
            return line(d['value']);
        });


    chartElement
        .append('text')
        .attr('class','slider-label')
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(' + chartWidth/2 + ',' + ( chartHeight +  SLIDER_OFFSET['top']) + ')')
        .attr('dy', 50)
        .attr('dx', -20)
        .text('Time After We First Posted The Poll')    
    
    chartElement
        .append('text')
        .attr('class','axis')
        .attr('x', xScale(-150))
        .attr('y', yScale(900))
        .attr('dy', -10)        
        .attr('text-anchor', 'start')
        .text('Number Of Expert Guesses')

    dayLabel = chartElement
        .append('text')
        .attr('class','day-label')
        .attr('x', xScale(1650))
        .attr('y', yScale(750))
        .attr('text-anchor', 'start')
        .text('After 1 Day');
        // .text('Friday')
    
    averageLabel = chartElement
        .append('text')
        .attr('class','average-label')
        .attr('x', xScale(1650))
        .attr('y', yScale(750))
        .attr('dy', 20)
        .attr('text-anchor', 'start')
        .text("Average Guess: 1358 lbs")

    sliderBrush = d3.svg.brush()
        .x(x)
        .extent([startValue,endValue])
        .on('brush', onBrushed);

    var sliderBar = chartElement.append('g')
        .attr('class', 'xbar')
        .append('line')
        .attr('transform', 'translate('+ SLIDER_OFFSET['left'] + ',' + ( chartHeight +  SLIDER_OFFSET['top']) + ')')
        .attr('x1', x(startValue))
        .attr('x2', x(endValue));

    var sliderBarHalo = chartElement.append('g')
        .attr('class', 'xbar-halo')
        .append('line')
        .attr('transform', 'translate(' + SLIDER_OFFSET['left'] + ',' + ( chartHeight +  SLIDER_OFFSET['top']) + ')')
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
                .ticks(40)
                // .tickFormat(function(d,i) {
                //     if (i%4==0) {
                //         return dayShort[d]
                //     }
                // })
                .tickFormat(function(d,i) {
                    if (i%4==0) {
                        return numberOfDays[dayShort[d]]
                    }
                })
            )                                
        .attr('transform', 'translate('+ SLIDER_OFFSET['left'] + ',' + ( chartHeight +  SLIDER_OFFSET['top']) + ')')
        .call(sliderBrush);


    slider.append('text')
          .attr('id','hour-label')
          .attr('text-anchor', 'middle')
          // .attr('transform', 'translate(0,' + chartHeight + ')')
          .attr('dy', -14)
          .text("After " + startValue + " Hours");

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
    toggle = $('<div id="toggle"><div id="btn-play"><i class="fa fa-play"></i> Play</div><div id="btn-pause"><i class="fa fa-pause"></i> Pause</div></div>').css({
        'top' : chartHeight + SLIDER_OFFSET['top'] + 5,
        'right': '60px',
        'bottom': '10px',
        'width': TOGGLE_WIDTH + 'px'
    });
    $('.graphic-wrapper').append(toggle);
    
    $pauseButton = $('#btn-pause');
    $playButton = $('#btn-play');
    
    $pauseButton.on('click', onPauseClicked);
    $playButton.on('click', onPlayClicked);
    $playButton.hide();
    

    // get things going
    startAnimation();
    
    isLoaded = true;

}

var updateArea = function(number) {
    d3.select('.line.hour-' + number)
        .attr('opacity', .7).moveToFront();

    highlightLine
        .data(d3.entries(formattedData).filter(function(d){return d['key'] =="hour-" + number }))
        .transition()
        .duration(100)
        .attr('d', function(d) {
                return line(d['value']);
        });

}

var changeHourLabel = function(hour) {

    d3.select('#hour-label')
        .attr('x', x(hour))
        .text("After " + hour + " Hours");

    
    if (numberOfDays[dayShort[hour]] == "Start Day") {
        dayLabel.text(numberOfDays[dayShort[hour]]).moveToFront();
    } else {
        dayLabel.text('After ' +  numberOfDays[dayShort[hour]]).moveToFront();    
    }
        
        // .text(dayShort[hour]);    
    averageLabel
        .text("Average Guess: " + fmtComma(Math.round(averageWeight[hour],0)) + " lbs");
}

var onPauseClicked = function() {
    pauseAnimation();
}
var onPlayClicked = function() {
    if (counter == 116) {
        // pauseAnimation();
        d3.selectAll('.line').attr('opacity', 0)
        counter = 0;
    }

    startAnimation();
}

var changeHour = function(hour) {
    changeHourLabel(hour);
    selectedHour = hour;
    updateArea(hour);
}

var startAnimation = function() {
    isAnimating = true;
    animationTimer = setInterval(function() {
        var hour = hourLabels[counter];
        changeHour(hour)
        counter++;
        if (counter == 116) {
            pauseAnimation();
            // d3.selectAll('.line').attr('opacity', 0)
            counter = 0;
        }
        sliderHandle.attr('x', x(hour) - 75);
    },50);
    $playButton.hide();
    $pauseButton.show();
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

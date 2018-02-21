// global vars
var $graphic = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'genderpay.csv';
var GRAPHIC_DEFAULT_WIDTH = 624;
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

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var pctFormat = d3.format(".0%");
var ageFormat = d3.format("2d");
var bornLabel;
var value;
var annotationData;
var ticksX;
var ticksY;
var containerWidth;
var x;
var y;

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
  this.parentNode.appendChild(this);
  });
};

/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;
            graphicData.forEach(function(d) {
                d['date'] = +d['date'];
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
    var aspectHeight;
    var aspectWidth;
    var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3'], colors['orange3'], colors['teal3'] ]);
    var graph = d3.select('#graphic');
    var margin = { 
    	top: 55, 
    	right: 30, 
    	left: 80,
        bottom: 60 
    	
    };

    // params that depend on the container width 
    if (isMobile) {
        aspectWidth = 3;
        aspectHeight = 3;
        ticksX = 5;
        ticksY = 5;
    } else {
        aspectWidth = 3;
        aspectHeight = 3;
        ticksX = 10;
        ticksY = 10;
    }

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = 450;

        x = d3.scale.linear()
        .range([ 0, width ])

        y = d3.scale.linear()
        .range([ height, 0 ]);

    var xAxisTop = d3.svg.axis()
        .scale(x)
        .orient('top')
        .ticks(ticksX);
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX);
        // .tickFormat(ageFormat);

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .tickFormat(pctFormat)
        .ticks(ticksY);

    var yAxisGrid = function() {
        return yAxis;
    }

    if (width <= 624) {
        num_x_ticks = 10;
    }
    if (width <= 400) {
        num_x_ticks = 5;
    }
    // define the line(s)
    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) { 
            return x(d['date']);
        })
        .y(function(d) { 
            return y(d['amt']);
        })
        .defined(function(d) { return d.y != "" ; });

    // assign a color to each line
    color.domain(d3.keys(graphicData[0]).filter(function(key) { 
        return key !== 'date';
    }));

    // parse data into columns
    var formattedData = {};
    for (var column in graphicData[0]) {
        if (column == 'date') continue;
        formattedData[column] = graphicData.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
// filter out empty data. uncomment this if you have inconsistent data.
       }).filter(function(d) {
           return d['amt'].length > 0;
        });
    }

    x.domain(d3.extent(graphicData, function(d) { 
        return d['date'];
    }));

    y.domain([-.6,0])

    // draw the chart
    var svg = graph.append('svg')
		.attr('width', width + margin['left'] + margin['right'])
		.attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        // .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisTop);


    svg.append("linearGradient")
      .attr("id", "temperature-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", y(-.15))
      .attr("x2", 0).attr("y2", y(-.5))
    .selectAll("stop")
      .data([
        {offset: "0%", color: "#42ffb1"},
        {offset: "50%", color: "#00C9BD"},
        {offset: "100%", color: "#00433f"}
      ])
    .enter().append("stop")
      .attr("offset", function(d) { return d.offset; })
      .attr("stop-color", function(d) { return d.color; });

    // y-axis (left)
    var yAxisAppend = svg.append('g')
        .attr('class', 'y axis')
        .attr('transform', 'translate(-10,0)')        
        .call(yAxis);
    
    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );
    
    // y-axis gridlines
    svg.append('g')         
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );
    
    // draw the line(s)
    svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')       
            .attr('class', function(d, i) {
                return 'line line-' + classify(d['key']);
            })
            // .attr('stroke', function(d) {
            //     return color(d['key']);
            // })
            .attr('d', function(d) {
                return line(d['value']);
            })
            .attr('data-year', function(d,i) {
                return d['value']['date'];
            })
            .attr('data-amt', function(d,i) {
                return d['value']['amt'];
            });

    yAxisAppend = svg.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', 0)         
        .attr('y', 0)
        .attr('dy', -33)
        .attr('dx', -65)
        .attr('text-anchor', 'right')
        .text('Pay Gap')

    svg.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', x(45))         
        .attr('y', y(0))
        .attr('dy', -33)
        .attr('text-anchor', 'middle')
        .text('Age')

    svg.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', x(45))         
        .attr('y', y(-.6))
        .attr('dy', 40)
        .attr('text-anchor', 'middle')
        .text('Year')         

    update(1943)

    var data = d3.select(".line-1943").datum();
    var annotation = annote(data,1943);
    var line = $('<div class = "annotation">' + annotation + '</div>')
            .css({
                'left': '25%',
                'top': '25%'
            });
   $graphic.append(line)

    var axisDiv = $('<div class = year-axis></div')
                    .css({
                        'left': '12%',
                        'top': '90%'
                    });

    $graphic.append(axisDiv);
    yearAxis(1943)

    if (isMobile) {
        $('.born-label').css('margin-top', '-33px')
    } else {
        $('.born-label').css('margin-top', '-22px')
    }
}

// Update the width attributes
function update(value) {

    yearAxis(value)
    var data = d3.select(".line-" + value ).datum();
    var annotation = annote(data,value);
    
    var line = $('<div class = "annotation">' + annotation + '</div>')
            .css({
                'left': '25%',
                'top': '25%'
            });

    $('.annotation').replaceWith(line)

    d3.select("#birth-value").text(value);
    d3.selectAll('.line').classed('selected', false);
    d3.selectAll(".line-" + value).classed('selected', true).moveToFront();

    d3.selectAll(".slider-ticks").classed('tick-label-selected', false)
    d3.selectAll(".tick-" + value).classed('tick-selected', true)
    d3.selectAll(".tick-label-" + value).classed('tick-label-selected', true)
}

function yearAxis(year) {
    var axisCss = {'top': '90%'};    
    var vals = (isMobile) ? ticksX-2 : ticksX-4;
    var date = year + 30
    var axisDiv = $('<div class = year-axis></div')
                    .css({
                        'left': '0%',
                        'top': '87%'
                    });

    $('.year-axis').replaceWith(axisDiv);

    for (var i = 0; i <= vals; i++) {
        var moveRight =  (isMobile) ? x(i*10+30)+65 : x(i*5+30)+65;
        // var moveRight = (isMobile) ? (i/vals*105) : (i/vals*104)
        var axis = $('<p class = "year-label label-' + (i*5 + date) + '">' + (i*5 + date) + '</p>').css('left', moveRight + 'px');
        $('.year-axis').append(axis);
    }
        
}

function annote(data, date) {

    if (date < 1953) { 
            var note = '<b>Women born in ';
            note += date;
            note += " made</b>: <ul><li> <span>";
            note += pctFormat(-1*data['value'][0]['amt']);
            note += " less</span> than men at <span> age ";
            note += data['value'][0]['date'];
            note += "</span></li> <li> <span>";
            note += pctFormat(-1*data['value'][3]['amt']);
            note += " less</span> than men at <span> age ";
            note += data['value'][3]['date'];
            note += " </span> </li> <li> <span>";
            note += pctFormat(-1*data['value'][7]['amt']);
            note += " less</span> than men at <span> age ";
            note += data['value'][7]['date'];
            note += "</span>.</li> </ul>";
    } else if (date >= 1953 && date < 1973) {
            var note = '<b>Women born in ';
            note += date;
            note += " made</b>: <ul><li> <span>";
            note += pctFormat(-1*data['value'][0]['amt']);
            note += " less</span> than men at <span> age ";
            note += data['value'][0]['date'];
            note += "</span></li> <li> <span>";
            note += pctFormat(-1*data['value'][3]['amt']);
            note += " less </span> than men at <span> age ";
            note += data['value'][3]['date'];
            note += "</span>.</li> </ul>";
    } else if (date >= 1973) {
            var note = '<b>Women born in ';
            note += date;
            note += " made</b>: <ul><li> <span>";
            note += pctFormat(-1*data['value'][0]['amt']);
            note += " less</span> than men at <span> age ";
            note += data['value'][0]['date'];
            note += "</span>.</li> </ul>";
    }
    return note;

}



$(function() {
    
    $( "#slider" ).slider({
        // range: 'min',
        max: 1978,
        min: 1943,
        step: 5,
        value: 1943,
        animate: true,
        slide: function (event, ui) {
            value = ui.value;
            update(value);
        }                   
    })
    .each(function() {
        var opt = $(this).data().uiSlider.options;
        var vals = 7;

        for (var i = 0; i <= vals; i++) {
            var el = $('<label data = "'+ (i/vals*100)+ '%" class = "slider-ticks tick-label-' + (i*5 + opt.min) + '">' + (i*5 + opt.min) + '</label>').css('left', (i/vals*100) + '%');
            var elTick = $('<span class="slider-ticks ui-slider-tick-mark tick-' + (i*5 + opt.min) +  ' "></span>').css('left', (i/vals*100) + '%');
            $("#slider").append(el);
            $("#slider").append(elTick);

        }
        bornLabel = $('<label class = "born-label small"> Drag the slider to see how the pay gap changes according to birth year.</label>' ).css('left', '0%');
        $("#slider").append(bornLabel);    
        $("#slider").append(bornLabel);    
    })

    // $('#slider').css('width', containerWidth)
});


var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

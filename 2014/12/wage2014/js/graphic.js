// global vars
var $graphic = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'scatter-wage-jobs3.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 624;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var variablesNames = [ 'Wages Fell', 'Wages Stagnated', "Wages Grew"];


// var sizeLegend = 
var graphicData = null;
var isMobile = false;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(GRAPHIC_DATA_URL, function(error, data) {
            graphicData = data;
            graphicData.forEach(function(d) {
                d['size'] = +d['size'];
                d['wage'] = +d['wage'];
                d['wage_chg'] = +d['wage_chg'];
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
    var color = d3.scale.ordinal().range([ colors['red3'], colors['yellow3'], colors['teal3']]);
    // draw the legend
    var legend = d3.select('#graphic')
        .append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(variablesNames)
            .enter().append('li')
                .attr('class', function(d, i) { 
                    return 'key-item key-' + i + ' ' + classify(d);
                });
    legend.append('b')
        .style('background-color', function(d,i) {
            return color(d);
        });
    legend.append('label')
        .text(function(d) {
            return d;
        });

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeightToParent();
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
    var marginLeft = (isMobile) ? 30 : 90;
    var margin = { 
    	top: 20, 
    	right: 30, 
    	bottom: 50, 
    	left: marginLeft
    };
    var ticksX;
    var ticksY;
    var largeLegendBubblePosY = (isMobile) ? 14 : 13.7;
    var smallLegendBubblePosY = (isMobile) ? 12.5 : 12.3;
    var largeBubbleLabelPosY = (isMobile) ? 0 : -33;
    var smallBubbleLabelPosY = (isMobile) ? 0 : -13;
    var yaxisLabelPosX = (isMobile) ? -2.7 : -2.4;

    var zeroY = (isMobile) ? 8 : 9; 
    var labelSize = (isMobile) ? '10px' : '12px'; 
    var scaleFactor = (isMobile) ? 5 : 2.5; 
    if (isMobile) {
        aspectWidth = 3;
        aspectHeight = 5;
        ticksX = 5;
        ticksY = 5;
    } else {
        aspectWidth = 3;
        aspectHeight = 4;
        ticksX = 10;
        ticksY = 10;
    }

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((graphicWidth * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];

    var x = d3.scale.linear()
        .range([ 0, width ])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d,i) {
            return d + '%';                
        });  

    var xAxisTop = d3.svg.axis()
        .scale(x)
        .orient('top')
        .ticks(ticksX)
        .tickFormat(function(d,i) {
            return d + '%';                
        });        

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickFormat(function(d,i) {
            return '$' +  d ;                
        });        


    var yAxisGrid = function() {
        return yAxis;
    }

    // // assign a color to each line
    // color.domain(d3.keys(graphicData[0]).filter(function(key) { 
    //     return key !== 'date';
    // }));

    // parse data into columns
    var formattedData = {};
    for (var column in graphicData[0]) {
        if (column == 'date') continue;
        formattedData[column] = graphicData.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }
    
    // set the data domain
    // x.domain(d3.extent(graphicData, function(d) { 
    //     return d['wage'];
    // }));
    y.domain([10,35]);
    x.domain([-2,2]);


    // draw the chart
    var svg = graph.append('svg')
		.attr('width', width + margin['left'] + margin['right'])
		.attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
            
    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);
            // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        // .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisTop);

    // y-axis (left)
    svg.append('g')
        .attr('class', 'y axis')
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

    svg.append("line")
      .attr("class", "zero-wage")
      .attr("y1", y(10))
      .attr("y2", y(40))
      .attr("x1", x(0))
      .attr("x2", x(0));

    svg.append('g')         
    .attr('class', 'plots')    
    .selectAll(".point")
      .data(graphicData)
    .enter().append("circle")
      .attr("class", "point")
      .attr("r", function(d) { return Math.sqrt(d['size'])/scaleFactor; })
      .attr("cy", function(d) { return y(d['wage']); })
      .attr("cx", function(d) { return x(d['wage_chg']); })
      .style('fill', function(d) {
            if (d['wage_chg'] > .5) {
                return colors['teal3'];
            } else if (d['wage_chg'] <= .5 && d['wage_chg'] >= -.5){
                return colors['yellow3'];
            } else {                
                return colors['red3'];
            }
      });

    svg.append('g')         
    .attr('class', 'plots')
    .selectAll(".small-point")
      .data(graphicData)
    .enter().append("circle")
      .attr("class", "small-point")
      .attr("r", function(d) { return 1; })
      .attr("cy", function(d) { return y(d['wage']); })
      .attr("cx", function(d) { return x(d['wage_chg']); });

      // .style("fill", function(d) { return color(d.species); });

    svg.append('g')
    .attr('class', 'labels')
    .selectAll("industry-label")
      .data(graphicData)
    .enter().append("text")
      .attr("class", function(d) {return "industry-label " + classify(d['industry'])})
      .attr("y", function(d) { return y(d['wage']); })
      .attr("x", function(d) { return x(d['wage_chg']); })
      .attr("dy", -3)
      .text(function(d) {return d['industry']})
      .style('font-size', labelSize)
      .attr('text-anchor', function(d) {
            if (d['wage_chg'] >= 0) {
                return 'start';
            } else {
                return 'end';
            }
      });      


    svg.append('g')
    .attr('class', 'xaxis-label')
    .append("text")
      .attr("class", "x axis")
      .attr("y", function(d) { return y(zeroY); })
      .attr("x", function(d) { return x(0); })
      .attr("text-anchor", 'middle')
      .text("Wage Growth (Or Decline)");    
    
if (!isMobile) {
    d3.select('.y.axis')
    .append("text")
      .attr("class", "y axis label")
      .attr("y", function(d) { return y(22.5); })
      .attr("x", function(d) { return x(yaxisLabelPosX); })
      // .attr("x", function(d) { return x(yaxisLabelPosX); })
      .attr("text-anchor", 'middle')
      .text("Average Hourly Earnings")
      .attr('transform', 'rotate(-90,' +  x(yaxisLabelPosX) + "," + y(22.5)+ ')');
    }

    svg.append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + width*.15 + ',' + height*.8 + ')')  
        .append('circle')
        .attr('cx', 0)  
        .attr('cy', 35)  
        .attr("r",  Math.sqrt(25000)/scaleFactor);

    
    d3.select('.legend').append('circle')
        .attr('cx', 0)  
        .attr('cy', 50)  
        .attr("r",  Math.sqrt(5000)/scaleFactor);

    d3.select('.legend').append("text")
      .attr('class', 'legend-labels')
      .attr("x", 0)
      .attr("y", 0)
      .attr("dy", largeBubbleLabelPosY)      
      .style('font-size', labelSize)      
      .attr("text-anchor", 'middle')
      .text("25 Million Jobs"); 
  
    d3.select('.legend').append("text")
      .attr('class', 'legend-labels')
      .attr("x", 0)
      .attr("y", 30)
      .attr("dy", smallBubbleLabelPosY)
      .style('font-size', labelSize)      
      .attr("text-anchor", 'middle')
      .text("5 Million Jobs");        

    d3.select('.industry-label.leisure-and-hospitality')
        .attr('dx', 1)
        .attr('dy', -5)
        .attr('text-anchor', 'end');    

    d3.select('.industry-label.education-and-health-care')
        .attr('dx', 10)
        .attr('dy', 10);

        d3.select('.industry-label.mining--drilling-and-logging')        
            .attr('dx', -45)
            .attr('dy', -10)
if (isMobile) {            
        d3.select('.industry-label.mining--drilling-and-logging')    
            .text('Drilling and Logging')
            // .attr('text-anchor', 'end');
    }
}


/*
 * HELPER FUNCTIONS
 */
var proper = function(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});

}
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/[\s|,]|\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
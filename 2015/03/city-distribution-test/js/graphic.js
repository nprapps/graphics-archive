// global vars
var $graphic = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'city-data-final.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 540;
var BAR_GAP = 15;
var BAR_HEIGHT = 14;

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
                d['city'] = d['city'];
                d['p25_city'] = +d['p25_city'];
                d['p50_city'] = +d['p50_city'];
                d['p75_city'] = +d['p75_city'];
            });

            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
}



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

var drawGraph = function(width) {
    // clear out existing graphics
    $graphic.empty();

    var commasFormatter = d3.format(",.0f");
    var num_bars = graphicData.length;

    if (width <= MOBILE_THRESHOLD) {
        var dotsize = 10;
        var tick_count = 4
        var margin = {
            top: 30,
            right: 20,
            bottom: 35,
            left: 95
        };
    } else {
        var dotsize = 18;
        var tick_count = 6;
        var margin = {
            top: 30,
            right: 20,
            bottom: 35,
            left: 120
        };
    }

    var width = width - margin.left - margin.right;
    var height = ((BAR_HEIGHT + BAR_GAP) * num_bars);
                
    x = d3.scale.linear()
        .range([0, width])

    y = d3.scale.ordinal()
        .rangeRoundBands([0, height], .2);
        
    x.domain([0,200000]);
    y.domain(graphicData.map(function(d) {
        return d['city'];
    }));

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('top')
        .ticks(tick_count)
        .tickFormat(function(d) { return '$' + commasFormatter(d/1000) + 'k' });

    var xAxis2 = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(tick_count)
        .tickFormat(function(d) { return '$' + commasFormatter(d/1000) + 'k' });

    x_axis_grid = function() { return xAxis; }
        
    svg = d3.select('#graphic').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('class','base')
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

       // var xaxisCall =  svg.append('g')
       //      .attr('class', 'x axis')
       //      .attr('transform', 'translate(0,-30)')
       //      .call(xAxis);

    var xaxisCall2 =  svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis2);

    svg.append('g')
        .attr('class', 'x grid')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    var rangeLine = svg.append('g')
        .attr('class','rangeline')
        .selectAll('.point75')            
            .data(graphicData)
        .enter().append('line')
            .attr('class', 'rangeLine')
            .attr('r', dotsize)
            .attr('x1', function(d) { return x(d['p25_city']); })
            .attr('x2', function(d) { return x(d['p75_city']); })
            .attr('y1', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP) + 8; })
            .attr('y2', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP) + 8; })
            // .style('fill', '#e8ff2e')
            .style('fill', '#ccc')
            .style('stroke', '#ccc')
            .style('stroke-width', function(d) {return width < MOBILE_THRESHOLD ? '1' : '2'});                

    var p25Point = svg.append('g')
        .attr('class','p25Points')
        .selectAll('.point25')
            .data(graphicData)
        .enter().append('circle')
            .attr('class', function(d) {
                    return 'point25 ' + classify(d['city-abbrev'])
                })
            .attr('r', dotsize)
            .attr('cx', function(d) { return x(d['p25_city']); })
            .attr('cy', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP) + 8; })
            // .style('font-size', colors['teal5'])
            .style('stroke', '#fff')
            .style('fill', '#fff')
            .style('stroke-width', function(d) {return width < MOBILE_THRESHOLD ? '1' : '1.5'});

    var p25Label = svg.append('g')
        .attr('class','p25Labels')
        .selectAll('.label25')
            .data(graphicData)
        .enter().append('text')
            .attr('class', function(d) {
                return 'text25 ' + classify(d['city-abbrev'])
            })
            .attr('r', dotsize)
            .attr('x', function(d) { return x(d['p25_city']); })
            .attr('y', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP) + 8; })
            .text(function(d) { 
                if (isMobile) {
                    return '$' + Math.round(d['p25_city']/1000); 
                } else {
                    return '$' + Math.round(d['p25_city']/1000) + 'k'; 
                }
            })                    
            .attr('text-anchor', 'middle')
            .style('fill', colors['teal5'])
            .style('font-weight', 'bold')
            .attr('dy', 3)
            .style('opacity', 1);
            // .style('stroke-width', function(d) {return width < MOBILE_THRESHOLD ? '1' : '1.5'});

    var p50Point = svg.append('g')
        .attr('class','p50Points')
        .selectAll('.point50')            
            .data(graphicData)
        .enter().append('circle')
            .attr('class', function(d) {
                return 'point50 ' + classify(d['city-abbrev'])
            })
            .attr('r', dotsize)
            .attr('cx', function(d) { return x(d['p50_city']); })
            .attr('cy', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP) + 8; })
            // .style('fill', colors['yellow6'])
            // .style('stroke', colors['yellow5'])
            .style('stroke', '#fff')
            .style('fill', '#fff')
            .style('stroke-width', function(d) { return width <= MOBILE_THRESHOLD ? '1' : '1.5'});

    var p50Label = svg.append('g')
        .attr('class','p50Labels')
        .selectAll('.label50')
            .data(graphicData)
        .enter().append('text')
            .attr('class', function(d) {
                return 'text50 ' + classify(d['city-abbrev'])
            })
            .attr('r', dotsize)
            .attr('x', function(d) { return x(d['p50_city']); })
            .attr('y', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP) + 8; })
            .text(function(d) {
                var amt = '$' + Math.round(d['p50_city']/1000);
                if (!isMobile) {
                    amt += 'k';
                }
                return amt;
            })                    
            .style('fill', colors['teal3'])
            .style('font-weight', 'bold')
            .attr('dy', 3)
            .attr('text-anchor', 'middle')
            .style('opacity', 1);

    var p75Point = svg.append('g')
        .attr('class','p75Points')
        .selectAll('.point75')            
            .data(graphicData)
        .enter().append('circle')
            .attr('class', function(d) {
                return 'point75 ' + classify(d['city-abbrev'])
            })
            .attr('r', dotsize)
            .attr('cx', function(d) { return x(d['p75_city']); })
            .attr('cy', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP) + 8; })
            // .style('stroke', colors['teal5'])
            .style('stroke', '#fff')
            .style('fill', '#fff')
            .style('stroke-width', function(d) {return width < MOBILE_THRESHOLD ? '1' : '1.5'})             
            // .on('mouseover', mouseover);

    var p75Label = svg.append('g')
    .attr('class','p75Labels')
    .selectAll('.label75')
        .data(graphicData)
    .enter().append('text')
        .attr('class', function(d) {
            return 'text75 ' + classify(d['city-abbrev'])
        })
        .attr('r', dotsize)
        .attr('x', function(d) { return x(d['p75_city']); })
        .attr('y', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP) + 8; })
        .text(function(d) { 
            if (isMobile) {
                return '$' + Math.round(d['p75_city']/1000); 
            } else {
                return '$' + Math.round(d['p75_city']/1000) + 'k'; 
            }
        })                    
        .style('fill', colors['teal1'])
        .attr('dy', 3)
        .style('font-weight', 'bold')
        .attr('text-anchor', 'middle')
        .style('opacity', 1);              

    var legendLabel25 = svg.append('text')
        .attr('class', 'textlabel legend25')
        .attr('x', function(d) { return x(34000); })
        .attr('y', function(d, i) { return 0 * (BAR_HEIGHT + BAR_GAP) + 8; })
        .attr('dy', -18)
        // .attr('dx', 10)
        .attr('text-anchor', 'middle')
        .text('25%')
 
    var legendLabel50 = svg.append('text')
        .attr('class', 'textlabel legend25')
        .attr('x', function(d) { return x(63500); })
        .attr('y', function(d, i) { return 0 * (BAR_HEIGHT + BAR_GAP) + 8; })
        .attr('dy', -18)
        // .attr('dx', 20)
        .attr('text-anchor', 'middle')
        .text('Median')

    var legendLabel75 = svg.append('text')
        .attr('class', 'textlabel legend25')
        .attr('x', function(d) { return x(106800); })
        .attr('y', function(d, i) { return 0 * (BAR_HEIGHT + BAR_GAP) + 8; })
        .attr('dy', -18)
        // .attr('dx', 10)
        .attr('text-anchor', 'middle')
        .text('75%')
      
    var cityLabels = svg.append('g')
        .attr('class', 'labels')
        .selectAll('text')
            .data(graphicData)
        .enter().append('text')
            .attr('x', '0')
            .attr('y', function(d, i) { return i * (BAR_HEIGHT + BAR_GAP); })
            .attr('dy', 10)
            .attr('dx', -11)
            .attr('text-anchor', 'end')
            .attr('class', function(d) { return 'label ' + classify(d['city-abbrev']) })
            .text(function(d) { return d['city-abbrev']});    

    // label adjustments
    if (isMobile) {
        $('#thousandsLabel').show();
        legendLabel50
            .style('font-size', '9px')
            // .attr('dx', '5px')
        legendLabel25
            .style('font-size', '9px');
            // .attr('dx', '-3px')
        legendLabel75
            .style('font-size', '9px') 
            // .attr('dx', '20px')                                   
        p25Label
            .style('font-weight', 'normal')
            .attr('dx', '-5px')
        p50Label
            .style('font-weight', 'normal')
        p75Label
            .style('font-weight', 'normal')

        splitLabel('elpasotexas', 'El Paso,', 'Texas', 7);
        splitLabel('jacksonvillefla', 'Jacksonville,', 'Fla.', 15);
        splitLabel('nashvilletenn', 'Nashville,', 'Tenn.', 19);
        splitLabel('washingtondc', 'Washington,', 'D.C.', 26);
        splitLabel('sanjosecalif', 'San Jose,', 'Calif.*', 30);
    } else {
        $('#thousandsLabel').hide();
    }
    splitLabel('coloradosprings', 'Colorado', 'Springs, Colo.*', 23);
}


/*
 * Helper functions
 */
function classify(str) { // clean up strings to use as CSS classes
    return str.replace(/\W+/g, '').toLowerCase();
}

function splitLabel(full, line1, line2, id) {
    d3.select('.label.' + full).text(line1).attr('dy', '3px')
    svg.append('text')
       .attr('class', 'labels ' + classify(line2))
       .attr('x', 0)
       .attr('dy', 17)
       .attr('dx', -11)
       .attr('text-anchor', 'end')
       .attr('y', function(d, i) { return id * (BAR_HEIGHT + BAR_GAP); })
       .text(line2)
}



$(window).load(onWindowLoaded);
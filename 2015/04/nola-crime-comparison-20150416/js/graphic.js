// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

// var GRAPHIC_DATA = null; <!-- defined in child_template.html
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_GUTTER = 11;
var LABEL_WIDTH = 25;
var MOBILE_THRESHOLD = 450;
var VALUE_MIN_HEIGHT = 20;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var data_violent = null;
var data_murder = null;
var data_robbery = null;
var data_assault = null;

var isMobile = false;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        graphicD3 = d3.select('#graphic');

        GRAPHIC_DATA.forEach(function(d) {
            if (d['city'] == 'New Orleans' && d['crime'] == 'Aggravated assault') {
                data_assault = [
//                     { 'label': d3.time.format('%Y').parse('2009'), 'amt': +d['2009'] },
                    { 'label': d3.time.format('%Y').parse('2010'), 'amt': +d['2010'] },
                    { 'label': d3.time.format('%Y').parse('2011'), 'amt': +d['2011'] },
                    { 'label': d3.time.format('%Y').parse('2012'), 'amt': +d['2012'] },
                    { 'label': d3.time.format('%Y').parse('2013'), 'amt': +d['2013'] },
                    { 'label': d3.time.format('%Y').parse('2014'), 'amt': +d['2014'] }
                ];
            }

            if (d['city'] == 'New Orleans' && d['crime'] == 'Homicide') {
                data_murder = [
//                     { 'label': d3.time.format('%Y').parse('2009'), 'amt': +d['2009'] },
                    { 'label': d3.time.format('%Y').parse('2010'), 'amt': +d['2010'] },
                    { 'label': d3.time.format('%Y').parse('2011'), 'amt': +d['2011'] },
                    { 'label': d3.time.format('%Y').parse('2012'), 'amt': +d['2012'] },
                    { 'label': d3.time.format('%Y').parse('2013'), 'amt': +d['2013'] },
                    { 'label': d3.time.format('%Y').parse('2014'), 'amt': +d['2014'] }
                ];
            }

            if (d['city'] == 'New Orleans' && d['crime'] == 'Robbery') {
                data_robbery = [
//                     { 'label': d3.time.format('%Y').parse('2009'), 'amt': +d['2009'] },
                    { 'label': d3.time.format('%Y').parse('2010'), 'amt': +d['2010'] },
                    { 'label': d3.time.format('%Y').parse('2011'), 'amt': +d['2011'] },
                    { 'label': d3.time.format('%Y').parse('2012'), 'amt': +d['2012'] },
                    { 'label': d3.time.format('%Y').parse('2013'), 'amt': +d['2013'] },
                    { 'label': d3.time.format('%Y').parse('2014'), 'amt': +d['2014'] }
                ];
            }

            if (d['city'] == 'New Orleans' && d['crime'] == 'Violent crime') {
                data_violent = [
//                     { 'label': d3.time.format('%Y').parse('2009'), 'amt': +d['2009'] },
                    { 'label': d3.time.format('%Y').parse('2010'), 'amt': +d['2010'] },
                    { 'label': d3.time.format('%Y').parse('2011'), 'amt': +d['2011'] },
                    { 'label': d3.time.format('%Y').parse('2012'), 'amt': +d['2012'] },
                    { 'label': d3.time.format('%Y').parse('2013'), 'amt': +d['2013'] },
                    { 'label': d3.time.format('%Y').parse('2014'), 'amt': +d['2014'] }
                ];
            }
        });

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * RENDER THE GRAPHIC
 */
var render = function(containerWidth) {
    var graphicWidth;

    // fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = Math.floor(((containerWidth - GRAPHIC_GUTTER - LABEL_WIDTH) / 2));
    } else {
        isMobile = false;
        graphicWidth = Math.floor(((containerWidth - (GRAPHIC_GUTTER * 3) - LABEL_WIDTH) / 4));
    }

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    // (this is a separate function in case I want to be able to draw multiple charts later.)
    drawGraph(graphicWidth, data_violent, 'Violent crime');
    drawGraph(graphicWidth, data_assault, 'Aggravated assault');
    drawGraph(graphicWidth, data_robbery, 'Robbery');
    drawGraph(graphicWidth, data_murder, 'Murder');

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE GRAPH
 */
var drawGraph = function(graphicWidth, graphicData, id) {
    var aspectHeight = 6;
    var aspectWidth = 4;
    var margin = {  
        top: 5, 
        right: 5, 
        bottom: 20, 
        left: 5
    };
    
    var ticksY = 4;
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = Math.ceil((width * aspectHeight) / aspectWidth) - margin['top'] - margin['bottom'];
    
    if (id == 'Violent crime' || (isMobile && id == 'Robbery')) {
        margin['left'] = 30;
    }

    var x = d3.scale.ordinal()
        .rangeRoundBands([0, width], .1)
        .domain(graphicData.map(function(d) {
            return d['label'];
        }));
    
    var y = d3.scale.linear()
        .domain([ 0, 800 ])
        .range([height, 0]);
    
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d) {
            if (fmtYearFull(d) == '2010' || fmtYearFull(d) == '2014') {
                return '\u2019' + fmtYearAbbrev(d);
            }
        });
    
    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (id == 'Violent crime' || (isMobile && id == 'Robbery')) {
                return fmtComma(d);
            }
        });

    var y_axis_grid = function() { return yAxis; }
    
    // draw the chart itself
    var chart = graphicD3.append('div')
        .attr('class', 'chart')
        .attr('style', function(d) {
            var s = ''
            s += 'float: left; ';
            if (id == 'Violent crime' || (isMobile && id == 'Robbery')) {
                s += 'width: ' + (graphicWidth + LABEL_WIDTH) + 'px; ';
            } else {
                s += 'width: ' + graphicWidth + 'px; ';
                s += 'margin-left: ' + GRAPHIC_GUTTER + 'px;';
            }
            return s;
        });
    
    var title = chart.append('h3')
        .attr('style', function(d) {
            return 'margin-left: ' + margin['left'] + 'px; ';
        })
        .text(id);
    
    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
        
    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphicData)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['label']);
            })
            .attr('y', function(d) {
                if (d['amt'] < 0) { 
                    return y(0);
                } else {
                    return y(d['amt']);
                }
            })
            .attr('fill', function(d) {
                if (id == 'Violent crime') {
                    return colors['teal2'];
                } else {
                    return colors['teal5'];
                }
            })
            .attr('width', x.rangeBand())
            .attr('height', function(d){ 
                if (d['amt'] < 0) { 
                    return y(d['amt']) - y(0);
                } else {
                    return y(0) - y(d['amt']);
                }
            })
            .attr('class', function(d) {
                return 'bar bar-' + fmtYearAbbrev(d['label']);
            });
}


/*
 * HELPER FUNCTIONS
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

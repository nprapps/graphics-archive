// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var GRAPHIC_DATA = [
    {'label':'Extremely important','pct':54},
    {'label':'Very important','pct':35},
    {'label':'Somewhat important','pct':8},
    {'label':'Not too important','pct':1},
    {'label':'Not at all important','pct':1},
    {'label':'Don’t know/Refused','pct':1}
];

var GRAPHIC_DEFAULT_WIDTH = 600;
var BAR_MARGIN = 12;
var BAR_HEIGHT = 450;
var MOBILE_THRESHOLD = 500;
var TITLE_WIDTH = 70;
var VALUE_WIDTH = 40;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var colorD3 = d3.scale.ordinal()
    .range([ '#51a09e','#87aa89','#aeb372','#d0bc58','#efc637', '#ccc' ]);

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

        var keys = d3.keys(d3.nest()
            .key(function(d) { 
                return d['group'];
            })
            .map(GRAPHIC_DATA));
        
        var total_y0 = 0;
        GRAPHIC_DATA.forEach(function(d,i) {
            d['start'] = total_y0;
            d['stop'] = d['start'] + d['pct'];
            
            total_y0 = d['stop'];
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
 * Render the graphic
 */
function drawGraph(container_width) {
    var margin = { 
        top: 0,
        right: 15,
        bottom: 0,
        left: TITLE_WIDTH
    };
    var ticksY = 5;
    
    var width = container_width - margin['left'] - margin['right'];
    var barWidth = Math.ceil(width / 3);

    // clear out existing graphics
    $graphic.empty();

    var y = d3.scale.linear()
        .rangeRound([ BAR_HEIGHT, 0 ])
        .domain([ 0, 100 ]);

    var chart = d3.select('#graphic').append('div')
        .attr('class', 'chart');
    
    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', BAR_HEIGHT + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
    
    var bars = svg.append('g')
        .attr('class', 'bars');
    
    bars.selectAll('rect')
        .data(GRAPHIC_DATA)
        .enter().append('rect')
            .attr('width', barWidth)
            .attr('x', BAR_MARGIN)
            .attr('y', function(d) { 
                return y(d['stop']);
            })
            .attr('height', function(d) { 
                return y(d['start']) - y(d['stop']);
            })
            .attr('style', function(d,i) {
                var s = '';
                s += 'fill: ' + colorD3(colorD3.range()[i]) + '; ';
                return s;
            })
            .attr('class', function(d) { 
                return classify(d['label']);
            });
            
    var titles = chart.append('div')
        .attr('style', function() {
            var s = '';
            s += 'width: ' + TITLE_WIDTH + 'px; ';
            s += 'top: ' + margin['top'] + 'px; ';
            return s;
        })
        .attr('class', 'titles');


    var labelWidth = width - BAR_MARGIN - barWidth + VALUE_WIDTH;

    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', function() {
            var s = '';
            s += 'left: ' + (margin['left'] + BAR_MARGIN + barWidth - VALUE_WIDTH) + 'px; ';
            s += 'top: ' + margin['top'] + 'px; ';
            s += 'width: ' + labelWidth + 'px; ';
            return s;
        })
        .selectAll('li')
        .data(GRAPHIC_DATA)
        .enter().append('li')
            .attr('class', function(d) {
                return 'label ' + classify(d['label']);
            })
            .attr('style', function(d) {
                var s = '';
                s += 'top: ' + (y(d['stop']) + 2) + 'px; ';
                s += 'height: ' + (y(d['start']) - y(d['stop'])) + 'px; ';
                return s;
            });
    labels.append('span')
        .attr('class', 'value')
        .attr('style', 'width: ' + VALUE_WIDTH + 'px;')
        .text(function(d) {
            return d['pct'].toFixed(1) + '%';
        });
    labels.append('span')
        .attr('class', 'name')
        .attr('style', function(d) {
            var s = '';
            s += 'width: ' + (labelWidth - VALUE_WIDTH) + 'px; ';
            if (d['group'] == 'other') {
                s += 'padding-left: ' + (VALUE_WIDTH + 8) + 'px; ';
            }            
            return s;
        })
        .text(function(d) {
            var lbl = d['label'];
            if (d['group'] == 'other') {
                lbl += ' (' + d['pct'].toFixed(1) + '%)';
            }
            return lbl;
        });

    if (pymChild) {
        pymChild.sendHeight();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

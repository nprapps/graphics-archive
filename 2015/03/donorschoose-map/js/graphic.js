// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var BAR_HEIGHT = 30;
var BAR_GAP = 5;
var GRAPHIC_DATA_URL = 'data.csv';
var TOPO_DATA_URL = 'us-states.json';
var GRAPHIC_DEFAULT_WIDTH = 600;
var LABEL_MARGIN = 6;
var LABEL_WIDTH = 85;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_WIDTH = 30;

var BASE_WIDTH = 960;
var BASE_HEIGHT = 600;
var BASE_SCALE = 1200;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var graphicData = null;
var topoData = null;
var isLoaded = false;
var isMobile = false;

var selectedYear = '2014';

var mapHeight = null;
var mapScale = null;
var svgHeight = null;
var svgWidth = null;

var graphicData2002 = [];
var graphicData2003 = [];
var graphicData2004 = [];
var graphicData2005 = [];
var graphicData2006 = [];
var graphicData2007 = [];
var graphicData2008 = [];
var graphicData2009 = [];
var graphicData2010 = [];
var graphicData2011 = [];
var graphicData2012 = [];
var graphicData2013 = [];
var graphicData2014 = [];

var color;
var colorLabels;
var color_bins = [1, 20, 40, 60, 80, 100];
var color_range = ['#ddd', '#C5DFDF', '#51A09E', '#17807E', '#11605E', '#0B403F'];
var color_range_labels = ['#666', '#666', '#666', '#666', '#f1f1f1', '#f1f1f1', '#f1f1f1'];
var color_bins_count = color_bins.length;


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

        queue() // load all the data
            .defer(d3.csv, GRAPHIC_DATA_URL)
            .defer(d3.json, TOPO_DATA_URL)
            .await(onDataLoaded);

    } else {
        pymChild = new pym.Child({ });
    }
}

var onDataLoaded = function(error, data, topo) {
    graphicData = data;

    graphicData.forEach(function(d) {
        d['value'] = +d['value'];
        
        var yearData = eval('graphicData' + d['year']);
//        yearData.push(d);
        yearData[d['state']] = d['value'];
    });
    
    topoData = topo['features'];

    pymChild = new pym.Child({
        renderCallback: render
    });
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
    drawMap(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE MAP
 */
var drawMap = function(graphicWidth) {
    var yearData = eval('graphicData' + selectedYear);
    console.log(yearData);

    // define or update map dimensions
    updateDimensions(graphicWidth);

    var margin = {
        top: 0, 
        right: 0, 
        left: 0,
        bottom: 10
    }

    color = d3.scale.threshold()
        .domain(color_bins) // bins
        .range(color_range); // color palette
        
   colorLabels = d3.scale.threshold()
        .domain(color_bins) // bins
        .range(color_range_labels); // color palette

    // draw the legend
    var legend = d3.select('#graphic')
        .append('ul')
            .attr('class', 'key');
    
    var bins = legend.selectAll('g')
        .data(color_bins)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i;
            });
    bins.append('b')
        .style('background-color', function(d,i) {
            return color_range[i];
        });
    bins.append('label')
        .text(function(d, i) {
            if (i == 0) {
                return 'Fewer than ' + color_bins[i] + '%';
            } else if (i == (color_bins_count - 1)) {
                return color_bins[i-1] + '%' + ' and above';
            } else {
                return color_bins[i-1] + '-' + (color_bins[i] - 1) + '%';
            }
            return d['key'];
        });
        
//     var legend = d3.select('#graphic ul.key')
//         .append('li')
//             .attr('class', 'key-item key-' + color_bins_count);
//     legend.append('b')
//         .style('background-color', '#ddd');
//     legend.append('label')
//         .text('Data not available');


    // create the SVG
    var svg = graphicD3.append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // Draw the map
    var mapProjection = d3.geo.albersUsa()
        .scale(mapScale)
        .translate([ svgWidth/2, mapHeight/2 ]);

    var mapPath = d3.geo.path()
        .projection(mapProjection);

    var map = svg.append('g')
        .attr('class','map')

    map.append('g')
        .attr('class', 'states')
        .selectAll('path')
        .data(topoData)
        .enter().append('path')
            .attr('class', function(d) { 
                return 'state d' + d['id'];
            })
            .attr('d', mapPath)
            .style('fill', function(d) {
                var s = d['properties']['name'];
                if (yearData[s] == undefined) {
                     return '#ddd';
                 } else {
                     return color(yearData[s]);
                 }
            })
            .style('stroke', function(d) {
                var s = d['properties']['name'];
                if (yearData[s] == undefined) {
                    return '#ccc';
                } else {
                    return '#fff';
                }
            });

    svg.append('g')
        .attr('class', 'state-labels')
        .selectAll('text')
        .data(topoData)
        .enter().append('text')
            .attr('class', function(d) {
                return 'state-id d' + d['id'];
            })
            .attr('transform', function(d) { 
                if(!isNaN(mapPath.centroid(d)[0])) {
                    return 'translate(' + mapPath.centroid(d) + ')';
                }
            })
            .attr('dy', '.35em')
            .attr('dx', '0em')
            .attr('fill', function(d) {
                var s = d['properties']['name'];
                var val = yearData[s];
                if (val == undefined) {
                     return '#ddd';
                 } 
                 else if ((val > 0) && (val < 20)){
                 	return '#696969'; 
                 }	
                 else {
                     return '#FFFFFF';
                 }
            })
            .text(function(d) {
                var s = d['properties']['name'];
                var val = yearData[s];
                if (val > 0) {
                    return yearData[s] + '%';
                } else {
                    return '';
                }
            });
    
    // hard-coded adjustments
    d3.select('.state-id.d9') // CT
        .attr('dx', '.4em')
        .attr('dy', '.5em');
    d3.select('.state-id.d10') // DE
		.attr('dy', '.5em')
    	.attr('dx', '1.5em')     
    	.attr('fill', '#666');
    if (selectedYear != '2010' && selectedYear != '2011' && selectedYear != '2012' && selectedYear != '2013' && selectedYear != '2014') {
        d3.select('.state-id.d11') // DC
            .attr('fill', '#666');
    }
    d3.select('.state-id.d12') // FL
        .attr('dx', '1.2em');
    d3.select('.state-id.d15') // HI
        .attr('dx', '-1.5em')
        .attr('fill', '#666');
    d3.select('.state-id.d22') // LA
        .attr('dy', '1.0em');
    d3.select('.state-id.d33') // NH
        .attr('dx', '.35em');
    d3.select('.state-id.d34') // NJ
        .attr('dx', '1.8em')
        .attr('fill', '#666');
    d3.select('.state-id.d44') // RI
        .attr('dy', '1em')
        .attr('fill', '#666');
    d3.select('.state-id.d50') // VT
        .attr('dx', '-.5em')
        .attr('dy', '-1.5em')
        .attr('fill', '#666');

    d3.select('.state-id.d26')
        .attr('dy', '2em')
        .attr('dx', '1em');
    d3.select('.state-id.d6')
        .attr('dx', '-.5em');
    d3.select('.state-id.d28')
        .attr('dy', '1em');
    d3.select('.state-id.d1')
        .attr('dy', '-.5em');
    d3.select('.state-id.d18')
        .attr('dy', '.5em');
    d3.select('.state-id.d44')
        .attr('dx', '1.5em');
    d3.select('.state-id.d24')
        .attr('dy', '-.5em')

    isLoaded = true;
}

var updateDimensions = function(graphicWidth) {
    svgWidth = graphicWidth;
    mapHeight = svgWidth * BASE_HEIGHT / BASE_WIDTH;
    mapScale = (svgWidth / BASE_WIDTH) * BASE_SCALE;
    svgHeight = mapHeight;
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
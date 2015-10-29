// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var formattedData = [];

/*
 * Initialize the graphic.
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
    var groups = _.pluck(graphicData, 'group');
    groups = d3.set(groups).values();
    
    var group0 = [];
    var group1 = [];
    var group2 = [];
    var group3 = [];
    
    graphicData.forEach(function(d) {
        var grpData = eval('group' + d['group_id']);
        
        if (d['gdp_capita'] == undefined) {
            d['gdp_capita'] = 1;
        } else {
            d['gdp_capita'] = +d['gdp_capita'];
        }
        if (d['emissions'] == undefined) {
            d['emissions'] = 100;
        } else {
            d['emissions'] = +d['emissions'];
        }
        grpData.push(d);
    });

    formattedData = { 'country': 'UN climate negotiating groups',
                      'children': [ 
                        { 'country': groups[0],
                          'children': group0 },
                        { 'country': groups[1],
                          'children': group1 },
                        { 'country': groups[2],
                          'children': group2 },
                        { 'country': groups[3],
                          'children': group3 } ]
                    };

    console.log(formattedData);
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
    renderCircleChart({
        container: '#graphic',
        width: containerWidth,
        data: formattedData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bubble chart.
 * original code via http://bl.ocks.org/mbostock/4063530
 */
var renderCircleChart = function(config) {
    var diameter = config['width'];
    var format = d3.format(',d');

    var pack = d3.layout.pack()
        .sort(null)
        .size([ diameter - 4, diameter - 4 ])
        .value(function(d) { 
//            return d['gdp_capita'];
            return d['emissions'];
//            return 10;
        });
    
    var nodes = pack.nodes(config['data']);
    
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var chartElement = containerElement.append('svg')
        .attr('width', diameter)
        .attr('height', diameter)
      .append('g')
        .attr('transform', 'translate(2,2)');

    var node = chartElement.datum(config['data'])
        .selectAll('.node')
            .data(pack.nodes)
        .enter().append('g')
        .attr('class', function(d) { 
            var c = classify(d['country']);
            if (d['children']) {
                c += ' node';
            } else {
                c += ' leaf node';
            }
            return c;
        })
        .attr('transform', function(d) { 
            return 'translate(' + d['x'] + ',' + d['y'] + ')';
        });

    node.append('title')
        .text(function(d) { 
            return d['country'] + (d['children'] ? '' : ': ' + format(d['group_id']));
        });

    node.append('circle')
        .attr('class', function(d) {
            return classify(d['country']);
        })
        .attr('r', function(d) { 
            return d['r'];
        });

//     node.filter(function(d) { 
//         return !d['children']; 
//     }).append('text')
//         .attr('dy', '.3em')
//         .style('text-anchor', 'middle')
//         .text(function(d) { 
//             return d['country'].substring(0, d['r'] / 3);
//         });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
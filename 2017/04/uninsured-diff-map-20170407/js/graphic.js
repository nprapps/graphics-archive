// Global config
var GEO_DATA_URL = 'data/geodata.json';

// Global vars
var pymChild = null;
var isMobile = false;
var isRendered = false;
var geoData = null;
var rateData = [];
var colorBins = [ -12, -9, -6, -3, 0, 3, 10 ];
var colorRange = [ COLORS['teal1'], COLORS['teal2'], COLORS['teal3'], COLORS['teal4'], COLORS['teal6'], COLORS['red6'], COLORS['red4'], COLORS['red3'], COLORS['red2'] ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (LABELS.graphic_mode == 'dynamic') {
        if (Modernizr.svg) {
            formatData();
        } else {
            pymChild = new pym.Child({});

            pymChild.onMessage('on-screen', function(bucket) {
                ANALYTICS.trackEvent('on-screen', bucket);
            });
            pymChild.onMessage('scroll-depth', function(data) {
                data = JSON.parse(data);
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
            });
        }
    } else if (LABELS.graphic_mode == 'flat') {
        renderKey({ container: '#locator-map' });

        pymChild = new pym.Child({});

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
    }
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    _.each(DATA, function(d) {
        var fips = d['fips'];
        switch(fips) {
            case '46102': // Shannon/Oglala Lakota, S.D.
                fips = 46113;
                break;
            case '02158': // Wade Hampton/Kusilvak
                fips = '02270';
                break;
        }
        rateData[fips] = { 'fips': fips,
                           'diff': +d['diff'],
                           'medicaid': d['medicaid'] };
    });
    loadJSON();
}

/*
 * Load graphic data from a CSV.
 */
var loadJSON = function() {
    d3.json(GEO_DATA_URL, function(error, data) {
        geoData = data;

        pymChild = new pym.Child({
            renderCallback: render
        });

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        // graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
        graphicWidth = containerWidth;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#locator-map');
    containerElement.html('');

    renderKey({ container: '#locator-map' });

    containerElement.append('div')
        .attr('class', 'map medicaid');
    containerElement.append('div')
        .attr('class', 'map no-medicaid');

    // if (!isMobile) {
    //     containerElement.selectAll('.map')
    //         .attr('style', function(d,i) {
    //             var s = '';
    //             s += 'width: ' + graphicWidth + 'px; ';
    //             s += 'float: left; ';
    //             if (i % 2 > 0) {
    //                 s += 'margin-left: ' + gutterWidth + 'px; ';
    //             }
    //             return s;
    //         })
    // }

    // Render the chart!
    renderLocatorMap({
        container: '.map.medicaid',
        width: graphicWidth,
        data: geoData,
        medicaid: true
    });

    // Render the chart!
    renderLocatorMap({
        container: '.map.no-medicaid',
        width: graphicWidth,
        data: geoData,
        medicaid: false
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderKey = function(config) {
    var legendWrapper = d3.select('.key-wrap');
    var legendElement = legendWrapper.select('.key')
        .html('');

    var legendBins = [];
    _.each(colorBins, function(d,i) {
        switch(i) {
            case 0:
                legendBins.push('');
                legendBins.push(d);
                break;
            case (colorBins.length - 1):
                break;
            default:
                legendBins.push(d);
                break;
        }
    });

    var colorScale = d3.scale.ordinal()
        .domain(legendBins)
        .range(colorRange);

    _.each(colorScale.domain(), function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', colorScale(key));

        keyItem.append('label')
            .text(key);

        // // Add the optional upper bound label on numeric scale
        // if (LABELS['max_label'] && LABELS['max_label'] !== '') {
        //     keyItem.append('label')
        //         .attr('class', 'end-label')
        //         .text(LABELS['max_label']);
        // }
    });
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 2;
    var aspectHeight = 1.2;

    var bbox = config['data']['bbox'];
    var defaultScale = 800;
    var cityDotRadius = 3;

    var colorScale = d3.scale.threshold()
        .domain(colorBins)
        .range(colorRange);

    console.log(colorScale.domain());
    console.log(colorScale.range());
    console.log('%c' + '-22: ' + colorScale(-22), 'background-color: ' + colorScale(-22) + '; color: #fff; padding: 0 3px; ');
    console.log('%c' + '-5: ' + colorScale(-5), 'background-color: ' + colorScale(-5) + '; color: #fff; padding: 0 3px; ');
    console.log('%c' + '.1: ' + colorScale(.1), 'background-color: ' + colorScale(.1) + '; color: #fff; padding: 0 3px; ');
    console.log('%c' + '4.5: ' + colorScale(4.5), 'background-color: ' + colorScale(4.5) + '; color: #fff; padding: 0 3px; ');

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;

    /*
     * Render the HTML legend.
     */
    // containerElement.append('h3')
    //     .text('Jobs per county');
    //
    // var legend = containerElement.append('ul')
    //     .attr('class', 'key');
    //
    // var bins = legend.selectAll('li')
    //     .data(colorBins)
    //     .enter().append('li')
    //         .attr('class', function(d, i) {
    //             return 'key-item key-' + i;
    //         });
    // bins.append('b')
    //     .style('background-color', function(d,i) {
    //         return colorRange[i];
    //     });
    // bins.append('label')
    //     .html(function(d, i) {
    //         if (i == 0) {
    //             return 'None';
    //         } else if (i == (colorBinsCount - 1)) {
    //             return '&ge;&nbsp;' + fmtComma(colorBins[i-1]);
    //         } else {
    //             return fmtComma(colorBins[i-1]) + '-' + fmtComma((colorBins[i] - 1));
    //         }
    //         return d['key'];
    //     });

    // var noData = legend.append('li')
    //     .attr('class', 'key-item key-' + colorBinsCount);
    // noData.append('b')
    //     .style('background-color', '#ddd');
    // noData.append('label')
    //     .text('Data not available');

    /*
     * Extract topo data.
     */
    var mapData = {};

    for (var key in config['data']['objects']) {
        mapData[key] = topojson.feature(config['data'], config['data']['objects'][key]);
    }

    /*
     * Create the map projection.
     */
    var centroid = [((bbox[0] + bbox[2]) / 2), ((bbox[1] + bbox[3]) / 2)];
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / DEFAULT_WIDTH;

    projection = d3.geo.albersUsa()
        .scale(mapScale)
        .translate([ mapWidth/2, mapHeight/2 ]);

    path = d3.geo.path()
        .projection(projection)
        .pointRadius(cityDotRadius * scaleFactor);

    /*
     * Create the root SVG element.
     */
    chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    chartElement = chartWrapper.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')

    /*
     * Render counties.
     */
    chartElement.append('g')
        .attr('class', 'counties')
        .selectAll('path')
            .data(mapData['counties']['features'])
        .enter().append('path')
            .attr('class', function(d, i) {
                return 'c-' + d['id'];
            })
            .attr('fill', function(d) {
                var fips = d['id'];
                if (typeof rateData[fips] != 'undefined' && ((config['medicaid'] && rateData[fips]['medicaid'] == 'yes') || (!config['medicaid'] && rateData[fips]['medicaid'] != 'yes'))) {
                    return colorScale(rateData[fips]['diff']);
                } else {
                    return '#ddd';
                    // console.log('no data: ' + fips);
                }
            })
            .attr('d', path);

    /*
     * Render state outlines
     */
    chartElement.append('g')
        .attr('class', 'states')
        .selectAll('path')
            .data(mapData['states']['features'])
        .enter().append('path')
            .attr('d', path)
            .attr('class', function(d) {
                var c = classify(d['id'])
                var st = d['id'].toLowerCase();
                return c;
            });
    // chartElement.selectAll('.states .expanded').moveToFront();

    isRendered = true;
}

/*
 * Move a set of D3 elements to the front of the canvas.
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

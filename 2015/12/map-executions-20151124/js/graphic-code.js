console.log('code-based graphic! beware: very slow.');

// Global config
var GEO_DATA_URL = 'data/geodata.json';

// Global vars
var pymChild = null;
var isMobile = false;
var isRendered = false;
var geoData = null;
var executionData = [];
var years = [ '1998', '2000', '2002', '2004', '2006', '2008', '2010', '2012', '2014' ];
var yearLabels = [ '1998-99', '2000-01', '2002-03', '2004-05', '2006-07', '2008-09', '2010-11', '2012-13', '2014-15' ];
// var years = [ '1998', '2002', '2006', '2010', '2014' ];
// var yearLabels = [ '1998-99', '2002-03', '2006-07', '2010-11', '2014-15' ];
var currentYear = years.length - 1;

var colorBins = [1, 500];
//var colorRange = [ '#ddd', COLORS['red3'] ];
var colorRange = [ '#ddd', '#eee' ];
var colorBinsCount = colorBins.length;
var colorScale = null;

var sliderBrush = null;
var sliderScale = null;

var btnBack = null;
var btnNext = null;

var radius = null;

var LABEL_DEFAULTS = {
    'text-anchor': 'start',
    'dx': '5',
    'dy': '-4'
}

var CITY_LABEL_ADJUSTMENTS = {
    'Atlanta': { 'text-anchor': 'end', 'dx': -4, 'dy': 8 },
    'Dallas': { 'text-anchor': 'end', 'dx': -4 },
    'Houston': { 'dy': 8 },
    'New Orleans': { 'dy': 8 },
    'Tampa': { 'text-anchor': 'end', 'dx': -4, 'dy': 8 }
}

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        btnNext = d3.select('#btn-next');
        btnBack = d3.select('#btn-back');

        formatData();
    } else {
        pymChild = new pym.Child({});
    }
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
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA = DATA.filter(function(d) {
        return d['fips'] != null;
    });
    _.each(DATA, function(d) {
        if (d['show'] != 'False') {
            var fips = d['fips'];
            executionData[fips] = {
                'county': d['county'],
                'state': d['state'],
                'fips': d['fips'],
                '1994': +d['1994'],
                '1996': +d['1996'],
                '1998': +d['1998'],
                '2000': +d['2000'],
                '2002': +d['2002'],
                '2004': +d['2004'],
                '2006': +d['2006'],
                '2008': +d['2008'],
                '2010': +d['2010'],
                '2012': +d['2012'],
                '2014': +d['2014']
            };
        }
    });
    loadJSON();
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    colorScale = d3.scale.threshold()
        .domain(colorBins)
        .range(colorRange);

    // Render the slider!
    renderSlider({
        container: '#slider',
        width: containerWidth,
        data: years
    });

    // Render the map!
    renderLocatorMap({
        container: '#locator-map',
        width: containerWidth,
        data: geoData
    });

    colorCounties();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 2;
    var aspectHeight = 1.2;

//    var bbox = config['data']['bbox'];
    var bbox = [-180, -14.6, -29.9, 77.2];
    var defaultScale = 800;
    var cityDotRadius = 2;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;

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
     * Render map.
     */
    // Land outlines
    chartElement.append('g')
        .attr('class', 'landmass')
        .selectAll('path')
            .data(mapData['states']['features'])
        .enter().append('path')
            .attr('d', path);

    /*
     * Render counties.
     */
    chartElement.append('g')
        .attr('class', 'counties')
        .selectAll('path')
            .data(mapData['counties']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                var fips = d['id'];
                var c = 'c-' + fips;
                return c;
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
            .attr('d', path);

    // circles?
    radius = d3.scale.sqrt()
        .domain([0, 20])
        .range([0, 13 * scaleFactor]);

    chartElement.append('g')
        .attr('class', 'executions')
        .selectAll('circle')
        .data(DATA)
        .enter()
            .append('circle')
                .attr('transform', function(d) {
                    var id = d['fips'];
                    var county = d3.select('.c-' + id);
                    var centroid = [ 0, 0 ];

                    if (county[0][0] != null) {
                        centroid = d3.geo.centroid(county[0][0]['__data__'])
                    }

                    if (centroid[0] != 0 && centroid[1]!= 0) {
                        return 'translate(' + projection(centroid) + ')';
                    } else {
                        // console.log(d);
                    }
                })
                .attr('r', 0)
                .attr('class', function(d, i) {
                    return 'e-' + d['fips'];
                });

    /*
     * Major cities
     */
    chartElement.append('g')
        .attr('class', 'cities primary')
        .selectAll('path')
            .data(mapData['cities']['features'])
        .enter().append('path')
            .attr('d', path)
            .attr('class', function(d) {
                var c = 'place';
                c += ' ' + classify(d['id']);
                c += ' scalerank-' + d['properties']['scalerank'];
                return c;
            });

    /*
     * Apply adjustments to label positioning.
     */
    var positionLabel = function(adjustments, id, attribute) {
        if (adjustments[id]) {
            if (adjustments[id][attribute]) {
                return adjustments[id][attribute];
            } else {
                return LABEL_DEFAULTS[attribute];
            }
        } else {
            return LABEL_DEFAULTS[attribute];
        }
    }

    var layers = [
        'city-labels shadow primary',
        'city-labels primary'
    ];

    layers.forEach(function(layer) {
        var data = [];
        data = mapData['cities']['features'];

        chartElement.append('g')
            .attr('class', layer)
            .selectAll('.label')
                .data(data)
            .enter().append('text')
                .attr('class', function(d) {
                    var c = 'label';
                    c += ' ' + classify(d['id']);
                    c += ' scalerank-' + d['properties']['scalerank'];
                    return c;
                })
                .attr('transform', function(d) {
                    return 'translate(' + projection(d['geometry']['coordinates']) + ')';
                })
                .attr('style', function(d) {
                    return 'text-anchor: ' + positionLabel(CITY_LABEL_ADJUSTMENTS, d['id'], 'text-anchor');
                })
                .attr('dx', function(d) {
                    return positionLabel(CITY_LABEL_ADJUSTMENTS, d['id'], 'dx');
                })
                .attr('dy', function(d) {
                    return positionLabel(CITY_LABEL_ADJUSTMENTS, d['id'], 'dy');
                })
                .text(function(d) {
                    return d['id'];
                });
    });

    d3.select('.btns').attr('style', 'display: block');
    btnBack.on('click', onBackButtonClicked);
    btnNext.on('click', onNextButtonClicked);
    resetButtonState();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

// draw slider bar
var renderSlider = function(config) {
    var firstYear = +config['data'][0];
    var lastYear = +config['data'][config['data'].length - 1];

//    var toggleWidth = 90;
    var toggleWidth = 160
    if (isMobile) {
        toggleWidth = 0;
    }

    var sliderWidth = config['width'];
    if (!isMobile) {
        sliderWidth -= (toggleWidth + 50);
    }

    var sliderHeight = 60;
    var sliderMargins = {
        top: 25,
        right: 27,
        bottom: 0,
        left: 27
    };
    if (isMobile) {
        sliderMargins['right'] = sliderMargins['left'];
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var sliderElement = containerElement.append('svg')
        .attr('width', sliderWidth)
        .attr('height', sliderHeight);

    // define scale
    sliderScale = d3.scale.linear()
        .domain([ firstYear, lastYear ])
        .range([0, sliderWidth - sliderMargins['left'] - sliderMargins['right'] ])
        .clamp(true);

    slider = sliderElement.append('g')
        .attr('class', 'x axis')
        .call(d3.svg.axis()
            .scale(sliderScale)
            .orient('bottom')
            .tickValues(years)
            .tickFormat(function(d,i) {
                if (!isMobile) {
                    return d;
                }
                if (isMobile && (i % 2 == 0)) {
                    return d;
                }
            })
            .tickSize(8)
            .tickPadding(5)
        )
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')');

    var sliderTicks = d3.selectAll('#slider .x.axis .tick');
    sliderTicks[0].forEach(function(d,i) {
        var tick = d3.select(d);
        var text = tick.select('text').text();
        if (text == '') {
            tick.select('line')
                .attr('y2', 7);
        } else {
            tick.select('line')
                .attr('y2', 10);
        }
    });

    var sliderBar = sliderElement.append('g')
        .attr('class', 'xbar')
        .append('line')
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .attr('x1', sliderScale(firstYear))
        .attr('x2', sliderScale(lastYear));

    var sliderBarHalo = sliderElement.append('g')
        .attr('class', 'xbar-halo')
        .append('line')
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .attr('x1', sliderScale(firstYear))
        .attr('x2', sliderScale(lastYear));

    sliderBrush = d3.svg.brush()
        .x(sliderScale)
        .extent([ firstYear, lastYear ])
        .on('brush', onBrushed);

    slider.append('text')
          .attr('id','year-label')
          .attr('text-anchor', 'middle')
          .attr('dy', -15)
          .text(firstYear);

    slider = sliderElement.append('g')
        .attr('class', 'slider')
        .attr('height', sliderHeight)
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .call(sliderBrush);

    sliderHandle = slider.append('svg:image')
        .attr('class', 'handle')
        .attr('transform', 'translate(0,' + -10 + ')')
        .attr('xlink:href', 'slider.png')
        .attr('width', 150)
        .attr('height', 20)
        .attr('x', sliderScale(firstYear) - 75 );

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var onBrushed = function() {
    var thisYear = Math.round(sliderBrush.extent()[0]);

    if (d3.event.sourceEvent) { // not a programmatic event
        thisYear = Math.round(sliderScale.invert(d3.mouse(this)[0]));
    }
    sliderBrush.extent([ thisYear, thisYear ]);
    sliderHandle.attr('x', sliderScale(thisYear) - 75);
    // console.log(sliderBrush.extent(), sliderScale.domain());

    for (var i = 0; i < years.length; i++) {
        if (years[i] == thisYear) {
            currentYear = i;
        }
    }
    colorCounties();
}

var colorCounties = function() {
    var counties = d3.selectAll('#locator-map svg .counties path');
    var executions = d3.selectAll('#locator-map svg .executions circle');
    var year = years[currentYear];

    // executions.transition()
    executions.attr('r', function(d, i) {
            var e = executionData[d['fips']];

            if (e == undefined || e == null) {
                return radius(0);
            } else {
                return radius(e[year]);
            };
        });

    executions.sort(function (a, b) {
        if (+a[year] > +b[year]) {
            return -1;
        } else {
            return 1;
        }
    });

    d3.select('#slider .handle').attr('x', sliderScale(year) - 75);

    d3.select('#year-label')
        .attr('x', sliderScale(year))
        .text(yearLabels[currentYear]);

    resetButtonState();

    if (!isRendered) {
        d3.select('#loading').remove();
        isRendered = true;
    }
}


var onNextButtonClicked = function() {
    if (currentYear == undefined) {
        currentYear = years.length - 1;
    }
    currentYear++;
    if (currentYear > (years.length - 1)) {
        currentYear = 0;
    }
    colorCounties();
    resetButtonState();
};

var onBackButtonClicked = function() {
    if (currentYear == undefined) {
        currentYear = years.length - 1;
    }
    currentYear--;
    if (currentYear < 0) {
        currentYear = 0;
    } else {
        colorCounties();
        resetButtonState();
    }
};

var resetButtonState = function() {
    if (currentYear == (years.length - 1)) {
        btnNext.html('Begin&nbsp;<span>&rsaquo;</span>');
    } else {
        btnNext.html('Next&nbsp;<span>&rsaquo;</span>');
    }
    btnNext.classed('restart', function() {
        if (currentYear == (years.length - 1)) {
            return true;
        } else {
            return false;
        }
    });

    btnBack.classed('inactive', function() {
        if (currentYear == 0) {
            return true;
        } else {
            return false;
        }
    });
};



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

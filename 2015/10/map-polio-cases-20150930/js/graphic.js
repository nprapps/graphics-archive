// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = GRAPHIC_DATA;
var totalData = [];
var topoData = null;

//var colorBins = [1, 10, 500, 1000, 2500, 5000, 50000];
var colorBins = [1, 50, 300, 1000, 3000, 6000, 50000];
var colorRange = [ COLORS['blue5'], '#F5D1CA', '#ECA395', '#E27560', '#D8472B', '#A23520', '#6C2315'];
var colorBinsCount = colorBins.length;
var colorScale = null;
var years = [];
var animate = null;
var animateInterval = 450;
var currentYear = 0;

var sliderBrush = null;
var sliderScale = null;

// D3 formatters
var fmtComma = d3.format(',');


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        d3.json('world-110m.json', function(data) {
            topoData = data;
            
            // define years
            for (key in graphicData[0]) {
                if (!isNaN(+key)) {
                    years.push(key);
                }
            }
            years.sort();
            
            // pull out totals
            graphicData.forEach(function(d) {
                if (d['name'] == 'TOTAL') {
                    for (key in d) {
                        if (!isNaN(+key)) {
                            totalData.push({ 'label': key, 'amt': +d[key] });
                        }
                    }
                }
            });
            
            pymChild = new pym.Child({
                renderCallback: render
            });
        })
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Render the graphic.
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
    
    pauseAnimation();

    colorScale = d3.scale.threshold()
        .domain(colorBins)
        .range(colorRange);

    // Render the chart!
    renderSlider({
        container: '#slider',
        width: containerWidth,
        data: years
    });

    // Render the chart!
    renderColumnChart({
        container: '#totals',
        width: containerWidth,
        data: totalData
    });

    // Render the map!
    renderWorldMap({
        container: '#graphic',
        width: containerWidth,
        mapData: topoData,
        data: graphicData
    });

    startAnimation();
    
    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a world map
 */
var renderWorldMap = function(config) {
    var aspectWidth = 1.92;
    var aspectHeight = 1;

    var defaultScale = 95;

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    // Calculate actual chart dimensions
    var mapWidth = config['width'] - margins['left'] - margins['right'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
//    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    /*
     * Extract topo data.
     */
    var mapData = {};

    for (var key in config['mapData']['objects']) {
        mapData[key] = topojson.feature(config['mapData'], config['mapData']['objects'][key]);
    }

    /*
     * Create the map projection.
     */
    var mapScale = (mapWidth / GRAPHIC_DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / GRAPHIC_DEFAULT_WIDTH;

    var projection = d3.geo.miller()
        .scale(mapScale)
        .translate([ mapWidth / 2 * 0.97, mapHeight / 2 * 1.27 ]);

    var path = d3.geo.path()
        .projection(projection)

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Render the HTML legend.
     */
    containerElement.append('h3')
        .text('Recorded cases per country');

    var legend = containerElement.append('ul')
        .attr('class', 'key');
    
    var bins = legend.selectAll('li')
        .data(colorBins)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i;
            });
    bins.append('b')
        .style('background-color', function(d,i) {
            return colorRange[i];
        });
    bins.append('label')
        .html(function(d, i) {
            if (i == 0) {
                return 'None';
            } else if (i == (colorBinsCount - 1)) {
                return '&ge;&nbsp;' + fmtComma(colorBins[i-1]);
            } else {
                return fmtComma(colorBins[i-1]) + '-' + fmtComma((colorBins[i] - 1));
            }
            return d['key'];
        });

    var noData = legend.append('li')
        .attr('class', 'key-item key-' + colorBinsCount);
    noData.append('b')
        .style('background-color', '#ddd');
    noData.append('label')
        .text('Data not available');

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', mapWidth + margins['left'] + margins['right'])
        .attr('height', mapHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    chartElement.append('g')
        .attr('class', 'countries')
        .selectAll('path')
            .data(mapData['countries']['features'])
            .enter()
                .append('path')
                .attr('d', path)
                .attr('class', function(d) {
                    return 'country-' + d['id'];
                });
}


// draw slider bar
var renderSlider = function(config) {
    var firstYear = +config['data'][0];
    var lastYear = +config['data'][config['data'].length - 1];

    var toggleWidth = 85;
    var sliderHeight = 60;
    var sliderMargins = {
        top: 25,
        right: (toggleWidth + 30),
        bottom: 0,
        left: 15
    };

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var sliderElement = containerElement.append('svg')
            .attr('width', config['width'])
            .attr('height', sliderHeight);
    
    // define scale
    sliderScale = d3.scale.linear()
        .domain([ firstYear, lastYear ])
        .range([0, config['width'] - sliderMargins['left'] - sliderMargins['right'] ])
        .clamp(true);
    
    slider = sliderElement.append('g')
        .attr('class', 'x axis')
        .call(d3.svg.axis()
            .scale(sliderScale)
            .orient('bottom')
            .tickValues(years)
            .tickFormat(function(d,i) {
                if (!isMobile && (i % 3 == 0)) {
                    return d;
                }
                if (isMobile && (i % 10 == 0)) {
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

    // add play/pause buttons
    var toggle = containerElement.append('div')
        .attr('id', 'toggle');

    toggle.append('div')
        .attr('id', 'btn-play')
        .html('<i class="icon-play"></i> Play')
        .attr('style', 'display: none;')
        .on('click', onPlayClicked);

    toggle.append('div')
        .attr('id', 'btn-pause')
        .html('<i class="icon-pause"></i> Pause')
        .on('click', onPauseClicked);

    toggle.attr('style', function() {
        var s = '';
        s += 'right: 0;';
        s += 'bottom: 10px;';
        s += 'width: ' + toggleWidth + 'px;';
        return s;
    });
}

var onPauseClicked = function() {
    pauseAnimation();
}
var onPlayClicked = function() {
    startAnimation();
}

var startAnimation = function() {
    animate = setInterval(colorCountries, animateInterval);
    colorCountries();
    d3.select('#btn-play').attr('style', 'display: none;');
    d3.select('#btn-pause').attr('style', 'display: block;');
}

var pauseAnimation = function() {
    clearInterval(animate);
    d3.select('#btn-play').attr('style', 'display: block;');
    d3.select('#btn-pause').attr('style', 'display: none;');
}

var onBrushed = function() {
    pauseAnimation();
    
    var thisYear = Math.round(sliderBrush.extent()[0]);
    
    if (d3.event.sourceEvent) { // not a programmatic event
        thisYear = Math.round(sliderScale.invert(d3.mouse(this)[0]));
    }
    sliderBrush.extent([ thisYear, thisYear ]);
    sliderHandle.attr('x', sliderScale(thisYear) - 75);
    
    for (var i = 0; i < years.length; i++) {
        if (years[i] == thisYear) {
            currentYear = i;
        }
    }
    colorCountries();
}

var colorCountries = function() {
    var countries = d3.selectAll('#graphic svg .countries path');
    var polioCases = {};
    var year = years[currentYear];

    if (year == undefined) {
        pauseAnimation();
        currentYear = 0;
    } else {
        _.each(graphicData, function(d) {
            polioCases[d['id']] = d[year];
        });
    
        countries.style('fill', function(d) {
                var cases = polioCases[d['id']];

                if (cases == undefined) {
                    return '#ddd';
                }

                return colorScale(cases);
            })
            .style('stroke', function(d) {
                var cases = polioCases[d['id']];

                if (cases == undefined) {
                    return '#eee';
                }

                return '#fff';
            });

        d3.select('#slider .handle').attr('x', sliderScale(year) - 75);

        d3.select('#year-label')
            .attr('x', sliderScale(year))
            .text(year);
        
        d3.selectAll('#totals .bar')
            .classed('active', function(d, i) {
                if (d['label'] == year) {
                    return true;
                } else {
                    return false;
                }
            });

        d3.selectAll('#totals .value text')
            .classed('active', function(d, i) {
                if (d['label'] == year) {
                    return true;
                } else {
                    return false;
                }
            });
    
        currentYear++;
    }
}


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';

    var valueGap = 6;

    var margins = {
        top: 7,
        right: 5,
        bottom: 20,
        left: 45
    };

    var ticksY = 3;
    var roundTicksFactor = 20000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = 60;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');
    
    containerElement.append('h3')
        .text('Total recorded cases worldwide');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .rangeRoundBands([0, chartWidth], .1)
        .domain(config['data'].map(function (d) {
            return d[labelColumn];
        }));

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var yScale = d3.scale.linear()
        .domain([
            min,
            d3.max(config['data'], function(d) {
                return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
            })
        ])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (!isMobile && (i % 3 == 0)) {
                return d;
            }
            if (isMobile && (i % 10 == 0)) {
                return d;
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d, i) {
            if (i % 2 == 0) {
                return fmtComma(d);
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis)

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(config['data'])
        .enter()
        .append('rect')
            .attr('x', function(d) {
                return xScale(d[labelColumn]);
            })
            .attr('y', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(0);
                }

                return yScale(d[valueColumn]);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(d[valueColumn]) - yScale(0);
                }

                return yScale(0) - yScale(d[valueColumn]);
            })
            .attr('fill', '#ccc')
            .attr('class', function(d) {
                return 'bar bar-' + d[labelColumn];
            });

    /*
     * Render bar values.
     */
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter()
        .append('text')
            .text(function(d) {
                return fmtComma(d[valueColumn].toFixed(0));
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .classed('out', true)
            .attr('dy', -6)
            .attr('text-anchor', 'middle')
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

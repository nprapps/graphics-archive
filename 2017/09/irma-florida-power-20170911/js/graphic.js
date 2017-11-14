// Global config
var GEO_DATA_URL = 'data/geodata.json';

var LABEL_DEFAULTS = {
    'text-anchor': 'start',
    'dx': '6',
    'dy': '4'
}

var CITY_LABEL_ADJUSTMENTS = {
    'Miami': { 'text-anchor': 'end', 'dx': -6, 'dy': 10 },
    'Tampa': { 'text-anchor': 'end', 'dx': -8 }
}

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;
var outageDataColumn = 'overall_out';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();
        loadJSON();
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
 * Format data for D3.
 */
var formatData = function() {
    OUTAGES.forEach(function(d) {
        // var id = d['county_fips'];
        if (d['overall_out'] != null) {
            d['overall_out'] = +d['overall_out'];
        }
        // if (d['overall_out_pct'] != null) {
        //     d['overall_out_pct'] = +d['overall_out_pct'] * 100;
        // }
        // if (d['overall_with_pct'] != null) {
        //     d['overall_with_pct'] = +d['overall_with_pct'] * 100;
        // }
        if (d['overall_total'] != null) {
            d['overall_total'] = +d['overall_total'];
        }
        if (d['lat'] != null) {
            d['lat'] = +d['lat'];
        }
        if (d['lon'] != null) {
            d['lon'] = +d['lon'];
        }
    });

    OUTAGES = OUTAGES.sort(function(a, b) {
        return d3.descending(a[outageDataColumn], b[outageDataColumn]);
    });
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

    // Render the chart!
    renderLocatorMap({
        container: '#locator-map',
        width: containerWidth,
        data: geoData,
        outages: OUTAGES
    });

    var barChartData = OUTAGES.filter(function(d,i) {
        return i < 10;
    });

    var barChartWidth = containerWidth;
    if (!isMobile) {
        barChartWidth = Math.floor(containerWidth * .45);
    }

    // Render the chart!
    renderBarChart({
        container: '#bar-chart',
        width: barChartWidth,
        data: barChartData,
        title: LABELS['hdr_top5'],
        labelColumn: 'county_name',
        valueColumn: outageDataColumn,
        showXAxisLabels: false
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render the map
 */
var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 1.1;
    var aspectHeight = 1;

    var bbox = config['data']['bbox'];
    var defaultScale = 4000;
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

    projection = d3.geo.mercator()
        .center(centroid)
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

    var tooltip = containerElement.append('div')
        .attr('id', 'tooltip');

    /*
     * Create SVG filters.
     */
    var filters = chartElement.append('filters');

    var textFilter = filters.append('filter')
        .attr('id', 'textshadow');

    textFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('result', 'blurOut')
        .attr('stdDeviation', '.25');

    /*
     * Render counties.
     */
    // Land outlines
    chartElement.append('g')
        .attr('class', 'counties')
        .selectAll('path')
            .data(mapData['counties']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                return 'c-' + classify(d['id']);
            })
            .attr('d', path);

    // storm path
    chartElement.append('g')
        .attr('class', 'stormpath')
        .selectAll('path')
            .data(mapData['stormpath']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                return classify(d['id']);
            })
            .attr('d', path);

    chartElement.append('g')
        .attr('class', 'forecastpath')
        .selectAll('path')
            .data(mapData['forecastpath']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                return classify(d['id']);
            })
            .attr('d', path);

    /*
     plot bubbles
     */
    // define scale
    var dataColumn = outageDataColumn;
    var radiusMax = 30 * scaleFactor;
    if (isMobile){
        radiusMax = 40 * scaleFactor;
    }
    var rounding = 50000;
    var scaleMax = d3.max(config['outages'], function(d) {
        return Math.ceil(d[dataColumn] / rounding) * rounding;
    });
    var scaleMin = Math.floor(scaleMax / 3);
    scaleMin = Math.floor(scaleMin / rounding) * rounding;

    var radius = d3.scale.sqrt()
        .domain([0, scaleMax])
        .range([0, radiusMax]);

    var scaleKey = [ scaleMin, scaleMax ];

    // draw bubbles
    var bubbles = chartElement.append('g')
        .attr('class', 'bubbles')
        .selectAll('circle')
            .data(config['outages'].filter(function(d, i) {
                return d[dataColumn] != null;
            }))
            .enter()
                .append('circle')
                    .attr('transform', function(d,i) {
                        var id = d['county_fips'];
                        var centroid = [ 0, 0 ];

                        // check for an override
                        if (d['lat'] != null && d['lon'] != null) {
                            centroid = [ d['lon'], d['lat'] ];
                        // or, use county centroid
                        } else {
                            var county = d3.select('.c-' + id);
                            // find the country centroid
                            if (county[0][0] != null) {
                                centroid = d3.geo.centroid(county[0][0]['__data__']);
                            // or maybe the point doesn't exist
                            } else {
                                console.log('no centroid for: ' + d['name']);
                            }

                            // also color in the county if 80% or more of accounts have no power
                            if (d['overall_out_pct'] >= 80) {
                                county.classed('pct80', true);
                            }
                        }

                        d['centroid'] = centroid;

                        return 'translate(' + projection(centroid) + ')'; }
                    )
                    .attr('r', function(d, i) {
                        if (d[dataColumn] != null) {
                            return radius(d[dataColumn]);
                        } else {
                            return radius(0);
                        }
                    })
                    .attr('class', function(d, i) {
                        return 'circle ' + classify(d['county_name']);
                    });

    if (!isMobile) {
        bubbles.on('mouseover', function(d) {
                d3.select(this).attr('active', true);
                tooltip.classed('active', true)
                    .html('<strong>' + d['county_name'] + ':</strong> ' + fmtComma(d[dataColumn]) + ' accounts')
                    .attr('style', function() {
                        var projectedCentroid = projection(d['centroid']);
                        var s = '';
                        var ttWidth = tooltip.node().getBoundingClientRect()['width'];
                        var ttHeight = tooltip.node().getBoundingClientRect()['height'];
                        s += 'top: ' + calculateYPos(projectedCentroid[1], ttHeight, mapHeight) + 'px; ';
                        s += 'left: ' + calculateXPos(projectedCentroid[0], ttWidth, mapWidth) + 'px; ';
                        return s;
                    });
            })
            .on('mouseout', function(d) {
                // only trigger if we've not moused over any other circles
                var e = d3.event;
                if (!d3.select(e.toElement).classed('circle')) {
                    d3.select(this).attr('active', false);
                    tooltip.classed('active', false);
                }
            });
    }

    /*
     * Render major cities.
     */
    chartElement.append('g')
        .attr('class', 'cities primary')
        .selectAll('path')
            .data(mapData['cities']['features'])
        .enter().append('path')
            .attr('d', path)
            .attr('class', function(d) {
                var c = 'place';

                c += ' ' + classify(d['properties']['city']);
                c += ' ' + classify(d['properties']['featurecla']);
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

    /*
     * Render city labels.
     */
    var layers = [
        'city-labels shadow primary',
        'city-labels primary'
    ];

    layers.forEach(function(layer) {
        var data = [];

        if (layer == 'city-labels shadow' || layer == 'city-labels') {
            data = mapData['neighbors']['features'];
        } else {
            data = mapData['cities']['features'];
        }

        chartElement.append('g')
            .attr('class', layer)
            .selectAll('.label')
                .data(data)
            .enter().append('text')
                .attr('class', function(d) {
                    var c = 'label';

                    c += ' ' + classify(d['properties']['city']);
                    c += ' ' + classify(d['properties']['featurecla']);
                    c += ' scalerank-' + d['properties']['scalerank'];

                    return c;
                })
                .attr('transform', function(d) {
                    return 'translate(' + projection(d['geometry']['coordinates']) + ')';
                })
                .attr('style', function(d) {
                    return 'text-anchor: ' + positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'text-anchor');
                })
                .attr('dx', function(d) {
                    return positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'dx');
                })
                .attr('dy', function(d) {
                    return positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'dy');
                })
                .text(function(d) {
                    return CITIES[d['properties']['city']] || d['properties']['city'];
                });
    });

    d3.selectAll('.shadow')
        .attr('filter', 'url(#textshadow)');

    // add bubble scale
    var scaleDots = chartElement.append('g')
        .attr('class', 'key-scale');

    var scaleAnchorTop = projection([ -87.2169, 29.0 ]);
    if (!isMobile) {
        scaleAnchorTop = projection([ -87.2169, 29.3 ]);
    }

    scaleKey.forEach(function(d, i) {
        scaleDots.append('circle')
            .attr('r', radius(d))
            .attr('cx', radius(scaleKey[1]) + 1)
            // .attr('cy', mapHeight - radius(d) - 1);
            .attr('cy', scaleAnchorTop[1] - radius(d) - 1);

        scaleDots.append('text')
            .attr('x', radius(scaleKey[1]))
            // .attr('y', mapHeight - (radius(d) * 2))
            .attr('y', scaleAnchorTop[1] - (radius(d) * 2))
            .attr('dy', function() {
                if (isMobile) {
                    return 9;
                } else {
                    return 12;
                }
            })
            .text(function() {
                var amt = d;
                return fmtComma(amt.toFixed(0));
            });
    });

    /*
     * Render a scale bar.
    var scaleBarDistance = calculateOptimalScaleBarDistance(bbox, 10);
    var scaleBarStart = [10, mapHeight - 20];
    var scaleBarEnd = calculateScaleBarEndPoint(projection, scaleBarStart, scaleBarDistance);

    chartElement.append('g')
        .attr('class', 'scale-bar')
        .append('line')
        .attr('x1', scaleBarStart[0])
        .attr('y1', scaleBarStart[1])
        .attr('x2', scaleBarEnd[0])
        .attr('y2', scaleBarEnd[1]);

    d3.select('.scale-bar')
        .append('text')
        .attr('x', scaleBarEnd[0] + 5)
        .attr('y', scaleBarEnd[1] + 3)
        .text(scaleBarDistance + ' miles');
    */
}

/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = config['labelColumn'];
    var valueColumn = config['valueColumn'];

    var barHeight = 25;
    var barGap = 3;
    var labelWidth = 65;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 50000;

    if (isMobile) {
        barHeight = 20;
        barGap = 3;
    }

    if (config['showXAxisLabels']) {
        margins['bottom'] = 20;
        margins['right'] = 15;
        roundTicksFactor = 100000;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    containerElement.append('h3')
        .text(config['title']);

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
    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    })

    var xScale = d3.scale.linear()
        .domain([min, max])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            var val = d / 1000;
            return val.toFixed(0) + 'K';
        });

    if (config['showXAxisLabels']) {
        /*
         * Render axes to chart.
         */
        chartElement.append('g')
            .attr('class', 'x axis')
            .attr('transform', makeTranslate(0, chartHeight))
            .call(xAxis);

        /*
         * Render grid to chart.
         */
        var xAxisGrid = function() {
            return xAxis;
        };

        chartElement.append('g')
            .attr('class', 'x grid')
            .attr('transform', makeTranslate(0, chartHeight))
            .call(xAxisGrid()
                .tickSize(-chartHeight, 0, 0)
                .tickFormat('')
            );
    }

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
                if (d[valueColumn] >= 0) {
                    return xScale(0);
                }

                return xScale(d[valueColumn]);
            })
            .attr('width', function(d) {
                return Math.abs(xScale(0) - xScale(d[valueColumn]));
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('height', barHeight)
            .attr('class', function(d, i) {
                return 'bar-' + i + ' ' + classify(d[labelColumn]);
            });

    /*
     * Render 0-line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', xScale(0))
            .attr('x2', xScale(0))
            .attr('y1', 0)
            .attr('y2', chartHeight);
    }

    /*
     * Render bar labels.
     */
    chartWrapper.append('ul')
        .attr('class', 'labels')
        .attr('style', formatStyle({
            'width': labelWidth + 'px',
            'top': margins['top'] + 'px',
            'left': '0'
        }))
        .selectAll('li')
        .data(config['data'])
        .enter()
        .append('li')
            .attr('style', function(d, i) {
                return formatStyle({
                    'width': labelWidth + 'px',
                    'height': barHeight + 'px',
                    'left': '0px',
                    'top': (i * (barHeight + barGap)) + 'px;'
                });
            })
            .attr('class', function(d) {
                return classify(d[labelColumn]);
            })
            .append('span')
                .text(function(d) {
                    return d[labelColumn];
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
                // return fmtComma(d[valueColumn]) + ' (' + d['overall_out_pct'] + ')';
                return fmtComma(d[valueColumn]);
            })
            .attr('x', function(d) {
                return xScale(d[valueColumn]);
            })
            .attr('y', function(d, i) {
                return i * (barHeight + barGap);
            })
            .attr('dx', function(d) {
                var xStart = xScale(d[valueColumn]);
                var textWidth = this.getComputedTextLength()

                // Negative case
                if (d[valueColumn] < 0) {
                    var outsideOffset = -(valueGap + textWidth);

                    if (xStart + outsideOffset < 0) {
                        d3.select(this).classed('in', true)
                        return valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return outsideOffset;
                    }
                // Positive case
                } else {
                    if (xStart + valueGap + textWidth > chartWidth) {
                        d3.select(this).classed('in', true)
                        return -(valueGap + textWidth);
                    } else {
                        d3.select(this).classed('out', true)
                        return valueGap;
                    }
                }
            })
            .attr('dy', (barHeight / 2) + 3);
}

/*
 * Move a set of D3 elements to the front of the canvas.
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

// calculate optimal x/y tooltip position
var calculateXPos = function(xPos, width, graphicWidth) {
    var newXPos = null;
    var offset = 5;
    var ttWidth = xPos + offset + width;
    if (ttWidth > graphicWidth) {
        newXPos = xPos - width - offset;
    } else {
        newXPos = xPos + offset;
    }
    return newXPos;
}
var calculateYPos = function(yPos, height, graphicHeight) {
    var newYPos = null;
    var offset = 5;
    var ttHeight = yPos + offset + height;
    if (ttHeight > graphicHeight) {
        newYPos = yPos - height - offset;
    } else {
        newYPos = yPos + offset;
    }
    return newYPos;
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

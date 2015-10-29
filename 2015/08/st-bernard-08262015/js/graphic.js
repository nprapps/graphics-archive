// Global config
var GRAPHIC_DEFAULT_WIDTH = 730;
var MOBILE_THRESHOLD = 500;
var COLOR_SCALE = [
    COLORS['blue3'],    // white
    COLORS['teal3'],    // black
    COLORS['yellow3'],  // hispanic
    COLORS['red3']      // asian
];

var COUNTIES = {
    'st-bernard': '087'
}
var RACES = ['White', 'Black', 'Hispanic', 'Asian'];

// Global vars
var pymChild = null;
var isMobile = false;
var totalsData = {};
var changeData = {};
var changeMultiples = {};
var geoData = null;

// D3 formatters
var fmtComma = d3.format(',');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');

/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        totalsData = TOTALS;
        changeData = CHANGE;

        formatData();
        loadJSON('geodata.json')
    } else {
        pymChild = new pym.Child({});
    }
}

var loadJSON = function(url) {
    d3.json(url, function(error, data) {
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
    _.each(totalsData, function(v, k) {
        v.forEach(function(d) {
            var y0 = 0;

            d['values'] = [];
            d['total'] = 0;

            for (var key in d) {
                if (key == 'label' || key == 'values' || key == 'total') {
                    continue;
                }

                d[key] = +d[key];

                var y1 = y0 + d[key];
                d['total'] += d[key];

                d['values'].push({
                    'name': key,
                    'y0': y0,
                    'y1': y1,
                    'val': d[key]
                })

                y0 = y1;
            }
        });
    });

    /*
     * Convert change data to small multiples/
     */
    changeMultiples = {};

    _.each(changeData, function(data, parish) {
        changeMultiples[parish] = {};

        _.each(RACES, function(race) {
            changeMultiples[parish][race] = _.map(data, function(row) {
                var filtered = {};

                _.each(row, function(value, column) {
                    if (column == 'date') {
                        filtered[column] = d3.time.format('%Y').parse(value);
                    } else if (column == race || column == 'Pre-Katrina ' + race) {
                        filtered[column] = +value;
                    }
                })

                return filtered;
            });
        });
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth || containerWidth > GRAPHIC_DEFAULT_WIDTH) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    var totalsWidth = containerWidth * 0.25;
    var totalsHeight = 225;
    var columnSpacer = 20;
    var changeLabelWidth = 70;
    var changeWidth = containerWidth * 0.75;
    var changeHeight = 200;
    var changeChartWidth = (changeWidth - changeLabelWidth - columnSpacer) / 2

    if (isMobile) {
        totalsWidth = containerWidth;
        totalsHeight = containerWidth;
        changeLabelWidth = 40;
        changeWidth = containerWidth;
        changeHeight = (changeWidth - changeLabelWidth) / 2;
        changeChartWidth = changeHeight;
    }

    _.each(totalsData, function(v, parish) {
        if (parish == 'metro') {
            return;
        }

        renderStackedColumnChart({
            container: '#' + parish + ' .totals',
            width: totalsWidth,
            height: totalsHeight + 20,
            data: totalsData[parish],
            scaleMax: 75000
        });

        _.each(['scale', 'scale2'], function(scaleClass) {
            renderLineChart({
                container: '#' + parish + ' .change-wrapper .' + scaleClass,
                width: changeLabelWidth,
                height: changeHeight,
                data: changeMultiples[parish]['White'],
                scaleMax: (parish == 'st-tammany' ? 2 : 1),
                race: null,
                scaleOnly: true
            });
        });

        _.each(changeMultiples[parish], function(data, race) {
            renderLineChart({
                container: '#' + parish + ' .change-wrapper .' + classify(race) + ' .graphic',
                width: changeChartWidth,
                height: changeHeight,
                data: data,
                scaleMax: (parish == 'st-tammany' ? 2 : 1),
                race: race,
                scaleOnly: false
            });
        });

        renderLocatorMap({
            container: '#' + parish + ' .map',
            parish: parish,
            width: totalsWidth,
            height: totalsWidth,
            data: geoData,
            primaryCounty: COUNTIES[parish],
            defaultScale: 16000
        });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a stacked column chart.
 */
var renderStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var valueGap = 6;

    var margins = {
        top: 10,
        right: 0,
        bottom: 20,
        left: 35
    };

    var ticksY = 4;
    var roundTicksFactor = 25000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = config['height'] - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var formatNumber = function(d) {
        if (d >= 1000000) {
            return Math.round(d / 1000000).toFixed(0) + 'M';
        } else if (d >= 1000) {
            return Math.round(d / 1000).toFixed(0) + 'K';
        } else {
            return d;
        }
    }

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeRoundBands([0, chartWidth], .1)

    var yScale = d3.scale.linear()
        .domain([
            0,
            config['scaleMax']
        ])
        .rangeRound([chartHeight, 0]);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
            .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickValues([0, 25000, 50000, 75000])
        .tickFormat(formatNumber);

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

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
    var bars = chartElement.selectAll('.bars')
        .data(config['data'])
        .enter().append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return makeTranslate(xScale(d[labelColumn]), 0);
            });

    bars.selectAll('rect')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('rect')
            .attr('y', function(d) {
                if (d['y1'] < d['y0']) {
                    return yScale(d['y0']);
                }

                return yScale(d['y1']);
            })
            .attr('width', xScale.rangeBand())
            .attr('height', function(d) {
                return Math.abs(yScale(d['y0']) - yScale(d['y1']));
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    /*
     * Render values to chart.
     */
    bars.selectAll('text')
        .data(function(d) {
            return d['values'];
        })
        .enter().append('text')
            .text(function(d) {
                return formatNumber(d['val']);
            })
            .attr('class', function(d) {
                return classify(d['name']);
            })
            .attr('x', function(d) {
                return xScale.rangeBand() / 2;
            })
            .attr('y', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

                if (textHeight + valueGap * 2 > barHeight) {
                    d3.select(this).classed('hidden', true);
                }

                var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);

                return barCenter + textHeight / 2;
            })
            .attr('text-anchor', 'middle');
}

/*
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var margins = {
        top: 5,
        right: 55,
        bottom: 30,
        left: 13
    };

    if (config['scaleOnly']) {
        if (isMobile) {
            margins['left'] = 40;
        } else {
            margins['left'] = 70;
        }

        margins['right'] = 0;
    } else if (isMobile) {
        margins['right'] = 15;
        margins['left'] = 7;
    }

    // var ticksX = 5;
    var ticksY = 5;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = config['height'] - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var formattedData = {};

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in config['data'][0]) {
        if (column == dateColumn) {
            continue;
        }

        formattedData[column] = config['data'].map(function(d) {
            return {
                'date': d[dateColumn],
                'amt': d[column]
            };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'], function(d) {
            return d[dateColumn];
        }))
        .range([ 0, chartWidth ])

    var yScale = d3.scale.linear()
        .domain([ -1, config['scaleMax'] ])
        .range([ chartHeight, 0 ]);

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
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues([
            d3.time.format('%Y').parse('2000'),
            d3.time.format('%Y').parse('2005'),
            d3.time.format('%Y').parse('2014')
        ])
        .tickFormat(function(d, i) {
            if (d.getFullYear() == 2005) {
                return 'Katrina';
            }

            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d == 0) {
                return d;
            }

            var label = '';

            if (d > 0) {
                label += '+'
            }

            label += (d * 100) + '%'

            return label;
        });

    /*
     * Render axes to chart.
     */
    if (config['scaleOnly']) {
        chartElement.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        return;
    }

    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.select('.x.axis .tick:nth-child(2) text')
        .html('<tspan>2005</tspan><tspan x="0" y="28">(Katrina)</tspan>')

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    /*
     * Render 0 value line.
     */
    chartElement.append('line')
        .attr('class', 'zero-line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', yScale(0))
        .attr('y2', yScale(0));

    /*
     * Render Katrina line.
     */
    var katrinaDate = d3.time.format('%Y').parse('2005');

    chartElement.append('line')
        .attr('class', 'katrina-line')
        .attr('x1', xScale(katrinaDate))
        .attr('x2', xScale(katrinaDate))
        .attr('y1', 0)
        .attr('y2', chartHeight);

    /*
     * Render lines to chart.
     */
    var line = d3.svg.line()
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formattedData))
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

    if (!isMobile) {
        chartElement.append('g')
            .attr('class', 'value')
            .selectAll('text')
            .data(d3.entries(formattedData))
            .enter().append('text')
                .attr('class', function(d, i) {
                    return classify(d['key']);
                })
                .attr('x', function(d, i) {
                    var last = d['value'][d['value'].length - 1];

                    return xScale(last[dateColumn]) + 5;
                })
                .attr('y', function(d) {
                    var last = d['value'][d['value'].length - 1];

                    return yScale(last[valueColumn]) + 3;
                })
                .text(function(d) {
                    var label = '';
                    var last = d['value'][d['value'].length - 1];
                    var value = last[valueColumn];

                    if (value > 0) {
                        label = '+';
                    }

                    label += (last[valueColumn] * 100).toFixed(1) + '%';

                    // if (!isMobile) {
                    //     label = d['key'] + ': ' + label;
                    // }

                    return label;
                });
    }

    // annotate population line (white chart only)
    if (config['race'] == 'White') {
        var annotYear = '2009'
        var annotAmt = null;

        formattedData['Pre-Katrina White'].forEach(function(d, i) {
            if (fmtYearFull(d['date']) == annotYear) {
                annotAmt = d['amt'];
            }
        });

        var annotation = chartElement.append('g')
            .attr('class', 'annotation');

        annotation.append('line')
            .attr('x1', xScale(fmtYearFull.parse(annotYear)))
            .attr('x2', xScale(fmtYearFull.parse(annotYear)))
            .attr('y1', yScale(annotAmt) - 15)
            .attr('y2', yScale(annotAmt))
            .attr('stroke', '#999');

        annotation.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', xScale(fmtYearFull.parse(annotYear)))
            .attr('y', yScale(annotAmt) - 32)
            .text('Projected growth');

        annotation.append('text')
            .attr('text-anchor', 'middle')
            .attr('x', xScale(fmtYearFull.parse(annotYear)))
            .attr('y', yScale(annotAmt) - 20)
            .text('(pre-Katrina)');
    }
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var bbox = config['data']['bbox'];
    var defaultScale = config['defaultScale'];
    var cityDotRadius = 3;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = config['height'];

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
    var centroid = [-89.77, 29.85];
    var mapScale = (mapWidth / GRAPHIC_DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / GRAPHIC_DEFAULT_WIDTH;

    projection = d3.geo.mercator()
        .center(centroid)
        .scale(mapScale)
        .translate([ mapWidth / 2, mapHeight / 2 ]);

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
     * Render countries.
     */
    // Land outlines
    chartElement.append('g')
        .attr('class', 'countries')
        .selectAll('path')
            .data(mapData['countries']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                return classify(d['id']);
            })
            .attr('d', path);

    /*
     * Render rivers.
     */
    chartElement.append('g')
        .attr('class', 'rivers')
        .selectAll('path')
            .data(mapData['rivers']['features'])
        .enter().append('path')
            .attr('d', path);

    /*
     * Render lakes.
     */
    chartElement.append('g')
        .attr('class', 'lakes')
        .selectAll('path')
            .data(mapData['lakes']['features'])
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
            var cls = classify(d['id']);

            if (d['id'] == config['primaryCounty'] || config['primaryCounty'] == null) {
                cls += ' primary';
            }

            return cls;
        })
        .attr('d', path);

    // place tiny inset map
    var insetMap = d3.select('#' + config['parish'] + ' img.inset')
        .attr('style', function(d) {
            var s = '';

            s += 'top: ' + (mapHeight - 25 - 8) + 'px; ';
            s += 'left: ' + (mapWidth - 50 - 5) + 'px; ';

            return s;
        });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

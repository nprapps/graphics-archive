// Global config
var GEO_DATA_URL = 'data/world-110m.json';
var MID_DESKTOP_THRESHOLD = 600;

// Global vars
var pymChild = null;
var isMobile = false;
var isMidDesktop = false;
var geoData = null;
var graphicData = null;
var topCountriesData = null;
var topDiffData = null;
var scaleKey = [ 1000000, 4000000 ];
var dataCol = 'conflict_new';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadJSON()
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
        graphicData = DATA;

        // recast population figures as numbers
        graphicData.forEach(function(d, i) {
            if (d[dataCol] != null) {
                d[dataCol] = +d[dataCol];
            }
            if (d['lat'] != null) {
                d['lat'] = +d['lat'];
            }
            if (d['lon'] != null) {
                d['lon'] = +d['lon'];
            }
        });

        graphicData = graphicData.sort(function(a, b){
            return d3.descending(a[dataCol], b[dataCol]);
        });

        topCountriesData = graphicData.slice(0,10);

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

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (containerWidth > MOBILE_THRESHOLD && containerWidth <= MID_DESKTOP_THRESHOLD) {
        isMidDesktop = true;
    } else {
        isMidDesktop = false;
    }

    var containerElement = d3.select('.graphic');
    containerElement.html('');

    var worldMap = containerElement.append('div')
        .attr('id', 'world-map');

    renderLocatorMap({
        container: '#world-map',
        width: containerWidth,
        geoData: geoData,
        dataCol: dataCol
    });

    var barCharts = containerElement.append('div')
        .attr('id', 'bar-charts');
    var totals = barCharts.append('div')
        .attr('id', 'totals');

    totals.append('h3')
        .html('Countries with the most new IDP<span style="text-transform: none">s</span> due to conflict in 2015');

    var barLabelCol = 'name';
    if (isMidDesktop) {
        barLabelCol = 'abbrev';
    }

    if (isMobile) {
        renderBarChart({
            container: '#totals',
            width: containerWidth,
            data: topCountriesData,
            labelCol: barLabelCol,
            dataCol: dataCol,
            max: 4000000
        });
    } else {
        renderColumnChart({
            container: '#totals',
            width: containerWidth,
            data: topCountriesData,
            labelCol: barLabelCol,
            dataCol: dataCol,
            max: 4000000
        });
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 1.92;
    var aspectHeight = 1;
    var defaultScale = 95;

    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;

    var dataCol = config['dataCol'];

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    /*
     * Extract topo data.
     */
    var mapData = {};

    for (var key in config['geoData']['objects']) {
        mapData[key] = topojson.feature(config['geoData'], config['geoData']['objects'][key]);
    }

    /*
     * Create the map projection.
     */
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / DEFAULT_WIDTH;

    var projection = d3.geo.miller()
        .scale(mapScale)
        .translate([ mapWidth / 2 * 0.97, mapHeight / 2 * 1.27 ]);

    path = d3.geo.path()
        .projection(projection);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);

    /*
     * Create the root SVG element.
     */
    chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = containerElement.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')
        .attr('transform', 'translate(0,0)');

    /*
     * Render countries.
     */
    // Land outlines
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

    // draw population circles
    var radius = d3.scale.sqrt()
        .domain([0, 5000000])
        .range([0, 25 * scaleFactor]);

    var populations = chartElement.append('g')
        .attr('class', 'populations');

    populations.selectAll('circle')
        .data(graphicData.filter(function(d, i) {
           return d[dataCol] != null;
        }))
        .enter()
            .append('circle')
                .attr('transform', function(d,i) {

                    var id = d['id'];
                    var centroid = [ 0, 0 ];

                    // check for an override
                    if (d['lat'] != null && d['lon'] != null) {
                        centroid = [ d['lon'], d['lat'] ];
                    // or, if this is a country map, use country centroid
                    } else {
                        var country = d3.select('.country-' + id);
                        // find the country centroid
                        if (country[0][0] != null) {
                            centroid = d3.geo.centroid(country[0][0]['__data__']);
                        // or maybe the point doesn't exist
                        } else {
                            // console.log('no centroid for: ' + d['name']);
                        }
                    }
                    return 'translate(' + projection(centroid) + ')'; }
                )
                .attr('r', function(d, i) {
                    if (d[dataCol] != null) {
                        return radius(d[dataCol]);
                    } else {
                        return radius(0);
                    }
                })
                .attr('class', function(d, i) {
                    return classify(d['name']);
                });

    populations.selectAll('text')
        .data(graphicData.filter(function(d, i) {
           return d[dataCol] > 1000000;
        }))
        .enter()
            .append('text')
                .text(function(d) {
                    return d['name'];
                })
                .attr('transform', function(d) {
                    var id = d['id'];
                    var country = d3.select('.country-' + id);
                    var centroid = [ 0, 0 ];

                    if (country[0][0] != null) {
                        centroid = d3.geo.centroid(country[0][0]['__data__'])

                        switch(d['name']) {
                            case 'United States':
                                centroid = [ -98.579500, 39.828175 ];
                                break;
                            case 'France':
                                centroid = [ 2.4442, 46.7692 ];
                                break;
                        }
                    }

                    return 'translate(' + projection(centroid) + ')'; }
                )
                .attr('class', function(d, i) {
                    return classify(d['name']);
                });

    // add scale
    var scaleDots = chartElement.append('g')
        .attr('class', 'key');

    scaleKey.forEach(function(d, i) {
        scaleDots.append('circle')
            .attr('r', radius(d))
            .attr('cx', radius(scaleKey[1]) + 1)
            .attr('cy', mapHeight - radius(d) - 1);

        scaleDots.append('text')
            .attr('x', radius(scaleKey[1]))
            .attr('y', mapHeight - (radius(d) * 2))
            .attr('dy', function() {
                if (isMobile) {
                    return 9;
                } else {
                    return 12;
                }
            })
            .text(function() {
                var amt = d / 1000000;
                return amt.toFixed(0) + 'M';
            });
    })
}


/*
 * Render a bar chart.
 */
var renderBarChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = config['labelCol'];
    var valueColumn = config['dataCol'];

    var barHeight = 30;
    var barGap = 3;
    var labelWidth = 85;
    var labelMargin = 6;
    var valueGap = 6;

    var margins = {
        top: 0,
        right: 15,
        bottom: 0,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 1000000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = ((barHeight + barGap) * config['data'].length);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);

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

    var max = config['max'];

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
            if (d >= 1000000) {
                return (d/1000000).toFixed(0) + 'M';
            } else {
                return fmtComma(d.toFixed(0));
            }
        });

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
                if (d[valueColumn] >= 1000000) {
                    return (d[valueColumn]/1000000).toFixed(1) + 'M';
                } else {
                    return fmtComma(d[valueColumn].toFixed(0));
                }
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
            .attr('dy', (barHeight / 2) + 3)
}


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = config['labelCol'];
    var valueColumn = config['dataCol'];

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 5;
    var valueGap = 6;

    var margins = {
        top: 5,
        right: 1,
        bottom: 50,
        left: 25
    };

    var ticksY = 4;
    var roundTicksFactor = 1000000;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

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

    var max = config['max'];

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickFormat(function(d, i) {
            return d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            if (d >= 1000000) {
                return (d/1000000).toFixed(0) + 'M';
            } else {
                return fmtComma(d.toFixed(0));
            }
        })

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis)
        .selectAll('.tick text')
            .attr('y', '18')
            .attr('dx', '0')
            .attr('dy', '0')
            .call(wrapText, xScale.rangeBand(), 13);

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
            .attr('class', function(d) {
                return 'bar bar-' + d[labelColumn];
            });

    /*
     * Render 0 value line.
     */
    if (min < 0) {
        chartElement.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0));
    }

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
                if (d[valueColumn] >= 1000000) {
                    return (d[valueColumn]/1000000).toFixed(1) + 'M';
                } else {
                    return fmtComma(d[valueColumn].toFixed(0));
                }
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]);
            })
            .attr('dy', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = 0;

                if (d[valueColumn] < 0) {
                    barHeight = yScale(d[valueColumn]) - yScale(0);

                    if (textHeight + valueGap * 2 < barHeight) {
                        d3.select(this).classed('in', true);
                        return -(textHeight - valueGap / 2);
                    } else {
                        d3.select(this).classed('out', true)
                        return textHeight + valueGap;
                    }
                } else {
                    barHeight = yScale(0) - yScale(d[valueColumn]);

                    if (textHeight + valueGap * 2 < barHeight) {
                        d3.select(this).classed('in', true)
                        return textHeight + valueGap;
                    } else {
                        d3.select(this).classed('out', true)
                        return -(textHeight - valueGap / 2);
                    }
                }
            })
            .attr('text-anchor', 'middle')
}


/*
 * Wrap a block of text to a given width
 * via http://bl.ocks.org/mbostock/7555321
 */
var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', '0px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
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

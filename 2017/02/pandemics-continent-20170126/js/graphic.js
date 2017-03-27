// Global vars
var pymChild = null;
var isMobile = false;
var charts = [];
var axisLabelsLookup = {};
var annotations = [];
var globalColorScale;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    //charts = d3.keys(DATA);
    // Custom ordering of charts so they appear in vaguely geographic orientation
    charts = ['north america', 'europe', 'asia', 'south america', 'africa', 'australia'];

    charts.forEach(function(v,k) {

        var chartData = DATA[v];
        var chartAxisLabels = [];
        annotations[v] = [];

        chartData.forEach(function(d,i){
            d['amt'] = +d['amt'];
            d['year'] = d['label'];
            d['label'] = d3.time.format('%Y').parse(d['label']);
            if (d['annotate'] == 'yes') {
                annotations[v].push(d);
            }

            if (chartAxisLabels.length == 0 && +d['amt'] > 0) {
                chartAxisLabels.push(d['label']);
            } else if (i == chartData.length-1) {
                chartAxisLabels.push(d['label']);
            }
        });

        axisLabelsLookup[v] = chartAxisLabels;
    });

    createColorScale();
}

var createColorScale = function() {
    var yearExtent = d3.extent(DATA['asia'], function(d) {
        return +d['year'];
    });

    globalColorScale = d3.scale.linear()
        .domain(yearExtent)
        .range([COLORS['blue2'], COLORS['yellow3']]);
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 18;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        graphicWidth = containerWidth;
    } else {
        isMobile = false;
        graphicWidth = Math.floor((containerWidth-(gutterWidth *2 )) / 3);
    }

    var containerElement = d3.select('#column-chart');
    containerElement.html('');

    charts.forEach(function(v,k){
        var chartId = 'chart-' + classify(v);

        var chartElement = containerElement.append('div')
            .attr('class', 'graphic')
            .attr('id', chartId);

        if(!isMobile){
            chartElement.attr('style', function(){
                var s = '';
                s+= 'float:left; ';
                s+= 'width: ' + graphicWidth + 'px; ';
                if(k % 3 > 0 ){
                    s+= 'margin-left: ' + gutterWidth + 'px; ';
                }
                return s;
            });
        }

        // Render the chart!
        renderColumnChart({
            container: '#' + chartId,
            width: graphicWidth,
            data: DATA[v],
            yDomain: [0, 15],
            axisLabels: axisLabelsLookup[v],
            title: v
        });

    });
    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
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
    var labelLineHeight = 12;

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;
    var valueGap = 6;

    var margins = {
        top: 10,
        right: 5,
        bottom: 20,
        left: 24
    };

    var ticksY = 4;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

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

    var max = config['yDomain'][1];

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(config['axisLabels'])
        .outerTickSize(0)
        .tickFormat(function(d, i) {
            var yearFull = fmtYearFull(d);
            var bucketEnd = (parseInt(yearFull) + 4).toString().slice(-2);
            return yearFull + '-' + bucketEnd;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
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

    chartElement.select('.x.axis').selectAll('g.tick')
        .select('text')
            .attr('dx', function(d) {
                var tickYear = fmtYearFull(d);
                if (tickYear == '1940') {
                    return '-5px';
                } else if (tickYear == '2005') {
                    return '5px';
                } else {
                    return '0px';
                }
             })
            .style('text-anchor', function(d) {
                var tickYear = fmtYearFull(d);
                if (tickYear == '1940') {
                    return 'start';
                } else if (tickYear == '2005') {
                    return 'end';
                } else {
                    return 'middle';
                }
             });

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
            .attr('fill', function(d) {
                return globalColorScale(+d['year']);
            })
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
     * Create annotations
     */
     var annotatedPoints = chartElement.append('g')
       .attr('class', 'annotations')
       .selectAll('.annot')
       .data(annotations[config['title']])
       .enter()
           .append('g')
           .attr('class', 'annot');

    annotatedPoints.append('line')
        .attr('y1', function(d) {
            return yScale(d[valueColumn]) - 18;
        })
        .attr('y2', function(d) {
            // return yScale(d[valueColumn]) - 41;
            return yScale(d[valueColumn]) - 32;
        })
        .attr('x1', function(d) {
            return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
        })
        .attr('x2', function(d) {
            return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
        })
        .attr('class', function(d) {
            return 'line-' + classify(config['title']);
        });

    annotatedPoints.append('text')
        .text(function(d) {
            switch(config['title']){
                case('asia'):
                    return "SARS";
                default:
                    return null;
            }
        })
        .attr('x', function(d) {
            return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
        })
        .attr('y', function(d) {
            switch(config['title']){
                default:
                    return yScale(d[valueColumn]) - 34;
                    // return yScale(d[valueColumn]) - 43;
            }
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
                if(d[valueColumn] > 0){
                    return d[valueColumn].toFixed(0);
                }
                else{
                    return null;
                }
            })
            .attr('x', function(d, i) {
                return xScale(d[labelColumn]) + (xScale.rangeBand() / 2);
            })
            .attr('y', function(d) {
                return yScale(d[valueColumn]) + 3;
            })
            .attr('dy', function(d) {
                var textHeight = d3.select(this).node().getBBox().height;
                var barHeight = 0;

                d3.select(this).classed('out', true)
                return -(textHeight - valueGap / 2);
            })
            .attr('text-anchor', 'middle')
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

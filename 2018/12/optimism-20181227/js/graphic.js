// Global vars
var pymChild = null;
var isMobile = false;
var skipLabels = [ 'label', 'category', 'values', 'total','offset' ,'factor'];

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
    DATA.forEach(function(d) {
        var y0 = 0;

        d['values'] = [];
        d['total'] = 0;
        d['offset'] = +d['offset'];
        var label = d['label'];
        var y0 = d['offset'];

        for (var key in d) {
            if (_.contains(skipLabels, key)) {
                continue;
            }

            d[key] = +d[key];

            var y1 = y0 + d[key];
            d['total'] += d[key];

            d['values'].push({
                'name': key,
                'y0': y0,
                'y1': y1,
                'val': d[key],
                'label': label
            })

            y0 = y1;
        }
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
    renderGroupedStackedColumnChart({
        container: '#stacked-grouped-column-chart',
        width: containerWidth,
        data: DATA
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a grouped stacked column chart.
 */
var renderGroupedStackedColumnChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';

    var aspectWidth = 16;
    var aspectHeight = 9;
    var valueGap = 6;

    var margins = {
        top: 25,
        right: 1,
        bottom: 50,
        left: 40
    };

    var ticksY = 5;
    var roundTicksFactor = 50;

    if (isMobile) {
        aspectWidth = 4;
        aspectHeight = 3;
        margins['bottom'] = 65;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((chartWidth * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'category'))
        .rangeRoundBands([chartWidth / 6, chartWidth * 3 / 4], .1)
    if (isMobile){
            var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'category'))
        .rangeRoundBands([0, chartWidth], .1)
    }

    var xScaleBars = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeRoundBands([0, xScale.rangeBand()], .1)

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d['total'] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            if (!_.contains(skipLabels, d)) {
                return d;
            }
        }))
        //COLORS['orange3'],,'#787878'
        .range([ COLORS['blue1'], COLORS['blue2'],COLORS['blue3'], COLORS['blue4'],COLORS['blue5'], COLORS['blue6'], '#787878']);

    /*
     * Render the legend.
     */
    /* var legend = containerElement.append('ul')
		.attr('class', 'key')
		.selectAll('g')
			.data(colorScale.domain())
		.enter().append('li')
			.attr('class', function(d, i) {
				return 'key-item key-' + i + ' ' + classify(d);
			});

   legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d);
        });

    legend.append('label')
        .text(function(d) {
            return d;
        });*/

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
            return "";// d;
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d + "%";
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
         .attr('class', 'x axis category')
         .attr('transform', makeTranslate(0, chartHeight))
         .call(xAxis);

    chartElement.selectAll('.x.axis.category .tick line').remove();
    chartElement.selectAll('.x.axis.category text')
        .attr('y', 35)
        .attr('dy', 0)
        .call(wrapText, xScale.rangeBand(), 13);

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
    xScale.domain().forEach(function(c, k) {
        var categoryElement = chartElement.append('g')
            .attr('class', classify(c));

        var columns = categoryElement.selectAll('.columns')
            .data(config['data'].filter(function(d,i) {
                return d['category'] == c;
            }))
            .enter().append('g')
                .attr('class', 'column')
                .attr('transform', function(d) {
                    return makeTranslate(xScale(d['category']), 0);
                });

        // axis labels
        var xAxisBars = d3.svg.axis()
            .scale(xScaleBars)
            .orient('bottom')
            .tickFormat(function(d) {
                return d;
            });
        columns.append('g')
            .attr('class', 'x axis bars')
            .attr('transform', makeTranslate(0, -30))
            .call(xAxisBars);

        // column segments
        var bars = columns.append('g')
            .attr('class', 'bar')
            .attr('transform', function(d) {
                return makeTranslate(xScaleBars(d[labelColumn]), 0);
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
                .attr('width', xScaleBars.rangeBand())
                .attr('height', function(d) {
                    return Math.abs(yScale(d['y0']) - yScale(d['y1']));
                })
                .style('fill', function(d) {
                    return colorScale(d['name']);
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
                    var proportion = 1;
                    if(d['label'] == 'Optimistic'){
                        proportion = 1/.6;
                    }
                    if(d['label'] == 'Pessimistic'){
                        proportion = 1/.37;
                    }
                    return d['name'] + ": " + (d['val'] * proportion) + "%";
                })
                .attr('class', function(d) {

                    if (d['val'] == 0){
                        return "hidden";
                    }
                    if (isMobile){
                        return classify(d['name']) + " mobile";
                    }
                    if (d['label'] == "Optimistic"){
                        return classify(d['name']) + " optimistic";
                    }
                    if (d['label'] == "Unsure"){
                        return classify(d['name']) + " unsureCenter";
                    }
                    return classify(d['name']);
                })

                .attr('x', function(d) {
                    if (isMobile){
                        return  xScaleBars.rangeBand() / 2; 
                    }
                    if (d['label'] == 'Optimistic'){
                    return -1.4 * xScaleBars.rangeBand();    
                    }
                    else if (d['label'] == "Unsure"){
                        return (xScaleBars.rangeBand()  / 2);
                    }
                    return 1.22 * xScaleBars.rangeBand();
                    
                })
                
                .attr('y', function(d) {
                    var textHeight = 4;//d3.select(this).node().getBBox().height;
                    var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

                    var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);
                    var centerPos = barCenter + textHeight / 2;

                    if (isMobile) {
                    if (textHeight + valueGap * 2 > barHeight) {
                        d3.select(this).classed('hidden', true);
                        return centerPos - 3;
                    } else {
                        return centerPos;
                    }}
                    if (d['label'] == "Pessimistic"){
                        switch (d['name']){
                            case  "Family":
                                return centerPos + 16;
                                break;
                            case "Job":
                                return centerPos + 8;
                                break;
                            case  "Health":
                                return centerPos - 0;
                                break;
                            case "Finances":
                                return centerPos - 6;
                                break;
                            case  "Politics":
                                return centerPos - 0;
                                break;
                            case "News":
                                return centerPos - 0;
                                break;
                            case "Unsure":
                                return centerPos - 4;
                                break;
                        }}
                    if (d['label'] == 'Unsure'){
                        return centerPos - 24;
                    }
                    if (d['label'] == "Optimistic"){
                        switch (d['name']){
                            case  "Family":
                                return centerPos + 0;
                                break;
                            case "Job":
                                return centerPos + 0;
                                break;
                            case  "Health":
                                return centerPos - 0;
                                break;
                            case "Finances":
                                return centerPos - 0;
                                break;
                            case  "Politics":
                                return centerPos - 0;
                                break;
                            case "News":
                                return centerPos - 4;
                                break;
                            case "Unsure":
                                return centerPos - 12;
                                break;
                        }
                    }
                });


        bars.selectAll('line')
        .data(function(d){
            return d['values'];
        })
        .enter()
        .append('line')
        .attr('class', function(d){
            if (isMobile){
                return 'nolines'
            }
            switch (d['label']){
                case "Unsure":
                    return 'nolines';
                    break;
                case "Pessimistic":
                    return 'lines';
                    break;
                case "Optimistic":
                    return 'lines Optimistic';
                    break;
            }
                })
        .attr('x1',function(d) {
            if (d['label'] == "Optimistic"){
                return -.02 * xScaleBars.rangeBand();
            }
                return 1.02 * xScaleBars.rangeBand();
                })
        .attr('x2',function(d) {
            if (d['label'] == "Optimistic")
                switch (d['name']){
                            case  "Family":
                                return -.5 * xScaleBars.rangeBand();
                                break;
                            case "Job":
                                return -.6 * xScaleBars.rangeBand();
                                break;
                            case  "Health":
                                return -.5 * xScaleBars.rangeBand();
                                break;
                            case "Finances":
                                return -.4 * xScaleBars.rangeBand();
                                break;
                            case  "Politics":
                                return -.5 * xScaleBars.rangeBand();
                                break;
                            case "News":
                                return -.6 * xScaleBars.rangeBand();
                                break;
                            case "Unsure":
                                return -.5 * xScaleBars.rangeBand();
                                break;
                        }
                return 1.2 * xScaleBars.rangeBand();
                })
        .attr('y1',function(d) {

                    var textHeight = 4;//d3.select(this).node().getBBox().height;
                    var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

                    var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);
                    var centerPos = barCenter + textHeight / 2;
                    if (textHeight + valueGap * 2 > barHeight) {
                        d3.select(this).classed('hidden', true);
                        return centerPos - 3;
                    } else {
                        return centerPos;
                    }
                })
        .attr('y2', function(d) {

                    var textHeight = 4;//d3.select(this).node().getBBox().height;
                    var barHeight = Math.abs(yScale(d['y0']) - yScale(d['y1']));

                    var barCenter = yScale(d['y1']) + ((yScale(d['y0']) - yScale(d['y1'])) / 2);
                    var centerPos = barCenter + textHeight / 2;
                    if (d['label'] == "Pessimistic"){
                        switch (d['name']){
                            case  "Family":
                                return centerPos + 16;
                                break;
                            case "Job":
                                return centerPos + 8;
                                break;
                            case  "Health":
                                return centerPos - 0;
                                break;
                            case "Finances":
                                return centerPos - 6;
                                break;
                            case  "Politics":
                                return centerPos - 0;
                                break;
                            case "News":
                                return centerPos - 0;
                                break;
                            case "Unsure":
                                return centerPos - 4;
                                break;
                        }}
                    if (d['label'] == 'Unsure'){
                        return centerPos;
                    }
                    if (d['label'] == "Optimistic"){
                        switch (d['name']){
                            case  "Family":
                                return centerPos + 0;
                                break;
                            case "Job":
                                return centerPos + 0;
                                break;
                            case  "Health":
                                return centerPos - 0;
                                break;
                            case "Finances":
                                return centerPos - 0;
                                break;
                            case  "Politics":
                                return centerPos - 0;
                                break;
                            case "News":
                                return centerPos - 4;
                                break;
                            case "Unsure":
                                return centerPos - 12;
                                break;
                        }
                    }
                });


    })

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
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

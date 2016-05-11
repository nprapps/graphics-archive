// Global vars
var pymChild = null;
var isMobile = false;

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
        d3.select('#graphic-wrapper').classed('fallback-wrap', true);
        pymChild = new pym.Child({});
    }
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA.forEach(function(d) {
        d['amt'] = +d['amt'];
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
    renderColumnChart({
        container: '#column-chart',
        width: containerWidth,
        data: DATA
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

    var aspectWidth = isMobile ? 3 : 16;
    var aspectHeight = isMobile ? 3.2 : 9;
    var valueGap = 6;

    var margins = {
        top: isMobile ? 40 : 25,
        right: 5,
        bottom: 20,
        left: 5
    };

    var ticksY = 4;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

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

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

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
            return parseInt(d, 10);
        });

    //var yAxis = d3.svg.axis()
        //.scale(yScale)
        //.orient('left')
        //.ticks(ticksY)
        //.tickFormat(function(d) {
            //return fmtComma(d);
        //});

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    //chartElement.append('g')
        //.attr('class', 'y axis')
        //.call(yAxis)

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    //chartElement.append('g')
        //.attr('class', 'y grid')
        //.call(yAxisGrid()
            //.tickSize(-chartWidth, 0)
            //.tickFormat('')
        //);

    /*
     * Render bars to chart.
     */
    var bar_w = xScale.rangeBand();
    var num_blocks = isMobile ? 7 : 10;
    var block_margin = isMobile ? 1 : 2;
    var block_w = Math.floor(bar_w / num_blocks) - block_margin;
    var radius = block_w / 2;

    var bars = chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('g.bar')
        .data(config['data'])
        .enter()
        .append('g')
            .attr('transform', function(d) {
                var x_offset = 0;
                if (d['amt']/10 < num_blocks) {
                    x_offset = (bar_w / 2) - (block_w * (d['amt'] / 20)) - (block_w / 2);
                }
                return 'translate(' + (xScale(d[labelColumn]) + x_offset + block_margin) + ',0)';
            })
            .attr('class', function(d) {
                return 'bar bar-' + d[labelColumn];
            });

    // Add blocks to each group
    bars.selectAll('rect')
        .data(function(d) { return d3.range(Math.round(d['amt']/10)); })
            .enter()
        .append('circle')
            .attr('class', function(d) {
                return 'block';
            })
            //.attr('width', block_w)
            //.attr('height', block_w)
            .attr('r', radius)
            .attr('cx', function(d,i) {
                var x_pos = (i % num_blocks);
                return x_pos * (block_w + block_margin) + radius;
            })
            .attr('cy', function(d,i) {
                var y_pos = Math.floor(i / num_blocks);
                return chartHeight - (y_pos * (block_w + block_margin)) -  radius;
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
                var y_pos = Math.round(d['amt']/10) / num_blocks;
                var y_offset = Math.floor(y_pos) === 0 ? 5 : 0;
                return chartHeight - (y_pos * (block_w + block_margin)) - y_offset - (block_w / 2);
            })
            //.attr('dy', function(d) {
                //var textHeight = d3.select(this).node().getBBox().height;
                //var barHeight = 0;

                //barHeight = yScale(0) - yScale(d[valueColumn]);

                //return -(textHeight - valueGap / 2);
            //})
            .attr('text-anchor', 'middle')
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;

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
    graphicData.forEach(function(d) {
        var y0 = 0;

        d['values'] = [];
        d['total'] = 0;

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'total') {
                continue;
            }

            d[key] = +d[key];

            d['values'].push({
                'name': key,
                'y0': y0,
                'y1': d[key],
                'val': d[key]
            })

            y0 = d[key];
        }
    });
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
    renderStackedColumnChart({
        container: '#graphic',
        width: containerWidth,
        data: graphicData
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

    var barWidth = 20;
    var marginLeft = Math.floor((config['width'] - barWidth) * .4);
    var marginRight = Math.floor((config['width'] - barWidth) * .6);

    var margins = {
        top: 5,
        right: marginRight,
        bottom: 20,
        left: marginLeft
    };

    var ticksY = 5;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = barWidth;
    var chartHeight = 350;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], labelColumn))
        .rangeRoundBands([0, chartWidth], .1)

    var yScale = d3.scale.linear()
        .domain([ 0, 100000 ])
        .rangeRound([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(d) {
            return d != labelColumn && d != 'values' && d != 'total';
        }))
        .range([ COLORS['teal6'], COLORS['teal5'], COLORS['red3'], COLORS['teal4'], COLORS['teal2'] ]);

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
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d;
        });

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
            .attr('width', xScale.rangeBand())
            .attr('y', function(d) {
                return yScale(d['y1']);
            })
            .attr('height', function(d) {
                return yScale(d['y0']) - yScale(d['y1']);
            })
            .style('fill', function(d) {
                return colorScale(d['name']);
            })
            .attr('class', function(d) {
                return classify(d['name']);
            });

    /*
     * add labels
     */
    var labelDX = 6;
    var labelLineHeight = 13;
    var labelsDaily = chartElement.append('g')
        .attr('class', 'labels daily')
        .selectAll('text')
            .data(DEFS)
        .enter()
            .append('text')
            .attr('x', 0)
            .attr('dx', -labelDX)
            .attr('y', function(d) {
                return yScale(d['end']) + 9;
            })
            .attr('dy', 0)
            .style('text-anchor', 'end')
            .attr('class', function(d) {
                return classify(d['label']);
            })
            .text(function(d,i) {
                return d['hh_annual']
            })
            .call(wrapText, (margins['left'] - labelDX), labelLineHeight);

    var labelsGrouping = chartElement.append('g')
        .attr('class', 'labels grouping')
        .selectAll('text')
            .data(DEFS)
        .enter()
            .append('text')
            .attr('x', chartWidth)
            .attr('dx', labelDX)
            .attr('y', function(d) {
                return yScale(d['end']) + 9;
            })
            .attr('dy', 0)
            .style('text-anchor', 'begin')
            .attr('class', function(d) {
                return classify(d['label']);
            })
            .text(function(d,i) {
                return d['label'];
            })
            .call(wrapText, (margins['right'] - labelDX), labelLineHeight);

    var labelsAnnual = chartElement.append('g')
        .attr('class', 'labels annual')
        .selectAll('text')
            .data(DEFS)
        .enter()
            .append('text')
            .attr('x', chartWidth)
            .attr('dx', labelDX)
            .attr('y', function(d) {
                return yScale(d['end']) + 23;
            })
            .style('text-anchor', 'begin')
            .attr('class', function(d) {
                return classify(d['label']);
            })
            .text(function(d,i) {
                return d['hh_daily'];
            })
            .call(wrapText, (margins['right'] - labelDX), labelLineHeight);
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
            .attr('dx', dx + 'px')
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
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

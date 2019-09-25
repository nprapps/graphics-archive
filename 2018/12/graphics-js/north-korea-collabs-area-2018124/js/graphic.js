console.clear()

// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var d3 = require("./lib/d3.min")
var _ = require("./lib/underscore")
var { DEFAULT_WIDTH, MOBILE_THRESHOLD, fmtYearAbbrev, fmtYearFull } = require('./base')
var { makeTranslate, classify, COLORS } = require('./helpers')
var webFont = require("./lib/webfonts")


/*
 * Wrap a block of SVG text to a given width
 * adapted from http://bl.ocks.org/mbostock/7555321
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

        var dx = text.attr('dx') ? parseFloat(text.attr('dx')) : 0;
        var dy = text.attr('dy') ? parseFloat(text.attr('dy')) : 0;

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
                    .attr('dy', (lineNumber * lineHeight) + dy + 'px')
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}


/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    // if (Modernizr.svg) {
    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
    // } else {
    //     pymChild = new pym.Child({});
    // }

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
        d['date'] = new Date(d["date"], 0, 1);

        for (var key in d) {
            if (key != 'date' && d[key] != null && d[key].length > 0) {
                d[key] = +d[key];
            }
        }
    });

    /*
     * Restructure tabular data for easier charting.
     */
    for (var column in DATA[0]) {
        if (column == 'date') {
            continue;
        }

        dataSeries.push({
            'name': column,
            'values': DATA.map(function(d) {
                return {
                    'date': d['date'],
                    'amt': d[column]
                };
                // filter out empty data. uncomment this if you have inconsistent data.
                //        }).filter(function(d) {
                //            return d['amt'] != null;
            })
        });
    }
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
    renderAreaChart({
        container: '#line-chart',
        width: containerWidth,
        data: dataSeries
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render an area chart.
 */
var renderAreaChart = function(config) {

    /*
     * Setup
     */
    var dateColumn = 'date';
    var valueColumn = 'amt';

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var labelLineHeight = 14;

    var margins = {
        top: 5,
        right: 110,
        bottom: 20,
        left: 65
    };

    var ticksX = 10;
    var ticksY = 5;
    var roundTicksFactor = 10000;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['left'] = 30;
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([0, chartWidth])

    var min = d3.min(config['data'], function(d) {
        return d3.min(d['values'], function(v) {
            return Math.floor(v[valueColumn] / roundTicksFactor) * roundTicksFactor;
        })
    });

    if (min > 0) {
        min = 0;
    }

    var max = 160;

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(config['data'], 'name'))
        // .range([ COLORS['teal1'], COLORS['teal2'], COLORS['teal3'], COLORS['teal4'], COLORS['teal5'], '#ddd' ]);
        // .range([ '#17807e','#66957b','#99a976','#c6be71','#f3d469', '#ddd' ]);
        .range(['#0b403f', '#1b605e', '#38807e', '#5ea09e', '#8bc0bf', '#ddd']);

    // Render the HTML legend.

    if (isMobile) {



        var legend = containerElement.append('ul')
            .attr('class', 'key')
            .selectAll('g')
            .data(config.data)
            .enter().append('li')
            .attr('class', function(d, i) {
                // var lenData = config.data.length;
                // var reverseI = lenData - 1 - i;
                return 'key-item ' + classify(config.data[i].name);
            });

        legend.append('b');

        legend.append('label')
            .text(function(d, i) {
                // var lenData = config.data.length;
                // var reverseI = lenData - 1 - i;
                return config.data[i].name;
            });

    }


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
        .ticks(ticksX)
        .tickFormat(function(d, i) {
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
        .tickValues([0, 20, 40, 60, 80, 100, 120, 140, 160])
        .tickFormat(function(d, i) {
            if (!isMobile) {
                return d + " papers"
            } else {
                return d;

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
        .call(yAxis);

    // move top y tick

    d3.select(".y.axis").each(function(d, i) {
        var lastChild = this.lastChild;
    })

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
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

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
     * Render lines to chart.
     */
    var area = d3.svg.area()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y0(function(d) {
            return yScale(d['y0']);
        })
        .y1(function(d) {
            return yScale(d['y0'] + d[valueColumn]);
        });

    var stack = d3.layout.stack()
        .values(function(d) { return d['values']; })
        .x(function(d) {
            return d[dateColumn];
        })
        .y(function(d) {
            return d[valueColumn];
        });

    var areas = stack(config['data']);

    var area_g = chartElement.append('g')
        .attr('class', 'areas')
        .selectAll('.area-g')
        .data(areas)
        .enter()
        .append('g')
        .attr('class', 'area-g');

    area_g
        .append('path')
        .attr('class', function(d, i) {
            return 'area ' + classify(d['name']);
        })
        .attr('fill', function(d, i) {
            if (["China", "United States", "Germany"].indexOf(d.name) > -1) {
                return colorScale(d.name);
            } else {
                return "#B8B8B8"
            }
        })
        .attr('d', function(d) {
            return area(d['values']);
        });

    var value_g = chartElement.append('g')
        .attr('class', 'area-values value')
        .selectAll('text')
        .data(areas)
        .enter()
        .append('text')
        .text(function(d, i) {
            if (!isMobile) {
                return d['name'];
            } else {
                return ""
            }
        })
        .attr('class', function(d, i) {
            return classify(d['name']);
        })
        .attr('dx', function(d) {
            var dx = 0;
            return dx;
        })
        .attr('x', function(d, i) {
            var maxVal = getMaxValue(d, valueColumn);
            var xPos = xScale(maxVal[dateColumn])
            switch (d['name']) {
                case 'United States':
                    xPos = xScale(new Date(2016, 1, 1)) - 9;
                    break;
                case 'All other countries':
                    xPos = xScale(new Date(2012, 1, 1)) - 9;
                    break;
            }
            return xPos;
        })
        .attr('y', function(d, i) {
            var maxVal = getMaxValue(d, valueColumn);
            var yPos = yScale(maxVal['y0'] + (maxVal['y'] / 2)) + 6;
            switch (d['name']) {
                case 'United States':
                    yPos = yScale(105);
                    break;
                case 'All other countries':
                    yPos = yScale(130);
                    break;
            }
            return yPos;
        });

    var annot = chartElement.append('g').attr('class', 'annotations');
    annot.append('text').attr('class', 'year-hdr').text('Collaborations in 2017').attr('x', chartWidth + 10).attr('y', yScale(97)).attr('dy', - 22).call(wrapText, (margins.right - 15), labelLineHeight);
    annot.append('line').attr('x1', chartWidth + 2).attr("x2", chartWidth + 13).attr('y1', yScale(79) - labelLineHeight/3).attr('y2', yScale(79) - labelLineHeight/3).attr("stroke", "gray").attr("stroke-width", "1");
    annot.append('text').attr('class', 'annot-label').text('All other countries: 18').attr('x', chartWidth + 15).attr('y', yScale(79)).call(wrapText, (margins.right - 15), labelLineHeight);
    annot.append('line').attr('x1', chartWidth + 2).attr("x2", chartWidth + 13).attr('y1', yScale(54) - labelLineHeight/3).attr('y2', yScale(54) - labelLineHeight/3).attr("stroke", "gray").attr("stroke-width", "1");
    annot.append('text').attr('class', 'annot-label').html('China: 72').attr('x', chartWidth + 15).attr('y', yScale(54)).call(wrapText, (margins.right - 15), labelLineHeight);

}

var getMaxValue = function(s, valueColumn) {
    var series = s['name'];
    var values = s['values'];

    var maxValue = d3.max(values, function(v) {
        return v[valueColumn];
    });

    var maxValData = values.filter(function(v) {
        return v[valueColumn] == maxValue;
    })[0];

    switch (s['name']) {
        case 'All other countries':
            maxValData = values[5];
            break;
        case 'Guatemala':
            maxValData = values[6];
            break;
        case 'South Korea':
            maxValData = values[5];
            break;
    }

    return maxValData;
}




/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
window.onresize = e => render(window.innerWidth);
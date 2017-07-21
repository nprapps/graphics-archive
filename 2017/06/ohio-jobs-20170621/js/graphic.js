// Global vars
var pymChild = null;
var isMobile = false;
var dataSeries = [];
var charts = [];

/*
 * Initialize graphic
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
    charts = d3.keys(DATA);

    charts.forEach(function(v, k) {
      DATA[v].forEach(function(d) {
          d['date'] = d3.time.format('%m/%d/%Y').parse(d['date']);

          for (var key in d) {
              if (key != 'date' && d[key] != null && d[key].length > 0) {
                  d[key] = +d[key];
              }
          }
      });

      /*
       * Restructure tabular data for easier charting.
       */
      dataSeries[v] = [];
      for (var column in DATA[v][0]) {
          if (column == 'date') {
              continue;
          }

          dataSeries[v].push({
              'name': column,
              'values': DATA[v].map(function(d) {
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
    })
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var graphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        graphicWidth = containerWidth;
        isMobile = true;
    } else {
        graphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
        isMobile = false;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#line-chart');
    containerElement.html('');

    // define colorScale
    var colorScale = d3.scale.ordinal()
        .domain(_.pluck(dataSeries[charts[0]], 'name'))
        .range([COLORS['teal4'], COLORS['orange4'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);

    /*
     * Render the HTML legend.
     */
    var legend = containerElement.append('ul')
        .attr('class', 'key')
        .selectAll('g')
        .data(dataSeries[charts[0]])
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item ' + classify(d['name']);
            });

    legend.append('b')
        .style('background-color', function(d) {
            return colorScale(d['name']);
        });

    legend.append('label')
        .text(function(d) {
            return d['name'];
        });

    // render charts
    charts.forEach(function(d,i) {
      var chartElement = containerElement.append('div')
        .attr('class', 'chart ' + classify(d));

      if (!isMobile) {
        chartElement.attr('style', function() {
          var s = '';
          s += 'width: ' + graphicWidth + 'px;';
          s += 'float: left; ';
          if (i > 0) {
            s += 'margin-left: ' + gutterWidth + 'px;';
          }
          return s;
        })
      }

      chartElement.append('h3')
        .text(LABELS['hed_' + d]);

      var dataSuffix = '';
      var yDomain = [];
      switch(d) {
          case 'change':
            dataSuffix = '%';
            yDomain = [ -25, 25 ];
            break;
          case 'jobs':
            dataSuffix = 'K';
            yDomain = [ 500, 850 ];
            break;
      }

      // Render the chart!
      renderLineChart({
          container: '.chart.' + classify(d),
          id: classify(d),
          width: graphicWidth,
          data: dataSeries[d],
          dataSuffix: dataSuffix,
          colorScale: colorScale,
          yDomain: yDomain
      });
    })

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
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

    var aspectWidth = isMobile ? 4 : 16;
    var aspectHeight = isMobile ? 3 : 9;

    var margins = {
        top: 5,
        right: 50,
        bottom: 20,
        left: 37
    };

    var ticksX = 10;
    var ticksY = 6;
    var roundTicksFactor = 5;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.time.scale()
        .domain(d3.extent(config['data'][0]['values'], function(d) {
            return d['date'];
        }))
        .range([ 0, chartWidth ])

    var min = config['yDomain'][0];
    var max = config['yDomain'][1];

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight,0]);
    var colorScale = config['colorScale'];

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
            return '\u2019' + fmtYearAbbrev(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d,i) {
           if (config['dataSuffix']) {
             return d + config['dataSuffix'];
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
    var line = d3.svg.line()
        .interpolate('monotone')
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(config['data'])
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line ' + classify(d['name']);
            })
            .attr('stroke', function(d) {
                return colorScale(d['name']);
            })
            .attr('d', function(d) {
                return line(d['values']);
            });

    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(config['data'])
        .enter().append('text')
            .attr('x', function(d, i) {
                var last = d['values'][d['values'].length - 1];

                return xScale(last[dateColumn]) + 5;
            })
            .attr('y', function(d) {
                var last = d['values'][d['values'].length - 1];

                return yScale(last[valueColumn]) + 3;
            })
            .text(function(d) {
                var last = d['values'][d['values'].length - 1];
                var value = last[valueColumn];

                var label = last[valueColumn].toFixed(1);
                if (config['id'] == 'change' && label > 0) {
                  label = '+' + label;
                }
                if (config['dataSuffix']) {
                  label = label + config['dataSuffix'];
                }

                return label;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

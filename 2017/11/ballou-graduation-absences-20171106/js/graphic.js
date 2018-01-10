// Global config
var COLOR_BINS = [ 0, 30, 60, 90, 120, 150, 180];
var COLOR_RANGE = ['#F5D1CA', '#ECA395','#E27560','#D8472B','#A23520','#6C2315']
var DESKTOP_THRESHOLD = 730;

// Global vars
var pymChild = null;
var isMobile = false;
var isFluid = false;
var binnedData = [];

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
    var numBins = COLOR_BINS.length - 1;

    // init the bins
    for (var i = 0; i < numBins; i++) {
        binnedData[i] = [];
    }

    // put states in bins
    _.each(DATA, function(d) {
        if (d['absences'] != null) {
            var absences = +d['absences'];
            var identifier = d['identifier'];

            for (var i = 0; i < numBins; i++) {
                if (absences >= COLOR_BINS[i] && absences < COLOR_BINS[i + 1]) {
                    binnedData[i].unshift(identifier);
                    break;
                }
            }
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

    if (containerWidth > DESKTOP_THRESHOLD){
      isFluid = true;
      containerWidth = document.querySelector(".graphic").offsetWidth*1.15;
    }
    else{
      isFluid = false;
    }

    // Render the chart!
    renderBlockHistogram({
        container: '#block-histogram',
        width: containerWidth,
        data: binnedData,
        bins: COLOR_BINS,
        colors: COLOR_RANGE
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderBlockHistogram = function(config) {
    /*
     * Setup
     */
    var aspectWidth = isMobile ? 2.5 : 13;
    var aspectHeight = isMobile ? 3 : 9;

    if (isFluid){
      aspectWidth = 25;
    }

    var margins = {
        top: 10,
        right: 3,
        bottom: 15,
        left: 60
    };

    // Determine largest bin
    var largestBin = _.max(binnedData, function(bin) {
        return bin.length;
    }).length;

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
        .attr('transform', makeTranslate(margins['left'], margins['top']));

    /*
     * Create D3 scale objects.
     */

    var yScale = d3.scale.ordinal()
        .domain(config['bins'].slice(0, -1))
        .rangeRoundBands([0, chartHeight], .1);

    var xScale = d3.scale.linear()
        .domain([ 0, largestBin ])
        .rangeRound([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .outerTickSize(0)
        .tickFormat(function(d) {
            if (d > 0) {
                return d + ' days';
            } else {
                return d + ' days';
            }
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, 0))
        .call(yAxis)
        .selectAll(".tick text")
        .attr('class', function(d,i){
          if (i==1){
            return 'day30-text';
          }
        });
        // .call(wrapText, 1, 14);

    /*
     * Shift tick marks
     */
    chartElement.selectAll('.x.axis .tick')
        .attr('transform', function() {
            var el = d3.select(this);
            var transform = d3.transform(el.attr('transform'));

            transform.translate[1] = transform.translate[1] - (yScale.rangeBand() / 2) - ((yScale.rangeBand() * .2) / 2);
            transform.translate[0] = 3;

            return transform.toString();
        })

    var lastTick = chartElement.select('.x.axis')
        .append('g')
        .attr('class', 'tick')
        .attr('transform', function() {
            var transform = d3.transform();
            var lastBin = yScale.domain()[yScale.domain().length - 1];

            transform.translate[1] = yScale(lastBin) + yScale.rangeBand() + ((yScale.rangeBand() * .2) / 2);
            transform.translate[0] = 3;

            return transform.toString();
        })

    lastTick.append('line')
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('x1', 0)
        .attr('x2', -6)

    lastTick.append('text')
        .attr('text-anchor', 'right')
        .attr('y', 0)
        .attr('x', 0)
        .attr('dx', '-4.71em')
        .text(function() {
            var t = config['bins'][config['bins'].length - 1];
            if (t > 0) {
                return t + ' days';
            } else {
                return t + ' days';
            }
        })
        // .call(wrapText, 1, 14);

    var num_blocks = isMobile ? 4 : 3;
    if (isFluid){
      num_blocks = 2;
    }

    var bar_margin = 1;
    var bar_w = yScale.rangeBand();
    var block_margin = isMobile ? 1.5 : 1.5;
    var block_w = Math.floor(bar_w / num_blocks) - block_margin;
    var radius = isMobile ? block_w / 2.2 : block_w / 2.2;



    /*
     * Render bins to chart.
     */
    var bins = chartElement.selectAll('.bin')
        .data(config['data'])
        .enter().append('g')
            .attr('class', function(d,i) {
                return 'bin bin-' + i;
            })
            .attr('transform', function(d, i) {
                return makeTranslate(radius*2, yScale(COLOR_BINS[i]) * bar_margin);
            });

    // Add blocks to each group
    bins.selectAll('rect')
        .data(function(d, i) {
            // add the bin index to each row of data so we can assign the right color
            var formattedData = [];
            _.each(d, function(v,k) {
                formattedData.push({ 'key': k, 'value': v, 'parentIndex': i });
            })
            return formattedData;
        })
        .enter()
        .append('circle')
            .attr('class', function(d) {
                return 'block';
            })
            .attr('r', radius)
            .attr('cy', function(d,i) {
                var y_pos = (i % num_blocks);
                return y_pos * (block_w + block_margin) + radius;
            })
            .attr('cx', function(d,i) {
                var x_pos = Math.floor(i / num_blocks);
                return x_pos * (block_w + block_margin) - (radius/1.2);
            })
            .attr('fill', function(d) {
                return config['colors'][d['parentIndex']];
            })

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
                if (d.length==1){
                  return d.length + " student";
                }
                return d.length + " students";
            })
            .attr('y', function(d, i) {
                return yScale(i*30) + (yScale.rangeBand() / 2);
            })
            .attr('x', function(d) {
                var x_pos = Math.round(d.length) / num_blocks;
                var x_offset = Math.floor(x_pos) === 0 ? 5 : 0;
                return x_pos * (block_w + block_margin) + x_offset;
            })
            .attr('class', 'text-value')
            .attr('dx', function(d) {
                return radius*2;
            })
            .attr('text-anchor', 'start');


}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

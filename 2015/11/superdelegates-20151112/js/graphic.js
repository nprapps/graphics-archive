// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Render the graphic.
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

    var gutterWidth = 11;
    var graphicWidth = Math.floor((containerWidth - (gutterWidth * 2) - 1) / 2);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    // Render the chart!
    containerElement.append('div')
        .attr('class', 'year y-2007')
        .attr('style', function() {
            var s = '';
            s += 'width: ' + graphicWidth + 'px;';
            s += 'border-right: 1px solid #ccc;'
            s += 'padding-right: ' + gutterWidth + 'px;';
            return s;
        });
    renderGraphic({
        container: '.y-2007',
        width: graphicWidth,
        data: GRAPHIC_DATA['2007'],
        title: 'December 2007 Survey'
    });

    containerElement.append('div')
        .attr('class', 'year y-2015')
        .attr('style', function() {
            var s = '';
            s += 'width: ' + graphicWidth + 'px;';
            s += 'padding-left: ' + gutterWidth + 'px;';
            return s;
        });
    renderGraphic({
        container: '.y-2015',
        width: graphicWidth,
        data: GRAPHIC_DATA['2015'],
        title: 'November 2015 Survey'
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderGraphic = function(config) {
    // Define container element
    var containerElement = d3.select(config['container']);

    var totalDels = +config['data'][0]['amt'];
//    var candidates = config['data'].splice(1);
    var candidates = [];

    var cCounter = 0;
    config['data'].forEach(function(d,i) {
        if (i > 0) {
            d['amt'] = +d['amt'];
            d['start'] = cCounter;
            d['end'] = cCounter + d['amt'];
            cCounter = d['end'];
            candidates.push(d);
        }
    });

    var numCols = Math.floor(config['width'] / 8);

    // add header
    containerElement.append('h3')
        .text(config['title']);

    // draw legend
    var legend = containerElement.append('ul')
        .attr('class', 'key');

    var bins = legend.selectAll('li')
        .data(candidates)
        .enter().append('li')
            .attr('class', function(d, i) {
                return 'key-item key-' + i;
            });
    bins.append('b')
        .attr('class', function(d) {
            return classify(d['label']);
        });
    bins.append('label')
        .html(function(d, i) {
            return d['label'] + ': ' + d['amt'];
        });

    var totalBin = legend.append('li')
        .append('li')
        .attr('class', function(d, i) {
            return 'key-item total';
        });
    // totalBin.append('b')
    //     .attr('class', function(d) {
    //         return classify(config['data'][0]['label']);
    //     });
    totalBin.append('label')
        .html(function(d, i) {
            return config['data'][0]['label'] + ': ' + config['data'][0]['amt'];
        });

    // draw waffle chart
    var counter = 0;
    var gridElement = containerElement.append('table')
        .classed('grid', true)
    var rowElement = null;
    for (var i = 0; i < totalDels; i++) {
        if (counter == 0) {
            rowElement = null;
            rowElement = gridElement.append('tr')
        }
        rowElement.append('td')
            .attr('class', function(d) {
                for (var c = 0; c < candidates.length; c++) {
                    if (i >= candidates[c]['start'] && i < candidates[c]['end']) {
                        return classify(candidates[c]['label']);
                    }
                }
            });
        counter++;

        if (counter >= numCols) {
            counter = 0;
        }
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

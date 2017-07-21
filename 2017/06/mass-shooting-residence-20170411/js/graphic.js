// Global vars
var pymChild = null;
var isMobile = false;
// var data_sheets = [4,5,6,7,8,9,10,11,12,15,16,17,18,19,27,29,36,45,82,102];
var data_sheets = [4,5,6,7,8,9,10,11,12,15];


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

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
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
    var graphicWidth = Math.floor((containerWidth - (gutterWidth * 2) - 1) / 6);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    // draw legend
    var legend = containerElement.append('ul')
        .attr('class', 'key');

    // var keyItem = legend.append('li')
    //     .attr('class', 'key-item');

    var dvKey = legend.append('li')
        .attr('class', 'key-item');
    dvKey.append('b')
        .attr('class', 'domestic-violence');
    dvKey.append('label')
        .text('Incidents with evidence of domestic violence');

    var otherKey = legend.append('li')
        .attr('class', 'key-item');
    otherKey.append('b')
        .attr('class', 'other-incidents');
    otherKey.append('label')
        .text('Other incidents');


    var chartWrapper = containerElement.append('div')
        .attr('id', 'graphic-wrapper')
        .classed('flex-container', true);

    data_sheets.forEach(function(data_sheets, i) {
        chartWrapper.append('div')
            .attr('class', 'count count-' + data_sheets)
            .attr('style', function() {
                var s = '';
                s += 'width: ' + graphicWidth + 'px;';
                s += 'padding: 0 ' + gutterWidth + 'px;';
                return s;
            });

        if (data_sheets == 15) {
            renderGraphic({
                container: '.count-' + data_sheets,
                width: graphicWidth,
                data: GRAPHIC_DATA['data_' + data_sheets],
                title: data_sheets + ' or more victims'
            });
        } else {
            renderGraphic({
                container: '.count-' + data_sheets,
                width: graphicWidth,
                data: GRAPHIC_DATA['data_' + data_sheets],
                title: data_sheets + ' victims'
            });
        }
    })

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
    var totalIncidents = +config['data'][0]['amt'];
    var dvIncidents = +config['data'][1]['amt'];
    var incidents = [];

    var cCounter = 0;
    config['data'].forEach(function(d,i) {
        if (i > 0) {
            d['amt'] = +d['amt'];
            d['start'] = cCounter;
            d['end'] = cCounter + d['amt'];
            cCounter = d['end'];
            incidents.push(d);
        }
    });

    // if(config['container'] == '.count-4') {
    //     var anno = containerElement.append('g')
    //         .attr('class', 'anno')
    //         .attr('y', -10);
    //
    //     anno.append('p')
    //         .html('In 40 of the 66<br>four-victim incidents, domestic violence was a&nbsp;factor.');
    //
    //     anno.append('line')
    //         .attr('x1', 5)
    //         .attr('x2', 5)
    //         .attr('y1', 0)
    //         .attr('y2', 10);
    // }

    // draw waffle chart
    var counter = 0;
    var gridContainer = containerElement.append('div')
        .classed('grid-container', true);

    if (totalIncidents < 10) {
        gridContainer.classed('grid-sm', true);
    }

    for (var i = 0; i < totalIncidents; i++) {
        var box = gridContainer.append('span')
            .attr('class', function(d) {
                for (var c = 0; c < incidents.length; c++) {
                    if (i >= incidents[c]['start'] && i < incidents[c]['end']) {
                        return classify(incidents[c]['label']);
                    }
                }
            });

        box.classed('incident', true);
    }

    var bottomDiv = containerElement.append('div')
        .attr('class', 'id-div')
        .attr('style', function() {
            var s = '';
            s += 'border-top: 1px solid #ccc;';
            s += 'margin-top: 7px;'
            return s;
        });

    bottomDiv.append('h3').text(config['title']);

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

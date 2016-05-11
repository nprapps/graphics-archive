// Global config
var MAP_TEMPLATE_ID = '#map-template';

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
 * Render the graphic(s). Called by pym with the container width.
 */
 var render = function(containerWidth) {
    //  if (!containerWidth) {
    //      containerWidth = DEFAULT_WIDTH;
    //  }
     //
    //  var graphicWidth = null;
     //
    //  if (containerWidth <= MOBILE_THRESHOLD) {
    //      isMobile = true;
    //      graphicWidth = containerWidth;
    //  } else {
    //      isMobile = false;
    //      graphicWidth = Math.floor((containerWidth - 22) / 2);
    //  }
     //
    //  // Clear existing graphic (for redraw)
    //  var containerElement = d3.select('#state-grid-map');
    //  containerElement.html('');
     //
    //  // Extract categories from data
    //  var categories = [];
     //
    //  _.each(DATA, function(state) {
    //      if (state['category'] != null) {
    //          categories.push(state['category']);
    //      }
    //  });
     //
    //  categories = d3.set(categories).values();
     //
    //  numMaps = categories.length - 1;
     //
    //  categories.forEach(function(d, i) {
    //      containerElement.append('div')
    //          .attr('class', 'map-wrapper group-' + i)
    //          .append('h3')
    //          .text('Group ' + d);
     //
    //      // Render the map!
    //      renderStateGridMap({
    //          container: '.group-' + i,
    //          width: containerWidth,
    //          category: d,
    //          data: DATA
    //      });
    //  });

     // Update iframe
     if (pymChild) {
         pymChild.sendHeight();
     }
 }


/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container'])
        .append('div')
        .attr('class', 'map');

    // containerElement.html('');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    containerElement.html(template.html());

    // Select SVG element
    var chartElement = containerElement.select('svg');

    // Set state colors
    _.each(config['data'], function(state) {
        if (state['category'] == config['category']) {
            var stateClass = 'state-' + classify(state['state_name']);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', COLORS['orange3']);
        }
    });

    // Draw state labels
    chartElement.append('g')
        .selectAll('text')
            .data(config['data'])
        .enter().append('text')
            .attr('text-anchor', 'middle')
            .text(function(d) {
                var state = _.findWhere(STATES, { 'name': d['state_name'] });

                return isMobile ? state['usps'] : state['ap'];
            })
            .attr('class', function(d) {
                return d['category'] !== null ? 'label label-active' : 'label';
            })
            .attr('x', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = chartElement.select(className)[0][0].getBBox();

                return tileBox['x'] + tileBox['width'] * 0.52;
            })
            .attr('y', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = chartElement.select(className)[0][0].getBBox();
                var textBox = d3.select(this)[0][0].getBBox();
                var textOffset = textBox['height'] / 2;

                if (isMobile) {
                    textOffset -= 1;
                }

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
            });
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

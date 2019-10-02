// Global config
var MAP_TEMPLATE_ID = '#map-template';

/* color ramp
http://gka.github.io/palettes/#colors=#D8472B,#F3D469|steps=25|bez=1|coL=1
#d8472b // 0
#da4e2d #db5630 #dd5c32 #df6234 #e06937 #e16f39 #e3743c #e47c3e #e68141 #e78743  // 1-10
#e88c46 #e99249 #ea974b #eb9d4e #eca250 #eda853 #eeae56 #efb359 #f0b95b #f1bf5e // 11-20
#f1c361 #f2c964 #f3ce66 #f3d469 // 21-24
*/

// Global vars
var pymChild = null;
var isMobile = false;
var charts = [ 'current_weeks', 'future_weeks' ];

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data.
 */
var formatData = function() {
    if (LABELS["show_territories"].toLowerCase() === "false") {
        var territories = ["Puerto Rico", "U.S. Virgin Islands", "Guam", "Northern Mariana Islands", "American Samoa"];

        DATA = DATA.filter(function(d) {
            return territories.indexOf(d["state_name"]) == -1;
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

    if (LABELS['is_numeric'] && LABELS['is_numeric'].toLowerCase() == 'true') {
        var isNumeric = true;
    } else {
        var isNumeric = false;
    }

    var numCols = isMobile ? 1 : 2;
    var gutterWidth = 33;
    var graphicWidth = Math.floor((containerWidth - ((numCols - 1) * gutterWidth)) / numCols);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select('#state-grid-map');
    containerElement.html('');

    // Define categories
    var categories = [];
    var categoryColors = [];
    var legendKeys = d3.keys(LEGEND);
    legendKeys.forEach(function(keyItem) {
      categories.push(LEGEND[keyItem]['label']);
      categoryColors.push(LEGEND[keyItem]['color']);
    });
    categories = d3.set(categories).values();
    categoryColors = d3.set(categoryColors).values();

    // render legend
    var legendElement = containerElement.append('div')
      .attr('class', 'key-wrap')
      .append('ul')
        .attr('class', 'key')
        .selectAll('li')
        .data(categories)
        .enter()
          .append('li')
            .attr('class', function(d) {
              return 'key-item ' + classify(d);
            });

    legendElement.append('b')
      .attr('style', function(d,i) {
        return 'background-color: ' + categoryColors[i];
      });

    legendElement.append('label')
      .text(function(d,i) {
        return d;
      });

    charts.forEach(function(d,i) {
      var chartClass = d.replace('_','-');

      var chartElement = containerElement.append('div')
        .attr('class', 'chart ' + chartClass)
        .attr('style', function() {
          var s = '';
          if (numCols > 1) {
            s += 'width: ' + graphicWidth + 'px; ';
            s += 'float: left; ';
            if (i % numCols > 0) {
              s += 'margin-left: ' + gutterWidth + 'px; ';
            }
          }
          return s;
        });

      // Render the map!
      renderStateGridMap({
          container: '.chart.' + chartClass,
          width: graphicWidth,
          data: DATA,
          categories: categories,
          categoryColors: categoryColors,
          valueColumn: d,
          // isNumeric will style the legend as a numeric scale
          isNumeric: isNumeric,
          title: LABELS['hed_' + d]
      });
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
    var valueColumn = config['valueColumn'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    // containerElement.html('');

    containerElement.append('h3')
      .text(config['title']);

    var chartWrapper = containerElement.append('div')
      .attr('class', 'chart-wrapper');

    // Copy map template
    var template = d3.select(MAP_TEMPLATE_ID);
    chartWrapper.html(template.html());

    // Extract categories from data
    var categories = config['categories'];

    // if (LABELS['legend_labels'] && LABELS['legend_labels'] !== '') {
    //     // If custom legend labels are specified
    //     var legendLabels = LABELS['legend_labels'].split(',');
    //     legendLabels.forEach(function(label) {
    //         categories.push(label.trim());
    //     });
    // } else {
    //     // Default: Return sorted array of categories
    //      config['data'].forEach(function(state) {
    //         if (state[valueColumn] != null) {
    //             categories.push(state[valueColumn]);
    //         }
    //     });
    //
    //     categories = d3.set(categories).values().sort();
    // }

    // Create legend
    // var legendWrapper = chartWrapper.select('.key-wrap');
    // var legendElement = chartWrapper.select('.key');
    //
    // if (config['isNumeric']) {
    //     legendWrapper.classed('numeric-scale', true);
    //
    //     var colorScale = d3.scale.ordinal()
    //         .domain(categories)
    //         .range([COLORS['teal6'], COLORS['teal5'], COLORS['teal4'], COLORS['teal3'], COLORS['teal2'], COLORS['teal1']]);
    // } else {
    //     // Define color scale
    //     var colorScale = d3.scale.ordinal()
    //         .domain(categories)
    //         .range([COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3']]);
    // }

    // colorScale.domain().forEach(function(key, i) {
    //     var keyItem = legendElement.append('li')
    //         .classed('key-item', true)
    //
    //     keyItem.append('b')
    //         .style('background', colorScale(key));
    //
    //     keyItem.append('label')
    //         .text(key);
    //
    //     // Add the optional upper bound label on numeric scale
    //     if (config['isNumeric'] && i == categories.length - 1) {
    //         if (LABELS['max_label'] && LABELS['max_label'] !== '') {
    //             keyItem.append('label')
    //                 .attr('class', 'end-label')
    //                 .text(LABELS['max_label']);
    //         }
    //     }
    // });

    var colorScale = d3.scale.ordinal()
      .domain(config['categories'])
      .range(config['categoryColors']);

    // Select SVG element
    var chartElement = chartWrapper.select('svg');

    // resize map (needs to be explicitly set for IE11)
    chartElement.attr('width', config['width'])
        .attr('height', function() {
            var s = d3.select(this);
            var viewBox = s.attr('viewBox').split(' ');
            return Math.floor(config['width'] * parseInt(viewBox[3]) / parseInt(viewBox[2]));
        });

    // Set state colors
    config['data'].forEach(function(state) {
        if (state[valueColumn] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);

            var categoryLabel = LEGEND[state[valueColumn]]['label'];
            // console.log(state['state_name'], state[valueColumn], LEGEND[state[valueColumn]]['label']);

            var categoryClass = 'category-' + classify(categoryLabel);

            chartElement.select('.' + stateClass)
                .attr('class', stateClass + ' state-active ' + categoryClass)
                .attr('fill', colorScale(categoryLabel));
        }
    });

    // Draw state labels
    chartElement.append('g')
        .selectAll('text')
            .data(config['data'])
        .enter().append('text')
            .attr('text-anchor', 'middle')
            .text(function(d) {
                var state = STATES.filter(function(v) { return v['name'] == d['state_name'] }).pop();

                return state['usps'];
            })
            .attr('class', function(d) {
                return d[valueColumn] !== null ? 'category-' + classify(d[valueColumn]) + ' label label-active' : 'label';
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

                // if (isMobile) {
                    textOffset -= 1;
                // }

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

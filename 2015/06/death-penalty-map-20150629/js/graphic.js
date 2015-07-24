// global vars
var $graphic = null;
var $mapTemplate = null;
var pymChild = null;

var MOBILE_THRESHOLD = 500;
var GRAPHIC_DEFAULT_WIDTH = 600;

var STATE_COORDINATES = {"Alaska":{"x":0,"y":0},"Maine":{"x":11,"y":0},"Vermont":{"x":10,"y":1},"New Hampshire":{"x":11,"y":1},"Washington":{"x":1,"y":2},"Idaho":{"x":2,"y":2},"Montana":{"x":3,"y":2},"North Dakota":{"x":4,"y":2},"Minnesota":{"x":5,"y":2},"Illinois":{"x":6,"y":2},"Wisconsin":{"x":7,"y":2},"Michigan":{"x":8,"y":2},"New York":{"x":9,"y":2},"Rhode Island":{"x":10,"y":2},"Massachusetts":{"x":11,"y":2},"Oregon":{"x":1,"y":3},"Nevada":{"x":2,"y":3},"Wyoming":{"x":3,"y":3},"South Dakota":{"x":4,"y":3},"Iowa":{"x":5,"y":3},"Indiana":{"x":6,"y":3},"Ohio":{"x":7,"y":3},"Pennsylvania":{"x":8,"y":3},"New Jersey":{"x":9,"y":3},"Connecticut":{"x":10,"y":3},"California":{"x":1,"y":4},"Utah":{"x":2,"y":4},"Colorado":{"x":3,"y":4},"Nebraska":{"x":4,"y":4},"Missouri":{"x":5,"y":4},"Kentucky":{"x":6,"y":4},"West Virginia":{"x":7,"y":4},"Virginia":{"x":8,"y":4},"Maryland":{"x":9,"y":4},"Delaware":{"x":10,"y":4},"Arizona":{"x":2,"y":5},"New Mexico":{"x":3,"y":5},"Kansas":{"x":4,"y":5},"Arkansas":{"x":5,"y":5},"Tennessee":{"x":6,"y":5},"North Carolina":{"x":7,"y":5},"South Carolina":{"x":8,"y":5},"District of Columbia":{"x":9,"y":5},"Oklahoma":{"x":4,"y":6},"Louisiana":{"x":5,"y":6},"Mississippi":{"x":6,"y":6},"Alabama":{"x":7,"y":6},"Georgia":{"x":8,"y":6},"Hawaii":{"x":0,"y":7},"Texas":{"x":4,"y":7},"Florida":{"x":9,"y":7}};
var GRID = {
    'x': 12,
    'y': 8
};

/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        $mapTemplate = $('#map-template');

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * RENDER THE GRAPHIC
 */
var render = function(containerWidth) {
    var graphicWidth;

    // fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    _.each(MAPS, function(v, k) {
        $('#' + k).empty();

        var isSmall = (k != 'main-map');

        drawMap(k, v, isSmall);
    });

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Determine unique categories
 */
var makeCategories = function(data) {
    var categories = [];
    _.each(data, function(state) {
        if (state['category'] != null) {
            categories.push(state['category']);
        }
    });
    return d3.set(categories).values().sort();
}


/*
 * Build and render a legend from map categories
 */
var renderLegend = function($el, color) {
    _.each(color.domain(), function(key, i) {
        var $item = $('<li class="key-item"><label>' + label + '</label></li>')
        var $color = $('<b style="background:' + color(key) + '"></b>');
        $color.prependTo($item);
        $item.appendTo($el);
    });
}

/*
 * DRAW THE GRAPH
 */
var drawMap = function(id, mapData, isSmall) {
    // create div for this map
    var $el = $('#' + id);

    // append map template
    $el.append($mapTemplate.html());

    // define color range
    var color = d3.scale.ordinal()
        .domain(makeCategories(mapData))
        .range([ COLORS['orange3'] ]);

    // make the legend
    var $legend = $el.find('.key');

    // flip the colors where a category is defined
    _.each(mapData, function(state) {
        if (state['category'] !== null) {
            var stateClass = 'state-' + classify(state['state_name']);
            $el.find('.' + stateClass)
                .attr('class', stateClass + ' state-active')
                .attr('fill', color(state['category']));
        }
    });

    // Draw labels
    var svg = d3.select('#' + $el.attr('id') + ' svg');
    var stateLabels = svg.append('g')
        .selectAll('text')
            .data(mapData)
        .enter().append('text')
            .attr('text-anchor', 'middle')
            .text(function(d) {
                var state = _.findWhere(STATE_NAMES, { 'name': d['state_name'] });
                var name = state['name'];
                var postalCode = state['usps'];
                var ap = state['ap'];

                return (isMobile || isSmall) ? postalCode : ap;
            })
            .attr('class', function(d) {
                return d['category'] !== null ? 'label label-active' : 'label';
            })
            .attr('x', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = svg.select(className)[0][0].getBBox();

                return tileBox['x'] + tileBox['width'] * 0.52;
            })
            .attr('y', function(d) {
                var className = '.state-' + classify(d['state_name']);
                var tileBox = svg.select(className)[0][0].getBBox();
                var textBox = d3.select(this)[0][0].getBBox();
                var textOffset = textBox['height'] / 2;

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset - 1;
            });
}

/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

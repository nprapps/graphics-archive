var MOBILE_THRESHOLD = 500;
var GRAPHIC_DEFAULT_WIDTH = 600;

var CCR_CATEGORIES = [
    'Mandatory CCR diploma requirements',
    'Allows opt-out or individual modification',
    'Opt-in CCR diploma requirements'
];

var CCR_COLORS = [
    COLORS.teal1,
    COLORS.teal3,
    COLORS.teal5,
];

var ALGEBRA_CATEGORIES = [
    'Required to graduate',
    'Automatic enrollment, but student may opt-out'
];

var ALGEBRA_COLORS = [
    COLORS.yellow3,
    COLORS.yellow5
];

var $state = null;
var $rates = null;
var $units = null;
var $requirements = null;
var $ccr = null;
var $ccrMap = null;
var $algebra = null;
var $algebraMap = null;
var $actScores = null;
var $readMore = null;

var selectedState = null;
var lastWidth = null;
var mapTemplate = null;
var ratesTemplate = null;
var unitsTemplate = null;
var requirementsTemplate = null;
var algebraTemplate = null;
var ccrTemplate = null;
var actScoresTemplate = null;
var readMoreTemplate = null;
var pymChild = null;

var onWindowLoad = function() {
    $state = $('#lookup select');
    $rates = $('#rates');
    $units = $('#units');
    $requirements = $('#requirements');
    $ccr = $('#ccr-wrapper');
    $algebra = $('#algebra-wrapper');
    $actScores = $('#act-scores');
    $readMore = $('#read-more');

    mapTemplate = $('#map-template').html();
    ratesTemplate = _.template($('#rates-template').html());
    unitsTemplate = _.template($('#units-template').html());
    requirementsTemplate = _.template($('#requirements-template').html())
    ccrTemplate = _.template($('#ccr-template').html());
    algebraTemplate = _.template($('#algebra-template').html());
    actScoresTemplate = _.template($('#act-scores-template').html());
    readMoreTemplate = _.template($('#read-more-template').html());

    // Default state
    selectedState = _.findWhere(STATES, { 'usps': 'TX' });
    updateText();

    $state.on('change', onStateChange)

    if (Modernizr.svg) {
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    // Geolocate
    if (typeof geoip2 == 'object') {
        geoip2.city(onLocateIP, onLocateFail);
    }
}

var onLocateIP = function(response) {
    var postalCode = response.most_specific_subdivision.iso_code;

    var state = _.findWhere(STATES, { 'usps': postalCode });

    if (state) {
        selectedState = state;
        $state.val(postalCode);
        updateText();
        render(lastWidth);
    }
}

var onLocateFail = function(response) {
    // pass
}

var onStateChange = function() {
    var postalCode = $(this).val();
    selectedState = _.findWhere(STATES, { 'usps': postalCode });

    updateText();
    render(lastWidth);

    pymChild.sendHeight();
}

var updateText = function() {
    var data = {
        'state': selectedState,
    }

    data['rates'] = _.find(RATES_DATA, function(row) {
        return row['state'] == selectedState['name'];
    });

    data['units'] = _.filter(UNITS_DATA, function(row) {
        return row['state'] == selectedState['name'];
    });

    data['ccr'] = _.find(CCR_DATA, function(row) {
        return row['state'] == selectedState['name'];
    });

    data['algebra'] = _.find(ALGEBRA_DATA, function(row) {
        return row['state'] == selectedState['name'];
    });

    data['act_scores'] = _.find(ACT_SCORES_DATA, function(row) {
        return row['state'] == selectedState['name'];
    });

    data['sat_scores'] = _.find(SAT_SCORES_DATA, function(row) {
        return row['state'] == selectedState['name'];
    });

    data['exit_exams'] = _.find(EXIT_EXAMS_DATA, function(row) {
        return row['state'] == selectedState['name'];
    });

    data['read_more'] = _.find(READ_MORE_DATA, function(row) {
        return row['state'] == selectedState['name'];
    });

    $rates.html(ratesTemplate(data));
    $units.html(unitsTemplate(data));
    $requirements.html(requirementsTemplate(data));
    $ccr.html(ccrTemplate(data));
    $algebra.html(algebraTemplate(data));
    $actScores.html(actScoresTemplate(data));
    $readMore.html(readMoreTemplate(data));

    $ccrMap = $('#ccr-map');
    $algebraMap = $('#algebra-map');
}

/*
 * Render the graphics.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    lastWidth = containerWidth;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    $ccrMap.empty();
    $algebraMap.empty();

    drawMap($ccrMap, 'ccr', CCR_DATA, CCR_CATEGORIES, CCR_COLORS);
    drawMap($algebraMap, 'algebra', ALGEBRA_DATA, ALGEBRA_CATEGORIES, ALGEBRA_COLORS);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Build and render a legend from map categories
 */
var renderLegend = function($el, color) {
    _.each(color.domain(), function(key, i) {
        var $item = $('<li class="key-item"><label>' + key + '</label></li>')
        var $color = $('<b style="background:' + color(key) + '"></b>');
        $color.prependTo($item);
        $item.appendTo($el);
    });
}

/*
 * Move D3 element to top.
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * DRAW THE GRAPH
 */
var drawMap = function($container, id, mapData, categories, colors) {
    // create div for this map
    $container.append('<div id="map-' + id + '" class="tile-grid-map"></div>')
    var $el = $('#map-' + id);

    // append map template
    $el.append(mapTemplate);

    // define color range
    var color = d3.scale.ordinal()
        .domain(categories)
        .range(colors);

    // make the legend
    var $legend = $el.find('.key');
    renderLegend($legend, color);

    // flip the colors where a category is defined
    _.each(mapData, function(state) {
        if (state['category'] !== null) {
            var stateClass = 'state-' + classify(state['state']);
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
                var state = _.findWhere(STATES, { 'name': d['state'] });
                var name = state['name'];
                var postalCode = state['usps'];
                var ap = state['ap'];

                return postalCode;
            })
            .attr('class', function(d) {
                return d['category'] !== null ? 'label label-active' : 'label';
            })
            .attr('x', function(d) {
                var className = '.state-' + classify(d['state']);
                var tileBox = svg.select(className)[0][0].getBBox();

                return tileBox['x'] + tileBox['width'] * 0.52;
            })
            .attr('y', function(d) {
                var className = '.state-' + classify(d['state']);
                var tileBox = svg.select(className)[0][0].getBBox();
                var textBox = d3.select(this)[0][0].getBBox();
                var textOffset = textBox['height'] / 2;

                return (tileBox['y'] + tileBox['height'] * 0.5) + textOffset - 1;
            });

    $el.find('path').removeClass('selected');

    if (selectedState) {
        var className = '#map-' + id + ' .state-' + classify(selectedState['name']);
        var stateEl = d3.select(className);
        stateEl.classed('selected', true);
        stateEl.moveToFront();
    }
}

var intToText = function(i) {
    i = parseInt(i);

    if (i == 0) {
        return 'zero';
    } else if (i == 1) {
        return 'one';
    } else if (i == 2) {
        return 'two';
    } else if (i == 3) {
        return 'three';
    } else if (i == 4) {
        return 'four';
    } else if (i == 5) {
        return 'five';
    } else if (i == 6) {
        return 'six';
    } else if (i == 7) {
        return 'seven';
    } else if (i == 8) {
        return 'eight';
    } else if (i == 9) {
        return 'nine';
    }

    return i.toString();
}

$(window).load(onWindowLoad);

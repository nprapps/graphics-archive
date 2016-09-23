// Global vars
var pymChild = null;
var isMobile = false;

// In an ideal world, one does not have all these global vars
var lookup_data;
var lookup_index;
var secondary_index;
var stateToPostalCodeLookup;
var geotext_template = _.template(
    $('#geotext-template').html()
);
var tt_template = _.template(
    $('#tooltip-template').html()
);
var $tooltip;
var $map_mobile;
var currentDistrictName;
var currentDistrictID;
var currentAmount;
var currentFIPS;
var current_state;

var district_level = 'G5400';

// Map data properties
var map_data_amt = 'NPR_AllD_1',
    map_data_bin = 'NPR_AllD_2',
    map_data_name = 'schooldi_1',
    map_data_stfips = 'schooldist';

var anim_duration = 1800; // Silly, but for sanity's sake.

var us_map;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    $tooltip = $('#map-tooltip');
    $map_mobile = $('#map-mobile');

    d3.json('data/district-lookup.json', function(error, rows) {
        lookup_data = rows['lookup'];
        secondary_index = rows['secondary'];

        pymChild = new pym.Child({
            renderCallback: render
        });

        geoLocate();
        setupMap();
        renderDetailsUS();
        initLunr();
        initLookup();

        pymChild.sendHeight();

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
    });

}

var setupMap = function() {
    // Add API key
    mapboxgl.accessToken = 'pk.eyJ1IjoibnByIiwiYSI6IjFubWFjMUkifQ.KZ59VJ6iDflmHPGR-SmtAw';

    // Initialize map
    if (!mapboxgl.supported()) {
        $('.map-wrapper').addClass('gl-fallback');
        $('.top-wrapper').addClass('gl-fallback');
        $('#map-mobile').addClass('gl-fallback');
        $('#map').height($('#map-mobile').outerHeight());
    } else {
        us_map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/npr/cimxy5ks000rbp1nhrb63rt2n', //stylesheet location
            center: [-98.35, 39.90], // starting position
            zoom: 3,
            minZoom: 3,
            maxZoom: 12,
            touchZoomRotate: false
        })
            .on('load', function() {
                // disable zoom on scroll
                us_map.scrollZoom.disable();
                // disable map rotation using right click + drag
                us_map.dragRotate.disable();
                // disable map rotation using touch rotation gesture
                us_map.touchZoomRotate.disableRotation()

                attachMapEvents();
                attachMapNavEvents();

                if (current_state && getStateFipsFromAbbrev(current_state)) {
                    updateState(getStateFipsFromAbbrev(current_state), true);
                } else {
                    zoomToUS();
                }
            });

        function attachMapEvents() {
            // On mousemove over district layers
            us_map.on('mousemove', function(e) {
                if (!isMobile) {
                    handleTooltip(e);
                }
            });

            us_map.on('click', function(e) {
                if (isMobile) {
                    handleTooltip(e);
                }
            });

            $('#map').on('mouseout', function(e) {
                if (!isMobile) {
                    $tooltip.addClass('tooltip-hidden');
                }
            });

            // Check zoom levels
            us_map.on('zoomend', function(e) {
                if (us_map.getZoom() <= 3) {
                    $('#zoom-out').addClass('disabled');
                    $map_mobile.removeClass('map-hidden');
                } else {
                    $('#zoom-out').removeClass('disabled');
                }

                if (us_map.getZoom() >= 12) {
                    $('#zoom-in').addClass('disabled');
                } else {
                    $('#zoom-in').removeClass('disabled');
                }
            });
        }
    }
};

function handleTooltip(e) {
    var features = us_map.queryRenderedFeatures(e.point, {
        layers: ['districts-04-bin1','districts-04-bin2','districts-04-bin3','districts-04-bin4','districts-04-bin5']
    });

    if (features.length) {
        var district_data = features[0]['properties'];
        var templateData = {
            'districtName': district_data[map_data_name],
            'amount': fmtComma(district_data[map_data_amt].toFixed(2)),
            'state': getStateInfoFromFips(district_data[map_data_stfips], 'name')
        }

        //$tooltip.html(tt_template(templateData));
        updateDistrict(district_data, false);

        if (!isMobile) {
            // Position tooltip
            var css_props = {};
            var offset_x = 10,
                offset_y = 0;

            var tt_x = e.point.x,
                tt_y = e.point.y;
            var tt_w = $tooltip.outerWidth(),
                tt_h = $tooltip.outerHeight();
            var map_w = $('#map').width(),
                map_h = $('#map').height();

            // Horizontal positioning
            if (tt_x >= map_w - tt_w - offset_x) {
                css_props['left'] = tt_x - tt_w - offset_x;
            } else {
                css_props['left'] = tt_x + offset_x;
            }

            // Vertical positioning
            if (tt_y >= map_h - tt_h - offset_y) {
                css_props['top'] = tt_y - (tt_h + offset_y);
            } else {
                css_props['top'] = tt_y + offset_y;
            }

            css_props['bottom'] = 'auto';
        } else {
            var css_props = {
                'left': 'auto',
                'top': 'auto',
                'bottom': 'auto'
            };
        }

        $tooltip.css(css_props);

        // Show tooltip if hidden
        if ($tooltip.hasClass('tooltip-hidden')) {
            $tooltip.removeClass('tooltip-hidden');
        }

        if (isMobile && pymChild) {
            pymChild.sendHeight();
        }
    } else {
        // Hide tooltip
        $tooltip.addClass('tooltip-hidden');
    }
}

function setGeotextParagraph() {
    var has_geo_param = getParameterByName('hasGeoText');
    if (has_geo_param) {
        if (current_state && getStateFipsFromAbbrev(current_state) && has_geo_param) {
            var geo_state = current_state;
            var stateFips = getStateFipsFromAbbrev(geo_state);
            var stateName = getStateInfoFromFips(stateFips, 'name');
            var stateData = histogram_data[geo_state];
            var isSingleDistrict = typeof(stateData) === 'undefined';

            for (var i = 0; i < STATE_AVERAGES.length; i++) {
                if (stateName === STATE_AVERAGES[i]['State']) {
                    var stateAverage = STATE_AVERAGES[i]['PPE'];
                }
            }

            var usAverage = STATE_AVERAGES[51]['PPE']; // NOTE: THIS IS BAD
            var stateComparison = stateAverage > (1.1 * parseInt(usAverage, 10)) ? 'more than' : stateAverage < (.9 * parseInt(usAverage, 10)) ? 'less than' : 'similar to';

            var template_data = {
                state: stateFips == '11' ? 'the District of Columbia' : stateName,
                stateAverage: fmtComma(stateAverage),
                isSingleDistrict: isSingleDistrict,
                stateComparison: stateComparison
            };

            $('#geo-text').html(geotext_template(template_data));
        }

        $('#geo-text').removeClass('text-hidden');

        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    }
}

function updateState(state_fips, state_zoom) {
    current_state = state_fips;

    // Zoom in to state
    if (state_zoom) {
        var state_bbox = getStateInfoFromFips(state_fips, 'bbox');
        zoomToShape(state_bbox);
        $map_mobile.addClass('map-hidden');
    }
}

function toggleLevelFilters(desired_level, from_click) {
    // Checks if we even need to toggle filters
    if (desired_level !== district_level) {
        var bins = ['bin1','bin2','bin3','bin4','bin5'];

        bins.forEach(function(d,i) {
            var layer_name = 'districts-04-' + d;
            var current_filter = us_map.getFilter(layer_name);
            us_map.setFilter(layer_name, [
                'all',
                ['!=', 'MTFCC', district_level],
                ['==', map_data_bin, d]
            ]);
        });

        district_level = desired_level;

        if (!from_click) {
            $('#level-show').find('.level-selected').removeClass('level-selected')
                .siblings('a').addClass('level-selected');
        }
    }
}

function updateDistrict(dist_identifier, dist_zoom) {
    // If coming to this from outside the map
    if (typeof(dist_identifier) === 'string') {
        // Check for secondary
        if ($.inArray(dist_identifier, secondary_index) > -1) {
            // Filter for secondary
            toggleLevelFilters('G5410');
        } else {
            toggleLevelFilters('G5400');
        }

        $map_mobile.addClass('map-hidden');
        zoomToDistrict(dist_identifier, function(feature_properties) {
            updateDistrictDetails(feature_properties);

            if (!isMobile) {
                var css_props = {
                    'left': '10px',
                    'bottom': '108px',
                    'top': 'auto'
                };
            } else {
                var css_props = {
                    'left': 'auto',
                    'bottom': 'auto',
                    'top': 'auto'
                };
            }

            $tooltip.css(css_props);

            // Show tooltip if hidden
            if ($tooltip.hasClass('tooltip-hidden')) {
                $tooltip.removeClass('tooltip-hidden');
            }

            if (isMobile && pymChild) {
                pymChild.sendHeight();
            }
        });
    } else {
        // If coming to this from map interaction
        var state_fips = dist_identifier[map_data_stfips];
        updateDistrictDetails(dist_identifier);
        updateState(state_fips, false);
    }
}

function updateDistrictDetails(dist_properties) {
    currentDistrictName = dist_properties[map_data_name];
    currentDistrictID = dist_properties['GEOID'];
    currentAmount = dist_properties[map_data_amt];
    currentFIPS = dist_properties[map_data_stfips];
    renderDetailsDistrict(currentDistrictName, currentDistrictID, currentAmount, currentFIPS);
}

function zoomToDistrict(dist_id, zoomCallback) {
    var state_fips = dist_id.slice(0,2);

    // Look for the district by id on the rendered map (this is only what is in view)
    var selected_dist = us_map.queryRenderedFeatures({
        layers: ['districts-04-bin1','districts-04-bin2','districts-04-bin3','districts-04-bin4','districts-04-bin5'],
        filter: ['==', 'GEOID', dist_id]
    });

    // If the district isn't in view already...
    if (selected_dist.length === 0) {
        // Update the state and zoom to state level
        updateState(state_fips, true);

        // I know, this is crazy. We have to wait the duration of the easeTo animation so the district can be in view.
        setTimeout(function() {
            selected_dist = us_map.queryRenderedFeatures({
                layers: ['districts-04-bin1','districts-04-bin2','districts-04-bin3','districts-04-bin4','districts-04-bin5'],
                filter: ['==', 'GEOID', dist_id]
            });

            // NOW you can zoom to the district.
            var dist_bbox = getBoundingBox(selected_dist[0]);
            zoomToShape(dist_bbox);

            if (zoomCallback) {
                zoomCallback(selected_dist[0]['properties']);
            }
        }, anim_duration);
    } else {
        // If the district is in view, go to it
        var dist_bbox = getBoundingBox(selected_dist[0]);
        zoomToShape(dist_bbox);
        updateState(state_fips, false);

        if (zoomCallback) {
            zoomCallback(selected_dist[0]['properties']);
        }
    }
}

function zoomToShape(bbox) {
    us_map.fitBounds(bbox, {
        padding: 30,
        maxZoom: 8,
        //linear: true,
        curve: 0.1,
        duration: anim_duration
    });
}

function zoomToUS() {
    us_map.fitBounds([[-127.79,25.26],[-65.56,50]], {
        padding: 30,
        //linear: true,
        curve: 0.1,
        duration: anim_duration
    });

    if (isMobile) {
        $('#zoom-out').addClass('disabled');
    }
}

function attachMapNavEvents() {
    $('#map-nav').find('a').on('click', function(e) {
        e.preventDefault();
        if (!$(this).hasClass('disabled')) {
            if ($(this).attr('id') === 'nav-us') {
                if ($map_mobile.hasClass('map-hidden')) {
                    $map_mobile.removeClass('map-hidden');
                }
                zoomToUS();
            } else if ($(this).attr('id') === 'zoom-in') {
                if (!$map_mobile.hasClass('map-hidden')) {
                    $map_mobile.addClass('map-hidden');
                }
                us_map.zoomIn();
            } else if ($(this).attr('id') === 'zoom-out') {
                us_map.zoomOut();
            }
        }
    });

    $('#level-show').find('a').on('click', function(e) {
        e.preventDefault();
        if (!$(this).hasClass('level-selected')) {
            $('#level-show').find('.level-selected').removeClass('level-selected');
            $(this).addClass('level-selected');
            toggleLevelFilters($(this).data('level'), true);
        }
    });
}

function getBoundingBox(data) {
  var bounds = {}, coords, point, latitude, longitude;

    //for (var i = 0; i < data.features.length; i++) {
      coords = data.geometry.coordinates[0];

      for (var j = 0; j < coords.length; j++) {
          longitude = coords[j][0];
          latitude = coords[j][1];
          bounds.xMin = bounds.xMin < longitude ? bounds.xMin : longitude;
          bounds.xMax = bounds.xMax > longitude ? bounds.xMax : longitude;
          bounds.yMin = bounds.yMin < latitude ? bounds.yMin : latitude;
          bounds.yMax = bounds.yMax > latitude ? bounds.yMax : latitude;
      }
    //}

    return [[bounds.xMin, bounds.yMin], [bounds.xMax, bounds.yMax]];
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

    // Adjust sizing of mobile map container
    if (isMobile) {
        // Set to height of map image
        $('#map').height($('#map-mobile').outerHeight());
    } else {
        // Use height specified in CSS
        $('#map').css({'height': ''});
    }

    renderDetailsUS();

    if (currentDistrictName) {
        renderDetailsDistrict(currentDistrictName, currentDistrictID, currentAmount, currentFIPS, containerWidth);
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderDetailsUS = function() {
    var usData = histogram_data['US'];
    renderColumnChart({
        container: '#us-histogram',
        width: $('#us-histogram').width(),
        height: $('#us-histogram').height(),
        data: usData,
        //highlight: amount,
        stateAverage: STATE_AVERAGES[51]['PPE']
    });

    if (pymChild) {
        pymChild.sendHeight();
    }
};

var renderDetailsDistrict = function(districtName, districtID, amount, FIPS, containerWidth) {
    /*
     * Generate state histogram.
     */
    var districtName = lookup_data[districtID];
    if (!districtName) {
        //console.log('CANNOT FIND', DISTRICTID)
    }
    var splitOnComma = districtName.split(', ');
    var stateName = splitOnComma[splitOnComma.length - 1];
    var postalCode = getStateInfoFromFips(districtID.slice(0,2), 'code');
    var stateData = histogram_data[postalCode];
    var isSingleDistrict = typeof(stateData) === 'undefined';

    var usAverage = STATE_AVERAGES[51]['PPE']; // NOTE: THIS IS BAD

    var templateData = {
        'districtName': districtName,
        'amount': fmtComma(amount.toFixed(0)),
        'state': getStateInfoFromFips(FIPS, 'name'),
        'isSingleDistrict': isSingleDistrict
    }

    $tooltip.html(tt_template(templateData));

    if (!isSingleDistrict) {
        var container_w = $('#state-histogram').width();
        // Mobile hack...
        if (!container_w || parseInt(container_w, 10) <= 100) {
            container_w = $(window).innerWidth();
        }
        renderColumnChart({
            container: '#state-histogram',
            width: container_w,
            height: $('#state-histogram').height(),
            data: stateData,
            highlight: amount
        });
    }
}

var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var labelColumn = 'xmin';
    var valueColumn = 'count';

    var outlierData = config['data'].slice(-1)[0];
    var normalData = config['data'].slice(0,-1);

    var isUS = config['container'] == '#us-histogram';

    var aspectWidth = 16;
    var aspectHeight = isUS ? 7 : 9;
    var valueGap = 6;

    var margins = {
        top: isUS ? 15 : 15,
        right: 30,
        bottom: isUS ? 20 : 30,
        left: 48
    };

    var ticksY = 2;
    var roundTicksFactor = 1;

    if (config.highlight) {
        for (var i = 0; i < config.data.length; i++) {
            if (config.highlight < config.data[i]['xmin']) {
                var highlightBin = config.data[i-1]['xmin'];
                break;
            }
        }
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    if (config['height']) {
        var chartHeight = config['height'] - margins['top'] - margins['bottom'];
    } else {
        var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    }

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
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scale.linear()
        .domain([0, d3.max(config['data'], function(d) { return parseInt(d[labelColumn])})])
        .range([0, chartWidth]);

    var min = d3.min(config['data'], function(d) {
        return Math.floor(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    if (min > 0) {
        min = 0;
    }

    var max = d3.max(config['data'], function(d) {
        return Math.ceil(d[valueColumn] / roundTicksFactor) * roundTicksFactor;
    });

    var yScale = d3.scale.linear()
        .domain([min, max])
        .range([chartHeight, 0]);

    /*
     * Create D3 axes.
     */
    var tickValues = config['width'] > 380 ? [0,10000,20000,30000] : [0, 20000];
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues(tickValues)
        .tickFormat(function(d, i) {
            return '$' + fmtComma(d);
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .ticks(ticksY)
        .tickFormat(function(d) {
            return fmtComma(d);
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

    var top_axis_label = d3.select(chartElement.selectAll('.y.axis .tick')[0].pop()).select('text');
    var top_axis_text = top_axis_label.text();
    top_axis_label.text(top_axis_text + ' districts')
        .call(wrapText, margins['left']-5, 14);

    /*
     * Render grid to chart.
     */
    var yAxisGrid = function() {
        return yAxis;
    };

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0)
            .tickFormat('')
        );

    /*
     * Render bars to chart.
     */
    var bar_w = chartWidth / normalData.length;

    chartElement.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
        .data(normalData)
        .enter()
        .append('rect')
            .attr('x', function(d) {
                return xScale(parseInt(d[labelColumn]));
            })
            .attr('y', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(0);
                }

                return yScale(d[valueColumn]);
            })
            .attr('width', bar_w)
            .attr('height', function(d) {
                if (d[valueColumn] < 0) {
                    return yScale(d[valueColumn]) - yScale(0);
                }

                return yScale(0) - yScale(d[valueColumn]);
            })
            .attr('class', function(d) {
                var color_breaks = [0, 7815, 10657, 13025, 15749, 837693];
                var this_value = d[labelColumn];
                var this_bin;

                for (var break_i=0; break_i<color_breaks.length; break_i++) {
                    if (this_value < color_breaks[break_i]) {
                        this_bin = break_i;
                        break;
                    }
                }

                var classes =  'bar bar-' + d[labelColumn] + ' bin' + this_bin;
                return classes;
            })

    /*
     * Render a break in the x-axis and the outlier column
     */
    var outlier_g = chartElement.append('g')
        .attr('class', 'outlier-g');

    // Break in axis
    var break_g = outlier_g.append('g')
        .attr('class', 'outlier-break')
        .attr('transform', 'translate(' + (xScale(outlierData[labelColumn]) - 1) + ',' + yScale(0) + ')');

    break_g.append('rect')
        .attr('class', 'break-axis')
        .attr('width', 3)
        .attr('height', 1)
        .attr('transform', 'translate(5,0)');

    break_g.append('rect')
        .attr('class', 'break-line')
        .attr('width', 1)
        .attr('height', 12)
        .attr('transform', 'translate(0,-6)');

    break_g.append('rect')
        .attr('class', 'break-space')
        .attr('width', 3)
        .attr('height', 12)
        .attr('transform', 'translate(1,-6)');

    break_g.append('rect')
        .attr('class', 'break-line')
        .attr('width', 1)
        .attr('height', 12)
        .attr('transform', 'translate(4,-6)');

    // Axis label for outlier
    var outlier_axis = outlier_g.append('g')
        .attr('class', 'axis');

    outlier_axis.append('line')
        .attr('x1', xScale(outlierData[labelColumn]) + 4 + 2 + (bar_w/2))
        .attr('x2', xScale(outlierData[labelColumn]) + 4 + 2 + (bar_w/2))
        .attr('y1', chartHeight + margins['top']-15)
        .attr('y2', chartHeight + margins['top']-9)
        .attr('class', 'chart-tick');
    outlier_axis.append('text')
        .attr('x', xScale(outlierData[labelColumn]) + 4 + 2 + (bar_w/2))
        .attr('y', chartHeight + margins['top'] + 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'chart-tick-label')
        .text('$40,000+');

    // Bar for outlier
    outlier_g.append('rect')
        .attr('width', bar_w)
        .attr('height', yScale(0) - yScale(outlierData[valueColumn]))
        .attr('x', xScale(outlierData[labelColumn]) + 4 + 2)
        .attr('y', yScale(outlierData[valueColumn]))
        .attr('class', function(d) {
            var color_breaks = [0, 7815, 10657, 13025, 15749, 837693];
            var this_value = outlierData[labelColumn];
            var this_bin;

            for (var break_i=0; break_i<color_breaks.length; break_i++) {
                if (this_value < color_breaks[break_i]) {
                    this_bin = break_i;
                    break;
                }
            }
            var classes = 'bar bar-' + outlierData[labelColumn] + ' bin' + this_bin;;
            return classes;
        });

    // Label/anno for outlier
    if (outlierData[valueColumn] > 0 && isUS) {
        var label_start = outlierData[valueColumn] == 1 ? 'One district spends' : outlierData[valueColumn] + ' districts spend';
        var label_text = label_start + ' more than $40,000 per student.';
        var line_height = isUS ? 13 : 11;
        var label_w = isUS ? 150 : 100;

        if (config['container'] == '#us-histogram') {
            label_text += ' Most have fewer than 200 students enrolled.'
        }

        var text_element = outlier_g.append('text')
            .attr('class', 'label chart-anno')
            .attr('x', xScale(outlierData[labelColumn]) + 4 + 2 + bar_w)
            .attr('y', line_height - margins['top'])
            .attr('text-anchor', 'end')
            .text(label_text)
            .call(wrapText, 150, line_height);

        outlier_g.append('line')
            .attr('class', 'chart-leader')
            .attr('x1', xScale(outlierData[labelColumn]) + 4 + 2 + (bar_w/2))
            .attr('x2', xScale(outlierData[labelColumn]) + 4 + 2 + (bar_w/2))
            .attr('y1', 4 - margins['top'] + (parseInt(text_element.style('height'))))
            .attr('y2', yScale(outlierData[valueColumn]) - 4)

    }

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

    if (config['stateAverage']) {
        chartElement.append('line')
            .attr('class', 'state-average')
            .attr('x1', xScale(parseInt(config.stateAverage)))
            .attr('x2', xScale(parseInt(config.stateAverage)))
            .attr('y1', yScale(0))
            .attr('y2', yScale(max))

        chartElement.append('text')
            .attr('class', 'state-average-label current-selection-label')
            .attr('text-anchor', 'middle')
            .attr('x', xScale(parseInt(config.stateAverage)))
            .attr('y', yScale(max) - 7)
            .text('U.S. average');
    }

    if (config['highlight']) {
        chartElement.append('line')
            .attr('class', 'current-selection')
            .attr('x1', xScale(parseInt(config.highlight)))
            .attr('x2', xScale(parseInt(config.highlight)))
            .attr('y1', yScale(0))
            .attr('y2', yScale(max) - 5)

        chartElement.append('text')
            .attr('class', 'current-selection-label')
            .attr('text-anchor', 'middle')
            .attr('x', xScale(parseInt(config.highlight)))
            .attr('y', yScale(max) - 7)
            .text('This district');
    }

}

var initLunr = function() {
    // Create custom stop word filters
    var customStopFilter = lunr.generateStopWordFilter(['school','district']);
    lunr.Pipeline.registerFunction(customStopFilter, 'customStopList');

    // Initialize lunr search index
    var lunrCustom = function(config, extra) {
        var idx = new lunr.Index;

        idx.pipeline.add(
            lunr.trimmer,
            lunr.stopWordFilter
        );

        if (extra) {
            idx.pipeline.add(extra);
        }

        if (config) {
            config.call(idx, idx);
        }

        return idx;
    };

    var lunrInit = function() {
        this.field('search_text');
        this.ref('id');
    };

    lookup_index = lunrCustom(lunrInit, customStopFilter);

    // Add each district to the index
    $.each(lookup_data, function(k,v) {
        lookup_index.add({
            id: k,
            search_text: v
        });
    });
};

var initLookup = function() {
    $('.typeahead').typeahead({
        highlight: true,
        minLength: 2
    },
    {
        name: 'lookup_data',
        source: substringMatcher(lookup_data),
        display: 'value',
        templates: {
            empty: typeahead_empty,
            suggestion: typeahead_suggestion
        }
    })
    .on('typeahead:select', function(e, suggestion) {
        updateDistrict(suggestion);
    });
};

var geoLocate = function() {
    if (typeof geoip2 === 'object') {
        geoip2.city(onLocateIP, onLocateFail);
    }

    if (typeof geoip2 !== 'object') {
        _setLocateDefault();
    }
}

var onLocateIP = function(response) {
    current_state = response.most_specific_subdivision.iso_code;
    setGeotextParagraph();
}

var onLocateFail = function(error) {
    _setLocateDefault();
}

var _setLocateDefault = function() {
    // You can pass any state here to have a default case, or just do something else entirely here.
    setGeotextParagraph();
}

/*
 * Search substrings using Lunr index
 */
function substringMatcher(strs) {
    return function findMatches(q, cb) {
        var matches = lookup_index.search(q).map(function(result) { return result['ref']; });
        matches.sort();
        cb(matches);
    };
}

function typeahead_suggestion(match_id) {
    return '<p>' + lookup_data[match_id] + '</p>';
}

function typeahead_empty(obj) {
    return '<p>No matching agencies found.</p>';
}

var sortSearchNames = function(a,b) {
    if (a['value'] < b['value']) {
        return -1;
    }
    if (a['value'] > b['value']) {
        return 1;
    }
    return 0;
}
// http://stackoverflow.com/questions/1129216/sorting-objects-in-an-array-by-a-field-value-in-javascript

var getStateInfoFromFips = function(fips, property) {
    var state_lookup = {"30": {"code": "MT", "name": "Montana", "bbox": [[-116.04751, 44.394132], [-104.042057, 49.000239]]}, "54": {"code": "WV", "name": "West Virginia", "bbox": [[-82.621743, 37.20291], [-77.719881, 40.636951]]}, "42": {"code": "PA", "name": "Pennsylvania", "bbox": [[-80.518598, 39.722302], [-74.69661, 42.269079]]}, "48": {"code": "TX", "name": "Texas", "bbox": [[-106.643603, 25.887551], [-93.526331, 36.501861]]}, "45": {"code": "SC", "name": "South Carolina", "bbox": [[-83.339222, 32.032678], [-78.541422, 35.198349]]}, "50": {"code": "VT", "name": "Vermont", "bbox": [[-73.436914, 42.729142], [-71.4926, 45.013027]]}, "49": {"code": "UT", "name": "Utah", "bbox": [[-114.048427, 37.000263], [-109.042503, 42.000709]]}, "53": {"code": "WA", "name": "Washington", "bbox": [[-124.706553, 45.549767], [-116.918344, 49.000239]]}, "02": {"code": "AK", "name": "Alaska", "bbox": [[-178.123152, 51.61274], [-130, 71.351633]]}, "25": {"code": "MA", "name": "Massachusetts", "bbox": [[-73.508114, 41.496831], [-69.937149, 42.887974]]}, "26": {"code": "MI", "name": "Michigan", "bbox": [[-90.415429, 41.694001], [-82.413619, 48.173221]]}, "01": {"code": "AL", "name": "Alabama", "bbox": [[-88.471115, 30.247195], [-84.889196, 35.00118]]}, "06": {"code": "CA", "name": "California", "bbox": [[-124.410798, 32.536556], [-114.136058, 42.011663]]}, "21": {"code": "KY", "name": "Kentucky", "bbox": [[-89.418626, 36.496384], [-81.969987, 39.103408]]}, "04": {"code": "AZ", "name": "Arizona", "bbox": [[-114.815198, 31.331629], [-109.042503, 37.00574]]}, "05": {"code": "AR", "name": "Arkansas", "bbox": [[-94.616242, 33.002096], [-89.730812, 36.501861]]}, "46": {"code": "SD", "name": "South Dakota", "bbox": [[-104.058488, 42.488157], [-96.434587, 45.944106]]}, "47": {"code": "TN", "name": "Tennessee", "bbox": [[-90.311367, 34.984749], [-81.679709, 36.677123]]}, "08": {"code": "CO", "name": "Colorado", "bbox": [[-109.058934, 36.994786], [-102.042974, 41.003906]]}, "09": {"code": "CT", "name": "Connecticut", "bbox": [[-73.727192, 40.987475], [-71.799309, 42.050002]]}, "28": {"code": "MS", "name": "Mississippi", "bbox": [[-91.636787, 30.181472], [-88.098683, 34.995703]]}, "29": {"code": "MO", "name": "Missouri", "bbox": [[-95.7664, 35.997983], [-89.133825, 40.615043]]}, "40": {"code": "OK", "name": "Oklahoma", "bbox": [[-103.001438, 33.637421], [-94.430026, 37.000263]]}, "41": {"code": "OR", "name": "Oregon", "bbox": [[-124.553198, 41.989755], [-116.463758, 46.261769]]}, "51": {"code": "VA", "name": "Virginia", "bbox": [[-83.673316, 36.5402], [-75.244304, 39.464886]]}, "24": {"code": "MD", "name": "Maryland", "bbox": [[-79.488933, 37.909435], [-75.047134, 39.722302]]}, "56": {"code": "WY", "name": "Wyoming", "bbox": [[-111.05254, 40.998429], [-104.053011, 45.002073]]}, "39": {"code": "OH", "name": "Ohio", "bbox": [[-84.817996, 38.424267], [-80.518598, 41.978802]]}, "27": {"code": "MN", "name": "Minnesota", "bbox": [[-97.228743, 43.501391], [-89.615796, 49.383625]]}, "72": {"code": "PR", "name": "Puerto Rico", "bbox": [[-67.269879, 17.929556], [-65.626797, 18.515589]]}, "20": {"code": "KS", "name": "Kansas", "bbox": [[-102.053927, 36.994786], [-94.610765, 40.001626]]}, "38": {"code": "ND", "name": "North Dakota", "bbox": [[-104.047534, 45.933153], [-96.560556, 49.000239]]}, "11": {"code": "DC", "name": "District of Columbia", "bbox": [[-77.117418, 38.791222], [-76.909294, 38.993869]]}, "10": {"code": "DE", "name": "Delaware", "bbox": [[-75.786521, 38.451652], [-75.047134, 39.831841]]}, "13": {"code": "GA", "name": "Georgia", "bbox": [[-85.606675, 30.356734], [-80.885553, 35.00118]]}, "12": {"code": "FL", "name": "Florida", "bbox": [[-87.633143, 25.120779], [-80.03115, 31.003013]]}, "15": {"code": "HI", "name": "Hawaii", "bbox": [[-159.764448, 18.948267], [-154.807817, 22.228955]]}, "22": {"code": "LA", "name": "Louisiana", "bbox": [[-94.041164, 29.009407], [-89.002379, 33.018527]]}, "17": {"code": "IL", "name": "Illinois", "bbox": [[-91.50534, 36.983832], [-87.49622, 42.510065]]}, "16": {"code": "ID", "name": "Idaho", "bbox": [[-117.241483, 41.995232], [-111.047063, 49.000239]]}, "19": {"code": "IA", "name": "Iowa", "bbox": [[-96.631756, 40.379535], [-90.141582, 43.501391]]}, "18": {"code": "IN", "name": "Indiana", "bbox": [[-88.060345, 37.788942], [-84.801565, 41.759724]]}, "31": {"code": "NE", "name": "Nebraska", "bbox": [[-104.053011, 40.001626], [-95.306337, 43.002989]]}, "23": {"code": "ME", "name": "Maine", "bbox": [[-71.08183, 43.057759], [-66.979601, 47.461219]]}, "37": {"code": "NC", "name": "North Carolina", "bbox": [[-84.319594, 33.845545], [-75.715321, 36.589492]]}, "36": {"code": "NY", "name": "New York", "bbox": [[-79.76278, 40.543843], [-72.100541, 45.018503]]}, "35": {"code": "NM", "name": "New Mexico", "bbox": [[-109.04798, 31.331629], [-103.001438, 37.000263]]}, "34": {"code": "NJ", "name": "New Jersey", "bbox": [[-75.561967, 38.993869], [-73.902454, 41.359907]]}, "33": {"code": "NH", "name": "New Hampshire", "bbox": [[-72.544173, 42.696281], [-70.703921, 45.303304]]}, "55": {"code": "WI", "name": "Wisconsin", "bbox": [[-92.885529, 42.493634], [-87.03068, 46.95734]]}, "32": {"code": "NV", "name": "Nevada", "bbox": [[-120.001861, 35.00118], [-114.04295, 42.000709]]}, "44": {"code": "RI", "name": "Rhode Island", "bbox": [[-71.859555, 41.321569], [-71.120168, 42.01714]]}}

    return state_lookup[fips][property];
};

var getStateFipsFromAbbrev = function(abbrev) {
    var state_lookup = {
        AK: "02",
        AL: "01",
        AR: "05",
        AZ: "04",
        CA: "06",
        CO: "08",
        CT: "09",
        DC: "11",
        DE: "10",
        FL: "12",
        GA: "13",
        HI: "15",
        IA: "19",
        ID: "16",
        IL: "17",
        IN: "18",
        KS: "20",
        KY: "21",
        LA: "22",
        MA: "25",
        MD: "24",
        ME: "23",
        MI: "26",
        MN: "27",
        MO: "29",
        MS: "28",
        MT: "30",
        NC: "37",
        ND: "38",
        NE: "31",
        NH: "33",
        NJ: "34",
        NM: "35",
        NV: "32",
        NY: "36",
        OH: "39",
        OK: "40",
        OR: "41",
        PA: "42",
        RI: "44",
        SC: "45",
        SD: "46",
        TN: "47",
        TX: "48",
        UT: "49",
        VA: "51",
        VT: "50",
        WA: "53",
        WI: "55",
        WV: "54",
        WY: "56"
    };

    return state_lookup[abbrev];
};

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

        var dx = text.attr('dx') || 0;
        var dy = text.attr('dy') || 0;

        dx = parseFloat(dx);
        dy = parseFloat(dy);

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'em');

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

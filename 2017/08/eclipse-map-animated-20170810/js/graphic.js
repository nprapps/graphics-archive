// Global config
var GEO_DATA_URL = 'data/geodata.json';

var CITY_LABEL_DEFAULTS = {
    'text-anchor': 'end',
    'dx': '-7',
    'dy': '-5'
}
var STATE_LABEL_DEFAULTS = {
    'text-anchor': 'center',
    'dx': '0',
    'dy': '4'
}
var CITY_LABEL_ADJUSTMENTS = {
    'Atlanta': { 'dx': -5, 'dy': 12 },
    'Casper': { 'text-anchor': 'middle', 'dx': 3, 'dy': -10 },
    'Charleston': { 'text-anchor': 'start', 'dx': 7, 'dy': 7 },
    'Cheyenne': { 'text-anchor': 'middle', 'dx': -20, 'dy': -10 },
    'Cincinnati': { 'text-anchor': 'start', 'dx': 5 },
    'Columbia': { 'text-anchor': 'start', 'dx': 7 },
    'Denver': { 'dy': 14 },
    'Des Moines': { 'text-anchor': 'start', 'dx': 7 },
    'Nashville': { 'text-anchor': 'start', 'dx': 7 },
    'Idaho Falls': { 'dx': -5, 'dy': 14 },
    'Kansas City': { 'dx': -8, 'dy': 4 },
    'Jefferson City': { 'dx': 22, 'dy': 18 },
    'Lincoln': { 'dy': 7 },
    'Memphis': { 'dx': -5, 'dy': 12 },
    'Pierre': { 'text-anchor': 'middle', 'dx': 3, 'dy': -10 },
    'Portland': { 'dx': 3, 'dy': -7 },
    'Raleigh': { 'text-anchor': 'start', 'dx': 7, 'dy': 4 },
    'Salem': { 'dy': 7 },
    'Salt Lake City': { 'dy': 14 },
    'Seattle': { 'text-anchor': 'middle', 'dx': 3, 'dy': -10 },
    'St. Louis': { 'text-anchor': 'middle', 'dx': 3, 'dy': -10 }
};
var STATE_LABEL_ADJUSTMENTS = {
    'California': { 'dx': -7 },
    'Connecticut': { 'text-anchor': 'begin', 'dx': 14, 'dy': 10 },
    'Delaware': { 'text-anchor': 'begin', 'dx': 24 },
    'Florida': { 'dx': 9 },
    'Idaho': { 'dy': 15 },
    'Louisiana': { 'dx': -7 },
    'Maine': { 'dx': 3 },
    'Massachusetts': { 'dx': 30, 'dy': -5 },
    'Minnesota': { 'dx': -3 },
    'Michigan': { 'dx': 11, 'dy': 25 },
    'New Hampshire': { 'dx': 2, 'dy': 8 },
    'New Jersey': { 'text-anchor': 'begin', 'dx': 24 },
    'Rhode Island': { 'text-anchor': 'begin', 'dx': 10 },
    'Vermont': { 'dy': -4 },
    'Washington': { 'dy': 7 }
}

// Global vars
var pymChild = null;
var isMobile = false;
var geoData = null;

// Global vars for map d3 instance, window intervals
var embedEnv,
    mapInstance,
    graphicWrapper,
	animationTimer,
	liveTimer;

// Easy access for configurable values
var dayStartTime = ECLIPSE_DAY_START; // ACTUAL Epoch time for midnight of eclipse day
//var dayStartTime = 1503103080; // FAKE TESTING Epoch time for start of live rehearsal
var timeExtent = [62160000, 67740000]; // ACTUAL Start and end times, relative to dayStartTime, in ms
var liveIntervalDuration = 10000; // How often to check the time
var umbraGray = '#666';
var umbraColor = '#190d72';

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        embedEnv = getParameterByName('env') || 'story';
        loadJSON();
        graphicWrapper = d3.select('#graphic-wrapper');
    } else {
        pymChild = new pym.Child({});

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
        pymChild.onMessage('scroll-depth', function(data) {
            data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
        });
    }
}

var initLiveTimer = function() {
    if (liveTimer) {
        window.clearInterval(liveTimer);
    }
    onTimeCheck();

	liveTimer = window.setInterval(onTimeCheck, liveIntervalDuration);

	function onTimeCheck() {
        var currentDatetime = new Date();
        var roundedTime = roundToMinute(currentDatetime);
        var timeSinceStart = convertSecondsToMils(roundedTime - dayStartTime);
		//console.log('Checking the time:', timeSinceStart);

        var eclipseStartTime = dayStartTime + convertMilsToSeconds(timeExtent[0]);
        var eclipseEndTime = dayStartTime + convertMilsToSeconds(timeExtent[1]);

        // Show current time
		updateTimeLabel('#anim-time', roundedTime - dayStartTime);

        // Check if current time is within eclipse bounds
        if (roundedTime >= eclipseStartTime && roundedTime <= eclipseEndTime) {
            graphicWrapper.classed('live-updating', true);
            graphicWrapper.classed('not-live', false);
            graphicWrapper.classed('outside-window', false);
            mapInstance['updateUmbraPosition'](timeSinceStart, true);
        } else {
            // Or if current time is outside eclipse bounds
            graphicWrapper.classed('live-updating', false);
            graphicWrapper.classed('not-live',true);
            graphicWrapper.classed('outside-window', true);

            var timeNote = d3.select('#time-note');

            if (roundedTime < eclipseStartTime) {
                // if the eclipse is in the future
                var eclipseDayTime = getEclipseDayTime(convertMilsToSeconds(timeExtent[0]), true);
                timeNote.html('Total eclipse reaches U.S. at ' + eclipseDayTime[0] + ' on ' + eclipseDayTime[1]);
            } else if (roundedTime > eclipseEndTime) {
                // if the eclipse is in the past
                var eclipseDayTime = getEclipseDayTime(convertMilsToSeconds(timeExtent[1]), true);
                timeNote.html('Total eclipse left U.S. at ' + eclipseDayTime[0] + ' on ' + eclipseDayTime[1]);
            }
        }
	};

    function roundToMinute(timeToRound) {
        // Round down to the minute
        var timeInMils = timeToRound.getTime();
        var timeInSeconds = Math.floor(timeInMils / 1000);
        var roundedTime = timeInSeconds - (timeInSeconds % 60);
        return roundedTime;
    };
};

var updateTimeLabel = function(labelSelector, timeInSeconds) {
    var timeLabel = d3.select(labelSelector);
    var timeText = timeInSeconds ? getEclipseDayTime(timeInSeconds) : '';

    timeLabel.text(timeText);
};

/*
 * Load graphic data from a CSV.
 */
var loadJSON = function() {
    d3.json(GEO_DATA_URL, function(error, data) {
        geoData = data;

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

    //console.log(geoData);

    // Render the chart!
    mapInstance = renderLocatorMap({
        container: '#map-canvas',
        width: containerWidth,
        data: geoData,
        pathState: 'yes'
    });

    addTouchPrompt();
    initLiveTimer();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var addTouchPrompt = function() {
    if (Modernizr.touchevents) {
        var touchNote = d3.select('#touch-note')
            .style('opacity', 0)
            .classed('note-visible', true);

        touchNote
            .transition()
                .duration(400)
                .style('opacity', 1)
            .each('end', function() {
                touchNote.transition()
                    .delay(1800)
                    .duration(800)
                    .style('opacity', 0);
                });

        setTimeout(function() {
            touchNote.classed('note-visible', false);
        }, 3300);
    }
};

var renderLocatorMap = function(config) {
	var self = {};
    /*
     * Setup
     */
    var aspectWidth = 2;
    var aspectHeight = 1.25;

    var bbox = config['data']['bbox'];
    var defaultScale = 3000;
    var cityDotRadius = 2.5;

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var mapProjection = null;
    var path = null;
    var chartWrapper = null;
    var chartElement = null;

    /*
     * Extract topo data.
     */
    var mapData = {};

    for (var key in config['data']['objects']) {
        mapData[key] = topojson.feature(config['data'], config['data']['objects'][key]);
    }

    /*
     * Create the map projection.
     */
    var centroid = [((bbox[0] + bbox[2]) / 2), ((bbox[1] + bbox[3]) / 2)];
    var mapScale = (mapWidth / DEFAULT_WIDTH) * defaultScale;
    var scaleFactor = mapWidth / DEFAULT_WIDTH;

    projection = d3.geo.albers()
        //.center(centroid)
        .scale(mapScale/4)
        .translate([ mapWidth/2, mapHeight/2 ]);

    path = d3.geo.path()
        .projection(projection)
        .pointRadius(cityDotRadius * scaleFactor);

    /*
     * Create voronoi diagram for overlay
     */
    var voronoi = d3.geom.voronoi()
        .x(function(d) { return projection([d['lng'], d['lat']])[0]; })
        .y(function(d) { return projection([d['lng'], d['lat']])[1]; })
        .clipExtent([[-1,1], [mapWidth + 1, mapHeight + 1]]);

    /*
     * Create the root SVG element.
     */
    chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var svgElement = chartWrapper.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight);

    chartElement = svgElement.append('g')
        .attr('transform', 'translate(' + (0.025 * mapWidth) + ',0)');

    /*
     * Create SVG filters.
     */
    var filters = chartElement.append('defs');

    var textFilter = filters.append('filter')
        .attr('id', 'textshadow');

    textFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('result', 'blurOut')
        .attr('stdDeviation', '.25');

    var landFilter = filters.append('filter')
        .attr('id', 'landshadow');

    landFilter.append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('result', 'blurOut')
        .attr('stdDeviation', '10');

    //state outlines
    chartElement.append('g')
        .attr('class', 'states')
        .selectAll('path')
            .data(mapData['states']['features'])
        .enter().append('path')
            .attr('class', function(d) {
                return classify(d['id']);
            })
            .attr('class', function(d) {
                return classify(d['properties']['in_path']);
            })
            .attr('d', path);

    // Highlight primary country
    d3.selectAll('.yes').moveToFront();

    /*
     * Apply adjustments to label positioning.
     */
    var positionLabel = function(adjustments, id, attribute, layer) {
        var defaults = eval(layer.toUpperCase() + '_LABEL_DEFAULTS');
        var labelScale = 1;
        var thisAttr = attribute;

        if (isMobile) {
            labelScale = .4;
        }

        if (adjustments[id]) {
            if (adjustments[id][attribute]) {
                if (!isNaN(adjustments[id][attribute])) {
                    return adjustments[id][attribute] * labelScale;
                } else {
                    return adjustments[id][attribute];
                }
            } else {
                if (!isNaN(defaults[attribute])) {
                    return defaults[attribute] * labelScale;
                } else {
                    return defaults[attribute];
                }
            }
        } else {
            if (!isNaN(defaults[attribute])) {
                return defaults[attribute] * labelScale;
            } else {
                return defaults[attribute];
            }
        }
    }

    /*
     * Render state labels.
     */
    chartElement.append('g')
        .attr('class', 'state-labels')
        .selectAll('.label')
            .data(mapData['states']['features'])
        .enter().append('text')
            .attr('class', function(d) {
                return 'label ' + classify(d['properties']['abv']);
            })
            .attr('transform', function(d) {
                return 'translate(' + path.centroid(d) + ')';
            })
            .attr('text-anchor', function(d) {
                return positionLabel(STATE_LABEL_ADJUSTMENTS, d['id'], 'text-anchor', 'state');
            })
            .attr('dx', function(d) {
                return positionLabel(STATE_LABEL_ADJUSTMENTS, d['id'], 'dx', 'state');
            })
            .attr('dy', function(d) {
                return positionLabel(STATE_LABEL_ADJUSTMENTS, d['id'], 'dy', 'state');
            })
            .text(function(d) {
                return STATES[d['id']] || d['properties']['abv'];
            });

    /*
     * Render penumbra contour.
     */
    chartElement.append('g')
        .attr('class', 'penum-contour')
        .selectAll('path')
            .data(mapData['penum-contour']['features'])
        .enter().append('path')
            .attr('d', path);

    /*
     * Render umbra contour (path of totality).
     */
    chartElement.append('g')
        .attr('class', 'umbra-contour')
        .selectAll('path')
            .data(mapData['umbra-contour']['features'])
        .enter().append('path')
            .attr('d', path);

    /*
     * Render umbra shape.
     */
    var penumFeatures = mapData['penum-interval']['features'].filter(function(d) {
            if (d['id'] >= timeExtent[0] && d['id'] <= timeExtent[1]) {
                return d;
            }
        });
    var umbraFeatures = mapData['umbra-interval']['features'].filter(function(d) {
            if (d['id'] >= timeExtent[0] && d['id'] <= timeExtent[1]) {
                return d;
            }
        });

    // Shadow (penumbra and umbra) that will update live
    var shadowLive = chartElement.append('g')
        .attr('class', 'shadow-group shadow-live');

    // Shadow (penumbra and umbra) that will update on mouseover
    var shadowHover = chartElement.append('g')
        .attr('class', 'shadow-group shadow-hover');

    var shadowGroups = chartElement.selectAll('.shadow-group');

    shadowGroups.append('g')
        .attr('class', 'penum-interval')
        .selectAll('path')
            .data(penumFeatures.filter(function(d) {
                if (d['id'] == timeExtent[0]) {
                    return d;
                }
            }))
        .enter().append('path')
            .attr('d', path);

    shadowGroups.append('g')
        .attr('class', 'umbra-interval')
        .selectAll('path')
            .data(umbraFeatures.filter(function(d) {
                if (d['id'] == timeExtent[0]) {
                    return d;
                }
            }))
        .enter().append('path')
            .attr('d', path);

    /*
     * Render cities layer
     */
    var cityGroup = chartElement.append('g')
        .attr('class', 'cities')
        .selectAll('g.city-g')
            .data(mapData['combined-cities']['features'])
        .enter().append('g')
            .attr('class', function(d,i) {
                return 'city-g city-' + i;
            });

    cityGroup.append('path')
        .attr('d', path)
        .attr('class', function(d) {
            var c = 'place';
                c += ' ' + classify(d['properties']['city']);
            return c;
        });

    /*
     * Render city labels.
     */
    var layers = [
        'city-labels shadow',
        'city-labels',
    ];

    layers.forEach(function(layer) {
        cityGroup.append('text')
            .attr('class', function(d) {
                var c = layer;
                c += ' ' + classify(d['properties']['city']);
                return c;
            })
            .attr('transform', function(d) {
                return 'translate(' + projection(d['geometry']['coordinates']) + ')';
            })
            .attr('style', function(d) {
                return 'text-anchor: ' + positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'text-anchor', 'city');
            })
            .attr('dx', function(d) {
                return positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'dx', 'city');
            })
            .attr('dy', function(d) {
                return positionLabel(CITY_LABEL_ADJUSTMENTS, d['properties']['city'], 'dy', 'city');
            })
            .text(function(d) {
                return CITIES[d['properties']['city']] || d['properties']['city'];
            });
    });

    d3.selectAll('.shadow')
        .attr('filter', 'url(#textshadow)');

    /*
     * Add big timestamp and position relative to map
     */
    var textLayer = chartElement.append('g')
        .attr('class', 'text-layer');

    // Add interactive timestamp
    textLayer.append('text')
        .attr('id', 'hover-time')
        .attr('class', 'text-hover')
        .attr('dy', 16);

    textLayer.append('line')
        .attr('id', 'hover-line')
        .attr('y1', 20);

    textLayer.append('text')
        .attr('id', 'anim-time')
        .attr('class', 'text-update')
        .attr('x', mapWidth * 0.75)
        .attr('y', mapHeight * 0.15);

    // Only make story and liveblog embed interactive
    // if (embedEnv == 'story' || embedEnv == 'liveblog') {
        /*
         * Render voronoi overlay
         */
        var voronoiData = umbraFeatures.map(function(d) {
            var pointData = d['properties'];
            return pointData;
        });

        chartElement.append('g')
            .attr('class', 'voronoi-overlay')
                .selectAll('path.point-overlay')
                .data(voronoi(voronoiData))
                .enter().append('path')
                .attr('class', 'point-overlay')
                .attr('d', function(d) { return d ? "M" + d.join("L") + "Z" : null; })
                .on('mouseover', function(d) {
                    graphicWrapper.classed('has-mouseover', true);
                    updateTimeLabel('#hover-time', d['point']['utcSec']);
                    self.updateUmbraPosition(convertSecondsToMils(d['point']['utcSec']));

                    // Update position of top text label
                    var currentUmbraBBox = chartElement.select('.shadow-hover .umbra-interval path').node().getBBox();
                    var currentUmbraCenter = currentUmbraBBox.x + (currentUmbraBBox.width / 2);

                    d3.select('#hover-time')
                        .attr('x', currentUmbraCenter < 40 ? 0 : currentUmbraCenter)
                        .classed('label-left', currentUmbraCenter < 40 ? true : false);

                    d3.select('#hover-line')
                        .attr('x1', currentUmbraCenter)
                        .attr('x2', currentUmbraCenter)
                        .attr('y2', currentUmbraBBox.y);
                })
                .on('mouseout', function(d) {
                    // Empty out top text label
                    updateTimeLabel('#hover-time', false);
                    graphicWrapper.classed('has-mouseover', false);
                });
    // }

    // Point in polygon
    // from https://github.com/substack/point-in-polygon
    var pointInPolygon = function (point, vs) {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
        var xi, xj, i, intersect,
            x = point[0],
            y = point[1],
            inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
          xi = vs[i][0],
          yi = vs[i][1],
          xj = vs[j][0],
          yj = vs[j][1],
          intersect = ((yi > y) != (yj > y))
              && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
    };

    /*
     * Externally accessible functions
     */
	self.updateUmbraPosition = function(timeInMils, isLive) {
		var currentUmbra = umbraFeatures.filter(function(d) {
				if (d['id'] == timeInMils) {
					return d;
				}
			});
		var currentPenum = penumFeatures.filter(function(d) {
				if (d['id'] == timeInMils) {
					return d;
				}
			});

        var penumElement = isLive ? shadowLive.select('.penum-interval path') : shadowHover.select('.penum-interval path');
        var umbraElement = isLive ? shadowLive.select('.umbra-interval path') : shadowHover.select('.umbra-interval path');

		// TODO figure out better transition interpolation between paths
		penumElement
			.data(currentPenum)
			.attr('d', path);

		umbraElement
			.data(currentUmbra)
			.attr('d', path);

        // Show cities within penumbra
        var showClass = isLive ? 'city-show-live' : 'city-show-hover';
        cityGroup.classed(showClass, false);
        cityGroup.each(function(d,i) {
            var coords = currentPenum[0]['geometry']['coordinates'][0];
            var point = d['geometry']['coordinates'];
            if (pointInPolygon(point, coords)) {
                d3.select(this).classed(showClass, true)
            }
        });

        return currentUmbra;
	};

    return self;
}

var convertMilsToSeconds = function(timeMils) {
    return timeMils / 1000;
};

var convertSecondsToMils = function(timeSec) {
    return timeSec * 1000;
};

var getEclipseDayTime = function(timeSec, includeDate) {
    var timeFormat = d3.time.format('%-I:%M');
    var thisDatetime = new Date(convertSecondsToMils(dayStartTime + timeSec));
    var ampmSuffix = thisDatetime.getHours() < 12 ? ' a.m.' : ' p.m.';

    var formattedTime = timeFormat(thisDatetime) + ampmSuffix;

    // if includeDate is true, will return an array with formatted time and formatted month/date strings
    if (includeDate) {
        var thisMonth = getAPMonth(thisDatetime);
        var thisDay = thisDatetime.getDate();

        return [formattedTime, thisMonth + ' ' + thisDay];
    } else {
        // if includeDate is false, just return formatted time
        return formattedTime;
    }
};

/*
 * Move a set of D3 elements to the front of the canvas.
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

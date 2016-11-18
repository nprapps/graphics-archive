// Global vars
var pymChild = null;
var isMobile = false;
var axisDates = [
    d3.time.format('%m/%d/%Y').parse('9/12/2016'),
    d3.time.format('%m/%d/%Y').parse('9/19/2016'),
    d3.time.format('%m/%d/%Y').parse('9/26/2016'),
    d3.time.format('%m/%d/%Y').parse('10/3/2016'),
    d3.time.format('%m/%d/%Y').parse('10/10/2016'),
    d3.time.format('%m/%d/%Y').parse('10/17/2016'),
    d3.time.format('%m/%d/%Y').parse('10/24/2016'),
    d3.time.format('%m/%d/%Y').parse('10/31/2016'),
    d3.time.format('%m/%d/%Y').parse('11/7/2016')
];
var currentState = null;
var stateSelector = null;
var today = new Date();
today.setHours(0,0,0,0);
// today = d3.time.format('%m/%d/%Y').parse('11/5/2016');

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    stateSelector = d3.select('select#state-selector')
        .on('change', onDropDownChange);

    if (Modernizr.svg) {
        formatData();

        geoLocate();
        // _setLocateDefault();

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
 * Format the data
 */
var formatData = function() {
    DATA.forEach(function(d) {
        var dateCols = [ 'early_start', 'early_end', 'absentee_request_deadline', 'absentee_ballot_sent', 'absentee_return_deadline', 'voter_reg_deadline', 'all_mail_sent', 'all_mail_deadline' ];
        dateCols.forEach(function(v,k) {
            if (d[v] != null) {
                d[v] = d3.time.format('%m/%d/%Y').parse(d[v]);
            }
        })
    });

    // format Jinja-rendered dates on the page
    var eDates = d3.selectAll('.election-date');
    eDates[0].forEach(function(d,i) {
        var thisDateWrapper = d3.select(d)[0][0];
        var thisDate = d3.time.format('%m/%d/%Y').parse(thisDateWrapper.textContent);
        if (thisDate != null) {
            thisDateWrapper.innerHTML = formatElectionDate(thisDate);
        }
    })
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

    // Render the chart!
    DATA.forEach(function(d, i) {
        renderGraphic({
            container: '#cal-' + classify(d['usps']) + ' .chart',
            width: containerWidth,
            data: d,
            colorDomain:[ 'early', 'absentee', 'mail', 'deadline' ],
            colorRange: [ COLORS['teal2'], COLORS['teal4'], COLORS['teal6'], COLORS['orange3'] ],
            xDomain:    [ axisDates[0],
                          d3.time.format('%m/%d/%Y').parse('11/9/2016') ]
        });
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
    var margins = {
        top: 19,
        right: 10,
        bottom: 11,
        left: 3
    };

    if (isMobile) {
        margins['left'] = 3;
        margins['right'] = 10;
    }

    var bandHeight = 15;
    var bandGap = 1;

    var bands = [];
    if (config['data']['early_start']) {
        bands.push({ 'type': 'early',
                     'start': config['data']['early_start'],
                     'end': config['data']['early_end'] });
    }

    if (config['data']['absentee_ballot_sent']) {
        bands.push({ 'type': 'absentee',
                     'start': config['data']['absentee_ballot_sent'],
                     'end': config['data']['absentee_return_deadline'] });
    }

    if (config['data']['all_mail_sent']) {
        bands.push({ 'type': 'mail',
                     'start': config['data']['all_mail_sent'],
                     'end': config['data']['all_mail_deadline'] });
    }

    var keyDates = [];
    if (config['data']['voter_reg_deadline']) {
        keyDates.push({ 'type': 'Voter registration',
                        'date': config['data']['voter_reg_deadline'] });
    }
    if (config['data']['absentee_request_deadline']) {
        keyDates.push({ 'type': 'Absentee ballot request',
                        'date': config['data']['absentee_request_deadline'] });
    }
    keyDates.push({ 'type': 'Election Day',
                    'date': d3.time.format('%m/%d/%Y').parse('11/8/2016') });

    var numBands = bands.length;
    if (keyDates.length > 0) {
        numBands += 1;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var colorScale = d3.scale.ordinal()
        .domain(config['colorDomain'])
        .range(config['colorRange']);

    if (numBands > 0) {
        // Calculate actual chart dimensions
        var chartWidth = config['width'] - margins['left'] - margins['right'];
        var chartHeight = numBands * (bandHeight + bandGap) - bandGap;

        // Create container
        var chartElement = containerElement.append('svg')
            .attr('width', chartWidth + margins['left'] + margins['right'])
            .attr('height', chartHeight + margins['top'] + margins['bottom'])
            .append('g')
            .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

        // define x axis
        var xScale = d3.time.scale()
            .domain(config['xDomain'])
            .range([ 0, chartWidth ]);

        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient('top')
            .tickValues(axisDates)
            .tickFormat(function(d, i) {
                return formatTickDate(d);
            });

        var xAxisGrid = function() {
            return xAxis;
        }

        var dayWidth = xScale(d3.time.format('%m/%d/%Y').parse('9/20/2016')) - xScale(d3.time.format('%m/%d/%Y').parse('9/19/2016'));

        chartElement.append('rect')
            .attr('class', 'bg')
            .attr('x', xScale(xScale.domain()[0]))
            .attr('width', (xScale(xScale.domain()[1]) - xScale(xScale.domain()[0])))
            .attr('y', 0)
            .attr('height', chartHeight);

        chartElement.append('g')
            .attr('class', 'x axis')
            .attr('transform', makeTranslate(0, 0))
            .call(xAxis);

        chartElement.selectAll('.x.axis .tick text')
            .attr('style', 'text-anchor: begin')
            .attr('dx', '-3');

        var timeSpans = chartElement.append('g')
            .attr('class', 'time-spans')
            .selectAll('line')
            .data(bands)
            .enter()
                .append('line')
                .attr('style', function(d) {
                    var s = '';
                    s += 'stroke: ' + colorScale(d['type']) + '; ';
                    s += 'stroke-width: ' + bandHeight + 'px; ';
                    return s;
                })
                .attr('x1', function(d) {
                    return xScale(d['start']);
                })
                .attr('x2', function(d) {
                    return xScale(d['end']) + dayWidth;
                })
                .attr('y1', function(d, i) {
                    return (i * (bandHeight + bandGap)) + (bandHeight / 2);
                })
                .attr('y2', function(d, i) {
                    return (i * (bandHeight + bandGap)) + (bandHeight / 2);
                });

        // show ticks for individual days
        var dayTicks = chartElement.append('g')
            .attr('class', 'day-ticks');
        for (var i = 0; i < 58; i++) {
            dayTicks.append('line')
                .attr('x1', xScale(xScale.domain()[0]) + (i * dayWidth))
                .attr('x2', xScale(xScale.domain()[0]) + (i * dayWidth))
                .attr('y1', 0)
                .attr('y2', chartHeight);
        }

        var deadlines = chartElement.append('g')
            .attr('class', 'deadlines')
            .selectAll('line')
            .data(keyDates)
            .enter()
                .append('circle')
                .attr('class', function(d) {
                    return classify(d['type']);
                })
                .attr('style', function(d) {
                    var s = '';
                    s += 'fill: ' + colorScale('deadline') + '; ';
                    return s;
                })
                .attr('cx', function(d) {
                    return xScale(d['date']) + (dayWidth / 2);
                })
                .attr('cy', function(d, i) {
                    return ((numBands - 1) * (bandHeight + bandGap)) + (bandHeight / 2);
                })
                .attr('r', function() {
                    if (isMobile) {
                        return dayWidth / 1.3;
                    } else {
                        return dayWidth / 2;
                    }
                });

        chartElement.append('g')
            .attr('class', 'x grid')
            .attr('transform', makeTranslate(0, chartHeight))
            .call(xAxisGrid()
                .tickSize(chartHeight, 0, 0)
                .tickFormat('')
            );

        // highlight today
        if (today >= config['xDomain'][0] && today <= config['xDomain'][1]) {
            var todayHighlight = chartElement.append('g')
                .attr('class', 'today');
            todayHighlight.append('rect')
                .attr('x', xScale(today))
                .attr('width', dayWidth)
                .attr('y', 0)
                .attr('height', chartHeight);
            todayHighlight.append('line')
                .attr('x1', xScale(today))
                .attr('x2', xScale(today) + dayWidth)
                .attr('y1', -2)
                .attr('y2', -2);
            todayHighlight.append('line')
                .attr('x1', xScale(today))
                .attr('x2', xScale(today) + dayWidth)
                .attr('y1', chartHeight + 1)
                .attr('y2', chartHeight + 1);
        }


    }
}

var formatElectionDate = function(d) {
    var monthsAP = [ 'Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.' ];
    var fmtDay = d3.time.format('%A');
    var fmtMonth = d3.time.format('%m');
    var fmtDate = d3.time.format('%_d');

    var day = fmtDay(d);
    var month = monthsAP[ fmtMonth(d) - 1 ];
    var date = fmtDate(d).trim();

    return day + ', ' + month + '&nbsp;' + date;
}

var formatTickDate = function(d) {
    var monthsAP = [ 'Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.' ];
    var fmtMonth = d3.time.format('%m');
    var fmtDate = d3.time.format('%_d');

    var month = monthsAP[ fmtMonth(d) - 1 ];
    var date = fmtDate(d).trim();
    var date_formatted = month + ' ' + date;

    if (isMobile) {
        month = fmtMonth(d);
        date_formatted = month + '/' + date;
    }

    return date_formatted;
}

// geolocation
var geoLocate = function() {
    var cachedState = lscache.get('geo_ip_state');
    if (cachedState && cachedState !== 'undefined') {
        // console.log('using the cached state');
        currentState = cachedState;
        showState(currentState);
    } else {
        if (typeof geoip2 === 'object') {
            // console.log('using geoip');
            geoip2.city(onLocateIP, onLocateFail);
        }

        if (typeof geoip2 !== 'object') {
            _setLocateDefault();
        }
    }
}

var onLocateIP = function(response) {
    currentState = response.most_specific_subdivision.iso_code.toLowerCase();
    lscache.set('geo_ip_state', currentState, 1440);
    showState(currentState);
}

var onLocateFail = function(error) {
    // console.log(error);
    _setLocateDefault();
}

var _setLocateDefault = function() {
    // You can pass any state here to have a default case, or just do something else entirely here.
    // console.log('default location used');
    currentState = 'all';
    // currentState = 'wy';
    showState(currentState);
}

// show/hide states
var showState = function(st) {
    d3.selectAll('.active').classed('active', false);
    d3.selectAll('#cal-' + st).classed('active', true);

    updateDropDown(st);

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var updateDropDown = function(st) {
    var selectorItems = stateSelector.selectAll('option');
    // stateSelector[0][0].selectedIndex = 0;

    selectorItems[0].forEach(function(d,i) {
        var s = d3.select(d);
        var val = d.value;
        if (val == st) {
            s.selected = true;
            stateSelector[0][0].selectedIndex = i;
        } else {
            s.selected = false;
        }
    });
}

var onDropDownChange = function() {
    var s = d3.select(this);
    showState(s[0][0].value);
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

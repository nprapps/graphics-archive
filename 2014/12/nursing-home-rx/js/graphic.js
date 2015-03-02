// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var HOME_DATA_URL = 'home-data.csv';
var STATE_DATA_URL = 'state-data.csv';
var GRAPHIC_DEFAULT_WIDTH = 600;
var GRAPHIC_OUTER_PADDING = 22;
var GUTTER_WIDTH = 22;
var MEDICARE_PATH = 'http://www.medicare.gov/nursinghomecompare/profile.html#profTab=0&ID=';
var MOBILE_THRESHOLD = 540;
var VALUE_WIDTH = 100;

var homeData = [];
var searchData = [];
var stateData = [];
var stateDataNum = [];

var currentHome = null;
//var currentHome = '245552';
//var currentHome = '10A507';
//var currentHome = '015372'
//var currentHome = '015381';
var graphicWidth = null;
var graphicWidthNational = null;
var infoWidth = null;
var isMobile = false;
var x;
var y;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var colorD3 = d3.scale.ordinal()
    .range([ colors['teal5'], colors['teal3'], colors['teal1'] ]);

var margin = {
    top: 5, 
    right: 11 + VALUE_WIDTH, 
    bottom: 30, 
    left: 35
};


// D3 formatters
var fmtComma = d3.format(',');
var fmtMonth = d3.time.format('%m');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var fmtYearMonth = d3.time.format('%B %Y');


/*
 * Initialize
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        graphicD3 = d3.select('#graphic');

        // load the data
        queue() // load multiple files and wait until they're all loaded to act
            .defer(d3.csv, HOME_DATA_URL)
            .defer(d3.csv, STATE_DATA_URL)
            .await(onDataLoaded);
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * Process the data
 */
var onDataLoaded = function(error, home, state) {
    var dateKeys = d3.keys(home[0]).filter(function(key) { 
        return key.slice(0,2) == '20';
    });
    var dateFormatted = [];
    
    dateKeys.forEach(function(k,v) {
        var year = k.slice(0,4);
        var quarter = k.slice(5,6);
        var month = ((quarter-1) * 3) + 1;
        var date = d3.time.format('%Y-%m-%d').parse(year + '-' + month + '-01');
        dateFormatted.push(date);
    });
    
    state.forEach(function(d) {
        var state = d['State'];
        var type = 'state';
        var values = [];
        
        if (state == 'US') {
            type = 'us';
        }
        
        dateKeys.forEach(function(k, i) {
            var amt = d[k];
            if (amt == undefined || amt == null || amt.length == 0) {
                amt = null;
            } else {
                if (state == 'US') {
                    amt = +amt;
                } else {
                    amt = +amt * 100;
                }
            }
            
            values.push({
                'date': dateFormatted[i],
                'amt': amt,
                'key': state // needed for voronoi
            });
        });
        
        stateData[state] = {
            'key': state,
            'ap': d['StateAP'],
            'full': d['StateProper'],
            'type': type,
            'value': values
        };
        
        stateDataNum.push({
            'key': state,
            'ap': d['StateAP'],
            'full': d['StateProper'],
            'type': type,
            'value': values
        });
    });
    
    home.forEach(function(d,i) {
        var id = d['Provnum'];
        var values = [];
        var info = {
            'address': d['ADDRESS'],
            'city': d['CITY'],
            'state': d['STATE'],
            'zip': d['ZIP'],
            'id': d['Provnum'],
            'name': d['PROVNAME'],
            'beds': d['Certified Beds'],
            'residents': d['Number of Residents']
        };
        
        var s = {
            'id': id,
            'search': d['PROVNAME'] + ' (' + d['CITY'] + ', ' + stateData[d['STATE']]['ap'] + ')',
            'search_all': d['PROVNAME'] + ' ' + d['CITY'] + ', ' + d['STATE'] + ' ' + stateData[d['STATE']]['ap'] + ' ' + stateData[d['STATE']]['full'] + ' ' + d['ZIP']
        };
        
        dateKeys.forEach(function(k, i) {
            var amt = d[k];
            if (amt == undefined || amt == null || amt.length == 0) {
                amt = null;
            } else {
                amt = +amt;
            }
            
            values.push({
                'date': dateFormatted[i],
                'amt': amt
            });
        });
        
        homeData[id] = {
            'key': id,
            'type': 'home',
            'value': values,
            'info': info
        };
        
        searchData.push(s);
    });
    
    // init typeahead
    $('.typeahead').typeahead({
        hint: false,
        highlight: true,
        minLength: 2
    },
    {
        name: 'searchData',
        displayKey: 'search',
        source: substringMatcher(searchData),
        templates: {
            empty: typeahead_empty,
            suggestion: typeahead_suggestion
        }
    });
    
    $('.typeahead').on('typeahead:selected', on_typeahead_selected);
    
    // init responsive iframe
    pymChild = new pym.Child({
        renderCallback: render
    });
}


/*
 * Render the graphic
 */
var render = function(containerWidth) {
    // fallback if page is loaded outside of an iframe
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }
    
    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        infoWidth = containerWidth - GRAPHIC_OUTER_PADDING;
        graphicWidth = containerWidth - GRAPHIC_OUTER_PADDING;
        graphicWidthNational = containerWidth - GRAPHIC_OUTER_PADDING;
    } else {
        isMobile = false;
        infoWidth = Math.floor((containerWidth - GUTTER_WIDTH - GRAPHIC_OUTER_PADDING) / 3);
        graphicWidth = infoWidth * 2;
        graphicWidthNational = containerWidth - GRAPHIC_OUTER_PADDING;
    }
    
    // draw chart and related info
    if (currentHome == null) {
        showNationalChart();
    } else {
        showHomeInfoChart();
    }
}


/*
 * RENDER STATE / NATIONAL CHART
 */
var showNationalChart = function() {
    graphicD3.attr('class', 'national');
    $graphic.empty();
    drawLineGraph(stateDataNum, graphicWidthNational);
}


/*
 * RENDER HOME INFO AND CHART
 */
var showHomeInfoChart = function() {
    graphicD3.attr('class', null);

    // sort out data for this chart
    var graphicData = [];
    graphicData.push(stateData['US']);
    graphicData.push(stateData[homeData[currentHome]['info']['state']]);
    graphicData.push(homeData[currentHome]);

    // clear out existing graphics
    $graphic.empty();

    // draw the new graphic
    showHomeInfo(graphicData);
    drawLineGraph(graphicData, graphicWidth);
}


/*
 * SHOW HOME INFO
 */
var showHomeInfo = function(graphicData) {
    var thisHomeData = graphicData[2];

    // show facility name
    graphicD3.append('h3')
        .text(thisHomeData['info']['name']);
        
    // make the info containing div
    var info = graphicD3.append('div')
        .attr('class', 'info')
        .attr('style', function() {
            var s = '';
            if (!isMobile) {
                s += 'width: ' + infoWidth + 'px; ';
                s += 'margin-right: ' + GUTTER_WIDTH + 'px; ';
                s += 'float: left; ';
            }
            return s;
        });
    
    // show the info
    var address = info.append('div')
        .attr('class', 'address');

    address.append('h5')
        .text(HED_ADDRESS);

    address.append('p')
        .html(
            thisHomeData['info']['address'] + '<br />' +
            thisHomeData['info']['city'] + ', ' + thisHomeData['info']['state'] + ' ' + thisHomeData['info']['zip']
        );
    
    var about = info.append('div')
        .attr('class', 'about');

    about.append('h5')
        .text(HED_ABOUT);
    
    var stats = about.append('ul')
    stats.append('li')
        .text('Certified beds: ' + thisHomeData['info']['beds']);
    stats.append('li')
        .text('Number of residents: ' + thisHomeData['info']['residents']);
    
    var urlId = currentHome;
    if (urlId.length < 6) {
        urlId = '0' + urlId;
    }
        
    about.append('p')
        .html('<a href="' + MEDICARE_PATH + urlId + '" target="_blank">' + HED_MEDICARE + '&nbsp;&rsaquo;</a>');
}


/*
 * DRAW THE LINE GRAPH
 */
var drawLineGraph = function(graphicData, w) {
    var aspectHeight = 3;
    var aspectWidth = 4;
    var ticksY = 4;
    
    // define chart dimensions
    var width = w - margin['left'] - margin['right'];
    var height = Math.ceil((width * aspectHeight) / aspectWidth);
    
    x = d3.time.scale()
        .range([0, width])
        .domain(d3.extent(graphicData[0]['value'], function(d) { 
            return d['date'];
        }));

    y = d3.scale.linear()
        .range([ height, 0 ])
        .domain([ 0, d3.max(graphicData, function(c) { 
                return d3.max(c['value'], function(v) { 
                    var n = v['amt'];
                    return Math.ceil(n/10) * 10; // round to next 10
                }); 
            })
        ]);

    // define axis and grid
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickValues([ d3.time.format('%Y-%m-%d').parse('2011-04-01'),
                      d3.time.format('%Y-%m-%d').parse('2012-01-01'),
                      d3.time.format('%Y-%m-%d').parse('2013-01-01'),
                      d3.time.format('%Y-%m-%d').parse('2014-01-01') ])
        .tickFormat(function(d,i) {
            if (isMobile) {
                return '\u2019' + fmtYearAbbrev(d);
            } else {
                return fmtYearFull(d);
            }
        });

    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(ticksY)
        .tickFormat(function(d) {
            return d + '%';
        });

    var yAxisGrid = function() {
        return yAxis;
    }

    var voronoi = d3.geom.voronoi()
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        })
        .clipExtent([ [0,0], [width,height] ]);

    // define the line(s)
    var line = d3.svg.line()
        .defined(function(d) { 
            return d['amt'] != null;
        })
        .interpolate('monotone')
        .x(function(d) { 
            return x(d['date']);
        })
        .y(function(d) { 
            return y(d['amt']);
        });

    // assign a color to each line
    colorD3.domain([ 'us', 'state', 'home' ]);
    
    // wrapper div
    var wrapper = graphicD3.append('div')
        .attr('class', 'chart-wrapper')
        .attr('style', function() {
            var s = '';
            s += 'width: ' + w + 'px; ';
            if (!isMobile) {
                s += 'float: right; ';
            }
            return s;
        });
    
    // add a title
    var title = wrapper.append('h4')
        .html(HED_GRAPH + '<span>' + HED_GRAPH_DESC + '</span>');

    if (currentHome == null) {
        title.html(HED_GRAPH + ', by state<span>' + HED_GRAPH_DESC + '</span>');
    }
        
    // containing div
    var chart = wrapper.append('div')
        .attr('class', 'chart');
    
    // show values
    showLatestValues(graphicData);
    
    // draw the chart
    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');
            
    // x-axis (bottom)
    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    // y-axis (left)
    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);
    
    // x-axis gridlines
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxisGrid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );
    
    // y-axis gridlines
    svg.append('g')         
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );
    
    // draw the line(s)
    var lines = svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(graphicData)
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line line-' + i + ' l-' + classify(d['key']);
            })
            .attr('stroke', function(d, i) {
                return colorD3(d['type']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });
    
    // data point dots
    var dataPoints = svg.append('g')
        .attr('class', 'dots');
    var dataPointsByType = dataPoints.selectAll('g')
        .data(graphicData)
        .enter().append('g')
            .attr('class', function(d) {
                return d['type'] + ' d-' + classify(d['key']);
            })
            .attr('style', function(d) {
                return 'fill: ' + colorD3(d['type'] + ';');
            });

    var dataPointsDots = dataPointsByType.selectAll('circle')
        .data(function(d) {
            return d['value'].filter(function(v) {
                return v['amt'] != null;
            });
        })
        .enter()
            .append('circle')
            .attr('cx', function(d, i) {
                return x(d['date']);
            })
            .attr('cy', function(d, i) { 
                return y(d['amt']);
            })
            .attr('r', 1.5);
    
    var dataPointsLast = dataPointsDots.filter('circle:last-child')
        .attr('class', 'last')
        .attr('r', 3.5);
    
    // show small values on national chart
    if (currentHome == null) {
        svg.append('g')
            .attr('class', 'vals')
            .selectAll('text')
                .data(graphicData)
            .enter().append('text')
                .attr('class', function(d) {
                    return 'v-' + classify(d['key']);
                })
                .attr('x', function(d) {
                    return x(getLastUpdated('date', d)) + 6;
                })
                .attr('y', function(d) {
                    return y(getLastUpdated('value', d));
                })
                .attr('dy', 4)
                .html(function(d) {
                    return smallTooltipText(d);
                });

    }
    
    // voronoi for mouseovers on the national map
    if (!isMobile && currentHome == null) {
        var voronoiGroup = svg.append('g')
            .attr('class', 'voronoi')
            .selectAll('path')
                .data(voronoi(d3.nest()
                    .key(function(d) {
                        return x(d['date']) + ',' + y(d['amt']);
                    })
                    .rollup(function(v) {
                        return v[0];
                    })
                    .entries(d3.merge(graphicData.map(function(d) {
                        return d['value'];
                    })))
                    .map(function(d) { 
                        return d['values'];
                    })
                ))
                .enter().append('path')
                    .attr('d', function(d) { return 'M' + d.join('L') + 'Z'; })
                    .datum(function(d) { 
                        return d['point'];
                    })
                    .on('mouseover', onLineMouseover)
                    .on('mouseout', onLineMouseout);
    }

    // move US line to the front
    if (currentHome == null) {
        d3.select('path.l-us').moveToFront();
        d3.select('circle.d-us').moveToFront();
    }

    // update iframe
    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

/*
 * MOUSEOVER LINES
 */
var onLineMouseover = function(d,i) {
    d3.select('.l-' + classify(d['key'])).classed('active', true).moveToFront();
    d3.select('.d-' + classify(d['key'])).classed('active', true).moveToFront();
    d3.select('.v-' + classify(d['key'])).classed('active', true).moveToFront();
    d3.select('div.values').classed('inactive', true);
}
var onLineMouseout = function(d,i) {
    d3.select('.l-' + classify(d['key'])).classed('active', false);
    d3.select('.d-' + classify(d['key'])).classed('active', false);
    d3.select('.v-' + classify(d['key'])).classed('active', false);
    d3.select('div.values').classed('inactive', false);
}


/*
 * SHOW LATEST VALUES
 */
var showLatestValues = function(graphicData) {
    var thisData = [];
    
    if (currentHome == null) {
        var lastUpdated = getLastUpdated('date', stateData['US']);
        var lastValue = getLastUpdated('value', stateData['US']);

        thisData.push( { 'type': stateData['US']['type'],
                         'value': lastValue,
                         'text': '<strong style="color:' + colors['teal2'] + ';">' + lastValue.toFixed(1) + '%</strong>U.S. average' +
                                 '<i>(' + convertQuarter(fmtMonth(lastUpdated)) + ' ' + fmtYearFull(lastUpdated) + ')</i>'
                       });
    } else {
        for (var i = 0; i < graphicData.length; i++) {
            var lastUpdated = getLastUpdated('date', graphicData[i]);
            var lastValue = getLastUpdated('value', graphicData[i]);
            var name = null;
            var text = null;
            var type = graphicData[i]['type'];
        
            if (graphicData[i]['key'] == 'US') {
                name = 'U.S. average';
            } else if (graphicData[i]['ap'] != undefined) {
                name = graphicData[i]['ap'] + ' average';
            } else {
                name = 'This facility';
            }
        
            if (lastValue == null) {
                text = name + '<br /><i>Data not available.</i>';
            } else {
                lastUpdated = getLastUpdated('date', graphicData[i]);
                lastValue = getLastUpdated('value', graphicData[i]);

                text = '<strong style="color:' + colorD3(type) + ';">' + lastValue.toFixed(1) + '%</strong>' +
                       name +
                       '<i>(' + convertQuarter(fmtMonth(lastUpdated)) + ' ' + fmtYearFull(lastUpdated) + ')</i>';
            }
        
            thisData.push({ 'type': type,
                            'value': lastValue,
                            'text': text });
        }
        thisData.sort(sortValues);
    }
    
    var values = graphicD3.select('.chart').append('div')
        .attr('class', 'values')
        .attr('style', function(d) {
            var s = '';
            s += 'width: ' + VALUE_WIDTH + 'px;'
            if (currentHome == null) {
                var lastValue = getLastUpdated('value', stateData['US']);

                s += 'position: absolute; ';
                s += 'top: ' + (margin['top'] + y(lastValue) - 15) + 'px; ';
                s += 'right: 0; ';
            }
            return s;
        })
        .append('ul');
        
    for (var i = 0; i < thisData.length; i++) {
        values.append('li')
            .attr('class', thisData[i]['type'])
            .html(thisData[i]['text']);
    }
}


/*
 * Typeahead search
 */
function substringMatcher(strs) {
    return function findMatches(q, cb) {
        q = q.toUpperCase();
        
        // an array that will be populated with substring matches
        var matches = [];

        // regex used to determine if a string contains the substring `q`
        var substrRegex = new RegExp(q, 'i');
        
        // iterate through the pool of strings and for any string that
        // contains the substring `q`, add it to the `matches` array
        $.each(strs, function(i, str) {
            if (substrRegex.test(str['search_all'])) {
                // the typeahead jQuery plugin expects suggestions to a
                // JavaScript object, refer to typeahead docs for more info
                matches.push({ value: str });
            }
        });
        
        matches.sort(sortSearchNames);
        cb(matches);
    };
}

function typeahead_suggestion(obj) {
    return '<p>' + obj['value']['search'] + '</p>';
}

function typeahead_empty(obj) {
    return '<p>No matching facilities found.</p>';
}

function on_typeahead_selected(event, selection) {
    currentHome = selection['value']['id'];
    showHomeInfoChart();
}



/*
 * Helper functions
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}

var convertQuarter = function(month) {
    switch(month) {
        case '01':
            return 'Q1';
            break;
        case '04':
            return 'Q2';
            break;
        case '07':
            return 'Q3';
            break;
        case '10':
            return 'Q4';
            break;
    }
}

var sortValues = function(a,b) {
    if (a['value'] > b['value']) {
        return -1;
    }
    if (a['value'] < b['value']) {
        return 1;
    }
    return 0;
}
// http://stackoverflow.com/questions/1129216/sorting-objects-in-an-array-by-a-field-value-in-javascript

var sortSearchNames = function(a,b) {
    if (a['value']['search'] < b['value']['search']) {
        return -1;
    }
    if (a['value']['search'] > b['value']['search']) {
        return 1;
    }
    return 0;
}

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

var getLastUpdated = function(type,d) {
    var vals = d['value'].filter(function(v,i) {
        return v['amt'] != null;
    });
    
    var length = vals.length;
    var lastUpdated = null;
    var lastValue = null;

    if (length > 0) {
        lastUpdated = vals[(length - 1)]['date'];
        lastValue = vals[(length - 1)]['amt'];
    }
    
    switch(type) {
        case 'value':
            return lastValue;
            break;
        case 'date':
            return lastUpdated;
            break;
    }
}

var smallTooltipText = function(d) {
    var lastUpdated = getLastUpdated('date', d);
    var lastValue = getLastUpdated('value', d);
    var t = d['ap'] + ': ' + lastValue.toFixed(1) + '%';
    return t;
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
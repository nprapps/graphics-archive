// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var STATE_NAMES_URL = 'state-names.csv';
var DATA_URL = 'https://apps.npr.org/dailygraphics/graphics/lookup-clearance-rates/json/agency_names.csv';
var AGENCY_DATA_PATH = 'https://apps.npr.org/dailygraphics/graphics/lookup-clearance-rates/json/';
// var DATA_URL = 'output/agency_names.csv';
// var AGENCY_DATA_PATH = 'output/';
/*
Agency datafiles are generated with this:
https://github.com/nprapps/ucr-clearance-parser/
and published separately.
*/

var agencyData = [];
var crimeNames = [];
var searchData = [];
var stateNames = [];
var dataCategories = [ 'count', 'cleared', 'pct', 'median' ];
var legendLabels = [{ 'key': 'count', 'value': 'This agency' },
                    { 'key': 'median', 'value': 'Median for municipal police serving similarly-sized populations' }];
var yearLabels = [ '2011', '2012', '2013' ];

var BAR_GAP = 2;
var BAR_HEIGHT = 24;
var MEDIAN_BAR_HEIGHT = 12;
var VALUE_MIN_WIDTH = 45;
var YEAR_LABEL_WIDTH = 30;
var MOBILE_THRESHOLD = 480;

var currentAgency = null;
// var currentAgency = 'SC04301';
// var currentAgency = 'MA01301';
// var currentAgency = 'AL02308';
// var currentAgency = 'OH01102';
// var currentAgency = 'COCSP00';

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var colorD3 = null;

var allCrimeValues = [];
var barChartWidth = null;
var maxCrimeValue = null;
var hasMedians = false;
var isMobile = false;


// D3 formatters
var fmtComma = d3.format(',');
var fmtMonth = d3.time.format('%m');
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * Initialize
 */
var onWindowLoaded = function() {
    $graphic = $('#graphic');
    graphicD3 = d3.select('#graphic');
    
    colorD3 = d3.scale.ordinal()
        .range([ colors['blue2'], colors['blue2'], colors['blue4'], '#ebebeb' ])
        .domain(dataCategories);
    
    // load the data
    queue() // load multiple files and wait until they're all loaded to act
        .defer(d3.csv, DATA_URL)
        .defer(d3.csv, STATE_NAMES_URL)
        .await(onDataLoaded);
}


/*
 * Process the data
 */
var onDataLoaded = function(error, data, states) {
    if (!error) {
        states.forEach(function(d) {
            stateNames[d['state_postal']] = { 'statePostal': d['state_postal'],
                                              'stateFull': d['state_full'],
                                              'stateAP': d['state_ap'] };
        });
    
        data.forEach(function(d,i) {
            var id = d['ori7'];
            var agency = d['agency'];
            var state = d['state'];
            var agency_type = d['agentype'];
            if (agency_type == 'Primary state LE') {
                agency_type = 'Primary state law enforcement';
            }
            if (agency_type.toLowerCase() == 'na') {
                agency_type = null;
            }
        
            // add to agency data array
            agencyData[id] = { 'id': id, 
                               'agency': agency, 
                               'state': state,
                               'agency_type': agency_type };
        
            // make searchable
            var lookupText = agency;
            lookupText += ', ' + stateNames[state]['stateAP'];
            if (agency_type) {
                lookupText += ' (' + agency_type + ')';
            }
        
            var s = {
                'id': id,
                'search': lookupText,
                'search_all': agency + ', ' + stateNames[state]['stateAP'] + ' ' + stateNames[state]['statePostal'] + ' ' + stateNames[state]['stateFull'] + ' ' + id
            };
            searchData.push(s);
        });
    
        CRIME_DEFS.filter(function(d) {
            return d['include'] == 'true';
        }).forEach(function(d) {
            crimeNames[d['crime_abbr']] = d['crime_name'];
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
    
        $('.examples').find('a').on('click', on_agency_click);
    
        // zap the preload image
        $graphic.empty();
        $('#search').show();
    }
    
    // init responsive iframe
    pymChild = new pym.Child({
        renderCallback: render
    });
}


/*
 * Render the graphic
 */
var render = function(containerWidth) {
    // check the container width; set mobile flag if applicable
    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // calculate bar chart widths depending on iframe width
    if (isMobile) {
        barChartWidth = Math.floor((containerWidth - (20 * yearLabels.length) - YEAR_LABEL_WIDTH) / yearLabels.length);
    } else {
        barChartWidth = Math.floor((containerWidth - (20 * (yearLabels.length + 1)) - YEAR_LABEL_WIDTH) / (yearLabels.length + 1));
    }

    // draw chart and related info
    if (currentAgency != null) {
        showAgencyInfo();
    }
}


/*
 * SHOW AGENCY INFO AND CHARTS
 */
var showAgencyInfo = function() {
//     console.log('loading data for agency ' + currentAgency);

    // load data for this agency
    d3.json(AGENCY_DATA_PATH + currentAgency + '.json?t=20150330', function(error, data) {
        // clear out existing graphics
        $graphic.empty();
        
        // check if this agency has median values for comparison
//         if (data['medians'] == undefined) {
//             hasMedians = false;
//         } else {
//             hasMedians = true;
//         }
//        console.log('medians', data['medians']);
        
        // identify the max chart value
        // and while we're at it, rename the "cleared_pct" columns
        allCrimeValues = [];
        d3.entries(data['crimes']).forEach(function(d) {
            allCrimeValues.push(d['value']['2011']['count']);
            allCrimeValues.push(d['value']['2011']['cleared']);
            allCrimeValues.push(d['value']['2012']['count']);
            allCrimeValues.push(d['value']['2012']['cleared']);
            allCrimeValues.push(d['value']['2013']['count']);
            allCrimeValues.push(d['value']['2013']['cleared']);
            
            d['value']['2011']['pct'] = d['value']['2011']['cleared_pct'];
            d['value']['2012']['pct'] = d['value']['2012']['cleared_pct'];
            d['value']['2013']['pct'] = d['value']['2013']['cleared_pct'];
            delete d['value']['2011']['cleared_pct'];
            delete d['value']['2012']['cleared_pct'];
            delete d['value']['2013']['cleared_pct'];
        });
        // factor in the median values, if they exist
        if (hasMedians) {
            d3.entries(data['medians']).forEach(function(d) {
                if (d['value']['2011']) {
                    allCrimeValues.push(d['value']['2011']['count']);
                    allCrimeValues.push(d['value']['2011']['cleared']);

                    d['value']['2011']['pct'] = d['value']['2011']['cleared_pct'];
                    delete d['value']['2011']['cleared_pct'];
                }

                if (d['value']['2012']) {
                    allCrimeValues.push(d['value']['2012']['count']);
                    allCrimeValues.push(d['value']['2012']['cleared']);

                    d['value']['2012']['pct'] = d['value']['2012']['cleared_pct'];
                    delete d['value']['2012']['cleared_pct'];
                }

                if (d['value']['2013']) {
                    allCrimeValues.push(d['value']['2013']['count']);
                    allCrimeValues.push(d['value']['2013']['cleared']);

                    d['value']['2013']['pct'] = d['value']['2013']['cleared_pct'];
                    delete d['value']['2013']['cleared_pct'];
                }
            });
        }
        maxCrimeValue = d3.max(allCrimeValues);


        // show data for this agency
        var agencyName = data['agency'] + ', ' + stateNames[agencyData[currentAgency]['state']]['stateAP'];
        var agencyType = data['agency_type'];
        if (agencyType == 'Primary state LE') {
            agencyType = 'Primary state law enforcement';
        }
        
        if (data['agency_type'] != 'NA' && data['agency_type'] != null) {
            agencyName += ' (' + capitalizeWords(agencyType) + ')';
        }

        graphicD3.append('h3')
            .text(agencyName);
        
        var agencyInfo = graphicD3.append('div')
            .attr('class', 'agency-info');
        
        if (data['population'] != undefined) {
            agencyInfo.append('p')
                .text('Estimated population (2013): ' + fmtComma(data['population']));
        }

        if (data['population_bucket'] != undefined) {
            agencyInfo.append('p')
                .text('Population grouping: ' + data['population_bucket'] + ' people');
        }
        
        // check if this agency has valid data
        var hasValidData = true;
        var yearsInvalid = 0;
        yearLabels.forEach(function(year) {
            if (data['crimes']['violent'][year]['mos'] < 12) {
                yearsInvalid++;
            }
        });
        if (yearsInvalid == yearLabels.length) {
            hasValidData = false;
        }
        
        // if no valid data, show only a warning message
        if (!hasValidData) {
            agencyInfo.append('p')
                .attr('class', 'no-data')
                .text(MSG_NO_DATA);
        // if partial or complete data, show what we have
        } else {
            if (yearsInvalid > 0) {
                agencyInfo.append('p')
                    .attr('class', 'no-data')
                    .text(MSG_INCOMPLETE_DATA);
            }

            if (data['data_warning']) {
                agencyInfo.append('p')
                    .attr('class', 'dodgy-data')
                    .text(MSG_DODGY_DATA);
            }

            // draw a key if medians are available
            if (hasMedians) {
                var legend = graphicD3.append('ul')
                    .attr('class', 'key')
                    .selectAll('g')
                        .data(legendLabels)
                    .enter().append('li')
                        .attr('class', function(d, i) {
                            return 'key-item key-' + i + ' ' + classify(d['key']);
                        });
                legend.append('b')
                    .style('background-color', function(d,i) {
                        return colorD3(d['key']);
                    });
                legend.append('label')
                    .text(function(d) {
                        return d['value'];
                    });
            }
        
            var crimeData = graphicD3.append('div')
                .attr('class', 'crime-data')
                .append('table');
        
            var headerRow = crimeData.append('tr')
            if (!isMobile) {
                headerRow.append('th')
                    .text('');
            }
            headerRow.append('th')
                .attr('style', function(d) {
                    if (isMobile) {
                        // no special styling
                    } else {
                        return 'padding-left: ' + (10 + YEAR_LABEL_WIDTH) + 'px;';
                    }
                })
                .text('New crimes');
            headerRow.append('th')
                .text('Cleared');
            headerRow.append('th')
                .text('Clearance rate*');

            // draw rows of per-crime data
            var crimeNamesEntries = d3.entries(crimeNames);
            crimeNamesEntries.forEach(function(d) {
                var thisCrimeName = d['key'];
                if (isMobile) {
                    crimeData.append('tr')
                        .attr('class', 'crime-header ' + classify(thisCrimeName));
                }
                crimeData.append('tr')
                    .attr('class', 'crime-type ' + classify(thisCrimeName));
            });
            var crimeDataRows = crimeData.selectAll('.crime-type')
                .data(crimeNamesEntries);
            
            // crime name
            if (isMobile) {
                crimeData.selectAll('.crime-header')
                    .data(crimeNamesEntries)
                    .append('td')
                        .attr('colspan', 3)
                        .text(function(d) {
                            return d['value'];
                        });
            } else {
                crimeDataRows.append('td')
                    .attr('style', 'width: ' + barChartWidth + 'px;')
                    .text(function(d) { 
                       return d['value'];
                    });
            }
        
            // crime count
            crimeDataRows.append('td')
                .attr('style', 'width: ' + barChartWidth + 'px;')
                .attr('id', function(d) {
                    return d['key'] + '-count';
                });

            // crime cleared
            crimeDataRows.append('td')
                .attr('style', 'width: ' + barChartWidth + 'px;')
                .attr('id', function(d) {
                    return d['key'] + '-cleared';
                });

            // crime clearance rate
            crimeDataRows.append('td')
                .attr('style', 'width: ' + barChartWidth + 'px;')
                .attr('id', function(d) {
                    return d['key'] + '-pct';
                });
        
            // append charts
            d3.entries(data['crimes']).forEach(function(d) {
                var crimeType = d['key'];
                var c = d['value'];
            
                dataCategories.filter(function(d) {
                    return d != 'median';
                }).forEach(function(category) {
                    var vals = [ c['2011'][category], 
                                 c['2012'][category], 
                                 c['2013'][category] ];
                    var medians = [];
                    if (hasMedians) { 
                        var m = data['medians'][crimeType];
                    
                        var m11 = null;
                        if (m['2011'] != undefined) {
                            m11 = m['2011'][category];
                        }

                        var m12 = null;
                        if (m['2012'] != undefined) {
                            m12 = m['2012'][category];
                        }

                        var m13 = null;
                        if (m['2013'] != undefined) {
                            m13 = m['2013'][category];
                        }
                    
                        medians = [ m11, m12, m13 ];
                    }
                    var chartWidth = barChartWidth;
                    if (category == 'count') {
                        chartWidth += YEAR_LABEL_WIDTH;
                    }
                
                    if (vals[0] == null && vals[1] == null && vals[2] == null) {
                        d3.select('#' + crimeType + '-' + category).append('p')
                            .text(MSG_INCOMPLETE_DATA);
                    } else {
                        drawBarChart(crimeType, category, chartWidth, vals, medians);
                    }
                });
            });
        }

        // update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    });
}

/*
 * Bar charts
 */
var drawBarChart = function(crime, id, graphicWidth, graphicData, medianData) {
    var graph = d3.select('#' + crime + '-' + id);
    var margin = {
        top: 0,
        right: 5,
        bottom: 0,
        left: 0
    };
    if (id == 'count') {
        margin['left'] = YEAR_LABEL_WIDTH;
    }
    var numBars = graphicData.length;
    var ticksX = 4;

    // define chart dimensions
    var width = graphicWidth - margin['left'] - margin['right'];
    var height = ((BAR_HEIGHT + BAR_GAP) * numBars);

    var x = d3.scale.linear()
        .range([0, width]);

    if (id == 'pct') {
        x.domain([ 0, 1 ]);
    } else {
        x.domain([ 0, maxCrimeValue ])
    }

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    // draw the chart
    var svg = graph.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    // draw the median bars
    if (hasMedians) {
        svg.append('g')
            .attr('class', 'bars medians')
            .selectAll('rect')
                .data(medianData)
            .enter().append('rect')
                .attr('y', function(d, i) {
                    return i * (BAR_HEIGHT + BAR_GAP);
                })
                .attr('width', function(d){
                    return x(d);
                })
                .attr('height', BAR_HEIGHT)
                .attr('class', function(d, i) {
                    return 'bar-' + i;
                })
                .attr('fill', colorD3('median'));
    }
    
    // if this is the "count" column, show the years
    if (id == 'count') {
        svg.append('g')
            .attr('class', 'axis y')
            .selectAll('text')
                .data(yearLabels)
            .enter().append('text')
                .attr('x', 0)
                .attr('y', function(d, i) {
                    return i * (BAR_HEIGHT + BAR_GAP);
                })
                .attr('dx', -6)
                .attr('dy', (BAR_HEIGHT / 2) + 3)
                .attr('text-anchor', 'end')
                .text(function(d) {
                    return d;
                });
        
    }


    // draw the bars
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphicData)
        .enter().append('rect')
            .attr('y', function(d, i) {
                var yPos = i * (BAR_HEIGHT + BAR_GAP);
                if (hasMedians) {
                    yPos += Math.floor((BAR_HEIGHT - MEDIAN_BAR_HEIGHT) / 2);
                }
                return yPos;
            })
            .attr('width', function(d){
                return 0;
            })
            .attr('height', function(d) {
                if (hasMedians) {
                    return MEDIAN_BAR_HEIGHT;
                } else {
                    return BAR_HEIGHT;
                }
            })
            .attr('class', function(d, i) {
                return 'bar-' + i;
            })
            .attr('fill', colorD3(id))
            .transition()
                .attr('width', function(d){
                    return x(d);
                });

    // show the values for each bar
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(graphicData)
        .enter().append('text')
            .attr('x', function(d) {
                if (id == 'pct' && d > 1) {
                    return x(1);
                } else {
                    return x(d);
                }
            })
            .attr('y', function(d, i) {
                return i * (BAR_HEIGHT + BAR_GAP);
            })
            .attr('dx', function(d) {
                if (x(d) > VALUE_MIN_WIDTH) {
                    return -6;
                } else {
                    return 6;
                }
            })
            .attr('dy', (BAR_HEIGHT / 2) + 3)
            .attr('text-anchor', function(d) {
                if (x(d) > VALUE_MIN_WIDTH) {
                    return 'end';
                } else {
                    return 'begin';
                }
            })
            .attr('class', function(d) {
                if (x(d) > VALUE_MIN_WIDTH) {
                    return 'in';
                } else {
                    return 'out';
                }
            })
            .text(function(d) {
                if (d == null) {
                    return 'n/a';
                } else {
                    if (id == 'pct') {
                        return Math.round(d * 100).toFixed(0) + '%';
                    } else {
                        return fmtComma(d);
                    }
                }
            });
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
    return '<p>No matching agencies found.</p>';
}

function on_typeahead_selected(event, selection) {
    currentAgency = selection['value']['id'];
    showAgencyInfo();
}

var sortSearchNames = function(a,b) {
    if (a['value']['search'] < b['value']['search']) {
        return -1;
    }
    if (a['value']['search'] > b['value']['search']) {
        return 1;
    }
    return 0;
}
// http://stackoverflow.com/questions/1129216/sorting-objects-in-an-array-by-a-field-value-in-javascript

function on_agency_click(e) {
    currentAgency = e.target.attributes.data.value;
    showAgencyInfo();
}


/*
 * Helper functions
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}

var capitalizeWords = function(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1);
    });
}
// http://alvinalexander.com/javascript/how-to-capitalize-each-word-javascript-string


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);
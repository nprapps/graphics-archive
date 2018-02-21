// global vars
var $graphic = null;
var graphicD3 = null;
var pymChild = null;

var DATA_URL = 'data.csv';
var STATE_DATA_URL = 'state-names.csv';

var countyData = [];
var searchData = [];
var stateData = [];
var stateNames = [];

var currentCounty = null;
//var currentCounty = '55141';
//var currentCounty = '51510';

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
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
            .defer(d3.csv, DATA_URL)
            .defer(d3.csv, STATE_DATA_URL)
            .await(onDataLoaded);
    } else {
        pymChild = new pym.Child({ });
    }
}


/*
 * Process the data
 */
var onDataLoaded = function(error, data, states) {
    states.forEach(function(d) {
        stateNames[d['state_postal']] = { 'statePostal': d['state_postal'],
                                          'stateFull': d['state_full'],
                                          'stateAP': d['state_ap'] };
    });
    
    data.forEach(function(d) {
        var level = d['SUMLEV'];
        var state = d['STATE'];
        var name = d['GeoName'];
        
        var adjExpPerVeteran;
        var medPerVet;
        var pctVet;
        var pRatio;
        var vetPop;
        
        if (d['AdjExpPerVeteran'].length > 0) {
            adjExpPerVeteran = (+d['AdjExpPerVeteran'] * 1000).toFixed(0);
        } else {
            adjExpPerVeteran = null;
        }

        if (d['MedPerVet'].length > 0) {
            medPerVet = (+d['MedPerVet'] * 1000).toFixed(0);
        } else {
            medPerVet = null;
        }

        if (d['PctVet'].length > 0) {
            pctVet = (+d['PctVet'] * 100).toFixed(0);
        } else {
            pctVet = null;
        }

        if (d['PRatio'].length > 0) {
            pRatio = (+d['PRatio'] * 100).toFixed(0);
        } else {
            pRatio = null;
        }

        if (d['VetPop'].length > 0) {
            vetPop = +d['VetPop'];
        } else {
            vetPop = null;
        }
        
        
        if (level == 'County') {
        // parse county data
            var id = d['COUNTYFIPS'];
            var type = 'county';
            if (name.search('CITY') < 0 && state != 'AK' && state != 'LA') {
                name += ' COUNTY';
            }
            if ((name == 'CHARLES CITY' && state == 'VA') || (name == 'JAMES CITY' && state == 'VA')) {
                name += ' COUNTY';
            }
            if (state == 'LA') {
                name += ' PARISH';
            }
            if (name == 'DISTRICT OF COLUMBIA COUNTY') {
                name = 'WASHINGTON';
            }

            countyData[id] = {
                'state': state,
                'name': name,
                'type': type,
                'adjExpPerVeteran': adjExpPerVeteran,
                'medPerVet': medPerVet,
                'pctVet': pctVet,
                'pRatio': pRatio,
                'vetPop': vetPop
            }
            
//             if (id == '02188') {
//                 console.log(countyData['02188']);
//             }

            // make searchable
            var s = {
                'id': id,
                'search': name + ', ' + stateNames[state]['stateAP'].toUpperCase(),
                'search_all': name + ', ' + stateNames[state]['stateAP'] + ' ' + stateNames[state]['statePostal'] + ' ' + stateNames[state]['stateFull']
            };
            searchData.push(s);
    
        } else {
        // parse state/national data
            var id = state;
            var type = 'state';
        
            if (state == 'US') {
                type = 'us';
            }
            
            stateData[state] = {
                'state': state,
                'name': name,
                'type': type,
                'adjExpPerVeteran': adjExpPerVeteran,
                'medPerVet': medPerVet,
                'pctVet': pctVet,
                'pRatio': pRatio,
                'vetPop': vetPop
            }
        }
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
    
    $('.examples').find('a').on('click', on_county_click);
    
    // init responsive iframe
    pymChild = new pym.Child({
        renderCallback: render
    });
}


/*
 * Render the graphic
 */
var render = function(containerWidth) {
    // draw chart and related info
    if (currentCounty != null) {
        showCountyInfo();
    }
}


/*
 * RENDER HOME INFO AND CHART
 */
var showCountyInfo = function() {

    // sort out data for this chart
    var thisCounty = countyData[currentCounty]['name'];
    var thisState = countyData[currentCounty]['state'];
    var mapSearch = (thisCounty + ' ' + thisState).toLowerCase().replace(/ /g,'+');

    var graphicData = [];
    graphicData['us'] = stateData['US'];
    graphicData['state'] = stateData[countyData[currentCounty]['state']];
    graphicData['county'] = countyData[currentCounty];

    // clear out existing graphics
    $graphic.empty();

    // show county name
    graphicD3.append('h3')
        .html(graphicData['county']['name'] + ', ' + stateNames[thisState]['stateAP'] + ' <span class="map-link"><a href="https://www.google.com/maps/search/' + mapSearch + '/" target="_blank">(map)</a></span>');
        
    // show county data
    var dataTable = '<table>';
    dataTable += '<tr><th>&nbsp;</th>'
                 + '<th class="county">This county</th>'
                 + '<th>' + stateNames[thisState]['stateAP'] + '</th>'
                 + '<th>U.S.</th></tr>';
    dataTable += '<tr><td>' + HED_VETPOP + '</td>'
                 + '<td class="county">' + fmtComma(graphicData['county']['vetPop']) + '</td>'
                 + '<td>' + fmtComma(graphicData['state']['vetPop']) + '</td>'
                 + '<td>' + fmtComma(graphicData['us']['vetPop']) + '</td></tr>';
    dataTable += '<tr><td>' + HED_PCTVET + '</td>'
                 + '<td class="county">' + graphicData['county']['pctVet'] + '%</td>'
                 + '<td>' + graphicData['state']['pctVet'] + '%</td>'
                 + '<td>' + graphicData['us']['pctVet'] + '%</td></tr>';
    dataTable += '<tr><td>' + HED_ADJEXPPERVETERAN + '</td>'
                 + '<td class="county">$' + fmtComma(graphicData['county']['adjExpPerVeteran']) + '</td>'
                 + '<td>$' + fmtComma(graphicData['state']['adjExpPerVeteran']) + '</td>'
                 + '<td>$' + fmtComma(graphicData['us']['adjExpPerVeteran']) + '</td></tr>';
    dataTable += '<tr><td>' + HED_PRATIO + '</td>'
                 + '<td class="county">';
    
    if (graphicData['county']['pRatio'] != null) {
        dataTable += graphicData['county']['pRatio'] + '%';
    } else {
        dataTable += 'n/a';
    }
    
    dataTable += '</td>'
                 + '<td>' + graphicData['state']['pRatio'] + '%</td>'
                 + '<td>' + graphicData['us']['pRatio'] + '%</td></tr>';
    dataTable += '<tr><td>' + HED_MEDPERVET + '</td>'
                 + '<td class="county">';

    if (graphicData['county']['pRatio'] != null) {
        dataTable += '$' + fmtComma(graphicData['county']['medPerVet']);
    } else {
        dataTable += 'n/a';
    }
    
    dataTable += '</td>'
                 + '<td>$' + fmtComma(graphicData['state']['medPerVet']) + '</td>'
                 + '<td>$' + fmtComma(graphicData['us']['medPerVet']) + '</td></tr>';
    dataTable += '</table>';
    
    $graphic.append(dataTable);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
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
    return '<p>No matching counties found.</p>';
}

function on_typeahead_selected(event, selection) {
    currentCounty = selection['value']['id'];
    showCountyInfo();
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

function on_county_click(e) {
    var matches = [];
    var county = e.target.attributes.data.value;
    var substrRegex = new RegExp('^' + county, 'i');
    
    $.each(searchData, function(i, county) {
        if (substrRegex.test(searchData[i]['search_all'])) {
            matches.push(searchData[i]['id']);
        }
    });
    
    currentCounty = matches[0];
    showCountyInfo();
}



/*
 * Helper functions
 */
var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

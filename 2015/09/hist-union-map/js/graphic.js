// global vars
var $graphic = null;
var graphicD3 = null;
var $pauseButton = null;
var $playButton = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'union-reshaped-final.csv';
var TOPO_DATA_URL = 'us-states.json';

var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 600;

var BASE_WIDTH = 960;
var BASE_HEIGHT = 600;
var BASE_SCALE = 1200;

var TOGGLE_WIDTH = 85;
var SLIDER_HEIGHT = 30;
var SLIDER_OFFSET = {
    top: 20,
    right: (TOGGLE_WIDTH + 30),
    bottom: 0,
    left: 20
};

var isAnimating = false;
var isLoaded = false;
var isMobile = false;
var animationTimer = null;
var slider = null;
var sliderBrush = null;
var sliderHandle = null;
var i = null;
var toggle = null;
var x = null;
var selectedYear = '1964';

var mapHeight = null;
var mapScale = null;
var svgHeight = null;
var svgWidth = null;


// DATA
var graphicData = null;
var topoData = null;

var dates = [];
for (var i = 1964; i <= 2014; i++) {
    if (i%2 == 0) {
        dates.push(i);
    }
}

var datesWide = [];
for (var i = 1964; i <= 2014; i++) {
    if (i%4 == 0) {
        datesWide.push(i);
    }
}

var datesMobile  = [
    // 1960,
    1970,
    1980,
    1990,
    2000,
    2010
];


var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var stateNames = {
    '1':  'Alabama',
    '5':  'Arkansas',
    '6':  'California',
    '9':  'Connecticut',
    '10': 'Delaware',
    '11': 'District of Columbia',
    '12': 'Florida',
    '13': 'Georgia',
    '17': 'Illinois',
    '18': 'Indiana',
    '19': 'Iowa',
    '21': 'Kentucky',
    '22': 'Louisiana',
    '23': 'Maine',
    '24': 'Maryland',
    '25': 'Massachusetts',
    '26': 'Michigan',
    '27': 'Minnesota',
    '28': 'Mississippi',
    '29': 'Missouri',
    '33': 'New Hampshire',
    '34': 'New Jersey',
    '35': 'New Mexico',
    '36': 'New York',
    '37': 'North Carolina',
    '39': 'Ohio',
    '41': 'Oregon',
    '42': 'Pennsylvania',
    '44': 'Rhode Island',
    '45': 'South Carolina',
    '47': 'Tennessee',
    '48': 'Texas',
    '49': 'Utah',
    '50': 'Vermont',
    '51': 'Virginia',
    '54': 'West Virginia',
    '55': 'Wisconsin',
    '4':  'Arizona',
    '8':  'Colorado',
    '20': 'Kansas',
    '31': 'Nebraska',
    '32': 'Nevada',
    '38': 'North Dakota',
    '40': 'Oklahoma',
    '46': 'South Dakota',
    '53': 'Washington',
    '16': 'Idaho',
    '30': 'Montana',
    '56': 'Wyoming',
    '2':  'Alaska',
    '15': 'Hawaii',
};

var stateID = [
    'Alabama',
    'Arkansas',
    'California',
    'Connecticut',
    'Delaware',
    'District of Columbia',
    'Florida',
    'Georgia',
    'Illinois',
    'Indiana',
    'Iowa',
    'Kentucky',
    'Louisiana',
    'Maine',
    'Maryland',
    'Massachusetts',
    'Michigan',
    'Minnesota',
    'Mississippi',
    'Missouri',
    'New Hampshire',
    'New Jersey',
    'New Mexico',
    'New York',
    'North Carolina',
    'Ohio',
    'Oregon',
    'Pennsylvania',
    'Rhode Island',
    'South Carolina',
    'Tennessee',
    'Texas',
    'Utah',
    'Vermont',
    'Virginia',
    'West Virginia',
    'Wisconsin',
    'Arizona',
    'Colorado',
    'Kansas',
    'Nebraska',
    'Nevada',
    'North Dakota',
    'Oklahoma',
    'South Dakota',
    'Washington',
    'Idaho',
    'Montana',
    'Wyoming',
    'Alaska',
    'Hawaii'
];


// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');


/*
 * INITIALIZE
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');
        graphicD3 = d3.select('#graphic');

        queue() // load all the data
            .defer(d3.csv, GRAPHIC_DATA_URL)
            .defer(d3.json, TOPO_DATA_URL)
            .await(onDataLoaded);

    } else {
        pymChild = new pym.Child({ });
    }
}

var onDataLoaded = function(error, data, topo) {
    graphicData = data;
    graphicData.forEach(function(d) {
        d['year'] = +d['year'];
        d['value'] = +d['value'];
    });
    topoData = topo['features'];

    pymChild = new pym.Child({
        renderCallback: render
    });
}


/*
 * RENDER THE GRAPHIC
 */
var render = function(containerWidth) {
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

    // for (var k = 0; k < jobsRaw.length; k++ ) {
    //     replaceLabel(jobsRaw[k])
    // }
    // draw the map and slider
    drawMap(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * DRAW THE MAP
 */
var drawMap = function(graphicWidth) {
    // reset things if this is a reload
    if (isLoaded) {
        pauseAnimation();
    }

    // clear out existing graphics
    $graphic.empty();

    // define or update map dimensions
    updateDimensions(graphicWidth);

    var jobID = d3.map();
    i = 0;

    var margin = {
        top: 0,
        right: 0,
        left: 0,
        bottom: 10
    }

    // create the SVG
    var svg = graphicD3.append('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('defs')
        .append('pattern')
            .attr('id', 'diagonalHatch')
            .attr('patternUnits', 'userSpaceOnUse')
            .attr('width', 4)
            .attr('height', 4)
        .append('path')
            .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
            .attr('stroke', '#ccc')
            .attr('stroke-width', 1);


    // Draw the map
    var mapProjection = d3.geo.albersUsa()
        .scale(mapScale)
        .translate([ svgWidth/2, mapHeight/2 ]);

    var mapPath = d3.geo.path()
        .projection(mapProjection);

    var map = svg.append('g')
        .attr('class','map')

    map.append('g')
        .attr('class', 'states')
        .selectAll('path')
        .data(topoData)
        .enter().append('path')
            .attr('class', function(d) {
                return 'state d' + d['id'];
            })
            .attr('d', mapPath)

    // var labelSize = (isMobile) ? "8px" : "10px";
    // var smallLabelSize = (isMobile) ? "6px" : "8px";
    svg.append('g')
        .attr('class', 'states-labels')
        .selectAll('.place-label')
        .data(topoData.filter(function(d,i) {
            return d['properties']['name'] != 'Puerto Rico';
        }))
        .enter().append('text')
            .attr('class', function(d) {
                return 'state-id d' + d['id'];
            })
            .attr('transform', function(d) {
                return 'translate(' + mapPath.centroid(d) + ')';
            })
            .attr('dy', '.35em')
            .attr('dx', '0em')
            .text(' ');

    // Set up the slider
    x = d3.scale.linear()
        .domain([ 1964, 2014 ])
        .range([0, svgWidth - SLIDER_OFFSET['left'] - SLIDER_OFFSET['right'] ])
        .clamp(true);

    var datesLabels = (isMobile) ? datesMobile : datesWide;

    slider = svg.append('g')
        .attr('class', 'x axis')
        .call(d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .tickValues(datesLabels)
            .tickFormat(function(d) {
                return d;
            })
            .tickSize(10)
            .tickPadding(5)
        )
        .attr('transform', 'translate(' + SLIDER_OFFSET['left'] + ',' + (mapHeight + SLIDER_OFFSET['top']) + ')');


    var sliderBar = svg.append('g')
        .attr('class', 'xbar')
        .append('line')
        .attr('transform', 'translate('+ SLIDER_OFFSET['left'] + ',' + (mapHeight + SLIDER_OFFSET['top']) + ')')
        .attr('x1', x(1964))
        .attr('x2', x(2014));

    var sliderBarHalo = svg.append('g')
        .attr('class', 'xbar-halo')
        .append('line')
        .attr('transform', 'translate(' + SLIDER_OFFSET['left'] + ',' + (mapHeight + SLIDER_OFFSET['top']) + ')')
        .attr('x1', x(1964))
        .attr('x2', x(2014));

    sliderBrush = d3.svg.brush()
        .x(x)
        .extent([1964,2014])
        .on('brush', onBrushed);


    slider.append('text')
          .attr('id','year-label')
          .attr('text-anchor', 'middle')
          .attr('dy', -15)
          .text('1964');

    slider = svg.append('g')
        .attr('class', 'slider')
        .attr('height', SLIDER_HEIGHT)
        .attr('transform', 'translate('+ SLIDER_OFFSET['left'] + ', ' + (SLIDER_OFFSET['top'] - 10) + ')')
        .call(sliderBrush);

    slider.selectAll('.background, .extent, .resize')
        .remove();

    sliderHandle = slider.append('svg:image')
        .attr('class', 'handle')
        .attr('transform', 'translate(0,' + mapHeight + ')')
        .attr('xlink:href', 'slider.png')
        .attr('width', 150)
        .attr('height', 20)
        .attr('x', x(1964)-75);

    // add play/pause buttons
    toggle = $('<div id="toggle"><div id="btn-play"><i class="fa fa-play"></i> Play</div><div id="btn-pause"><i class="fa fa-pause"></i> Pause</div></div>').css({
        'right': '0',
        'bottom': '10px',
        'width': TOGGLE_WIDTH + 'px'
    });
    $('#graphic').append(toggle);

    $pauseButton = $('#btn-pause');
    $playButton = $('#btn-play');

    $pauseButton.on('click', onPauseClicked);
    $playButton.on('click', onPlayClicked);
    $playButton.hide();


    // get things going
    changeColor(selectedYear);
    startAnimation();

    isLoaded = true;

    // hard-coded adjustments
    d3.select('.state-id.d36')
    .attr('dy', '.5em')
    // .attr('dx', '-.5em');
    d3.select('.state-id.d50')
    // .attr('dx', '-1em')
    .attr('dy', '-1em');
    // d3.select('.state-id.d33')
    // .attr('dx', '3em');
    d3.select('.state-id.d26')
    .attr('dy', '2em')
    .attr('dx', '1em');
    d3.select('.state-id.d6')
    // .attr('dy', '2em')
    .attr('dx', '-.5em');
    d3.select('.state-id.d28')
    .attr('dy', '1em')
    .attr('dx', '-.5em');
    // d3.select('.state-id.d13')
    // .attr('dy', '1.5em')
    // .attr('dx', '2em');
    d3.select('.state-id.d1')
    .attr('dy', '-.5em');
    d3.select('.state-id.d18')
    .attr('dy', '.5em');
    d3.select('.state-id.d17')
    .attr('dy', '-.9em');
    d3.select('.state-id.d34')
    .attr('dx', '1.5em');
    d3.select('.state-id.d10')
    .attr('dy', '.5em')
    .attr('dx', '1em');
    d3.select('.state-id.d44')
    .attr('dx', '1.5em');
    d3.select('.state-id.d9')
    .attr('dy', '1em');
    d3.select('.state-id.d24')
    .attr('dy', '-.5em')
    // .attr('dx', '-2em');
}


/*
 * HELPER FUNCTIONS
 */
var changeYearLabel = function(year) {
    d3.select('#year-label')
        .attr('x', x(year))
        .text(year);
}

var changeYear = function(year) {
    changeYearLabel(year);
    selectedYear = year;
    d3.selectAll('td').classed('cell-selected', false)
    d3.selectAll('.y-' + year).classed('cell-selected', true)
    d3.selectAll('th').classed('label-selected', false)
    d3.selectAll('th.d' + year).classed('label-selected', true)
    d3.selectAll('.state-id').text('')
    d3.selectAll('.state').classed('u0 u5 u10 u15 u20 u25',false);
    changeColor(year);
}

var changeColor = function(year) {
    var colorData = graphicData.filter(function(d) {
        return d['year'] == year;
    })

    for (k = 0; k < colorData.length; k++) {
        changeClass(colorData[k]);
    }

    d3.select('.state-labels').selectAll('.state-id').call(wrap,5)
}


var changeClass = function(d) {
    // console.log(d)

    if (!isMobile) {
        d3.select('.state-id.d' + d['id']).text(d['value'] + "%");
    } else {
        d3.select('.state-id.d' + d['id']).text(Math.round(d['value'],0) + "%");
    }

    if (d['value'] <= 8) {
        d3.select('path.d' + d['id']).classed('u0',true);
    } else if (d['value'] > 8 && d['value'] <=13) {
        d3.select('path.d' + d['id']).classed('u5',true);
    } else if (d['value'] > 13 && d['value'] <=18) {
        d3.select('path.d' + d['id']).classed('u10',true);
    } else if (d['value'] > 18 && d['value'] <=24) {
        d3.select('path.d' + d['id']).classed('u15',true);
    } else if (d['value'] > 24 && d['value'] <=31) {
        d3.select('path.d' + d['id']).classed('u20',true);
    } else if (d['value'] > 31) {
        d3.select('path.d' + d['id']).classed('u25',true);
    }
 }

var onPauseClicked = function() {
    pauseAnimation();
}
var onPlayClicked = function() {
    startAnimation();
}

var startAnimation = function() {
    isAnimating = true;
    animationTimer = setInterval(function() {
        var year = dates[i];
        changeYear(year)
        i++;
        if (i == 26) {
            pauseAnimation();
            i = 0;
        }
        sliderHandle.attr('x', x(year) - 75);
    },500);
    $playButton.hide();
    $pauseButton.show();
}

var pauseAnimation = function() {
    clearInterval(animationTimer);
    isAnimating = false;

    $pauseButton.hide();
    $playButton.show();
}

var onBrushed = function() {
    pauseAnimation();
    var valueTemp = Math.round(sliderBrush.extent()[0]);
    var value = getNearestNumber(dates, valueTemp);
    if (d3.event.sourceEvent) { // not a programmatic event
        var valueTemp = Math.round(x.invert(d3.mouse(this)[0]));
        value = getNearestNumber(dates, valueTemp);
        sliderBrush.extent([ value, value ]);
    }
    sliderBrush.extent([ value, value ]);
    sliderHandle.attr('x', x(value) - 75);
    changeYear(value);
}

var updateDimensions = function(graphicWidth) {
    svgWidth = graphicWidth;
    mapHeight = svgWidth * BASE_HEIGHT / BASE_WIDTH;
    mapScale = (svgWidth / BASE_WIDTH) * BASE_SCALE;
    svgHeight = Math.ceil(mapHeight + SLIDER_OFFSET['top'] + SLIDER_HEIGHT);
}

var classify = function(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}

var adjustLabels = function(selectedYear) {
    if (selectedYear == 2014) {
        d3.select('.state-id.d36')
            .attr('dx', '-4em')
    }
}
var getNearestNumber = function(a, n) {
    if((l = a.length) < 2)
        return l - 1;
    for(var l, p = Math.abs(a[--l] - n); l--;)
        if(p < (p = Math.abs(a[l] - n)))
            break;
    return a[l + 1];
}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(onWindowLoaded);

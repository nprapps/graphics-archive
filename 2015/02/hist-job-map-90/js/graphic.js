// global vars
var $graphic = null;
var graphicD3 = null;
var $pauseButton = null;
var $playButton = null;
var pymChild = null;

var GRAPHIC_DATA_URL = 'firstjob-state-long-final.csv';
var TOPO_DATA_URL = 'us-states.json';

var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

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
var selectedYear = '1978';

var mapHeight = null;
var mapScale = null;
var svgHeight = null;
var svgWidth = null;


// DATA
var graphicData = null;
var topoData = null;

var dates = [
1978,
1980,
1982,
1984,
1986,
1988,
1990,
1992,
1994,
1996,
1998,
2000,
2002,
2004,
2006,
2008,
2010,
2012,
2014
];

var datesWide = [
    1978,
    1982,
    1986,
    1990,
    1994,
    1998,
    2002,
    2006,
    2010,
    2014
];

var datesMobile  = [
    // 1970,
    1980,
    1990,
    2000,
    2010
    // 2014
];



var jobsClassify = {
"Farmer" : "farmer",
"Farm workers" : "farmer",
"Farm managers, except for horticultural farms" : "farmer",
"Farmers (owners and tenants)" : "farmer",
"Winding and twisting textile/apparel operatives" : "textile",
"Textile sewing machine operators" : "textile",
"Truck, delivery, and tractor drivers" : "trucker",
"Shoemaking machine operators" : "factory-s",
"Factory Worker" : "factory-s",
"Assemblers of electrical equipment" : "factory-e",
"Machine operators, n.e.c" : "machine",
"Production supervisors or foremen" : "foremen",
"Miners" : "miners",
"Production checkers and inspectors" : "inspectors",
"Carpenters" : "carpenter",
"Housekeepers, maids, butlers, stewards, and lodging quarters cleaners" : "housekeepers",
"Recreation facility attendants" : "recreation",
"Retail sales clerks" : "retail",
"Janitors" : "janitors",
"Cashiers" : "cashier",
"Customer service reps, investigators and adjusters, except insurance" : "customer-s",
"Nursing aides, orderlies, and attendants" : "nursing-aide",
"Registered nurses" : "registered-nurse",
"Cooks, variously defined" : "cooks",
"Managers of food-serving and lodging establishments" : "manager-h",
"Primary school teachers" : "teacher-p",
"Secondary school teachers" : "teacher-s",
"Bookkeepers and accounting and auditing clerks" : "bookkeepers",
"Lawyers" : "lawyers",
"Computer systems analysts and computer scientists" : "computer",
"Computer software developers" : "software-developer",
"Administrative support jobs, n.e.c" : "admin-s",
"Secretaries" : "secretaries",
"Real estate sales occupations" : "r-estate",
"Accountants and auditors" : "accountants",
"Insurance sales occupations" : "insurance",
"Chief executives and public administrators" : "ceo",
"Salespersons, n.e.c." : "salespersons"
};

var jobsRaw = [
"Farmer",
"Farm workers",
"Farm managers, except for horticultural farms",
"Farmers (owners and tenants)",
"Winding and twisting textile/apparel operatives",
"Textile sewing machine operators",
"Truck, delivery, and tractor drivers",
"Shoemaking machine operators",
"Factory Worker",
"Assemblers of electrical equipment",
"Machine operators, n.e.c",
"Production supervisors or foremen",
"Miners",
"Production checkers and inspectors",
"Carpenters",
"Housekeepers, maids, butlers, stewards, and lodging quarters cleaners",
"Recreation facility attendants",
"Retail sales clerks",
"Janitors",
"Cashiers",
"Customer service reps, investigators and adjusters, except insurance",
"Nursing aides, orderlies, and attendants",
"Registered nurses",
"Cooks, variously defined",
"Managers of food-serving and lodging establishments",
"Primary school teachers",
"Secondary school teachers",
"Bookkeepers and accounting and auditing clerks",
"Lawyers",
"Computer systems analysts and computer scientists",
"Computer software developers",
"Administrative support jobs, n.e.c",
"Secretaries",
"Real estate sales occupations",
"Accountants and auditors",
"Insurance sales occupations",
"Chief executives and public administrators",
"Salespersons, n.e.c."
]
var jobs = [
"Farmer",
// "Farm workers",
// "Winding and twisting textile/apparel operatives",
// "Textile sewing machine operators",
// "Shoemaking machine operators",
"Factory Worker",
"Machine operators",
// "Production supervisors or foremen",
// "Miners",
// "Production checkers and inspectors",
// "Carpenters",
// "Housekeepers, maids, butlers, stewards, and lodging quarters cleaners",
"Recreation Attendants",
// "Retail sales clerks",
// "Janitors",
"Cashiers",
// "Customer service reps, investigators and adjusters, except insurance",
"Nursing aides",
"Registered nurses",
"Cooks",
// "Managers of food-serving and lodging establishments",
"Teachers",
// "Primary school teachers",
// "Secondary school teachers",
// "Bookkeepers and accounting and auditing clerks",
"Lawyers",
"Computer Analysts",
"Software developers",
"Administrative Support",
"Truck Drivers",
"Secretaries",
// "Real estate sales occupations",
"Accountants and auditors",
"Insurance sales occupations"
// "Chief executives and public administrators",
// "Salespersons"
]
// consider deleting stateNames and stateID - not using them anywhere
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
        // d['year'] = d3.time.format('%Y').parse(d['year']);
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

    for (var k = 0; k < jobsRaw.length; k++ ) {
        replaceLabel(jobsRaw[k])
    }
    // draw the map and slider
    drawMap(containerWidth);

    // update iframe
    if (pymChild) {
        pymChild.sendHeightToParent();
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
        .domain([ 1977, 2014 ])
        .range([0, svgWidth - SLIDER_OFFSET['left'] - SLIDER_OFFSET['right'] ])
        .clamp(true);

    sliderBrush = d3.svg.brush()
        .x(x)
        .extent([1977,1977])
        .on('brush', onBrushed);

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
        .attr('x1', x(1978))
        .attr('x2', x(2014));

    var sliderBarHalo = svg.append('g')
        .attr('class', 'xbar-halo')
        .append('line')
        .attr('transform', 'translate(' + SLIDER_OFFSET['left'] + ',' + (mapHeight + SLIDER_OFFSET['top']) + ')')
        .attr('x1', x(1978))
        .attr('x2', x(2014));

    slider.append('text')
          .attr('id','year-label')
          .attr('text-anchor', 'middle')
          .attr('dy', -15)
          .text('1978');

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
        .attr('x', x(1978)-75);

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
    .attr('dy', '1.5em')
    .attr('dx', '-2.5em');
    d3.select('.state-id.d50')
    .attr('dx', '-3em')
    .attr('dy', '-1em');
    d3.select('.state-id.d33')
    .attr('dx', '3em');
    d3.select('.state-id.d26')
    .attr('dy', '2em')
    .attr('dx', '1em');
    d3.select('.state-id.d6')
    .attr('dy', '2em')
    .attr('dx', '-1em');
    d3.select('.state-id.d28')
    .attr('dy', '1em')
    .attr('dx', '-.5em');
    d3.select('.state-id.d13')
    .attr('dy', '1.5em')
    .attr('dx', '2em');
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
    .attr('dx', '3.5em');
    d3.select('.state-id.d44')
    .attr('dx', '3.5em');
    d3.select('.state-id.d9')
    .attr('dy', '1em');
    d3.select('.state-id.d24')
    .attr('dy', '-1em')
    .attr('dx', '-2em');
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
    d3.selectAll('.state').classed('salespersons machine secretaries farmer textile housekeepers trucker farmer-o recreation textile foremen bookkeepers factory-e miners retail lawyers inspectors factory-s teacher-p carpenter janitors cooks r-estate accountants admin-s computer teacher-s manager-h insurance cashier customer-s nursing-aide registered-nurse software-developer ceo farmer',false);
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
    switch(d['job']) {
case "Machine operators, n.e.c" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Machine Operator');
    }
    d3.select('path.d' + d['id']).classed('machine',true);
    break;
case "Secretaries" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Secretary');
    }
    d3.select('path.d' + d['id']).classed('secretaries',true);
    break;
case "Farm workers" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Farmer');
    }
    d3.select('path.d' + d['id']).classed('farmer',true);
    break;
case "Textile sewing machine operators" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Factory Worker');
    }
    d3.select('path.d' + d['id']).classed('factory-e',true);
    break;
case "Housekeepers, maids, butlers, stewards, and lodging quarters cleaners" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Housekeeper');
    }
    d3.select('path.d' + d['id']).classed('housekeepers',true);
    break;
case "Truck, delivery, and tractor drivers" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Truck Driver');
    }
    d3.select('path.d' + d['id']).classed('trucker',true);
    break;
case "Farmers (owners and tenants)" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Farmer');
    }
    d3.select('path.d' + d['id']).classed('farmer',true);
    break;
case "Recreation facility attendants" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Recreation Attendant');
    }
    d3.select('path.d' + d['id']).classed('recreation',true);
    break;
case "Winding and twisting textile/apparel operatives" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Textile Worker');
    }
    d3.select('path.d' + d['id']).classed('textile',true);
    break;
case "Production supervisors or foremen" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Foremen');
    }
    d3.select('path.d' + d['id']).classed('foremen',true);
    break;
case "Bookkeepers and accounting and auditing clerks" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Bookkeepers');
    }
    d3.select('path.d' + d['id']).classed('bookkeepers',true);
    break;
case "Assemblers of electrical equipment" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Factory Worker');
    }
    d3.select('path.d' + d['id']).classed('factory-e',true);
    break;
case "Miners" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Miners');
    }
    d3.select('path.d' + d['id']).classed('miners',true);
    break;
case "Retail sales clerks" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Retail Clerk');
    }
    d3.select('path.d' + d['id']).classed('retail',true);
    break;
case "Lawyers" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Lawyer');
    }
    d3.select('path.d' + d['id']).classed('lawyers',true);
    break;
case "Production checkers and inspectors" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Inspector');
    }
    d3.select('path.d' + d['id']).classed('inspectors',true);
    break;
case "Shoemaking machine operators" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Factory Worker');
    }
    d3.select('path.d' + d['id']).classed('factory-e',true);
    break;
case "Primary school teachers" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Primary School Teacher');
    }
    d3.select('path.d' + d['id']).classed('teacher-p',true);
    break;
case "Carpenters" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Carpenters');
    }
    d3.select('path.d' + d['id']).classed('carpenter',true);
    break;
case "Janitors" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Janitor');
    }
    d3.select('path.d' + d['id']).classed('janitors',true);
    break;
case "Cooks, variously defined" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Cook');
    }
    d3.select('path.d' + d['id']).classed('cooks',true);
    break;
case "Real estate sales occupations" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Real Estate');
    }
    d3.select('path.d' + d['id']).classed('r-estate',true);
    break;
case "Accountants and auditors" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Accountant');
    }
    d3.select('path.d' + d['id']).classed('accountants',true);
    break;
case "Administrative support jobs, n.e.c" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Admin. Support');
    }
    d3.select('path.d' + d['id']).classed('admin-s',true);
    break;
case "Computer systems analysts and computer scientists" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Computer Analyst');
    }
    d3.select('path.d' + d['id']).classed('computer',true);
    break;
case "Secondary school teachers" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Teacher');
    }
    d3.select('path.d' + d['id']).classed('teacher-s',true);
    break;
case "Managers of food-serving and lodging establishments" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Manager-Hospitality');
    }
    d3.select('path.d' + d['id']).classed('manager-h',true);
    break;
case "Insurance sales occupations" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Insurance');
    }
    d3.select('path.d' + d['id']).classed('insurance',true);
    break;
case "Cashiers" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Cashier');
    }
    d3.select('path.d' + d['id']).classed('cashier',true);
    break;
case "Customer service reps, investigators and adjusters, except insurance" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Customer Service');
    }
    d3.select('path.d' + d['id']).classed('customer-s',true);
    break;
case "Nursing aides, orderlies, and attendants" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Nursing Aide');
    }
    d3.select('path.d' + d['id']).classed('nursing-aide',true);
    break;
case "Registered nurses" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Registered Nurse');
    }
    d3.select('path.d' + d['id']).classed('registered-nurse',true);
    break;
case "Computer software developers" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Software Developer');
    }
    d3.select('path.d' + d['id']).classed('software-developer',true);
    break;
case "Chief executives and public administrators" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('CEO');
    }
    d3.select('path.d' + d['id']).classed('ceo',true);
    break;
case "Farm managers, except for horticultural farms" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Farmer');
    }
    d3.select('path.d' + d['id']).classed('farmer',true);
    break;
case "Salespersons, n.e.c" :
    if (!isMobile) {
    d3.select('.state-id.d' + d['id']).text('Sales And Retail');
    }
    d3.select('path.d' + d['id']).classed('salespersons',true);
    break;
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
        if (i == 19) {
            pauseAnimation();
            i = 0;
        }
        sliderHandle.attr('x', x(year) - 75);
    },1000);
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

var replaceLabel = function(cell) {
    var result = $('tr').find('td:contains('+cell+')');
    $(result).addClass(jobsClassify[cell]);
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

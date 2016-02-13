// Global vars
var pymChild = null;
var isMobile = false;
var isRendered = false;
var geoData = null;
var executionData = [];
var years = [ '1998', '2000', '2002', '2004', '2006', '2008', '2010', '2012', '2014' ];
var yearLabels = [ '1998-99', '2000-01', '2002-03', '2004-05', '2006-07', '2008-09', '2010-11', '2012-13', '2014-15' ];
var currentYear = years.length - 1;
var maps = null;

var sliderBrush = null;
var sliderScale = null;

var btnBack = null;
var btnNext = null;


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        btnNext = d3.select('#btn-next');
        btnBack = d3.select('#btn-back');

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }
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

    // Render the slider!
    renderSlider({
        container: '#slider',
        width: containerWidth,
        data: years
    });

    // Render the map!
    renderLocatorMap({
        container: '#locator-map',
        width: containerWidth
    });

    swapMap();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderLocatorMap = function(config) {
    var mapRatio = 874 / 1413;
    if (isMobile) {
        mapRatio = 360 / 580;
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    years.forEach(function(d, i) {
        var mapImg = 'assets/map-' + d + '.png';
        if (isMobile) {
            mapImg = 'assets/map-' + d + '-mobile.png';
        }

        var mapWrapper = containerElement.append('div')
            .attr('class', 'map year year-' + d)
            .attr('style', 'height: ' + Math.ceil(config['width'] * mapRatio) + 'px;');
        mapWrapper.append('img')
            .attr('src', mapImg)
            .attr('alt', 'Map of executions in ' + yearLabels[i]);
    });

    maps = d3.selectAll('.map');

    d3.select('.btns').attr('style', 'display: block');
    btnBack.on('click', onBackButtonClicked);
    btnNext.on('click', onNextButtonClicked);
    resetButtonState();

    swapMap();

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

// draw slider bar
var renderSlider = function(config) {
    var firstYear = +config['data'][0];
    var lastYear = +config['data'][config['data'].length - 1];

//    var toggleWidth = 90;
    var toggleWidth = 160
    if (isMobile) {
        toggleWidth = 0;
    }

    var sliderWidth = config['width'];
    if (!isMobile) {
        sliderWidth -= (toggleWidth + 50);
    }

    var sliderHeight = 60;
    var sliderMargins = {
        top: 25,
        right: 27,
        bottom: 0,
        left: 27
    };
    if (isMobile) {
        sliderMargins['right'] = sliderMargins['left'];
    }

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    var sliderElement = containerElement.append('svg')
        .attr('width', sliderWidth)
        .attr('height', sliderHeight);

    // define scale
    sliderScale = d3.scale.linear()
        .domain([ firstYear, lastYear ])
        .range([0, sliderWidth - sliderMargins['left'] - sliderMargins['right'] ])
        .clamp(true);

    slider = sliderElement.append('g')
        .attr('class', 'x axis')
        .call(d3.svg.axis()
            .scale(sliderScale)
            .orient('bottom')
            .tickValues(years)
            .tickFormat(function(d,i) {
                if (!isMobile) {
                    return d;
                }
                if (isMobile && (i % 2 == 0)) {
                    return d;
                }
            })
            .tickSize(8)
            .tickPadding(5)
        )
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')');

    var sliderTicks = d3.selectAll('#slider .x.axis .tick');
    sliderTicks[0].forEach(function(d,i) {
        var tick = d3.select(d);
        var text = tick.select('text').text();
        if (text == '') {
            tick.select('line')
                .attr('y2', 7);
        } else {
            tick.select('line')
                .attr('y2', 10);
        }
    });

    var sliderBar = sliderElement.append('g')
        .attr('class', 'xbar')
        .append('line')
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .attr('x1', sliderScale(firstYear))
        .attr('x2', sliderScale(lastYear));

    var sliderBarHalo = sliderElement.append('g')
        .attr('class', 'xbar-halo')
        .append('line')
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .attr('x1', sliderScale(firstYear))
        .attr('x2', sliderScale(lastYear));

    sliderBrush = d3.svg.brush()
        .x(sliderScale)
        .extent([ firstYear, lastYear ])
        .on('brush', onBrushed);

    slider.append('text')
          .attr('id','year-label')
          .attr('text-anchor', 'middle')
          .attr('dy', -15)
          .text(firstYear);

    slider = sliderElement.append('g')
        .attr('class', 'slider')
        .attr('height', sliderHeight)
        .attr('transform', 'translate(' + sliderMargins['left'] + ',' + sliderMargins['top'] + ')')
        .call(sliderBrush);

    sliderHandle = slider.append('svg:image')
        .attr('class', 'handle')
        .attr('transform', 'translate(0,' + -10 + ')')
        .attr('xlink:href', 'slider.png')
        .attr('width', 150)
        .attr('height', 20)
        .attr('x', sliderScale(firstYear) - 75 );

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var onBrushed = function() {
    var thisYear = Math.round(sliderBrush.extent()[0]);

    if (d3.event.sourceEvent) { // not a programmatic event
        thisYear = Math.round(sliderScale.invert(d3.mouse(this)[0]));
    }
    sliderBrush.extent([ thisYear, thisYear ]);
    sliderHandle.attr('x', sliderScale(thisYear) - 75);
    // console.log(sliderBrush.extent(), sliderScale.domain());

    for (var i = 0; i < years.length; i++) {
        if (years[i] == thisYear) {
            currentYear = i;
        }
    }
    swapMap();
}

var swapMap = function() {
    var year = years[currentYear];

    maps.classed('active', false);
    d3.select('.map.year-' + year)
        .classed('active', true);

    d3.select('#slider .handle').attr('x', sliderScale(year) - 75);

    d3.select('#year-label')
        .attr('x', sliderScale(year))
        .text(yearLabels[currentYear]);

    resetButtonState();

    if (!isRendered) {
        d3.select('#loading').remove();
        isRendered = true;
    }
}

var onNextButtonClicked = function() {
    if (currentYear == undefined) {
        currentYear = years.length - 1;
    }
    currentYear++;
    if (currentYear > (years.length - 1)) {
        currentYear = 0;
    }
    swapMap();
    resetButtonState();
};

var onBackButtonClicked = function() {
    if (currentYear == undefined) {
        currentYear = years.length - 1;
    }
    currentYear--;
    if (currentYear < 0) {
        currentYear = 0;
    } else {
        swapMap();
        resetButtonState();
    }
};

var resetButtonState = function() {
    if (currentYear == (years.length - 1)) {
        btnNext.html('Begin&nbsp;<span>&rsaquo;</span>');
    } else {
        btnNext.html('Next&nbsp;<span>&rsaquo;</span>');
    }
    btnNext.classed('restart', function() {
        if (currentYear == (years.length - 1)) {
            return true;
        } else {
            return false;
        }
    });

    btnBack.classed('inactive', function() {
        if (currentYear == 0) {
            return true;
        } else {
            return false;
        }
    });
};


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

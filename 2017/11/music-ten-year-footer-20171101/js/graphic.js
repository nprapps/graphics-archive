// Global vars
var pymChild = null;
var currentYear = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    // init pym
    pymChild = new pym.Child({});

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });

    // populate footer
    currentYear = getCurrentYear();
    populateYearList();
    populateNextYear();
    d3.select('h3 a').on('click', function() {
        ANALYTICS.trackEvent(
            'click-header',
            '#'
        );
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

// identify the current year based on the URL parameter
var getCurrentYear = function() {
    var year = getParameterByName('year');
    if (year == null || year == '') {
        year = '2008';
    }
    return year;
}

// populate list of years w/ links
var populateYearList = function() {
    var yearList = d3.select('.year-list')
        .selectAll('li')
        .data(DATA)
        .enter()
            .append('li')
                .attr('class', function(d, i) {
                    if (currentYear == d['year']) {
                        return 'current-year';
                    }
                })
            .append('a')
                .attr('href', function(d,i) {
                    return d['seamus_link'];
                })
                .text(function(d, i) {
                    var year = d['year'];
                    if (i < (DATA.length - 1)) {
                        year += ','
                    }
                    return year;
                })
                .on('click', function(d) {
                    ANALYTICS.trackEvent(
                        'click-year',
                        d['year']
                    );
                });
};

// populate promo for next year
var populateNextYear = function() {
    var nextYearId = null;

    // get current year ID
    DATA.forEach(function(d, i) {
        if (d['year'] == currentYear) {
            nextYearId = i + 1;

            if (nextYearId >= DATA.length) {
                nextYearId = 0;
            }
        }
    });

    d3.select('.next-year-art')
        .append('a')
            .attr('href', DATA[nextYearId]['seamus_link'])
            .on('click', function() {
                ANALYTICS.trackEvent(
                    'click-next-year-image',
                    DATA[nextYearId]['year']
                );
            })
        .append('img')
            .attr('src', DATA[nextYearId]['image'])
            .attr('alt', DATA[nextYearId]['year']);

    d3.select('.next-year-description')
        .append('a')
            .attr('href', DATA[nextYearId]['seamus_link'])
            .on('click', function() {
                ANALYTICS.trackEvent(
                    'click-next-year-text',
                    DATA[nextYearId]['year']
                );
            })
        .append('p')
            .html(DATA[nextYearId]['description']);

    d3.select('.next-year-art img').on('load', function() {
        // Update iframe
        if (pymChild) {
            pymChild.sendHeight();
        }
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

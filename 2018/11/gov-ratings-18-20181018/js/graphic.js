// Global vars
var pymChild = null;
var isMobile = false;
var isNPR = true;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    var hostname = identifyParentHostname();
    // Direct links to the child page (iOS app workaround link)
    if (isChildlink()) {
        isNPR = false;
        d3.select('body').classed('childlink', true);
        d3.select('body').classed('not-npr', true);
    // if we're on NPR.org or developing locally
    } else if (isNPRHost(hostname) || isLocalhost(hostname)) {
        isNPR = true;
        d3.select('body').classed('npr', true);
    // if we're on another site
    } else {
        isNPR = false;
        d3.select('body').classed('not-npr', true);
    }

    if (Modernizr.svg) {
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
    renderGraphic({
        container: '#graphic',
        width: containerWidth,
        data: DATA
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
    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 0,
        right: 15,
        bottom: 20,
        left: 15
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Instructions
    if (isNPR && !isMobile) {
        containerElement.append('h5')
            .attr('class', 'desktop-click')
            .text('Click on a state to jump to its story.');
    }

    // add in container divs
    $(config["container"]).append("<div class='incumb-header'><div class='party-name'>Dem.</div><div class='party-spacer'></div><div class='party-name'>GOP</div>")
    $(config["container"]).append("<div class='rating-contents'></div>")
    $(".rating-contents").append("<div class='ratings-col dem-ratings party-ratings'></div>")
    $(".rating-contents").append("<div class='ratings-col label-ratings'></div>")
    $(".rating-contents").append("<div class='ratings-col gop-ratings party-ratings'></div>")
    $(".rating-contents").append("<div class='clear-both'></div>")

    // add in rows for each col
    $(".ratings-col").each(function(ind, el) {
        var partyText = "";
        if (ind != 1) {
            partyText = "party-rating-row";
        }
        $(el).append("<div class='favor-Dem rating-row col-rating-row-" + ind + " " + partyText + "'></div>");
        $(el).append("<div class='lean-Dem rating-row col-rating-row-" + ind + " " + partyText + "'></div>");
        $(el).append("<div class='tossup rating-row col-rating-row-" + ind + " " + partyText + "'></div>");
        $(el).append("<div class='lean-GOP rating-row col-rating-row-" + ind + " " + partyText + "'></div>");
        $(el).append("<div class='favor-GOP rating-row col-rating-row-" + ind + " " + partyText + "'></div>");
        $(el).append("<div class='clear-both'></div>");
    })

    function placeUnits(parentClass, rating, incumbParty) {
        var incumbsToCols = { 'Dem': '0', 'GOP': '2' }
        config['data'].forEach(function(el, ind) {
            if (el.rating == rating && el.incumb_party == incumbParty) {
                var parentElement = containerElement.select('.' + parentClass + '.col-rating-row-' + incumbsToCols[incumbParty])
                    .append('div')
                        .attr('data-scroll', el.state_abbrv + '-header')
                        .attr('class', 'chart-unit ' + incumbParty + '-unit')
                        .append('span')
                            .text(el.state_abbrv);
            }
        });
    }

    placeUnits("favor-Dem", "solid_d", "Dem")
    placeUnits("favor-Dem", "likely_d", "Dem")
    placeUnits("lean-Dem", "lean_d", "Dem")
    placeUnits("tossup", "tossup", "Dem")
    placeUnits("lean-GOP", "lean_r", "Dem")
    placeUnits("favor-GOP", "likely_r", "Dem")
    placeUnits("favor-GOP", "solid_r", "Dem")

    placeUnits("favor-Dem", "solid_d", "GOP")
    placeUnits("favor-Dem", "likely_d", "GOP")
    placeUnits("lean-Dem", "lean_d", "GOP")
    placeUnits("tossup", "tossup", "GOP")
    placeUnits("lean-GOP", "lean_r", "GOP")
    placeUnits("favor-GOP", "likely_r", "GOP")
    placeUnits("favor-GOP", "solid_r", "GOP")

    $(["Favor Dem.", "Lean Dem.", "Toss-up", "Lean GOP", "Favor GOP"]).each(function(ind, el) {
        $($(".label-ratings").children()[ind]).append("<span>" + el + "</span>")
    })

    // on mobile, move the middle col before the first, then make all cols 100% and get rid of dem/Gop headers
    if (isMobile) {
        $('#graphic').addClass('mobile-contents');
    } else {
        $('#graphic').removeClass('mobile-contents');
    }

    /*
     * Click events for NPR.org
     */
    // Desktop
    if (isNPR && !isMobile) {
        containerElement.selectAll('.chart-unit')
            .on('click', function() {
                d3.event.preventDefault();
                var scrollTarget = d3.select(this).attr('data-scroll');
                pymChild.scrollParentTo(scrollTarget);
            });

    }
    // Mobile
    if (isNPR && isMobile) {
        // add dropdown
        $(config['container']).append('<div class="select-state-form"><div class="state-jump">Jump to state</div><select id="select-state"><option>Choose a state</option></select></div>');

        // sort data alphabetically
        function compare(a, b) {
            if (a.state_full < b.state_full)
                return -1;
            if (a.state_full > b.state_full)
                return 1;
            return 0;
        }
        config['data'] = config['data'].sort(compare);

        $(config['data']).each(function(ind, el) {
            $('#select-state').append('<option value="' + el.state_abbrv + '-header">' + el.state_full + '</option>');
        });

        // click handler for dropdown
        $(config['container'] + ' select').change(function() {
            event.preventDefault();
            var scrollTarget = this.value;
            pymChild.scrollParentTo(scrollTarget);
        });
    }
}

/*
 Helper functions
 */
// Functions for determining where this embed lives
var isLocalhost = function (hostname) {
    return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(hostname);
}
var isNPRHost = function (hostname) {
    return hostname === 'npr.org' || hostname.endsWith('.npr.org');
}
var identifyParentHostname = function () {
    return window.pymChild
        ? new URL(pymChild.parentUrl).hostname
        : window.location.hostname;
};
var isChildlink = function() {
    return getParameterByName('mode') === 'childlink';
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

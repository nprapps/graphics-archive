// Global vars
var pymChild = null;
var isMobile = false;
var geoData = GEO_DISTRICTS;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
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

    // Render the chart!
    renderLocatorMap({
        container: '#locator-map',
        width: containerWidth,
        data: geoData,
        pixelOffset: [0, 0]
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

var renderLocatorMap = function(config) {
    /*
     * Setup
     */
    var aspectWidth = 2;
    var aspectHeight = 1.25;

    var alphaBins = d3.scale.threshold()
        .domain([0.2, 0.40, 0.6, .8, 1.0]) // input value ranges
        .range([0.2, 0.40, 0.6, .8, 1.0]); // output alphas

    // Calculate actual map dimensions
    var mapWidth = config['width'];
    var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);
    var scaleFactor = mapWidth / (config['data']['bbox'][2] + 1);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Extract topo data.
     */
    var mapData = {};
    for (var key in config['data']['objects']) {
        mapData[key] = topojson.feature(config['data'], config['data']['objects'][key]);
    }

    /*
     * Create the map path. Projection is null (other than for scaling) b/c we projected this already in Mapshaper
     * Scaling help via: https://stackoverflow.com/a/41230426
     */
    function scale(scaleFactor) {
        return d3.geo.transform({
            point: function(x, y) {
                this.stream.point(x * scaleFactor, y * scaleFactor);
            }
        });
    }
    var path = d3.geo.path()
        .projection(scale(scaleFactor));

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', mapWidth)
        .attr('height', mapHeight)
        .append('g')

    var highlight_counties = ["42003", "40109", "48029", "48453", "48201", "08031", "41051", "27053", "17031", "47157", "37119", "13121", "36055", "42101"]

    /*
     * Render districts.
     */
    chartElement.append('g')
        .attr('class', 'districts')
        .selectAll('path')
        .data(mapData['cb_2017_us_county_5m']['features'])
        .enter().append('path')
        .attr('class', function(d) {
            if (DATA[d["id"]] != undefined) {
                return 'c-' + d['id'] + ' ' + DATA[d['id']]['winner'].toLowerCase();
            }
        })
        .attr('style', function(d) {
            var dataYear = "2016";

            if (dataYear == "2018") {
                winnerKey = "winner"
                pctKey = "_pct"
            }
            if (dataYear == "2016") {
                winnerKey = "winner_16"
                pctKey = "_pct_16"
            }

            if (DATA[d["id"]] != undefined) {
                var winner = DATA[d['id']][winnerKey].toLowerCase();
                var val = +DATA[d['id']][DATA[d['id']][winnerKey] + pctKey];
                var demFlips = +DATA[d['id']]['dem_flip_race_count'];
                var alpha = .2

                var color = '50,50,50';
                var strokeColor = "#fff"
                var highlight = false
                if (highlight_counties.indexOf(DATA[d["id"]]["fipsCode"]) > -1) {
                    highlight = true
                }

                var suburbanUrban = false;
                var suburban = false;

                if (DATA[d["id"]]["suburb"] == "True" && DATA[d["id"]]["both_contested"] == "True") {
                    suburban = true;
                }

                if ((DATA[d["id"]]["suburb"] == "True" && DATA[d["id"]]["both_contested"] == "True") || (DATA[d["id"]]["urban"] == "True" && DATA[d["id"]]["both_contested"] == "True")) {
                    suburbanUrban = true
                }

                // if ((DATA[d["id"]]["suburb"] == "True" && DATA[d["id"]]["both_contested"] == "True") || highlight ) {
                if (suburbanUrban || highlight ) {
                // if (suburban && demFlips > 0 ) {
                    switch (winner) {
                        case 'dem':
                            color = '73,141,203';
                            break;
                        case 'gop':
                            color = '240,91,78';
                            break;
                        case 'other':
                            color = '21,177,110';
                            break;
                    }
                    if (color == "50,50,50") {}

                    // if (highlight) {
                    //     color = "0,250,0";
                    // }

                    alpha = alphaBins(val); // bucket vals rather than use the raw val
                }


                // if (demFlips == 1) {
                    return 'fill: rgb(' + color + '); fill-opacity: '+ alpha +' ; stroke: ' + strokeColor;
                // }
                // else if (demFlips > 1 && suburban) {
                //     return "fill: gold"
                // }
            }
        })
        .attr('d', path)
        .on("click", function(d) {
            console.log(DATA[d["id"]]);
            console.log(DATA[d['id']]["dem_flip_races_flipped"])
            console.log(DATA[d['id']]["race_name"])
            console.log(" ")
        });

    /*
     * Render state outlines
     */
    chartElement.append('g')
        .attr('class', 'states')
        .selectAll('path')
        .data(mapData['cb_2017_us_state_5m']['features'])
        .enter().append('path')
        .attr('class', function(d) {
            if (DATA[d["id"]] != undefined) {
                return 'cd-' + d['id'] + ' ' + DATA[d['id']]['winner'].toLowerCase();
            }
        })
        .attr('d', path);

}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
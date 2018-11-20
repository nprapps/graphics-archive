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
        data: geoData,
        pixelOffset: [0, 0],
        mapWidth: 400
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

    // // Create container
    // var chartElement = containerElement.append('svg')
    //     .attr('width', chartWidth + margins['left'] + margins['right'])
    //     .attr('height', chartHeight + margins['top'] + margins['bottom'])
    //     .append('g')
    //     .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    // Draw here!

    d3.select(".graphic").append("div")
        .attr("class", "card-body");

    var childDivClasses = ["dem-wrapper section-wrapper party-section-wrapper", "center-wrapper section-wrapper", "gop-wrapper section-wrapper party-section-wrapper"]
    var parties = ["Dem", "GOP"]
    var leftRightDivClasses = ["party-label"]


    // divided card into thirds

    for (i = 0; i < childDivClasses.length; i++) {
        d3.select(".card-body")
            .append("div")
            .attr('class', childDivClasses[i]);
    }

    var thisUrlParam = getParameterByName("chartdata") || "starbucks";


    // add party labels and num,bers to left and right thirds

    var paramDataLabels = {
        "airports": "airports",
        "museums": "museums",
        "amtrak": "Amtrak stations",
        "breweries": "craft breweries",
        "fairgrounds": "state fair grounds",
        "fortune": "Fortune 500 companies",
        "hospitals": "hospitals",
        "mobilehome": "mobile home parks",
        "sportsvenues": "major sports venues",
        "starbucks": "Starbucks",
        "farms": "farms",
        "military": "military installations",
        "sonic": "sonic drive-ins"
    }

    var paramDataNotes = {
        "museums": "Data as of 2015",
        "amtrak": "",
        "breweries": "Only includes small and regional breweries",
        "fairgrounds": "",
        "fortune": "Data as of 2017, includes only headquarters",
        "hospitals": "",
        "mobilehome": "",
        "sportsvenues": "Data as of 2016",
        "starbucks": "Data as of 2017",
        "farms": "Data as of 2012",
        "military": "Data as of 2015",
        "sonic": ""
    }


    // d3.select(".footnote-district")
    //     .html(paramDataNotes[thisUrlParam])

    // if (paramDataNotes[thisUrlParam] == "") {
    d3.select(".footnotes h4")
        .remove()
    // }

    var paramDataSources = {
        "airports": "<a href='https://hifld-geoplatform.opendata.arcgis.com/'>Homeland Infrastructure Foundation-Level Data</a>",
        "museums": "<a href='https://data.imls.gov/Museum-Universe-Data-File/Museum-Universe-Data-File-FY-2015-Q3/ku5e-zr2b'>Institute of Museum and Library Services</a>",
        "amtrak": "<a href=''>Department of Transportation</a>",
        "breweries": "Brewers Association",
        "fairgrounds": "<a href='https://hifld-geoplatform.opendata.arcgis.com/'>Homeland Infrastructure Foundation-Level Data</a>",
        "fortune": "<a href='https://hifld-geoplatform.opendata.arcgis.com/'>Homeland Infrastructure Foundation-Level Data</a>",
        "hospitals": "<a href='https://hifld-geoplatform.opendata.arcgis.com/'>Homeland Infrastructure Foundation-Level Data</a>",
        "mobilehome": "<a href='https://hifld-geoplatform.opendata.arcgis.com/'>Homeland Infrastructure Foundation-Level Data</a>",
        "sportsvenues": "<a href='https://hifld-geoplatform.opendata.arcgis.com/'>Homeland Infrastructure Foundation-Level Data</a>",
        "farms": "<a href='https://www.nass.usda.gov/Publications/AgCensus/2012/Online_Resources/Congressional_District_Profiles/index.php'>Department of Agriculture</a>",
        "starbucks": "<a href='https://github.com/chrismeller/StarbucksScraper/blob/master/LICENSE'>Analysis by Chris Meller</a>",
        "military": "<a href='https://catalog.data.gov/dataset/military-installations-ranges-and-training-areas'>Department of Defense</a>",
        "sonic": ""
    }



    d3.select(".source-district")
        .html(paramDataSources[thisUrlParam] + "; " + paramDataNotes[thisUrlParam])


    var topData = {
        "amtrak": {
            "uncalled": "10",
            "Dem": "272",
            "GOP": "245"
        },
        "breweries": {
            "uncalled": "98",
            "Dem": "2501",
            "GOP": "1875"
        },
        "fairgrounds": {
            "uncalled": "2",
            "Dem": "32",
            "GOP": "40"
        },
        "farms": {
            "uncalled": "33083",
            "Dem": "444872",
            "GOP": "1631278"
        },
        "fortune": {
            "uncalled": "6",
            "Dem": "372",
            "GOP": "120"
        },
        "hospitals": {
            "uncalled": "160",
            "Dem": "3013",
            "GOP": "4300"
        },
        "military": {
            "uncalled": "26",
            "Dem": "390",
            "GOP": "383"
        },
        "mobilehome": {
            "uncalled": "1106",
            "Dem": "13886",
            "GOP": "30644"
        },
        "museums": {
            "uncalled": "855",
            "Dem": "15623",
            "GOP": "16339"
        },
        "sportsvenues": {
            "uncalled": "10",
            "Dem": "435",
            "GOP": "299"
        },
        "starbucks": {
            "uncalled": "410",
            "Dem": "8267",
            "GOP": "4543"
        }
    }

    for (key in topData) {
        topData[key]['Dem'] = +topData[key]['Dem'];
        topData[key]['GOP'] = +topData[key]['GOP'];
        topData[key]['uncalled'] = +topData[key]['uncalled'];
        topData[key].total = topData[key]['Dem'] + topData[key]['GOP'] + topData[key]['uncalled'];
    }


    if (!isMobile) {

        // add middle content 

        d3.select(".graphic")
            .insert("div", ":first-child")
            .attr("class", "big-label")
            .append("span")
            .html(paramDataLabels[thisUrlParam] + "?")

        d3.select(".graphic")
            .insert("div", ":first-child")
            .attr("class", "above-label")
            .append("span")
            .html("Where are the ...")

        addMap();


        for (i = 0; i < parties.length; i++) {

            var thisPartyPct = ((topData[thisUrlParam][parties[i]] / topData[thisUrlParam].total)) * 100



            // add in descriptors 
            d3.select("." + parties[i].toLowerCase() + '-wrapper')
                .append("div")
                .attr("class", function() {
                    return "prefix-party-label"
                })
                .append("span")
                .html(function() {
                    return "Share of " + paramDataLabels[thisUrlParam] + " in"
                })

            // add in colored party labels
            d3.select("." + parties[i].toLowerCase() + '-wrapper')
                .append("div")
                .attr("class", function() {
                    return "party-label " + parties[i] + "-label"
                })
                .append("span")
                .html(function() {
                    if (parties[i] == "Dem") {
                        return "Democratic districts"
                    }
                    if (parties[i] == "GOP") {
                        return "Republican districts"
                    }
                })

            var centerWrapperHeight = d3.select(".center-wrapper").node().getBoundingClientRect().height
            // var bigNumberHeight = d3.select(".party-big-num").node().getBoundingClientRect().height
            var partyLabelHeight = d3.select(".party-label").node().getBoundingClientRect().height
            var prefixPartyLabelHeight = d3.select(".prefix-party-label").node().getBoundingClientRect().height



            // add in bars
            var maxBarHeight = (centerWrapperHeight - partyLabelHeight - prefixPartyLabelHeight)
            // var thisPartyPct = ((topData[thisUrlParam][parties[i]] / topData[thisUrlParam].total)) * 100
            var thisbarHeight = (thisPartyPct / 100) * maxBarHeight
            var fillerbarHeight = ((100 - thisPartyPct) / 100) * maxBarHeight

            d3.select("." + parties[i].toLowerCase() + '-wrapper')
                .insert("div", ".party-label + *")
                .attr("class", "filler-bar")
                .attr("style", "height: " + (fillerbarHeight) + "px")


            d3.select("." + parties[i].toLowerCase() + '-wrapper')
                .append("div")
                .attr("class", "party-bar")
                .attr("style", "height: " + thisbarHeight + "px")
                .append("span")
                .html(function() {
                    var thisPartyPct = ((topData[thisUrlParam][parties[i]] / topData[thisUrlParam].total)) * 100
                    return Number(Math.round(thisPartyPct + 'e0') + 'e-0') + "%"
                })
                .attr("class", "party-big-num")
        }




    } else {



        // add middle content 


        d3.select(".graphic")
            .insert("div", ":first-child")
            .attr("class", "big-label")
            .append("span")
            .html(paramDataLabels[thisUrlParam] + "?")

        d3.select(".graphic")
            .insert("div", ":first-child")
            .attr("class", "above-label")
            .append("span")
            .html("Where are the ...")


        var leftRightDivClasses = ["party-label", "party-big-num party-big-num-mobile"]



        for (i = 0; i < parties.length; i++) {








            for (k = 0; k < leftRightDivClasses.length; k++) {
                if (leftRightDivClasses[k] == "party-label") {

                    d3.select(".center-wrapper")
                        .append("div")
                        .attr("class", 'prefix-party-label')
                        .append("span")
                        .html(function() {
                            return "Share of " + paramDataLabels[thisUrlParam] + " in"
                        })
                }



                d3.select(".center-wrapper")
                    .append("div")
                    .attr("class", function() {
                        if (leftRightDivClasses[k] == "party-label") {
                            return leftRightDivClasses[k] + " " + parties[i] + "-label"
                        } else {
                            return leftRightDivClasses[k]
                        }
                    })
                    .append("span")
                    .html(function() {
                        if (leftRightDivClasses[k] == "party-label") {
                            if (parties[i] == "Dem") {
                                return "Democratic districts"
                            }
                            if (parties[i] == "GOP") {
                                return "Republican districts"
                            }
                        } else {
                            var thisPartyPct = ((topData[thisUrlParam][parties[i]] / topData[thisUrlParam].total)) * 100
                            return Number(Math.round(thisPartyPct + 'e0') + 'e-0') + "%"
                        }
                    })
            }
        }


        addMap();

    }

    // change sources








    // add map 


    function addMap() {


        d3.select(".center-wrapper")
            .append("div")
            .attr("class", "map-wrapper")
        //     .html("<img src='assets/dist-winner-test-img.png'>")

        var centerColWidth = d3.select(".center-wrapper").node().getBoundingClientRect().width



        d3.select(".map-wrapper").attr("style", "max-width: " + centerColWidth + "px")





        /*
         * Setup
         */
        var aspectWidth = 2;
        var aspectHeight = 1.25;

        var binVals = [0.25, 0.50, 0.75, 1.1]

        var alphaBins = d3.scale.threshold()
            .domain(binVals) // input value ranges
            .range(binVals); // output alphas

        // Calculate actual map dimensions
        var mapWidth = centerColWidth;
        var mapHeight = Math.ceil((centerColWidth * aspectHeight) / aspectWidth);
        var scaleFactor = mapWidth / (config['data']['bbox'][2] + 1);

        // Clear existing graphic (for redraw)
        var containerElement = d3.select(".map-wrapper");
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

        console.log(DATA)

        /*
         * Render districts.
         */
        chartElement.append('g')
            .attr('class', 'districts')
            .selectAll('path')
            .data(mapData['tl_2018_us_cd116']['features'])
            .enter().append('path')
            .attr('class', function(d) {
                return 'cd-' + d['id'] + ' ' + DATA[d['id']]['party'].toLowerCase();
            })
            .attr('style', function(d) {
                var party = DATA[d['id']]['party'].toLowerCase();


                var val = (+DATA[d['id']][thisUrlParam + '_alpha_pct']) / 255;


                var alpha = alphaBins(val); // bucket vals rather than use the raw val


                var color = '239, 198, 55';
                switch (party) {
                    case 'd':
                        color = '73,141,203';
                        break;
                    case 'r':
                        color = '240,91,78';
                        break;
                    case 'i':
                        color = '21,177,110';
                        break;
                }

                if (val == 0) {
                    return 'fill: #F5F5F5'
                } else {
                    return 'fill: rgba(' + color + ',' + alpha + ');';
                }
            })
            .attr('d', path);


        // add key

        function addKeyRow(party) {
            d3.select(".graphic-wrapper").append('div')
                .attr("class", "map-key map-key-" + party)

            d3.select(".map-key-" + party).append('div')
                .attr("class", "key-color key-max-0")


            for (i = 0; i < binVals.length; i++) {
                d3.select(".map-key-" + party).append('div')
                    .attr("class", "key-color " + party + "-key-max-" + binVals[i].toString().replace('.', ""))
            }
        }

        d3.select(".graphic-wrapper").append("div")
            .attr("class", "map-key-text")
            .append("span")
            .html("<b>Fewest ⟶ most " + paramDataLabels[thisUrlParam])

        addKeyRow("D")
        addKeyRow("R")


        d3.select(".graphic-wrapper").append("div")
            .attr("class", "map-key-text")
            .append("span")
            .html("(in D/R districts)")

        var noData = false;


        for (var key in DATA) {
            if (DATA[key].party == "") {
                noData = true;
            }
        }

        if (noData == true) {
            addKeyRow("none")
            d3.select(".graphic-wrapper").append("div")
                .attr("class", "map-key-text")
                .append("span")
                .html("(in uncalled districts)")
        }





    }






}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
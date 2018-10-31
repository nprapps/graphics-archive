// Global vars
var pymChild = null;
var isMobile = false;
var SVG = null;
var METRO_TO_ID = {};
var METRO_TO_DATA = {};
var currentMetro = null;
var $btn1 = null,
    $btn2 = null,
    $btn3 = null,
    $btn4 = null; 


/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    $btn1 = $('.Nationwide'),
    $btn2 = $('.Boise'),
    $btn3 = $('.Salinas'),
    $btn4 = $('.Rochester');
    var btns = [$btn1, $btn2, $btn3, $btn4];

    if (Modernizr.svg) {
        formatData(true, true);
        d3.xml("home_affordability_map.svg", "image/svg+xml").get(function(error, xml) {
            if (error) throw error;

            SVG = xml.documentElement;

            update("Nationwide", true);
                
            pymChild = new pym.Child({
                renderCallback: render
            });
            setUpPym();
        })

        // on btn click 
        btns.forEach(function(btn) {
            btn.on('click', function() {
                var metro = btn.text();
                $('select').val(metro).trigger('change');
                update(metro, true); 
            })
        })
    } else {
        pymChild = new pym.Child({});
        setUpPym();
    }

    if (!isMobile) {
        $('.metro-menu').select2();
    }
    
}

/*
 * Setting up pym 
 */
var setUpPym = function() {
    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format data  
 */ 
var formatData = function(metros, data) {
    if (metros) {
         METROS_MAP.forEach(function(d) {
            METRO_TO_ID[d.Metro] = Math.round(+d['metro_id']);
        })
    } 

    if (data) {
        DATA.forEach(function(d) {
            METRO_TO_DATA[d.Metro] = {
                "metro_id": Math.round(+d['metro_id']),
                "share": +d['share of recently sold homes affordable to median-income households']
            }
        })
    }   
} 

/*
 * Load graphic data from a CSV 
 */ 
var loadJSON = function() {
    d3.json(GEO_DATA_URL, function(error, data) {
        us = data; 
        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Color scale 
 */
var color_domain = [20, 40, 60, 80, 100]; 
var color = d3.scale.threshold()
    .domain(color_domain)
    .range(["#ff4911", "#ff8d1c", "#efdc4f", "#93dff9", "#0076d1"]);

var ext_domain = [0, 20, 40, 60, 80, 100]; 
var ext_color = d3.scale.threshold()
    .domain(ext_domain)
    .range(["yellow", "#ff4911", "#ff8d1c", "#efdc4f", "#93dff9", "#0076d1", "white"])

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        $('.metro-menu').select2('destroy');
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderMap({
        container: '#graphic',
        width: containerWidth
        // data: formatted_data
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render map.
 */
var renderMap = function(config) {
    var aspectWidth = 4;
    var aspectHeight = 3;

    var margins = {
        top: 5,
        right: 15,
        bottom: 5,
        left: 15
    };

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create container
    var chartElement = containerElement.select('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom']);

    
    document.getElementById("graphic")
            .appendChild(SVG);

    containerElement.select('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom']);

    var x = d3.scale.linear()
        .domain(d3.extent(ext_color.domain()))
        .rangeRound([600, 860]);

    // Legend -- from state grid map 
    var legendContainer = d3.select('.map');
    d3.select('.key').html('');
    var legendWrapper = d3.select('.key-wrap');
    var legendElement = d3.select('.key');
    legendWrapper.classed('numeric-scale', true);

    _.each(ext_domain, function(key, i) {
        var keyItem = legendElement.append('li')
            .classed('key-item', true)

        keyItem.append('b')
            .style('background', function() {
                return ext_color(key)
            });

        keyItem.append('label')
            .text(function() {
                if (key == 90) {
                    return key + "%";
                } 
                return key;
            });

        // Add the optional upper bound label on numeric scale
        if (config['isNumeric'] && i == color_domain.length - 1) {
            if (LABELS['max_label'] && LABELS['max_label'] !== '') {
                keyItem.append('label')
                    .attr('class', 'end-label')
                    .text(LABELS['max_label']);
            }
        }
    });

}



// Upon selection of metro area 
var outline = function(metro) {
    d3.selectAll(".area")
        .attr("stroke", "none");

    if (metro == "Nationwide") {
        d3.selectAll(".area")
            .attr("opacity", 1);
    } else {

        d3.selectAll(".area")
            .attr("opacity", 0.1);

        d3.selectAll('#metro-' + METRO_TO_ID[metro])
            .attr("opacity", 1)
            .attr("stroke", "#39ff14")
            .attr("stroke-width", "1px");
    }
}

var update = function(metro, isInitialLoad) {
    if (isInitialLoad) {
        if (isMobile) {
            $("select option:contains('" + metro + "')").prop('selected', true);
        } else {
            $('.metro-menu').val(metro).trigger("change");
        }
    }

    outline(metro);

    var metro_details = METRO_TO_DATA[metro];

    if (metro_details) {
        var metro_color = color(metro_details.share),
            font_color = "#333";
        if (metro_details.share >= 80 || metro_details.share <= 40) {
            font_color = "#fff";
        }

        d3.select('.blurb')
            .html('');

        d3.select('.blurb')   
            .append("span")
            .attr("class", "part1")
            .html(function() {
                return "In <strong>" + metro + "</strong>, households earning the median income in 2016 could afford monthly payments* on \
                    <span style='background-color:" + metro_color + ";padding: 2px 5px;color:" + font_color + "'>" + metro_details.share + "%</span> of homes sold in the previous year.";
            });
    } else {
        d3.select('.blurb')
            .html("");
    }

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
    
}   

// on change 
$('.metro-menu').change(function() {
    var metro = $(this).find("option:selected").text();
    update(metro, false);
})


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

// Global vars
var pymChild = null;
var isMobile = false;
var oldDistricts = null;
var newDistricts = null;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        queue()
            .defer(d3.json, 'old.geojson')
            .defer(d3.json, 'new.geojson')
            .await(function(err, oldGeo, newGeo) {
                if (err) {
                    console.warn(err);
                }
                oldDistricts = oldGeo;
                newDistricts = newGeo;

                pymChild = new pym.Child({
                    renderCallback: render
                });

                pymChild.onMessage('on-screen', function(bucket) {
                    ANALYTICS.trackEvent('on-screen', bucket);
                });
            });
    } else {
        pymChild = new pym.Child({});

        pymChild.onMessage('on-screen', function(bucket) {
            ANALYTICS.trackEvent('on-screen', bucket);
        });
    }
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

    // Render the map!
    renderMap({
        container: '#graphic',
        width: containerWidth
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a graphic.
 */
var renderMap = function(config) {
    var aspectWidth = 16;
    var aspectHeight = 7;

    var margins = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    // var colors = [ '#17807e','#568b76','#7b976c','#99a363','#b7af57','#d4ba49','#efc637','#edbc35','#ecb333','#eaa931','#e8a030','#e5972e','#e38d2c' ];
    // var colors = [ '#11605e','#4a715b','#6d8157','#8e9152','#afa34c','#cfb443','#efc637','#e4b633','#d8a62f','#cd972c','#c18828','#b57925','#aa6a21' ];
    var colors = [ '#17807e','#568b76','#7b976c','#99a363','#b7af57','#d4ba49','#efc637','#e4b633','#d8a62f','#cd972c','#c18828','#b57925','#aa6a21' ];
    // var colors = [ '#aa6a21','#b77b2d','#c38c38','#cf9e44','#dbaf50','#e7c25c','#f3d469','#d1c069','#b0ac68','#8e9866','#6d8564','#477361','#11605e' ];
    // d3.shuffle(colors);

    // Calculate actual chart dimensions
    var mapWidth = config['width'] - margins['left'] - margins['right'];
    var mapHeight = Math.ceil((mapWidth * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // scaleFactor
    var scaleFactor = (mapWidth / 960);
    var scale = scaleFactor * 6102.002295938357;

    var labelSize = Math.ceil(scaleFactor * 42);

    // define projection
    var projection = d3.geo.conicConformal()
        .parallels([34 + 20 / 60, 36 + 10 / 60])
        .rotate([79, -33 - 45 / 60])
        .scale(scale)
        // .translate([ (570.5880508434078 * scaleFactor), (431.7927213940179 * scaleFactor) ]);
        .translate([ (570.5880508434078 * scaleFactor), (400 * scaleFactor) ]);

    var path = d3.geo.path().projection(projection);

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Create container
    var chartElement = containerElement.append('svg')
        .attr('width', mapWidth + margins['left'] + margins['right'])
        .attr('height', mapHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    var combined = oldDistricts.features.map(function(d,i){
        return [d,newDistricts.features[i]].map(path);
    });

    var districts = chartElement.selectAll("path")
        .data(combined)
        .enter()
        .append("path")
            .attr("d",next)
            .style("fill",function(d,i){
                return colors[i];
            });

    var label = chartElement.append('text')
        .datum([ 'Current', 'Proposed' ])
        .text(next)
        .attr('x', (mapWidth / 3))
        .attr('y', (mapHeight - labelSize))
        .attr('style', 'font-size: ' + labelSize + 'px;');

    morph();

    function morph() {
        districts.transition()
            .duration(3200)
            .attr("d",next)
            .each("end",function(d,i){
                if (i === combined.length - 1) {
                    morph();
                }
            });
        label.transition()
            .duration(0)
            .delay(3200 / 2)
            .each("end",function(){
                label.text(next);
            });
    }

    function next(d) {
        return d.reverse()[1];
    }
}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

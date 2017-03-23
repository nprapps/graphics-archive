var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var LEFT_ALIGNED_LABELS = ['Aleppo', 'Hims', 'Al Fallujah', 'Mosul', 'Basra'];

var LABEL_DICT = {
    'Hims': 'Homs',
    'Ar Raqqah': 'Raqqah',
    'Al Fallujah': 'Fallujah',
    'Irbil': 'Erbil'
}

var aspectWidth = 5;
var aspectHeight = 4;

var margin = {
    top: 0,
    right: 30,
    bottom: 0,
    left: 30
}

var mapData = null;
var svg = null;
var projection = null;
var timeScale = null;
var firstDate = null;
var lastDate = null;
var dates = null;
var currentDate = 0;
var placeLabels = null;
var isis = null;
var isPlaying = false;

var format = d3.time.format("%Y-%m");
var labelFormat = d3.time.format("%B");

var showPreviousDate = function() {
    d3.event.stopPropagation();
    isPlaying = false;

    if (currentDate > 0){
        currentDate--;
    }

    renderIsisCities(dates[currentDate]);
}

var showNextDate = function() {
    d3.event.stopPropagation();
    isPlaying = false;

    if (currentDate + 1 < dates.length){
        currentDate++;
    }

    renderIsisCities(dates[currentDate]);
}

var playTimeline = function() {
    if (isPlaying === false){
        return;
    }

    if (currentDate + 1 < dates.length){
        currentDate++;
    } else {
        currentDate = 0;
    }

    renderIsisCities(dates[currentDate]);
    _.delay(playTimeline, 1000);
}

var setLabelActive = function(cities){
    var cityName = null;
    var contested = null;

    cities.each(function(city){
        cityName = city.properties.name;
        contested = city.properties.contested;
        placeLabels.filter(function(d){
            return d.properties.NAME === cityName;
        })
        .attr('class', function(d){
            return contested === 'TRUE' ? 'place-label active contested' : 'place-label active';
        });
    })
}

var setLabelInactive = function(cities){
    var cityName = null;

    cities.each(function(city){
        cityName = city.properties.name;
        placeLabels.filter(function(d){
            return d.properties.NAME === cityName;
        })
        .attr('class', function(d){
            return 'place-label';
        });
    })
}

var renderIsisCities = function(date) {
    var isisData = topojson.feature(mapData, mapData.objects.isis).features;
    var endDate = format.parse(date);

    isisData = isisData.filter(function(d){
        var cityDate = format.parse(d.properties.date);

        if(d.properties.date === ""){
            return false;
        }

        return +cityDate <= +endDate;
    });

    isis = svg.selectAll("circle.place.isis")
        .data(isisData, function(d){
            return d.id;
        });

    isis.attr("class", function(d){
        var classList = "update place isis"
        if (d.properties.contested === "TRUE"){
            classList += " contested";
        }

        return classList;
    });

    isis.enter().append("circle")
        .attr("class", function(d){
            var classList = "enter place isis"
            if (d.properties.contested === "TRUE"){
                classList += " contested";
            }

            return classList;
        })
        .attr("data-date", function(d){ return d.properties.date; })
        .attr("data-name", function(d){ return d.properties.name; })
        .attr("transform", function(d) {
            return "translate(" + projection(d.geometry.coordinates) + ")";
        })
        .attr("r", 30)
        .attr("opacity", 0)
        .transition()
        .duration(400)
        .attr("r", 4)
        .attr("opacity", 1)
        .transition()
        .duration(200)
        .attr("r", 4)
        .call(setLabelActive);

    isis.exit()
        .transition()
        .duration(400)
        .attr("r", 30)
        .attr("opacity", 0)
        .remove()
        .call(setLabelInactive);

    isis.call(setLabelActive);

    svg.selectAll(".current-date")
        .transition()
        .duration(400)
        .attr('x', timeScale(format.parse(dates[currentDate])) + margin.left);

    svg.selectAll(".current-date-label")
        .transition()
        .duration(400)
        .attr('x', timeScale(format.parse(dates[currentDate])) + margin.left + d3.select('.current-date').attr('width') / 2)
        .text(labelFormat(format.parse(dates[currentDate])));

    if (currentDate === 0) {
        $previousButton.attr('class', 'inactive');
    } else {
        $previousButton.attr('class', '');
    }

    if (currentDate === dates.length - 1) {
        $nextButton.attr('class', 'inactive');
    } else {
        $nextButton.attr('class', '');
    }
}

var renderMap = function(width){
    var width = width < 660 ? width : 660;

    aspectHeight = width <= 320 ? 6 : 4.5;
    // console.log(aspectHeight);
    var height = Math.ceil((width * aspectHeight) / aspectWidth);

    d3.select('svg').remove();

    svg = d3.select("#map").append("svg")
       .attr("width", width)
       .attr("height", height);

   timeScale = d3.time.scale()
       .domain([firstDate, lastDate])
       .rangeRound([0, width - margin.left - margin.right ]);

    var topology = mapData;

    projection = d3.geo.mercator()
       .center([42, 33.8])
       .scale(width * 4)
       .translate([width / 2, height / 2]);;

    var path = d3.geo.path()
       .projection(projection)
       .pointRadius(4);

    var tile = d3.geo.tile()
       .scale(projection.scale() * 2 * Math.PI)
       .size([width, height])
       .translate(projection([0, 0]))
       .zoomDelta(Math.ceil((window.devicePixelRatio || 1)));

    var tiles = tile();
    var defs = svg.append("defs");

    var timeFormat = d3.time.format.multi([
        [".%L", function(d) { return d.getMilliseconds(); }],
        [":%S", function(d) { return d.getSeconds(); }],
        ["%I:%M", function(d) { return d.getMinutes(); }],
        ["%I %p", function(d) { return d.getHours(); }],
        ["%a %d", function(d) { return d.getDay() && d.getDate() != 1; }],
        ["%b %d", function(d) { return d.getDate() != 1; }],
        ["%b", function(d) { return d.getMonth(); }],
        ["%Y", function() { return true; }]
    ]);

    var timeScaleBar = d3.svg.axis()
        .scale(timeScale)
        .orient('bottom')
        .ticks(d3.time.months, 1)
        .tickFormat(function(d){
            if (d.getMonth() === 0){
                return timeFormat(d)
            }
        });

    defs.append("path")
        .attr("id", "land")
        .datum(topojson.feature(topology, topology.objects.countries))
        .attr("d", path);

    svg.append("g")
        .selectAll("image")
            .data(tiles)
        .enter().append("image")
            .attr("xlink:href", function(d) { return "http://" + ["a", "b", "c", "d"][Math.random() * 4 | 0] + ".tiles.mapbox.com/v3/npr.b7dmfgvi,npr.lkkv5cdi/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
            .attr("width", Math.ceil(tiles.scale))
            .attr("height", Math.ceil(tiles.scale))
            .attr("x", function(d) { return Math.round((d[0] + tiles.translate[0]) * tiles.scale); })
            .attr("y", function(d) { return Math.round((d[1] + tiles.translate[1]) * tiles.scale); });

    svg.append("use")
            .attr("xlink:href", "#land")
            .attr("class", "stroke");

    svg.selectAll(".country-label")
            .data(topojson.feature(topology, topology.objects.countries).features)
        .enter().append("text")
            .attr("class", "country-label")
            .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
            .attr("dy", function(d){
                return d.properties.NAME === 'Iraq' ? "3em" : "1em";
            })
            .attr("dx", "-2em")
            .text(function(d) { return d.properties.NAME; });

    svg.append("path")
        .datum(topojson.feature(topology, topology.objects.places))
        .attr("d", path)
        .attr("class", "place");

    placeLabels = svg.selectAll(".place-label")
            .data(topojson.feature(topology, topology.objects.places).features)
        .enter().append("text")
            .attr("class", "place-label")
            .attr("transform", function(d) { return "translate(" + projection(d.geometry.coordinates) + ")"; })
            .attr("dy", "0.3em")
            .attr("dx", function(d) {
                if (_.contains(LEFT_ALIGNED_LABELS, d.properties.NAME)){
                    return '-1em'
                } else {
                    return '1em'
                }
            })
            .attr("text-anchor", function(d) {
                if (_.contains(LEFT_ALIGNED_LABELS, d.properties.NAME)){
                    return 'end'
                }
            })
            .text(function(d) {
                return LABEL_DICT[d.properties.NAME]||d.properties.NAME;
            });

    svg.append('text')
        .attr('class', 'river-label')
        .attr('transform', function(){
            return 'translate(' + projection([39.569939, 35.204781]) + ') rotate(45)';
        })
        .attr('text-anchor', 'start')
        .text('Euphrates');

    svg.append('text')
        .attr('class', 'river-label')
        .attr('transform', function(){
            return 'translate(' + projection([43.519011, 35.828745]) + ') rotate(80)';
        })
        .attr('text-anchor', 'start')
        .text('Tigris');

    svg.append('g')
        .attr('class', 'timescale')
        .attr('transform', 'translate(' + margin.left + ',' + 30 + ')')
        .call(timeScaleBar);

    svg.append('rect')
        .attr('class', 'current-date')
        .attr('height', 5)
        .attr('width', function(){
            return Math.ceil((width - margin.left - margin.right) / (svg.selectAll('.timescale .tick')[0].length - 1));
        })
        .attr('x', timeScale(format.parse(dates[currentDate])) + margin.left)
        .attr('y', 25)
        .attr('r', 5);

    svg.append('text')
        .attr('class', 'current-date-label')
        .attr('x', timeScale(format.parse(dates[currentDate])) + margin.left + d3.select('.current-date').attr('width') / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .text(labelFormat(format.parse(dates[currentDate])));

    if ( "MozAppearance" in document.documentElement.style ) {
        svg.attr('class', 'fix-image-scale');
    }

    _.delay(function(){
        renderIsisCities(dates[currentDate]);
    }, 500);

    _.delay(function() {
        isPlaying = true;

        playTimeline();
    }, 1500);
}

var $nextButton = d3.select("#next").on("click", showNextDate);
var $previousButton = d3.select("#previous").on("click", showPreviousDate);

d3.json("data/iraq_syria.json", function(error, topology) {
    mapData = topology;

    dates = _.chain(topojson.feature(topology, topology.objects.isis).features)
                .map(function(feature){return feature.properties.date})
                .reject(function(date){ return date === "" })
                .uniq().sortBy(function(date){ return date })
                .value();

    firstDate = format.parse(dates[0]);
    lastDate = format.parse(dates[dates.length - 1]);
    lastDate.setMonth( lastDate.getMonth() + 1);

    pymChild = new pym.Child({
        renderCallback: renderMap
    });
});

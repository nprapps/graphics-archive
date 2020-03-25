var ANALYTICS = require("./lib/analytics");
var DEFAULT_WIDTH = 300;
var GEO_DATA_URL = 'data/cb_2017_us.json';
var { COLORS, classify } = require("./lib/helpers");

var pym = require("./lib/pym");
var pymChild = null;
var { isMobile } = require("./lib/breakpoints");
require("./lib/webfonts");

var d3 = {
  ...require("d3-fetch/dist/d3-fetch.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-geo-projection/dist/d3-geo-projection.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-scale-chromatic/dist/d3-scale-chromatic.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var debounce = require("./lib/debounce");
var topojson = require("topojson-client");

var geodata = [];

/*
 * Initialize the graphic
 */
var onWindowLoaded = function() {
  // load geojson
  d3.json(GEO_DATA_URL).then(function(data) {
      geoData = data;
      render();
  });

  window.addEventListener("resize", debounce(render, 100));

  pym.then(function(child) {
    pymChild = child;
    pymChild.sendHeight();

    pymChild.onMessage("on-screen", function(bucket) {
      ANALYTICS.trackEvent("on-screen", bucket);
    });
    pymChild.onMessage("scroll-depth", function(data) {
      data = JSON.parse(data);
      ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
    });
  });
};


/*
 * Initially render the graphic
 */
var render = function() {
  console.log('render');
  var container = ".graphic";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  element.innerHTML = '';

  var graphicWidth = width;
  var gutterWidth = 22;

  if (!isMobile.matches) {
    graphicWidth = Math.floor((width - (gutterWidth * 2)) / 3);
  }

  var cats = [...new Set(CATEGORIES.map(value => value.category))];

  cats.forEach(function(d,i) {
    var catElement = d3.select(container).append('div')
      .attr('class', 'cat ' + classify(d));

    catElement.append('h3')
      .text(d);

    var catCounter = 0;
    CATEGORIES.forEach(function(v,k) {
      if (v.category == d) {
        var mapElement = catElement.append('div')
          .attr('class', 'map m-' + classify(v.title));

        if (!isMobile.matches) {
          mapElement.attr('style', function() {
            var s = '';
            s += 'width: ' + graphicWidth + 'px; ';
            s += 'float: left; ';
            if (catCounter > 0) {
              s += 'margin-left: ' + gutterWidth + 'px; ';
            }
            return s;
          })
        }

        mapElement.append('h3')
          .text(v.title)

        // Render the map!
        renderCountyMap({
          container: '.map.m-' + classify(v.title),
          data: DATA,
          dataColumn: v.data_column,
          geoData,
          width: graphicWidth
        });

        catCounter++;
      }
    })
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

var renderCountyMap = function(config) {
  var aspectWidth = 2;
  var aspectHeight = 1.25;

  var chartWrapper = null;
  var chartElement = null;

  var dataColumn = config.dataColumn;

  // var colorScale = d3.scaleThreshold()
  //   .domain([ -25000, 0, 25000, 50000, 75000, 100000, 125000, 150000, 175000, 200000, 300000  ]) // input value ranges
  //   .range([ '#fedfb4','#ffffe0','#d9e6cd','#b4cfba','#91b6a7','#6f9e93','#51867f','#336e6a','#1a5755','#0b403f' ]);
  //   // http://gka.github.io/palettes/#diverging|c0=darkred,deeppink,#E38D2C,lightyellow|c1=lightyellow,#17807E,#0B403F|steps=17|bez0=1|bez1=1|coL0=1|coL1=1

  var colorScale = d3.scaleSequential()
    .domain([ -200000, 200000  ]) // input value ranges
    .interpolator(d3.interpolateRdYlGn);


  /*
   * Extract topo data.
   */
  var topoData = [];
  for (var key in config.geoData.objects) {
      topoData[key] = topojson.feature(config.geoData, config.geoData.objects[key]);
  }

  // Calculate actual map dimensions
  var mapWidth = config['width'];
  var mapHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth);
  var scaleFactor = mapWidth / (geoData['bbox'][2] + 1);

  /*
   * Create the map path. Projection is null (other than for scaling) b/c we projected this already in Mapshaper
   * Scaling help via: https://stackoverflow.com/a/41230426
   */
  function scale(scaleFactor) {
    return d3.geoTransform({
      point: function(x, y) {
        this.stream.point(x * scaleFactor, y * scaleFactor);
      }
    });
  }
  var path = d3.geoPath(scale(scaleFactor));

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config['container']);
  // containerElement.html('');

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement.append('div')
    .attr('class', 'graphic-wrapper');

  var mapElement = containerElement.append('svg')
    .attr('width', mapWidth)
    .attr('height', mapHeight)
    .append('g')
    .attr('transform', 'translate(0,0)');

  /*
   * Render counties.
   */
  mapElement.append('g')
    .attr('class', 'counties')
    .selectAll('path')
    .data(topoData.cb_2017_us_county_5m.features)
    .enter()
      .append('path')
        .attr('d', path)
        .attr('class', function(d) {
          return 'c-' + d.id;
        })
        .attr('fill', function(d, i) {
          var val = Number(config.data[d.id][dataColumn]);

          // if (i == 20) {
          //   console.log("county: " + d.id, "value: " + config.data[d.id][dataColumn]);
          //   console.log(val);
          // }

          if (val == undefined || val == '0') {
            // console.log('val undefined');
            return '#eee';
          } else {
            return colorScale(val);
          }
        });

  mapElement.append('g')
    .attr('class', 'states')
    .selectAll('path')
    .data(topoData.cb_2017_us_state_5m.features)
    .enter()
      .append('path')
        .attr('d', path)
        .attr('class', function(d) {
          return 's-' + d.id;
        });
}

var updateColors = function(mapObj, dataColumn) {

}

var sizeMap = function(mapObj, mapWidth) {
  console.log("sizeMap", mapObj, mapWidth);
}


/*
 * Resize an already-rendered graphic
 */
var onResize = function() {
  console.log('onResize');
  sizeMap(d3.select('svg'), document.querySelector('.graphic').offsetWidth);
}


// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

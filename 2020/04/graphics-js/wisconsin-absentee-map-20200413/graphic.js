var pym = require('./lib/pym');
var ANALYTICS = require('./lib/analytics');
require('./lib/webfonts');
var { isMobile } = require('./lib/breakpoints');

// DATA
// geo data
// var geo_data_pre = require('./assets/worked/outputmil.json');
// var geo_names = require('./assets/worked/wisc_places.json');

var { COLORS, wrapText, fmtComma } = require('./lib/helpers');
var d3 = {
  ...require('d3-array/dist/d3-array.min'),
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-geo/dist/d3-geo.min'),
  ...require('d3-fetch/dist/d3-fetch.min'),
};

// Constants
var colorScheme = [
  COLORS.orange1,
  COLORS.orange2,
  COLORS.orange3,
  COLORS.orange4,
  COLORS.orange5,
].reverse();
var mainProperty = 'aa410_No_1';
var pymChild;

//Initialize graphic
var onWindowLoaded = function () {
  render();
  window.addEventListener('resize', render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function () {
  var container = '#map-container';
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderLegend(container);
  // Uncomment me to run d3 to create the original png
  // renderMap({
  //   container,
  //   width,
  //   data: geo_data_pre,
  // });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderLegend = function (container) {
  var containerElement = d3.select(container);

  var categories;
  if (COPY.legend_labels && COPY.legend_labels !== '') {
    // If custom legend labels are specified
    categories = COPY.legend_labels.split('|').map(l => Number(l.trim()));
  }

  // Create legend
  var legendWrapper = containerElement.select('.key-wrap');
  var legendElement = containerElement.select('.key');
  legendElement.html('');

  var colorScale;
  legendWrapper.classed('numeric-scale', true);

  var colorScale = d3.scaleThreshold().domain(categories).range([
    '#000', // color that's not actually being used
    COLORS.orange5,
    COLORS.orange4,
    COLORS.orange3,
    COLORS.orange2,
    COLORS.orange1,
  ]);

  colorScale.domain().forEach(function (key, i) {
    var keyItem = legendElement.append('li').classed('key-item', true);

    keyItem.append('b').style('background', colorScale(key));

    var keyVal = Number(key);

    keyItem.append('label').text(fmtComma(keyVal));

    // Add the optional upper bound label on numeric scale
    if (i == categories.length - 1) {
      if (COPY.max_label && COPY.max_label !== '') {
        keyItem.append('label').attr('class', 'end-label').text(COPY.max_label);
      }
    }
  });
};

var renderMap = function (config) {
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 50,
    right: 0,
    bottom: 10,
    left: 0,
  };

  var radiusMax = 30;
  var radiusMin = 1;

  // Mobile params
  if (isMobile.matches) {
    radiusMax = 15;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  // containerElement.html("");

  // Create param functions like projection, scales, etc.
  var projection = d3
    .geoMercator()
    .center([-89.94, 44.5])
    .translate([chartWidth / 2, chartHeight / 2]) // translate to center of screen
    .scale(config.width * 5.15);

  var geojson = topojson.feature(config.data, config.data.objects.outputmil);
  var path = d3.geoPath().projection(projection);

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
    .attr('transform', `translate(${margins.left},${margins.top})`);

  // Render Map!
  chartElement
    .selectAll('counties')
    .data(geojson.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('class', 'vertical-stripes')
    .attr('stroke', COLORS.orange4)
    .attr('stroke-width', 0.5)
    .attr('fill', function (d) {
      var percent = Number(d.properties['aa410.PerR']);
      return getFill(percent);
    });


  chartElement
    .selectAll("circle.bubble")
    .data(
      geo_names.features
    )
    .enter()
    .append("circle")
    .attr("class", "bubble")
    .attr("r", 4)
    .attr("transform", function(d) {
      return "translate(" + path.centroid(d) + ")";
    })

  var textGroups = chartElement
    .selectAll('g.labelGroup')
    .data(geo_names.features)
    .enter()
    .append('g')
    .attr('class', 'labelGroup')
    .attr('transform', function (d) {
      return 'translate(' + path.centroid(d) + ')';
    });

  textGroups
    .append('text')
    .attr('class', 'label secondary')
    .attr('dy', 5)
    .attr('dx', function(d) {
      if (d.properties.NAME == 'Madison') {
        return -115;
      }
      return 5;
    })
    .text(d => d.properties.NAME);


};

// Gets the center for an geography.
function getCenter(d, projection) {
  var center = projection(d3.geoCentroid(d));

  // Add necessary special casing here.
  return center;
}

function getFill(percent) {
  var index = Math.floor((colorScheme.length - 1) * percent);
  // console.log(index);
  if (index < 0 || index > colorScheme.length - 1 || isNaN(percent)) {
    return '#dfdfdf';
  }
  return colorScheme[index];
}

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

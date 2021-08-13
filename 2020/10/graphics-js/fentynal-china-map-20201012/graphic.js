var pym = require('./lib/pym');
require('./lib/webfonts');
var { isMobile } = require('./lib/breakpoints');

console.clear();

// geo data
var geo_data = [];
var nameProperty = 'NAME';

var path;
var chartElement;
var chartWrapper;
var chartWidth;
var chartHeight;

var pymChild;

var { fmtComma } = require('./lib/helpers');
var d3 = {
  ...require('d3-array/dist/d3-array.min'),
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-geo/dist/d3-geo.min'),
  ...require('d3-geo-projection/dist/d3-geo-projection.min'),
  // ...require("d3-transition/dist/d3-transition.min")
};

//Initialize graphic
var onWindowLoaded = async function () {
  var response = await fetch('./assets/worked/countries_filtered.json');
  geo_data = await response.json();

  render();

  window.addEventListener('resize', render);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = async function () {
  var container = '#map-container';
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  renderMap({
    container,
    width,
    data: geo_data,
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderMap = function (config) {
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 3 : 9;

  var margins = {
    top: 30,
    right: 0,
    bottom: 10,
    left: 0,
  };

  // Calculate actual chart dimensions
  chartWidth = config.width - margins.left - margins.right;
  chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html('');

  // Create Robinson projection of world.
  var projection = d3
    .geoRobinson()
    .translate([chartWidth / 1.75, chartHeight / 1.75]) // translate to center of screen
    .scale(config.width)
    .center([ 107.490240, 33.319385]);

  var detailProjection = d3
    .geoRobinson()
    .translate([chartWidth / 5.25, chartHeight / 5.25]) // translate to center of screen
    .scale(config.width / 4.6)
    .center([107.490240, 33.319385]);

  path = d3.geoPath().projection(projection);

  var detailPath = d3.geoPath().projection(detailProjection);

  // Create the root SVG element.
  chartWrapper = containerElement
    .append('div')
    .attr('class', 'graphic-wrapper');

  chartElement = chartWrapper
    .append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
    .attr('transform', `translate(${margins.left},${margins.top})`);

  // Create the root SVG element.
  detailWrapper = containerElement
    .append('div')
    .attr('class', 'detail-wrapper');

  detailElement = detailWrapper
    .append('svg')
    .attr('width', (chartWidth + margins.left + margins.right) / 3.25)
    .attr('height', (chartWidth + margins.left + margins.right) / 4.25)
    .append('g');

  var detailHeight = (chartWidth + margins.left + margins.right) / 5.5;
  var detailWidth = (chartHeight + margins.top + margins.bottom) / 5.5;

  detailElement
    .selectAll('.countries')
    .data(config.data.features)
    .enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', detailPath);

  // Render Map
  chartElement
    .selectAll('.countries')
    .data(config.data.features)
    .enter()
    .append('path')
    .attr('class', 'country')
    .attr('d', path);

  chartElement
    .selectAll('circle')
    .data(LABELS)
    .enter()
    .append('circle')
    .attr('class', 'place-circle')
    .attr('transform', function (d) {
      return `translate(${projection([d['long'], d['lat']])})`;
    })
    .attr('r', '3px');

  chartElement
    .selectAll('text')
    .data(LABELS)
    .enter()
    .append('text')
    .attr('transform', function (d) {
      return `translate(${projection([d['long'], d['lat']])})`;
    })
    .attr('class', function (d) {
      return 'label ' + d['country'];
    })
    .attr('dy', function (d) {
      return d['offset_y'];
    })
    .attr('dx', function (d) {
      return d['offset_x'];
    })
    .text(function (d) {
      return d['name'];
    });

  var showNames = ['China', "Mongolia", "North Korea"]

  var textGroups = chartElement
    .selectAll('g.labelGroup')
    .data(config.data.features)
    .enter()
    .append('g')
    .attr('class', 'label country')
    .attr('transform', function (d) {
      return `translate(${getCenter(d, projection)})`;
    })
    .append('text')
    .attr('dy', 5)
    .attr('dx', 5)
    .text(function (d) {
      if (!showNames.includes(d.properties['NAME'])) {
        return;
      }
      return d.properties['NAME'];
    });

    // FIX ME
  var detailsPoints = [[107.490240, 33.319385]]; 

  var rects = detailElement
    .selectAll('detail-rect')
    .data(detailsPoints)
    .enter()
    .append('rect')
    .attr('x', function (d) {
      return detailProjection(d)[0] - detailHeight / 2;
    })
    .attr('y', function (d) {
      return detailProjection(d)[1] - detailWidth / 2;
    })
    .attr('width', detailHeight)
    .attr('height', detailWidth)
    .attr('fill', 'none')
    .attr('stroke', '#D8472B');
};

// Gets the center for an geography.
function getCenter(d, projection) {
  var center = projection(d3.geoCentroid(d));

  // Necessary special cases for Country name display
  if (d.properties[nameProperty] == 'China') {
    center[0] = center[0] - chartWidth * 0.03;
  }
  if (d.properties[nameProperty] == 'Russia') {
    center[0] = center[0] + chartWidth * 0.4;
    center[1] = center[1] + chartWidth * 0.09;
  }
  if (d.properties[nameProperty].includes('Korea')) {
    center[0] = center[0] - chartWidth * 0.08;
  }

  if (d.properties[nameProperty] == 'Mongolia') {
    center[0] = center[0] - chartWidth * 0.07;
  }
  return center;
}

// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

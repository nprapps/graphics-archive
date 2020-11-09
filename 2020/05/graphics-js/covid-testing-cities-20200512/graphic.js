var pym = require('./lib/pym');
var ANALYTICS = require('./lib/analytics');
require('./lib/webfonts');
var { isMobile } = require('./lib/breakpoints');
var $ = require('./lib/qsa');

console.clear();

var {
  getTimeStamp,
  arrayToObject,
  isPlural,
  getData,
  updateTime,
  geoAlbersUsaPr,
} = require('./util');

var disableTooltips = false;
var maxTooltipWidth = 125;
var includeCounties = false;

var pymChild;

var {
  COLORS,
  getAPMonth,
  classify,
  makeTranslate,
  wrapText,
  fmtComma,
} = require('./lib/helpers');

var colorScheme = [
  COLORS.blue1,
  COLORS.blue2,
  COLORS.blue3,
  COLORS.blue4,
  COLORS.blue5,
  COLORS.blue6,
].reverse();

var d3 = {
  ...require('d3-array/dist/d3-array.min'),
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-geo/dist/d3-geo.min'),
};

// combineData
var combineDataMap = function (data, tracts) {
  // join DATA to geo_data
  var count = 0;
  for (var feature of tracts.objects.dallas.geometries) {
    var matchingData = data.find(
      itmInner => itmInner.FIPS == feature.properties.GEOID_2
    );
    if (matchingData) {
      count += 1;
    }
    feature.properties = { ...matchingData, ...feature.properties };
  }
  return topojson.feature(tracts, tracts.objects.dallas);
};

//Initialize graphic
var getTracts = async function () {
  var response = await fetch('./assets/dallas.json');
  return response.json();
};

var getRoads = async function () {
  var response = await fetch('./assets/i-30.geojson');
  return response.json();
};

var onWindowLoaded = async function () {
  var [city, roads] = await Promise.all([getTracts(), getRoads()]);
  var geoData = combineDataMap(TRACTS, city);
  render(geoData, roads);

  window.addEventListener('resize', () => render(geoData, roads));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function (data, roads) {
  var maps = [
    {
      var: 'MedInc',
      container: '#income-map-container',
      cssClass: 'income',
      color1: '#e38d2c',
      colorMid: '#f7e39b',
      color2: '#51a09e',
    },
    {
      var: 'Percent_White',
      container: '#race-map-container',
      cssClass: 'race',
      color1: '#f3684b',
      colorMid: '#f2e3b4',
      color2: '#c789b9',
    },
  ];

  for (m of maps) {
    var container = m.container;
    var element = document.querySelector(m.container);
    var width = element.offsetWidth;

    renderMap(
      {
        container,
        width,
        data,
      },
      m.var,
      m.color1,
      m.colorMid,
      m.color2,
      m.cssClass,
      roads
    );
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderMap = function (
  config,
  mainProperty,
  color1,
  colorMid,
  color2,
  cssClass,
  roads
) {
  var aspectWidth = isMobile.matches ? 3 : 16;
  var aspectHeight = isMobile.matches ? 2.4 : 12;

  var leftLabelMargin = -5;
  var rightLabelMargin = 5;
  var topLabelMargin = 10;

  var margins = {
    top: 30,
    right: 0,
    bottom: 10,
    left: 0,
  };

  // var nameProperty = includeCounties ? 'NAMELSAD' : 'state_name';

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((config.width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html('');

  // Create param functions like projection, scales, etc. TKTK
  var projection = d3
    .geoMercator()
    .center([-96.74, 32.81])
    .translate([chartWidth / 2, chartHeight / 2])
    .scale(config.width * (isMobile.matches ? 83 : 88)); // scale things up to zoom in on city

  var path = d3.geoPath().projection(projection);

  var values = config.data.features.map(d => d.properties[mainProperty]);
  values = values.filter(x => x != 0);

  var max = Math.max(...values); // set me manually
  var min = Math.min(...values);

  var max = mainProperty == 'Percent_White' ? 100 : 250000;

  var factor = mainProperty == 'Percent_White' ? 10 : 1000;
  var medFactor = mainProperty == 'Percent_White' ? 1 : 100;
  min = Math.floor(min / factor) * factor;
  min = 0;

  var median = values.sort(function (a, b) {
    return a - b;
  })[Math.floor(values.length / 2)];

  // Create label
  var color_scale = d3
    .scaleLinear()
    .domain([min, median, max])
    .range([color1, colorMid, color2]);
  median = Math.floor(median / medFactor) * medFactor;

  if (mainProperty == 'Percent_White') {
    maxDisplay = fmtComma(max) + '%';
    minDisplay = fmtComma(min) + '%';
    medianDisplay = fmtComma(median) + '%';
  } else {
    maxDisplay = '$' + fmtComma(max) + '+';
    minDisplay = '$' + fmtComma(min);
    medianDisplay = '$' + fmtComma(median);
  }
  $.one('.right-label.' + cssClass).innerHTML = maxDisplay;
  $.one('.middle-label.' + cssClass).innerHTML = 'Overall: ' + medianDisplay;
  $.one('.middle-label.' + cssClass).style.left = (median / max) * 100 + '%';
  $.one('.median-line.' + cssClass).style.left = (median / max) * 100 + '%';
  $.one('.left-label.' + cssClass).innerHTML = minDisplay;

  var medianOffset = (median / (max - min)) * 100;
  var gradient =
    'linear-gradient(to right,' +
    color1 +
    ',' +
    colorMid +
    ' ' +
    medianOffset +
    '%,' +
    color2 +
    ')';
  $.one('.key.' + cssClass).style.background = gradient;

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
    .selectAll('.district')
    .data(config.data.features)
    .enter()
    .append('path')
    .attr('class', 'district')
    .attr('fill', function (d) {
      var percent = d.properties[mainProperty];
      if (!percent) {
        return '#ddd';
      }
      return color_scale(percent);
      // return pickHex(color1, color2, percent / max, median/max);
    })
    .attr('d', path)
    .attr('stroke', 'none');

  // Add in I-30
  chartElement
    .selectAll('.roads')
    .data(roads.features)
    .enter()
    .append('path')
    .attr('class', 'roads')
    .attr('fill', 'none')
    .attr('d', path)
    .attr('stroke', '#333');

  // Add in testing sites
  chartElement
    .selectAll('circle')
    .data(SITES.filter(d => d.City == 'Dallas, TX'))
    .enter()
    .append('circle')
    .attr('class', 'place-circle')
    .attr('transform', function (d) {
      return `translate(${projection([d['long'], d['lat']])})`;
    })
    .attr('r', '3px')
    .attr('fill', '#333')
    .attr('stroke', '#fff');


  // Add in I-30 label
  var textGroups = chartElement
    .selectAll('g.labelGroup')
    .data([[-96.98, 32.785722]])
    .enter()
    .append('g')
    .attr('class', 'labelGroup')
    .attr('transform', function (d) {
      return `translate(${projection([d[0], d[1]])})`;
    });

  textGroups
    .append('text')
    .attr('class', 'label main')
    .attr('dy', 15)
    .attr('dx', 0)
    .style('font-size', '12px')
    .text('I-30');
};

function pickHex(color1, color2, weight, median) {
  var w2 = weight;
  var w1 = 1 - w2;
  var rgb = [
    Math.round(color1[0] * w1 + color2[0] * w2),
    Math.round(color1[1] * w1 + color2[1] * w2),
    Math.round(color1[2] * w1 + color2[2] * w2),
  ];
  return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
}

function getLabelText(data, label, prop, overrideProp) {
  var number =
    data[overrideProp] > data[prop] ? data[overrideProp] : data[prop];

  return `${fmtComma(number)} ${label}${isPlural(number)}`;
}

// Gets the center for an geography.
function getCenter(d, projection) {
  var center = projection(d3.geoCentroid(d));

  // Add necessary special casing here.
  return center;
}

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

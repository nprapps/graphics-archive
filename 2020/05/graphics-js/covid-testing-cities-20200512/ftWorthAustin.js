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
var combineDataMap = function (data, tracts, name) {
  // join DATA to geo_data
  var count = 0;
  for (var feature of tracts.objects[name].geometries) {
    var matchingData = data.find(
      itmInner => itmInner.FIPS == feature.properties.GEOID_2
    );
    if (matchingData) {
      count += 1;
    }
    feature.properties = { ...matchingData, ...feature.properties };
  }
  return topojson.feature(tracts, tracts.objects[name]);
};

//Initialize graphic
var getFortWorth = async function () {
  var response = await fetch('./assets/Fort-Worth.json');
  return response.json();
};

var getAustin = async function () {
  var response = await fetch('./assets/Austin.json');
  return response.json();
};

var getElPaso = async function () {
  var response = await fetch('./assets/El-Paso.json');
  return response.json();
};

var onWindowLoaded = async function () {
  // replace "csv" to load from a different source
  // var geoStates = await Promise.resolve(getGeo());
  var cities = await Promise.all([getFortWorth(), getAustin(), getElPaso()]);
  var cityNames = ['Fort-Worth', 'Austin', 'El-Paso']

  var finalData = []
  for (i = 0; i < cities.length; i++) {
    finalData.push(combineDataMap(TRACTS, cities[i], cityNames[i]));
  }

  var coordinates = [[ -97.314079, 32.787801], [ -97.767859, 30.315761], [-106.465067,31.803824]]
  
  renderAll(finalData, coordinates, cityNames);

  window.addEventListener('resize', () => renderAll(finalData, coordinates, cityNames));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var renderAll = function(allData, coordinates, cityNames) {
  var testingNames = ['Fort Worth, TX', 'Austin, TX', 'El Paso, TX']
  for (i = 0; i < allData.length; i++) {
    render(allData[i], coordinates[i], cityNames[i], testingNames[i]);
  }
}

var render = function (data, coordinates, cityName, testingName) {
  var maps = [
    // { var: 'MedInc', container: '#income-map-container', cssClass: "income", color1: '#e38d2c', colorMid: '#f7e39b', color2: '#51a09e'},
    { var: 'Percent_White', container: '#race-map-container', cssClass: "race", color1: '#f3684b', colorMid: '#f2e3b4', color2: '#c789b9'},
  ];

  // Add header here?

  for (m of maps) {
    var childContainer = m.container;
    var element = document.querySelector(m.container);
    var width = element.offsetWidth;

    renderMap(
      {
        cityName,
        childContainer,
        width,
        data,
        testingName,
      },
      m.var,
      m.color1,
      m.colorMid,
      m.color2,
      m.cssClass,
      coordinates,
    );
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderMap = function (config, mainProperty, color1, colorMid, color2, cssClass, coordinates) {
  var aspectWidth = isMobile.matches ? 3 : 16;
  var aspectHeight = isMobile.matches ? 2 : 12;

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
  var wrapperElement = d3.select('#' + config.cityName);
  var containerElement = wrapperElement.select(config.childContainer);
  containerElement.html('');

  // Create param functions like projection, scales, etc. TKTK
  var projection = d3
    .geoMercator()
    .center(coordinates)
    .translate([chartWidth / 2, chartHeight / 2])
    .scale(config.width * ((config.cityName == "Fort-Worth") ? 65 : 75)); // scale things up to zoom in on city

  var path = d3.geoPath().projection(projection);

  var values = config.data.features.map(d => d.properties[mainProperty]);
  values = values.filter(x => x != 0)

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

  if (mainProperty == "Percent_White") {
    maxDisplay = fmtComma(max) + '%';
    minDisplay = fmtComma(min)+ '%';
    medianDisplay = fmtComma(median)+ '%';
  } else {
    maxDisplay = '$' + fmtComma(max) + '+';
    minDisplay = '$' + fmtComma(min);
    medianDisplay = '$' + fmtComma(median);
  }
  wrapperElement.select('.right-label.' + cssClass).text(maxDisplay);
  wrapperElement.select('.middle-label.' + cssClass).text('Overall: ' + medianDisplay);
  wrapperElement.select('.middle-label.' + cssClass).style('left', median/max * 100 + ((config.cityName == "El-Paso") ? 8 : 0) + '%');
  wrapperElement.select('.median-line.' + cssClass).style('left', median/max *100 + '%');
  wrapperElement.select('.left-label.' + cssClass).text(minDisplay);

  var medianOffset = median/(max-min) * 100;
  var gradient = 'linear-gradient(to right,' + color1 + ',' + colorMid + ' ' +  medianOffset + '%,' + color2 + ')';
  console.log(gradient);
  wrapperElement.select('.key.' + cssClass).style('background', gradient);
  // renderLegend(config.container, min, max);

  // Create legend TKTK

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

  // add in tooltip for individual state display.
  // var tooltip = d3
  //   .select('#map-container')
  //   .append('div')
  //   .attr('id', 'tooltip')
  //   .style('position', 'absolute')
  //   .style('z-index', '10')
  //   .style('visibility', 'hidden')
  //   .style('background', '#fff')
  //   .text('');
  // var mainTooltipLabel = tooltip.append('div').attr('class', 'label main');
  // var secondaryTooltipLabel = tooltip.append('div').attr('class', 'label secondary');

  // Render Map!
  // states or counties depending on includeCounties bool
  chartElement
    .selectAll('.district')
    .data(config.data.features)
    .enter()
    .append('path')
    .attr('class', 'district')
    .attr('fill', function (d) {
      var percent = d.properties[mainProperty];
      if (!percent) {
        return '#ddd'
      }
      return color_scale(percent)
      // return pickHex(color1, color2, percent / max, median/max);
    })
    .attr('d', path)
    .attr('stroke', 'none');
  // .on('mousemove', function (d) {
  //   // Don't do tooltips on mobile.
  //   if (isMobile.matches || disableTooltips) {
  //     return;
  //   }

  //   // Update labels here
  //   mainTooltipLabel.text(d.properties[nameProperty]);
  //   secondaryTooltipLabel.text(d.properties[mainProperty]);

  //   // Set tooltip positions. If tooltip too far to the right, move
  //   // to lefthand side of state.
  //   var coordinates= d3.mouse(this);
  //   var x = coordinates[0];
  //   var y = coordinates[1];

  //   tooltip.style('top', y + 5 + 'px');

  //   var element = tooltip.node();
  //   var tooltipWidth = element.getBoundingClientRect().width;
  //   var offset = x + 5;
  //   if (offset >= chartWidth - maxTooltipWidth) {
  //     offset = x - 5 - tooltipWidth;
  //   }
  //   tooltip.style('left', offset + 'px');

  //   return tooltip.style('visibility', 'visible');
  // })
  // .on('mouseout', function () {
  //   return tooltip.style('visibility', 'hidden');
  // });

  // Add in state outlines if include counties is true

  chartElement
    .selectAll('circle')
    .data(SITES.filter(d => d.City == config.testingName))
    .enter()
    .append('circle')
    .attr('class', 'place-circle')
    .attr('transform', function (d) {
      return `translate(${projection([d['long'], d['lat']])})`;
    })
    .attr('r', '3px')
    .attr('fill', '#333')
    .attr('stroke', '#fff');
};

function pickHex(color1, color2, weight, median) {
    var w2 = weight;
    var w1 = 1 - w2;
    var rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
        Math.round(color1[1] * w1 + color2[1] * w2),
        Math.round(color1[2] * w1 + color2[2] * w2)];
    return 'rgb('+ rgb[0] + ',' + rgb[1]+ ',' + rgb[2] +')';
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

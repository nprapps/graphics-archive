var pym = require('./lib/pym');
var ANALYTICS = require('./lib/analytics');
require('./lib/webfonts');
var { isMobile } = require('./lib/breakpoints');
var $ = require('./lib/qsa');

console.clear();

var { getTimeStamp, arrayToObject, isPlural, getData, updateTime, geoAlbersUsaPr } = require("./util");

var labelSide = function(d) {
  if (d == "right") {
    return 1;
  } else {
    return -1;
  }
};

var maxTooltipWidth = 200;

var mainProperty = 'confirmed';

var pymChild;

var {
  COLORS,
  getAPMonth,
  classify,
  makeTranslate,
  wrapText,
  fmtComma,
} = require('./lib/helpers');

var d3 = {
  ...require('d3-array/dist/d3-array.min'),
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-geo/dist/d3-geo.min'),
};

// combineData
var combineDataMap = function (data, geo) {
  // join DATA to geo_data
  var merged = [];
  for (var feature of geo.features) {
    merged.push({
      ...feature,
      ...data.find(itmInner => itmInner.state === feature.properties.name),
    });
  }
  return merged;
};


//Initialize graphic
var getGeo = async function () {
  var response = await fetch('./assets/worked/states_filtered.json');
  return response.json();
};

var onWindowLoaded = async function () {
  // replace "csv" to load from a different source
  var [jhu, geo] = await Promise.all([getData('json'), getGeo()]);

  var { data, updated } = jhu;
  if (updated) {
    var timestamp = getTimeStamp(updated);
    updateTime(timestamp);
  }

  var processed = combineDataMap(data, geo);

  render(processed);
  console.log(processed);

  window.addEventListener('resize', () => render(processed));

  $.one('.controls').addEventListener('change', () => render(processed));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function (data) {
  var container = '#map-container';
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var selected = $.one(`input[type=radio]:checked`);

  renderMap(
    {
      container,
      width,
      data,
    },
    selected.value
  );

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderMap = function (config, mainProperty) {
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 2.6 : 9;

  var usmidPoint = config.width;
  var leftLabelMargin = -5;
  var rightLabelMargin = 5;
  var topLabelMargin = 10;

  var margins = {
    top: 30,
    right: 0,
    bottom: 30,
    left: 0,
  };

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
  var projection = geoAlbersUsaPr()
    .translate([chartWidth / 2, chartHeight / 2]) // translate to center of screen
    .scale(config.width + 100); // scale things down so see entire US

  var path = d3.geoPath().projection(projection);

  var values = config.data
    // .reduce((acc, d) => acc.concat(d.values), [])
    .map(d => d[mainProperty]);

  var max = Math.max(...values);
  var min = 0;

  var radiusMax = 20;
  var radiusMin = 1;
  var maxLegend = Math.pow(10, Math.floor(Math.log10(max)))
  var legendVals = [maxLegend/100, maxLegend/10, maxLegend]

  // Mobile params
  if (isMobile.matches) {
    radiusMax = 10;
  }


  var radiusFxn = d3.scaleSqrt().domain([0, maxLegend]).range([radiusMin, radiusMax]);

  var bubbleLegend = d3.select('.bubble-legend');


  legendVals.forEach(function(a, i) {
    $.one('.bubble-keys.' + 'b' + i).style.width = Math.round(radiusFxn(a) * 2) + 'px';
    $.one('.bubble-keys.' + 'b' + i).style.height = Math.round(radiusFxn(a) * 2) + 'px';
    if (mainProperty.includes('deaths')) {
      $.one('.bubble-keys.' + 'b' + i).classList.add("deaths");
    } else {
      $.one('.bubble-keys.' + 'b' + i).classList.remove("deaths");
    }

    $.one('.bubble-legend-text.' + 't' + i).innerHTML = fmtComma(a);
  });

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

  // Render Map!
  // states
  chartElement
    .selectAll('.states')
    .data(
      config.data.sort(function (a, b) {
        return a[mainProperty] - b[mainProperty];
      })
    )
    .enter()
    .append('path')
    .attr('class', 'states on')
    .attr('d', path);

  var tooltip = d3.select('#state-tooltip');

  // add in tooltip for individual state display.
  var tooltip = d3
    .select('#map-container')
    .append('div')
    .attr('id', 'state-tooltip')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden')
    .style('background', '#fff')
    .text('');
  var mainTooltipLabel = tooltip.append('div').attr('class', 'label main');
  var tooltipTable = tooltip.append('table').attr('class', 'tooltip-table');
  tooltipTable.append('thead')
    .selectAll('th')
    .data(['', 'Total', 'Per 100,000'])
    .enter()
    .append('th')
    .text(function (d) {
      return d;
    });
  var tBody = tooltipTable.append('tbody');

  // infection bubbles
  chartElement
    .selectAll('circle.bubble')
    .data(
      config.data.sort(function (a, b) {
        return b[mainProperty] - a[mainProperty];
      })
    )
    .enter()
    .append('circle')
    .attr('class', function getBubbleClass() {
      return mainProperty.includes('deaths') ? 'bubble deaths' : 'bubble';
    })
    .attr('r', function (d) {
      if (d[mainProperty] > 0) {
        return radiusFxn(d[mainProperty]);
      } else {
        return radiusFxn(1);
      }
    })
    .attr('transform', function (d) {
      return 'translate(' + path.centroid(d) + ')';
    })
    .on('mouseover', function (d) {
      // Don't do tooltips on mobile.
      if (isMobile.matches) {
        return;
      }
      mainTooltipLabel.text(d.state);
      tBody.text('');

      var confirmed = d['confirmed_override'] || d['confirmed'] || 0;
      var deaths = d['deaths_override'] || d['deaths'] || 0;
      var matrix = [
        {
          label: 'Cases',
          total: fmtComma(confirmed),
          per: fmtComma(d['cases_per_capita']),
        },
        {
          label: 'Deaths',
          total: fmtComma(deaths),
          per: fmtComma(d['deaths_per_capita']),
        },
      ];

      var tr = tBody.selectAll('tr').data(matrix).enter().append('tr');
      var td = tr
        .selectAll('td')
        .data(function (d, i) {
          return Object.values(d);
        })
        .enter()
        .append('td')
        .text(function (d) {
          return d;
        });

      // Set tooltip positions. If tooltip too far to the right, move
      // to lefthand side of state.
      var radius = parseInt(this.getAttribute('r'));
      var center = getCenter(d, projection);
      tooltip.style('top', center[1] + 'px');

      var element = tooltip.node();
      var tooltipWidth = element.getBoundingClientRect().width;
      var offset = center[0] + 5 + radius;
      if (offset >= chartWidth - maxTooltipWidth) {
        offset = center[0] - 5 - radius - tooltipWidth;
      }
      tooltip.style('left', offset + 'px');

      return tooltip.style('visibility', 'visible');
    })
    .on('mouseout', function () {
      return tooltip.style('visibility', 'hidden');
    });

  var textGroups = chartElement
    .selectAll('g.labelGroup')
    .data(config.data.filter(d => d.label == true))
    .enter()
    .append('g')
    .attr('class', 'labelGroup')
    .attr('transform', function (d) {
      return 'translate(' + path.centroid(d) + ')';
    });

  textGroups
    .append('text')
    .attr('class', 'label main')
    .attr('dy', 5)
    .attr(
      'dx',
      d =>
        (radiusFxn(d[mainProperty]) + d.label_offsetX) * labelSide(d.labelSide)
    )
    .attr('text-anchor', d => (d.labelSide == 'right' ? 'start' : 'end'))
    .text(d => d.properties.name);

  textGroups
    .append('text')
    .attr('class', 'label secondary cases')
    .attr('dy', 20)
    .attr(
      'dx',
      d =>
        (radiusFxn(d[mainProperty]) + d.label_offsetX) * labelSide(d.labelSide)
    )
    .attr('text-anchor', d => (d.labelSide == 'right' ? 'start' : 'end'))
    .text(function (d) {
      return getLabelText(d, 'case', 'confirmed', 'confirmed_override');
    });

  textGroups
    .append('text')
    .attr('class', 'label secondary deaths')
    .attr('dy', 35)
    .attr(
      'dx',
      d =>
        (radiusFxn(d[mainProperty]) + d.label_offsetX) * labelSide(d.labelSide)
    )
    .attr('text-anchor', d => (d.labelSide == 'right' ? 'start' : 'end'))
    .text(function (d) {
      return getLabelText(d, 'death', 'deaths', 'deaths_override');
    });

  textGroups
    .append('line')
    .attr('class', 'annoLine')
    .attr(
      'x1',
      d =>
        (radiusFxn(d[mainProperty]) + d.label_offsetX - 3) *
        labelSide(d.labelSide)
    )
    .attr('x2', d => (radiusFxn(d[mainProperty]) + 3) * labelSide(d.labelSide))
    .attr('y1', 0)
    .attr('y2', 0);
};

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

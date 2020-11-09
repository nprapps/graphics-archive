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

var disableTooltips = true;
var maxTooltipWidth = 125;

var pymChild;

var {
  COLORS,
  getAPMonth,
  classify,
  makeTranslate,
  wrapText,
  fmtComma,
} = require('./lib/helpers');

var yellowColorScheme = [
  COLORS.yellow4,
  COLORS.yellow6,
  '#fffbeb',
].reverse();

var redColorScheme = [
  COLORS.red2,
  COLORS.red3,
  COLORS.red5,
].reverse();

var categories = [0, 25, 50, 81.3, 100, 125]

var d3 = {
  ...require('d3-array/dist/d3-array.min'),
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-zoom/dist/d3-zoom.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-geo/dist/d3-geo.min'),
};

// combineData
var combineDataMap = function (data, states, counties) {
  // join DATA to geo_data
  for (var feature of counties.objects['counties-lakes'].geometries) {
    var matchingData = data.find(
      itmInner => itmInner.GEOID == feature.properties.GEOID
    );
    feature.properties = { ...matchingData,  ...feature.properties };
  }
  return topojson.feature(counties, counties.objects['counties-lakes']);
};

var getCounties = async function () {
  var response = await fetch('./assets/counties-lakes1.json');
  return response.json();
};

//Initialize graphic
var getStates = async function () {
  var response = await fetch('./assets/states_topo.json');
  return response.json();
};

var onWindowLoaded = async function () {
  // var [states, counties] = await Promise.all([getStates(), getCounties()]);

  // var data = combineDataMap(DATA, states, counties);

  // states = topojson.feature(
  //   states,
  //   states.objects.states_filtered
  // );
  // render(data, states);

  // var lastWidth = window.innerWidth;

  renderLegend();
  window.addEventListener('resize', function(){ 
    if(window.innerWidth!=lastWidth){
      render(data, states);
      lastWidth = window.innerWidth;
   }
   renderLegend();
  });

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function (data, states) {
  var maps = [
    {container: '#counties-wrapper', less: true },
  ];

  var selected = $.one(`input[type=radio]:checked`);

  var counties = DATA.map(a => a.county + ', ' + a.state_abbr);

  for (m of maps) {
    var container = m.container;
    var less = m.less;

    renderMap(
      {
        container,
        data,
      },
      'data',
      states,
      less
    );
  }

  // var oldCounty = $.one("#search") ? $.one("#search").value : '';
  // populateTables(TRUMP, oldCounty, selected.dataset.trump, selected.dataset.biden);

  // $.one("#search").addEventListener("change", function(e) {
  //   var value = $.one("#search") ? $.one("#search").value : '';

  //   if (counties.includes(value)) {
  //     var n = value.split(', ');
  //     var c = n[0].split(' ').join('-') + '-' + n[1].split(' ').join('-');
  //     d3.selectAll('.' + c).attr('class', function(d) {
  //       return 'district ' + c + ' highlight';
  //     })
      
  //   } else {
  //     value = '';
  //   }
  //   populateTables(TRUMP, value, selected.dataset.trump, selected.dataset.biden);
    
  //   if (oldCounty) {
  //       var oldN = oldCounty.split(', ');
  //       var oldC = oldN[0].split(' ').join('-') + '-' + oldN[1].split(' ').join('-');
  //        d3.selectAll('.' + oldC).attr('class', function(d) {
  //         return 'district ' + oldC;
  //       })
  //     }

  //   oldCounty = value;
  //   if (pymChild) {
  //     pymChild.sendHeight();
  //     if (!isMobile.mobile && value != '') {
  //       pymChild.scrollParentToChildEl('trump-wrapper');
  //     }
  //   }
  // })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderLegend = function() {
  min = 0;
  // Temporary
  var median = 81.3;
  var max = 150;

  var color_scale_yellow = d3.scaleLinear().domain([0, 41.2, 82.4]).range(yellowColorScheme);
  var color_scale_red = d3.scaleLinear().domain([82.4, 116.2, 150]).range(redColorScheme);

  maxDisplay = fmtComma(max) + '+';
  minDisplay = fmtComma(min);
  medianDisplay = fmtComma(median);

  $.one('.left-label').style.left = '0%';
  $.one('.right-label').style.left = '100%';
  $.one('.middle-label').style.left = (median / max) * 100 + '%';

  var color1 = '#fffbeb';
  var colorMid = COLORS.red4;
  var color2 = COLORS.red2;

  var midPoint = Math.round((median / max) * 100);
  $.one('.key-first').style.width = midPoint + '%';
  $.one('.key-second').style.width = 100 - midPoint + '%';
}

var renderMap = function (config, mainProperty, states, less) {
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 2.6 : 10;

  var leftLabelMargin = -5;
  var rightLabelMargin = 5;
  var topLabelMargin = 10;

  var margins = {
    top: 30,
    right: 0,
    bottom: 10,
    left: 0,
  };

  var nameProperty = 'NAMELSAD';

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container).select("#map-container");
  var width = containerElement.node().offsetWidth;

  // Calculate actual chart dimensions
  var chartWidth = width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  containerElement.html('');

  // Create param functions like projection, scales, etc. TKTK
  var projection = d3.geoAlbersUsa()
    .translate([chartWidth / 2, chartHeight / 2.5]) // translate to center of screen
    .scale(width + 100); // scale things down so see entire US

  var path = d3.geoPath().projection(projection);

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


  // color_scale.domain().forEach(function(key, i) {
  //   var keyItem = legendElement.append("li").classed("key-item", true);

  //   keyItem.append("b").style("background", color_scale(key));

  //   var keyLabel = key;
  //   keyLabel = fmtComma(keyLabel);
  //   if (key > 0) {
  //     keyLabel = "+" + keyLabel;
  //   }

  //   keyItem.append("label").text(keyLabel);

  //   // Add the optional upper bound label on numeric scale
  //   if (config.isNumeric && i == categories.length - 1) {
  //     if (LABELS.change_max_label && LABELS.change_max_label !== "") {
  //       keyItem
  //         .append("label")
  //         .attr("class", "end-label")
  //         .text(LABELS.change_max_label);
  //     }
  //   }
  // });

  // add in tooltip for individual state display.
  var tooltip = containerElement
    .append('div')
    .attr('id', 'tooltip')
    .style('position', 'absolute')
    .style('z-index', '10')
    .style('visibility', 'hidden')
    .style('background', '#fff')
    .text('');
  var mainTooltipLabel = tooltip.append('div').attr('class', 'label main');
  var secondaryTooltipLabel = tooltip
    .append('div')
    .attr('class', 'label secondary');

  // Render Map!
  // states or counties depending on includeCounties bool
  
  chartElement
    .selectAll('.district')
    .data(config.data.features)
    .enter()
    .append('path')
    .attr('class', function(d) {
      var baseClass = 'district ';
      baseClass = baseClass + d.properties.NAMELSAD.split(' ').join('-') + '-' + getStateAbbr(d.properties.name).split(' ').join('-');
      return baseClass;

    })
    .attr('fill', function (d) {
      if (isNaN(d.properties[mainProperty])) {
        return '#ccc';
      }
      var percent = d.properties[mainProperty] || 0;
      percent = Math.min(percent, 150)
      if (percent >= median) {
        return color_scale_red(percent);
      } else {
        return color_scale_yellow(percent);
      }
      
    })
    .attr('d', path)
    .attr('stroke-width', '.5px')
    .on('mousemove', function (d) {
      // Don't do tooltips on mobile.
      if (isMobile.matches || disableTooltips) {
        return;
      }

      var val = d.properties[mainProperty] || 0;

      // Update labels here
      mainTooltipLabel.text(d.properties[nameProperty] + ", " + getStateAbbr(d.properties["name"]));
      secondaryTooltipLabel.text('$' + fmtComma(parseInt(val.toFixed(0))));
      // Set tooltip positions. If tooltip too far to the right, move
      // to lefthand side of state.
      var coordinates = d3.mouse(this);
      var x = coordinates[0];
      var y = coordinates[1];

      tooltip.style('top', y + 5 + 'px');

      var element = tooltip.node();
      var tooltipWidth = element.getBoundingClientRect().width;
      var offset = x + 10;
      if (offset >= chartWidth - maxTooltipWidth) {
        offset = x - 10 - tooltipWidth;
      }
      tooltip.style('left', offset + 'px');

      return tooltip.style('visibility', 'visible');
    })
    .on('mouseout', function () {
      return tooltip.style('visibility', 'hidden');
    });

  // Add in state outlines if include counties is true

  chartElement
    .selectAll('.states')
    .data(states.features)
    .enter()
    .append('path')
    .attr('class', 'states')
    .attr('stroke', '#777')
    .attr('d', path)
    .attr('fill', 'none');
};

// function populateTables(data, searchValue) {
//   var trumpTable = d3.select('#trump-table-body');
//   var bidenTable = d3.select('#biden-table-body');

//   trumpTable.html('');
//   bidenTable.html('');

//   if (searchValue.length) {
//     searchValue = searchValue.toLowerCase().split(', ');

//      data = data.filter(function(d) {
//       return d.county.toLowerCase() == searchValue[0] && d.state_abbr.toLowerCase() == searchValue[1];
//     })
//   }

//   var bidenData = data.sort(function(a, b){return b.data-a.data}).slice(0, 10);
//   bidenData.forEach(function(row) {
//     bidenTable.append("tr")
//         .html(`
//           <td>${row.county}</td>
//           <td>${row.state }</td>
//           <td>$${fmtComma(parseInt(row.data))}</td>
//         `);
//       });
// }

function getStateAbbr(state) {
  var currState = STATES.filter(x => x.name == state)
  return currState[0].usps;
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

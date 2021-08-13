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

var pymChild;

var {
  COLORS,
  getAPMonth,
  classify,
  makeTranslate,
  wrapText,
  fmtComma
} = require('./lib/helpers');

var bidenColorScheme = [
  COLORS.teal1,
  COLORS.teal2,
  COLORS.teal3,
  COLORS.teal4,
  COLORS.teal5,
  COLORS.teal6,
  "#fff",
  
].reverse();

var trumpColorScheme = [
  COLORS.teal1,
  COLORS.teal2,
  COLORS.teal3,
  COLORS.teal4,
  COLORS.teal5,
  COLORS.teal6,
   "#fff",
].reverse();

var d3 = {
  ...require('d3-array/dist/d3-array.min'),
  ...require('d3-axis/dist/d3-axis.min'),
  ...require('d3-zoom/dist/d3-zoom.min'),
  ...require('d3-scale/dist/d3-scale.min'),
  ...require('d3-selection/dist/d3-selection.min'),
  ...require('d3-geo/dist/d3-geo.min'),
};

// window.Tablesort = require("tablesort");
// require("tablesort/dist/sorts/tablesort.number.min");
// Tablesort(document.querySelector("#state-table"), { descending: true })

// combineData
var combineDataMap = function (trumpData, bidenData, states, counties) {
  // join DATA to geo_data
  for (var feature of counties.objects['counties-lakes'].geometries) {
    var matchingDataTrump = trumpData.find(
      itmInner => itmInner.GEOID == feature.properties.GEOID
    );
    var matchingDataBiden = bidenData.find(
      itmInner => itmInner.GEOID == feature.properties.GEOID
    );
    var bData = matchingDataBiden ? matchingDataBiden['data'] : 0;
    var tData = matchingDataTrump ? matchingDataTrump['data'] : 0;

    var bDataP = matchingDataBiden ? matchingDataBiden['data_pop'] : 0;
    var tDataP = matchingDataTrump ? matchingDataTrump['data_pop'] : 0;
    feature.properties = { 'amountBiden': bData, 'data': tData, 'data_pop' : tDataP, 'amountBidenPer' : bDataP,  ...feature.properties };
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
  // replace "csv" to load from a different source
  // var geoStates = await Promise.resolve(getGeo());
  var [states, counties] = await Promise.all([getStates(), getCounties()]);
  var trumpCounties = counties;
  var bidenCounties = JSON.parse(JSON.stringify(counties));

  var trumpData = combineDataMap(TRUMP, BIDEN, states, trumpCounties);
  // var bidenData = combineDataMap(BIDEN, states, bidenCounties);

  states = topojson.feature(
    states,
    states.objects.states_filtered
  );
  render(trumpData, states);

  var lastWidth = window.innerWidth;
  // $.one('.controls').addEventListener('change', function(){ 
  //     render(trumpData, states);
  //  });
  window.addEventListener('resize', function(){ 
    if(window.innerWidth!=lastWidth){
      render(trumpData, states);
      lastWidth = window.innerWidth;
   }
  });

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function (data, states) {
  var candidates = [
    { dataName: 'trump', container: '#trump-wrapper', colorScheme: trumpColorScheme },
    { dataName: 'biden', container: '#biden-wrapper', colorScheme: bidenColorScheme},
  ];

  var selected = $.one(`input[type=radio]:checked`);

  var counties = TRUMP.map(a => a.county + ', ' + a.state_abbr);
  var countyMenu = d3.select('#counties');
  countyMenu
    .selectAll('option')
    .data(counties)
    .enter()
    .append('option')
    .attr('class', 'county-option')
    .text(d => d)
    .attr('value', d => d);

  for (c of candidates) {
    var container = c.container;
    var dataName = c.dataName;
    var colorScheme =  c.colorScheme;

    // var element = document.querySelector(container);
    // var width = element.offsetWidth;
    renderMap(
      {
        container,
        data,
        colorScheme,
      },
      selected.dataset[dataName],
      states
    );
  }

  var oldCounty = $.one("#search") ? $.one("#search").value : '';
  populateTables(TRUMP, oldCounty, selected.dataset.trump, selected.dataset.biden);

  $.one("#search").addEventListener("change", function(e) {
    var value = $.one("#search") ? $.one("#search").value : '';

    if (counties.includes(value)) {
      var n = value.split(', ');
      var c = n[0].split(' ').join('-') + '-' + n[1].split(' ').join('-');
      d3.selectAll('.' + c).attr('class', function(d) {
        return 'district ' + c + ' highlight';
      })
      
    } else {
      value = '';
    }
    populateTables(TRUMP, value, selected.dataset.trump, selected.dataset.biden);
    
    if (oldCounty) {
        var oldN = oldCounty.split(', ');
        var oldC = oldN[0].split(' ').join('-') + '-' + oldN[1].split(' ').join('-');
         d3.selectAll('.' + oldC).attr('class', function(d) {
          return 'district ' + oldC;
        })
      }

    oldCounty = value;
    if (pymChild) {
      pymChild.sendHeight();
      if (!isMobile.mobile && value != '') {
        pymChild.scrollParentToChildEl('biden-wrapper');
      }
    }
  })

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderMap = function (config, mainProperty, states) {
  console.log(mainProperty)
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
  var projection = geoAlbersUsaPr()
    .translate([chartWidth / 2, chartHeight / 2.5]) // translate to center of screen
    .scale(width + 100); // scale things down so see entire US

  var path = d3.geoPath().projection(projection);

  var values = config.data.features.map(d => d.properties[mainProperty] || 0);
  var max = Math.max(...values); // set me manually
  max = Math.ceil((max + 1) / 100000) * 100000;
  var min = Math.min(...values);
  min = 0;

  var categories = (mainProperty != 'data_pop' && mainProperty != 'amountBidenPer') ? [0, 100, 1000, 10000, 100000, 1000000, 10000000] : [0, 10, 100, 1000, 10000, 25000]

  var color_scale = d3.scaleLinear().domain([ ...categories]).range(config.colorScheme);

  var legendElement = d3.select('.key')
  legendElement.html('')
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


  color_scale.domain().forEach(function(key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem.append("b").style("background", color_scale(key));

    var keyLabel = key;
    if (key >= 1000000) {
      keyLabel = key/1000000 + 'M'
    }
    keyLabel = fmtComma(keyLabel);
    if (key > 0) {
      keyLabel = "+" + keyLabel;
    }

    keyItem.append("label").text(keyLabel);

    // Add the optional upper bound label on numeric scale
    if (config.isNumeric && i == categories.length - 1) {
      if (LABELS.change_max_label && LABELS.change_max_label !== "") {
        keyItem
          .append("label")
          .attr("class", "end-label")
          .text(LABELS.change_max_label);
      }
    }
  });

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
        return '#fff';
      }
      var percent = d.properties[mainProperty] || 0;
      // percent = Math.min(2000000, percent)
      return color_scale(percent);
    })
    .attr('d', path)
    // .attr('stroke', function (d) {
    //   return '#e6e6e6';
    // })
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

function populateTables(data, searchValue, trumpKey, bidenKey) {
  var trumpTable = d3.select('#trump-table-body');
  var bidenTable = d3.select('#biden-table-body');

  trumpTable.html('');
  bidenTable.html('');

  if (searchValue.length) {
    searchValue = searchValue.toLowerCase().split(', ');

     data = data.filter(function(d) {
      return d.county.toLowerCase() == searchValue[0] && d.state_abbr.toLowerCase() == searchValue[1];
    })
  }

  var bidenData = data.sort(function(a, b){return b[bidenKey]-a[bidenKey]}).slice(0, 10);
  bidenData.forEach(function(row) {
    bidenTable.append("tr")
        .html(`
          <td>${row.county}</td>
          <td>${row.state }</td>
          <td>$${fmtComma(parseInt(row.amountBiden))}</td>
          <td>$${fmtComma(parseFloat(row.amountBidenPer.toFixed(2)))}</td>
        `);
      });

  var trumpData = data.sort(function(a, b){return b[trumpKey]-a[trumpKey]}).slice(0, 10);
  trumpData.forEach(function(row) {
    trumpTable.append("tr")
        .html(`
          <td>${row.county}</td>
          <td>${row.state }</td>
          <td>$${fmtComma(parseInt(row.data))}</td>
          <td>$${fmtComma(parseFloat(row.data_pop.toFixed(2)))}</td>
        `);
      });
}

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

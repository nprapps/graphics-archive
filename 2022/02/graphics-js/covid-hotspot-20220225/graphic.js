var topojson = require("topojson-client/dist/topojson-client.min");

require("./lib/webfonts");
// autocomplete input element
require("./autocomplete");

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");
var dot = require("./lib/dot");

var classify = s => s.replace(/[ ,]+/g, "-");

var {monthDay} = require("./lib/helpers/formatDate")

console.clear();

var color_scale;
var pymChild;

var {
  getTimeStamp,
  arrayToObject,
  isPlural,
  getData,
  updateTime,
  geoAlbersUsaPr,
} = require("./util");

var disableTooltips = false;
var maxTooltipWidth = 125;

var {
  COLORS,
  getAPMonth,
  classify,
  makeTranslate,
  wrapText,
  fmtComma,
} = require("./lib/helpers");

// var hospColorScheme = [
//   // "#ccc",
//   COLORS.teal5,
//   COLORS.yellow5,
//   COLORS.red3,
//   // COLORS.red2,
//   "#ccc",
// ];

var hospColorScheme = [
  // "#ccc",
  COLORS.teal5,
  COLORS.yellow4,
  // COLORS.orange3,
  "#db7a4a",
  "#ddd",
];

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-zoom/dist/d3-zoom.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min"),
};

var asOfLabel = '';

// combineData
var combineDataMap = function (hospData, states, counties) {
  // build a lookup
  var mapLookup = new Map();
  for (var item of hospData) {
    mapLookup.set(item.fips_code.toString(), item);
  }

  // join DATA to geo_data
  for (var feature of counties.objects["counties-lakes"].geometries) {
    var { GEOID } = feature.properties;
    var matchingDataHosp = mapLookup.get(GEOID) || {};
    // var data = matchingDataHosp.community_transmission_level;
    var data = matchingDataHosp.covid19_community_level;

    feature.properties = {
      data,
      state_abbr: matchingDataHosp.state_abbr,
      county: matchingDataHosp.County,
      cases: matchingDataHosp.cases_per_100K_7_day_count_change,
      tests:
        matchingDataHosp.percent_test_results_reported_positive_last_7_days,
      ...feature.properties,
    };
  }
  return topojson.feature(counties, counties.objects["counties-lakes"]);
};

var getSyncedFile = async function (filename) {
  var response = await fetch(`./synced/${filename}.json`);
  return response.json();
};

var onWindowLoaded = async function () {
  // replace "csv" to load from a different source
  // var geoStates = await Promise.resolve(getGeo());
  var requests = ["counties-lakes1", "states_topo"].map(getSyncedFile);
  var [counties, states] = await Promise.all(requests);

  var hospData = combineDataMap(HOSP, states, counties);

  var selected = $.one(`input[type=radio]:checked`);
  var oldCounty = $.one("#search") ? $.one("#search").value : "";

  var counties = COUNTIES.map(a => a.NAMELSAD + ", " + getStateAbbr(a.name));
  var countyMenu = d3.select("#counties");
  countyMenu
    .selectAll("option")
    .data(counties)
    .enter()
    .append("option")
    .attr("class", "county-option")
    .text(d => d)
    .attr("value", d => d);

  var searchBox = $.one("#search");

  // var MILLI = 24*60*60*1000;
  // var parts = window.LABELS.latest_date.split('-')
  // var latestDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0);
  // var startDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0);
  // latestDate.setTime(latestDate.getTime() - MILLI);
  // startDate.setTime(startDate.getTime() - (7 * MILLI));
  // $.one('#date-range').innerHTML = `${window.LABELS.subhed} ${monthDay(startDate)}-${monthDay(latestDate)}`;

  // asOfLabel = ` ${monthDay(startDate)}-${monthDay(latestDate)}`;
  // $.one('#table-note').innerHTML = `Data for the week of ${asOfLabel}`;
  // var oldCounty = null;

  searchBox.addEventListener("change", function (e) {
    var value = searchBox.value;

    if (counties.includes(value)) {
      var countyClass = classify(value);
      d3.selectAll("." + countyClass).classed("highlight", true);
    } else {
      value = "";
    }
    populateTables(HOSP, value, selected.dataset.hosp);

    if (oldCounty) {
      var oldClass = classify(oldCounty);
      var [oldName, oldState] = oldCounty.split(", ");
      d3.selectAll("." + oldClass).classed("highlight", false);
    }

    oldCounty = value;
    if (pymChild) {
      pymChild.sendHeight();
      if (!isMobile.matches && value !== "") {
      }
    }
  });

  var lastWidth = window.innerWidth;

  window.addEventListener("resize", function () {
    if (window.innerWidth != lastWidth) {
      render(hospData, states);
      lastWidth = window.innerWidth;
    }
  });

  states = topojson.feature(states, states.objects.states_filtered);
  render(hospData, states);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function (data, states) {
  var candidates = [
    {
      dataName: "hosp",
      container: "#hosp-wrapper",
      colorScheme: hospColorScheme,
    },
  ];

  var selected = $.one(`input[type=radio]:checked`);

  for (var c of candidates) {
    var container = c.container;
    var dataName = c.dataName;
    var colorScheme = c.colorScheme;

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

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderMap = function (config, mainProperty, states) {
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 2.6 : 10;

  var leftLabelMargin = -5;
  var rightLabelMargin = 5;
  var topLabelMargin = 10;

  var margins = {
    top: 30,
    right: 0,
    bottom: 0,
    left: 0,
  };

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container).select("#map-container");
  var width = containerElement.node().offsetWidth;

  // Calculate actual chart dimensions
  var chartWidth = width - margins.left - margins.right;
  var chartHeight =
    Math.ceil((width * aspectHeight) / aspectWidth) -
    margins.top -
    margins.bottom;

  containerElement.html("");

  var increaseScale = isMobile.matches ? 135 : 155;

  // Create param functions like projection, scales, etc. TKTK
  var projection = geoAlbersUsaPr()
    .translate([chartWidth / 2, chartHeight / 2.5]) // translate to center of screen
    .scale(width + increaseScale); // scale things down so see entire US

  var path = d3.geoPath().projection(projection);

  var values = config.data.features.map(d => d.properties[mainProperty] || 0);
  var max = Math.max(...values); // set me manually
  max = Math.ceil((max + 1) / 100000) * 100000;
  var min = Math.min(...values);
  min = 0;

  // var categories = ["no data", "low", "moderate", "substantial", "high"];
  // var categories = ["no data","low","medium","high"]
  var categories = ["Low","Medium","High","No data"]

  color_scale = d3
    .scaleOrdinal()
    .domain([...categories])
    .range(hospColorScheme);

  var legendElement = d3.select(".key");
  legendElement.html("");
  // renderLegend(config.container, min, max);

  // Create the root SVG element.
  var chartWrapper = containerElement
    .append("div")
    .attr("class", "graphic-wrapper");

  var chartElement = chartWrapper
    .append("svg")
    .attr("width", chartWidth + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // var renderLegend = function (colorScale) {
  var legendWrapper = d3.select(".key-wrap");
  var legendElement = d3.select(".key");
  color_scale.domain().forEach(function (key, i) {
    var keyItem = legendElement
      .append("li")
      .attr("class", `key-item ${classify(key)}`);
    keyItem.append("b").style("background", color_scale(key.toLowerCase()));
    keyItem.append("label").text(`${capitalizeFirstLetter(categories[i])}`);
  });
  // };

  // add in tooltip for individual state display.
  var tooltip = containerElement
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")
    .style("background", "#fff")
    .text("");
  var mainTooltipLabel = tooltip.append("div").attr("class", "label main");
  var secondaryTooltipLabel = tooltip
    .append("div")
    .attr("class", "label secondary");

  // Render Map!
  // states or counties depending on includeCounties bool
  chartElement
    .selectAll(".district")
    .data(config.data.features)
    .enter()
    .append("path")
    .attr("class", function (d) {
      var lsad = classify(d.properties.NAMELSAD);
      var state = classify(d.properties.name);
      var baseClass = `district ${lsad}-${state}`;
      return baseClass;
    })
    .attr("fill", function (d) {
      return color_scale(d.properties[mainProperty] || "no data");
    })
    .attr("d", path)
    .attr("stroke-width", ".5px")
    .on("mousemove", function (d) {
      // Don't do tooltips on mobile.
      if (isMobile.matches || disableTooltips) {
        return;
      }
      var val = d.properties[mainProperty] || "No data";

      // Update labels here
      mainTooltipLabel.text(
        d.properties.county + ", " + d.properties.state_abbr
      );
      secondaryTooltipLabel.html(
        val.toLowerCase() == "no data"
          ? val
          : `COVID-19 Community Level:  <span class="${val.toLowerCase()}">${val}</span>`
      );
      // Set tooltip positions. If tooltip too far to the right, move
      // to lefthand side of state.
      var coordinates = d3.mouse(this);
      var x = coordinates[0];
      var y = coordinates[1];

      tooltip.style("top", y + 5 + "px");

      var element = tooltip.node();
      var tooltipWidth = element.getBoundingClientRect().width;
      var offset = x + 10;
      if (offset >= chartWidth - maxTooltipWidth) {
        offset = x - 10 - tooltipWidth;
      }
      tooltip.style("left", offset + "px");

      return tooltip.style("visibility", "visible");
    })
    .on("mouseout", function () {
      return tooltip.style("visibility", "hidden");
    })
    .on("click", function (d) {
      var name = d.properties.NAMELSAD + ", " + getStateAbbr(d.properties.name);
      var search = $.one("#search");
      search.value = name;

      if (pymChild) {
        pymChild.scrollParentToChildEl("search-hed");
      }
    });

  // Add in state outlines if include counties is true

  chartElement
    .selectAll(".states")
    .data(states.features)
    .enter()
    .append("path")
    .attr("class", "states")
    .attr("stroke", "#fff")
    .attr("d", path)
    .attr("fill", "none");
};

var countyCache = {};
var getCountyFile = function (geoid) {
  if (!countyCache[geoid]) {
    countyCache[geoid] = new Promise(async function (ok, fail) {
      var response = await fetch(`./synced/fips_files/${geoid}.json`);
      var data = await response.json();
      ok(data);
    });
  }
  return countyCache[geoid];
};

async function populateTables(data, searchValue, hospKey) {
  var hospTable = d3.select("#hosp-table");

  if (searchValue) {
    var [searchCounty, searchState] = searchValue.toLowerCase().split(", ");

    var [county] = COUNTIES.filter(
      function(d) {
        return d.NAMELSAD.toLowerCase() == searchCounty &&
        getStateAbbr(d.name).toLowerCase() == searchState
      }

    );
    var [item] = data.filter(d => d.fips_code == county.GEOID);

  }
  // if (item && item.community_transmission_level) {
  if (item && item.covid19_community_level) {
    d3.select("#hosp-table").classed("show", true);
    d3.select(".no-data-msg").classed("show", false);

    item.community = capitalizeFirstLetter(
      item.covid19_community_level
    );
    item.community_hdr = window.LABELS.hdr_community_level;
    item.community_description = window.LABELS.description_community_level;

    item.recommendations = {
      'high': window.LABELS.recommendations_high,
      'medium': window.LABELS.recommendations_medium,
      'low': window.LABELS.recommendations_low
    }

    var template = dot.compile(require("./_table.html"));

    d3.select("#hosp-table-body").html(
      template({ data: item, COPY: window.LABELS})
    );
  } else {
    d3.select("#hosp-table").classed("show", false);
    d3.select(".no-data-msg").classed("show", true);
  }

  // var tableOuter = document.querySelector("#state-table-hosp");
  // setTimeout(() => tableOuter.focus(), 100);

  if (pymChild) {
    pymChild.sendHeight();
  }
}

function getStateAbbr(state) {
  var [currState] = STATES.filter(x => x.name == state);
  return currState.usps;
}

function getDisplay(item, daily) {
  if (String(item).includes("suppressed")) return 'Unavailable';
  if (item == "undefined") return 'Unavailable';
  if (daily) return (Number(item)/ 7).toFixed(0) + ' per 100k';
  return (Number(item)).toFixed(0) + ' per 100k';
}

// Gets the center for an geography.
function getCenter(d, projection) {
  var center = projection(d3.geoCentroid(d));

  // Add necessary special casing here.
  return center;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

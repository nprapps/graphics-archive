var topojson = require("topojson/dist/topojson.min");

require("./lib/webfonts");

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
var { isMobile } = require("./lib/breakpoints");

var classify = s => s.replace(/[ ,]+/g, "-");

console.clear();

var pymChild;

var { hotspotsColorScheme, geoAlbersUsaPr } = require("./util");

var { classify, wrapText } = require("./lib/helpers");

//['#ffffff','#d3eaf7', '#b0cada', '#8eabbe', '#6c8da3', '#4b7189', '#28556f'];
//var changeColorScheme = ['#ffffff','#779090', '#aac4c4', '#e0bfb9', '#bc8277', '#95483a', '#690000']
//['#ffffff','#8BC0BF','#c5dfdf','#e8e8e8','#f49677', '#b84732', '#690000']//['#ffffff','#d8b365','#f6e8c3','#c7eae5','#5ab4ac','#01665e'];
//YELLOW TO GREEN var changeColorScheme = ['#ffffff','#f9e29c', '#ffffff', '#c5dfdf', '#709e9c', '#11605e']//['#ffffff','#d8b365','#f6e8c3','#c7eae5','#5ab4ac','#01665e'];

var d3 = {
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-svg-annotation/d3-annotation.min")
};

// combineData
var combineDataMap = function (hotspotData, us) {
  // build a lookup
  var mapLookup = new Map();
  for (var item of hotspotData) {
    mapLookup.set(item.GEOID.toString(), item);
  }
  // join DATA to geo_data
  for (var feature of us.objects["counties"].geometries) {
    var matchingDataHotspot = mapLookup.get(feature.properties.GEOID) || {};
    var { status } = matchingDataHotspot;

    feature.properties = {
      status,
      ...feature.properties,
    };
  }
  //}
  return topojson.feature(us, us.objects["counties"]);
};

var getSyncedFile = async function (filename) {
  var response = await fetch(`./assets/${filename}.json`);
  return response.json();
};

var onWindowLoaded = async function () {
  // replace "csv" to load from a different source
  var requests = ["counties-10m"].map(getSyncedFile);
  var [us] = await Promise.all(requests);

  var hotspotData = combineDataMap(DATA, us);

  var lastWidth = window.innerWidth;

  statesOutline = topojson.mesh(us, us.objects.states, (a, b) => a !== b);

  window.addEventListener("resize", function () {
    if (window.innerWidth != lastWidth) {
      render(hotspotData, statesOutline);
      lastWidth = window.innerWidth;
    }
  });

  render(hotspotData, statesOutline);

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function (data, statesOutline) {
  var candidates = [
    {
      container: "#hotspots-wrapper",
      colorScheme: hotspotsColorScheme,
    },
  ];

  for (c of candidates) {
    var container = c.container;
    var colorScheme = c.colorScheme;

    renderMap(
      {
        container,
        data,
        colorScheme,
      },
      "status",
      statesOutline
    );
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderMap = function (config, mainProperty, statesOutline) {
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 2.6 : 9;

  var leftLabelMargin = -5;
  var rightLabelMargin = 5;
  var topLabelMargin = 10;

  var margins = {
    top: (isMobile.matches ? 10 : 30),
    right: 0,
    bottom: (isMobile.matches ? 40 : 55),
    left: 0,
  };

  // Clear existing graphic (for redraw)
  var containerElement = d3
    .select(config.container)
    .select("#map-container .map");
  var width = containerElement.node().offsetWidth;

  // Calculate actual chart dimensions
  var chartWidth = width - margins.left - margins.right;
  var chartHeight = Math.ceil((width * aspectHeight) / aspectWidth);

  containerElement.html("");

  var increaseScale = isMobile.matches ? 135 : 155;

  // Create param functions like projection, scales, etc. TKTK
  var projection = geoAlbersUsaPr()
    .translate([chartWidth / 2, chartHeight / 2.25]) // translate to center of screen
    .scale(width + increaseScale); // scale things down so see entire US

  var path = d3.geoPath().projection(projection);

  var categories = ["E", "H", "S"];

  var scaleColor = d3
    .scaleOrdinal()
    .domain(categories)
    .range(config.colorScheme)
    .unknown("#eee");

  var legendWrapper = d3.select(".key-wrap").classed("numeric-scale", false);
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

  var labelHotspots = {
    S: "Sustained hot spot",
    H: "Hot spot",
    E: "Emerging hot spot",
  };

  scaleColor.domain().forEach(function (key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem.append("b").style("background", scaleColor(key));
    keyItem.append("label").text(labelHotspots[key]);
  });

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
    .attr("fill", d => scaleColor(d.properties[mainProperty]))
    .attr("d", path)
    .attr("stroke-width", "1px")
    .append("title")
    .text(d =>
      d.properties[mainProperty]
        ? `${d.properties.NAMELSAD}, ${d.properties.name}\n${
            LABELS[d.properties[mainProperty]]
          }`
        // : `${d.properties.NAMELSAD}, ${d.properties.name}\nNot a hotspot of any kind`
        : ``
    );

  // Add in state outlines if include counties is true
  chartElement
    .append("path")
    .attr("class", "states")
    .attr("fill", "none")
    .attr("stroke", "#ffffff")
    .attr("d", path(statesOutline));

  // draw map annotations
  var annotElement = chartElement.append("g")
    .attr("class", "annotations");

  const annotType = d3.annotationCustomType(
    d3.annotationLabel,
    {"className":"custom",
      "connector":{"type":"elbow"},
      "note":{"align":"left",
      "orientation":"topBottom"}})

  var annotData = [];
  ANNOTATIONS.forEach((annot, i) => {
    annotData.push({
      note: {
        title: annot.title,
        label: annot.desc
      },
      x: projection([ annot['lon'], annot['lat'] ])[0],
      y: projection([ annot['lon'], annot['lat'] ])[1],
      dx: (isMobile.matches ? annot['dx_mobile'] : annot['dx']),
      dy: (isMobile.matches ? annot['dy_mobile'] : annot['dy'])
    });
  });

  const makeAnnotations = d3.annotation()
    // .notePadding(5)
    .type(annotType)
    .annotations(annotData);

  annotElement.append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations)
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

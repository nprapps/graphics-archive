var topojson = require("topojson/dist/topojson.min");

require("./lib/webfonts");
// autocomplete input element
require("./autocomplete");

var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");
var dot = require("./lib/dot");

var classify = s => s.replace(/[ ,]+/g, "-");

console.clear();

var color_scale;
var pymChild;

var {
  getTimeStamp,
  arrayToObject,
  isPlural,
  getData,
  updateTime,
  geoAlbersUsaPr
} = require("./util");

var disableTooltips = false;
var maxTooltipWidth = 270;
var oldPath = null;

var {
  COLORS,
  getAPMonth,
  classify,
  makeTranslate,
  wrapText,
  fmtComma
} = require("./lib/helpers");

var floodColorScheme = ['#ffffff','#d3eaf7', '#a6c3d3', '#7a9db0', '#50788f', '#28556f','#15384d']
//['#ffffff','#d3eaf7', '#b0cada', '#8eabbe', '#6c8da3', '#4b7189', '#28556f'];
var tooltip = $.one(".tooltip")
var mapContainer = $.one("#map-container")
//var changeColorScheme = ['#ffffff','#779090', '#aac4c4', '#e0bfb9', '#bc8277', '#95483a', '#690000']
//['#ffffff','#8BC0BF','#c5dfdf','#e8e8e8','#f49677', '#b84732', '#690000']//['#ffffff','#d8b365','#f6e8c3','#c7eae5','#5ab4ac','#01665e'];
//YELLOW TO GREEN var changeColorScheme = ['#ffffff','#f9e29c', '#ffffff', '#c5dfdf', '#709e9c', '#11605e']//['#ffffff','#d8b365','#f6e8c3','#c7eae5','#5ab4ac','#01665e'];

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-zoom/dist/d3-zoom.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min")
};


// combineData
var combineDataMap = function (floodData, states, counties) {
  // build a lookup
  var mapLookup = new Map();
  for (var item of floodData) {
    mapLookup.set(item.GEOID.toString(), item);
  }
  // join DATA to geo_data
  for (var feature of counties.objects["counties-lakes"].geometries) {
    var { GEOID } = feature.properties;
    
      var matchingDataFlood = mapLookup.get(feature.properties.GEOID) || {};
      var { data_2020, perc_chg_30_cost } = matchingDataFlood;

      feature.properties = {
        data_2020,
        perc_chg_30_cost,
        ...feature.properties
      };
    }
  //}
  return topojson.feature(counties, counties.objects["counties-lakes"]);
};

var getSyncedFile = async function(filename) {
  var response = await fetch(`./assets/${filename}.json`);
  return response.json();
}

var onWindowLoaded = async function () {
  // replace "csv" to load from a different source
  // var geoStates = await Promise.resolve(getGeo());
  var requests = ["counties-lakes1", "states_topo"].map(getSyncedFile);
  var [counties, states] = await Promise.all(requests);

  var datalist = $.one("datalist")
  // counties.objects['counties-lakes'].geometries.forEach(function(f){
  //   //console.log(f.properties)
  //   var {GEOID,name, NAMELSAD} = f.properties;
  //   name = getStateAbbr(name)
  //   var option = document.createElement("option")
  //   option.value = GEOID
  //   option.innerHTML = `${NAMELSAD}, ${name}`
  //   datalist.appendChild(option);
  // })

  FLOOD.forEach(function(row){
    var {GEOID, state_abbr, county} = row;
    var option = document.createElement("option")
    option.value = GEOID
    option.innerHTML = `${county}, ${state_abbr}`
    datalist.appendChild(option);

  })

  var floodData = combineDataMap(FLOOD, states, counties);

  //var selected = $.one(`input[type=radio]:checked`);
  var oldCounty = $.one("#search") ? $.one("#search").value : "";
  //console.log(oldCounty)
  //console.log(oldCounty)
  var searchBox = $.one("#search");
  var oldCounty = null;


  searchBox.addEventListener("change", function (e) {
    //console.log(FLOOD)
    var value = searchBox.value;
    //console.log(value)

    if (counties.includes(value)) {
      var countyClass = classify(value);
      d3.selectAll("." + countyClass).classed("highlight", true);
    } else {
      value = "";
    }

    populateTables(FLOOD, value, 'GEOID');

    if (oldCounty) {
      var oldClass = classify(oldCounty);
      var [oldName, oldState] = oldCounty.split(", ");
      d3.selectAll("." + oldClass).classed("highlight", false);
    }

    oldCounty = value;
    if (pymChild) {
      pymChild.sendHeight();
      if (!isMobile.matches && value !== "") {
        // pymChild.scrollParentToChildEl('state-table-hosp');
      }
    }
  });

  var counties = FLOOD.map((a) => a.county + ", " + a.state_abbr);

  var lastWidth = window.innerWidth;

  
  window.addEventListener("resize", function () {
    if (window.innerWidth != lastWidth) {
      render(floodData, states);
      lastWidth = window.innerWidth;
    }
  });

  states = topojson.feature(states, states.objects.states_filtered);
  render(floodData, states);

  pym.then((child) => {
    pymChild = child;
    child.sendHeight();
  });
};

var render = function (data, states) {
  //console.log(data)

  var candidates = [
    {
      dataName: "flood",
      container: "#flood-wrapper",
      colorScheme: floodColorScheme,
    }
  ];

  


  for (var c of candidates) {
    var container = c.container;
    var dataName = c.dataName;
    var colorScheme = c.colorScheme;

    renderMap(
      {
        container,
        data,
        colorScheme,
      },
      'data_2020',
      states
    );
  }

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

var renderMap = function (config, mainProperty,states) {
  var aspectWidth = isMobile.matches ? 4 : 16;
  var aspectHeight = isMobile.matches ? 2.6 : 9;

  var leftLabelMargin = -5;
  var rightLabelMargin = 5;
  var topLabelMargin = 10;

  var margins = {
    top: 30,
    right: 0,
    bottom: 0,
    left: 0
  };

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container).select("#map-container .map");
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
    .translate([chartWidth / 2, chartHeight / 2.25]) // translate to center of screen
    .scale(width + increaseScale); // scale things down so see entire US

  var path = d3.geoPath().projection(projection);

  var values = config.data.features.map((d) => d.properties[mainProperty] || 0);
  var max = Math.max(...values); // set me manually
  max = Math.ceil((max + 1) / 100000) * 100000;
  var min = Math.min(...values);
  min = 0;

  //if (config.dataset == '2020'){
  var categories = [0, 5, 10, 15, 20, 25];
  

    //console.log(categories)
  color_scale = d3
      .scaleThreshold()
      .domain([...categories])
      .range(config.colorScheme);

  var legendWrapper = d3.select(".key-wrap").classed("numeric-scale", true);
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

    color_scale.domain().forEach(function(key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem.append("b").style("background", color_scale(key));

    keyItem.append("label").text(key);

    // Add the optional upper bound label on numeric scale
    if (i == categories.length - 1) {
      //if (config.dataset == '2020'){
        keyItem
          .append("label")
          .attr("class", "end-label")
          .text(LABELS.max_label_2020);
      // }
    }
  });
    // };

  // add in tooltip for individual state display.
  // var tooltip = containerElement
  //   .append("div")
  //   .attr("id", "tooltip")
  //   .style("position", "absolute")
  //   .style("z-index", "10")
  //   .style("visibility", "hidden")
  //   .style("background", "#fff")
  //   .text("");
  // var mainTooltipLabel = tooltip.append("div").attr("class", "label main");
  // var secondaryTooltipLabel = tooltip
  //   .append("div")
  //   .attr("class", "label secondary");

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
      if (isNaN(d.properties[mainProperty])) {

        return "#DCDCDC";
      }
      var percent = d.properties[mainProperty] || 0;

      return color_scale(percent);
    })
    .attr("d", path)
    .attr("stroke-width", "1px")
    .on("mouseenter",function(d){
      if (isMobile.matches || disableTooltips) {
        return;
        }
      createTooltip(d)
    })
    .each(function (d) {
      this.addEventListener("mousemove",function(e){
        if (isMobile.matches || disableTooltips) {
          return;
        }
        var {clientX, clientY} = e;
        var containerBounds = mapContainer.getBoundingClientRect()
        
        var x = clientX - containerBounds.left
        var y = clientY - containerBounds.top

        y += 10
        
        var x_offset = x + 10;
        var y_offset = y;

        if (x > containerBounds.width/2){
          x_offset = x - 10 - maxTooltipWidth
        }

        if (y > containerBounds.height/1.7){
          y_offset = y - 85;
        }

        tooltip.style.top = y_offset + "px";

        tooltip.style.left = x_offset + "px";

        tooltip.style.display = "block";
        //console.log(e);

      })
  })
    .on("mouseout", function () {
      if (isMobile.matches || disableTooltips) {
        return;
        }
      tooltip.style.display = "none";
    });

  // Add in state outlines if include counties is true

  chartElement
    .selectAll(".states")
    .data(states.features)
    .enter()
    .append("path")
    .attr("class", "states")
    .attr("stroke", function (d){
      //if (mainProperty=='data_2020'){
        return "#ffffff"
      //}
      // else {
      //   return "#d6d6d6"
      // }
    })
    .attr("d", path)
    .attr("fill", "none");
};

var countyCache = {};

function createTooltip(d){

      if (oldPath){
          oldPath.style.stroke = "none";
      }
      //console.log(d)
      if (!d.properties){
        var val = d['data_2020'];
        var perc_change = d['perc_chg_30']
        // var avg_change = d['avg_chg_30_cost']
        var main_label = d['county'] + ", " + d['state_abbr']
      }

      else {
        var val = d.properties['data_2020'];
        var perc_change = d.properties['perc_chg_30']
        var main_label = d.properties.NAMELSAD + ", " + getStateAbbr(d.properties.name)
      }
      

      var crease = (perc_change > 0) ? "increase": "decrease";
      var secondary_label = `<span id='number' style='border-color:${color_scale(val)}'>${val}%</span> of residential properties are at risk of flood damage today.`;
      

        tooltip.innerHTML = `
          <div class="label main">${main_label}</div>
          <div class="label secondary">${secondary_label}</div>`
}

async function populateTables(data, searchValue, hospKey) {
  //console.log(data)
  //var floodCard = d3.select("#flood-card");

  if (searchValue) {

    var [searchCounty, searchState] = searchValue.toLowerCase().split(", ");

    data = data.filter(
      (d) =>
        d.county.toLowerCase() == searchCounty &&
        d.state_abbr.toLowerCase() == searchState
    );

    searchCounty = searchCounty.replace(/\s/g, '-')
    searchState=getStateFull(searchState.toUpperCase()).toLowerCase().replace(/\s/g, '-')
    
    var class_name = `${searchCounty}-${searchState}`

    if (class_name == "prince-george's-county-maryland"){
      class_name = "prince-georges-county-maryland"
    }

    var geoid = data[0].GEOID;

    createTooltip(data[0]);


    tooltip.style.display = 'block';


    if (isMobile.matches || disableTooltips) {
          var path = $.one(`.${class_name}`)
          path.style.stroke = "black";

          if (oldPath){
            oldPath.style.stroke = "none";
          }
        

          oldPath = path
          return;
    }else {
      //var {clientX, clientY} = e;
        var path = $.one(`.${class_name}`)
        path.style.stroke = "black";
        //console.log(path)
        var pathBounds = path.getBoundingClientRect()
        var containerBounds = mapContainer.getBoundingClientRect()
        
        var clientX = pathBounds.left
        var clientY = pathBounds.top

        var x = clientX - containerBounds.left
        var y = clientY - containerBounds.top

        y += 10

        tooltip.style.top = y + "px";

        var offset = x + 10;

        if (x > containerBounds.width/2){
          offset = x - 10 - maxTooltipWidth
        }

        tooltip.style.left = offset + "px";

        tooltip.style.display = "block";

        if (oldPath){
          oldPath.style.stroke = "none";
        }
        

        oldPath = path
    }
        
  }

  if (pymChild) {
    pymChild.sendHeight();
  }
}


function getStateAbbr(state) {
  var [ currState ] = STATES.filter((x) => x.name == state);
  return currState.usps;
}

function getStateFull(state) {
  var [ currState ] = STATES.filter((x) => x.usps == state);
  return currState.name;
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

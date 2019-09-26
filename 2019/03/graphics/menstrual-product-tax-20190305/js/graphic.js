// Global config
var MAP_TEMPLATE_ID = "#map-template";

// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
  formatData();

  if (Modernizr.svg) {
    pymChild = new pym.Child({
      renderCallback: render
    });
  } else {
    pymChild = new pym.Child({});
  }

  pymChild.onMessage("on-screen", function(bucket) {
    ANALYTICS.trackEvent("on-screen", bucket);
  });
  pymChild.onMessage("scroll-depth", function(data) {
    data = JSON.parse(data);
    ANALYTICS.trackEvent("scroll-depth", data.percent, data.seconds);
  });
};

/*
 * Format graphic data.
 */
var formatData = function() {
  DATA.forEach(function(d) {
    // CSS class selector associated with that state's hex tile
    d["state_class"] = "state-" + classify(d["state_name"]);
  });
};

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
  if (!containerWidth) {
    containerWidth = DEFAULT_WIDTH;
  }

  if (containerWidth <= MOBILE_THRESHOLD) {
    isMobile = true;
  } else {
    isMobile = false;
  }

  if (LABELS["is_numeric"] && LABELS["is_numeric"].toLowerCase() == "true") {
    var isNumeric = true;
  } else {
    var isNumeric = false;
  }

  // Render the map!
  renderStateGridMap({
    container: "#state-grid-map",
    width: containerWidth,
    data: DATA,
    // isNumeric will style the legend as a numeric scale
    isNumeric: isNumeric
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

/*
 * Render a state grid map.
 */
var renderStateGridMap = function(config) {
  var valueColumn = "category";

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config["container"]);
  containerElement.html("");

  // Copy map template
  var template = d3.select(MAP_TEMPLATE_ID);
  containerElement.html(template.html());

  // Categories
  var categories = [];
  CATEGORY_LABELS.forEach(function(d) {
    categories.push(d["category_name"]);
  });

  // Create legend
  var legendWrapper = containerElement.select(".key-wrap");
  var legendElement = containerElement.select(".key");

  // Colorscale
  var colorScale = d3.scale
    .ordinal()
    .domain(categories)
    // .range([texture.url(), color1, color2, "#cdcdcd"]);
    .range([COLORS['teal3'], COLORS['orange4'], "#dddddd"]);

  var fontColorScale = d3.scale
    .ordinal()
    .domain(categories)
    .range(['#fff', COLORS['orange1'], "#979797"]);

  // Legend key
  _.each(colorScale.domain(), function(key, i) {
    var keyItem = legendElement.append("li").classed("key-item", true);

    keyItem
      .append("svg")
      .attr("width", 15)
      .attr("height", 15)
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", colorScale(key));

    keyItem.append("label").text(function() {
      var label = _.findWhere(CATEGORY_LABELS, { category_name: key })[
        "category_label"
      ];
      return label || key;
    });

    // Add the optional upper bound label on numeric scale
    if (config["isNumeric"] && i == categories.length - 1) {
      if (LABELS["max_label"] && LABELS["max_label"] !== "") {
        keyItem
          .append("label")
          .attr("class", "end-label")
          .text(LABELS["max_label"]);
      }
    }
  });

  // Select SVG element
  var chartElement = containerElement.select("#map-svg");

  // Resize map (needs to be explicitly set for IE11)
  chartElement.attr("width", config["width"]).attr("height", function() {
    var s = d3.select(this);
    var viewBox = s.attr("viewBox").split(" ");
    return Math.floor(
      (config["width"] * parseInt(viewBox[3])) / parseInt(viewBox[2])
    );
  });

  // Set state colors
  _.each(config["data"], function(d) {
    if (d[valueColumn] !== null) {
      var categoryClass = "category-" + classify(d[valueColumn]);
      chartElement
        .select("." + d["state_class"])
        .attr("class", d["state_class"] + " state-active " + categoryClass)
        .attr("fill", colorScale(d[valueColumn]));
    }
  });

  // Draw state labels
  chartElement
    .append("g")
    .selectAll("text")
    .data(config["data"])
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .text(function(d) {
      var state = _.findWhere(STATES, { name: d["state_name"] });
      return isMobile ? state["usps"] : state["ap"];
      // return state["usps"];
    })
    .attr("class", function(d) {
      return d[valueColumn] !== null
        ? "category-" + classify(d[valueColumn]) + " label label-active"
        : "label";
    })
    .classed("is-mobile", function(d) {
      return isMobile;
    })
    .attr("x", function(d) {
      var tileBox = chartElement.select("." + d["state_class"])[0][0].getBBox();
      return tileBox["x"] + tileBox["width"] * 0.52;
    })
    .attr("y", function(d) {
      var tileBox = chartElement.select("." + d["state_class"])[0][0].getBBox();
      var textBox = d3.select(this)[0][0].getBBox();
      var textOffset = textBox["height"] / 2;
      if (isMobile) {
        textOffset -= 1;
      }
      return tileBox["y"] + tileBox["height"] * 0.5 + textOffset;
    })
    .attr("fill", function(d) {
      return fontColorScale(d[valueColumn]);
    });



};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

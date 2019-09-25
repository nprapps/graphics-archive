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

  // Colors for texture and fill
  var color2 = COLORS["yellow2"];
  var color1 = COLORS["blue1"];

  // var color1 = '#28556F';
  // var color2 = '#E38D2C';
  // var color3 = '#8da694';
  

  // Define textured background
  var texture = textures
    .lines()
    .orientation("7/8")
    .size(13)
    .strokeWidth(3)
    .background(color2)
    .stroke(color1);
  containerElement.select("svg").call(texture);

  // Colorscale
  var colorScale = d3.scale
    .ordinal()
    .domain(categories)
    .range([texture.url(), color1, color2, "#cdcdcd"]);
    // .range([color3, color1, color2, "#cdcdcd"]);

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
    // (For hover)
    // prevents the mouseout event from firing when cursor is over state label.
    .attr("pointer-events", "none");

  /* --------------
      Hover behavior
     -------------- */

  /*
   * Highlight state, show tooltip, fade out other states, match dropdown
   */
  var selectState = function(state) {
    // No tooltips for grayed out states.
    if (state.category == "no_restitution") {
      return;
    }

    // Highlight selected, fade others
    d3.selectAll(".highlighted").classed("highlighted", false);
    d3.selectAll(".state-active").classed("faded", true);
    d3.select("." + state["state_class"])
      .classed("faded", false)
      .classed("highlighted", true);

    // Show tooltip
    d3.select(".tooltip")
      .style("display", "block")
      // Calculate tooltip position based on hex tile
      .style("left", function() {
        // Get the hex tile's xPos
        var tileX = d3
          .select("." + state["state_class"])
          .node()
          .getBBox()["x"];

        // Map the tileX (not a pixel val) to a pixel val
        var viewBoxWidth = chartElement.attr("viewBox").split(" ")[2];
        var xScale = d3.scale
          .linear()
          .domain([0, viewBoxWidth])
          .range([0, chartElement.attr("width")]);
        var tooltipX = xScale(tileX);

        // Move the tooltip left if out of container bounds
        var tooltipWidth = this.getBoundingClientRect().width;
        if (chartElement.attr("width") - tooltipX < tooltipWidth) {
          tooltipX = chartElement.attr("width") - tooltipWidth;
        }

        return tooltipX + "px";
      })
      .style("top", function() {
        var tileY = d3
          .select("." + state["state_class"])
          .node()
          .getBBox()["y"];
        var viewBoxHeight = chartElement.attr("viewBox").split(" ")[3];
        var yScale = d3.scale
          .linear()
          .domain([0, viewBoxHeight])
          .range([0, chartElement.attr("height")]);
        var tooltipY = yScale(tileY);
        return tooltipY + "px";
      });

    // Populate state name in tooltip
    d3.select(".tooltip-state-name").html(state["state_name"]);

    // Populate monetary awards in tooltip
    if (state["monetary_awards"] !== null) {
      d3.selectAll(".tooltip-monetary").style("display", "block");
      d3.select(".tooltip-monetary-content").html(state["monetary_awards"]);
    } else {
      d3.selectAll(".tooltip-monetary").style("display", "none");
      d3.select(".tooltip-monetary-content").html("");
    }

    // Populate reentry services in tooltip
    if (state["other_awards"] !== null) {
      d3.selectAll(".tooltip-reentry").style("display", "block");
      d3.select(".tooltip-reentry-content").html(state["other_awards"]);
    } else {
      d3.selectAll(".tooltip-reentry").style("display", "none");
      d3.select(".tooltip-reentry-content").html("");
    }

    // Select corresponding in dropdown
    var selector = document.getElementsByClassName("state-selector")[0];
    for (var i = 0; i < selector.options.length; i++) {
      if (selector.options[i].text == state["state_name"]) {
          selector.options[i].selected = true;
          return;
      }
    }

  };

  /*
   * Reset hover state
   */
  var deselectState = function() {
    d3.selectAll(".state-active").classed("faded", false);
    d3.selectAll(".highlighted").classed("highlighted", false);
    d3.select(".tooltip").style("display", "none");

    // Reset dropdown
    var selector = document.getElementsByClassName("state-selector")[0];
    selector.options[0].selected = true;
  };

  // Add US states to dropdown selector
  var selector = document.getElementsByClassName("state-selector")[0];
  _.each(config["data"], function(state) {
    // States with no restitution laws don't need dropdown option
    if (state.category == "no_restitution") {
      return;
    }

    var option = document.createElement("option");
    option.text = state["state_name"];
    selector.add(option);
  });

  // Highlight state on hex tile hover/click.
  _.each(config["data"], function(state) {
    if (state[valueColumn] !== null) {
      chartElement
        .select("." + state["state_class"])
        .on("mouseover", function() {
          selectState(state);
          d3.event.stopPropagation();
        })
        .on("mouseout", function() {
          deselectState();
        })
        .on("click", function() {
          selectState(state);
          d3.event.stopPropagation();
        });
    }
  });

  // Highlight state on dropdown select
  d3.select(".state-selector").on("change", function() {
    var selectedStateName = this.options[this.selectedIndex].value;
    var selected = _.findWhere(config["data"], {
      state_name: selectedStateName
    });
    selectState(selected);
  });

  // Deselect states on canvas click
  chartElement.on("click", function() {  
    if (d3.selectAll(".highlighted").length > 0) {
      deselectState();
    };
  });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

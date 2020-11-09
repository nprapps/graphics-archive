var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { COLORS, classify } = require("./lib/helpers");
var $ = require('./lib/qsa');
var skipLabels = ["map", "values"];

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var barData = null;
var districts = [ "ne-1", "ne-2", "ne-3", "ne-4", "ne-5", "me-1", "me-2", "me-3", "me-4" ];
var northeastStates = [ "VT", "NH", "MA", "CT", "RI", "NJ", "DE", "MD", "DC" ];

// ------------ //

var pymChild = null;
pym.then(function(child) {
  pymChild = child;
  child.sendHeight();

  // legend
  var legendData = LEGEND.filter(function(item, i) {
    return item.genre == map_genre;
  });

  if (legendData.length > 0) {
    var legendContainer = d3.select("#map-key").append('ul')
      .attr('class', 'key');

    renderLegend({
      container: '.key',
      data: legendData
    })
  }

  // map
  initMapLabels();
  var mapWrapper = d3.select("#maps");
  $.one('.controls').addEventListener('change', toggleMap);
  mapWrapper.select(".map.cartogram").classed("active", false);
  // $.one('#mode-geo').click();

  barData = formatData(TOTALS);
  render();
  window.addEventListener("resize", render);

  pymChild.sendHeight();
});

// Format graphic data for processing by D3.
var formatData = function(input) {
  var filteredData = input.filter(function(item, i) {
    return item.map == map_scenario;
  });

  var data = filteredData.map(function(d) {
    var x0 = 0;

    var { label } = d.map;
    var values = [];

    for (var name in d) {
      if (skipLabels.indexOf(name) > -1 || d[name] == 0) {
        continue;
      }

      var x1 = x0 + d[name];
      var votes = d[name];

      values.push({
        name,
        x0,
        x1,
        votes
      });

      x0 = x1;
    }

    return { label, values };

  });

  return data;
};

var initMapLabels = function() {
  var mapWrapper = d3.select("#maps");

  // delete existing vote labels
  mapWrapper.selectAll(".votes")
    .remove();

  // position map labels
  DATA.forEach((item, i) => {
    // color states
    var s = mapWrapper.selectAll("." + classify(item.usps))
      .classed("cat-" + item[map_scenario], true);

    // mark if they've changed from previous
    if ((map_scenario == "battleground") && (item[map_scenario] != item.was)) {
      s.classed("changed", true);
    }

    // if it's not ME or NE
    if (districts.indexOf(item.usps.toLowerCase()) < 0) {
      [ "geo", "cartogram" ].forEach((map, i) => {
        var stateGroup = mapWrapper.select("." + map + " ." + classify(item.usps));
        var stateShape = map == "geo" ? "path" : "rect";
        var stateOutline = stateGroup.select(stateShape);
        var stateLabel = stateGroup.select("text");

        if (map == "cartogram" && item.electoral_votes < 6) {
          stateLabel.classed("small", true);
        }

        // special-casing all those tiny NE states
        if (map == "geo" && northeastStates.indexOf(item.usps) > -1) {
          stateGroup
            .classed("northeast", true)
            .append("rect")
              .attr("x", item.geo_offset_x - 15)
              .attr("y", item.geo_offset_y - 9)
              .attr("width", 10)
              .attr("height", 10);

          // mark if they've changed from previous
          if ((map_scenario == "battleground") && (item[map_scenario] != item.was)) {
            stateGroup.classed("changed", true);
          }

          stateLabel
            .attr("x", item.geo_offset_x)
            .attr("y", item.geo_offset_y)
            .attr("dx", 0)
            .attr("dy", 0);
        } else {
          var boxX = null;
          var boxWidth = null;

          stateLabel.attr("x", function() {
            switch(map) {
              case "geo":
                var bounds = stateOutline.node().getBBox();
                boxX = bounds.x;
                boxWidth = bounds.width;
                break;
              case "cartogram":
                boxX = parseInt(stateOutline.attr("x"));
                boxWidth = parseInt(stateOutline.attr("width"));
                break;
            }

            return (boxX + (boxWidth / 2));
          });

          var boxY = null;
          var boxHeight = null;
          var labelBox = stateLabel.node().getBBox();
          var offsetY = -1;

          stateLabel.attr("y", function() {
            switch(map) {
              case "geo":
                var bounds = stateOutline.node().getBBox();
                boxY = bounds.y;
                boxHeight = bounds.height;
                offsetY = isMobile.matches ? -1 : -5;
                break;
              case "cartogram":
                boxY = parseInt(stateOutline.attr("y"));
                boxHeight = parseInt(stateOutline.attr("height"));
                offsetY = isMobile.matches ? 1 : -5;
                break;
            }

            return (boxY + (boxHeight / 2) + (labelBox.height / 3)) + offsetY;
          });

          if (map == "geo" && item.geo_offset_x) {
            stateLabel.attr("dx", item.geo_offset_x);
          } else {
            stateLabel.attr("dx", 0);
          }

          if (map == "geo" && item.geo_offset_y) {
            stateLabel.attr("dy", item.geo_offset_y);
          } else {
            stateLabel.attr("dy", 0);
          }
        }

        if (!isMobile.matches) {
          var voteLabel = stateGroup.append('text')
            .attr('class', 'votes')
            .text(item['electoral_votes'])
            .attr('x', parseInt(stateLabel.attr('x')))
            .attr('y', parseInt(stateLabel.attr('y')) + 11)
            .attr('dx', parseInt(stateLabel.attr('dx')))
            .attr('dy', parseInt(stateLabel.attr('dy')));

          if (map == "geo" && item.geo_offset_x && northeastStates.indexOf(item.usps) <= -1) {
            voteLabel.attr("dx", item.geo_offset_x);
          }
        }
      });
    }
  });

  // move highlighted line to front on initial view
  d3.selectAll(".changed").moveToFront();


  // deal with ME and NE
  [ "ME", "NE" ].forEach((item, i) => {
    [ "geo", "cartogram" ].forEach((map, i) => {
      var thisStateGroup = mapWrapper.select("." + map + " ." + item.toLowerCase());
      var thisLabel = thisStateGroup.select("text");
      var thisBlock = thisStateGroup.select("." + item.toLowerCase() + "-1 rect");

      thisLabel
        .attr("x", parseInt(thisBlock.attr("x")) - 5 + "px")
        .attr("y", parseInt(thisBlock.attr("y")) + 10 + "px");
    });
  });
}

var toggledGeo = false;
var toggledCartogram = false;

var toggleMap = function(evt) {
  var target = evt.srcElement.id;
  var mapWrapper = d3.select("#maps");

  switch(target) {
    case "mode-geo":
      mapWrapper.select(".map.geo")
        .classed("active", true);
      mapWrapper.select(".map.cartogram")
        .classed("active", false);
      if (!toggledGeo) {
        ANALYTICS.trackEvent(map_scenario, "toggled-geo-map");
        toggledGeo = true;
      }
      break;
    case "mode-cartogram":
      mapWrapper.select(".map.geo")
        .classed("active", false);
      mapWrapper.select(".map.cartogram")
        .classed("active", true);
      if (!toggledCartogram) {
        ANALYTICS.trackEvent(map_scenario, "toggled-cartogram");
        toggledCartogram = true;
      }
      break;
  }

  pymChild.sendHeight();
}

/*
 * Render function (runs at init and every resize)
 */
var render = function() {
  var mapWrapper = d3.select("#maps")
  pymChild.sendHeight();

  // bar chart
  var barContainer = "#stacked-bar-chart";
  var element = document.querySelector(barContainer);
  var width = element.offsetWidth;

  renderStackedBarChart({
    container: '#stacked-bar-chart',
    width: width,
    data: barData
  });
};

/*
 * Draw legend
 */
var renderLegend = function(config) {
  var legendElement = d3.select(config['container']);

  config.data.forEach((item, i) => {
    var keyItem = legendElement.append('li')
      .attr("class", "key-item " + "cat-" + item.rating);

    keyItem.append('b');

    keyItem.append('label')
      .text(item.text);
  });
};


/*
 * Render a stacked bar chart.
 */
var renderStackedBarChart = function(config) {
  /*
   * Setup
   */
  var labelColumn = 'label';

  var barHeight = 20;
  var barGap = 5;
  var valueGap = 6;

  var margins = {
    top: 30,
    right: 0,
    bottom: 0,
    left: 0
  };

  var ticksX = 4;

  if (isMobile.matches) {
    ticksX = 2;
    margins.top = 22;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = barHeight * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  /*
   * Create D3 scale objects.
   */
  var min = 0;
  var max = 538;

  var xScale = d3.scaleLinear()
    .domain([ min, max ])
    .rangeRound([ 0, chartWidth ]);

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement.append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper.append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
      .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisTop()
    .scale(xScale)
    .tickValues([ 270 ])
    .tickFormat(function(d) {
        return d;
    });

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function() {
    return xAxis;
  };

  /*
   * Render bars to chart.
   */
 var group = chartElement.selectAll('.group')
   .data(config['data'])
   .enter().append('g')
     .attr('class', function(d) {
       return 'group';
     })
     .attr('transform', function(d,i) {
       return 'translate(0,' + (i * (barHeight + barGap)) + ')';
     });

  group.selectAll('rect')
    .data(function(d) {
      return d['values'];
    })
    .enter()
    .append('rect')
      .attr('x', function(d) {
        if (d['x0'] < d['x1']) {
          return xScale(d['x0']);
        }
        return xScale(d['x1']);
      })
      .attr('width', function(d) {
        return Math.abs(xScale(d['x1']) - xScale(d['x0']));
      })
      .attr('height', barHeight)
      .attr('class', function(d) {
        return "cat-" + d.name;
      });

  var barLabels = group.append('g')
    .attr('class', 'bar-labels')
    .selectAll('text')
    .data(function(d) {
      return d['values'];
    })
    .enter()
    .append('text')
      .text(function(d) {
        return d.votes;
      })
      .attr('x', function(d) {
        return xScale(d['x0'] + (d['x1'] - d['x0']) / 2);
      })
      .attr('dy', 14);

  // annotations
  var annotations = chartElement.append('g')
    .attr('class', 'annotations');

  annotations.append('line')
    .attr('x1', xScale(270))
    .attr('x2', xScale(270))
    .attr('y1', -3)
    .attr('y2', chartHeight);

  annotations.append('text')
    .text('270 to win')
    .attr('class', 'winner-line')
    .attr('x', xScale(270))
    .attr('y', -8);

  annotations.append('text')
    .text(function() {
      var nums = config.data[0].values;
      var lean = 0;
      var safe = 0;

      nums.forEach((item, i) => {
        if (item.name == "2") {
          lean = item.votes;
        }
        if (item.name == "1") {
          safe = item.votes;
        }
      });
      var total = lean + safe;
      return 'Biden: ' + total;
    })
    .attr('class', 'candidate dem')
    .attr('x', xScale(0))
    .attr('y', -10);

  annotations.append('text')
    .text(function() {
      var nums = config.data[0].values;
      var lean = 0;
      var safe = 0;

      nums.forEach((item, i) => {
        if (item.name == "4") {
          lean = item.votes;
        }
        if (item.name == "5") {
          safe = item.votes;
        }
      });
      var total = lean + safe;
      return 'Trump: ' + total;
    })
    .attr('class', 'candidate gop')
    .attr('x', xScale(538))
    .attr('y', -10);
}

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this);
  });
};

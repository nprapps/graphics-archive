var pym = require("./lib/pym");
require("./lib/webfonts");

// Global vars
var pymChild = null;
var renderDotChart = require("./renderDotChart");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-transition/dist/d3-transition.min")
};

var { classify, COLORS } = require("./lib/helpers");

var stateSelector;
var stateInfo;

var stateValues = [];
stateValues["LPN"] = [];
stateValues["RN"] = [];
var stateFull = [];

var TITLE = [];
TITLE["LPN"] = "Licensed practical nurse";
TITLE["RN"] = "Registered nurse";

// Initialize the graphic.
var onWindowLoaded = function() {
  stateSelector = d3.select('select.state-selector');
  // stateInfo = d3.select('.state-info');

  formatData(window.DATA);
  render(window.DATA);
  window.addEventListener("resize", () => render(window.DATA));

  pym.then(child => {
    pymChild = child;
    pymChild.sendHeight();
  });
};

var formatData = function(data) {
  // include NaN data here, but scrub it in renderDotChart.js
  data.forEach(function(d) {
    var values = [];
        for (var key in d) {
            if (key != 'label' && key != 'category') {
                if (d[key] != null) {
                    d[key] = +d[key];
                }
                if(key != 'median' && key != 'min' && key != 'max' && d[key] != null && key != 'CT' && key != 'VA') {
                    values.push({ 'state': key, 'value': d[key] });
                }
            }
        }
        stateValues[d['category']].push(values);
  })
}

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  // Render the chart!
  var container = "#dot-chart";
  var containerElement = d3.select("#dot-chart");
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  var categories = data.map(d => d["category"]);
  categories = [...new Set(categories)];

  categories.forEach(function(d, i) {
    var categoryData = data.filter(function(v,k) {
            return v['category'] == d;
        });

    containerElement.append("div")
      .attr("class", classify(d) + " nurse-chart");

      renderDotChart({
        container: ".nurse-chart." + classify(d),
        width,
        data: categoryData,
        valueData: stateValues[d],
        title: TITLE[d],
        labelColumn: "label",
        valueColumn: "median",
        minColumn: "min",
        maxColumn: "max"
      });
  })

  initStateSelector(stateValues["LPN"][0]);

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// look up full state name from sheet
var getStateFull = function(state) {
  var fullState = STATES.filter(x => x.usps == state);
  return fullState[0].name;
}

var initStateSelector = function(data) {
  // sort in alphabetical order
  data.sort(function(a, b) {
    if (getStateFull(a.state) < getStateFull(b.state)) { return -1; }
    if (getStateFull(a.state) > getStateFull(b.state)) { return 1; }
    return 0;
  })

    stateSelector.html('');

    stateSelector.append('option')
        // .attr('selected', 'selected')
        .html('Select one&hellip;');

    data.forEach(function(d,i) {
        stateSelector.append('option')
            .attr('value', d.state)
            .html(getStateFull(d.state));
    });

    stateSelector.on('change', highlightState);
}

var highlightState = function() {
    // reset state info box
    // stateInfo.html('');
    // stateInfo.classed('active', false);

    // deactivate previous active circles
    d3.selectAll('circle.active')
        .classed('active', false)
        // .transition()
        //     .duration(100)
            .style('stroke', '#bababa')
            .style('fill', '#bababa')
            .style('fill-opacity', 0.2)
            .style('stroke-opacity', 0.4);

    d3.selectAll('text.state-value').remove();

    // move medians back to the front of the stack
    d3.selectAll('circle.median')
        .moveToFront();

    d3.selectAll('.value.median')
        .classed('active', true);

    // reset key
    d3.select('.key .key-1')
        .classed('active', false);

    d3.select('.key .key-2 label')
        .text('Median processing time');

    // if this is a valid selection, show the state info
    if (d3.select(this).property('selectedIndex') > 0) {
        var selected = d3.select(this).property('value')
        console.log(selected)

        d3.selectAll('.value.median')
            .classed('active', false);

        // highlight new ones
        var dots = d3.selectAll('circle.' + selected)
            .moveToFront()
            .classed('active', function(d) {
                // add value annotation
                var thisDot = d3.select(this);
                var thisParent = d3.select(this.parentNode);

                thisParent.append('text')
                    .text(d['value'] + ' days')
                    .attr('x', thisDot.attr('cx'))
                    .attr('y', (+thisDot.attr('cy') + 20))
                    .attr('class', 'state-value ' + d['state']);

                return true;
            })
            // .call(showStateValue)
            // .transition()
            //     .duration(250)
                .style('stroke', COLORS.orange2)
                .style('fill', COLORS.orange3)
                .style('fill-opacity', 1)
                .style('stroke-opacity', 1);

        d3.select('.key .key-1')
            .classed('active', true)
            .select('label')
                .text('Median processing time in ' + getStateFull(selected));

        d3.select('.key .key-2 label')
            .text('In other states');
    }

    // // Update iframe
    // if (pymChild) {
    //     pymChild.sendHeight();
    // }
}

/*
 * Move a set of D3 elements to the front of the canvas.
 */
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

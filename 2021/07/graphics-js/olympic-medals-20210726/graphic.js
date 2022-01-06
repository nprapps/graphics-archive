var pym = require("./lib/pym");
require("./lib/webfonts");
var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");
var { classify } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
var d3 = {
  ...require("d3-selection/dist/d3-selection.min")
};

// Global vars
var pymChild = null;
var renderStackedColumnChart = require("./renderStackedColumns");
var skipLabels = ["label", "values", "total"];
console.clear();

// Initialize the graphic.
var onWindowLoaded = function() {
  var data = formatData(window.DATA);
  render(data);

  window.addEventListener("resize", () => render(data));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

// Format graphic data for processing by D3.
var formatData = function(data) {
  for (var country in data) {
    data[country].forEach(function(d) {
      var y0 = 0;

      d['values'] = [];
      d['total'] = 0;
      d['label'] = yearFull(new Date(d.label, 0, 1));

      for (var key in d) {
        if (key == 'label' || key == 'values' || key == 'total') {
          continue;
        }

        d[key] = +d[key];

        var y1 = y0 + d[key];
        d['total'] += d[key];

        d['values'].push({
          'name': key,
          'y0': y0,
          'y1': y1,
          'val': d[key]
        })

        y0 = y1;
      }
    });
  }
  console.log(data);
  return data;
};

// Render the graphic(s). Called by pym with the container width.
var render = function(data) {
  var container = "#stacked-column-chart";
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  // Render the chart!
  // renderStackedColumnChart({
  //   container,
  //   width,
  //   data,
  //   labelColumn: "label"
  // });

  var graphicWidth = null;
  var gutterWidth = 22;

  if (isMobile.matches) {
    graphicWidth = width;
  } else {
    graphicWidth = Math.floor((width - gutterWidth) / 2);
  }

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(container);
  containerElement.html('');

  // Render the chart!
  var charts = Object.keys(DATA);
  charts.forEach(function(d,i) {
    var chartElement = containerElement.append('div')
      .attr('class', 'chart ' + classify(d));

    // remove the following if it doesn't work
    if (!isMobile.matches) {
      chartElement.attr('style', function() {
        var s = '';
        s += 'width: ' + graphicWidth + 'px; ';
        s += 'float: left; ';
        if (i == 3 || i == 1) {
            s += 'margin-left: ' + gutterWidth + 'px; ';
        }
        return s;
      });
    }

    chartElement.append('h3')
      .html(HEADERS[d]);

    renderStackedColumnChart({
      container: '.chart.' + classify(d),
      width: graphicWidth,
      data: DATA[d],
      dataColumn: d,
      domain: [ 0, 30 ],
      labelColumn: "label"
    });
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Initially load the graphic
//(NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

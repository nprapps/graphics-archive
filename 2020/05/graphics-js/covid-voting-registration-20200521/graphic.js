var pym = require('./lib/pym');
require('./lib/webfonts');

var pymChild;
var renderLineChart = require('./renderLineChart');

var skipLabels = ["date", "x_offset", "y_offset", "raw"];
console.clear();

//Initialize graphic
var onWindowLoaded = function () {
  var series = formatData(window.DATA);
  render(series);

  window.addEventListener('resize', () => render(series));

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
};

//Format graphic data for processing by D3.
var formatData = function (data) {
  var series = [];

  data.forEach(function (d) {
    if (d.date instanceof Date) return;
    var [m, day, y] = d.date.split('/').map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    d.date = new Date(y, m - 1, day);
  });

  // Restructure tabular data for easier charting.
  for (var column in data[0]) {
    if (skipLabels.includes(column)) continue;

    series.push({
      name: column,
      values: data.map(function (d) {
        if (d[column]) {
          return {
            date: d.date,
            amt: d[column],
          };
        }
      }).filter(x => x),
    });
  }
  return series;
};

// Render the graphic(s). Called by pym with the container width.
var render = function (data) {
  // Render the chart!
  var container = '#line-chart';
  var element = document.querySelector(container);
  var width = element.offsetWidth;
  renderLineChart({
    container,
    width,
    data,
    dateColumn: 'date',
    valueColumn: 'amt',
  });

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

//Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

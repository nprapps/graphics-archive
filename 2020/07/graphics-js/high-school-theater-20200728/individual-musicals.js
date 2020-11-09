// Global config
var pym = require("./lib/pym");
var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var activePlay = 'Bye Bye Birdie';
var pymChild = null;
var filteredData = [];
var graphicData = null;
var graphicWidth = null;
var playIndex = [];
var ranksShown = 15;
var years = [ 1960, 1970, 1980, 1990, 2000, 2010, 2020 ];

/*
 * Initialize graphic
 */
var initialize = function() {
  // (NB: Use window.load to ensure all images have loaded)
  window.onload = onWindowLoaded;
}

var onWindowLoaded = function() {
  formatData(GRAPHIC_DATA);

  render();
  window.addEventListener("resize", () => render());

  pym.then(child => {
    pymChild = child;
    child.sendHeight();
  });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function(data) {
  graphicData = data;
  graphicData.forEach(function(d,i) {
    var isTopPlay = false;
    var isTopPlayCount = 0;

    years.forEach(function(y, j) {
      if (d[y + '_rank'] != 'n/a') {
        d[y + '_rank'] = +d[y + '_rank'];
      }
      if (d[y + '_rank'] <= 10) {
        isTopPlay = true;
        isTopPlayCount++;
      }
      delete d[y];
    });

    if (isTopPlayCount >= 2) {
      filteredData.push(d);
    }
  });

  filteredData.sort(function(a,b){
    return d3.ascending(a['play_sort'], b['play_sort']);
  });

  filteredData.forEach(function(d,i) {
    playIndex[ d['play'] ] = i;
  });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function() {
  var element = document.querySelector("#musical");
  var width = element.offsetWidth;

  graphicWidth = width;

  // make play drop-down
  var playSelectorWrapper = d3.select('#musical')
    .html('')
    .append('div')
      .attr('class', 'play-selector');

  playSelectorWrapper.append('label')
    .attr('for', 'play')
    .text('Select a musical');

  var playSelector = playSelectorWrapper.append('select')
    .attr('name', 'play');

  filteredData.forEach(function(d, i) {
    playSelector.append('option')
      .attr('value', function() {
        return d['play'];
      })
      .text(function() {
        return d['play'];
      });
  });
  playSelector.on('change', onPlaySelected);

  // Render the chart!
  var chartContainerElement = d3.select('#musical')
    .append('div')
    .attr('id', 'ratings');

  playSelector.property('value', activePlay).each(onPlaySelected);

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
}

var onPlaySelected = function() {
    activePlay = d3.select(this).property('value');

    renderColumnChart({
        container: '#ratings',
        width: graphicWidth,
        data: filteredData[ playIndex[activePlay] ],
        years: years
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}


/*
 * Render a column chart.
 */
var renderColumnChart = function(config) {
    /*
     * Setup chart container.
     */
    var aspectWidth = isMobile.matches ? 4 : 16;
    var aspectHeight = isMobile.matches ? 3 : 7;
    maxHeight = 330;

    var margins = {
        top: 20,
        right: 0,
        bottom: 20,
        left: 0
    };

    var ticksY = 4;
    var roundTicksFactor = 50;

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];
    if (chartHeight > maxHeight) {
        chartHeight = maxHeight;
    }

    var barHeight = Math.floor(chartHeight / ranksShown) - 1;

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    // Add play info
    var metaInfo = containerElement.append('div')
        .attr('class', 'meta');

    if (config['data']['img']) {
        metaInfo.append('img')
            .attr('src', 'assets/' + config['data']['img'])
            .attr('alt', 'Illustration: ' + config['data']['play']);
    }

    metaInfo.append('h3')
        .text(config['data']['play']);

    if (config['data']['description']) {
        metaInfo.classed('featured', true);
        metaInfo.append('p')
            .attr('class', 'description')
            .html('Trivia: ' + config['data']['description']);
    }

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var xScale = d3.scaleBand()
      .range([0, chartWidth])
      .round(true)
      .padding(0.15)
      .domain(config['years']);

    var yDomain = [];
    var counter = ranksShown;
    while (counter > 0) {
        yDomain.push(counter);
        counter--;
    }

    var yScale = d3.scaleBand()
      .range([chartHeight, 0])
      .round(true)
      .padding(0.05)
      .domain(yDomain);

    /*
     * Create D3 axes.
     */
    var xAxis = d3
      .axisTop()
      .scale(xScale)
      .tickSize(0)
      .tickPadding(6)
      .tickFormat(function(d, i) {
        return d + 's';
      });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .call(xAxis);

    /*
     * Render bars to chart.
     */
    for (year in config['years']) {
        var thisYear = config['years'][Number(year)];
        var nextYear = config['years'][(Number(year) + 1)];
        var rankThisYear = config['data'][thisYear + '_rank'];
        var rankNextYear = config['data'][nextYear + '_rank'];

        // draw connecting polygons
        // via: http://stackoverflow.com/questions/13204562/proper-format-for-drawing-polygon-data-in-d3
        if (rankThisYear <= ranksShown && rankNextYear <= ranksShown) {
            var coordinates = [ { 'x': (xScale(thisYear) + xScale.bandwidth()), 'y': yScale(rankThisYear) },
                                { 'x': (xScale(thisYear) + xScale.bandwidth()), 'y': (yScale(rankThisYear) + yScale.bandwidth()) },
                                { 'x': xScale(nextYear), 'y': (yScale(rankNextYear) + yScale.bandwidth()) },
                                { 'x': xScale(nextYear), 'y': yScale(rankNextYear) } ];

            chartElement.selectAll('.poly')
                .data([coordinates])
                .enter().append('polygon')
                    .attr('class', 'rank-connector')
                    .attr('points', function(d) {
                        return d.map(function(d) {
                            return [ d['x'], d['y'] ].join(',');
                        }).join(' ');
                    });
        }

        // draw rank bars
        var yearBar = chartElement.append('g')
            .attr('class', 'bars bar-' + thisYear);

        for (i = 1; i <= ranksShown; i++) {
            var thisRank = i;
            yearBar.append('rect')
                .attr('class', 'rank-' + thisRank)
                .attr('x', xScale(thisYear))
                .attr('y', yScale(i))
                .attr('width', xScale.bandwidth())
                .attr('height', yScale.bandwidth());
        }

        // highlight this play's ranks
        if (rankThisYear <= ranksShown) {
            var thisRankBar = chartElement.select('.bar-' + thisYear + ' rect.rank-' + rankThisYear)
                .classed('active', true);

            chartElement.append('text')
                .attr('class', 'rank-value')
                .attr('x', xScale(thisYear) + (xScale.bandwidth() / 2))
                .attr('y', yScale(rankThisYear) + (barHeight / 2) + 4)
                .text(rankThisYear);
        } else {
            chartElement.append('text')
                .attr('class', function(d) {
                    var c = 'rank-value below';
                    if (isNaN(rankThisYear)) {
                        c += ' na';
                    }
                    return c;
                })
                .attr('x', xScale(thisYear) + (xScale.bandwidth() / 2))
                .attr('y', chartHeight + 15)
                .text(function(d) {
                    if (isMobile.matches) {
                        return rankThisYear;
                    } else {
                        return 'Rank: ' + rankThisYear;
                    }
                });
        }

    }
}

module.exports = initialize;

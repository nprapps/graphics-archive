// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(data) {
        data = JSON.parse(data);
        ANALYTICS.trackEvent('scroll-depth', data.percent, data.seconds);
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    DATA['team_experience'].forEach(function(d) {
        d['values'] = [];
        d['offset'] = +d['offset'];

        var x0 = d['offset'];

        for (var key in d) {
            if (key == 'label' || key == 'values' || key == 'offset') {
                continue;
            }

            d[key] = +d[key];

            var x1 = x0 + d[key];

            d['values'].push({
                'name': key,
                'x0': x0,
                'x1': x1,
                'val': d[key]
            })

            x0 = x1;
        }
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = DEFAULT_WIDTH;
    }

    var smallGraphicWidth = null;
    var miniGraphicWidth = null;
    var gutterWidth = 22;

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
        // smallGraphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
        smallGraphicWidth = containerWidth;
        miniGraphicWidth = Math.floor((containerWidth - (gutterWidth * 2)) / 3);
    } else {
        isMobile = false;
        smallGraphicWidth = Math.floor((containerWidth - gutterWidth) / 2);
        miniGraphicWidth = Math.floor((containerWidth - (gutterWidth * 2)) / 3);
    }

    // Render the chart!
    var containerElement = d3.select('#graphic');
    containerElement.html('');

    var teamExperienceContainer = containerElement.append('div')
        .attr('class', 'chart team_experience');
    teamExperienceContainer.append('h3')
        .html(HEADERS['team_experience']['header']);
    teamExperienceContainer.append('p')
        .attr('class', 'description')
        .html(HEADERS['team_experience']['description']);
    renderTeamExperienceChart({
        container: '.chart.team_experience',
        width: containerWidth,
        data: DATA['team_experience']
    });


    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render team experience chart.
 */
var renderTeamExperienceChart = function(config) {
  /*
   * Setup
   */
  var labelColumn = 'label';

  var barHeight = 25;
  var barGap = 5;
  var labelWidth = 100;
  var labelMargin = 10;
  var valueGap = 6;

  var margins = {
      top: 27,
      right: 20,
      bottom: 0,
      left: (labelWidth + labelMargin)
  };

  var ticksX = 4;
  var roundTicksFactor = 5;

  if (isMobile) {
      ticksX = 2;
  }

  // Calculate actual chart dimensions
  var chartWidth = config['width'] - margins['left'] - margins['right'];
  var chartHeight = ((barHeight + barGap) * config['data'].length);

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config['container']);
  // containerElement.html('');

  /*
   * Create D3 scale objects.
   */
   var min = d3.min(config['data'], function(d) {
       return Math.floor(d['offset'] / roundTicksFactor) * roundTicksFactor;
   });

   if (min > 0) {
       min = 0;
   }

   var max = d3.max(config['data'], function(d) {
       return Math.ceil(d['Experience'] / roundTicksFactor) * roundTicksFactor;
   });

   var xScale = d3.scale.linear()
       .domain([min, max])
       .rangeRound([0, chartWidth]);

   var colorScale = d3.scale.ordinal()
       .domain(d3.keys(config['data'][0]).filter(function(d) {
           return d != labelColumn && d != 'values' && d != 'offset';
       }))
       .range([ '#999', '#e6b60f' ]);

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
   * Create D3 axes.
   */
  var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .ticks(ticksX)
      .tickFormat(function(d) {
          return d + '%';
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
               return 'group ' + classify(d[labelColumn]);
           })
           .attr('transform', function(d,i) {
               return 'translate(0,' + (i * (barHeight + barGap)) + ')';
           });

   group.selectAll('rect')
       .data(function(d) {
           return d['values'];
       })
       .enter().append('rect')
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
           .style('fill', function(d) {
               return colorScale(d['name']);
           })
           .attr('class', function(d) {
               return classify(d['name']);
           });

   /*
    * Render bar values.
    */
   group.append('g')
      .attr('class', 'value')
      .selectAll('text')
      .data(function(d) {
          return d['values'];
      })
      .enter().append('text')
          .text(function(d) {
              if (d['val'] != 0) {
                  return d['val'] + '%';
              }
          })
          .attr('class', function(d) {
              return classify(d['name']);
          })
          .attr('x', function(d,i) {
              if (i == 0) {
                  return xScale(d['x0']);
              } else {
                  return xScale(d['x1']);
              }
          })
          .attr('dx', function(d,i) {
              if (i == 0) {
                  return valueGap;
              } else {
                  return -valueGap;
              }
          })
          .attr('dy', (barHeight / 2) + 4)

  /*
   * Render 0-line.
   */
  // if (min < 0) {
  //     chartElement.append('line')
  //         .attr('class', 'zero-line')
  //         .attr('x1', xScale(0))
  //         .attr('x2', xScale(0))
  //         .attr('y1', 0)
  //         .attr('y2', chartHeight);
  // }

  /*
   * Render bar labels.
   */
  chartWrapper.append('ul')
      .attr('class', 'labels')
      .attr('style', formatStyle({
          'width': labelWidth + 'px',
          'top': margins['top'] + 'px',
          'left': '0'
      }))
      .selectAll('li')
      .data(config['data'])
      .enter()
      .append('li')
          .attr('style', function(d, i) {
              return formatStyle({
                  'width': labelWidth + 'px',
                  'height': barHeight + 'px',
                  'left': '0px',
                  'top': (i * (barHeight + barGap)) + 'px;'
              });
          })
          .attr('class', function(d) {
              return classify(d[labelColumn]);
          })
          .append('span')
              .text(function(d) {
                  return d[labelColumn];
              });

    // labels
    var annotations = chartElement.append('g')
      .attr('class', 'annotations');
    annotations.append('text')
      .html('First time')
      .attr('class', 'label no-experience')
      .attr('x', xScale(0))
      .attr('y', -15)
      .attr('dx', -valueGap)
      .attr('fill', colorScale('No Experience'));
    annotations.append('text')
      .html('Returning')
      .attr('class', 'label experience')
      .attr('x', xScale(0))
      .attr('y', -15)
      .attr('dx', valueGap)
      .attr('fill', colorScale('Experience'));
}


/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

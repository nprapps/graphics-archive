var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
var VALUE_MIN_HEIGHT = 20;

var $category = null;
var $job = null;
var $output = null;
var $outputContainer = null;

var outputTemplate = null;
var pymChild = null;
var isMobile = false;
var containerWidth = null;

var chartData = {};
var selectedJob = null;
var $imageContainer = $('#imageContainer');


/*
 * Window loaded.
 */
var onWindowLoaded = function() {
    $category = $('#category');
    $job = $('#job');
    $output = $('#output');
    $outputContainer = $('#output-container');

    outputTemplate = _.template($('#output-template').html());

    $category.on('change', onCategoryChange);
    $job.on('change', onJobChange);

    for (var i = 0; i < TRAITS.length; i++) {
        var slug = TRAITS[i]['slug'];
        var cslug = TRAITS[i]['cslug'];
        var data = [];

        for (var j = 0; j < DISTRIBUTIONS.length; j++) {
            data.push({
                'score': DISTRIBUTIONS[j]['score'],
                'pct': DISTRIBUTIONS[j][slug],
                'cpct': DISTRIBUTIONS[j][cslug]
            })
        }

        chartData[slug] = data;
    }

    // office workers (for bookkeepers)
    updateJobSelect(43);
    $job.val('Bookkeepers');

    selectedJob = _.find(JOBS, function(j) {
        return j['Occupation Name'] == 'Bookkeepers';
    });

    showJob();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Render the graphic
 */
var render = function(width) {
    containerWidth = width;

    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth < MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    if (chartData) {
        drawCharts();
    }
}

/*
 * Chart the distribution of one task type.
 */
var drawDistributionChart = function(container, graphicWidth, graphicData, highlight) {
    var margin = {
        top: 20,
        right: 15,
        bottom: 35,
        left: 50
    };

    var gutter = 11;

    var ticksY = 2;

    if (!isMobile) {
        graphicWidth -= gutter;
    }

    var width = graphicWidth - margin['left'] - margin['right'];
    var height = 60;

    var x = d3.scale.ordinal()
        .rangeBands([0, width], 0.1, 0)
        .domain(graphicData.map(function (d) {
            return d['score'];
        }));

    var y = d3.scale.linear()
        .domain([ 0, 0.2 ])
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickSize(0)
        .tickFormat(function(d, i) {
            var val = d.split('-')[0];

            if (val == '0' || val == '50') {
                return val;
            }

            return '';
        })

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(ticksY)
        .tickValues([0, 0.2])
        .tickFormat(function(d) {
            return (d * 100).toFixed(0) + '%';
        })

    var y_axis_grid = function() { return yAxis; }

    var containerElement = d3.select(container);

    // clear previous
    containerElement.html('');
    var svgName = container.replace(/#/g, '')
    // draw the chart itself
    var svg = containerElement
        .append('svg')
        .attr('id', function() {
            return + 'svg-' + svgName ;
        })
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0)
            .tickFormat('')
        );

    svg.selectAll('.x.axis .tick')
        .attr('transform', function() {
            var el = d3.select(this);
            var transform = d3.transform(el.attr('transform'));

            transform.translate[0] = transform.translate[0] - x.rangeBand() / 2;
            transform.translate[1] = 3;

            return transform.toString();
        })
        test = graphicData[0]

    // Add tick on 100 line
    var tick = svg.select('.x.axis')
        .append('g')
        .attr('class', 'tick')
        .attr('transform', function() {
            var transform = d3.transform();

            transform.translate[0] = x('95-100') + x.rangeBand();

            return transform.toString();
        })

    tick.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', 0)
        .attr('y', xAxis.outerTickSize() + 3)
        .attr('dy', '0.71em')
        .text('100');

var pinPoint;
var pinPointY;
var cumulativePercent;
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphicData)
        .enter().append('rect')
            .attr('x', function(d) {
                return x(d['score']);
            })
            .attr('y', function(d) {
                return y(d['pct']);
            })
            .attr('width', x.rangeBand())
            .attr('height', function(d){
                return y(0) - y(d['pct']);
            })
            .attr('class', function(d) {
                var cls = 'bar bar-' + d['score'];

                if (highlight) {
                    var minmax = d['score'].split('-');

                    if (highlight >= parseInt(minmax[0]) && highlight < parseInt(minmax[1])) {
                        cls += ' highlight';
                        pinPoint = d['score']
                        pinPointY = d['pct']
                        cumulativePercent = d['cpct']*100
                    }
                }

                return cls;
            });

    svg.append('g')
    .attr('class', 'y label')
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('x', -30)
    .attr('y', -35)
    .attr('transform', function() {
        var transform = d3.transform();

        transform.rotate = 270;

        return transform.toString();
    })
    .text('Jobs');

    // svg.append('g')
    //     .attr('class', 'x label')
    //     .append('text')
    //     .attr('text-anchor', 'middle')
    //     .attr('x', width / 2)
    //     .attr('y', height + margin['top'] + margin['bottom'] - 25)
    //     .text('Importance');

    if (container != "#cramped-chart") {
        svg.append('g')
            .attr('class', 'x label')
            .append('text')
            .attr('text-anchor', 'start')
            .attr('x', 0)
            .attr('y', height + margin['top'] + margin['bottom'] - 25)
            .text('More Automation');

        svg.append('g')
            .attr('class', 'x label')
            .append('text')
            .attr('text-anchor', 'end')
            .attr('x', width)
            .attr('y', height + margin['top'] + margin['bottom'] - 25)
            .text('Less Automation');
    } else {
        svg.append('g')
            .attr('class', 'x label')
            .append('text')
            .attr('text-anchor', 'end')
            .attr('x', width)
            .attr('y', height + margin['top'] + margin['bottom'] - 25)
            .text('More Automation');

        svg.append('g')
            .attr('class', 'x label')
            .append('text')
            .attr('text-anchor', 'start')
            .attr('x', 0)
            .attr('y', height + margin['top'] + margin['bottom'] - 25)
            .text('Less Automation');
    }

    svg.append('line')
        .attr('class', 'y grid grid-0')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(0))
        .attr('y2', y(0));

    if (highlight) {
    var testX = .022*width
    var xMove = x(pinPoint) + testX
    var yMove = y(pinPointY) - 6
    svg.append("path")
      .attr("class", "triangle")
      .attr("d", d3.svg.symbol().size(24).type("triangle-down"))
      .attr("transform", function(d) { return "translate(" + xMove + "," + yMove + ")"; });

    // if (isMobile) {
    //     if (highlight > 40) {
    //     svg.append("text")
    //       .attr("class", "explainer-text")
    //       .attr("x", xMove)
    //       .attr("dx", -8)
    //       .attr("y", yMove + 1)
    //       .text("more than " + cumulativePercent.toFixed(0) + "%" )
    //       .attr("text-anchor", 'end')
    //     } else {
    //     svg.append("text")
    //       .attr("class", "explainer-text")
    //       .attr("x", xMove)
    //       .attr("dx", 8)
    //       .attr("y", yMove + 1)
    //       .text("more than " + cumulativePercent.toFixed(0) + "%" )
    //     }
    // } else {
    //     if (highlight > 40) {
    //     svg.append("text")
    //       .attr("class", "explainer-text")
    //       .attr("x", xMove)
    //       .attr("dx", -8)
    //       .attr("y", yMove + 1)
    //       .text("more than " + cumulativePercent.toFixed(0) + " % of all jobs." )
    //       .attr("text-anchor", 'end')
    //     } else {
    //     svg.append("text")
    //       .attr("class", "explainer-text")
    //       .attr("x", xMove)
    //       .attr("dx", 8)
    //       .attr("y", yMove + 1)
    //       .text("more than " + cumulativePercent.toFixed(0) + "% of all jobs." )
    //     }
    // }
    }
}

var onCategoryChange = function() {
    var val = $(this).val();

    // Reset charts
    selectedJob = null;
    drawCharts();

    updateJobSelect(val);
}

var updateJobSelect = function(category) {
    $job.empty();
    $job.append('<option value="none">Select a job</option>')

    for (var i = 0; i < JOBS.length; i++) {
        var job = JOBS[i];

        if (job['BLS codes'].indexOf(category) != 0) {
            continue;
        }

        var jobName = job['Occupation Name'] ;

        $job.append('<option value="' + jobName + '">' + jobName + '</option>')
    }

    $job.show();
}

/*
 * Job dropdown entry selected.
 */
var onJobChange = function() {
    var val = $(this).val();

    selectedJob = _.find(JOBS, function(j) {
        return j['Occupation Name'] == val;
    })

    if (!selectedJob) {
        return;
    }

    showJob();
}

var showJob = function() {
    pickGif(selectedJob['Probability of Computerisation']);

    $output.animate({
        opacity: 0
    }, {
        duration: 'fast',
        complete: function() {
            $output.html(outputTemplate({ 'job': selectedJob }));
        }
    });

    $output.animate({
        opacity: 1
    }, {
        duration: 'fast'
    });

    $outputContainer.show({
        duration: 'fast',
        progress: function() {
            if (pymChild) {
                pymChild.sendHeight();
            }
        },
        complete: function() {
            if (pymChild) {
                pymChild.sendHeight();
            }
        }
    });

    drawCharts();
}

function pickGif(percent) {
    var jobImage = null;
    var currentImage = $imageContainer.find('img:visible').first().attr('class');

    if (percent < .25) {
        jobImage = 'human-1';
    } else if (percent < .5){
        jobImage = 'human-2';
    } else if (percent < .75){
        jobImage = 'human-3';
    } else if (percent < 1){
        jobImage = 'human-4';
    }

    if (currentImage !== jobImage){
        $imageContainer.animate({
            opacity: 0
        }, {
            duration: 'fast',
            complete: function() {
                $imageContainer.find('img').hide();
                $imageContainer.find('.' + jobImage).show();
            }
        });

        $imageContainer.animate({
            opacity: 1
        }, {
            duration: 'fast'
        });
    }

}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}


var drawCharts = function() {
    for (var i = 0; i < TRAITS.length; i++) {
        var trait = TRAITS[i];
        var highlight = null;

        if (selectedJob) {
            var highlight = selectedJob[trait['name']];
        }

        var width = isMobile ? containerWidth : containerWidth / 2;
        if (width) {
            drawDistributionChart('#' + trait['slug'] + '-chart', width, chartData[trait['slug']], highlight);
        }
    };

    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(onWindowLoaded);

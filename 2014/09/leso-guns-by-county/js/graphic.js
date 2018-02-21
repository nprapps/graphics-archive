var pymChild = null;
var mobile_threshold = 425;
var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var $graphic;
var graphic_data_urls = ['per_1000.csv', 'total.csv']
var graphic_data = [];
var bar_height = 17;
var bar_gap = 6;

function render(width) {

    if (width < 1000) {
        var graphic_width = width;
    }
    else {
        var graphic_width = width / 2;
    }

    $graphic.empty();

    graphic_data.forEach(function(data) {
        drawChart(data, graphic_width);
    });
}

function drawChart(data, overall_width) {

    var commasFormatter = d3.format(",");

    var num_bars = data.length;

    var tick_count = 6;
    if (width < mobile_threshold) { tick_count = 4};

    var margin = { top: 30, right: 50, bottom: 35, left: 130 };
    var width = overall_width - margin.left - margin.right;
    var height = ((bar_height + bar_gap) * num_bars);

    var x = d3.scale.linear()
        .range([0, width])

    var y = d3.scale.ordinal()
        .rangeRoundBands([0, height], .2);


        x.domain(d3.extent(data, function(d) { return d.count; })).nice();
        y.domain(data.map(function(d) { return d.county; }));

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(tick_count)
        .tickFormat(function(d) { return commasFormatter(d)});

    var x_axis_grid = function() { return xAxis; }

    // draw the legend
    if ($('.key').length < 1) {
        var legend = d3.select('#graphic')
            .append('ul')
                .attr('class', 'key')
                .append('li')
                    .attr('class', 'key-item');
        legend.append('b')
            .style('background-color', '#3D7FA6');
        legend.append('label')
            .text('State capital in county');
    }

    // create a div for each chart
    var chart = d3.select('#graphic').append('div')
        .attr('class', 'bar-chart')
        .style('width', overall_width + 'px')
        .style('height', height + margin.top + margin.bottom + 'px')

    // give each chart a title
    var title = chart.append('div')
        .attr('class', 'chart-title')
        .style('width', overall_width + 'px')
    if (data[0]['county'] == 'Franklin, Ky.') {
        title.append('h4').text('Guns Acquired Per 1,000 People')
    }
    else {
        title.append('h4').text('Total Guns Acquired')
    }

    var svg = chart.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,230)')
        .call(xAxis);


    svg.append('g')
        .attr('class', 'x grid')
        .call(x_axis_grid()
            .tickSize(height, 0, 0)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(data)
        .enter().append('rect')
            .attr("y", function(d, i) { return i * (bar_height + bar_gap); })
            .attr("width", function(d){ return x(d.count); })
            .attr("height", bar_height)
            .attr('class', function(d) {
                if (d.state_capital == 'y') {
                    return 'bar capital ' + d.county.replace(/\s+/g, '-').toLowerCase();
                }
                else {
                    return 'bar ' + d.county.replace(/\s+/g, '-').toLowerCase();
                }
            });

   svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(data)
        .enter().append('text')
            .attr('x', function(d) { return x(d.count) })
            .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
            .attr('dx', 36)
            .attr('dy', 14)
            .attr('text-anchor', 'end')
            .attr('class', function(d) { return 'l-' + d.county.replace(/\s+/g, '-').toLowerCase() })
            .text(function(d) { return  commasFormatter(d.count)});

    svg.append('g')
        .attr('class', 'title')
        .select('text')
            .data(data)
        .enter().append('text')
        .attr("x", (width / 2))
        .attr("y", -10)
        .attr('text-anchor', 'middle')
        .text(function(d) { return d.title } );

    var labels = chart.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + margin['left'] + 'px; top: ' + (margin['top'] + 42) +'px;')
        .selectAll('li')
            .data(data)
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + (margin['left'] - 10) + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return classify(d['county']);
            })
            .append('span')
                .text(function(d) {
                    return d['county']
                });


    /* update responsive iframe */

    if (pymChild) {
        pymChild.sendHeight();
    }
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}

/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    graphic_data_urls.forEach(function(url) {
        d3.csv(url, function(error, data) {
            $graphic = $('#graphic');
            data.forEach(function(d) {
                d.county = d.county;
                d.count = d3.round(+d.count,1);
                d.state_capital = d.state_capital
            });
            graphic_data.push(data);

            // if both sets of data are in the array
            if (graphic_data.length > 1) {
                pymChild = new pym.Child({
                    renderCallback: render
                });
            }
        });
    });
});

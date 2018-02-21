var pymChild = null;
var mobile_threshold = 425;
var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

/*
 * TODO: draw your graphic
 */

var $graphic = $('#graphic');
    var graphic_data_url = 'data.csv';
    var graphic_data;
    var bar_height = 17;
    var bar_gap = 6;


d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};



function render(width) {

    var graphic_width = width;

    drawChart(graphic_width);

    }

    function drawChart(width) {

        $graphic.empty();

        var commasFormatter = d3.format(",.0f");

        var num_bars = graphic_data.length;

        var tick_count = 6;
        if (width < mobile_threshold) { tick_count = 4};

        var margin = { top: 30, right: 50, bottom: 35, left: 140 };
        var width = width - margin.left - margin.right;
        var height = ((bar_height + bar_gap) * num_bars);

        var x = d3.scale.linear()
            .range([0, width])

        var y = d3.scale.ordinal()
            .rangeRoundBands([0, height], .2);


            x.domain(d3.extent(graphic_data, function(d) { return d.cost; })).nice();
            // x.domain([0, 400000000])
            y.domain(graphic_data.map(function(d) { return d.name; }));

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .ticks(tick_count)
            .tickFormat(function(d) { return '$' + commasFormatter(d / 1000000) + 'm' });

        var x_axis_grid = function() { return xAxis; }

        var svg = d3.select('#graphic').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,235)')
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
                .data(graphic_data)
            .enter().append('rect')
                .attr("y", function(d, i) { return i * (bar_height + bar_gap); })
                .attr("width", function(d){ return x(d.cost); })
                .attr("height", bar_height)
                .attr('class', function(d) { return 'bar ' + d.name.replace(/\s+/g, '-').toLowerCase() });

       svg.append('g')
            .attr('class', 'value')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', function(d) { return x(d.cost) })
                .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
                .attr('dx', 40)
                .attr('dy', 12)
                .attr('text-anchor', 'end')
                .attr('class', function(d) { return 'l-' + d.name.replace(/\s+/g, '-').toLowerCase() })
                .text(function(d) { return '$' + commasFormatter(d.cost / 1000000) + 'm' });

    var labels = d3.select('#graphic').append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + margin['left'] + 'px; top: ' + margin['top'] + 'px;')
        .selectAll('li')
            .data(graphic_data)
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
                return classify(d['name']);
            })
            .append('span')
                .text(function(d) {
                    return d['name']
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
            d3.csv(graphic_data_url, function(error, data) {
                graphic_data = data;

                graphic_data.forEach(function(d) {
                    d.name = d.name;
                    d.cost = d3.round(+d.total_cost,2);
                });

                pymChild = new pym.Child({
                    renderCallback: render
                });
            });
})

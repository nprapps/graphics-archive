var pymChild = null;
var bar_height = 20;
var bar_gap = 3;
var color;
var graphic_default_width = 600;
var graphic_margin = 11;
var is_mobile = false;
var mobile_threshold = 540;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var graphic_data_age = [
    { 'label': 'Age 18-24', 'amt': 17.3 },
    { 'label': 'Age 25-44', 'amt': 21.6 },
    { 'label': 'Age 45-64', 'amt': 19.5 },
    { 'label': 'Age 65+', 'amt': 8.9 }
];

var graphic_data_gender = [
    { 'label': 'Overall', 'amt': 18.1 },
    { 'label': 'Adult men', 'amt': 20.5 },
    { 'label': 'Adult women', 'amt': 15.8 }
];

var graphic_data_education = [
    { 'label': 'Some high school', 'amt': 24.7 },
    { 'label': 'GED diploma', 'amt': 41.9 },
    { 'label': 'High school diploma', 'amt': 23.1 },
    { 'label': 'Undergraduate degree', 'amt': 9.1 },
    { 'label': 'Postgraduate degree', 'amt': 5.9 }
];

var graphic_data_race = [
    { 'label': 'Multiple races', 'amt': 26.1 },
    { 'label': 'American Indian', 'amt': 21.8 },
    { 'label': 'White (non-Hispanic)', 'amt': 19.7 },
    { 'label': 'Black', 'amt': 18.1 },
    { 'label': 'Hispanic', 'amt': 12.5 },
    { 'label': 'Asian', 'amt': 10.7 }
];

var headers = {
    'gender': 'Overall and by gender',
    'age': 'By age',
    'education': 'By education',
    'race': 'By race/ethnicity'
};


/*
 * Render the graphic
 */
function render(container_width) {
    var graphic_width;
    var header_keys = d3.entries(headers);

    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
        graphic_width = container_width;
    } else {
        is_mobile = false;
        graphic_width = Math.floor((container_width / 2) - graphic_margin);
    }

    // clear out existing graphics
    $graphic.empty();

    for (var i = 0; i < header_keys.length; i++) {
        draw_chart(header_keys[i]['key'], eval('graphic_data_' + header_keys[i]['key']), graphic_width);
    }

    // console.log(container_width, graphic_width);
}

function draw_chart(id, graphic_data, graphic_width) {
    var num_bars = graphic_data.length;
    var margin = { top: 0, right: 15, bottom: 30, left: 130 };
    var width = graphic_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);

    var x = d3.scale.linear()
        .domain([0, 50])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickValues([0,25,50])
        .tickFormat(function(d,i) {
            return d.toFixed(0) + '%';
        });

    var x_axis_grid = function() { return xAxis; }

    var chart = d3.select('#graphic').append('div')
        .attr('class', 'chart ' + classify(headers[id]))
        .style('width', graphic_width + 'px');

    chart.append('h4')
        .text(headers[id]);

    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr("transform", "translate(" + margin['left'] + "," + margin['top'] + ")");

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr("y", function(d, i) {
                return i * (bar_height + bar_gap);
            })
            .attr("width", function(d){
                return x(d['amt']);
            })
            .attr("height", bar_height)
            .attr('class', function(d) {
                return classify(d['label']);
            });

    svg.append('g')
        .attr('class', 'label')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', 0)
            .attr('y', function(d, i) {
                return i * (bar_height + bar_gap);
            })
            .attr('dx', -6)
            .attr('dy', (bar_height / 2) + 4)
            .attr('text-anchor', 'end')
            .attr('class', function(d) {
                return classify(d['label']);
             })
            .text(function(d) {
                return d['label']
            });

    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', function(d) {
                return x(d['amt']);
            })
            .attr('y', function(d, i) {
                return i * (bar_height + bar_gap);
            })
            .attr('dx', 6)
            .attr('dy', (bar_height / 2) + 4)
            .attr('text-anchor', 'begin')
            .attr('class', function(d) {
                return classify(d['label']);
            })
            .text(function(d) {
                return d['amt'].toFixed(0) + '%';
            });

    if (pymChild) {
        pymChild.sendHeightToParent();
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
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // setup pym
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

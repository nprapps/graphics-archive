var $graphic;

var bar_height = 20;
var bar_gap = 3;
var color;
var graphic_data = [];
var graphic_data_url = 'data.csv';
var graphic_margin = 6;
var label_width = 74;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var group_labels = { 'economy': 'The economy',
                     'health': 'Health care',
                     'future': 'The future of the middle class',
                     'foreign': 'Foreign policy' };

/*
 * Render the graphic
 */
function render(container_width) {
    // clear out existing graphics
    $graphic.empty();
    
    var data = d3.entries(graphic_data);
    
    d3.entries(data).forEach(function(d) {
        var k = d['value']['key'];
        draw_grouping(k, graphic_data[k], container_width);
    });
}

function draw_grouping(id, data, container_width) {
    var d3graphic = d3.select('#graphic');
    var data_holder = d3.entries(data)[0];
    var num_graphics = d3.entries(data).length;
    var graphic_width = ((container_width - label_width) / num_graphics) - graphic_margin;
    
    d3graphic.append('h3')
        .text(group_labels[id]);
    
    var grouping = d3graphic.append('div')
        .attr('class', 'grouping ' + id)
        .style('padding-left', label_width + 'px');
    
    var labels = grouping.append('ul')
        .attr('class', 'labels')
        .attr('style', 'width: ' + label_width + 'px; top: 20px; left: 0;')
        .selectAll('li')
            .data(d3.entries(data_holder['value']))
        .enter().append('li')
            .attr('style', function(d,i) {
                var s = '';
                s += 'width: ' + label_width + 'px; ';
                s += 'height: ' + bar_height + 'px; ';
                s += 'left: ' + 0 + 'px; ';
                s += 'top: ' + (i * (bar_height + bar_gap)) + 'px; ';
                return s;
            })
            .attr('class', function(d) {
                return classify(d['key']);
            })
            .append('span')
                .text(function(d) { 
                    return d['key'];
                });
    
    d3.entries(data).forEach(function(d) {
        draw_chart(d, graphic_width, id);
    });
}

function draw_chart(data, graphic_width, grouping) {
    var num_bars = d3.entries(data['value']).length;
    var margin = { top: 0, right: 25, bottom: 0, left: 0 };
    var width = graphic_width - margin['left'] - margin['right'];
    var height = ((bar_height + bar_gap) * num_bars);
    
    var x = d3.scale.linear()
        .domain([0, 90])
        .range([0, width]);

    var y = d3.scale.linear()
        .range([height, 0]);

    var chart = d3.select('.' + grouping).append('div')
        .attr('class', 'chart ' + classify(data['key']))
        .style('width', graphic_width + 'px');
    
    chart.append('h4')
        .attr('class', classify(data['key']))
        .text(data['key']);
    
    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
        .attr("transform", "translate(" + margin['left'] + "," + margin['top'] + ")");
    
    svg.append('g')
        .attr('class', 'bars')
        .selectAll('rect')
            .data(d3.entries(data['value']))
        .enter().append('rect')
            .attr("y", function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr("width", function(d){ 
                return x(d['value']);
            })
            .attr("height", bar_height)
            .attr('class', function(d) { 
                return classify(d['key']);
            });
    
    svg.append('g')
        .attr('class', 'value')
        .selectAll('text')
            .data(d3.entries(data['value']))
        .enter().append('text')
            .attr('x', function(d) { 
                return x(d['value']);
            })
            .attr('y', function(d, i) { 
                return i * (bar_height + bar_gap);
            })
            .attr('dx', 3)
            .attr('dy', (bar_height / 2) + 3)
            .attr('text-anchor', 'begin')
            .attr('class', function(d) { 
                return classify(d['key']);
            })
            .text(function(d) { 
                return d['value'] + '%';
            });
    
    if (pymChild) {
        pymChild.sendHeight();
    }
}


function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}


$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        // load the data
        d3.csv(graphic_data_url, function(error, data) {

            data.forEach(function(d) {
                var issue = d['issue'];
                var group = d['group'];
                delete d['issue'];
                delete d['group'];

                if (graphic_data[issue] == undefined) {
                    graphic_data[issue] = [];
                }
                graphic_data[issue][group] = d;
            });
            
            // setup pym
            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

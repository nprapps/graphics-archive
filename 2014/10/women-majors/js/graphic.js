var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var fmt_comma = d3.format(',');
var graphic_data;
var graphic_data_url = 'majors.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 450;
var pymChild = null;


function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}


var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var color = d3.scale.ordinal()
            .range([ colors['red5'],
                     colors['red4'],
                     colors['red3'],
                     colors['yellow5'],
                     colors['yellow4'],
                     colors['yellow3'],
                     colors['orange5'],
                     colors['orange4'],
                     colors['orange3']]);

var colorStem = d3.scale.ordinal()
                .range([ colors['blue1'],
                         colors['blue2'],
                         colors['blue3'],
                         colors['blue4'],
                         colors['blue5']]);
var colorRed = d3.scale.ordinal()
                .range([ colors['red1'],
                         colors['red2'],
                         colors['red3'],
                         colors['red4'],
                         colors['red5']]);
var colorTeal = d3.scale.ordinal()
                .range([ colors['teal2'],
                         colors['teal3'],
                         colors['teal4'],
                         colors['teal2'],
                         colors['teal1']]);
var colorOrange = d3.scale.ordinal()
                .range([ colors['orange2'],
                         colors['orange3'],
                         colors['orange3'],
                         colors['orange4'],
                         colors['orange1']]);
var colorYellow = d3.scale.ordinal()
                .range([ colors['yellow1'],
                         colors['yellow2'],
                         colors['yellow5'],
                         colors['yellow3'],
                         colors['yellow5']]);


var stemFields = ["Engineering",
                  "Computer Science", 'Women Across All Majors']

var stemFields2 = ['Biology',
                  "Math and Statistics",
                  "Physical Sciences", 'Women Across All Majors']

var language = [  "English",
                  "Foreign Languages",
                  "Communications and Journalism",
                  "Art and Performance", 'Women Across All Majors']

var art = [ "Architecture"]
var biz = [ "Business", "Women Across All Majors"]
var other = ["Education", "Health Professions", "Psychology", "Public Administration", 'Women Across All Majors']

/*
 * Render the graphi2
 */
function render(container_width) {
    var graphic_width;

    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
        graphic_width = container_width;
    } else {
        is_mobile = false;
        graphic_width = Math.floor(container_width / 1);
    }

    // clear out existing graphics
    $graphic.empty();

    draw_graph('Computer Science And Engineering: Mostly Men ','stem', stemFields, graphic_width, colorStem);
    draw_graph('Health, Education, And Social Work: Mostly Women','other', other, graphic_width, colorYellow);
    draw_graph('Art, Communications, And Languages: More Women Than Men','language', language, graphic_width, colorRed);
    draw_graph('Math And Science: Close To Even ','stem2', stemFields2, graphic_width, colorStem);
    draw_graph('Business: Even Split', 'biz', biz, graphic_width, colorTeal);
    // draw_graph('art', art, graphic_width, colorOrange);

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function draw_graph(name,id, group, graphic_width, colorgroup) {


    var format = d3.time.format('%Y')
    var end = format.parse("2011");
    var start = format.parse("1970");
    var graphic_aspect_height = 3;
    var graphic_aspect_width = 3;
    var height;
    if (is_mobile) {
    var margin = { top: 5, right: 100, bottom: 30, left: 40 };
    } else {
    var margin = { top: 5, right: 180, bottom: 30, left: 40 };
    }
    var num_x_ticks = 5;
    var num_y_ticks = 5;

    width = graphic_width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

    var x = d3.time.scale()
        .range([0, width])

    var y = d3.scale.linear()
        .range([ height, 0 ]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickFormat(function(d,i) {
            if (is_mobile) {
                return '\u2019' + fmt_year_abbr(d);

            } else {
                return fmt_year_full(d);
            }
        });




    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        // .ticks(num_y_ticks)
        .tickValues([0, 25, 50, 75, 100])
        .tickFormat(function(d,i) {
                return d + '%';
        });

    var y_axis_grid = function() { return yAxis; };

    var line = d3.svg.line()
        .interpolate('linear')
        .x(function(d) {
            return x(d['date']);
        })
        .y(function(d) {
            return y(d['amt']);
        });

    color.domain(d3.keys(graphic_data[0]).filter(function(key) {
        return key !== 'date';
    }));

    // parse data into columns
    var formatted_data = {};
    for (var column in graphic_data[0]) {
        if (column == 'date') continue;
        formatted_data[column] = graphic_data.map(function(d) {
            return { 'date': d['date'], 'amt': d[column] };
        }).filter(function(d) {
            return d['amt'].length > 0;
        });
    }


    // set the data domain
    x.domain(d3.extent(graphic_data, function(d) {
        return d['date'];
    }));

    y.domain([0,100]);

    // draw the chart
    var chart = d3.select('#graphic')
        .append('div')
            .attr('class', 'chart ' + id)
            .attr('style', 'width: ' + graphic_width + 'px;');

    var header = chart.append('h3')
        .text(name);

    var deck = chart.append('h2')
        .text('% Of Female Undergraduates, By Major');

    var svg = chart.append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

    var xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    var yTop = svg.append('g') // Add the Y Axis
        .attr('class', 'y axis')
        .call(yAxis);

    var xGrid = svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    var yGrid = svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

// console.log(formatted_data)
// console.log(x(start))
// console.log(x(end))

var halfLine = svg.append('g')
                .attr('class', 'half-line')
                .append("line")
                .attr("x1", x(start))
                .attr("y1", y(50))
                .attr("x2", x(end))
                .attr("y2", y(50));


// var halfLabel = svg.append('g')
//                 .attr('class', 'gender-parity-label')
//                 .append("text")
//                 .attr("x", x(start))
//                 .attr("y", function(d) {
//                     if (is_mobile) {
//                         return y(53);
//                     } else {
//                         return y(51);
//                     }
//                 })
//                 .text('Gender Parity');


 var lines = svg.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(d3.entries(formatted_data))
        .enter()
        .append('path')
        .attr('class', function(d,i) {
            var found = $.inArray(d['key'], group)
            if (found != -1 ) {
                return 'line ' + id + '  line-'+ classify(d['key']);
            } else {;}
        })
        .attr('stroke', function(d,i) {
            var found = $.inArray(d['key'], group)
            if (found != -1 ) {
                return colorgroup(d['key']);
            } else {
                return '#ccc';
                // return color(d['key']);
            }
        })
        .attr('d', function(d,i) {
            var found = $.inArray(d['key'], group)
            // console.log('found',group)
            // console.log('d',d)
            // console.log('found',found)
            if (found != -1 ) {
                return line(d['value']);
            } else {;}
        });



        var ylabelText = svg.append('g')
            .attr('class', 'end-labels')
            .selectAll('labels')
            .data(d3.entries(formatted_data))
            .enter()
            .append('text')
            .attr('class', function(d,i) {
                var found = $.inArray(d['key'], group)
                if (found != -1 ) {
                    return 'labels-' + id + ' label-' + classify(d['key']);
                } else {;}
            })
            .attr("transform", function(d) {
                return "translate(" + x(d['value'][41]['date']) + "," + y(d['value'][41]['amt']) + ")"; })
            .attr("x",3)
            .attr("dy", ".3em")
            .text(function(d,i) {
                var found = $.inArray(d['key'], group)
                if (found != -1 ) {
                    return toTitleCase(d['key']);
                } else {;}
            })
            .attr('fill', function(d,i) {
                var found = $.inArray(d['key'], group)
                if (found != -1 ) {
                    return colorgroup(d['key']);
                } else {;}
            })
            .style('font-size', function(d) {
                if (is_mobile) {
                    return "9px";
                } else {
                    return "12px";
                }
            });

    d3.selectAll('.line-women-across-all-majors').style('stroke','#000');
    d3.selectAll('.line-women-across-all-majors').style('stroke-width','2px');
    d3.selectAll('.label-women-across-all-majors').style('fill','#000');

    switch (group) {
        case stemFields:
            d3.select('.label-math-and-statistics').attr('dy', -1);
            d3.select('.label-computer-science').attr('dy', -3);
            d3.select('.label-engineering').attr('dy', 6);

            chart.append('div').attr('class','footnotes')
            .append('p').html('For a complete list of specific majors that fall within each group see <a href="http://nces.ed.gov/ipeds/cipcode/browse.aspx?y=55" target="_blank">here</a>.')
            break;
        case stemFields2:
            chart.append('div').attr('class','footnotes')
            d3.select('.label-physical-sciences').attr('dy', 8).text('Physical Sciences*');
            d3.select('.label-biology').attr('dy', 0);
            d3.select('.labels-stem2.label-women-across-all-majors').attr('dy', 10);
            chart.append('div').attr('class','footnotes')
            .append('p').html('*Group includes physics, chemistry, geology, and astronomy.')
            .append('p').html('For a complete list of specific majors that fall within each group see <a href="http://nces.ed.gov/ipeds/cipcode/browse.aspx?y=55" target="_blank">here</a>.')
            break;
        case language:
            if (is_mobile) {
                d3.select('.label-foreign-languages').attr('dy', -6);
            } else {
                d3.select('.label-foreign-languages').attr('dy', -4);
            }
            if (is_mobile) {
                d3.select('.label-english').attr('dy', 1);
            } else {
                d3.select('.label-english').attr('dy', 5);
            }
            d3.select('.label-art-and-performance').attr('dy', 8);
            d3.select('.labels-language.label-women-across-all-majors').attr('dy', 8);
            d3.select('.label-communications-and-journalism').text('Communications/Journalism/PR').attr('dy', 0);
            chart.append('div').attr('class','footnotes')
            .append('p').html('For a complete list of specific majors that fall within each group see <a href="http://nces.ed.gov/ipeds/cipcode/browse.aspx?y=55" target="_blank">here</a>.')

            break;
        case biz:
            d3.select('.label-business').attr('dy', 7);
            chart.append('div').attr('class','footnotes')
            .append('p').html('For a complete list of specific majors that fall within this group see <a href="http://nces.ed.gov/ipeds/cipcode/cipdetail.aspx?y=55&cipid=88385" target="_blank">here</a>.')
            .append('p').html('Source: Department Of Education')
            .append('p').html('Credit: Quoctrung Bui/NPR');

            break;
        case other:
            d3.select('.label-education').attr('dy', 8);
            d3.select('.label-health-professions').text('Health Professions*').attr('dy', -1);
            d3.select('.label-psychology').attr('dy', 12);
            d3.select('.label-public-administration').attr('dy', 3).text('Social Work');

            chart.append('div').attr('class','footnotes')
            .append('p').html('*Group includes health administration, pre-med, pharmacy, and physical therapy.')
            .append('p').html('For a complete list of specific majors that fall within each group see <a href="http://nces.ed.gov/ipeds/cipcode/cipdetail.aspx?y=55&cipid=88385">here</a>.')

            break;
        default:
            break;
    }



   // <div class="footnotes">
   //      <h4>Notes</h4>
   //      <p>*Labelled as Physical Sciences by Department Of Education.</p>
   //      <!-- <p>*Labelled as Health Professions by Department Of Education.</p> -->
   //      <p>For a complete list of specific majors that fall within each group see <a href='http://nces.ed.gov/ipeds/cipcode/cipdetail.aspx?y=55&cipid=88385'>here</a>.  </p>
   //  </div>




}



/*
 * Helper functions
 */
function classify(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}


/*
 * Initially load the graphic
 * (NB: Use window.load instead of document.ready
 * to ensure all images have loaded)
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(graphic_data_url, function(error, data) {
            graphic_data = data;

            graphic_data.forEach(function(d) {
                d['date'] = d3.time.format('%Y').parse(d['date']);
            });


            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

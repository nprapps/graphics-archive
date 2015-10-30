var $graphic = $('#graphic');
var dataByAge = {};

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_data_url = 'hh-age-all-raw.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 540;
var pymChild = null, 
                svg,
                newdata,
                height,
                width,
                yAxis,
                yGrid,
                xGrid,
                y_axis_grid,
                x_axis_grid,
                line,
                x,
                xBottom,
                color,
                y ;
var num_x_ticks;
var num_y_ticks;

var ageArray = ["Ages 25 to 35" , "Ages 35 to 45" , "Ages 45 to 55" , "Ages 55 to 65"]


var variablesNames = [ '20th Percentile', '50th Percentile', "95th Percentile"];


var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3']]);

var color2 = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3']]);

/*
 * Render the graphic
 */
function render(container_width) {
    var graphic_width;
    $graphic.empty();


    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
        graphic_width = container_width;
    } else {
        is_mobile = false;
        graphic_width = Math.floor(container_width / 2.3);
    }

    // draw the legend
    var legend = d3.select('#graphic')
        .append('ul')
            .attr('class', 'key')
            .selectAll('g')
                .data(variablesNames)
            .enter().append('li')
                .attr('class', function(d, i) { 
                    return 'key-item key-' + i + ' ' + classify(d);
                });
    legend.append('b')
        .style('background-color', function(d,i) {
            return color(d);
        });
    legend.append('label')
        .text(function(d) {
            return d;
        });

    for (var id in ageArray) {
        var ageID = ageArray[id];

        draw_graph(graphic_width, dataByAge[ageID], ageArray[id]);
    }    

    clickedIndex();

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function draw_graph(graphic_width, graphic_data, name) {
    var graphic_aspect_height;
    var graphic_aspect_width;
    var margin = { top: 10, right: 20, bottom: 30, left: 50 };

    if (is_mobile) {
        graphic_aspect_width = 4;
        graphic_aspect_height = 3;
        num_x_ticks = 5;
        num_y_ticks = 5;
    } else {
        graphic_aspect_width = 3;
        graphic_aspect_height = 3;
        num_x_ticks = 6;
        num_y_ticks = 10;
    }

    width = graphic_width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

     x = d3.time.scale()
        .range([0, width])

     y = d3.scale.linear()
        .range([ height, 0 ]);

     xAxis = d3.svg.axis()
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

     x_axis_grid = function() { return xAxis; };


     yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .ticks(num_y_ticks)
           .tickFormat(function(d) {
            if (d != 0 ) {
                return "$" + d/1000 + "k";
            } else {
                return "$" + d/1000 ;
            }
        });

     y_axis_grid = function() { return yAxis; };

     line = d3.svg.line()
        .interpolate('basis')
        .x(function(d) { 
            return x(d['date']);
        })
        .y(function(d) { 
            return y(d['amt']);
        });
        
    color.domain(d3.keys(graphic_data[0]).filter(function(key) { 
        return key !== 'date';
    }));

    // set the data domain
    x.domain(d3.extent(graphic_data, function(d) { 
        return d['date'];
    }));

    y.domain([0,300000])
    // y.domain([80,150])

    // draw the chart

    var chart = d3.select('#graphic')
        .append('div')
            .attr('class', 'chart ' + classify(name))
            .attr('style', 'width: ' + graphic_width + 'px;');
    
    var header = chart.append('h3')
        .text(name);

    var svg = chart.append('svg')
            .attr('class', 'svg-' + classify(name))
            .attr('width', width + margin['left'] + margin['right'])
            .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('class', 'svg-g-' + classify(name))        
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

     xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

     yTop = svg.append('g') // Add the Y Axis
        .attr('class', 'y-axis')
        .call(yAxis);

     xGrid = svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

     yGrid = svg.append('g')         
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );
}

/*
 * Helper functions
 */

function clickedLevel(d) {
    d3.selectAll(".buttonLevel").classed('button-on',true)
    d3.selectAll(".buttonIndex").classed('button-on',false)    
    d3.selectAll(".indexlines").remove();
    d3.selectAll(".levellines").remove();
    d3.selectAll(".line").remove();
    d3.selectAll(".y-axis").remove();
    d3.selectAll(".grid").remove();
    d3.selectAll(".hline").remove();

    for (var id in ageArray) {
        var ageID = ageArray[id];
        var cls = classify(ageArray[id]);
        var rows = dataByAge[ageID];

         y.domain([0,300000])

         yAxis = d3.svg.axis()
            .orient('left')
            .scale(y)
            .ticks(num_y_ticks)
            .tickFormat(function(d) {
                if (d != 0 ) {
                    return "$" + d/1000 + "k";
                } else {
                    return "$" + d/1000 ;
                }
            });  
          
        d3.select(".svg-" + cls)
          .select(".svg-g-" + cls)
          .append('g') // Add the Y Axis
          .attr('class', 'y-axis')
            .call(yAxis);

        xGrid = d3.select(".svg-" + cls).select(".svg-g-" + cls)
            .append('g')
            .attr('class', 'x grid')
            .attr('transform', 'translate(0,' + height + ')')
            .call(x_axis_grid()
                .tickSize(-height, 0, 0)
                .tickFormat('')
            );

        yGrid = d3.select(".svg-" + cls).select(".svg-g-" + cls)
            .append('g')         
            .attr('class', 'y grid')
            .call(y_axis_grid()
                .tickSize(-width, 0, 0)
                .tickFormat('')
            );              

        // parse data into columns
        var formattedData = {
            'v4': [],
            'v10': [],
            'v19': []
        };

        COLUMNS = ['v4', 'v10', 'v19'];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];

            for (var j = 0; j < COLUMNS.length; j++) {
                var column = COLUMNS[j];

                var d = {
                    'date': row['date'],
                    'amt': row[column]
                }; 
                
                formattedData[column].push(d);
            }
        }

        var levelLines = d3.select(".svg-" + cls).select(".svg-g-" + cls)
            .append('g')
            .attr('class', 'levellines')
            .selectAll('path')
            .data(d3.entries(formattedData))
            .enter()
            .append('path')
                .attr('class', function(d, i) {
                    return 'line level line-' + i + ' ' + classify(d['key']);
                })
                .attr('stroke', function(d) {
                    return color(d['key']);
                })
                .attr('d', function(d) {
                    return line(d['value']);
                });
        } 
    }    

function clickedIndex(d) {
    d3.selectAll(".buttonIndex").classed('button-on',true)
    d3.selectAll(".buttonLevel").classed('button-on',false)
    d3.selectAll(".indexlines").remove();
    d3.selectAll(".levellines").remove();
    d3.selectAll(".line").remove();
    d3.selectAll(".y-axis").remove();
    d3.selectAll(".grid").remove();
    d3.selectAll(".hline").remove();

    for (var id in ageArray) {
        var ageID = ageArray[id];
        var cls = classify(ageArray[id]);
        var rows = dataByAge[ageID];

        var deflator20 = rows[0]['v4'];
        var deflator50 = rows[0]['v10'];
        var deflator95 = rows[0]['v19'];

        for (var i = 0; i < rows.length; i++) {
            rows[i]['i4'] = String(100*((rows[i]['v4']/deflator20-1)));
            rows[i]['i10'] = String(100*((rows[i]['v10']/deflator50-1)));
            rows[i]['i19'] = String(100*((rows[i]['v19']/deflator95-1)));
        }

        //call yaxis  
         y = d3.scale.linear().range([ height, 0 ]).domain([-30,60]);
         yAxis = d3.svg.axis()
                .orient('left')
                .scale(y)
                .ticks(num_y_ticks)
                .tickFormat(function(d) {
                if (d != 0 ) {
                    return d + "%";
                } else {
                    return d/1000 ;
                }
            });                      


        d3.select(".svg-" + cls)
          .select(".svg-g-" + cls)
          .append('g') // Add the Y Axis
          .attr('class', 'y-axis')
            .call(yAxis);

        xGrid = d3.select(".svg-" + cls).select(".svg-g-" + cls)
            .append('g')
            .attr('class', 'x grid')
            .attr('transform', 'translate(0,' + height + ')')
            .call(x_axis_grid()
                .tickSize(-height, 0, 0)
                .tickFormat('')
            );

        yGrid = d3.select(".svg-" + cls).select(".svg-g-" + cls)
            .append('g')         
            .attr('class', 'y grid')
            .call(y_axis_grid()
                .tickSize(-width, 0, 0)
                .tickFormat('')
            );              

        // parse data into columns
        var formattedData = {
            'i4': [],
            'i10': [],
            'i19': []
        };

        COLUMNS = ['i4', 'i10', 'i19'];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];

            for (var j = 0; j < COLUMNS.length; j++) {
                var column = COLUMNS[j];

                var d = {
                    'date': row['date'],
                    'amt': row[column]
                }; 
                
                formattedData[column].push(d);
            }
        }

        var hline = d3.select(".svg-" + cls).select(".svg-g-" + cls)
            .append("line")
            .attr("class","hline")
            .attr("x1", x(formattedData['i4'][0]['date']))
            .attr("y1", y(0))
            .attr("x2", x(formattedData['i4'][20]['date']))
            .attr("y2", y(0));


        var indexlines = d3.select(".svg-" + cls).select(".svg-g-" + cls)
            .append('g')
            .attr('class', 'indexlines')
            .selectAll('path')
            .data(d3.entries(formattedData))
            .enter()
            .append('path')
                .attr('class', function(d, i) {
                    return 'line index line-' + i + ' ' + classify(d['key']);
                })
                .attr('stroke', function(d) {
                    return color2(d['key']);
                })
                .attr('d', function(d) {
                    return line(d['value']);
                });
        } 
    }

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
            for (var i = 0; i < data.length; i++) {
                var row = data[i];
                var ageID = row['name']

                row['date'] = d3.time.format('%Y').parse(row['date']);

                if (!dataByAge.hasOwnProperty(ageID)) {
                    dataByAge[ageID] = [];
                }

                dataByAge[ageID].push(row);
            }

            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

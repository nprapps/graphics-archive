var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var fmt_commas = d3.format(",.0f");
var graphic_data;
var graphic_data_url = 'household-income-ratio2.csv';
var graphic_default_width = 550;
var is_mobile;
var mobile_threshold = 500;
var pymChild = null;
var group;
var groupD;
var rawgroup, rawgroup2, rawgroupExtent;
var x;
var y;
var yAxis;
var yTop;
var yGrid;
var y_axis_grid;
var svg;
var line;
var formatted_data;
var formatted_data2;
var voronoiGroup;
var container_width;
var height;
var num_y_ticks;
var width;
var lines;
var circle1, circle2, circle3, circle4, circlefocus;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7',
    'violet1': '#251a5d', 'violet2': '#2e178a', 'violet3': '#523aa6', 'violet4': '#977bf2', 'violet5': '#ac95ef', 'violet6': '#D3EAF7'
};


/*
 * Render the graphic
 */
function render(container_width) {
    var graphic_width;
    // console.log('container_width',container_width)

    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }
// console.log('container_width1',container_width)

    // clear out existing graphics
    $graphic.empty();

    draw_graph(container_width);

    if (pymChild) {
        pymChild.sendHeight();
    }
}

function draw_graph(width) {
    var color = d3.scale.ordinal()
        .range([ colors['red3'], colors['yellow3'], colors['blue3'], colors['orange3'], colors['teal3'] ]);
    var graphic_aspect_height;
    var graphic_aspect_width;
    var height;

    if (is_mobile) {
        var margin = { top: 15, right: 60, bottom: 30, left: 60 };
        } else {
        var margin = { top: 15, right: 15, bottom: 30, left: 60 };
    }

    var num_x_ticks;
    var num_y_ticks;

    if (is_mobile) {
        graphic_aspect_width = 3;
        graphic_aspect_height = 5;
        num_x_ticks = 5;
        num_y_ticks = 5;
    } else {
        // graphic_aspect_width = 16;
        // graphic_aspect_height = 9;
        graphic_aspect_width = 3;
        graphic_aspect_height = 3.7;
        num_x_ticks = 10;
        num_y_ticks = 10;
    }

    width = width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

         x = d3.time.scale()
        .range([0, width])

         y = d3.scale.linear()
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
        .interpolate('monotone')
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
    formatted_data = {};
    for (var column in graphic_data[0]) {
        if (column == 'date') continue;
        formatted_data[column] = graphic_data.map(function(d,i) {
            rawgroup = parseInt(column.substring(0,2));
            rawgroupExtent = (rawgroup<=20) ? "Bottom Quartile"
            : (rawgroup>20 && rawgroup<=40) ? "Second Quartile"
            : (rawgroup>40 && rawgroup<=60) ? "Middle Quartile"
            : (rawgroup>60 && rawgroup<=80) ? "Fourth Quartile"
            : (rawgroup>80 && rawgroup<=100) ? "Top Quartile"
            : "none";
            groupD = (rawgroup<=20) ? "20th"
            : (rawgroup>20 && rawgroup<=40) ? "40th"
            : (rawgroup>40 && rawgroup<=60) ? "60th"
            : (rawgroup>60 && rawgroup<=80) ? "80th"
            : (rawgroup>80 && rawgroup<=100) ? "100th"
            : "none";
            return { 'date': d['date'],
                    'amt': d[column],
                    'percentile': classify(column),
                    'percentile-long':column,
                    'percentile-long2':rawgroup + "th percentile",
                    'amt-long':d[column],
                    'group':groupD,
                    'raw-group':rawgroup,
                    'raw-groupExtent':rawgroupExtent};
        }).filter(function(d) {
            return d['amt'].length > 0;
        });
    }

    // set the data domain
    x.domain(d3.extent(graphic_data, function(d) {
        return d['date'];
    }));

    y.domain([0,220000]);



    formatted_data2 = d3.entries(formatted_data).filter(function(d){return d['key'] !="clear "});

    if (is_mobile) {;} else {
        var voronoi = d3.geom.voronoi()
            .x(function(d) { return x(d['date']); })
            .y(function(d) { return y(d['amt']); })
            .clipExtent([[-margin.left, -margin.top], [width + margin.right, height + margin.bottom]]);
    }

        // draw the chart


        svg = d3.select('#graphic')
            .append('svg')
                .attr('class', 'svg')
                .attr('width', width + margin['left'] + margin['right'])
                .attr('height', height + margin['top'] + margin['bottom'])
            .append('g')
                .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

        var xBottom = svg.append('g') // Add the X Axis
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

             yTop = svg.append('g')
            .attr('transform', 'translate(-10,0)')
            .attr('class', 'y axis')
            .call(yAxis);

        var xGrid = svg.append('g')
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

        var lines = svg.append('g')
            .attr('class', 'lines')
            .selectAll('path')
            .data(d3.entries(formatted_data).filter(function(d){return d['key'] !="clear "}))
            .enter()
            .append('path')
                .attr('class', function(d, i) {
                    group = (i<=3) ? "20th"
                            : (i>3 && i<=7) ? "40th"
                            : (i>7 && i<=11) ? "60th"
                            : (i>11 && i<=15) ? "80th"
                            : (i>15 && i<=19) ? "100th"
                            : "none";
                    return "percentile-" + group + ' line line-' + classify(d['key']);

                })
                .attr('d', function(d) {
                    return line(d['value']);
                })
                .attr("stroke", function(d,i) {
                    hueValue = (i<=3) ? colors['red2']
                            : (i>3 && i<=7) ? colors['orange3']
                            : (i>7 && i<=11) ? colors['yellow2']
                            : (i>11 && i<=15) ? colors['teal4']
                            : (i>15 && i<=19) ? colors['blue3']
                            : "none";
                    return hueValue ;
                });



        circlefocus = svg.append('circle')
                .attr('class','info-circle-focus')
                .attr("cx", x(formatted_data['5 percentile'][0]['date']))
                .attr("cy", y(1000000))
                .attr("r", 6);

        circle1 = svg.append('circle')
                .attr('class','info-circle')
                .attr("cx", x(formatted_data['5 percentile'][0]['date']))
                .attr("cy", y(1000000))
                .attr("r", 6);
        circle2 = svg.append('circle')
                .attr('class','info-circle')
                .attr("cx", x(formatted_data['5 percentile'][40]['date']))
                .attr("cy", y(1000000))
                .attr("r", 6);
        circle3 = svg.append('circle')
                .attr('class','info-circle-highlight')
                .attr("cx", x(formatted_data['5 percentile'][0]['date']))
                .attr("cy", y(1000000))
                .attr("r", 6);
        circle4 = svg.append('circle')
                .attr('class','info-circle-highlight')
                .attr("cx", x(formatted_data['5 percentile'][40]['date']))
                .attr("cy", y(1000000))
                .attr("r", 6);


        if (!is_mobile) {

             	var tooltip = d3.select('#graphic')
        		.append('div')
    			.attr('id', 'tooltip');

            var voronoiGroup = svg.append("g")
              .attr("class", "voronoi")
              .selectAll("path")
                  .data(voronoi(d3.nest()
                      .key(function(d) { return x(d['date']) + "," + y(d['amt']); })
                      .rollup(function(v) { return v[0]; })
                      .entries(d3.merge(formatted_data2.map(function(d) { return d['value']; })))
                      .map(function(d) { return d['values']; })))
                .enter().append("path")
                  .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
                  .datum(function(d) { return d.point; })
                  .on("mouseover", mouseover)
                  .on("mouseout", mouseout)
                  // .on("click", zoomed);
                  .on("click", selected);

        };

        if (is_mobile) {

            d3.select("#subhead").remove();

        var staticLabel95 = svg.append("text")
            .attr("x", x(formatted_data['95 percentile'][40]['date']))
            .attr("y", y(formatted_data['95 percentile'][40]['amt'])-10)
            .attr("class", "percentile-label-mobile")
            .style('font-size', '12px')
            .text('95th Percentile')
            .attr('text-anchor', 'start');

        var staticLabel50 = svg.append("text")
            .attr("x", x(formatted_data['50 percentile'][40]['date']))
            .attr("y", y(formatted_data['50 percentile'][40]['amt'])-10)
            .attr("class", "percentile-label-mobile")
            .style('font-size', '12px')
            .text('50th Percentile')
            .attr('text-anchor', 'end');

        var staticLabel20 = svg.append("text")
            .attr("x", x(formatted_data['20 percentile'][40]['date']))
            .attr("y", y(formatted_data['20 percentile'][40]['amt'])-10)
            .attr("class", "percentile-label-mobile")
            .style('font-size', '12px')
            .text('20th Percentile')
            .attr('text-anchor', 'end');

        d3.selectAll(".line").style('opacity','.3');

        d3.selectAll('.line-50-percentile').style('opacity','1').classed('selected-percentile',true)
        d3.selectAll('.line-95-percentile').style('opacity','1').classed('selected-percentile',true)
        d3.selectAll('.line-20-percentile').style('opacity','1').classed('selected-percentile',true)


            circle95 = svg.append('circle')
                    .attr('class','info-circle')
                    .attr("cx", x(formatted_data['95 percentile'][40]['date']-20))
                    .attr("cy", y(formatted_data['95 percentile'][40]['amt']))
                    .attr("r", 6)
                    .attr('stroke', colors['blue3']);


            circle20 = svg.append('circle')
                    .attr('class','info-circle')
                    .attr("cx", x(formatted_data['20 percentile'][40]['date']))
                    .attr("cy", y(formatted_data['20 percentile'][40]['amt']))
                    .attr("r", 6)
                    .attr('stroke', colors['red2']);
            circle50 = svg.append('circle')
                    .attr('class','info-circle')
                    .attr("cx", x(formatted_data['50 percentile'][40]['date']))
                    .attr("cy", y(formatted_data['50 percentile'][40]['amt']))
                    .attr("r", 6)
                    .attr('stroke', colors['yellow2']);
        }

    function mouseover(d) {
    	var dot_x = x(d['date']) + margin['left'];
    	var dot_y = y(d['amt']) + margin['top'];
    	var tt_top;
    	var tt_left;
		var tt_height = 95;
		var tt_width = 155;
    	var tt_text = '';

		d3.select('.line-' + d['percentile'])
			.classed('percentile-hover',true)
			// .attr('stroke', function(d) { return hsl.darker().toString() ; })
			.moveToFront();

		// define tooltip text
		tt_text += '<strong>$' + fmt_commas(d['amt-long']) + '</strong><br />';
		tt_text += d['percentile-long2'] + ' - ' + fmt_year_full(d['date']) + '<br />';
		tt_text += '<em>(Click to zoom in)</em>';

		// define tooltip position
		tt_top = dot_y - tt_height;
		if (tt_top < margin['top']) {
			tt_top = margin['top'];
		}
		if ((tt_top + tt_height) > dot_y) {
			tt_top = dot_y + 10;
		}

		tt_left = dot_x - (tt_width / 2);
		if (tt_left < margin['left']) {
			tt_left = margin['left'];
		}
		if ((tt_left + tt_width) > (width + margin['left'])) {
			tt_left = width + margin['left'] - tt_width;
		}

		tooltip
			.html(tt_text)
			.style('top', tt_top + 'px')
			.style('left', tt_left + 'px')
			.classed('active', true);

        circlefocus
            .attr('cy', y(d['amt']))
            .attr('cx', x(d['date']));
    }

    function mouseout(d) {
        d3.select('.line-' + d['percentile']).classed('percentile-hover', false);
        circlefocus.attr('cy', y(1000000));
		tooltip.classed('active', false);
    }


    function selected(d) {
        d3.select(".line-" + d['percentile']).classed("percentile-hover", false);
        d3.select('.voronoi').remove();
        circlefocus
            .attr("cy", y(1000000));
        tooltip.classed('active', false);

        var groupSelect = d['long-group'];
        var groupselectWordy = d['group'];
        var bounds = (groupselectWordy =="20th") ? [ 0, 25000]
                 : (groupselectWordy =="40th") ? [ 20000, 44000]
                 : (groupselectWordy =="60th") ? [ 37000, 70000]
                 : (groupselectWordy =="80th") ? [ 55000, 115000]
                 : (groupselectWordy =="100th") ? [ 80000, 220000]
                 : [ 0, 500000];

//rescale y axis
         y = d3.scale.linear().range([ height, 0 ]).domain(bounds);
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

         yTop.transition().duration(300).ease('cubic-in-out').call(yAxis);

         y_axis_grid = function() { return yAxis; };
         yGrid.call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
         );


    //redraw lines
        lines.transition().duration(300).ease('cubic-in-out').attr('d', function(d) {

            return line(d['value']);
        });

    //remove other lines
            // d3.select(".lines").selectAll("*:not(.percentile-"+ groupselectWordy + ")").classed("off",true)
        d3.select(".lines").selectAll("*:not(.percentile-"+ groupselectWordy + ")").remove();

    //fade other lines in the quartile
        d3.selectAll(".percentile-"+ groupselectWordy).classed("selected-quartile", true);

    //highlight selected line
        d3.select(".line-" + d['raw-group'] + "-percentile")
        .classed("selected-quartile", false);


        d3.select(".line-" + d['raw-group'] + "-percentile")
        .classed("selected-percentile", true);

         var hueValueSelected;
    //percentile-group label
         var perGroup = svg.append("g")
            .attr("transform", "translate(" + width*.01 + ", 5)")
            .attr("class", "perGroup")
            .append("text")
            .text("The " + d['raw-groupExtent'] + " Of")
            .attr('text-anchor', 'start')
            .attr("fill", function(d,i) {
                        hueValueSelected = (groupselectWordy=="20th") ? colors['red2']
                            : (groupselectWordy=="40th") ? colors['orange3']
                            : (groupselectWordy=="60th") ? colors['yellow2']
                            : (groupselectWordy=="80th") ? colors['teal4']
                            : (groupselectWordy=="100th") ? colors['blue3']
                            : "none";
                    return hueValueSelected ;

                });


         var perGroup2 = svg.append("g")
            .attr("transform", "translate(" + width*.01 + ", 22)")
            .attr("class", "perGroup")
            .append("text")
            .attr('text-anchor', 'start')
            .text("All Household Incomes")
            .attr('fill', function(d) { return hueValueSelected;});

        var selectedPercentile = d['percentile-long'];

        var dateStart =  formatted_data[selectedPercentile][0]["date"]
        var dateEnd =  formatted_data[selectedPercentile][40]["date"]
        var dateMid =  formatted_data[selectedPercentile][18]["date"]
        var amtStart =  formatted_data[selectedPercentile][0]["amt"]
        var amtEnd =  formatted_data[selectedPercentile][40]["amt"]
        var amtMid =  formatted_data[selectedPercentile][18]["amt"]
    //annotation
    //value labels
        var annoteStartVal = svg.append("text")
          .attr("x", x(dateStart)-5)
          .attr("y", y(amtStart)-15)
          .attr("class", "annote")
          .attr('text-anchor', 'start')
          .text("$" + fmt_commas(amtStart));

        var annoteEndVal = svg.append("text")
          .attr("x", x(dateEnd)+5)
          .attr("y", y(amtEnd)-15)
          .attr("class", "annote")
          .attr('text-anchor', 'end')
          .text("$" + fmt_commas(amtEnd));//year labels

    //year labels
        var annoteStartYr = svg.append("text")
          .attr("x", x(dateStart)-5)
          .attr("y", y(amtStart)-35)
          .attr("class", "annote")
          .attr("class", "year")
          .attr('text-anchor', 'start')
          .text(fmt_year_full(dateStart));

        var annoteEndYr = svg.append("text")
          .attr("x", x(dateEnd)+5)
          .attr("y", y(amtEnd)-35)
          .attr("class", "annote")
          .attr("class", "year")
          .attr('text-anchor', 'end')
          .text(fmt_year_full(dateEnd));

        var incomeGrowth = 100*((parseInt(amtEnd)-parseInt(amtStart))/parseInt(amtStart))

    //explanation
        var perLabel = svg.append("text")
            .attr("x", x(dateMid))
            .attr("y", y(amtMid)-46)
            .attr("class", "percentile-label")
            .attr('text-anchor', 'start');

            perLabel
                .text("The ");

            perLabel
                .append('tspan').style('font-weight','bold')
                .text(formatted_data[selectedPercentile][18]["percentile-long2"] +  " of households ")

            perLabel
                .append('tspan')
                .text("saw their");

        var perLabel2 = svg.append("text")
            .attr("x", x(dateMid))
            .attr("y", y(amtMid)-28)
            .attr("class", "percentile-label")
            .attr('text-anchor', 'start');

            perLabel2
                .text("incomes");

            perLabel2
                .append("tspan").style('font-weight','bold')
                .text(function(d) {
                    if (d3.round(incomeGrowth) > 0) {
                        return " grow " + d3.round(incomeGrowth) + "% ";
                    } else if (d3.round(incomeGrowth) == 0) {
                        return " stay roughly the same ";
                    } else {
                        return " fall " + d3.round(incomeGrowth) + "% ";
                    }
                });

            perLabel2
                .append('tspan')
                .text('over the last 40 years.');



// //draw circles for selected line

        circle1.attr("cy", y(amtStart))
            .attr('stroke', hueValueSelected);
        circle2.attr("cy", y(amtEnd))
            .attr('stroke', hueValueSelected);

//go back button
     // var backBox = svg.append("g")
     //      .attr("transform", "translate(" + width*.83 + ", -10)")
     //      .attr("class", "go-back-box")
     //      .append("rect")
     //      .attr('width', 120)
     //      .attr('height', 40)
     //      .on('click', reset);

		var backLarge = svg.append('g')
			.attr('transform', 'translate(0, 0)')
			.attr('class', 'go-back')
			.on('click', reset);

		backLarge.append('rect')
			.attr('x', 0)
			.attr('y', -5)
			.attr('width', width)
			.attr('height', height)
            .style('opacity','0');

        var back = svg.append('g')
            .attr('transform', 'translate(' + (width) + ', 0)')
            .attr('class', 'go-back')
            // .on('click', reset);

        // back.append('rect')
        //     .attr('x', 0)
        //     .attr('y', -5)
        //     .attr('width', 80)
        //     .attr('height', 30);

        back
            .append('text')
            .attr('text-anchor', 'end')
            .attr('x', -5)
            .attr('y', 5)
            .text('Click To Go Back')
            .transition().duration(400)
            .style('opacity','1');


		// back.append('text')
		// 	.attr('text-anchor', 'middle')
		// 	.attr('x', 40)
		// 	.attr('y', 15)
		// 	.text('Back');

        // svg.on('click', reset);


    }
}

function reset() {
    $graphic.empty();
    render()
}

/*
 * Helper functions
 */
function classify(str) { // clean up strings to use as CSS classes
    return str.replace(/\s+/g, '-').toLowerCase();
}

d3.selection.prototype.moveToFront = function() {
	return this.each(function(){
		this.parentNode.appendChild(this);
	});
};


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

            pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

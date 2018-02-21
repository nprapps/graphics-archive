var $graphic = $('#graphic');

var  graphic_aspect_width = 3;
var graphic_aspect_height = 3.1;
var graphic_data_url      = 'check2.csv';
var graphic_data;
var mobile_threshold      = 540;
var pymChild              = null;
var typeahead_init        = false;
var is_mobile             = false;

// svg objects
var area;
var hline;
var small;
var smallLabel;
var svg;
var x;
var y;
var usLine;
var quintiles;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var Keep = ["United States"];

d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};


function substringMatcher(strs) {
    return function findMatches(q, cb) {
        var matches, substringRegex;

        // an array that will be populated with substring matches
        matches = [];

        // regex used to determine if a string contains the substring `q`
        substrRegex = new RegExp(q, 'i');

        // iterate through the pool of strings and for any string that
        // contains the substring `q`, add it to the `matches` array
        $.each(strs, function(i, str) {
            if (substrRegex.test(str)) {
                // the typeahead jQuery plugin expects suggestions to a
                // JavaScript object, refer to typeahead docs for more info
                matches.push({ value: str });
            }
        });
        cb(matches);
    };
}


/*
             * Render the graphic
*/
function render(width) {
var graphic_width;
var margin = { top: 30, right: 50, bottom: 30, left: 10 };

 if (width <= mobile_threshold) {
 is_mobile = true;
 }

 if (is_mobile) {
 graphic_aspect_width  = 3;
 graphic_aspect_height = 4;
 margin                = { top: 30, right: 30, bottom: 30, left: 10 };

 graphic_width         = Math.floor(((width - 11) ) - margin.left - margin.right);
 } else {
 graphic_width         = Math.floor((width - 10) - margin.left - margin.right);
 }

 drawBigGraph(graphic_width, is_mobile);

 if (pymChild) {
 pymChild.sendHeight();
 }
 }


function drawBigGraph(width, is_mobile) {
    // console.log(graphic_data)

    var color = d3.scale.ordinal()
                 .range(['#6C2315', '#A23520', '#D8472B', '#E27560', '#ECA395', '#F5D1CA',
                '#714616', '#AA6A21', '#E38D2C', '#EAAA61', '#F1C696', '#F8E2CA',
                '#77631B',  '#B39429',  '#EFC637',  '#F3D469',  '#F7E39B',  '#FBF1CD',
                '#0B403F',  '#11605E',  '#17807E',  '#51A09E',  '#8BC0BF',  '#C5DFDF',
                '#28556F',  '#3D7FA6',  '#51AADE',  '#7DBFE6',  '#A8D5EF',  '#D3EAF7']); // colors

    if (is_mobile) {
        var margin = { top: -30, right: 130, bottom: 30, left: 30 };
        var num_x_ticks = 5;
        var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width*1.7) - margin.top - margin.bottom;
    } else {
        var margin = { top: -30, right: 40, bottom: 30, left: 30 };
        var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin.top - margin.bottom;
        // var num_ticks = 5;
        var num_x_ticks = 10;
    }

    // clear out existing graphics
    $graphic.empty();

    x = d3.time.scale().range([0, width]);
    y = d3.scale.linear().range([height, 0]);
    // var formatPercent =  d3.format("d");
    var fmt = d3.time.format('%m/%Y');

    svg = d3.select('#graphic')
        .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
        .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(num_x_ticks)
        .tickSize(5);

    var x_axis_grid = function() { return xAxis; };

    var yAxis = d3.svg.axis()
        .orient('left')
        .scale(y)
        .tickSize(3);
        // .tickFormat(formatPercent);
    var y_axis_grid = function() { return yAxis; };

    var line = d3.svg.line()
        .interpolate('basis')
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.indexed); });

    area = d3.svg.area()
        .interpolate('basis')
        .x(function(d) { return x(d.date); })
        .y0(function(d) { return y(0); })
        .y1(function(d) { return y(d.indexed); });

    color.domain(d3.keys(graphic_data[0]).filter(function(key) { return key !== 'date'; }));

     quintiles = color.domain().map(function(name) {
        return {
            name: name,
            values: graphic_data.map(function(d) {
                return {date: d.date, indexed: +d[name]};
            })
        };
    });

    // Scale the range of the data
    x.domain(d3.extent(graphic_data, function(d) { return d3.round(d.date); }));
    y.domain([0,6.5]);

    var lines = svg.selectAll('path')
        .data(quintiles)
        .enter().append('path')
        .attr('class', function(d) {
            var found = $.inArray(d.name, Keep);
            if (found == 0 ) {
                return 'special-lines';
            } else {

            average = d3.mean(d.values,function(d) { return +d.indexed});

                if (average > 4) {
                    return 'top-10' ;
                  } else if (average < 1) {
                    return 'bottom-10';
                  } else {
                    return 'lines'; }

            }
        })
        .attr('id', function(d) { return d.name.replace(/\W+/g, '-').toLowerCase(); })
        .attr("d", function(d) { return line(d.values); });

     var newline = svg.selectAll('path2')
            .data(quintiles.filter(function(d){ return d.name  == "United States"; }))
            .enter().append('path')
            .attr('class', "secondspecial")
            .attr('id', function(d) { return d.name; })
            .attr("d", function(d) { return line(d.values); });


    hline = svg.append('rect')
        // .attr('class', 'lines')
        .attr('id', 'hline')
        .attr('x', 0)
        .attr('y', y(0))
        .attr('width', width)
        .attr('height', 1);

    var ylabelText = svg.selectAll('toptext')
        .data(quintiles.filter(function(d) {
                average = d3.mean(d.values,function(d) { return +d.indexed});
                return average > 4

        }))
        .enter().append('text')
        .attr('class', function(d) {
                    return 'top-10-text ' + d.name.replace(/\W+/g, '-').toLowerCase() ;
            })
        .attr('id', function(d) {  return d.name.replace(/\W+/g, '-').toLowerCase()})
        .attr('x', 3)
        .attr('dy', '.3em')
        .text(function(d) {return d.name})
        // .text(function(d) {

        //         average = d3.mean(d.values,function(d) { return +d.indexed});

        //         if (average > 3.89) {
        //             return d.name;
        //           } else if (average < 1) {
        //             return d.name;
        //           } else {
        //             return null;
        //         }
        //     })
        .datum(function(d) {
            return {
                name: d.name,
                value: d.values[0]};
            })
        .attr('transform', function(d) { return 'translate(' + x(d.value.date) + ',' + y(d.value.indexed) + ')'; });

    var ylabelText2 = svg.selectAll('bottomtext')
        .data(quintiles.filter(function(d) {
                average = d3.mean(d.values,function(d) { return +d.indexed});
                return average < 1

        }))
        .enter().append('text')
        .attr('class',"bottom-10-text")
        // .attr('class', function(d) {
        //         average = d3.mean(d.values,function(d) { return +d.indexed});

        //         if (average > 3.89) {
        //             return 'top-10-text ' + d.name.replace(/\s+/g, '-').toLowerCase() ;
        //           } else if (average < 1) {
        //             return 'bottom-10-text ' + d.name.replace(/\s+/g, '-').toLowerCase();
        //           } else {
        //             return 'y-label-text';
        //         }
        //     })
        .attr('id', function(d) {  return d.name.replace(/\W+/g, '-').toLowerCase()})
        .attr('x', 3)
        .attr('dy', '.3em')
        .text(function(d) {return d.name})
        // .text(function(d) {

        //         average = d3.mean(d.values,function(d) { return +d.indexed});

        //         if (average > 3.89) {
        //             return d.name;
        //           } else if (average < 1) {
        //             return d.name;
        //           } else {
        //             return null;
        //         }
        //     })
        .datum(function(d) {
            return {
                name: d.name,
                value: d.values[0]};
            })
        .attr('transform', function(d) { return 'translate(' + x(d.value.date) + ',' + y(d.value.indexed) + ')'; });


    var uslabel = svg.selectAll('text2')
        .data(quintiles.filter(function(d){ return d.name == "United States"; }))
        .enter().append('text')
        // .filter(function(d) {
        //         var found = $.inArray(d.name, Keep);
        //         if (found == 0 ) {

        // return d.name < 400 })        // <== This line
        .datum(function(d) {
            return {
                name: d.name,
                value: d.values[0]};
            })
        .attr('class','y-label-text')
        .attr('id', function(d) {
                var found = $.inArray(d.name, Keep);
                if (found == 0) {return "us-label"; }
                })
        .attr('transform', function(d) { return 'translate(' + x(d.value.date) + ',' + y(d.value.indexed) + ')'; })
        .attr('x', 3)
        .attr('dy', '-1.2em')
        .text(function(d) {
                var found = $.inArray(d.name, Keep);
                if (found == 0) {
                    return d.name;
                }
            });

    var xBottom = svg.append('g') // Add the X Axis
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    var yTop = svg.append('g') // Add the Y Axis
        .attr('class', 'y axis')
        .attr('transform', 'translate(' + -width/100 + ',0)')
        .call(yAxis);

    var yGrid = svg.append('g')
        .attr('class', 'y grid')
        .call(y_axis_grid()
            .tickSize(-width, 0, 0)
            .tickFormat('')
        );

     d3.selectAll('.special-lines').moveToFront();
    if (is_mobile) {   d3.selectAll('#us-label').text('U.S.');}

    // usLine = document.getElementsByClassName("special-lines")
    usLine = d3.selectAll(".secondspecial")


    if (!typeahead_init ) { // only run this once

        var location = d3.keys(graphic_data[0]);
        var index = location.indexOf('date');

        // console.log('location', location)

        if (index > -1) {
            location.splice(index, 1);
        }

        $('#msa-field .typeahead').typeahead({
            // hint: true,
            highlight: true,
            minLength: 0
            // defaultSort: function(a,b){ return a.value > b.value ? 1 : -1; }
        }, {
          name: 'location',
          displayKey: 'value',
          source: substringMatcher(location)
        });
        // $('.typeahead.input-sm').siblings('input.tt-hint').addClass('hint-small');

        $('input.typeahead').on('typeahead:selected', on_typeahead_selected);
        typeahead_init = true;
    }
}


function on_typeahead_selected(event, selection) {
    // console.log(selection.value)

    d3.selectAll('.small-line').remove()
    d3.selectAll('.small-area').remove()

    var locationVal = selection.value;
    selected(locationVal);
}

function mouseover(d) {
    var thisid = this.getAttribute('id');
    d3.select('path#'+thisid).style("stroke-width","2");

}
function mouseout(d) {
    var thisid = this.getAttribute('id');
    d3.select('path#'+thisid).style("stroke-width","1");

}

function top10(d) {

    d3.selectAll(".bottom-10").transition().duration(160).style("stroke","#c2dcf5")
    d3.selectAll(".bottom-10-text").transition().duration(160).style("opacity","0")
    d3.selectAll(".top-10").transition().duration(160).style("stroke","#23692e").transition().duration(160).style("opacity",".7")
    d3.selectAll(".top-10-text").transition().duration(160).style("opacity",".7")

     d3.select('text#honolulu-hi').attr("dx","9.6em").attr("dy","-2em").on('mouseover', mouseover).on('mouseout', mouseout);
     d3.select('text#san-francisco-ca').attr("dx","14.6em").attr("dy","-6em").on('mouseover', mouseover).on('mouseout', mouseout);
     d3.select('text#santa-cruz-ca').attr("dx","0em").attr("dy","6.5em").on('mouseover', mouseover).on('mouseout', mouseout);

}

function bottom10(d) {
    d3.selectAll(".top-10").transition().duration(160).style("stroke","#c2dcf5")
    d3.selectAll(".top-10-text").transition().duration(160).style("opacity","0")
    d3.selectAll(".bottom-10").transition().duration(160).style("stroke","#69312a").transition().duration(160).style("opacity",".7")
    d3.selectAll(".bottom-10-text").transition().duration(160).style("opacity",".7")
}

function clearall(d) {
    d3.selectAll(".top-10").transition().duration(160).style("stroke","#c2dcf5")
    d3.selectAll(".top-10-text").transition().duration(160).style("opacity","0")
    d3.selectAll(".bottom-10").transition().duration(160).style("stroke","#c2dcf5")
    d3.selectAll(".bottom-10-text").transition().duration(160).style("opacity","0")
}

function selected(what) {
    // var test_average = d3.mean(d.values.slice(0,50),function(d) { return +d.indexed})

    // small.attr('d', null);
    // smallLabel.attr('x', null);
    // ylabelValue.attr('x', null);
    d3.selectAll('.smallLabel').remove();
    d3.selectAll('.lines2').remove();
    d3.selectAll('.y-label-value').remove();
    d3.selectAll('.y-label-value2').remove();
    d3.selectAll('.special-lines').style('opacity', '.5');
    // var idd = what.replace(/\s+/g, '-').toLowerCase()
    // console.log(idd)
    // d3.select('.lines').select("#" + what).style("stroke-width","3").style("stroke","red");

   // var smallArea = small.filter(function(d) { return d.name == what})
   //      .attr('id','small-area')
   //      .attr('class', function(d) {
   //          return d.name.replace(/\s+/g, '-').toLowerCase()
   //      })
   //      .attr('d', function(d) {
   //          last = d.values[0]['indexed'];
   //          average = d3.mean(d.values.slice(0,64),function(d) { return +d.indexed});
   //          diff1 = last - average;
   //          area.y0(function(d) {return y(average);})
   //          return area(d.values);
   //      })
   //      .transition()
   //      .duration(300)
   //      .ease('elastic')
   //      .style('fill', function(d) {
   //           if (diff1 > .1) {
   //              return '#3ea148';
   //          } else if (diff1 < -.1) {
   //              return '#a12b31';
   //          } else {return '#bab237';}
   //      });

    small = svg.selectAll('.small-area')
        .data(quintiles.filter(function(d){ return d.name  == what; }))
        .enter()
        .append('path');

    smallLine = svg.selectAll('.small-line')
        .data(quintiles.filter(function(d){ return d.name  == what; }))
        .enter()
        .append('path');

    smallLabel = svg.selectAll('small-label')
        .data(quintiles.filter(function(d){ return d.name  == what; }))
        .enter()
        .append('text')
        .attr('class', 'smallLabel')
        .text(function(d) { return d.name ;})
        .datum(function(d) {
            return {
                name: d.name,
                value: d.values[0]};
            })
        .attr('transform', function(d) { return 'translate(' + x(d.value.date) + ',' + y(d.value.indexed) + ')'; })
        .attr('x', 3)
        .attr('dy', '-1.5em')
        .style('fill',"#334da0");

    var line2 = d3.svg.line()
        .interpolate('basis')
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.indexed); });

var test;
console.log(test);
   var secondline = smallLine.filter(function(d) { return d.name == what})
        .attr('class','lines2')
        .attr("d", function(d) {
             test = line2(d.values);
            return  null ; });

usLine.transition().duration(1900).ease('elastic')
    .attr('d', test)
    .style('stroke-width',"3.2")
    .style('stroke',"#334da0");
    // .stroke-width: 2px;
            // stroke: #a0a0a0;;

        // .transition()
        // .duration(300)
        // .ease('elastic')
        // .style('fill', function(d) {
        //      if (diff1 > .1) {
        //         return '#3ea148';
        //     } else if (diff1 < -.1) {
        //         return '#a12b31';
        //     } else {return '#bab237';}
        // });


        // // .style('fill', 'm');
        // .style('fill', function(d) {

        // }
        //     '#48ba5b');
        // .style('fill', function(d) { return color(d.name); });

    // hline
    //     .transition().duration(1300).ease("elastic").attr('y',y(average))

// if (is_mobile) {window.alert("sometext");}

    // var histAverage = smallLabel.filter(function(d) { return d.name == what})
    //     .append('text')
    //     .attr('class','y-label-value2')
    //     .attr('id', function(d) {return 'selected'})
    //     .attr('transform', function(d) {
    //             return  'translate(' + x(d.values[0]['date']) + ',' + y(average)+ ')';
    //         })
    //     // .attr('dx','5em')
    //     .attr('dy','2em')
    //     .html(function(d) {
    //             if (is_mobile) {
    //             return 'historical ave: ' + d3.round(average,1) ;
    //              } else {
    //             return 'historical average (1990-2004): ' + d3.round(average,1) ;
    //             }
    //         })
    //     .style('font-size','12px');

    // var ylabelValue =  smallLabel.filter(function(d) { return d.name == what})
    //     .append('text')
    //     .attr('class',function(d) {
    //         if (is_mobile) {
    //          return 'y-label-value2';
    //         } else {
    //          return 'y-label-value';
    //         }
    //         })
    //     .datum(function(d) {
    //         if (is_mobile) {
    //             return {name: d.name, value: d.values[0]};
    //         }
    //         else {
    //             return {name: d.name, value: d.values[0]};
    //         }
    //         })
    //     .attr('id', function(d) {
    //         if(d.name==what) {
    //             return 'selected1'
    //         }
    //     })
    //     .text(function(d) {
    //             if (d.name == what) {
    //                 if (diff1 > 0.1) {
    //                     return 'The home price ratio is above average';
    //                 } else if (diff1 < -0.1) {
    //                     return 'The home price ratio is below average';
    //                 } else {
    //                     return 'The home price ratio is near average';
    //                 }
    //             }
    //         })
    //     .attr('transform', function(d) {
    //             return 'translate(' + x(d.value.date) + ',' + y(5.5) + ')';
    //     })
    //     .attr('dy', function(d) {
    //         if (diff1 == 0) {
    //             return '.75em';
    //         } else if (diff1 > 0) {
    //             return '.75em';
    //         } else if (diff1 < 0) {
    //             return '-.75em';
    //         }
    //     });


    // var msaname = svg.append('text')
    //     .attr('transform', 'translate(10,' + y(6) + ')')
    //     .attr('class','msa-name')
    //     .text(what);




    d3.selectAll('#selected').moveToFront()
    d3.selectAll('.y-label-value').moveToFront()
}


/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(graphic_data_url, function(error, data) {
            graphic_data = data;

            graphic_data.forEach(function(d) {
                // d.date = +d.date;
                d.date = d3.time.format('%m/%d/%y').parse(d.date);
            });

           var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})

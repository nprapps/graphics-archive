var pymChild = null;
var mobile_threshold = 425;
var graphic_aspect_height = 4.5;
var graphic_aspect_width = 3;
var col = 2;
var height;
var xaxis;
var xaxis2;
var xAxis2;
var xAxis;
var x;
var mill = [];
var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#715616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

var countries = ["United States",
"Canada",
"United Kingdom",
"Germany",
"Japan",
"South Korea",
"Mexico",
"Brazil",
"India",
"China"];
// "Chile",
// "Finland",
// "HongKong",
// "Italy",
// "Peru",
// "Russia",
// "Taiwan",
// "China",
// "France",
// "India",
// "Philippines",
// "SouthAfrica",
// "Thailand",
// "China",
// "France",
// "India",
// "Japan",
// "SouthAfrica",
// "Thailand"];



/*
 * TODO: draw your graphic
 */

var $graphic = $('#graphic');
    var graphic_data_url = 'intl-pop-clean.csv';
    var graphic_data;
    var bar_gap = 6;


d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};


function filter_new(arr, criteria) {
  return arr.filter(function(obj) {
    return Object.keys(criteria).every(function(c) {
      return obj[c] == criteria[c];
    });
  });
}

var formatPercent = d3.format(".0%");

var checkMillenial = function(value) {
    if (typeof value !== 'number')
        return false;
    else
        return value >= this.minimum && value <= this.maximum;
}

function render(width) {
    if (Modernizr.svg) {
        // clear out existing graphics
        $graphic.empty();
        var graphic_width = width;

        for (i = 0; i < countries.length; i++) {
            drawChart(graphic_width,countries[i],col);
        }
        // data2 = $.unique(graphic_data);
        // console.log(data2);

        // drawChart(graphic_width,"Brazil");

    }
}

function drawChart(container_width,country, col_width) {

// console.log(country)

// console.log(graphic_data)
// console.log(d3.keys(graphic_data[0]))
        // var bar_width =  width + margin.left + margin.right
var total = 0;
var mill = [];



        var commasFormatter = d3.format(",.0f");
        var data = filter_new(graphic_data, {country: country});
        var obj = { minimum: 10, maximum: 20 }


        var dataMillennials = $.grep(data, function(d) {
            return d.age>=15 && d.age <= 33;
        });

        var dataBoomers = $.grep(data, function(d) {
            return d.age>=50 && d.age <= 68;
        });

        var sharesonlyMillennials = dataMillennials.map(function(d) {return d.shares;})
        var sharesonlyBoomers = dataBoomers.map(function(d) {return d.shares;})
        var millennialMax = Math.max.apply(Math, sharesonlyMillennials);
        var BoomersMax = Math.max.apply(Math, sharesonlyBoomers);
        var millennialShareMillennials = sharesonlyMillennials.reduce(function(a, b) {return a + b;});
        var millennialShareBoomers = sharesonlyBoomers.reduce(function(a, b) {return a + b;});

        var is_mobile = false;
        var margin = { top: 30, right: 30, bottom: 35, left: 30 };
        var width = container_width;
        var tick_count = 3;

        if (width <= mobile_threshold) {
            is_mobile = true;
            graphic_aspect_height = 4;
            col_width = 1
            width = Math.floor(((container_width - 44) / (col_width*1.5)) - margin.left - margin.right);

        } else {
            width = Math.floor(((container_width - 44) / (col_width)) - margin.left - margin.right);
        }

        var height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin.top - margin.bottom;

        var y = d3.scale.linear()
            .range([height,0])
            .domain([0,2]);

        var x = d3.scale.ordinal()
            .domain(graphic_data.map(function(d) {  return d.age; }))
            .rangeBands([0, width + margin.left + margin.right],.1,.1);

        var line = d3.svg.line()
            .interpolate('basis')
            .x(function(d) { return x(d.age); })
            .y(function(d) { return y(d.shares); });

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .tickValues(function() {
            if (!is_mobile) {
                return [0,15,23,33,50,59,68,100];
            } else {
                return [0,15,23,33,50,59,68,100];
            }
            });

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('left')
            .ticks(6);
            // .tickFormat(function(d) { return d + "%"; });


        var y_axis_grid = function() { return yAxis; }

        var container = d3.select('#graphic').append('div')
            .attr('id', 'graph-' + country)
            .attr('class', 'graph')
            .attr('style', function(d) {
                if (!is_mobile) {
                    return 'width: ' + (width + margin.left + margin.right) + 'px';
                }
            });

        // var headline = container.append('h3').text(country);


        var svg = container.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var xaxis = svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        var yaxis = svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        // var grid = svg.append('g')
        //     .attr('class', 'y grid')
        //     .call(y_axis_grid()
        //         .tickSize(-width, 0, 0)
        //         .tickFormat('')
        //     );


        svg.append('g')
            .attr('class', 'bars')
            .selectAll('rect')
            .data(data)
            .enter().append('rect')
                .attr("x", function(d) { return x(d.age); })
                .attr("y", function(d) { return y(d.shares); })
                .attr("width", x.rangeBand())
                .attr("height", function(d){ return height - y(d.shares); })
                .attr('class', function(d) {

                    if (d.age >=15 && d.age <= 33) {
                    // console.log(d.age)
                    return 'mill bar bar-' + d.age;
                    } else if (d.age >=50 && d.age <= 68) {
                    return 'boomer bar bar-' + d.age;
                    } else {
                    return 'nomill bar bar-' + d.age;
                    }
                })
                .attr('id', function(d) { return  d.country });

        // svg.append('g')
        //         .attr('class', "line")
        //         .selectAll('path')
        //         .data(data)
        //         .enter().append('path')
        //         .attr("d", function(d) { return line(d.shares); });



       // var millennialshareText =  svg.append('text')
       //      .attr('class', function(d) {
       //              return  "millennial sum " + country ;
       //          })
       //      .attr('x', x(22)-2)
       //      .attr('y', y(millennialMax/2))
       //      .attr('dy', '.2em')
       //      .text(d3.round(millennialShareMillennials) + "%");
            // .text("millennials");



       // var millennialshareText =  svg.append('text')
       //      .attr('class', function(d) {
       //              return  "boomer sum " + country ;
       //          })
       //      .attr('x', x(56))
       //      .attr('y', y(BoomersMax/2))
       //      .attr('dy', '.2em')
       //      .text(d3.round(millennialShareBoomers) + "%");
       //      // .text("boomers");

       var countryname =  svg.append('text')
            .attr('class', function(d) {
                    return  "countryname " + country ;
                })
            .attr('x', x(2)-2)
            .attr('y', y(1.8))
            // .attr('dy', '-.75em')
            // .text(d3.round(millennialShareBoomers,2));
            .text(country);


if (country == "United States") {
       var millennialshareText =  svg.append('text')
            .attr('class', function(d) {
                    return  "boomer sum " + country ;
                })
            .attr('x', x(53)-2)
            .attr('y', y(BoomersMax/2))
            .attr('dy', '-.75em')
            // .text(d3.round(millennialShareBoomers,2));
            .text("boomers");

       var millennialshareText =  svg.append('text')
            .attr('class', function(d) {
                    return  "millennial sum " + country ;
                })
            .attr('x', x(17)-2)
            .attr('y', y(millennialMax/2))
            .attr('dy', '-.75em')
            // .text(d3.round(millennialShareMillennials));
            .text("millennials");
}

        // d3.selectAll('.bar').on('click', millselect)
        /* update responsive iframe */

    if (pymChild) {
        pymChild.sendHeight();
    }


}



/*
 * NB: Use window.load instead of document.ready
 * to ensure all images have loaded
 */
$(window).load(function() {
            d3.csv(graphic_data_url, function(error, data) {
                graphic_data = data;

                graphic_data.forEach(function(d) {
                    d.country = d.country;
                    d.year = +d.year;
                    d.age = +d.age;
                    d.sums = +d.sums;
                    d.shares = d3.round(+d.shares,2);
                });

                pymChild = new pym.Child({
                    renderCallback: render
                });
            });
})

var $graphic = $('#graphic');

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_data;
var graphic_data_url = 'bookdata-volume2.csv';
var graphic_default_width = 600;
var is_mobile;
var mobile_threshold = 540;
var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};

  var color = d3.scale.ordinal()
      .range([ colors['teal3'], colors['yellow4'], colors['blue4'], colors['orange3'], colors['red3'] ]);

var variablesNames = [ 'New', 'Used', "Rented", "Other"];


/*
 * Render the graphic
 */
function render(container_width) {
    var graphic_width;
    console.log(container_width)
    if (!container_width) {
        container_width = graphic_default_width;
    }

    if (container_width <= mobile_threshold) {
        is_mobile = true;
    } else {
        is_mobile = false;
    }
    
    // clear out existing graphics
    $graphic.empty();

    draw_graph(container_width);

    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

function draw_graph(width) {
  var graphic_aspect_height;
  var graphic_aspect_width;
  var height;
  var margin = { top: 5, right: 10, bottom: 30, left: 20 };
  var num_x_ticks;
  var num_y_ticks;

    if (is_mobile) {
        graphic_aspect_width = 4;
        graphic_aspect_height = 3;
        num_x_ticks = 5;
        num_y_ticks = 5;
    } else {
        graphic_aspect_width = 16;
        graphic_aspect_height = 9;
        num_x_ticks = 10;
        num_y_ticks = 10;
    }

    width = width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

  var x = d3.scale.ordinal()
      .rangeRoundBands([0, width], .1);

  var y = d3.scale.linear()
      .rangeRound([height, 0]);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .tickFormat(d3.format(".d"));

  var x_axis_grid = function() { return xAxis; };
  var y_axis_grid = function() { return yAxis; };

  var svg = d3.select('#graphic').append('svg')
        .attr('width', width + margin['left'] + margin['right'])
        .attr('height', height + margin['top'] + margin['bottom'])
        .append('g')
            .attr('transform', 'translate(' + margin['left'] + ',' + margin['top'] + ')');

  x.domain(graphic_data.map(function(d) { return d.date; }));
  y.domain([0, 16]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
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
    
  var date = svg.selectAll(".date")
      .data(graphic_data)
    .enter().append("g")
      .attr("class", "g")
      .attr("transform", function(d) { return "translate(" + x(d.date) + ",0)"; });

  date.selectAll("rect")
      .data(function(d) { return d.ages; })
    .enter().append("rect")
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.y1); })
      .attr("height", function(d) { return y(d.y0) - y(d.y1); })
      .style("fill", function(d) { return color(d.name); });

  var legend = svg.selectAll(".legend")
      .data(color.domain().slice())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(" + i * 70 + ",0)"; });

  legend.append("rect")
      .attr("x", width - 295)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

  legend.append("text")
      .attr("x", width - 300)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
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

            d3.csv("bookdata-volume2.csv", function(error, data) {
              color.domain(d3.keys(data[0]).filter(function(key) { return key !== "date"; }));

              data.forEach(function(d) {
                var y0 = 0;
                d.ages = color.domain().map(function(name) { return {name: name, y0: y0, y1: y0 += +d[name]}; });
                d.total = d.ages[d.ages.length - 1].y1;
              });

              data.sort(function(a, b) { return b.total - a.total; });

              graphic_data = data;

            var pymChild = new pym.Child({
                renderCallback: render
            });
          });            
    } else {
        pymChild = new pym.Child({ });
    }
})
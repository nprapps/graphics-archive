var pymChild = null;

var colors = {
    'red1': '#6C2315', 'red2': '#A23520', 'red3': '#D8472B', 'red4': '#E27560', 'red5': '#ECA395', 'red6': '#F5D1CA',
    'orange1': '#714616', 'orange2': '#AA6A21', 'orange3': '#E38D2C', 'orange4': '#EAAA61', 'orange5': '#F1C696', 'orange6': '#F8E2CA',
    'yellow1': '#77631B', 'yellow2': '#B39429', 'yellow3': '#EFC637', 'yellow4': '#F3D469', 'yellow5': '#F7E39B', 'yellow6': '#FBF1CD',
    'teal1': '#0B403F', 'teal2': '#11605E', 'teal3': '#17807E', 'teal4': '#51A09E', 'teal5': '#8BC0BF', 'teal6': '#C5DFDF',
    'blue1': '#28556F', 'blue2': '#3D7FA6', 'blue3': '#51AADE', 'blue4': '#7DBFE6', 'blue5': '#A8D5EF', 'blue6': '#D3EAF7'
};
var fmt_commas = d3.format(",.0f");

var color = ['#28556F', '#3D7FA6', '#51AADE','#7DBFE6', '#A8D5EF', '#D3EAF7']

var fmt_year_abbr = d3.time.format('%y');
var fmt_year_full = d3.time.format('%Y');
var graphic_default_width = 600;
var is_mobile;
var tooltip;
var margin;
var mobile_threshold = 500;
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


var data_array = [
                '99th.json',
                '90th.json',
                '80th.json',
                '70th.json',
                '60th.json',
                '50th.json',
                '40th.json',
                '30th.json',
                '20th.json',
                '10th.json',
                '0th.json'] 

var name_array = [
                '99th',
                '90th-99th',
                '80th-90th',
                '70th-80th',
                '60th-70th',
                '50th-60th',
                '40th-50th',
                '30th-40th',
                '20th-30th',
                '10th-20th',
                '0-10th']

var value_array = ['$207k+',
                '$103k-$207k',
                '$72k-$103k',
                '$58k-$72k',
                '$48k-$58k',
                '$40k-$48k',
                '$32k-$40k',
                '$26k-$32k',
                '$21k-$26k',
                '$12k-$21k',
                '$0-$12k']



///////////////////////////
// Render the graphic
///////////////////////////
function render( container_width) {
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
        graphic_width = Math.floor(container_width/1);
    }

    if (is_mobile) {
        d3.select('#tooltip').remove();
    } 


// draw graphic

    d3.select('#graphic')
        .append('div')
for (var i = 0; i <data_array.length; i++) {
            draw_graph(graphic_width, data_array[i], name_array[i] , i , value_array[i]);                
}

    // TODO: draw your graphic
    
    if (pymChild) {
        pymChild.sendHeightToParent();
    }
}

///////////////////////////
// draw graphic
///////////////////////////

function draw_graph(graphic_width, data, name, number, value) {
    var graphic_aspect_height;
    var graphic_aspect_width;
    var margin = { top: 10, right: 20, bottom: 0, left: 90 };

    if (is_mobile) {
        margin = { top: 10, right: 10, bottom: 0, left: 90 };                
        graphic_aspect_width = 3;
        graphic_aspect_height = 4;
        num_x_ticks = 5;
        num_y_ticks = 5;
    } else {
        graphic_aspect_width = 6.5;
        graphic_aspect_height = 1;
        num_x_ticks = 6;
        num_y_ticks = 10;
    }

    width = graphic_width - margin['left'] - margin['right'];
    height = Math.ceil((width * graphic_aspect_height) / graphic_aspect_width) - margin['top'] - margin['bottom'];

    var currState = 'nat';
    // var medCutoff = 40000;
    // var showParentLab = false;
    // var currOcc = null;

    var treemap = d3.layout.treemap()
        .size([width, height])
        .sticky(true)
        .padding(0)        
        .sort(function(a, b) { return a.value - b.value; })
        .value(function(d) { return d.size; });;

    if (is_mobile) {
    treemap
        .padding(5)            
        .mode('squarify')
        .ratio(1.61803398875);
    } else {

    treemap
        .mode('slice');    
    }

    var bigdiv = d3.select('#graphic')
        .append('div')
        .style("position", "relative")
        .attr('class', 'bigchart ' + classify(name))

    var header = bigdiv.append('div')
        .attr('class', 'headerdiv ' + classify(name))
        .style("position", "absolute");


        header.append('h3')
        .attr('class', 'group ' + classify(name))            
        .text(value);

        header.append('h4')
        .attr('class', 'amount ' + classify(name))            
        .text(function(d) {
            if (name == '99th') {
                return "(" + toTitleCase(name) + " Percentile)";        
            } else {
                return "(" + toTitleCase(name) + ")";        
            }
        });

    var div = bigdiv
        .append('div')
        .style("position", "relative")
        .attr('class', 'chart-' + classify(name))        
        .style('width', (width + margin.left + margin.right) + 'px')
        .style('height', (height + margin.top + margin.bottom) + 'px')
        .style('left', margin.left + 'px')
        .style('top', margin.top + 'px');


    // Load the employment data
    d3.json(data)
        .get(function(error, root) {     
            var node = div.datum(root).selectAll(".node")
                .data(treemap.nodes)
            .enter().append("div")
                // .attr("class", function(d) { return d.children ? "parent node" : "node " + name + " " + classify(d['name']); })
                .attr("class", function(d) { return d.children ? "parent node" : "node child percentile-" + name + " " + classify(d['name']); })
                .attr("id", function(d) { return d.children ? "parent" : 'percentile-' +  classify(d['name']) })
            .call(position)
            .on('click', clicked)
            .on('mouseover', mouseover);


        // Append labels to wider rectangles
        var rank = node.append("div")
            .attr("class", "childranklabel")
            .text(function(d) {
                if (d.children || d.dx*d.dy < 1000) { return null; }
                else { return d['color']; }
            });

        // Append labels to wider rectangles
        var label = node.append("div")
            .attr("class", "childlabel")
            .text(function(d) {
                if (d.children || d.dx*d.dy < 1000) { return null; }
                else { return toTitleCase(d['name']); }
            });

        }); // @end on load event


       function mouseover(d) {

            var tt_text = '';    
            // define tooltip text
            if (d['name'] == undefined ){
                tt_text = "<br/>";
            } else {
                tt_text += '<strong>' + toTitleCase(d['name']) + '</strong>';
                // tt_text += ', Number Of Workers: ' + fmt_commas(d['size']) + '<br />';
            }            
            // define tooltip position 
            if (is_mobile) {
            d3.select('#tooltip').remove();
            } else {
            d3.select('#tooltip')
                .html(tt_text)
            }                
    }     

}       

function clicked(d) {
    d3.selectAll(".hover-job").classed("hover-job",false);
    var job = classify(d['name']);
    d3.selectAll("."+ job).classed("hover-job",true);

}
function mouse(d) {
    d3.selectAll(".hover-job").classed("hover-job",false);
    var job = classify(d['name']);
    d3.selectAll("."+ job).classed("hover-job",true);
}

function position() {
  this.style("left", function(d) { return d.x + "px"; })
      .style("top", function(d) { return d.y + "px"; })
      .style("width", function(d) { return Math.max(0, d.dx - 1) + "px"; })
      .style("height", function(d) { return Math.max(0, d.dy -2) + "px"; });
}

function classify(str) {
    return str.replace(/\s+/g, '-').toLowerCase();
}

function toTitleCase(str)
{
    if (str == "IT") {
    return str;
    } else {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    }
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


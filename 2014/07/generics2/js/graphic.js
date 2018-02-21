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
    var graphic_data_url = 'drugs.csv';
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

    // clear out existing graphics
    $graphic.empty();

    var commasFormatter = d3.format(",.0f");

    var num_bars = graphic_data.length;
    
    var tick_count = 6;
    if (width < mobile_threshold) { tick_count = 4};

    var margin = { top: 60, right: 10, bottom: 50, left: 160 };
    var width = width - margin.left - margin.right;
    var height = ((bar_height + bar_gap) * num_bars);
            
    var x = d3.scale.linear()
        .range([0, width])
     
    var y = d3.scale.ordinal()
        .rangeRoundBands([0, height], .2);

    
    x.domain([-50,50]);
    y.domain(graphic_data.map(function(d) { return d.drug; }));

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient('top')
        .ticks(tick_count)
        .tickFormat(function(d) { return commasFormatter(d) + "%" });
        
    var xAxis2 = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .ticks(tick_count)
        .tickFormat(function(d) { return commasFormatter(d) + "%" });
        
    var x_axis_grid = function() { return xAxis; }
    
    var svg = d3.select('#graphic').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("refX", 2) /*must be smarter way to calculate shift*/
        .attr("refY", 2)
        .attr("markerWidth", 6)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
            .attr("d", "M 0,0 V 4 L6,2 Z"); 

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,-3)')
        .call(xAxis);

    svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis2);

    svg.append('g')
        .attr('class', 'x grid')
        // .attr('transform', 'translate(0,' + height + ')')
        .call(x_axis_grid()
            .tickSize(-height, 0, 0)
            .tickFormat('')
        );

    svg.append('text')
        .attr('class', 'label2')
        .attr('x', x(-30))
        .attr('y', "0")
        .attr('dy', -30)            
        // .attr('dx', function(d) { return width < mobile_threshold ? 40 : 120; })                
        .text('Favor Brands')      
        .style('text-anchor',"middle");        
    
    svg.append('text')
        .attr('class', 'label2')
        .attr('x', x(-30))
        .attr('y', "0")
        .attr('dy', 30)  
        .attr('transform', 'translate(0,' + height + ')')                      
        // .attr('dx', function(d) { return width < mobile_threshold ? 40 : 120; })                
        .text('Favor Brands')      
        .style('text-anchor',"middle");        

      svg.append('text')
        .attr('class', 'label2')
        .attr('x', x(30))
        .attr('y', "0")
        .attr('dy', -30)            
        // .attr('dx', function(d) { return width < mobile_threshold ? 40 : 120; })                
        .text('Favor Generics')
        .style('text-anchor',"middle");        
    
    svg.append('text')
        .attr('class', 'label2')
        .attr('x', x(30))
        .attr('y', "0")
        .attr('dy', 30)  
        .attr('transform', 'translate(0,' + height + ')')                      
        // .attr('dx', function(d) { return width < mobile_threshold ? 40 : 120; })                
        .text('Favor Generics')      
        .style('text-anchor',"middle");        

  svg.append("line")
    .attr('class', 'arrow')      
    .attr("x1", x(10))
    .attr("y1", -45)
    .attr("x2", x(45))
    .attr("y2", -45)
    .attr("marker-end", "url(#arrowhead)");

  svg.append("line")
    .attr('class', 'arrow')      
    .attr("x1", x(-10))
    .attr("y1", -45)
    .attr("x2", x(-45))
    .attr("y2", -45)
    .attr("marker-end", "url(#arrowhead)");

  svg.append("line")
    .attr('class', 'arrow')      
    .attr("x1", x(10))
    .attr("y1", height+38)
    .attr("x2", x(45))
    .attr("y2", height+38)
    .attr("marker-end", "url(#arrowhead)");

  svg.append("line")
    .attr('class', 'arrow')      
    .attr("x1", x(-10))
    .attr("y1", height+38)
    .attr("x2", x(-45))
    .attr("y2", height+38)
    .attr("marker-end", "url(#arrowhead)");

    svg.append('g')
        .selectAll('rect')
            .data(graphic_data)
        .enter().append('rect')
            .attr('x', function(d) { return x(Math.min(0,d.diff)) })
            .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
            .attr("width", function(d) { return Math.abs(x(d.diff) - x(0)); })
            .attr("height", y.rangeBand())
            // .attr("y", function(d, i) { return i * (bar_height + bar_gap); })
            // .attr("width", function(d){ return x(d.diff); })
            .attr("height", bar_height)
            .attr("class", function(d) { return d.diff < 0 ? "bar-negative" : "bar-positive"; })
    
    // svg.append('g')
    //     .attr('class', 'value')
    //     .selectAll('text')
    //         .data(graphic_data)
    //     .enter().append('text')
    //         .attr('x', function(d) { return x(d.diff) })
    //         .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
    //         .attr('dx', function(d) { return d.diff < 0 ? -5 : 35} )                
    //         .attr('dy', 12)
    //         .attr('text-anchor', 'end')
    //         .attr('class', function(d) { return 'l-' + d.drug.replace(/\s+/g, '-').toLowerCase() })
    //         .text(function(d) { return  d.diff + "%"});

    svg.append('g')
        .attr('class', 'label')
        .selectAll('text')
            .data(graphic_data)
        .enter().append('text')
            .attr('x', "0")
            .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
            .attr('dy', 12)
            .attr('dx', function(d) { return width < mobile_threshold ? -5 : -0; })                
            .attr('text-anchor', 'end')
            .attr('class', function(d) { return 'l-' + d.drug.replace(/\s+/g, '-').toLowerCase() })
            .text(function(d) { return d.drug});        

    svg.append('text')
        .attr('class', 'label')
        .attr('x', "0")
        .attr('y', function(d, i) { return 32 * (bar_height + bar_gap); })            
        .attr('dx', function(d) { return width < mobile_threshold ? -70 : -70; })                
        .attr('dy', -23)
        .text('(Alka-Seltzer)');      

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
    if (Modernizr.svg) {
        $graphic = $('#graphic');

        d3.csv(graphic_data_url, function(error, data) {
            graphic_data = data;

            graphic_data.forEach(function(d) {
                d.drug = d.drug;
                d.diff = d3.round(+d.diff*100,1);
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

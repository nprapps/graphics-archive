var pymChild = null;
var mobile_threshold = 425;
var test, bars, x, x2, y, svg, xAxis, xAxis2, x_axis_grid, xaxisCall, julyDot, firstValue, secondValue;
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
    var graphic_data_url = 'state-unemployment.csv';
    var graphic_data;


d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};



function render(width) {

    var graphic_width = width;

    drawChart(graphic_width);


    }
    
    function drawChart(width) {
        

        // clear out existing graphics
        $graphic.empty();

        var commasFormatter = d3.format(",.0f");
        var num_bars = graphic_data.length;
        
        if (width < mobile_threshold) { };
    
        var bar_gap = 15;


        if (width <= mobile_threshold) {
           var margin = { top: 30, right: 10, bottom: 35, left: 40 };
           var dotsize = 5;
           var bar_height = 14;
           var tick_count = 4
        
        } else {
          var margin = { top: 30, right: 10, bottom: 35, left: 120 };
          var dotsize = 7;
          var bar_height = 14;
          var tick_count = 6;



        }


        var width = width - margin.left - margin.right;
        var height = ((bar_height + bar_gap) * num_bars);
                
        x = d3.scale.linear()
            .range([0, width])

        x2 = d3.scale.linear()
            .range([0, width])
         
        y = d3.scale.ordinal()
            .rangeRoundBands([0, height], .2);

        
        x.domain([0,8.5]);
        x2.domain([-3,3]);

        y.domain(graphic_data.map(function(d) { return d.state; }));


         xAxis = d3.svg.axis()
            .scale(x)
            .orient('top')
            .ticks(tick_count)
            .tickFormat(function(d) { return commasFormatter(d) + "%" });

         xAxis2 = d3.svg.axis()
            .scale(x2)
            .orient('top')
            .ticks(tick_count)
            .tickFormat(function(d) { return commasFormatter(d) + "%" });
            
         x_axis_grid = function() { return xAxis; }
        
         svg = d3.select('#graphic').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .attr('class','base')
            .append('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



        barsAverage = svg.append('g')
            .selectAll('rect')
                .data(graphic_data)
            .enter().append('rect')
                .attr('class','bars-original')
                .attr('x', x(0))
                .attr('y', function(d, i) { return i * (bar_height + bar_gap)-8; })
                .attr("width", width)
                .attr("height", 30)
                .attr("class", "bar-average")
                .style("opacity", ".5")
                .style("fill", function(d,i) { return i == 0 ? "#fafde0" : i%2 == 0 ? "#f6f6f6": "none" });

       xaxisCall =  svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,-3)')
            .call(xAxis);

        svg.append('g')
            .attr('class', 'x grid')
            .call(x_axis_grid()
                .tickSize(-height, 0, 0)
                .tickFormat('')
            );


        bars = svg.append('g')
            .selectAll('rect')
                .data(graphic_data)
            .enter().append('rect')
                .attr('class','bars')
                .attr('x', function(d) { 
                     test = d['average'] - d['july'];
                    if (test < 0) {
                        return x(d['average']);
                     } else {
                        return x(d['july']);
                     }
                 })
                .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
                .attr("width", "0")
                .attr("height", bar_height)
                .attr("class", function(d) { return d['average'] - d['july'] < 0 ? "bar-negative" : "bar-positive"; })
                .style("fill", function(d) { return d['diff'] < 0 ? colors['teal3'] : colors['red3']} )
                .style("opacity", '0');

        secondValue = svg.append('g')
            .attr('class', 'second-value')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', function(d) { return x(d['average'])})
                .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
                // .attr('dx', function(d) { return d.average < 0 ? -4 : 37} )                
                .attr('dy', 11)
                .style('text-anchor', function(d) { return d['diff'] < 0 ? "end" : "start";  })                
                .style('opacity', '0')                
                // .attr('class', function(d) { return 'red ' + classify(d['state']) })
                .text(function(d) { return  d['july'] })
                .style("fill", function(d) { return d['diff'] < 0 ? colors['teal3'] : colors['red3']} )
                .attr("class", function(d) { return d['diff'] < 0 ? 'pos ' + classify(d['state']) : 'neg ' + classify(d['state']) } );
                // .attr("class", function(d) { return d['diff'] < 0 ? 'pos ' + classify(d['state']) : 'neg ' + classify(d['state']) } );
  
        
        firstValue =  svg.append('g')
            .attr('class', 'first-value')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', function(d) { return  x(d['average'])-10;})
                .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
                // .attr('dx', function(d) { return x(d.average) - x(d.july) < 0 ? -4 : 37} )                
                .attr('dy', 11)
                .style('text-anchor', "end")                
                .attr('class', function(d) { return 'first-value ' + classify(d['state']) })
                .text(function(d) { return  d3.round(d.average,1) });


        var averageDot = svg.append('g')
            .attr('class','averageDot')
            .selectAll(".dot")
              .data(graphic_data)
            .enter().append("circle")
              .attr("class", "dot")
              .attr("r", dotsize)
              .attr("cx", function(d) { return x(d['average']); })
              .attr('cy', function(d, i) { return i * (bar_height + bar_gap) + 8; })
              .style("fill", "#2a2a2a")
              .style("stroke", "#fff")
              .style("stroke-width", function(d) {return width < mobile_threshold ? "1" : "2"});


         julyDot = svg.append('g')
            .attr('class','julyDot')
            .selectAll(".dot")            
              .data(graphic_data)
            .enter().append("circle")
              .attr("class", "dot2")
              .attr("r", dotsize)
              .attr("cx", function(d) { return x(d['average']); })
              .attr('cy', function(d, i) { return i * (bar_height + bar_gap) + 8; })
              // .style("fill", "#e8ff2e")
              .style("fill", function(d) { return d['diff'] < 0 ? colors['teal3'] : colors['red3']} )
              .style("stroke", "#fff")
              .style("stroke-width", function(d) {return width < mobile_threshold ? "1" : "2"})
              .style("opacity", "0");

        
      
        svg.append('g')
            .attr('class', 'label')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', "0")
                .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
                .attr('dy', 10)
                .attr('dx', function(d) { return width < mobile_threshold ? -8 : -12; })                
                .attr('text-anchor', 'end')
                .attr('class', function(d) { return 'name ' + classify(d['state']) })
                .text(function(d) { return width < mobile_threshold ? d['state'] : d['statelong']});    


    
    if (pymChild) {
        pymChild.sendHeightToParent();
    }


}

function after(str) {

        bars                
            .style('opacity','.5')
            .transition()
            .attr("width", function(d) { return x(Math.abs(d['diff'])); })

        firstValue
            .transition()
            .style('opacity','1')                    
            .attr('x', function(d) { return d['diff'] < 0 ? x(d['average']) + 9 : x(d['average']) - 9 })
            .style('text-anchor', function(d) { return d['diff'] < 0 ? "start" : "end";  });                

        julyDot
            .style('opacity','1')        
            .transition()
            .attr("cx", function(d) { return x(d['july']); });

        secondValue
            .style('opacity','1')
            .transition()
            .attr('x', function(d) { return d['diff'] < 0 ? x(d['july']) - 9 : x(d['july']) + 9 });

}

function before(str) {
        bars                
        .transition()
        .attr("width", "0")
        .style('opacity','0')

        firstValue
            .transition()
            .attr('x', function(d) { return x(d['average']) - 10 })
            .style('text-anchor',   "end");                

        julyDot        
            .transition()
            .attr("cx", function(d) { return x(d['average']); })
            .style('opacity','0');
       
        secondValue
            .transition()
            .attr("x", function(d) { return x(d['average']); })
            .style('opacity','0');


}    

var buttons = d3.selectAll('.buttons');

var onClick = function(){
  var el = d3.select(this);
  var isActive = el.attr('class') == 'buttons active';
  buttons.attr('class','buttons');
  
  if (el.attr('name') == 'before' && !isActive){
    el.attr('class', 'buttons active');
  } else if (el.attr('name') == 'after' && !isActive){
    el.attr('class', 'buttons active');
  } 
};

buttons.on('click', onClick);

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
                    d.state = d.state;
                    d.statelong = d.statelong;
                    d.july = +d.july;
                    d.average = +d.average;
                });

            var pymChild = new pym.Child({
                renderCallback: render
            });
        });
    } else {
        pymChild = new pym.Child({ });
    }
})
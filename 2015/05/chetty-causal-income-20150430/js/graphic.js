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
    var graphic_data_url = 'chetty.csv';
    var graphic_data;
    var bar_height = 25;
    var bar_gap = 1;


d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var formatPercent = d3.format(".0%");


function render(width) {

    var graphic_width = width;

    drawChart(graphic_width);

    }
    
    function drawChart(width) {
        // clear out existing graphics
        $graphic.empty();

        var commasFormatter = d3.format(",.0f");

        var num_bars = graphic_data.length;
        
        var tick_count = 6;
        if (width < mobile_threshold) { tick_count = 4};

        var margin = { top: 30, right: 30, bottom: 35, left: 160 };
        var width = width - margin.left - margin.right;
        var height = ((bar_height + bar_gap) * num_bars) + 60;
                
        var x = d3.scale.linear()
            .range([0, width])
         
        var y = d3.scale.ordinal()
            .rangeRoundBands([0, height], .01);

        
        x.domain([-6000,6000]);
        y.domain(graphic_data.map(function(d) { return d.county; }));


        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .ticks(tick_count)
            .tickFormat(function(d) { return  d > 0 ? '+$' + commasFormatter(Math.round(d)) : '-$' + commasFormatter(Math.abs(Math.round(d)))  });

            // .tickFormat(function(d) {


            // return "$" + commasFormatter(d.toFixed(0));
        // });
            

        var xAxis2 = d3.svg.axis()
            .scale(x)
            .orient('top')
            .ticks(tick_count)
            .tickFormat(function(d) { return  d > 0 ? '+$' + commasFormatter(Math.round(d)) : '-$' + commasFormatter(Math.abs(Math.round(d)))  });

        var x_axis_grid = function() { return xAxis2; }
        
        var svg = d3.select('#graphic').append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + height + ')')
            .call(xAxis);

        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,-8)')
            .call(xAxis2);
  

        svg.append('g')
            .attr('class', 'x grid')
            // .attr('transform', 'translate(0,' + height + ')')
            .call(x_axis_grid()
                .tickSize(-height, 0, 0)
                .tickFormat('')
            );

        svg.append('g')
            .selectAll('rect')
                .data(graphic_data)
            .enter().append('rect')
                .attr('x', function(d) { return x(Math.min(0,d.income)) })
               .attr('y', function(d, i) { 
                    if (i > 24) {
                    return i * (bar_height + bar_gap) + 60;
                    } else {
                    return i * (bar_height + bar_gap); 
                    }
                })                
                // .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
                .attr("width", function(d) { return Math.abs(x(d.income) - x(0)); })
                .attr("height", bar_height)
                // .attr("height", y.rangeBand())
                .attr("class", function(d) { return d.income < 0 ? "bar negative " + convertToSlug(d['county']) : "bar positive " + convertToSlug(d['county']) ; });


        svg.append('g')
            .attr('class', 'value')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', function(d) { return x(d.income) })
                .attr('y', function(d, i) { 
                    if (i > 24) {
                    return i * (bar_height + bar_gap) + 60;
                    } else {
                    return i * (bar_height + bar_gap); 
                    }
                })
                .attr('dx', function(d) { return d.income < 0 ? -6 : 6} )                
                .attr('dy', 15)
                .attr('text-anchor', function(d) { return d.income < 0 ? 'end' : 'start'} )                
                .attr('class', function(d) { 
                    return convertToSlug(d['county']);
                })
                .text(function(d) { return  d.income > 0 ? '+$' + commasFormatter(Math.round(d.income)) : '-$' + commasFormatter(Math.abs(Math.round(d.income)))  });

        svg.append('g')
            .attr('class', 'label')
            .selectAll('text')
                .data(graphic_data)
            .enter().append('text')
                .attr('x', "0")
                .attr('y', function(d, i) { 
                    if (i > 24) {
                    return i * (bar_height + bar_gap) + 60;
                    } else {
                    return i * (bar_height + bar_gap); 
                    }
                })
                // .attr('y', function(d, i) { return i * (bar_height + bar_gap); })
                .attr('dy', 15)
                .attr('dx', function(d) { return width < mobile_threshold ? -25 : -15; })                
                .attr('text-anchor', 'end')
                .attr('class', function(d) { 
                    return convertToSlug(d['county']);
                })
                .text(function(d) { return d.county});        
      
        svg.append('line')
            .attr('class', 'marker-line')
            .attr('y1', function(d, i) { 
                return 25 * (bar_height + bar_gap) + 32;
            })
            .attr('y2', function(d, i) { 
                return 25 * (bar_height + bar_gap) + 32;
            })
            .attr('x1', function(d, i) { 
                return - margin.left+40;
            }) 
            .attr('x2', function(d, i) { 
                return width ;
            })
            .attr('stroke-dasharray', '5,5')           

        svg.append('line')
            .attr('class', 'marker-line-h')
            .attr('y1', 0)
            .attr('y2', function(d, i) { 
                return height;
            })
            .attr('x1', x(0)) 
            .attr('x2', x(0))
            // .attr('stroke-dasharray', '1,1')             

        svg.append('text')
        .attr('class', 'marker-text')
            .attr('y', function(d, i) { 
                return 26 * (bar_height + bar_gap) ;
            })
            .attr('x', x(-6000))
            .attr('text-anchor', 'start')            
            .text('Top 25 Counties')
        
        svg.append('text')
        .attr('class', 'marker-text')
            .attr('y', function(d, i) { 
                return 26 * (bar_height + bar_gap) + 21;
            })
            .attr('x', x(6000))
            .attr('text-anchor', 'end')
            .text('Bottom 25 Counties')


    if (pymChild) {
        pymChild.sendHeightToParent();
    }


    function moused(d) {

    var selectedVal = d.county.replace(/\s+/g, '-').toLowerCase();
    console.log(d)
    d3.selectAll('.bar').classed('selected', false);
    d3.selectAll('.label').classed('selected', false);
    d3.selectAll('.value').classed('selected', false);
    d3.selectAll('.' + selectedVal).classed('selected', true).moveToFront();


    }

    function convertToSlug(Text){
        return Text
            .toLowerCase()
            .replace(/ /g,'-')
            .replace(/[^\w-]+/g,'')
            ;
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
                    d.county = d.county;
                    d.income = +d.income;
                });

                pymChild = new pym.Child({ 
                    renderCallback: render
                });
            });
})

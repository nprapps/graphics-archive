// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};
// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = null;
var labelHeight;
var barHeight;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        //loadCSV('data.csv')
    } else {
        pymChild = new pym.Child({});
    }
}

/*
 * Load graphic data from a local source.
 */
var loadLocalData = function(data) {
    graphicData = data;

    formatData();

    pymChild = new pym.Child({
        renderCallback: render
    });
}

/*
 * Load graphic data from a CSV.
 */
var loadCSV = function(url) {
    d3.csv(GRAPHIC_DATA_URL, function(error, data) {
        graphicData = data;

        formatData();

        pymChild = new pym.Child({
            renderCallback: render
        });
    });
}

/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d) {
        d['amt'] = +d['amt'];
        d['genre'] = d['genre'];
        d['revenue'] = +d['revenue'];
        d['area'] = +d['area'];
    });
}

/*
 * Render the graphic(s). Called by pym with the container width.
 */
var render = function(containerWidth) {
    if (!containerWidth) {
        containerWidth = GRAPHIC_DEFAULT_WIDTH;
    }

    if (containerWidth <= MOBILE_THRESHOLD) {
        isMobile = true;
    } else {
        isMobile = false;
    }

    // Render the chart!
    renderDotChart({
        container: '#graphic',
        width: containerWidth,
        data: graphicData
    });

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

/*
 * Render a bar chart.
 */
var renderDotChart = function(config) {
    /*
     * Setup
     */
    var labelColumn = 'label';
    var valueColumn = 'amt';
    var minColumn = 'min';
    var maxColumn = 'max';

     barHeight = 20;
    var barGap = 5;
    var labelWidth = 60;
    var labelMargin = 10;
    var valueMinWidth = 30;
    var dotRadius = 5;

    var margins = {
        top: 20,
        right: 80,
        bottom: 20,
        left: (labelWidth + labelMargin)
    };

    var ticksX = 4;
    var roundTicksFactor = 5;

    if (isMobile) {
        ticksX = 6;
        margins['right'] = 30;
    }

     labelHeight =  700
    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = barHeight + barGap + labelHeight +  margins['top'] + margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 scale objects.
     */
    var yScale = d3.scale.linear().domain([0,45000]).range([0,60])
    var xScale = d3.scale.linear()
        .domain([0,26])
        .range([0, chartWidth]);

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .ticks(ticksX)
        .tickFormat(function(d) {
            return d*100 + '%';
        });

    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    };

    // chartElement.append('g')
    //     .attr('class', 'x grid')
    //     .attr('transform', makeTranslate(0, chartHeight))
    //     .call(xAxisGrid()
    //         .tickSize(-chartHeight, 0, 0)
    //         .tickFormat('')
    //     );

    /*
     * Render range bars to chart.
     */
    // chartElement.append('g')
    //     .attr('class', 'bars')
    //     .selectAll('line')
    //     .data(config['data'])
    //     .enter()
    //     .append('line')
    //         .attr('x1', function(d, i) {
    //             return xScale(d[minColumn]);
    //         })
    //         .attr('x2', function(d, i) {
    //             return xScale(d[maxColumn]);
    //         })
    //         // .attr('y1', function(d, i) {
    //             // return i * (barHeight + barGap) + (barHeight / 2);
    //         // })
    //         // .attr('y2', function(d, i) {
    //             return i * (barHeight + barGap) + (barHeight / 2);
    //         });

    /*
     * Render dots to chart.
     */
    chartElement.append('g')
        .attr('class', 'dots')
        .selectAll('circle')
        .data(config['data'])
        .enter().append('circle')
            .attr('class', function(d) {
                console.log(d)
                return classify(d['genre']) + " " + classify(d[labelColumn]);
            })        
            .attr('cx', function(d, i) {
                return xScale(d[valueColumn]);
            })
            .attr('cy', function(d, i) {
                if (d['genre'] == "Horror") {
                return barHeight/2 + labelHeight*(2/6);                    
                } else if (d['genre'] == "Comedy") {
                return barHeight/2 + labelHeight*(3/6);                    
                } else if (d['genre'] == "Drama") {
                return barHeight/2 + labelHeight*(4/6);                    
                } else {
                return barHeight/2 + labelHeight*(5/6);                        
                }
            })
            .attr('r', function(d, i) {
                return yScale(d['area']);
            })
    

    chartElement.append('circle')
        .attr('class', 'reference-dots')
        .attr('cx', function(d, i) {
                return 25 + 'px';
        })
        .attr('cy', function(d, i) {
                return 60 + 'px';
        })
        .attr('r', function(d, i) {
                return yScale(44721.35955);
        })
    chartElement.append('circle')
        .attr('class', 'reference-dots')
        .attr('cx', function(d, i) {
                return 25 + 'px';
        })
        .attr('cy', function(d, i) {
                return 60 + 'px';
        })
        .attr('r', function(d, i) {
                return yScale(15811);
        })
    
    chartElement.append('text')
        .attr('class', 'reference-label')
        .attr('x', function(d, i) {
                return 25 + 'px';
        })
        .attr('y', function(d, i) {
                return 60 + 'px';
        })
        .attr('dy', function(d, i) {
                return yScale(15811) + 12;
        })
        .attr('text-anchor', 'middle' )
        .text('$250 Million')    

    chartElement.append('text')
        .attr('class', 'reference-label')
        .attr('x', function(d, i) {
                return 25 + 'px';
        })
        .attr('y', function(d, i) {
                return 60 + 'px';
        })
        .attr('dy', function(d, i) {
                return yScale(44721.35955) + 12;
        })
        .attr('text-anchor', 'middle' )
        .text('$2 Billion')

    chartElement.append('text')
        .attr('class', 'reference-label')
        .attr('x', function(d, i) {
                return 35 + 'px';
        })
        .attr('y', function(d, i) {
                return -5 + 'px';
        })
        .attr('text-anchor', 'middle' )
        .text("Gross Revenue For Each Film")    


    d3.selectAll('.horror').moveToFront();
    /*
     * Render bar labels.
     */
    chartElement.append('g')
        .attr('class', 'genre-labels')
        .selectAll('text')
        .data(['Horror','Comedy','Drama', 'Other'])
        .enter().append('text')
        .attr('class', function(d) {
            return classify(d);
        })        
        .attr('x', function(){
            if(!isMobile) {
                return  15;
            } else {
                return -5;
            }
        })
        .attr('y', function(d, i) {
            return barHeight/2 + labelHeight*((i+2)/6);                    
        })
        .attr('text-anchor', 'end')    
        .text(function(d) {
            return d;
        });

    // /*
    //  * Render bar values.
    //  */
        chartElement.append('g')
            .attr('class', 'movie-labels')
            .selectAll('text')
            .data(config['data'])
            .enter().append('text')
            .attr('class', function(d) {
                return 'movie-label ' + classify(d[labelColumn]);
            })                    
                .attr('x', function(d, i) {
                    return xScale(d[valueColumn]) + 6 + "px";
                })
                .attr('y', function(d,i) {
                if (d['genre'] == "Horror") {
                    return barHeight/2 + labelHeight*(2/6);                    
                    } else if (d['genre'] == "Comedy") {
                    return barHeight/2 + labelHeight*(3/6);                    
                    } else if (d['genre'] == "Drama") {
                    return barHeight/2 + labelHeight*(4/6);                    
                    } else {
                    return barHeight/2 + labelHeight*(5/6);                        
                    }                
                })
                .text(function(d) {
                    return d[labelColumn];
                });

        chartElement.append("svg:defs").selectAll("marker")
            .data(["arrow"])
          .enter().append("svg:marker")
            .attr("id", String)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 10)
            .attr("refY", 0)
            .attr("markerWidth", 10)
            .attr("markerHeight", 10)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M0,-5L10,0L0,0");


        chartElement.append('g')
            .attr('class', 'movie-labels-lines')
            .selectAll('line')
            .data(config['data'])
            .enter().append('line')
            .attr('class', function(d) {
                return 'movie-label-line ' + classify(d[labelColumn]);
            })                    
            .attr('x1', function(d, i) {
                return xScale(d[valueColumn]) + "px";
            })                
            .attr('x2', function(d, i) {
                return xScale(d[valueColumn]) + "px";
            })
            .attr('y1', function(d,i) {
                if (d['genre'] == "Horror") {
                return barHeight/2 + labelHeight*(2/6)-20;                    
                } else if (d['genre'] == "Comedy") {
                return barHeight/2 + labelHeight*(3/6);                    
                } else if (d['genre'] == "Drama") {
                return barHeight/2 + labelHeight*(4/6);                    
                } else {
                return barHeight/2 + labelHeight*(5/6);                        
                }
            })
            .attr('y2', function(d,i) {
                return barHeight/2 + labelHeight*(2/6);                    
            });

            shortenLabel('the-conjuring', -40, -40 )
            shortenLabel('insidious-chapter-2', -70, -70 )
            shortenLabel('paranormal-activity-3', -80, -80 )
            shortenLabel('paranormal-activity-2', -120, -120 )
            shortenLabel('the-devil-inside', -40, -40 )
            shortenLabelOther('kings-speech-the', 476.66666666666663, 40, -40)
            shortenLabelOther('magic-mike', 360, 20, -25 )
            shortenLabelOther('black-swan', 593.3333333333334, 20, -35 )


            chartElement
                .append("line")
                .attr("x1", '10px')
                .attr("x2", function(d) { return xScale(25); })
                .attr("y1", (barHeight*(2/3) + labelHeight*(6/6)))
                .attr("y2", (barHeight*(2/3) + labelHeight*(6/6)))
                .attr("class", "link arrow")
                .attr("marker-end", "url(#arrow)");

            chartElement.append('text')
                .attr('class', 'reference-label')
                .attr("x", function(d) { return xScale(22); })
                .attr("y", (barHeight*(2/3) + labelHeight*(6/6)))
                .attr('dy', -15)
                .attr('text-anchor', 'middle' )
                .text('Better Investment') 
    
    d3.select(".grid:nth-child(1)").select('g').select('.tick').style('opacity', 0)


}


var shortenLabel = function(movie, label, line) {
    d3.selectAll('.movie-label.' + movie)
        .attr('dy', label )

    d3.select('.movie-label-line.' + movie)
        .attr('y2', function(d,i) {
                return (barHeight/2 + labelHeight*(2/6) + line + 5) + "px";
        })
    d3.selectAll('.' + movie).moveToFront();
}
var shortenLabelOther = function(movie, label, xmove, ymove) {
    d3.selectAll('.movie-label.' + movie)
        .attr('y', label )
        .attr('dy', ymove )
        .attr('dx', xmove )
        .style('opacity', '1')

    // d3.select('.movie-label-line.' + movie)
    //     .attr('y2', function(d,i) {
    //             return (barHeight/2 + labelHeight*(1.5/6) + line + 5) + "px";
    //     })
    d3.selectAll('.' + movie).moveToFront();
}
/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

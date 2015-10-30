// Global config
var GRAPHIC_DEFAULT_WIDTH = 600;
var MOBILE_THRESHOLD = 500;

// Global vars
var pymChild = null;
var isMobile = false;
var graphicData = [];
var graphicData2 = [];
var typeahead_init = false;

// D3 formatters
var fmtYearAbbrev = d3.time.format('%y');
var fmtYearFull = d3.time.format('%Y');
var COLLEGES_LIST;
var formattedData = [];
var selectLine;
var selectLabel, selectSticker, selectStickerLabel;
var xScale;
var yScale;
var line, area;
var dateColumn = 'hhincome';
var valueColumn = 'amt';
var scatterPlotData;
var scatter;
var chartElement;
var labelGap = 42;
var margins;
var stickerPrice;

// TODO:
// If NULL FOR SCATTER, make blank;
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var wrapText = function(texts, width, lineHeight) {
    texts.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();

        var word = null;
        var line = [];
        var lineNumber = 0;

        var x = text.attr('x');
        var y = text.attr('y');

        var dx = parseFloat(text.attr('dx'));
        var dy = parseFloat(text.attr('dy'));

        var tspan = text.text(null)
            .append('tspan')
            .attr('x', x)
            .attr('y', y)
            .attr('dx', dx + 'px')
            .attr('dy', dy + 'px');

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(' '));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(' '));
                line = [word];

                lineNumber += 1;

                tspan = text.append('tspan')
                    .attr('x', x)
                    .attr('y', y)
                    .attr('dx', dx + 'px')
                    .attr('dy', lineNumber * lineHeight)
                    .attr('text-anchor', 'begin')
                    .text(word);
            }
        }
    });
}

var substringMatcher = function(strs) {
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
        matches.push(str);
      }
    });
    matches.sort();
    cb(matches);
  };
};


/*
 * Initialize graphic
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        loadLocalData(GRAPHIC_DATA);
        loadLocalData2(GRAPHIC_DATA2);
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

}

var loadLocalData2 = function(data) {
    graphicData2 = data;
    formatData2();
    pymChild = new pym.Child({
        renderCallback: render
    });
}



/*
 * Format graphic data for processing by D3.
 */
var formatData = function() {
    graphicData.forEach(function(d) {
        // d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);
        // console.log(d)
        for (var key in d) {
            if (key != 'name') {
                d[key] = +d[key];
            }
        }
    });
}

var formatData2 = function() {
    graphicData2.forEach(function(d) {
        // d['date'] = d3.time.format('%m/%d/%y').parse(d['date']);
        // console.log(d)
        for (var key in d) {
            if (key != 'names') {
                d[key] = +d[key];
            }
        }
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
    renderLineChart({
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
 * Render a line chart.
 */
var renderLineChart = function(config) {
    /*
     * Setup
     */

    
    var aspectWidth = isMobile ? 3 : 4;
    var aspectHeight = isMobile ? 3 : 3;

    margins = {
        top: 35,
        right: 150,
        bottom: 50,
        left: 50
    };

    var ticksX = 10;
    var ticksY = 10;
    var roundTicksFactor = 5;

    // Mobile
    if (isMobile) {
        ticksX = 5;
        ticksY = 5;
        margins['left'] = 35;
        margins['right'] = 25;
        margins['bottom'] = 55;        
    }

    // Calculate actual chart dimensions
    var chartWidth = config['width'] - margins['left'] - margins['right'];
    var chartHeight = Math.ceil((config['width'] * aspectHeight) / aspectWidth) - margins['top'] - margins['bottom'];

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');


    /*
     * Restructure tabular data for easier charting.
     */

    for (var column in graphicData[0]) {
        if (column == dateColumn) {
            continue;
        }

        formattedData[column] = graphicData.map(function(d) {
            return {
                'hhincome': d[dateColumn],
                'amt': d[column],
                'name': column
            };
// filter out empty data. uncomment this if you have inconsistent data.
//        }).filter(function(d) {
//            return d['amt'].length > 0;
        });
    }

    stickerPrice = d3.nest()
                     .key(function(d) { return d['names']})
                     .entries(graphicData2)

    COLLEGES_LIST = d3.keys(formattedData)
    /*
     * Create D3 scale objects.
     */
    xScale = d3.scale.linear()
        .domain([0,120000])
        .range([ 0, chartWidth]);


    yScale = d3.scale.linear()
        .domain([ 0, 65000])
        .range([ chartHeight, 0 ]);

    var colorScale = d3.scale.ordinal()
        .domain(d3.keys(config['data'][0]).filter(function(key) {
            return key !== dateColumn;
        }))
        .range([ COLORS['red3'], COLORS['yellow3'], COLORS['blue3'], COLORS['orange3'], COLORS['teal3'] ]);

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
        .attr('class', 'graphic-wrapper');

    chartElement = chartWrapper.append('svg')
        .attr('width', chartWidth + margins['left'] + margins['right'])
        .attr('height', chartHeight + margins['top'] + margins['bottom'])
        .append('g')
        .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create D3 axes.
     */
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient('bottom')
        .tickValues([0, 30000, 60000, 90000, 120000])
        .ticks(ticksX)
        .tickFormat(function(d) {
            if (d == 0) {
                return "$0-$30K"
            } else if (d == 30000) { 
                return "$30-$48K"
            } else if (d == 60000) {
                return "$48K-$75K"
            } else if (d == 90000) {
                return "$75K-$110K"
            } else {
                return "$110K+"
            }
        });

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient('left')
        .tickValues([20000,40000,65000])
        .ticks(ticksY)
        .tickFormat(function(d) {
            return "$" + d/1000 + "K"
        });


    /*
     * Render axes to chart.
     */
    chartElement.append('g')
        .attr('class', 'x axis')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxis);

    chartElement.append('g')
        .attr('class', 'y axis')
        // .attr('transform', makeTranslate(-10, 0))        
        .call(yAxis);


    // var yAxisSelect = $(".x.axis")
    // var yAxisPos = yAxisSelect.position()

    chartElement.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', xScale(60000))
        .attr('y', yScale(0))
        .attr('dy', 40)
        .attr('text-anchor', 'middle' )
        .text("Household Income")

    chartElement.append('text')
        .attr('class', 'y-axis-label')
        .attr('x', xScale(0))
        .attr('y', yScale(65000))
        .attr('dy', '-6px' )
        .attr('text-anchor', 'start' )
        .text("Annual Net Price")


    /*
     * Render grid to chart.
     */
    var xAxisGrid = function() {
        return xAxis;
    }

    var yAxisGrid = function() {
        return yAxis;
    }

    chartElement.append('g')
        .attr('class', 'x grid')
        .attr('transform', makeTranslate(0, chartHeight))
        .call(xAxisGrid()
            .tickSize(-chartHeight, 0, 0)
            .tickFormat('')
        );

    chartElement.append('g')
        .attr('class', 'y grid')
        .call(yAxisGrid()
            .tickSize(-chartWidth, 0, 0)
            .tickFormat('')
        );

    /*
     * Render lines to chart.
     */
    line = d3.svg.line()
        .interpolate('linear')
        .defined(function(d) { return d[valueColumn] != ""; })
        .x(function(d) {
            return xScale(d[dateColumn]);
        })
        .y(function(d) {
            return yScale(d[valueColumn]);
        });

    area = d3.svg.area()
        .defined(function(d) { return d[valueColumn] != ""; })    
        .x(function(d) { return xScale(d[dateColumn]); })
        .y0(chartHeight)
        .y1(function(d) { return yScale(d[valueColumn]); });        

    var stickerPriceInitData = stickerPrice.filter(function(d) {
          return d['key'] ==  "Amherst College" || 
                 d['key'] ==  "Princeton University";
                 // d['key'] ==  "University Of Chicago" ||
        })

    //initial filter.
    if (!isMobile) {
    var selectInitData = d3.entries(formattedData).filter(function(d) {
          return d['key'] ==  "Amherst College" || 
                 d['key'] ==  "Ohio State University-Main Campus";
                 // d['key'] ==  "Minnesota State University-Mankato" ||          
                 // d['key'] ==  "Princeton University";
        })

    } else {
    var selectInitData = d3.entries(formattedData).filter(function(d) {
          return d['key'] ==  "Amherst College" || 
                 d['key'] ==  "Ohio State University-Main Campus";
                 // d['key'] ==  "Minnesota State University-Mankato" ||          
                 // d['key'] ==  "Princeton University";
        }) 

    }

    //remove keys
    selectInitDataValues = selectInitData.map(function(d) {
        return d['value'];
    })
    //flatten
    scatterPlotData = _.chain(selectInitDataValues).values().flatten()

    chartElement.append('g')
        .attr('class', 'lines')
        .selectAll('path')
        .data(selectInitData)
        .enter()
        .append('path')
            .attr('class', function(d, i) {
                return 'line default-line line-' + i + ' ' + classify(d['key']);
            })
            .attr('d', function(d) {
                return line(d['value']);
            });

    chartElement.append('g')
        .attr('class', 'areas')
        .selectAll('path')
        .data(selectInitData)
        .enter()
        .append('path');

    chartElement.append('g')
        .attr('class', 'sticker-price-group')
        .selectAll('line')
        .data(stickerPriceInitData)
        .enter()
        .append('line');

    // scatterplot
    // updateStickerPriceLabel(stickerPriceInitData)
    updateScatter(scatterPlotData)
    updateScatterLabels(scatterPlotData)

    d3.selectAll('.label-90000').style('opacity', 0) 
    d3.selectAll('.label-60000').style('opacity', 0) 
    d3.selectAll('.label-30000').style('opacity', 0)     

    d3.selectAll('.label-0.minnesota-state-university-mankato').style('opacity', 0)
    d3.selectAll('.point.ohio-state-university-main-campus').classed('public-school', true )
    d3.selectAll('.default-line.ohio-state-university-main-campus').classed('public-school', true )
    d3.selectAll('.point.minnesota-state-university-mankato').classed('public-school', true )
    d3.selectAll('.point.minnesota-state-university-mankato').moveToFront();
    d3.selectAll('.default-line.minnesota-state-university-mankato').classed('public-school', true )    
    d3.selectAll('.point.princeton-university').classed('private-school', true )
    d3.selectAll('.default-line.princeton-university').classed('private-school', true )
    d3.selectAll('.point.amherst-college').classed('private-school', true )
    d3.selectAll('.default-line.amherst-college').classed('private-school', true )

    updateCollegeNames(selectInitData)

    if (isMobile) {
        d3.select('.college-name.amherst-college')
            .attr('x', xScale(110000))
            .attr('y', yScale(40000) - 10)
            .attr('text-anchor', 'end' )        
        d3.select('.college-name.ohio-state-university-main-campus')
            .attr('x', 0)
            .attr('y', yScale(18000))
            .text("Ohio State University")
            .attr('text-anchor', 'start' )                    
    }


    selectArea = d3.select('.areas')
                .append('path')
                .attr('class', 'area selected-area');    

    selectLine = d3.select('.lines')
                .append('path')
                .attr('class', 'line selected-line');

    selectLabel = d3.select('.value')
                .append('text')
                .attr('class', 'label selected-label')

    selectSticker = d3.select('.sticker-price-group')
                .append('line')
                .attr('class', 'sticker selected-sticker');     

    selectStickerLabel = d3.select('.sticker-price-group')
                .append('text')
                .attr('class', 'label selected-sticker-label');                

    // var index = COLLEGES_LIST.indexOf('hhincome');
    var index = COLLEGES_LIST.indexOf('clear');

    if (!typeahead_init ) { // only run this once

        if (index > -1) {
            COLLEGES_LIST.splice(index, 1);
        }

        $('#college-dropdown .typeahead').typeahead({
          hint: true,
          highlight: true,
          minLength: 1
        },
        {
          name: 'COLLEGES_LIST',
          limit: 25,
          source: substringMatcher(COLLEGES_LIST)
        });

        $('input.typeahead').on('typeahead:selected', OnTypeAheadSelected)
        
        typeahead_init = true;


    }

}

function OnTypeAheadSelected (event, selection) {
    var selectedData = d3.entries(formattedData).filter(function(d){
        return d['key'] == selection;
    })

    var selectedStickerPriceData = stickerPrice.filter(function(d) {
        return d['key'] ==  selection;
        })

    
    flattenForScatter(selectedData)
    d3.select('.college-name.amherst-college').remove();
    d3.select('.college-name.ohio-state-university-main-campus').remove();

    d3.selectAll('.default-area')
        .transition()
        .duration(300)
        .style('opacity', 0)    
    d3.selectAll('.default-line')
        .transition()
        .duration(300)
        .style('opacity', 0)        
    d3.selectAll('.default-label')
        .transition()
        .duration(300)
        .style('opacity', 0)     
    d3.selectAll('.default-sticker')
        .transition()
        .duration(300)
        .style('opacity', 0)    


    d3.selectAll('.default-label').classed('hidden', true)

    selectLine
        .data(selectedData)
        .transition()
        .duration(275)
        // .ease('cubic')
        .attr('d', function(d) {
            // console.log(d)
            return line(d['value']);
        })        
        .style('opacity', 1);    

    selectArea
        .data(selectedData)
        .transition()
        .duration(275)
        // .ease('cubic')        
        .attr('d', function(d) {
            // console.log(d)
            return area(d['value']);
        })        
        .style('opacity', 1);


    selectSticker
        .data(selectedStickerPriceData)
        .transition()
        .duration(275)
        .attr('x1', xScale(0))
        .attr('x2', xScale(120000))
        .attr('y1', function(d) { return yScale(d['values'][0]['sticker-price']); })            
        .attr('y2', function(d) { return yScale(d['values'][0]['sticker-price']); })            

    updateStickerPriceLabel(selectedStickerPriceData)
    updateScatter(scatterPlotData)
    updateScatterLabels(scatterPlotData)
    
    d3.selectAll('.point-120000').classed('teal2', true)
    d3.selectAll('.point-90000').classed('teal3', true)
    d3.selectAll('.point-60000').classed('teal4', true)
    d3.selectAll('.point-30000').classed('teal5', true)
    d3.selectAll('.point-0').classed('teal6', true)

    if (!isMobile) {
        updateCollegeNames(selectedData)
    }

}

function flattenForScatter(data) {
        //remove keys
        selectInitDataValues = data.map(function(d) {
            return d['value'];
        })
        //flatten
        scatterPlotData = _.chain(selectInitDataValues).values().flatten()
}

function updateScatter(data) {
    d3.selectAll('.point').remove()
    scatter = chartElement.append('g')
        .attr('class', 'point-group' )
        .selectAll('point')
        .data(data['_wrapped'])
        .enter()
        .append('circle')
        .attr('class', function(d,i) {
            return 'point point-' + d['hhincome'] + " " + classify(d['name']);
        })
        .attr('r', 5.5)
        .attr('cx', function(d) {
            return xScale(d['hhincome']);
        })
        .attr('cy', function(d) {
            return yScale(d['amt']);
        })
        .style('fill', '#fff')
        .style('display', function(d) {
            if (d['amt'] == 0) {
                return "none"
            } else {
                return 'block';
            }
        });
}

function updateScatterLabels(data) {
    d3.selectAll('.college-scatter-label').remove()    
    chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(data['_wrapped'])
        .enter().append('text')
            .attr('class', function(d,i) {
                return 'label college-scatter-label label-' + d['hhincome'] + ' ' + classify(d['name']);
            })
            .attr('x', function(d, i) {
                return xScale(d['hhincome']);
            })
            .attr('y', function(d) {
                return yScale(d['amt']) - 10;
            })
            .attr('text-anchor', "middle" )
            .text(function(d) {
                return "$" + Math.round(d['amt']/1000) + 'K';
            })
            .style('display', function(d) {
                if (d['amt'] == 0) {
                    return "none"
                } else {
                    return 'block';
                }
            });


}

function updateStickerPriceLabel(data) {
        d3.selectAll('.sticker-price-label').remove()    
        chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(data)
        .enter().append('text')
            .attr('class', function(d,i) {
                return 'label sticker-price-label label-' + i + ' ' + classify(d['key']);
            })
            .attr('x', '3px')
            .attr('y', function(d) {
                return yScale(d['values'][0]['sticker-price']) - 3;
            })
            .text(function(d) {
                return "(Sticker Price: $" + Math.round(d['values'][0]['sticker-price']/1000) + "k)";
            })
            // .call(wrapText, (margins['right'] - labelGap), 10);

}

function updateCollegeNames(data) {
        d3.selectAll('.college-name').remove()  
        if (!isMobile) {  
        chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(data)
        .enter().append('text')
            .attr('class', function(d,i) {
                return 'label college-name label-' + i + ' ' + classify(d['key']);
            })
            .attr('x', function(d, i) {
                var last = d['value'][d['value'].length - 1];

                return xScale(last[dateColumn]) + 15;
            })
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                return yScale(last[valueColumn]) - 3;
            })
            .text(function(d) {
                return d['key'];
            })
            .call(wrapText, (margins['right'] - labelGap), 10);        

        } else {
        chartElement.append('g')
        .attr('class', 'value')
        .selectAll('text')
        .data(data)
        .enter().append('text')
            .attr('class', function(d,i) {
                return 'label college-name label-' + i + ' ' + classify(d['key']);
            })
            .attr('x', function(d, i) {
                var last = d['value'][d['value'].length - 1];

                return xScale(last[dateColumn]) + 15;
            })
            .attr('y', function(d) {
                var last = d['value'][d['value'].length - 1];

                return yScale(last[valueColumn]) - 3;
            })
            .text(function(d) {
                return d['key'];
            })
        }
}


function transpose(a) {
    return Object.keys(a[0]).map(
        function (c) { 
            return a.map(
                function (r) { 
                    return r[c]; }); }
        );
    }

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

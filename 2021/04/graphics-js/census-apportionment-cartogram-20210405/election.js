var pym = require("./lib/pym");
//var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { COLORS, classify } = require("./lib/helpers");
var $ = require('./lib/qsa');
var skipLabels = ["map", "values", "total"];
var textures = require("./lib/textures");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var barData = null;
var districts = [ "ne-1", "ne-2", "ne-3", "ne-4", "ne-5", "me-1", "me-2", "me-3", "me-4" ];
var northeastStates = [ "VT", "NH", "MA", "CT", "RI", "NJ", "DE", "MD", "DC" ];
var scenarioChoice = 'old';
var demWinner = '#237bbd';
var gopWinner = '#d61f21';

// ------------ //

var pymChild = null;
pym.then(function(child) {
  pymChild = child;
  child.sendHeight();

  var legendBounds = [0,0]

  var legendDataPreview = window.DATA.filter(function(item,i){
    return item.new_EV_2020 != 0
  });

  legendDataPreview.forEach(function(item,i){
    if (item.new_EV_2020 < 0){
      if (item.new_EV_2020 < legendBounds[0]){
        legendBounds[0] = item.new_EV_2020
      }
    } else {
    if (item.new_EV_2020 > legendBounds[1]){
        legendBounds[1] = item.new_EV_2020
      }
    }
  })

  //console.log(legendBounds)

  var colors = [{'-4' : COLORS.orange3},
                {'-3' : COLORS.orange4},
                {'-2' : COLORS.orange5},
                {'-1' : COLORS.orange6},
                {0 : '#E0E0E0'},
                {1: COLORS.teal6},
                {2: COLORS.teal5},
                {3: COLORS.teal4},
                {4: COLORS.teal3}]

  var colorScale = colors.filter(function(item,i){
    return Object.entries(item)[0][0] <= legendBounds[1] && Object.entries(item)[0][0] >= legendBounds[0]
  })

  if (colorScale.length > 0) {
    var legendContainer = d3.select(".key-wrap").append('ul')
      .attr('class', 'key');

    renderLegend({
      container: '.key',
      data: [{'Lost votes':'#E0E0E0'},{'Same':'#ffffff'},{'Gained votes':gopWinner}]
    })
  }
  
  var mapWrapper = d3.select("#maps");
  //$.one('.controls').addEventListener('change', toggleMap);

  barData = formatData(TOTALS, 'new')
  //barDataOld = formatData(TOTALS, 'old')

  render(colorScale);
  mapWrapper.select(".map.new_election").classed("active", true);
  window.addEventListener("resize", () => render(colorScale));

  pymChild.sendHeight();
});

// Format graphic data for processing by D3.
var formatData = function(input,scenario) {
  var filteredData = input.filter(function(item, i) {
    return item.map == scenario;
  });

  var data = filteredData.map(function(d) {
    var x0 = 0;

    var { label } = d.map;
    var values = [];

    for (var name in d) {
      if (skipLabels.indexOf(name) > -1) {
        continue;
      }

      var x1 = x0 + d[name];
      var votes = d[name];

      values.push({
        name,
        x0,
        x1,
        votes
      });

      x0 = x1;
    }

    return { label, values };

  });

  return data;
};

var initMapLabels = function(colorScale) {
  var overallMapWrapper = d3.select("#maps");

  // delete existing vote labels
  overallMapWrapper.selectAll(".votes")
    .remove();

  // position map labels
  DATA.forEach((item, i) => {

    //console.log(item.usps)
    // color states
    
      //.classed("cat-" + item['gained_votes'] + (item['new_votes']!=0 ? Math.abs(item['new_votes']) : ""), true);

      // if (item.usps == 'GA'){
      //     var s = mapWrapper.selectAll("#georgia rect")
      //       .attr("fill",function(d){
      //         var currentColorChoice = colorScale.filter(function(colorItem,i){
      //           return Object.entries(colorItem)[0][0]==(item['2020_results'] == 'red' ? item['new_EV_2020'] : 0-item['new_EV_2020'])
      //         })
      //         return Object.entries(currentColorChoice[0])[0][1]
      //       })
      //     var stateGroup = mapWrapper.select("#maps svg #georgia");

      //   }
      //   else {
      //     var s = mapWrapper.selectAll("#" + classify(item.usps) + " rect")
      //       .attr("fill",function(d){
      //         var currentColorChoice = colorScale.filter(function(colorItem,i){
      //           return Object.entries(colorItem)[0][0]==(item['2020_results'] == 'red' ? item['new_EV_2020'] : 0-item['new_EV_2020'])
      //         })
      //         return Object.entries(currentColorChoice[0])[0][1]
      //       })
      //     var stateGroup = mapWrapper.select("#maps svg #" + classify(item.usps));
      //   }


    //document.querySelectorAll()
    // mark if they've changed from previous
    // if ((map_scenario == "battleground") && (item[map_scenario] != item.was)) {
    //   s.classed("changed", true);
    // }

    // if it's not ME or NE
    //if (districts.indexOf(item.usps.toLowerCase()) < 0) {
      [ "new_election" ].forEach((map, i) => {

        var texture1 = textures
          .lines()
          .orientation("7/8")
          .size(4)
          .strokeWidth(1)
          .background((item['election_results'] == 'red' ? gopWinner : demWinner))
          .stroke('#ffffff4D');

        var mapWrapper = overallMapWrapper.select(`svg.${map}`)
        //ma//.call(texture1)

        

        mapWrapper.call(texture1);

        // if (map == 'new'){

        //   if (item.usps == 'GA'){
        //   var s = mapWrapper.selectAll("#georgia rect")
        //     .attr("winner",function(d){
        //       return (item['election_results'] == 'red' ? 'gop' : 'dem')
        //     })
        //     .attr("changeStatus",function(d){
        //       return (item['gained_EV_2020'])
        //     })
        //     .attr("fill",function(d){
        //       var currentColorChoice = colorScale.filter(function(colorItem,i){
        //         return Object.entries(colorItem)[0][0]==(item['new_EV_2020'])
        //       })
        //       return Object.entries(currentColorChoice[0])[0][1]
        //     })
        //     // .attr("fill",function(d){
        //     //     if (item['gained_EV_2020'] > 0){
        //     //       //console.log("texture!")
        //     //       // var texture1 = textures
        //     //       //   .lines()
        //     //       //   .orientation("7/8")
        //     //       //   .size(6)
        //     //       //   .strokeWidth(2)
        //     //       //   .stroke((item['election_results'] == 'red' ? gopWinner: demWinner))
        //     //         // .background((item['election_results'] == 'red' ? gopWinner : demWinner))
        //     //         // .stroke('#ffffff4D');
        //     //       // var texture1 = textures.paths()
        //     //       //   .d("caps")
        //     //       //   .lighter()
        //     //       //   .thicker()
        //     //       //   .stroke('white')
        //     //       // mapWrapper.call(texture1);
        //     //       // return texture1.url()
        //     //     //}
        //     //     // else {
        //     //     //   return 'black';
        //     //     }
        //     //   })
          
        //   var stateGroup = mapWrapper.select("#maps svg #georgia");

        //   }
        //   else {
        //     var s = mapWrapper.selectAll("#" + classify(item.usps) + " rect")
        //       .attr("winner",function(d){
        //         return (item['election_results'] == 'red' ? 'gop' : 'dem');
        //       })
        //       .attr("changeStatus",function(d){
        //         return (item['gained_EV_2020']);
        //       })
        //       .attr("fill",function(d){
        //       var currentColorChoice = colorScale.filter(function(colorItem,i){
        //         return Object.entries(colorItem)[0][0]==(item['new_EV_2020'])
        //       })
        //       return Object.entries(currentColorChoice[0])[0][1]
        //     })
        //       // .attr("fill",function(d){
        //       //   //if (item['gained_EV_2020'] > 0){
        //       //     // var texture1 = textures.paths()
        //       //     //   .d("caps")
        //       //     //   .lighter()
        //       //     //   .thicker()
        //       //     //   .stroke((item['election_results'] == 'red' ? gopWinner : demWinner))
        //       //     //   //.background((item['election_results'] == 'red' ? gopWinner: demWinner))
        //       //     // mapWrapper.call(texture1);
        //       //     // return texture1.url()
        //       //     // var texture1 = textures
        //       //     //   .lines()
        //       //     //   .orientation("7/8")
        //       //     //   .size(20)
        //       //     //   .strokeWidth(8)
        //       //     //   .stroke((item['election_results'] == 'red' ? gopWinner: demWinner))

        //       //     // var texture1 = textures.paths()
        //       //     //   .d("caps")
        //       //     //   .lighter()
        //       //     //   .thicker()
        //       //     //   .stroke('white')
        //       //     //   //.stroke((item['election_results'] == 'red' ? gopWinner: demWinner));
        //       //     //   // .orientation("7/8")
        //       //     //   // .size(20)
        //       //     //   // .strokeWidth(8)
        //       //     //   // .stroke((item['election_results'] == 'red' ? gopWinner: demWinner))

        //       //     //   // //.background((item['election_results'] == 'red' ? gopWinner : demWinner))
        //       //     //   // .stroke("#ffffff")
        //       //     //   // .fill('black')
                    

        //       //     // mapWrapper.call(texture1);
        //       //     // return texture1.url()
        //       //   //}
        //       //   // else {
        //       //   //   return 'black';
        //       //   // }
        //       // })

        //     var stateGroup = mapWrapper.select("#" + classify(item.usps));
        //   }

        // }

        //else {
          if (item.usps == 'GA'){
          var s = mapWrapper.selectAll("#georgia rect")
            .attr("winner",function(d){
              return (item['election_results'] == 'red' ? 'gop' : 'dem')
            })
            .attr("changeStatus",function(d){
              return (item['gained_EV_2020'])
            })
          
          var stateGroup = mapWrapper.select("#maps svg #georgia");

          }
          else {
            var x = mapWrapper.select("#" + classify(item.usps))
              .attr("highlightRect",item['gained_EV_2020'] != 'same' ? 'true': 'false')
              .attr("numberOfStates",item['new_EV_2020'])

            var s = mapWrapper.selectAll("#" + classify(item.usps) + " rect")
              .attr("winner",function(d){
                return (item['election_results'] == 'red' ? 'gop' : 'dem');
              })
              .attr("changeStatus",function(d){
                return (item['gained_EV_2020']);
              })
              // .attr("fill",function(d){
              //   if (item['new_EV_2020']<0){
              //   var texture1 = textures
              //       .lines()
              //       .orientation("7/8")
              //       .size(14)
              //       .background('#A9A9A9')
              //       .strokeWidth(3)
              //       .stroke((item['election_results'] == 'blue' ? demWinner : gopWinner))
                    

              //     mapWrapper.call(texture1);
              //     return texture1.url()
              //   }

              //   else {
              //     return (item['election_results'] == 'blue' ? demWinner : gopWinner)
              //   }
              // })

            var stateGroup = mapWrapper.select("#" + classify(item.usps));
          }

        //}

        //else {
          

        

        var stateOutline = stateGroup.selectAll("rect");
        stateGroup.selectAll("rect").attr("class", `one-vote ${classify(item.usps)}`);


        var stateBoundingBox = {
          topLeft: 0,
          topRight: 0,
          bottomLeft: 0,
          bottomRight: 0,
        }

        var minX = 99999999;
        var minY = 99999999;
        var maxX = 0;
        var maxY=0;
        document.querySelectorAll(`rect.one-vote.${classify(item.usps)}`).forEach(function(oneRect){
          if (oneRect.x.baseVal.value > maxX){
            maxX = oneRect.x.baseVal.value
          }
          if (oneRect.x.baseVal.value < minX){
            minX = oneRect.x.baseVal.value
          }
          if (oneRect.y.baseVal.value > maxY){
            maxY = oneRect.y.baseVal.value
          }
          if (oneRect.y.baseVal.value < minY){
            minY = oneRect.y.baseVal.value
          }
        })

        stateBoundingBox = {
          topLeftX: minX,
          topLeftY: minY + 5,
          width: (maxX - minX) + 14,
          height: (maxY - minY) + 14,
        }
        
        var stateLabel = stateGroup.select("text");

        // if (map == 'new_election'){
        //   if (item.usps == 'NE'){
        //   stateLabel.text('NE*')
        // }
        // if (item.usps == 'ME'){
        //   stateLabel.text('ME*')
        // }
        // }
        

          stateLabel.attr("x", function() {
            boxX = stateBoundingBox.topLeftX;
            boxWidth = stateBoundingBox.width;
            offsetX = -9;
            return boxX + (boxWidth / 2) - offsetX + item.elections_offset_x;
          });

          var boxY = null;
          var boxHeight = null;
          var offsetY = -1;
          if (map == 'new_election'){
            if (item['new_EV_2020']!=0){ //&& item['labelOffsetY_needed']==true){
            if (!isMobile.matches){
              offsetY = -7;
            } else {
              offsetY = -10;
            }
              
          }
          }
          
          
          stateLabel.attr("y", function() {
            boxY = stateBoundingBox.topLeftY;
            boxHeight = stateBoundingBox.height;
            return boxY + (boxHeight/2) + offsetY + item.elections_offset_y
          });

          stateLabel.attr("dx", 0);
          stateLabel.attr("dy", 0);
          stateLabel.attr("changeStatus",function(d){
            return (item['gained_EV_2020']);
          }).attr("winner",function(d){
              return (item['election_results'] == 'red' ? 'gop' : 'dem')
            })

          if (item['new_EV_2020']!=0 && map == 'new_election'){
            var voteLabel = stateGroup.append('text')
            .attr('class', 'votes')
            .text(item['new_EV_2020']<0 ? item['new_EV_2020'] : "+" + item['new_EV_2020'])
            .attr('x', parseInt(stateLabel.attr('x')) + (offsetX) + 1)
            .attr('y', parseInt(stateLabel.attr('y')) + (isMobile.matches ? 16 : 12))
            .attr('dx', parseInt(stateLabel.attr('dx')))
            .attr('dy', parseInt(stateLabel.attr('dy')))
            .attr('text-anchor','middle')
            .attr("winner",(item['election_results'] == 'red' ? 'gop' : 'dem'))
            .attr("changeStatus",function(d){
                return (item['gained_EV_2020']);
              })

            voteLabel.attr("id","changedVotes")
            stateLabel.attr("id","changedVotes")

            // if (item['new_EV_2020']<0){
            //   //voteLabel.attr("font-style","italic")
            // }

            // else {
            //   //voteLabel.attr("id",'gained_EV_2020')

            // if (Math.abs(item['new_EV_2020'])>1){
            //   // voteLabel.attr("id","largeChange")
            //   // stateLabel.attr("id","largeChange")
            //   // stateLabel.style("stroke-opacity",0.9)
            // }
            // }
          }

          
      });
    //}
  });

  // move highlighted line to front on initial view
  d3.selectAll(".changed").moveToFront();
  d3.selectAll("text").moveToFront();


  // deal with ME and NE
  // [ "ME", "NE" ].forEach((item, i) => {
  //   [ /*"geo",*/ "cartogram" ].forEach((map, i) => {
  //     var thisStateGroup = mapWrapper.select("." + map + " ." + item.toLowerCase());
  //     var thisLabel = thisStateGroup.select("text");
  //     //var thisBlock = thisStateGroup.select("." + item.toLowerCase() + "-1 rect");
  //     //var thisBlock = thisStateGroup.select("." + item.toLowerCase() + "-1 rect");

  //     // thisLabel
  //     //   .attr("x", parseInt(thisBlock.attr("x")) - 5 + "px")
  //     //   .attr("y", parseInt(thisBlock.attr("y")) + 10 + "px");
  //   });
  // });
}

// var toggledResults = false;
// var toggledProjections = false;

// var toggleMap = function(evt) {
//   var target = evt.srcElement.id;
//   var mapWrapper = d3.select("#maps");
//   var chartWrapper = d3.select("#charts");
//   var legendWrapper = d3.select(".key-wrap");

//   switch(target) {
//     case "mode-old":
//       mapWrapper.select(".map.old")
//         .classed("active", true);
//       mapWrapper.select(".map.new_election")
//         .classed("active", false);

//       chartWrapper.select("#stacked-bar-chart.new_election")
//         .classed("active", false);
//       chartWrapper.select("#stacked-bar-chart.old")
//         .classed("active", true);

//       legendWrapper.classed("active",false)
//       if (!toggledResults) {
//         //ANALYTICS.trackEvent(map_scenario, "toggled-geo-map");
//         toggledResults = true;
//         scenarioChoice = 'old';
//       }
//       break;
//     case "mode-new":
//       mapWrapper.select(".map.old")
//         .classed("active", false);
//       mapWrapper.select(".map.new_election")
//         .classed("active", true);

//       chartWrapper.select("#stacked-bar-chart.old")
//         .classed("active", false);
//       chartWrapper.select("#stacked-bar-chart.new_election")
//         .classed("active", true);
//       legendWrapper.classed("active",true)
//       if (!toggledProjections) {
//         //ANALYTICS.trackEvent(map_scenario, "toggled-cartogram");
//         toggledProjections = true;
//         scenarioChoice = 'new_election';
//       }
//       break;
//   }

//   pymChild.sendHeight();
// }

/*
 * Render function (runs at init and every resize)
 */
var render = function(colorScale) {

  pymChild.sendHeight();
  var mapWrapper = d3.select("#maps")
  
  //pymChild.sendHeight();
  initMapLabels(colorScale);



  // bar chart
  var barContainerNew = "#stacked-bar-chart.new_election";
  //var barContainerOld = "#stacked-bar-chart.old";
  var element = document.querySelector('#charts');
  var width = element.offsetWidth;

  
  // renderStackedBarChart({
  //   container: barContainerOld,
  //   width: width,
  //   data: barDataOld,
  //   category: 'old',
  // });


  renderStackedBarChart({
    container: barContainerNew,
    width: width,
    data: barData,
    category: 'new_election',
  });
};

/*
 * Draw legend
 */
var renderLegend = function(config) {
  var legendElement = d3.select(config['container']);

  config.data.forEach((item, i) => {
    var keyItem = legendElement.append('li')
      .attr("class", "key-item ");

    
    

    if (Object.entries(item)[0][0] == 'Lost votes'){
      keyItem.append('b').attr("class","lost-legend")//.style("background",Object.entries(item)[0][1]);
      keyItem.append('b').attr("class","lost-legend")//.style("background",Object.entries(item)[0][1]);
    }

    else if (Object.entries(item)[0][0] == 'Gained votes'){
      keyItem.append('b').attr("class","gained-legend")//.style("background",Object.entries(item)[0][1]);
      keyItem.append('b').attr("class","gained-legend")//.style("background",Object.entries(item)[0][1]);
    }

    else {
      keyItem.append('b').attr("class","same-legend")
      keyItem.append('b').attr("class","same-legend")//.style("background",Object.entries(item)[0][1]);
    }

    keyItem.append('label')
      .text(Object.entries(item)[0][0]);
    
  });
};


/*
* Render a stacked bar chart.
//  */
var renderStackedBarChart = function(config) {
  /*
   * Setup
   */
  var labelColumn = 'label';

  var barHeight = 10;
  var barGap = 5;
  var valueGap = 6;

  var margins = {
    top: 30,
    right: 0,
    bottom: 0,
    left: 0
  };

  var ticksX = 4;

  if (isMobile.matches) {
    ticksX = 2;
    margins.top = 22;
  }

  // Calculate actual chart dimensions
  var chartWidth = config.width - margins.left - margins.right;
  var chartHeight = barHeight * config.data.length;

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  /*
   * Create D3 scale objects.
   */
  var min = 0;
  var max = 538;

  var xScale = d3.scaleLinear()
    .domain([ min, max ])
    .rangeRound([ 0, chartWidth ]);

  /*
   * Create the root SVG element.
   */
  var chartWrapper = containerElement.append('div')
    .attr('class', 'graphic-wrapper');

  var chartElement = chartWrapper.append('svg')
    .attr('width', chartWidth + margins.left + margins.right)
    .attr('height', chartHeight + margins.top + margins.bottom)
    .append('g')
      .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

  /*
   * Create D3 axes.
   */
  var xAxis = d3
    .axisTop()
    .scale(xScale)
    .tickValues([ 270 ])
    .tickFormat(function(d) {
        return d;
    });

  /*
   * Render grid to chart.
   */
  var xAxisGrid = function() {
    return xAxis;
  };

  /*
   * Render bars to chart.
   */
 var group = chartElement.selectAll('.group')
   .data(config['data'])
   .enter().append('g')
     .attr('class', function(d) {
       return 'group';
     })
     .attr('transform', function(d,i) {
       return 'translate(0,' + (i * (barHeight + barGap)) + ')';
     });

  group.selectAll('rect')
    .data(function(d) {
      return d['values'].slice(0,2)
    })
    .enter()
    .append('rect')
      .attr('x', function(d) {
        if (d['x0'] < d['x1']) {
          return xScale(d['x0']);
        }
        return xScale(d['x1']);
      })
      .attr('width', function(d) {
        return Math.abs(xScale(d['x1']) - xScale(d['x0']));
      })
      .attr('height', barHeight)
      .attr('class', function(d) {
        //if (config.category == 'old'){
          return "cat-" + d.name;
        //}
        
      })
      .attr("fill",function(d){
        if (config.category == 'new_election'){
          var texture1 = textures
                    .lines()
                    .orientation("7/8")
                    .size(20)
                    .strokeWidth(4)
                    .background((d.name == 'dem' ? demWinner : gopWinner))
                    .stroke('#ffffff4D');

                  chartElement.call(texture1);
                  return texture1.url()
        }
        else {
          return (d.name == 'dem' ? demWinner : gopWinner)
        }
        
      });

  // annotations
  var annotations = chartElement.append('g')
    .attr('class', 'annotations');

  annotations.append('line')
    .attr('x1', xScale(270))
    .attr('x2', xScale(270))
    .attr('y1', -3)
    .attr('y2', chartHeight);

  annotations.append('text')
    .text('270 to win')
    .attr('class', 'winner-line')
    .attr('x', xScale(270))
    .attr('y', -8);


  var total,change;

  if (config.category == 'new_election'){
    annotations.append('text')
    .text(function() {
      var nums = config.data[0].values;
      // console.log(nums)
      // var lean = 0;
      // var safe = 0;

      nums.forEach((item, i) => {
        if (item.name == "dem") {
          total = item.votes;
        }
        if (item.name == "change_dem") {
          change = item.votes;
        }
      });
      
      return `Biden: ${total} (${(change > 0 ? '+' + change : change)})`;
    })
    .attr('class', 'candidate dem new_election')
    .attr('x', xScale(0))
    .attr('y', -10);

  annotations.append('text')
    .text(function() {
      var nums = config.data[0].values;

      nums.forEach((item, i) => {
        if (item.name == "gop") {
          total = item.votes;
        }
        if (item.name == "change_gop") {
          change = item.votes;
        }
        // if (item.name == "1") {
        //   safe = item.votes;
        // }
      });
      
      return `Trump: ${total} (${(change > 0 ? '+' + change : change)})`;
    })
    .attr('class', 'candidate gop new_election')
    .attr('x', xScale(538))
    .attr('y', -10);
  }

  else {
    annotations.append('text')
    .text(function() {
      var nums = config.data[0].values;
      // var lean = 0;
      // var safe = 0;

      nums.forEach((item, i) => {
        if (item.name == "dem") {
          total = item.votes;
        }
      });
      //var total = item.votes;
      return 'Biden: ' + total;
    })
    .attr('class', 'candidate dem')
    .attr('x', xScale(0))
    .attr('y', -10);

  annotations.append('text')
    .text(function() {
      var nums = config.data[0].values;

      nums.forEach((item, i) => {
        if (item.name == "gop") {
          total = item.votes;
        }
      });
      //var total = lean + safe;
      return 'Trump: ' + total;
    })
    .attr('class', 'candidate gop')
    .attr('x', xScale(538))
    .attr('y', -10);
  }

  
}

/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this);
  });
};

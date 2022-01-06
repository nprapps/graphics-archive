var pym = require("./lib/pym");
//var ANALYTICS = require("./lib/analytics");
require("./lib/webfonts");
var { isMobile } = require("./lib/breakpoints");
var { COLORS, classify } = require("./lib/helpers");
var $ = require('./lib/qsa');
var skipLabels = ["map", "values", "total"];

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var barData = null;
var districts = [ "ne-1", "ne-2", "ne-3", "ne-4", "ne-5", "me-1", "me-2", "me-3", "me-4" ];
var northeastStates = [ "VT", "NH", "MA", "CT", "RI", "NJ", "DE", "MD", "DC" ];

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
      data: colorScale
    })
  }
  
  var mapWrapper = d3.select("#maps");
  //$.one('.controls').addEventListener('change', toggleMap);
  //mapWrapper.select(".map.cartogram").classed("active", false);
  // $.one('#mode-geo').click();

  //barData = formatData(TOTALS);
  render(colorScale);
  window.addEventListener("resize", () => render(colorScale));

  pymChild.sendHeight();
});

// Format graphic data for processing by D3.
// var formatData = function(input) {
//   var filteredData = input.filter(function(item, i) {
//     return item.map == map_scenario;
//   });

//   var data = filteredData.map(function(d) {
//     var x0 = 0;

//     var { label } = d.map;
//     var values = [];

//     for (var name in d) {
//       if (skipLabels.indexOf(name) > -1 || d[name] == 0) {
//         continue;
//       }

//       var x1 = x0 + d[name];
//       var votes = d[name];

//       values.push({
//         name,
//         x0,
//         x1,
//         votes
//       });

//       x0 = x1;
//     }

//     return { label, values };

//   });

//   return data;
// };

var initMapLabels = function(colorScale) {
  var mapWrapper = d3.select("#maps");

  // delete existing vote labels
  mapWrapper.selectAll(".votes")
    .remove();

  // position map labels
  DATA.forEach((item, i) => {

    //console.log(item.usps)
    // color states
    
      //.classed("cat-" + item['gained_votes'] + (item['new_votes']!=0 ? Math.abs(item['new_votes']) : ""), true);


    //document.querySelectorAll()
    // mark if they've changed from previous
    // if ((map_scenario == "battleground") && (item[map_scenario] != item.was)) {
    //   s.classed("changed", true);
    // }

    // if it's not ME or NE
    //if (districts.indexOf(item.usps.toLowerCase()) < 0) {
      [ /*"geo", */"cartogram" ].forEach((map, i) => {

        if (item.usps == 'GA'){
          var s = mapWrapper.selectAll("#georgia rect")
            .attr("fill",function(d){
              var currentColorChoice = colorScale.filter(function(colorItem,i){
                return Object.entries(colorItem)[0][0]==item['new_EV_2020']
              })
              return Object.entries(currentColorChoice[0])[0][1]
            })
          var stateGroup = mapWrapper.select("#maps svg #georgia");

        }
        else {
          var s = mapWrapper.selectAll("#" + classify(item.usps) + " rect")
            .attr("fill",function(d){
              var currentColorChoice = colorScale.filter(function(colorItem,i){
                return Object.entries(colorItem)[0][0]==item['new_EV_2020']
              })
              return Object.entries(currentColorChoice[0])[0][1]
            })
          var stateGroup = mapWrapper.select("#maps svg #" + classify(item.usps));
        }

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

          stateLabel.attr("x", function() {
            boxX = stateBoundingBox.topLeftX;
            boxWidth = stateBoundingBox.width;
            offsetX = -10;
            return boxX + (boxWidth / 2) - offsetX + item.cartogram_offset_x;
          });

          var boxY = null;
          var boxHeight = null;
          var offsetY = -1;
          if (item['new_EV_2020']!=0 && item['labelOffsetY_needed']==true){
            if (!isMobile.matches){
              offsetY = -7;
            } else {
              offsetY = -10;
            }
              
          }
          
          stateLabel.attr("y", function() {
            boxY = stateBoundingBox.topLeftY;
            boxHeight = stateBoundingBox.height;
            return boxY + (boxHeight/2) + offsetY + item.cartogram_offset_y
          });

          stateLabel.attr("dx", 0);
          stateLabel.attr("dy", 0);

          if (item['new_EV_2020']!=0){
            var voteLabel = stateGroup.append('text')
            .attr('class', 'votes')
            .text(item['total_EV_2020'])
            .attr('x', parseInt(stateLabel.attr('x')) + (offsetX) + 1)
            .attr('y', parseInt(stateLabel.attr('y')) + (isMobile.matches ? 16 : 12))
            .attr('dx', parseInt(stateLabel.attr('dx')))
            .attr('dy', parseInt(stateLabel.attr('dy')))
            .attr('text-anchor','middle')

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
/*
 * Render function (runs at init and every resize)
 */
var render = function(colorScale) {

  pymChild.sendHeight();
  var mapWrapper = d3.select("#maps")
  
  //pymChild.sendHeight();
  initMapLabels(colorScale);

};

  // colorScale.domain().forEach(function(key, i) {
  //     var keyItem = legendElement.append("li").classed("key-item", true);

  //     keyItem.append("b").style("background", colorScale(key));
      
  //     if (i != 0){
  //       keyItem.append("label").text(`$${key}`);
  //     }
  // });

/*
 * Draw legend
 */
var renderLegend = function(config) {
  var legendElement = d3.select(config['container']);

  config.data.forEach((item, i) => {
    var keyItem = legendElement.append('li')
      .attr("class", "key-item ");

    keyItem.append('b').style("background",Object.entries(item)[0][1]);

    if (Object.entries(item)[0][0] == 0){
      keyItem.append('label')
      .text('0');
    }

    else if (Object.entries(item)[0][0] > 0){
      keyItem.append('label')
      .text('+' + Object.entries(item)[0][0]);
    }

    else {
      keyItem.append('label')
      .text(Object.entries(item)[0][0]);
    }

    // else if (item.rating == 'gained1' || item.rating == 'gained2' ){
    //   keyItem.append('label')
    //   .text("+" + item.text);
    // }

    // else {
    //   keyItem.append('label')
    //   .text(item.text);
    // }

    
  });
};


/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
  return this.each(function() {
    this.parentNode.appendChild(this);
  });
};

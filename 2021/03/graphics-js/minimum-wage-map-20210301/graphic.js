var pym = require("./lib/pym");
require("./lib/webfonts");
var textures = require("./lib/textures");

// build our custom D3 object
var d3 = {
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min")
};

var { COLORS, classify,wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");
var $ = require("./lib/qsa");

// Global vars
var pymChild = null;

var grey = 'rgb(213,213,213)'

// Initialize the graphic.
var onWindowLoaded = function() {
  // var mapWrapper = d3.select("#state-grid-map");
  // $.one('.controls').addEventListener('change', toggleMap);
  // mapWrapper.select(".map.tipped").classed("active", false);

  
  var selected = $.one(`input[type=radio]:checked`);
  formatData();
  render(selected.getAttribute('data-wage'));

  $.one('.controls').addEventListener('change', function(){
      selected = $.one(`input[type=radio]:checked`);
      //console.log(selected.getAttribute('data-wage'))
      render(selected.getAttribute('data-wage'));
   });

  
  //render(selected);

  window.addEventListener("resize", function (d){
    selected = $.one(`input[type=radio]:checked`);
    render(selected.getAttribute('data-wage'));
  });

  pym.then(function(child) {
    pymChild = child;
    pymChild.sendHeight();
  });
};

// Format graphic data.
var formatData = function() {
  if (!LABELS.show_territories) {
    var territories = [
      "Puerto Rico",
      "U.S. Virgin Islands",
      "Guam",
      "Northern Mariana Islands",
      "American Samoa"
    ];

    DATA = DATA.filter(d => territories.indexOf(d.state_name) == -1);
  }
};

// var toggledOverall = false;
// var toggledTipped = false;

// var toggleMap = function(evt) {
//   var target = evt.srcElement.id;
//   var mapWrapper = d3.select("#state-grid-map");

//   switch(target) {
//     case "mode-overall":
//       mapWrapper.select(".map.overall")
//         .classed("active", true);
//       mapWrapper.select(".map.tipped")
//         .classed("active", false);
//       if (!toggledOverall) {
//         //ANALYTICS.trackEvent(map_scenario, "toggled-geo-map");
//         toggledOverall = true;
//       }
//       break;
//     case "mode-tipped":
//       mapWrapper.select(".map.overall")
//         .classed("active", false);
//       mapWrapper.select(".map.tipped")
//         .classed("active", true);
//       if (!toggledTipped) {
//         //ANALYTICS.trackEvent(map_scenario, "toggled-tipped");
//         toggledTipped = true;
//       }
//       break;
//   }

//   pymChild.sendHeight();
// }

// Render the graphic(s). Called by pym with the container width.
var render = function(selected) {
  isNumeric = LABELS.is_numeric;

  // Render the map!
  var container = "#state-grid-map";
  var element = document.querySelector(container);
  var width = element.offsetWidth;

  //if (selected == 'overall'){
    renderStateGridMap({
    valueColumn: selected,
    container,
    width,
    data: DATA,
    // isNumeric will style the legend as a numeric scale
    isNumeric
  });
  //}
  

  // Update iframe
  if (pymChild) {
    pymChild.sendHeight();
  }
};

// Render a state grid map.
var renderStateGridMap = function(config) {
  var valueColumn = config.valueColumn;
  //console.log(valueColumn)

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  // Copy map template
  var template = d3.select("#map-template");
  containerElement.html(template.html());

  // Extract categories from data
  var categories = [];
  var maxLabel;

  if (valueColumn == 'overall'){
    categories = LABELS.legend_labels.split("|").map(l => l.trim());
    maxLabel = LABELS.max_label;
  }else {
    categories = LABELS.legend_labels_tipped.split("|").map(l => l.trim());
    maxLabel = LABELS.max_label_tipped;

  }

  categories.forEach(function(d,i) {
        categories[i] = Number(categories[i]);
  });

  //console.log(categories)
  //if (LABELS.legend_labels && LABELS.legend_labels !== "") {
    // If custom legend labels are specified
    
  //} 
  // else {
  //   // Default: Return sorted array of categories
  //   config.data.forEach(function(state) {
  //     if (state[valueColumn] != null) {
  //       categories.push(state[valueColumn]);
  //     }
  //   });

  //   //dedupe
  //   categories = Array.from(new Set(categories)).sort();
  // }

    // var texture1 = textures
    // .lines()
    // .orientation("7/8")
    // .size(13)
    // .strokeWidth(3)
    // .background('white')
    // .stroke('gray');

    var texture1 = textures
        .lines()
        .orientation("7/8")
        .size(20)
        .strokeWidth(4)
        .background('black')
        .stroke('#ffffff4D');
    
    containerElement.select("svg").call(texture1);

  // Create legend
  var legendWrapper = containerElement.select(".key-wrap");
  //var legendHead = legendWrapper.select("#legend_head")
  var minType = document.querySelector(".footnotes").querySelector("span#min_type");
  var stripeNote = document.querySelector(".footnotes").querySelector("span#stripe_note");
  //var note1 = document.querySelector(".footnotes").querySelector("span#note1");
  //var minType = document.querySelector(".footnotes").querySelector("span#min_type");
  //console.log(minType)
  var legendElement = containerElement.select(".key");
  legendWrapper.classed("numeric-scale", true);
  var federalMinimum = '$7.25';

  if (valueColumn == 'overall') {
    //legendHead.text(LABELS.legend_head)
    //console.log(categories)
    minType.innerHTML = "minimum wage";
    stripeNote.style.display = 'none';
    //note1.style.display = 'none'
    var colorScale = d3
      .scaleThreshold()
      .domain(categories)
      .range(['#eeeeee','#c5dfdf', '#86a7a6', '#4a7170', '#0b403f']);/*COLORS.teal6*///,'#c5dfdf', '#95b4b4', '#688c8b', '#3b6564', '#0b403f']);
  } else {// ['#c5dfdf', '#86a7a6', '#4a7170', '#0b403f']
    // Define color scale
    minType.innerHTML = "wage for tipped workers";
    stripeNote.style.display = 'block';
    //note1.style.display = 'block';
    federalMinimum = '$2.13';
    //legendHead.text(LABELS.legend_head_tipped)
    var colorScale = d3
      .scaleThreshold()
      .domain(categories)
      .range(['#eeeeee','#f1c696', '#d5944e', '#a66a28', '#714616']);

  }

  var keyItem = legendElement.append("li").classed("key-item", true).attr("id","minimum");

    keyItem.append("b").style("background", grey);

    keyItem.append("label")
      .attr("id","min")
      .html(`${federalMinimum}<br><span style="color:#A9A9A9">Federal<br>minimum</span>`)
      //.call(wrapText,40,12);

    // keyItem.append("label")
    //   .attr("id","min_text")
    //   .text(`Federal
    //         minimum`)
      //.call(wrapText,40,12);

    keyItem.append("b")
          .style("background","#000000")
          .attr("id","zero-rect")

  colorScale.domain().forEach(function(key, i) {

    
      var keyItem = legendElement.append("li").classed("key-item", true);

      keyItem.append("b").style("background", colorScale(key));
      
      if (i != 0){
        keyItem.append("label").text(`$${key}`);
      }

    // Add the optional upper bound label on numeric scale
    if (i == categories.length - 1) {
      //if (LABELS.max_label && LABELS.max_label !== "") {
        keyItem
          .append("label")
          .attr("class", "end-label")
          .text(maxLabel);


        if (valueColumn =='tipped'){
          var keyItem = legendElement.append("li").classed("key-item", true);

          keyItem
            .append("label")
            .attr("id","subwage")
            .html(`Same as <br>overall<br>minimum<br>wage`);
        }
        

        // var texture1 = textures
        // .lines()
        // .orientation("7/8")
        // .size(20)
        // .strokeWidth(4)
        // .background('white')
        // .stroke('black')
        //.stroke('#ffffff4D');
    
        //keyItem.call(texture1);

      // let rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      // rect2.setAttribute("fill", "#000");
      // rect2.setAttribute('x', 100);
      // rect2.setAttribute('y', 100);
      // rect2.setAttribute('height', '50');
      // rect2.setAttribute('width', '50');

        // legendElement.append(rect2)
          // .attr("width", 10)
          // .attr("height", 10)
          // .append("rect")
          // .style("fill", texture1.url());

        
      //}
    }


  });

  // Select SVG element
  var chartElement = containerElement.select("svg");
  //console.log(chartElement)

  // resize map (needs to be explicitly set for IE11)
  chartElement.attr("width", config.width).attr("height", function() {
    var s = d3.select(this);
    var viewBox = s.attr("viewBox").split(" ");
    return Math.floor(
      (config.width * parseInt(viewBox[3])) / parseInt(viewBox[2])+10
    );
  });

  var stateHighlight = ['California', 'Oregon', 'Washington', 'Minnesota', 'Nevada', 'Montana', 'Alaska', 'Hawaii']


  // Set state colors
  config.data.forEach(function(state) {
    if (state[valueColumn] !== null && state[valueColumn] !== undefined) {
      var stateClass = "state-" + classify(state.state_name);
      var categoryClass = "category-" + classify(state[valueColumn] + "");

      chartElement
        .select("." + stateClass)
        .attr("class", `${ stateClass } ${ categoryClass } state-active`)
        .attr("fill", function(d){
          if (valueColumn == 'overall'){
            if (state.overall_min == 'yes'){
               return grey
            } 
            return colorScale(state[valueColumn])
          }
          else {
            if (state.tipped_min == 'yes'){
              return grey
            }

            else if (state.same == 'yes') {
              // console.log(textures)
              // console.log(texture1.url())
              var texture1 = textures
                .lines()
                .orientation("7/8")
                .size(20)
                .strokeWidth(4)
                .background(colorScale(state[valueColumn]))
                .stroke('#ffffff4D');

              containerElement.select("svg").call(texture1);
              return texture1.url()
            }
            return colorScale(state[valueColumn])
          }
          })
        // .attr("stroke", function (d) {
        //  //console.log(state.state_name)
        //   if (valueColumn == 'tipped'){
        //     if (state.same == 'yes'){
        //       return '#f2acac'
        //     }
        //   }
        // })
    }
  });

  // var circles = d3.selectAll('path')
  // console.log(circles)

  // stateHighlight.forEach(function (state) {
  //   var stateClassHighlight = "state-" + classify(state);
  //   console.log(stateClassHighlight)
  //   console.log(d3.select(`path .${ stateClassHighlight }`))
  //   d3.select(`path .${ stateClassHighlight }`).moveToFront()
  // })
  

  // Draw state labels
  chartElement
    .append("g")
    .selectAll("text")
    .data(config.data)
    .enter()
    .append("text")
    .attr("text-anchor", "middle")
    .text(function(d) {
      var state = STATES.filter(s => s.name == d.state_name).pop();
      var output = isMobile.matches ? state.usps : state.ap;
      if (valueColumn == 'overall'){
        if (d['asterisk_overall']=='yes'){
          return `${output}*`
        }
        return `${output}`
      }

      else {
        if (d['asterisk_tipped']=='yes'){
          return `${output}*`
        }
        return `${output}`
      }

    })
    .attr("class", function(d){
      var state = STATES.filter(s => s.name == d.state_name).pop();
      if (d[valueColumn] !== null && d[valueColumn] !== undefined){
        return `category-${classify(d[valueColumn] + "")} ${classify(state.name)}-${classify(valueColumn)}  label label-active`
      }
      else {
        "label"
      }
    }
    )
    .attr("x", function(d) {
      var className = `.state-${classify(d.state_name)}`;
      var tileBox = $.one(className).getBBox();

      return tileBox.x + tileBox.width * 0.52;
    })
    .attr("y", function(d) {
      var className = ".state-" + classify(d.state_name);
      var tileBox = $.one(className).getBBox();
      var textBox = this.getBBox();
      var textOffset = textBox.height / 2;

      if (isMobile.matches) {
        textOffset -= 1;
      }

      return tileBox.y + tileBox.height * 0.5 + textOffset;
    });

    // chartElement
    // .append("g")
    // .selectAll("text")
    // .data(config.data)
    // .enter()
    // .append("text")
    // .html(`States with no subminimum wage`)
    // .attr("class","label-highlight")
    // .attr("x", function(d) {
    //   var className = `.state-montana`;
    //   var tileBox = $.one(className).getBBox();

    //   return tileBox.x;
    // })
    // .attr("y", function(d) {
    //   var className = `.state-montana`;
    //   var tileBox = $.one(className).getBBox();
    //   var textBox = this.getBBox();
    //   var textOffset = textBox.height / 2;

    //   if (isMobile.matches) {
    //     textOffset -= 1;
    //   }

    //   return tileBox.y - 30 //+ tileBox.height * 0.5 + textOffset;
    // })
    // .call(wrapText,80,10);

    //console.log(legendWrapper)

    if (valueColumn =='tipped'){

    var texture1 = textures
        .lines()
        .orientation("7/8")
        .size(20)
        .strokeWidth(4)
        .background('black')
        .stroke('#ffffff4D');
    
    legendElement.select("svg").call(texture1);

    legendElement
      .append("svg")
      .attr("id","rectSVG")
      .attr("height","10px")
      .attr("width","45px")
      .append("rect")
      .attr("x",1)
      .attr("y",1)
      .attr("height","8px")
      .attr("width","43px")
      .attr("stroke",'#E8E8E8')
      .attr("stroke-width",1)
      .attr("fill",function(d){
        var texture1 = textures
                .lines()
                .orientation("7/8")
                .size(20)
                .strokeWidth(4)
                .background("white")
                .stroke('#DCDCDC');

        legendElement.select("svg").call(texture1);
        return texture1.url()
      })
      
    }

    

};



/*
 * Select an element and move it to the front of the stack
 */
d3.selection.prototype.moveToFront = function() {
        return this.each(function() {
        this.parentNode.appendChild(this);
      });   
};





// Initially load the graphic
// (NB: Use window.load to ensure all images have loaded)
window.onload = onWindowLoaded;

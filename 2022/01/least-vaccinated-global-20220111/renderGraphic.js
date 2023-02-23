var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-scale-chromatic/dist/d3-scale-chromatic.min")
};


var displayAttributes = [{"mode": "binary",
                          "world_map": "less than ten"},
                         {"mode": "rate",
                          "world_map": "% of population fully vaccinated"
                        }];

var topojson = require("topojson-client/dist/topojson-client.min");
var geoData = require("./data/countries_min.json");
var baseLand = require("./data/base.json");

var box = require("./data/boundingbox.json");

var { COLORS, classify, makeTranslate, formatStyle, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");


module.exports = function(config) {

  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var attributes = displayAttributes.filter(x=>x.mode==config.mode)[0];

  if(config.mode=="binary"){
    var colorScale = d3.scaleOrdinal()
      .domain([0,1])
      .range([
        "#97cff0",//blue4.5
        COLORS.yellow3

      ]);

  } else {
    var colorScale = d3.scaleSequential(d3.interpolateYlGnBu)
                          .domain([0,100])
  }

  var maxTooltipWidth = 225;
  var tooltip = containerElement.append("div")
                                    .attr("class", "tooltip")
                                    .style("display", "none");

  function renderLegend(){

    if(config.mode == "binary"){
      //Render the legend
      var legend = containerElement
        .append("ul")
        .attr("class", "key")
        .selectAll("g")
        .data(["Less than 10%","10% or higher"])
        .enter()
          .append("li")
          .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

      legend.append("b")
        .style("background-color", d=> d == "Less than 10%" ? colorScale(1) : colorScale(0));

      legend.append("label").text(d => d);
    } else {
      var legend = containerElement
            .append("div")
            .attr("class", "rate-key");

      var stops = [0,20,40,60,80,100]
      if(isMobile.matches) stops = [0,50,100];

      var stops = legend.selectAll("span")
                .data(stops)
                .enter()
                .append("div")
                  .attr("class", "stop")
                  .style("left", d=>d+"%")
                  .append("span")
                    .text(d=>d+"%");

    }


  }


  function renderMap(){
      var countriesData = topojson.feature(geoData,geoData.objects["countries"]);
      var baseData = topojson.feature(baseLand,baseLand.objects["base"]);

      console.log(baseData);

      //join data from table
      for(var row of config.data){
          var table_id = row["ne_id"];
          //get feature
          var i = countriesData.features.findIndex(c=>c.properties["NE_ID"] == table_id);
          if(i != -1) countriesData.features[i].table_props = row

      }

      // Setup //
       var margins = {
        top: 5,
        right: 5,
        bottom: 0,
        left: 5
      };

      // Calculate actual chart dimensions
      var chartWidth = config.width - margins.left - margins.right;
      var chartHeight = chartWidth*.55; //global map aspect ratio
      // var chartHeight = isMobile.matches ? chartWidth : chartWidth*2/3;


      // map setup //
      var equalEarth = d3.geoEqualEarth()
            .rotate([-15, 0])
            .fitSize([chartWidth,chartHeight],box);

      var path = d3.geoPath().projection(equalEarth);

      //create svg for map
      var mapWrapper = containerElement
          .append("div")
          .attr("class", "map-wrapper");

      var mapElement = mapWrapper
        .append("svg")
        .attr("width", chartWidth + margins.left + margins.right)
        .attr("height", chartHeight + margins.top + margins.bottom)
        .append("g")
        .attr("transform", `translate(${margins.left},${margins.top})`);

      //add base
      var base = mapElement.selectAll(".base")
                                .data(baseData.features)
                                .enter()
                                .append("path")
                                .attr("d", path)
                                .attr("class", "base");

      //add countries
      var countries = mapElement.selectAll(".country")
                                  .data(countriesData.features)
                                  .enter()
                                  .append("path")
                                    .attr("class", "country")
                                    .attr("geoid", d=>`c${d.properties["NE_ID"]}`)
                                    .attr("d", path)
                                    .attr("stroke", d=> config.mode == "binary" ? "#fff" : "#ddd")
                                    .attr("fill", d=> d.table_props ? colorScale(d.table_props[attributes["world_map"]]) : "#ddd");

      //add highlighting
      countries.on("mouseover", function(d){
        if(isMobile.matches) return;
        var el = d3.select(this);
        var geoid = el.attr("geoid");
        var targets = d3.selectAll(`[geoid='${geoid}']`);
        targets.classed("highlight", function(d) {
          if (d.table_props) {
            return true;
          }
        });
        targets.raise();
        addTooltip(d);

      }).on("mousemove", function(){
          if(isMobile.matches) return;
          moveTooltip(d3.mouse(containerElement.node()));
      })
      .on("mouseout", function(){
        if(isMobile.matches) return;
        var el = d3.select(this);
        var geoid = el.attr("geoid");
        var targets = d3.selectAll(`[geoid='${geoid}']`);
        targets.classed("highlight", false);
        //remove tooltip
        tooltip.style("display", "none");
      })

  }

  function addTooltip(d){

      tooltip.style("display", "block");
      tooltip.html("");

      var content = tooltip.append("div").attr("class", "content");

      if(d.table_props){
      content.append("h4").text(d.properties["npr_name"]);
      content.append("p")
        .html(`Current vaccination rate: <b>${Math.round(Number(d.table_props["% of population fully vaccinated"])*10)/10}%</b>`)
    } else {
      content.append("h4").text(d.properties["npr_name"]);
      content.append("p").text("No Data");
    }
  }

  function moveTooltip(mousePosition){

    var top = mousePosition[1]+10;
    var left = mousePosition[0]+10;

    //get bounding box of container
    var bbox = containerElement.node().getBoundingClientRect();

    var tooFarRight = (left + maxTooltipWidth) > bbox.width;
    //if the right side is too far right, shift tooltip left
    if(tooFarRight){
      var right = bbox.width - mousePosition[0]+10;
      tooltip.style("left", "auto");
      tooltip.style("right", right+"px")

    } else {
      tooltip.style("right", "auto");
      tooltip.style("left", left+"px")
    }

    tooltip.style("top", top+"px");

  }


  renderLegend();
  renderMap();


  };

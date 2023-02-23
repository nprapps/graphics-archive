var d3 = {
  ...require("d3-axis/dist/d3-axis.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-scale-chromatic/dist/d3-scale-chromatic.min")
};

var incomeCategories = [{"abbr": "LIC",
                        "name": "Low income"},
                        {"abbr": "LMC",
                        "name": "Lower middle income"},
                        {"abbr": "UMC",
                        "name": "Upper middle income"},
                        {"abbr": "HIC",
                        "name": "High income"}];

var displayAttributes = [{"mode": "track",
                          "world_map": "att_will_h",
                          "bar": "will_hit_forty"},
                         {"mode": "rate",
                          "world_map": "att_% of p",
                          "bar": "% of population fully vaccinated"}];

var topojson = require("topojson-client/dist/topojson-client.min");
var geoData = require("./data/countries_joined.json");
var box = require("./data/boundingbox.json");

var { COLORS, classify, makeTranslate, formatStyle, wrapText } = require("./lib/helpers");
var { isMobile } = require("./lib/breakpoints");


module.exports = function(config) {
  
  // Clear existing graphic (for redraw)
  var containerElement = d3.select(config.container);
  containerElement.html("");

  var attributes = displayAttributes.filter(x=>x.mode==config.mode)[0];

  if(config.mode=="track"){
    var colorScale = d3.scaleOrdinal()
      .domain([0,1])
     .range([
        COLORS.orange4,
        COLORS.blue4
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

    if(config.mode == "track"){
      //Render the legend
      var legend = containerElement
        .append("ul")
        .attr("class", "key")
        .selectAll("g")
        .data(["Less than 40%","40% or higher"])
        .enter()
          .append("li")
          .attr("class", (d, i) => `key-item key-${i} ${classify(d)}`);

      legend.append("b")
        .style("background-color", (d,i)=>colorScale(i));

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


  function renderChart(){
    //don't add for no data squares
    var data = config.data.filter(row=>row["will_hit_forty"]=== true || row["will_hit_forty"] === false);
      console.log(data);
    //Format data for chart///
    //add index based on category
    for(var category of incomeCategories){
        category["countries"] = data.filter(c=>c["Income Group"] == category.abbr);
        // console.log(d3.mean(category.countries.map(x=>x["% of population fully vaccinated"])));
        var avg;

        // category["average"] = category["countries"]
    }
    data.forEach(function(country){
      var refArray = incomeCategories.find(category=>category.abbr==country["Income Group"]).countries;
      country["xIndex"] = refArray.findIndex(refC=>refC["ne_id"] == country["ne_id"]);
    });

    var barHeight = 30;
    var verticalBarGap = 10;
    var labelWidth = 80;

    // Setup //
     var margins = {
      top: 0,
      right: 5,
      bottom: 0,
      left: labelWidth
    };

    //because added max width to container
    var actualWidth = config.width < 730 ? config.width : 730;

    // Calculate actual chart dimensions
    var chartWidth = actualWidth - margins.left - margins.right;
    var chartHeight = (barHeight+verticalBarGap)*4+margins.top+margins.bottom;

    //get max number of countries in group
    var maxLength = d3.max(incomeCategories.map(category=>category["countries"].length));

    //scales
    var xScale = d3.scaleBand()
                    .domain(d3.range(maxLength))
                    .range([0,chartWidth])
                    .paddingInner(0);

    //create svg for chart
    var chartWrapper = containerElement
        .append("div")
        .attr("class", "chart-wrapper");

    var chartElement = chartWrapper
      .append("svg")
      .attr("width", chartWidth + margins.left + margins.right)
      .attr("height", chartHeight + margins.top + margins.bottom)
      .append("g")
      .attr("transform", `translate(${margins.left},${margins.top})`);

    //add bars
    var bars = chartElement.selectAll(".country")
                              .data(data)
                              .enter()
                              .append("rect")
                                  .attr("class", "bar")
                                  .attr("geoid", d=>`c${d["ne_id"]}`)
                                  .attr("income", d=>`${d["Income Group"]}`)
                                  .attr("fill", function(d){
                                      return colorScale(d[attributes.bar])
                                  })
                                  .attr("width", xScale.bandwidth())
                                  .attr("height", barHeight)
                                  .attr("x", d => xScale(d["xIndex"]))
                                  .attr("y", function(d){
                                      // var cat = d["Income Group"];
                                      var yIndex = incomeCategories.findIndex(cat=>cat.abbr == d["Income Group"]);
                                      return yIndex*(barHeight+verticalBarGap);
                                  });

    //add highlighting
    bars.on("mouseover", function(d){
      //highlight specific target
      var el = d3.select(this);
      var geoid = el.attr("geoid");
      var targets = d3.selectAll(`[geoid='${geoid}']`);
      targets.classed("highlight", true);
      targets.raise();

      //dehighlight everything not in current income category
      var cats = incomeCategories.map(cat=>cat.abbr);
      var income = el.attr("income");
      var subdue = d3.selectAll(".bar, .country").filter(function(d,i){
          return d3.select(this).attr("income")!=income
      });
      subdue.classed("dehighlight", true);

      addTooltip(d,"bars");
    }).on("mousemove", function(){
          moveTooltip(d3.mouse(containerElement.node()));
      })
    .on("mouseout", function(){
      var el = d3.select(this);
      var geoid = el.attr("geoid");
      var targets = d3.selectAll(`[geoid='${geoid}']`);
      targets.classed("highlight", false);

      //dehighlight everything not in income category
      var cats = incomeCategories.map(cat=>cat.abbr);
      var income = el.attr("income");
      var subdue = d3.selectAll(".bar, .country").filter(function(d,i){
          return d3.select(this).attr("income")!=income
      });
      subdue.classed("dehighlight", false);
      //remove tooltip
      tooltip.style("display", "none");

    })

    //add labels
    var labels = chartElement.append("g")
                                .selectAll(".label")
                                .data(incomeCategories)
                                .enter()
                                .append("text")
                                  .attr("class", "label")
                                  .attr("dominant-baseline", "middle")
                                  .attr("x", -margins.left)
                                  .attr("y", (d,i)=>i*(barHeight+verticalBarGap)+barHeight/2)
                                  .text(d=>d.name)
                                  .call(wrapText,labelWidth,12);
 



  }

  function renderMap(){
      var countriesData = topojson.feature(geoData,geoData.objects["countries_joined"]);
      
      // Setup //
       var margins = {
        top: 5,
        right: 5,
        bottom: 0,
        left: 5
        // left: labelWidth + labelMargin
      };

      // Calculate actual chart dimensions
      var chartWidth = config.width - margins.left - margins.right;
      var chartHeight = chartWidth*.55;
      // var chartHeight = isMobile.matches ? chartWidth : chartWidth*2/3;


      // map setup //
      var equalEarth = d3.geoEqualEarth()
            .rotate([-15, 0])
            // .fitSize([chartWidth,chartHeight],countriesData);
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

      //add countries
      var countries = mapElement.selectAll(".country")
                                  .data(countriesData.features)
                                  .enter()
                                  .append("path")
                                    .attr("class", "country")
                                    .attr("income", d=>`${d.properties["att_Income"]}`)
                                    .attr("geoid", d=>`c${d.properties["NE_ID"]}`)
                                    .attr("d", path)
                                    .attr("fill", d=> d.properties[attributes["world_map"]] ? colorScale(d.properties[attributes["world_map"]]) : "#ddd");

      //add highlighting
      countries.on("mouseover", function(d){
        var el = d3.select(this);
        var geoid = el.attr("geoid");
        var targets = d3.selectAll(`[geoid='${geoid}']`);
        targets.classed("highlight", true);
        targets.raise();
        addTooltip(d,"map");

      }).on("mousemove", function(){
          moveTooltip(d3.mouse(containerElement.node()));
      })
      .on("mouseout", function(){
        var el = d3.select(this);
        var geoid = el.attr("geoid");
        var targets = d3.selectAll(`[geoid='${geoid}']`);
        targets.classed("highlight", false);
        //remove tooltip
        tooltip.style("display", "none");
      })

  }

  function addTooltip(d,context){
     if(isMobile.matches) return;
     tooltip.style("display", "block");
     tooltip.html("");

     if(context=="bars"){
        var params = {
          "country": d["ne_name"],
          "percent": d["% of population fully vaccinated"],
          "on_track": d["will_hit_forty"]
        }
     } else {
        var params = {
          "country": d.properties["NAME"],
          "percent": d.properties["att_% of p"],
          "on_track": d.properties["att_will_h"]
        }
     }


     var content = tooltip.append("div").attr("class", "content");
     //add country for all
     content.append("h4").text(params.country)

     if(params.percent){
      content.append("p")
                .html(`Current vaccination rate: <b>${Math.round(Number(params.percent)*10)/10}%</b>`)
     } else {
      content.append("p").text("No Data");
     }





  }  

  function moveTooltip(mousePosition){
    if(isMobile.matches) return;

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
  renderChart();
  renderMap();


  };
var xhr = require("./lib/xhr");
var fmtComma = require("./lib/helpers/fmtComma");

var d3 = {
  ...require("d3-array/dist/d3-array.min"),
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-scale/dist/d3-scale.min"),
  ...require("d3-geo/dist/d3-geo.min"),
  ...require("d3-scale-chromatic/dist/d3-scale-chromatic.min")
};

//builds custom albers equal area projection optimized for city bounding box
module.exports = function(city, w, h, containerClass) {
  var colorType = "linear";
  //create scales
  // var heatScale = d3.scaleDiverging(d3.interpolateRdBu);
  // var incomeScale = d3.scaleDiverging(d3.interpolatePRGn);

  if (colorType == "linear") {
    //create scales
    heatScale = d3.scaleSequential(d3.interpolateReds);
    incomeScale = d3.scaleSequential(d3.interpolateGreens);
  }

  var projection;

  function getProjection(city, w, h) {
    //first get box
    var box = d3.geoBounds(city);
    var center;
    center = [(box[0][0] + box[1][0]) / 2, (box[0][1] + box[1][1]) / 2];

    var height = box[1][1] - box[0][1];
    var width = box[1][0] - box[0][0];
    var parallel_one = box[1][1] + (1 / 3) * height;
    var parallel_two = box[1][1] + (2 / 3) * height;

    projection = d3
      .geoConicEqualArea()
      .parallels([parallel_one, parallel_two])
      .rotate([-center[0], 0, 0])
      .center([0, center[1]])
      .fitExtent([[10, 10], [w - 10, h - 10]], city);
  }

  xhr(`./data/${city["city-dash"].toLowerCase()}.geojson`, function(
    err,
    jsonData
  ) {
    // remove tracts that have "zero" for heat reading or -666666666 for income
    jsonData.features = jsonData.features.filter(
      obj =>
      // zero at-sensor radiance translated to heat-degrees kelvin
        obj.properties["_median"] > 147.53 &&
        obj.properties["median_hou"] != -666666666
    );

    getProjection(jsonData, w, h);
    var heatValues = jsonData.features.map(
      tract => tract.properties["_median"]
    );
    var incomeValues = jsonData.features.map(
      tract => +tract.properties["median_hou"]
    );

    //set color domain
    heatScale.domain([
      d3.max(heatValues),
      d3.mean(heatValues),
      d3.min(heatValues)
    ]);
    incomeScale.domain([
      d3.min(incomeValues),
      d3.median(incomeValues),
      d3.max(incomeValues)
    ]);

    if (colorType == "linear") {
      //set color domain
      heatScale.domain([d3.min(heatValues), d3.max(heatValues)]);
      incomeScale.domain([0, d3.max(incomeValues)]);
      window.incomeScale = incomeScale;
    }

    function roundKs(num) {
      var rounded = Math.round(num/1000);
      return rounded + "K"
    }

    // set large labels
    if (containerClass == '.large-map') {
      d3.select(".green-scale-container .left-label").html("Minimum<br>$"+roundKs(d3.min(incomeValues)))
      d3.select(".green-scale-container .middle-label").html("Median<br>$"+roundKs(d3.median(incomeValues)))
      d3.select(".green-scale-container .right-label").html("Maximum<br>$"+roundKs(d3.max(incomeValues)))
    }


    var path = d3.geoPath().projection(projection);


    d3.select(containerClass + ` svg.heat.${city["city-dash"]}`)
      .html("")

    d3.select(containerClass + ` svg.income.${city["city-dash"]}`)
      .html("")




      d3.select(containerClass + ` svg.heat.${city["city-dash"]}`)
        .selectAll(".tracts")
        .data(jsonData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", t => heatScale(t.properties["_median"]))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.1);

      d3.select(containerClass + ` svg.income.${city["city-dash"]}`)
        .selectAll(".tracts")
        .data(jsonData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", function(d) {
          var income = d.properties["median_hou"];
          if (income == -666666666) {
            return "#FFF";
          } else {
            return incomeScale(income);
          }
        })
        .attr("data-city", d => d.properties['NAME_y'])
        .attr("data-income", d => d.properties["median_hou"])
        .attr("data-heat", function(d) {
          return d.properties["_median"];
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.1);
  });
};

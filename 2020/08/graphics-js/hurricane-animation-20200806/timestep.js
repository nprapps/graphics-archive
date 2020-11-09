var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
  ...require("d3-timer/dist/d3-timer.min")
};

// var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");

module.exports = function(config) {
	var dateTime = config.data[config.ii].DTG;
	var date = config.data[config.ii].date;

	d3.select(".time").html(date)

	d3.selectAll(".cones")
	.classed("active",function(d,i){
		if (i === config.ii) {
			return true	
		}	
	})
	// .classed("secondary",function(d,i){
	// 	if (i < config.ii) {
	// 		return true	
	// 	}	
	// })			

	d3.selectAll(`.wind`).classed("active",false)	
	

	d3.selectAll(`.wind`)
	.classed("secondary",function(d,i){		
		if (d3.select(this).attr("data-wind") < dateTime) {
			return true	
		}	
	})		

d3.selectAll(`.t${dateTime}`).classed("active",true)

	// if current item has an id
	if (config.data[config.ii].id != "") {
		// fade all others
		// fade in this one
		d3.selectAll(".annotation").classed("active",false)
		d3.selectAll(`.${config.data[config.ii].id}`).classed("active",true)
	}

	
		

	// zoom into the area of interest
	if (config.ii == 45) {
		d3.select(".graphic").classed("zoom",true)
		d3.selectAll(".newbern").classed("zoom",true)
	}

	if (config.ii == 0) {
		d3.select(".graphic").classed("zoom",false)
		d3.selectAll(".newbern").classed("zoom",false)
	}

	// console.log(config.data)
	// create line for that period
	// d3.select("svg").selectAll("")

	// console.log('here')


}
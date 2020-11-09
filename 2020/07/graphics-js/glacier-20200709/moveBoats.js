var d3 = {
  ...require("d3-selection/dist/d3-selection.min"),
  ...require("d3-shape/dist/d3-shape.min"),
  ...require("d3-interpolate/dist/d3-interpolate.min"),
  ...require("d3-timer/dist/d3-timer.min")
};

var { yearFull, yearAbbrev } = require("./lib/helpers/formatDate");

var getLocalTimeString = function (time) {
  // https://stackoverflow.com/questions/8207655/get-time-of-specific-timezone
	let options = {
	    timeZone: 'America/Juneau',
	    // year: 'numeric',
	    // month: 'numeric',
	    // day: 'numeric',
	    hour: 'numeric',
	    minute: 'numeric',
	    second: 'numeric',
	  },
	  formatter = new Intl.DateTimeFormat([], options);

  return formatter.format(time)
};

module.exports = function(config) {
	console.log('------------------------------------')	
	var iteration = Math.floor(config.elapsed/config.secondLength);
	var timeNow = config.startTime;
	timeNow.setMinutes(iteration)
	console.log(config.elapsed)
	
	var localTime = getLocalTimeString(timeNow);
	console.log(localTime)
	
	

	// change time on the board to current time

	// convert iterations to UTC minute time (minimum)
	// var getTime()

	// change the day to nite and visa versa (later)


	// select all lines
	// match all lines to data

	// for every minute
	//   for every line
	//     if line has point for that    
	//       tween Nboat from N0(place) -> N1(place) in (N1(time)-N0(time))
	//       break;


}
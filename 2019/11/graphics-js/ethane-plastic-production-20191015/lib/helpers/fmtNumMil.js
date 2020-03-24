module.exports = function (d, mobile) {
  var d3 = {
      ...require("d3-axis/dist/d3-axis.min"),
      ...require("d3-scale/dist/d3-scale.min"),
      ...require("d3-selection/dist/d3-selection.min"),
      ...require("d3-format/dist/d3-format.min")
    };

  var fmtNumSI = function(d) {
  	if (d == 0) {
  		return "0";
  	}
  	return d3.format(".2s")(d);
  };

	if (d == 0) {
		return "0";
	}
	var val = fmtNumSI(d);
	if (val.indexOf("M") !== -1) {
		if (!mobile) {
			val = val.replace("M", " million");
		}
	} else {
		val = d3.format("s")(d/100);
		if (!mobile) {
			val = val.replace("K", " million");
		} else {
			val = val.replace("K", "M");
		}
		val = "0." + val;
	}
	return val;
};

// var fmtNumSIThousands = function (d, mobile) {
// 	if (d == 0) {
// 		return "0";
// 	}
// 	var val = fmtNumSI(d);
// 	if (val.indexOf(",000") !== -1) {
// 		if (mobile) {
// 			val = val.replace(",000", "K");
// 		}
// 	}
// 	return val;
// };

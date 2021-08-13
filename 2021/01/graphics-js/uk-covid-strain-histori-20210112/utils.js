var formatDate = function(d) {
	
	var [m, day, y] = d.split("/").map(Number);
    y = y > 50 ? 1900 + y : 2000 + y;
    
    return new Date(y, m - 1, day);
}


module.exports = {
  formatDate
}
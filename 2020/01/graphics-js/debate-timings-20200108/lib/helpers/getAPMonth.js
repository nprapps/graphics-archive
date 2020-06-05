module.exports = function(date) {
  var apMonths = [ "Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec." ];
  var thisMonth = date.getMonth() - 1;
  return apMonths[thisMonth];
};
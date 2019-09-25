module.exports = function(name, search) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
  results = regex.exec(search || location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};
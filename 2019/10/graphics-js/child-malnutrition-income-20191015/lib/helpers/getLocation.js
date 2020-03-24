module.exports = function(href) {
  var l = document.createElement("a");
  l.href = href;
  return l;
};
module.exports = function(props) {
  var s = "";

  for (var key in props) {
    s += `${key}: ${props[key].toString()}; `;
  }

  return s;
};
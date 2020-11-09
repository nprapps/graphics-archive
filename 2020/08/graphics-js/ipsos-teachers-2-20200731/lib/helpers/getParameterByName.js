module.exports = function(name) {
  return new URLSearchParams(window.location.search).get(name);
};
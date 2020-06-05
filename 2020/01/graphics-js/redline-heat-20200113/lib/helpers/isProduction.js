/*
 * Checks if we are in production based on the url hostname
 * When embedded with pym it checks the parentUrl param
 * - If a url is given checks that
 * - If no url is given checks window.location.href
 */

module.exports = function(u) {
  var result = true;
  var u = u || window.location.href;
  var re_embedded = /^.*parentUrl=(.*)$/;
    // Check if we are inside the dailygraphics local rig
    var m = u.match(re_embedded)
    if (m) {
      u = decodeURIComponent(m[1])
    }
    l = getLocation(u);
    if (l.hostname.startsWith("localhost") ||
      l.hostname.startsWith("stage-") ||
      l.hostname.startsWith("www-s1")) {
      result = false
  }
  return result;
};
/*
 * Checks if we are in production based on the url hostname
 * When embedded with pym it checks the parentUrl param
 * - If a url is given checks that
 * - If no url is given checks window.location.href
 */

module.exports = function(u = window.location.href) {
  var url = new URL(u);
  var parentURL = url.searchParams.get("parentUrl");
  if (parentURL) {
    var parent = new URL(parentURL);
    return !parent.hostname.match(/^localhost|^stage-|^www-s1/i);
  }
  return true;
};
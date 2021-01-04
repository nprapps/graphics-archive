var $ = (s, d = document) => Array.from(d.querySelectorAll(s));

$.one = (s, d = document) => d.querySelector(s);

module.exports = $;
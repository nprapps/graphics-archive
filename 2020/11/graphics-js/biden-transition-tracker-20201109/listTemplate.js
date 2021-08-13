var dot = require("./lib/dot");

var template = require("./_list.html");

module.exports = dot.compile(`<% var row = data; %>` + template);
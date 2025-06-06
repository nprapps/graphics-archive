! function(t, r) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = r() : "function" == typeof define && define.amd ? define(r) : t.textures = r()
}(this, function() {
    "use strict";
    var t = function() {
        return (Math.random().toString(36) + "00000000000000000").replace(/[^a-z]+/g, "").slice(0, 5)
    };
    return {
        circles: function() {
            var r = 20,
                n = "",
                e = 2,
                a = !1,
                u = "#343434",
                i = "#343434",
                c = 0,
                l = t(),
                o = function(t) {
                    var o = t.append("defs").append("pattern").attr("id", l).attr("patternUnits", "userSpaceOnUse").attr("width", r).attr("height", r);
                    n && o.append("rect").attr("width", r).attr("height", r).attr("fill", n), o.append("circle").attr("cx", r / 2).attr("cy", r / 2).attr("r", e).attr("fill", u).attr("stroke", i).attr("stroke-width", c), a && [
                        [0, 0],
                        [0, r],
                        [r, 0],
                        [r, r]
                    ].forEach(function(t) {
                        o.append("circle").attr("cx", t[0]).attr("cy", t[1]).attr("r", e).attr("fill", u).attr("stroke", i).attr("stroke-width", c)
                    })
                };
            return o.heavier = function(t) {
                return 0 === arguments.length ? e *= 2 : e *= 2 * t, o
            }, o.lighter = function(t) {
                return 0 === arguments.length ? e /= 2 : e /= 2 * t, o
            }, o.thinner = function(t) {
                return 0 === arguments.length ? r *= 2 : r *= 2 * t, o
            }, o.thicker = function(t) {
                return 0 === arguments.length ? r /= 2 : r /= 2 * t, o
            }, o.background = function(t) {
                return n = t, o
            }, o.size = function(t) {
                return r = t, o
            }, o.complement = function(t) {
                return a = 0 === arguments.length || t, o
            }, o.radius = function(t) {
                return e = t, o
            }, o.fill = function(t) {
                return u = t, o
            }, o.stroke = function(t) {
                return i = t, o
            }, o.strokeWidth = function(t) {
                return c = t, o
            }, o.id = function(t) {
                return 0 === arguments.length ? l : (l = t, o)
            }, o.url = function() {
                return "url(#" + l + ")"
            }, o
        },
        lines: function() {
            var r = 20,
                n = "#343434",
                e = 2,
                a = "",
                u = t(),
                i = ["diagonal"],
                c = "auto",
                l = function(t) {
                    var n = r;
                    switch (t) {
                        case "0/8":
                        case "vertical":
                            return "M " + n / 2 + ", 0 l 0, " + n;
                        case "1/8":
                            return "M " + n / 4 + ",0 l " + n / 2 + "," + n + " M " + -n / 4 + ",0 l " + n / 2 + "," + n + " M " + 3 * n / 4 + ",0 l " + n / 2 + "," + n;
                        case "2/8":
                        case "diagonal":
                            return "M 0," + n + " l " + n + "," + -n + " M " + -n / 4 + "," + n / 4 + " l " + n / 2 + "," + -n / 2 + " M " + .75 * n + "," + 5 / 4 * n + " l " + n / 2 + "," + -n / 2;
                        case "3/8":
                            return "M 0," + .75 * n + " l " + n + "," + -n / 2 + " M 0," + n / 4 + " l " + n + "," + -n / 2 + " M 0," + 5 * n / 4 + " l " + n + "," + -n / 2;
                        case "4/8":
                        case "horizontal":
                            return "M 0," + n / 2 + " l " + n + ",0";
                        case "5/8":
                            return "M 0," + -n / 4 + " l " + n + "," + n / 2 + "M 0," + n / 4 + " l " + n + "," + n / 2 + " M 0," + 3 * n / 4 + " l " + n + "," + n / 2;
                        case "6/8":
                            return "M 0,0 l " + n + "," + n + " M " + -n / 4 + "," + .75 * n + " l " + n / 2 + "," + n / 2 + " M " + 3 * n / 4 + "," + -n / 4 + " l " + n / 2 + "," + n / 2;
                        case "7/8":
                            return "M " + -n / 4 + ",0 l " + n / 2 + "," + n + " M " + n / 4 + ",0 l " + n / 2 + "," + n + " M " + 3 * n / 4 + ",0 l " + n / 2 + "," + n;
                        default:
                            return "M " + n / 2 + ", 0 l 0, " + n
                    }
                }, o = function(t) {
                    var o = t.append("defs").append("pattern").attr("id", u).attr("patternUnits", "userSpaceOnUse").attr("width", r).attr("height", r);
                    a && o.append("rect").attr("width", r).attr("height", r).attr("fill", a), i.forEach(function(t) {
                        o.append("path").attr("d", l(t)).attr("stroke-width", e).attr("shape-rendering", c).attr("stroke", n).attr("stroke-linecap", "square")
                    })
                };
            return o.heavier = function(t) {
                return 0 === arguments.length ? e *= 2 : e *= 2 * t, o
            }, o.lighter = function(t) {
                return 0 === arguments.length ? e /= 2 : e /= 2 * t, o
            }, o.thinner = function(t) {
                return 0 === arguments.length ? r *= 2 : r *= 2 * t, o
            }, o.thicker = function(t) {
                return 0 === arguments.length ? r /= 2 : r /= 2 * t, o
            }, o.background = function(t) {
                return a = t, o
            }, o.size = function(t) {
                return r = t, o
            }, o.orientation = function() {
                for (var t = arguments.length, r = Array(t), n = 0; n < t; n++) r[n] = arguments[n];
                return 0 === arguments.length ? o : (i = r, o)
            }, o.shapeRendering = function(t) {
                return c = t, o
            }, o.stroke = function(t) {
                return n = t, o
            }, o.strokeWidth = function(t) {
                return e = t, o
            }, o.id = function(t) {
                return 0 === arguments.length ? u : (u = t, o)
            }, o.url = function() {
                return "url(#" + u + ")"
            }, o
        },
        paths: function() {
            var r = 1,
                n = 1,
                e = 20,
                a = "#343434",
                u = 2,
                i = "",
                c = function(t) {
                    return "M " + t / 4 + "," + 3 * t / 4 + "l" + t / 4 + "," + -t / 2 + "l" + t / 4 + "," + t / 2
                }, l = t(),
                o = "transparent",
                s = "auto",
                f = function(t) {
                    var a = e;
                    switch (t) {
                        case "squares":
                            return "M " + a / 4 + " " + a / 4 + " l " + a / 2 + " 0 l 0 " + a / 2 + " l " + -a / 2 + " 0 Z";
                        case "nylon":
                            return "M 0 " + a / 4 + " l " + a / 4 + " 0 l 0 " + -a / 4 + " M " + 3 * a / 4 + " " + a + " l 0 " + -a / 4 + " l " + a / 4 + " 0 M " + a / 4 + " " + a / 2 + " l 0 " + a / 4 + " l " + a / 4 + " 0 M " + a / 2 + " " + a / 4 + " l " + a / 4 + " 0 l 0 " + a / 4;
                        case "waves":
                            return "M 0 " + a / 2 + " c " + a / 8 + " " + -a / 4 + " , " + 3 * a / 8 + " " + -a / 4 + " , " + a / 2 + " 0 c " + a / 8 + " " + a / 4 + " , " + 3 * a / 8 + " " + a / 4 + " , " + a / 2 + " 0 M " + -a / 2 + " " + a / 2 + " c " + a / 8 + " " + a / 4 + " , " + 3 * a / 8 + " " + a / 4 + " , " + a / 2 + " 0 M " + a + " " + a / 2 + " c " + a / 8 + " " + -a / 4 + " , " + 3 * a / 8 + " " + -a / 4 + " , " + a / 2 + " 0";
                        case "woven":
                            return "M " + a / 4 + "," + a / 4 + "l" + a / 2 + "," + a / 2 + "M" + 3 * a / 4 + "," + a / 4 + "l" + a / 2 + "," + -a / 2 + " M" + a / 4 + "," + 3 * a / 4 + "l" + -a / 2 + "," + a / 2 + "M" + 3 * a / 4 + "," + 5 * a / 4 + "l" + a / 2 + "," + -a / 2 + " M" + -a / 4 + "," + a / 4 + "l" + a / 2 + "," + -a / 2;
                        case "crosses":
                            return "M " + a / 4 + "," + a / 4 + "l" + a / 2 + "," + a / 2 + "M" + a / 4 + "," + 3 * a / 4 + "l" + a / 2 + "," + -a / 2;
                        case "caps":
                            return "M " + a / 4 + "," + 3 * a / 4 + "l" + a / 4 + "," + -a / 2 + "l" + a / 4 + "," + a / 2;
                        case "hexagons":
                            return r = 3, n = Math.sqrt(3), "M " + a + ",0 l " + a + ",0 l " + a / 2 + "," + a * Math.sqrt(3) / 2 + " l " + -a / 2 + "," + a * Math.sqrt(3) / 2 + " l " + -a + ",0 l " + -a / 2 + "," + -a * Math.sqrt(3) / 2 + " Z M 0," + a * Math.sqrt(3) / 2 + " l " + a / 2 + ",0 M " + 3 * a + "," + a * Math.sqrt(3) / 2 + " l " + -a / 2 + ",0";
                        default:
                            return t(a)
                    }
                }, h = function(t) {
                    var h = f(c),
                        d = t.append("defs").append("pattern").attr("id", l).attr("patternUnits", "userSpaceOnUse").attr("width", e * r).attr("height", e * n);
                    i && d.append("rect").attr("width", e * r).attr("height", e * n).attr("fill", i), d.append("path").attr("d", h).attr("fill", o).attr("stroke", a).attr("stroke-width", u).attr("stroke-linecap", "square").attr("shape-rendering", s)
                };
            return h.heavier = function(t) {
                return 0 === arguments.length ? u *= 2 : u *= 2 * t, h
            }, h.lighter = function(t) {
                return 0 === arguments.length ? u /= 2 : u /= 2 * t, h
            }, h.thinner = function(t) {
                return 0 === arguments.length ? e *= 2 : e *= 2 * t, h
            }, h.thicker = function(t) {
                return 0 === arguments.length ? e /= 2 : e /= 2 * t, h
            }, h.background = function(t) {
                return i = t, h
            }, h.shapeRendering = function(t) {
                return s = t, h
            }, h.size = function(t) {
                return e = t, h
            }, h.d = function(t) {
                return c = t, h
            }, h.fill = function(t) {
                return o = t, h
            }, h.stroke = function(t) {
                return a = t, h
            }, h.strokeWidth = function(t) {
                return u = t, h
            }, h.id = function(t) {
                return 0 === arguments.length ? l : (l = t, h)
            }, h.url = function() {
                return "url(#" + l + ")"
            }, h
        }
    }
});
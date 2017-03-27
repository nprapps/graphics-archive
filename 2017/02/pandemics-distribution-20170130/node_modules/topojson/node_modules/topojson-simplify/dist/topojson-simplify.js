// https://github.com/topojson/topojson-simplify Version 2.0.0. Copyright 2016 Mike Bostock.
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('topojson-client')) :
  typeof define === 'function' && define.amd ? define(['exports', 'topojson-client'], factory) :
  (factory((global.topojson = global.topojson || {}),global.topojson));
}(this, (function (exports,topojsonClient) { 'use strict';

var prune = function(topology) {
  var oldArcs = topology.arcs,
      newArcs = topology.arcs = [],
      newArcIndex = -1,
      newIndexByOldIndex = new Array(oldArcs.length),
      name;

  function pruneGeometry(o) {
    switch (o.type) {
      case "GeometryCollection": o.geometries.forEach(pruneGeometry); break;
      case "LineString": pruneArcs(o.arcs); break;
      case "MultiLineString": o.arcs.forEach(pruneArcs); break;
      case "Polygon": o.arcs.forEach(pruneArcs); break;
      case "MultiPolygon": o.arcs.forEach(pruneMultiArcs); break;
    }
  }

  function pruneArcs(arcs) {
    for (var i = 0, n = arcs.length; i < n; ++i) {
      var oldIndex = arcs[i],
          oldReverse = oldIndex < 0 && (oldIndex = ~oldIndex, true),
          newIndex;

      // If this is the first instance of this arc,
      // record it under its new index.
      if ((newIndex = newIndexByOldIndex[oldIndex]) == null) {
        newIndexByOldIndex[oldIndex] = newIndex = ++newArcIndex;
        newArcs[newIndex] = oldArcs[oldIndex];
      }

      arcs[i] = oldReverse ? ~newIndex : newIndex;
    }
  }

  function pruneMultiArcs(arcs) {
    arcs.forEach(pruneArcs);
  }

  for (name in topology.objects) {
    pruneGeometry(topology.objects[name]);
  }

  return topology;
};

var filter = function(topology, filter) {
  var name;

  if (filter == null) filter = filterTrue;

  function filterGeometry(o) {
    switch (o.type) {
      case "Polygon": {
        o.arcs = filterRings(o.arcs);
        if (!o.arcs) o.type = null, delete o.arcs;
        break;
      }
      case "MultiPolygon": {
        o.arcs = o.arcs.map(filterRings).filter(filterIdentity);
        if (!o.arcs.length) o.type = null, delete o.arcs;
        break;
      }
      case "GeometryCollection": {
        o.geometries.forEach(filterGeometry);
        o.geometries = o.geometries.filter(filterNotNull);
        if (!o.geometries.length) o.type = null, delete o.geometries;
        break;
      }
    }
  }

  function filterRings(arcs) {
    return arcs.length && filterExteriorRing(arcs[0]) // if the exterior is small, ignore any holes
        ? [arcs.shift()].concat(arcs.filter(filterInteriorRing))
        : null;
  }

  function filterExteriorRing(ring) {
    return filter(ring, false);
  }

  function filterInteriorRing(ring) {
    return filter(ring, true);
  }

  for (name in topology.objects) {
    filterGeometry(topology.objects[name]);
  }

  return prune(topology);
};

function filterTrue() {
  return true;
}

function filterIdentity(x) {
  return x;
}

function filterNotNull(geometry) {
  return geometry.type != null;
}

var filterAttached = function(topology) {
  var uniqueRingByArc = {}, // arc index -> index of unique associated ring, or -1 if used by multiple rings
      ringIndex = 0,
      name;

  function testGeometry(o) {
    switch (o.type) {
      case "GeometryCollection": o.geometries.forEach(testGeometry); break;
      case "Polygon": testArcs(o.arcs); break;
      case "MultiPolygon": o.arcs.forEach(testArcs); break;
    }
  }

  function testArcs(arcs) {
    for (var i = 0, n = arcs.length; i < n; ++i, ++ringIndex) {
      for (var ring = arcs[i], j = 0, m = ring.length; j < m; ++j) {
        var arc = ring[j];
        if (arc < 0) arc = ~arc;
        var uniqueRing = uniqueRingByArc[arc];
        if (uniqueRing >= 0 && uniqueRing !== ringIndex) uniqueRingByArc[arc] = -1;
        else uniqueRingByArc[arc] = ringIndex;
      }
    }
  }

  for (name in topology.objects) {
    testGeometry(topology.objects[name]);
  }

  return function(ring) {
    for (var j = 0, m = ring.length, arc; j < m; ++j) {
      if (arc = ring[j], uniqueRingByArc[arc < 0 ? ~arc : arc] < 0) {
        return true;
      }
    }
    return false;
  };
};

function planarTriangleArea(triangle) {
  var a = triangle[0], b = triangle[1], c = triangle[2];
  return Math.abs((a[0] - c[0]) * (b[1] - a[1]) - (a[0] - b[0]) * (c[1] - a[1]));
}

function planarRingArea(ring) {
  var i = -1, n = ring.length, a, b = ring[n - 1], area = 0;
  while (++i < n) a = b, b = ring[i], area += a[0] * b[1] - a[1] * b[0];
  return Math.abs(area) / 2;
}

var filterWeight = function(topology, minWeight, weight) {
  minWeight = minWeight == null ? Number.MIN_VALUE : +minWeight;

  if (weight == null) weight = planarRingArea;

  return function(ring, interior) {
    return weight(topojsonClient.feature(topology, {type: "Polygon", arcs: [ring]}).geometry.coordinates[0], interior) >= minWeight;
  };
};

function compare(a, b) {
  return a[1][2] - b[1][2];
}

var newHeap = function() {
  var heap = {},
      array = [],
      size = 0;

  heap.push = function(object) {
    up(array[object._ = size] = object, size++);
    return size;
  };

  heap.pop = function() {
    if (size <= 0) return;
    var removed = array[0], object;
    if (--size > 0) object = array[size], down(array[object._ = 0] = object, 0);
    return removed;
  };

  heap.remove = function(removed) {
    var i = removed._, object;
    if (array[i] !== removed) return; // invalid request
    if (i !== --size) object = array[size], (compare(object, removed) < 0 ? up : down)(array[object._ = i] = object, i);
    return i;
  };

  function up(object, i) {
    while (i > 0) {
      var j = ((i + 1) >> 1) - 1,
          parent = array[j];
      if (compare(object, parent) >= 0) break;
      array[parent._ = i] = parent;
      array[object._ = i = j] = object;
    }
  }

  function down(object, i) {
    while (true) {
      var r = (i + 1) << 1,
          l = r - 1,
          j = i,
          child = array[j];
      if (l < size && compare(array[l], child) < 0) child = array[j = l];
      if (r < size && compare(array[r], child) < 0) child = array[j = r];
      if (j === i) break;
      array[child._ = i] = child;
      array[object._ = i = j] = object;
    }
  }

  return heap;
};

var presimplify = function(topology, weight) {
  var absolute = topojsonClient.transform(topology),
      relative = topojsonClient.untransform(topology),
      heap = newHeap();

  if (weight == null) weight = planarTriangleArea;

  topology.arcs.forEach(function(arc) {
    var triangles = [],
        maxWeight = 0,
        triangle,
        i,
        n;

    arc.forEach(absolute);

    for (i = 1, n = arc.length - 1; i < n; ++i) {
      triangle = arc.slice(i - 1, i + 2);
      triangle[1][2] = weight(triangle);
      triangles.push(triangle);
      heap.push(triangle);
    }

    // Always keep the arc endpoints!
    arc[0][2] = arc[n][2] = Infinity;

    for (i = 0, n = triangles.length; i < n; ++i) {
      triangle = triangles[i];
      triangle.previous = triangles[i - 1];
      triangle.next = triangles[i + 1];
    }

    while (triangle = heap.pop()) {
      var previous = triangle.previous,
          next = triangle.next;

      // If the weight of the current point is less than that of the previous
      // point to be eliminated, use the latter’s weight instead. This ensures
      // that the current point cannot be eliminated without eliminating
      // previously- eliminated points.
      if (triangle[1][2] < maxWeight) triangle[1][2] = maxWeight;
      else maxWeight = triangle[1][2];

      if (previous) {
        previous.next = next;
        previous[2] = triangle[2];
        update(previous);
      }

      if (next) {
        next.previous = previous;
        next[0] = triangle[0];
        update(next);
      }
    }

    arc.forEach(relative);
  });

  function update(triangle) {
    heap.remove(triangle);
    triangle[1][2] = weight(triangle);
    heap.push(triangle);
  }

  return topology;
};

var quantile = function(topology, p) {
  var array = [];

  topology.arcs.forEach(function(arc) {
    arc.forEach(function(point) {
      if (isFinite(point[2])) { // Ignore endpoints, whose weight is Infinity.
        array.push(point[2]);
      }
    });
  });

  return array.length && quantile$1(array.sort(descending), p);
};

function quantile$1(array, p) {
  if (!(n = array.length)) return;
  if ((p = +p) <= 0 || n < 2) return array[0];
  if (p >= 1) return array[n - 1];
  var n,
      h = (n - 1) * p,
      i = Math.floor(h),
      a = array[i],
      b = array[i + 1];
  return a + (b - a) * (h - i);
}

function descending(a, b) {
  return b - a;
}

var simplify = function(topology, minWeight) {
  minWeight = minWeight == null ? Number.MIN_VALUE : +minWeight;

  // Remove points whose weight is less than the minimum weight.
  topology.arcs.forEach(topology.transform ? function(arc) {
    var dx = 0,
        dy = 0, // accumulate removed points
        i = -1,
        j = -1,
        n = arc.length,
        source,
        target;

    while (++i < n) {
      source = arc[i];
      if (source[2] >= minWeight) {
        target = arc[++j];
        target[0] = source[0] + dx;
        target[1] = source[1] + dy;
        dx = dy = 0;
      } else {
        dx += source[0];
        dy += source[1];
      }
    }

    arc.length = ++j;
  } : function(arc) {
    var i = -1,
        j = -1,
        n = arc.length,
        point;

    while (++i < n) {
      point = arc[i];
      if (point[2] >= minWeight) {
        arc[++j] = point;
      }
    }

    arc.length = ++j;
  });

  // Remove the computed weight for each point, and remove coincident points.
  // This is done as a separate pass because some coordinates may be shared
  // between arcs (such as the last point and first point of a cut line).
  // If the entire arc is empty, retain at least two points (per spec).
  topology.arcs.forEach(topology.transform ? function(arc) {
    var i = 0,
        j = 0,
        n = arc.length,
        p = arc[0];
    p.length = 2;
    while (++i < n) {
      p = arc[i];
      p.length = 2;
      if (p[0] || p[1]) arc[++j] = p;
    }
    arc.length = (j || 1) + 1;
  } : function(arc) {
    var i = 0,
        j = 0,
        n = arc.length,
        p = arc[0],
        x0 = p[0],
        y0 = p[1],
        x1,
        y1;
    p.length = 2;
    while (++i < n) {
      p = arc[i], x1 = p[0], y1 = p[1];
      p.length = 2;
      if (x0 !== x1 || y0 !== y1) arc[++j] = p, x0 = x1, y0 = y1;
    }
    arc.length = (j || 1) + 1;
  });

  return topology;
};

var pi = Math.PI;
var tau = 2 * pi;
var fourPi = 4 * pi;
var radians = pi / 180;
var abs = Math.abs;
var atan = Math.atan;
var atan2 = Math.atan2;
var cos = Math.cos;
var max = Math.max;
var sin = Math.sin;
var sqrt = Math.sqrt;
var tan = Math.tan;

function sphericalRingArea(ring, interior) {
  if (!ring.length) return 0;
  var sum = 0,
      point = ring[0],
      lambda0, lambda1 = point[0] * radians, delta,
      phi1 = (point[1] * radians + tau) / 2,
      cosPhi0, cosPhi1 = cos(phi1),
      sinPhi0, sinPhi1 = sin(phi1),
      i, n, k;

  for (i = 1, n = ring.length; i < n; ++i) {
    point = ring[i];
    lambda0 = lambda1, lambda1 = point[0] * radians, delta = lambda1 - lambda0;
    phi1 = (point[1] * radians + tau) / 2;
    cosPhi0 = cosPhi1, cosPhi1 = cos(phi1);
    sinPhi0 = sinPhi1, sinPhi1 = sin(phi1);

    // Spherical excess E for a spherical triangle with vertices: south pole,
    // previous point, current point. Uses a formula derived from Cagnoli’s
    // theorem. See Todhunter, Spherical Trig. (1871), Sec. 103, Eq. (2).
    k = sinPhi0 * sinPhi1;
    sum += atan2(k * sin(delta), cosPhi0 * cosPhi1 + k * cos(delta));
  }

  sum = 2 * (sum > pi ? sum - tau : sum < -pi ? sum + tau : sum);
  if (interior) sum *= -1;
  return sum < 0 ? sum + fourPi : sum;
}

function sphericalTriangleArea(t) {
  var lambda0 = t[0][0] * radians, phi0 = t[0][1] * radians, cosPhi0 = cos(phi0), sinPhi0 = sin(phi0),
      lambda1 = t[1][0] * radians, phi1 = t[1][1] * radians, cosPhi1 = cos(phi1), sinPhi1 = sin(phi1),
      lambda2 = t[2][0] * radians, phi2 = t[2][1] * radians, cosPhi2 = cos(phi2), sinPhi2 = sin(phi2),
      a = distance(lambda0, cosPhi0, sinPhi0, lambda1, cosPhi1, sinPhi1),
      b = distance(lambda1, cosPhi1, sinPhi1, lambda2, cosPhi2, sinPhi2),
      c = distance(lambda2, cosPhi2, sinPhi2, lambda0, cosPhi0, sinPhi0),
      s = (a + b + c) / 2;
  return 4 * atan(sqrt(max(0, tan(s / 2) * tan((s - a) / 2) * tan((s - b) / 2) * tan((s - c) / 2))));
}

function distance(lambda0, sinPhi0, cosPhi0, lambda1, sinPhi1, cosPhi1) {
  var delta = abs(lambda1 - lambda0),
      cosDelta = cos(delta),
      sinDelta = sin(delta),
      x = cosPhi1 * sinDelta,
      y = cosPhi0 * sinPhi1 - sinPhi0 * cosPhi1 * cosDelta,
      z = sinPhi0 * sinPhi1 + cosPhi0 * cosPhi1 * cosDelta;
  return atan2(sqrt(x * x + y * y), z);
}

exports.filter = filter;
exports.filterAttached = filterAttached;
exports.filterWeight = filterWeight;
exports.planarRingArea = planarRingArea;
exports.planarTriangleArea = planarTriangleArea;
exports.presimplify = presimplify;
exports.quantile = quantile;
exports.simplify = simplify;
exports.sphericalRingArea = sphericalRingArea;
exports.sphericalTriangleArea = sphericalTriangleArea;

Object.defineProperty(exports, '__esModule', { value: true });

})));

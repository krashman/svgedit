/* eslint-env qunit */
/* globals $, svgedit */
/* eslint-disable no-var */
$(function () {
  // log function
  QUnit.log = function (details) {
    if (window.console && window.console.log) {
      window.console.log(details.result + ' :: ' + details.message);
    }
  };

  function mockCreateSVGElement (jsonMap) {
    var elem = document.createElementNS(svgedit.NS.SVG, jsonMap['element']);
    for (var attr in jsonMap['attr']) {
      elem.setAttribute(attr, jsonMap['attr'][attr]);
    }
    return elem;
  }
  var mockAddSvgElementFromJsonCallCount = 0;
  function mockAddSvgElementFromJson (json) {
    var elem = mockCreateSVGElement(json);
    svgroot.appendChild(elem);
    mockAddSvgElementFromJsonCallCount++;
    return elem;
  }
  var mockPathActions = {
    resetOrientation: function (path) {
      if (path == null || path.nodeName !== 'path') { return false; }
      var tlist = svgedit.transformlist.getTransformList(path);
      var m = svgedit.math.transformListToTransform(tlist).matrix;
      tlist.clear();
      path.removeAttribute('transform');
      var segList = path.pathSegList;

      var len = segList.numberOfItems;
      var i; // , lastX, lastY;

      for (i = 0; i < len; ++i) {
        var seg = segList.getItem(i);
        var type = seg.pathSegType;
        if (type === 1) { continue; }
        var pts = [];
        $.each(['', 1, 2], function (j, n) {
          var x = seg['x' + n], y = seg['y' + n];
          if (x !== undefined && y !== undefined) {
            var pt = svgedit.math.transformPoint(x, y, m);
            pts.splice(pts.length, 0, pt.x, pt.y);
          }
        });
        svgedit.path.replacePathSeg(type, i, pts, path);
      }
      // svgedit.utilities.reorientGrads(path, m);
    }
  };

  var EPSILON = 0.001;
  // var svg = document.createElementNS(svgedit.NS.SVG, 'svg');
  var sandbox = document.getElementById('sandbox');
  var svgroot = mockCreateSVGElement({
    'element': 'svg',
    'attr': {'id': 'svgroot'}
  });
  sandbox.appendChild(svgroot);

  module('svgedit.utilities_bbox', {
    setup: function () {
      // We're reusing ID's so we need to do this for transforms.
      svgedit.transformlist.resetListMap();
      svgedit.path.init(null);
      mockAddSvgElementFromJsonCallCount = 0;
    },
    teardown: function () {
    }
  });

  test('Test svgedit.utilities package', function () {
    ok(svgedit.utilities);
    ok(svgedit.utilities.getBBoxWithTransform);
    ok(svgedit.utilities.getStrokedBBox);
    ok(svgedit.utilities.getRotationAngleFromTransformList);
    ok(svgedit.utilities.getRotationAngle);
  });

  test('Test getBBoxWithTransform and no transform', function () {
    var getBBoxWithTransform = svgedit.utilities.getBBoxWithTransform;

    var bbox;
    var elem = mockCreateSVGElement({
      'element': 'path',
      'attr': {'id': 'path', 'd': 'M0,1 L2,3'}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 2, height: 2});
    equal(mockAddSvgElementFromJsonCallCount, 0);
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '0', 'y': '1', 'width': '5', 'height': '10'}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, height: 10});
    equal(mockAddSvgElementFromJsonCallCount, 0);
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'line',
      'attr': {'id': 'line', 'x1': '0', 'y1': '1', 'x2': '5', 'y2': '6'}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, 'height': 5});
    equal(mockAddSvgElementFromJsonCallCount, 0);
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '0', 'y': '1', 'width': '5', 'height': '10'}
    });
    var g = mockCreateSVGElement({
      'element': 'g',
      'attr': {}
    });
    g.appendChild(elem);
    svgroot.appendChild(g);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, height: 10});
    equal(mockAddSvgElementFromJsonCallCount, 0);
    svgroot.removeChild(g);
  });

  test('Test getBBoxWithTransform and a rotation transform', function () {
    var getBBoxWithTransform = svgedit.utilities.getBBoxWithTransform;

    var bbox;
    var elem = mockCreateSVGElement({
      'element': 'path',
      'attr': {'id': 'path', 'd': 'M10,10 L20,20', 'transform': 'rotate(45 10,10)'}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    close(bbox.x, 10, EPSILON);
    close(bbox.y, 10, EPSILON);
    close(bbox.width, 0, EPSILON);
    close(bbox.height, Math.sqrt(100 + 100), EPSILON);
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '10', 'y': '10', 'width': '10', 'height': '20', 'transform': 'rotate(90 15,20)'}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    close(bbox.x, 5, EPSILON);
    close(bbox.y, 15, EPSILON);
    close(bbox.width, 20, EPSILON);
    close(bbox.height, 10, EPSILON);
    equal(mockAddSvgElementFromJsonCallCount, 1);
    svgroot.removeChild(elem);

    var rect = {x: 10, y: 10, width: 10, height: 20};
    var angle = 45;
    var origin = {x: 15, y: 20};
    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect2', 'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height, 'transform': 'rotate(' + angle + ' ' + origin.x + ',' + origin.y + ')'}
    });
    svgroot.appendChild(elem);
    mockAddSvgElementFromJsonCallCount = 0;
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    var r2 = rotateRect(rect, angle, origin);
    close(bbox.x, r2.x, EPSILON, 'rect2 x is ' + r2.x);
    close(bbox.y, r2.y, EPSILON, 'rect2 y is ' + r2.y);
    close(bbox.width, r2.width, EPSILON, 'rect2 width is' + r2.width);
    close(bbox.height, r2.height, EPSILON, 'rect2 height is ' + r2.height);
    equal(mockAddSvgElementFromJsonCallCount, 0);
    svgroot.removeChild(elem);

    // Same as previous but wrapped with g and the transform is with the g.
    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect3', 'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height}
    });
    var g = mockCreateSVGElement({
      'element': 'g',
      'attr': {'transform': 'rotate(' + angle + ' ' + origin.x + ',' + origin.y + ')'}
    });
    g.appendChild(elem);
    svgroot.appendChild(g);
    mockAddSvgElementFromJsonCallCount = 0;
    bbox = getBBoxWithTransform(g, mockAddSvgElementFromJson, mockPathActions);
    close(bbox.x, r2.x, EPSILON, 'rect2 x is ' + r2.x);
    close(bbox.y, r2.y, EPSILON, 'rect2 y is ' + r2.y);
    close(bbox.width, r2.width, EPSILON, 'rect2 width is' + r2.width);
    close(bbox.height, r2.height, EPSILON, 'rect2 height is ' + r2.height);
    equal(mockAddSvgElementFromJsonCallCount, 0);
    svgroot.removeChild(g);

    elem = mockCreateSVGElement({
      'element': 'ellipse',
      'attr': {'id': 'ellipse1', 'cx': '100', 'cy': '100', 'rx': '50', 'ry': '50', 'transform': 'rotate(45 100,100)'}
    });
    svgroot.appendChild(elem);
    mockAddSvgElementFromJsonCallCount = 0;
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    // TODO: the BBox algorithm is using the bezier control points to calculate the bounding box. Should be 50, 50, 100, 100.
    ok(bbox.x > 45 && bbox.x <= 50);
    ok(bbox.y > 45 && bbox.y <= 50);
    ok(bbox.width >= 100 && bbox.width < 110);
    ok(bbox.height >= 100 && bbox.height < 110);
    equal(mockAddSvgElementFromJsonCallCount, 1);
    svgroot.removeChild(elem);
  });

  test('Test getBBoxWithTransform with rotation and matrix transforms', function () {
    var getBBoxWithTransform = svgedit.utilities.getBBoxWithTransform;

    var bbox;
    var tx = 10; // tx right
    var ty = 10; // tx down
    var txInRotatedSpace = Math.sqrt(tx * tx + ty * ty); // translate in rotated 45 space.
    var tyInRotatedSpace = 0;
    var matrix = 'matrix(1,0,0,1,' + txInRotatedSpace + ',' + tyInRotatedSpace + ')';
    var elem = mockCreateSVGElement({
      'element': 'path',
      'attr': {'id': 'path', 'd': 'M10,10 L20,20', 'transform': 'rotate(45 10,10) ' + matrix}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    close(bbox.x, 10 + tx, EPSILON);
    close(bbox.y, 10 + ty, EPSILON);
    close(bbox.width, 0, EPSILON);
    close(bbox.height, Math.sqrt(100 + 100), EPSILON);
    svgroot.removeChild(elem);

    txInRotatedSpace = tx; // translate in rotated 90 space.
    tyInRotatedSpace = -ty;
    matrix = 'matrix(1,0,0,1,' + txInRotatedSpace + ',' + tyInRotatedSpace + ')';
    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '10', 'y': '10', 'width': '10', 'height': '20', 'transform': 'rotate(90 15,20) ' + matrix}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    close(bbox.x, 5 + tx, EPSILON);
    close(bbox.y, 15 + ty, EPSILON);
    close(bbox.width, 20, EPSILON);
    close(bbox.height, 10, EPSILON);
    svgroot.removeChild(elem);

    var rect = {x: 10, y: 10, width: 10, height: 20};
    var angle = 45;
    var origin = {x: 15, y: 20};
    tx = 10; // tx right
    ty = 10; // tx down
    txInRotatedSpace = Math.sqrt(tx * tx + ty * ty); // translate in rotated 45 space.
    tyInRotatedSpace = 0;
    matrix = 'matrix(1,0,0,1,' + txInRotatedSpace + ',' + tyInRotatedSpace + ')';
    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect2', 'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height, 'transform': 'rotate(' + angle + ' ' + origin.x + ',' + origin.y + ') ' + matrix}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    var r2 = rotateRect(rect, angle, origin);
    close(bbox.x, r2.x + tx, EPSILON, 'rect2 x is ' + r2.x);
    close(bbox.y, r2.y + ty, EPSILON, 'rect2 y is ' + r2.y);
    close(bbox.width, r2.width, EPSILON, 'rect2 width is' + r2.width);
    close(bbox.height, r2.height, EPSILON, 'rect2 height is ' + r2.height);
    svgroot.removeChild(elem);

    // Same as previous but wrapped with g and the transform is with the g.
    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect3', 'x': rect.x, 'y': rect.y, 'width': rect.width, 'height': rect.height}
    });
    var g = mockCreateSVGElement({
      'element': 'g',
      'attr': {'transform': 'rotate(' + angle + ' ' + origin.x + ',' + origin.y + ') ' + matrix}
    });
    g.appendChild(elem);
    svgroot.appendChild(g);
    bbox = getBBoxWithTransform(g, mockAddSvgElementFromJson, mockPathActions);
    close(bbox.x, r2.x + tx, EPSILON, 'rect2 x is ' + r2.x);
    close(bbox.y, r2.y + ty, EPSILON, 'rect2 y is ' + r2.y);
    close(bbox.width, r2.width, EPSILON, 'rect2 width is' + r2.width);
    close(bbox.height, r2.height, EPSILON, 'rect2 height is ' + r2.height);
    svgroot.removeChild(g);

    elem = mockCreateSVGElement({
      'element': 'ellipse',
      'attr': {'id': 'ellipse1', 'cx': '100', 'cy': '100', 'rx': '50', 'ry': '50', 'transform': 'rotate(45 100,100) ' + matrix}
    });
    svgroot.appendChild(elem);
    bbox = getBBoxWithTransform(elem, mockAddSvgElementFromJson, mockPathActions);
    // TODO: the BBox algorithm is using the bezier control points to calculate the bounding box. Should be 50, 50, 100, 100.
    ok(bbox.x > 45 + tx && bbox.x <= 50 + tx);
    ok(bbox.y > 45 + ty && bbox.y <= 50 + ty);
    ok(bbox.width >= 100 && bbox.width < 110);
    ok(bbox.height >= 100 && bbox.height < 110);
    svgroot.removeChild(elem);
  });

  test('Test getStrokedBBox with stroke-width 10', function () {
    var getStrokedBBox = svgedit.utilities.getStrokedBBox;

    var bbox;
    var strokeWidth = 10;
    var elem = mockCreateSVGElement({
      'element': 'path',
      'attr': {'id': 'path', 'd': 'M0,1 L2,3', 'stroke-width': strokeWidth}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0 - strokeWidth / 2, y: 1 - strokeWidth / 2, width: 2 + strokeWidth, height: 2 + strokeWidth});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '0', 'y': '1', 'width': '5', 'height': '10', 'stroke-width': strokeWidth}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0 - strokeWidth / 2, y: 1 - strokeWidth / 2, width: 5 + strokeWidth, height: 10 + strokeWidth});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'line',
      'attr': {'id': 'line', 'x1': '0', 'y1': '1', 'x2': '5', 'y2': '6', 'stroke-width': strokeWidth}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0 - strokeWidth / 2, y: 1 - strokeWidth / 2, width: 5 + strokeWidth, height: 5 + strokeWidth});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '0', 'y': '1', 'width': '5', 'height': '10', 'stroke-width': strokeWidth}
    });
    var g = mockCreateSVGElement({
      'element': 'g',
      'attr': {}
    });
    g.appendChild(elem);
    svgroot.appendChild(g);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0 - strokeWidth / 2, y: 1 - strokeWidth / 2, width: 5 + strokeWidth, height: 10 + strokeWidth});
    svgroot.removeChild(g);
  });

  test("Test getStrokedBBox with stroke-width 'none'", function () {
    var getStrokedBBox = svgedit.utilities.getStrokedBBox;

    var bbox;
    var elem = mockCreateSVGElement({
      'element': 'path',
      'attr': {'id': 'path', 'd': 'M0,1 L2,3', 'stroke-width': 'none'}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 2, height: 2});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '0', 'y': '1', 'width': '5', 'height': '10', 'stroke-width': 'none'}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, height: 10});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'line',
      'attr': {'id': 'line', 'x1': '0', 'y1': '1', 'x2': '5', 'y2': '6', 'stroke-width': 'none'}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, height: 5});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '0', 'y': '1', 'width': '5', 'height': '10', 'stroke-width': 'none'}
    });
    var g = mockCreateSVGElement({
      'element': 'g',
      'attr': {}
    });
    g.appendChild(elem);
    svgroot.appendChild(g);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, height: 10});
    svgroot.removeChild(g);
  });

  test('Test getStrokedBBox with no stroke-width attribute', function () {
    var getStrokedBBox = svgedit.utilities.getStrokedBBox;

    var bbox;
    var elem = mockCreateSVGElement({
      'element': 'path',
      'attr': {'id': 'path', 'd': 'M0,1 L2,3'}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 2, height: 2});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '0', 'y': '1', 'width': '5', 'height': '10'}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, height: 10});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'line',
      'attr': {'id': 'line', 'x1': '0', 'y1': '1', 'x2': '5', 'y2': '6'}
    });
    svgroot.appendChild(elem);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, height: 5});
    svgroot.removeChild(elem);

    elem = mockCreateSVGElement({
      'element': 'rect',
      'attr': {'id': 'rect', 'x': '0', 'y': '1', 'width': '5', 'height': '10'}
    });
    var g = mockCreateSVGElement({
      'element': 'g',
      'attr': {}
    });
    g.appendChild(elem);
    svgroot.appendChild(g);
    bbox = getStrokedBBox([elem], mockAddSvgElementFromJson, mockPathActions);
    deepEqual(bbox, {x: 0, y: 1, width: 5, height: 10});
    svgroot.removeChild(g);
  });

  function radians (degrees) {
    return degrees * Math.PI / 180;
  }
  function rotatePoint (point, angle, origin) {
    if (!origin) {
      origin = {x: 0, y: 0};
    }
    var x = point.x - origin.x;
    var y = point.y - origin.y;
    var theta = radians(angle);
    return {
      x: x * Math.cos(theta) + y * Math.sin(theta) + origin.x,
      y: x * Math.sin(theta) + y * Math.cos(theta) + origin.y
    };
  }
  function rotateRect (rect, angle, origin) {
    var tl = rotatePoint({x: rect.x, y: rect.y}, angle, origin);
    var tr = rotatePoint({x: rect.x + rect.width, y: rect.y}, angle, origin);
    var br = rotatePoint({x: rect.x + rect.width, y: rect.y + rect.height}, angle, origin);
    var bl = rotatePoint({x: rect.x, y: rect.y + rect.height}, angle, origin);

    var minx = Math.min(tl.x, tr.x, bl.x, br.x);
    var maxx = Math.max(tl.x, tr.x, bl.x, br.x);
    var miny = Math.min(tl.y, tr.y, bl.y, br.y);
    var maxy = Math.max(tl.y, tr.y, bl.y, br.y);

    return {
      x: minx,
      y: miny,
      width: (maxx - minx),
      height: (maxy - miny)
    };
  }
});

/* eslint-env qunit */
/* globals $, svgedit, equals */
/* eslint-disable no-var, no-redeclare */
$(function () {
  // log function
  QUnit.log = function (details) {
    if (window.console && window.console.log) {
      window.console.log(details.result + ' :: ' + details.message);
    }
  };
  var NS = svgedit.NS;
  var LAYER_CLASS = svgedit.draw.Layer.CLASS_NAME;
  var NONCE = 'foo';
  var LAYER1 = 'Layer 1';
  var LAYER2 = 'Layer 2';
  var LAYER3 = 'Layer 3';
  var PATH_ATTR = {
    // clone will convert relative to absolute, so the test for equality fails.
    // 'd':    'm7.38867,57.38867c0,-27.62431 22.37569,-50 50,-50c27.62431,0 50,22.37569 50,50c0,27.62431 -22.37569,50 -50,50c-27.62431,0 -50,-22.37569 -50,-50z',
    'd': 'M7.389,57.389C7.389,29.764 29.764,7.389 57.389,7.389C85.013,7.389 107.389,29.764 107.389,57.389C107.389,85.013 85.013,107.389 57.389,107.389C29.764,107.389 7.389,85.013 7.389,57.389z',
    'transform': 'rotate(45 57.388671875000036,57.388671874999986) ',
    'stroke-width': '5',
    'stroke': '#660000',
    'fill': '#ff0000'
  };

  var svg = document.createElementNS(NS.SVG, 'svg');
  var sandbox = document.getElementById('sandbox');
  // Firefox throws exception in getBBox() when svg is not attached to DOM.
  sandbox.appendChild(svg);

  // Set up <svg> with nonce.
  var svgN = document.createElementNS(NS.SVG, 'svg');
  svgN.setAttributeNS(NS.XMLNS, 'xmlns:se', NS.SE);
  svgN.setAttributeNS(NS.SE, 'se:nonce', NONCE);

  svgedit.units.init({
    // used by svgedit.units.shortFloat - call path: cloneLayer -> copyElem -> convertPath -> pathDSegment -> shortFloat
    getRoundDigits: function () { return 3; }
  });

  function createSVGElement (jsonMap) {
    var elem = document.createElementNS(svgedit.NS.SVG, jsonMap['element']);
    for (var attr in jsonMap['attr']) {
      elem.setAttribute(attr, jsonMap['attr'][attr]);
    }
    return elem;
  }

  var setupSvgWith3Layers = function (svgElem) {
    var layer1 = document.createElementNS(NS.SVG, 'g');
    var layer1Title = document.createElementNS(NS.SVG, 'title');
    layer1Title.appendChild(document.createTextNode(LAYER1));
    layer1.appendChild(layer1Title);
    svgElem.appendChild(layer1);

    var layer2 = document.createElementNS(NS.SVG, 'g');
    var layer2Title = document.createElementNS(NS.SVG, 'title');
    layer2Title.appendChild(document.createTextNode(LAYER2));
    layer2.appendChild(layer2Title);
    svgElem.appendChild(layer2);

    var layer3 = document.createElementNS(NS.SVG, 'g');
    var layer3Title = document.createElementNS(NS.SVG, 'title');
    layer3Title.appendChild(document.createTextNode(LAYER3));
    layer3.appendChild(layer3Title);
    svgElem.appendChild(layer3);

    return [layer1, layer2, layer3];
  };

  var createSomeElementsInGroup = function (group) {
    group.appendChild(createSVGElement({
      'element': 'path',
      'attr': PATH_ATTR
    }));
    // group.appendChild(createSVGElement({
    //    'element': 'path',
    //    'attr': {'d': 'M0,1L2,3'}
    //  }));
    group.appendChild(createSVGElement({
      'element': 'rect',
      'attr': {'x': '0', 'y': '1', 'width': '5', 'height': '10'}
    }));
    group.appendChild(createSVGElement({
      'element': 'line',
      'attr': {'x1': '0', 'y1': '1', 'x2': '5', 'y2': '6'}
    }));

    var g = createSVGElement({
      'element': 'g',
      'attr': {}
    });
    g.appendChild(createSVGElement({
      'element': 'rect',
      'attr': {'x': '0', 'y': '1', 'width': '5', 'height': '10'}
    }));
    group.appendChild(g);
    return 4;
  };

  var cleanupSvg = function (svgElem) {
    while (svgElem.firstChild) { svgElem.removeChild(svgElem.firstChild); }
  };

  module('svgedit.draw.Drawing', {
    setup: function () {
    },
    teardown: function () {
    }
  });

  test('Test draw module', function () {
    expect(4);

    ok(svgedit.draw);
    equals(typeof svgedit.draw, typeof {});

    ok(svgedit.draw.Drawing);
    equals(typeof svgedit.draw.Drawing, typeof function () {});
  });

  test('Test document creation', function () {
    expect(3);

    try {
      var doc = new svgedit.draw.Drawing();
      ok(false, 'Created drawing without a valid <svg> element');
    } catch (e) {
      ok(true);
    }

    try {
      var doc = new svgedit.draw.Drawing(svg);
      ok(doc);
      equals(typeof doc, typeof {});
    } catch (e) {
      ok(false, 'Could not create document from valid <svg> element: ' + e);
    }
  });

  test('Test nonce', function () {
    expect(7);

    var doc = new svgedit.draw.Drawing(svg);
    equals(doc.getNonce(), '');

    doc = new svgedit.draw.Drawing(svgN);
    equals(doc.getNonce(), NONCE);
    equals(doc.getSvgElem().getAttributeNS(NS.SE, 'nonce'), NONCE);

    doc.clearNonce();
    ok(!doc.getNonce());
    ok(!doc.getSvgElem().getAttributeNS(NS.SE, 'se:nonce'));

    doc.setNonce(NONCE);
    equals(doc.getNonce(), NONCE);
    equals(doc.getSvgElem().getAttributeNS(NS.SE, 'nonce'), NONCE);
  });

  test('Test getId() and getNextId() without nonce', function () {
    expect(7);

    var elem2 = document.createElementNS(NS.SVG, 'circle');
    elem2.id = 'svg_2';
    svg.appendChild(elem2);

    var doc = new svgedit.draw.Drawing(svg);

    equals(doc.getId(), 'svg_0');

    equals(doc.getNextId(), 'svg_1');
    equals(doc.getId(), 'svg_1');

    equals(doc.getNextId(), 'svg_3');
    equals(doc.getId(), 'svg_3');

    equals(doc.getNextId(), 'svg_4');
    equals(doc.getId(), 'svg_4');
    // clean out svg document
    cleanupSvg(svg);
  });

  test('Test getId() and getNextId() with prefix without nonce', function () {
    expect(7);

    var prefix = 'Bar-';
    var doc = new svgedit.draw.Drawing(svg, prefix);

    equals(doc.getId(), prefix + '0');

    equals(doc.getNextId(), prefix + '1');
    equals(doc.getId(), prefix + '1');

    equals(doc.getNextId(), prefix + '2');
    equals(doc.getId(), prefix + '2');

    equals(doc.getNextId(), prefix + '3');
    equals(doc.getId(), prefix + '3');

    cleanupSvg(svg);
  });

  test('Test getId() and getNextId() with nonce', function () {
    expect(7);

    var prefix = 'svg_' + NONCE;

    var elem2 = document.createElementNS(NS.SVG, 'circle');
    elem2.id = prefix + '_2';
    svgN.appendChild(elem2);

    var doc = new svgedit.draw.Drawing(svgN);

    equals(doc.getId(), prefix + '_0');

    equals(doc.getNextId(), prefix + '_1');
    equals(doc.getId(), prefix + '_1');

    equals(doc.getNextId(), prefix + '_3');
    equals(doc.getId(), prefix + '_3');

    equals(doc.getNextId(), prefix + '_4');
    equals(doc.getId(), prefix + '_4');

    cleanupSvg(svgN);
  });

  test('Test getId() and getNextId() with prefix with nonce', function () {
    expect(7);

    var PREFIX = 'Bar-';
    var doc = new svgedit.draw.Drawing(svgN, PREFIX);

    var prefix = PREFIX + NONCE + '_';
    equals(doc.getId(), prefix + '0');

    equals(doc.getNextId(), prefix + '1');
    equals(doc.getId(), prefix + '1');

    equals(doc.getNextId(), prefix + '2');
    equals(doc.getId(), prefix + '2');

    equals(doc.getNextId(), prefix + '3');
    equals(doc.getId(), prefix + '3');

    cleanupSvg(svgN);
  });

  test('Test releaseId()', function () {
    expect(6);

    var doc = new svgedit.draw.Drawing(svg);

    var firstId = doc.getNextId();
    /* var secondId = */ doc.getNextId();

    var result = doc.releaseId(firstId);
    ok(result);
    equals(doc.getNextId(), firstId);
    equals(doc.getNextId(), 'svg_3');

    ok(!doc.releaseId('bad-id'));
    ok(doc.releaseId(firstId));
    ok(!doc.releaseId(firstId));

    cleanupSvg(svg);
  });

  test('Test getNumLayers', function () {
    expect(3);
    var drawing = new svgedit.draw.Drawing(svg);
    equals(typeof drawing.getNumLayers, typeof function () {});
    equals(drawing.getNumLayers(), 0);

    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    equals(drawing.getNumLayers(), 3);

    cleanupSvg(svg);
  });

  test('Test hasLayer', function () {
    expect(5);

    setupSvgWith3Layers(svg);
    var drawing = new svgedit.draw.Drawing(svg);
    drawing.identifyLayers();

    equals(typeof drawing.hasLayer, typeof function () {});
    ok(!drawing.hasLayer('invalid-layer'));

    ok(drawing.hasLayer(LAYER3));
    ok(drawing.hasLayer(LAYER2));
    ok(drawing.hasLayer(LAYER1));

    cleanupSvg(svg);
  });

  test('Test identifyLayers() with empty document', function () {
    expect(11);

    var drawing = new svgedit.draw.Drawing(svg);
    equals(drawing.getCurrentLayer(), null);
    // By default, an empty document gets an empty group created.
    drawing.identifyLayers();

    // Check that <svg> element now has one child node
    ok(drawing.getSvgElem().hasChildNodes());
    equals(drawing.getSvgElem().childNodes.length, 1);

    // Check that all_layers are correctly set up.
    equals(drawing.getNumLayers(), 1);
    var emptyLayer = drawing.all_layers[0];
    ok(emptyLayer);
    var layerGroup = emptyLayer.getGroup();
    equals(layerGroup, drawing.getSvgElem().firstChild);
    equals(layerGroup.tagName, 'g');
    equals(layerGroup.getAttribute('class'), LAYER_CLASS);
    ok(layerGroup.hasChildNodes());
    equals(layerGroup.childNodes.length, 1);
    var firstChild = layerGroup.childNodes.item(0);
    equals(firstChild.tagName, 'title');

    cleanupSvg(svg);
  });

  test('Test identifyLayers() with some layers', function () {
    expect(8);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);

    equals(svg.childNodes.length, 3);

    drawing.identifyLayers();

    equals(drawing.getNumLayers(), 3);
    equals(drawing.all_layers[0].getGroup(), svg.childNodes.item(0));
    equals(drawing.all_layers[1].getGroup(), svg.childNodes.item(1));
    equals(drawing.all_layers[2].getGroup(), svg.childNodes.item(2));

    equals(drawing.all_layers[0].getGroup().getAttribute('class'), LAYER_CLASS);
    equals(drawing.all_layers[1].getGroup().getAttribute('class'), LAYER_CLASS);
    equals(drawing.all_layers[2].getGroup().getAttribute('class'), LAYER_CLASS);

    cleanupSvg(svg);
  });

  test('Test identifyLayers() with some layers and orphans', function () {
    expect(14);

    setupSvgWith3Layers(svg);

    var orphan1 = document.createElementNS(NS.SVG, 'rect');
    var orphan2 = document.createElementNS(NS.SVG, 'rect');
    svg.appendChild(orphan1);
    svg.appendChild(orphan2);

    equals(svg.childNodes.length, 5);

    var drawing = new svgedit.draw.Drawing(svg);
    drawing.identifyLayers();

    equals(drawing.getNumLayers(), 4);
    equals(drawing.all_layers[0].getGroup(), svg.childNodes.item(0));
    equals(drawing.all_layers[1].getGroup(), svg.childNodes.item(1));
    equals(drawing.all_layers[2].getGroup(), svg.childNodes.item(2));
    equals(drawing.all_layers[3].getGroup(), svg.childNodes.item(3));

    equals(drawing.all_layers[0].getGroup().getAttribute('class'), LAYER_CLASS);
    equals(drawing.all_layers[1].getGroup().getAttribute('class'), LAYER_CLASS);
    equals(drawing.all_layers[2].getGroup().getAttribute('class'), LAYER_CLASS);
    equals(drawing.all_layers[3].getGroup().getAttribute('class'), LAYER_CLASS);

    var layer4 = drawing.all_layers[3].getGroup();
    equals(layer4.tagName, 'g');
    equals(layer4.childNodes.length, 3);
    equals(layer4.childNodes.item(1), orphan1);
    equals(layer4.childNodes.item(2), orphan2);

    cleanupSvg(svg);
  });

  test('Test getLayerName()', function () {
    expect(4);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);

    drawing.identifyLayers();

    equals(drawing.getNumLayers(), 3);
    equals(drawing.getLayerName(0), LAYER1);
    equals(drawing.getLayerName(1), LAYER2);
    equals(drawing.getLayerName(2), LAYER3);

    cleanupSvg(svg);
  });

  test('Test getCurrentLayer()', function () {
    expect(4);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    ok(drawing.getCurrentLayer);
    equals(typeof drawing.getCurrentLayer, typeof function () {});
    ok(drawing.getCurrentLayer());
    equals(drawing.getCurrentLayer(), drawing.all_layers[2].getGroup());

    cleanupSvg(svg);
  });

  test('Test setCurrentLayer() and getCurrentLayerName()', function () {
    expect(6);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    ok(drawing.setCurrentLayer);
    equals(typeof drawing.setCurrentLayer, typeof function () {});

    drawing.setCurrentLayer(LAYER2);
    equals(drawing.getCurrentLayerName(), LAYER2);
    equals(drawing.getCurrentLayer(), drawing.all_layers[1].getGroup());

    drawing.setCurrentLayer(LAYER3);
    equals(drawing.getCurrentLayerName(), LAYER3);
    equals(drawing.getCurrentLayer(), drawing.all_layers[2].getGroup());

    cleanupSvg(svg);
  });

  test('Test setCurrentLayerName()', function () {
    var mockHrService = {
      changeElement: this.spy()
    };

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    ok(drawing.setCurrentLayerName);
    equals(typeof drawing.setCurrentLayerName, typeof function () {});

    var oldName = drawing.getCurrentLayerName();
    var newName = 'New Name';
    ok(drawing.layer_map[oldName]);
    equals(drawing.layer_map[newName], undefined); // newName shouldn't exist.
    var result = drawing.setCurrentLayerName(newName, mockHrService);
    equals(result, newName);
    equals(drawing.getCurrentLayerName(), newName);
    // Was the map updated?
    equals(drawing.layer_map[oldName], undefined);
    equals(drawing.layer_map[newName], drawing.current_layer);
    // Was mockHrService called?
    ok(mockHrService.changeElement.calledOnce);
    equals(oldName, mockHrService.changeElement.getCall(0).args[1]['#text']);
    equals(newName, mockHrService.changeElement.getCall(0).args[0].textContent);

    cleanupSvg(svg);
  });

  test('Test createLayer()', function () {
    expect(10);

    var mockHrService = {
      startBatchCommand: this.spy(),
      endBatchCommand: this.spy(),
      insertElement: this.spy()
    };

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    ok(drawing.createLayer);
    equals(typeof drawing.createLayer, typeof function () {});

    var NEW_LAYER_NAME = 'Layer A';
    var layerG = drawing.createLayer(NEW_LAYER_NAME, mockHrService);
    equals(drawing.getNumLayers(), 4);
    equals(layerG, drawing.getCurrentLayer());
    equals(layerG.getAttribute('class'), LAYER_CLASS);
    equals(NEW_LAYER_NAME, drawing.getCurrentLayerName());
    equals(NEW_LAYER_NAME, drawing.getLayerName(3));

    equals(layerG, mockHrService.insertElement.getCall(0).args[0]);
    ok(mockHrService.startBatchCommand.calledOnce);
    ok(mockHrService.endBatchCommand.calledOnce);

    cleanupSvg(svg);
  });

  test('Test mergeLayer()', function () {
    var mockHrService = {
      startBatchCommand: this.spy(),
      endBatchCommand: this.spy(),
      moveElement: this.spy(),
      removeElement: this.spy()
    };

    var drawing = new svgedit.draw.Drawing(svg);
    var layers = setupSvgWith3Layers(svg);
    var elementCount = createSomeElementsInGroup(layers[2]) + 1; // +1 for title element
    equals(layers[1].childElementCount, 1);
    equals(layers[2].childElementCount, elementCount);
    drawing.identifyLayers();
    equals(drawing.getCurrentLayer(), layers[2]);

    ok(drawing.mergeLayer);
    equals(typeof drawing.mergeLayer, typeof function () {});

    drawing.mergeLayer(mockHrService);

    equals(drawing.getNumLayers(), 2);
    equals(svg.childElementCount, 2);
    equals(drawing.getCurrentLayer(), layers[1]);
    equals(layers[1].childElementCount, elementCount);

    // check history record
    ok(mockHrService.startBatchCommand.calledOnce);
    ok(mockHrService.endBatchCommand.calledOnce);
    equals(mockHrService.startBatchCommand.getCall(0).args[0], 'Merge Layer');
    equals(mockHrService.moveElement.callCount, elementCount - 1); // -1 because the title was not moved.
    equals(mockHrService.removeElement.callCount, 2); // remove group and title.

    cleanupSvg(svg);
  });

  test('Test mergeLayer() when no previous layer to merge', function () {
    var mockHrService = {
      startBatchCommand: this.spy(),
      endBatchCommand: this.spy(),
      moveElement: this.spy(),
      removeElement: this.spy()
    };

    var drawing = new svgedit.draw.Drawing(svg);
    var layers = setupSvgWith3Layers(svg);
    drawing.identifyLayers();
    drawing.setCurrentLayer(LAYER1);
    equals(drawing.getCurrentLayer(), layers[0]);

    drawing.mergeLayer(mockHrService);

    equals(drawing.getNumLayers(), 3);
    equals(svg.childElementCount, 3);
    equals(drawing.getCurrentLayer(), layers[0]);
    equals(layers[0].childElementCount, 1);
    equals(layers[1].childElementCount, 1);
    equals(layers[2].childElementCount, 1);

    // check history record
    equals(mockHrService.startBatchCommand.callCount, 0);
    equals(mockHrService.endBatchCommand.callCount, 0);
    equals(mockHrService.moveElement.callCount, 0);
    equals(mockHrService.removeElement.callCount, 0);

    cleanupSvg(svg);
  });

  test('Test mergeAllLayers()', function () {
    var mockHrService = {
      startBatchCommand: this.spy(),
      endBatchCommand: this.spy(),
      moveElement: this.spy(),
      removeElement: this.spy()
    };

    var drawing = new svgedit.draw.Drawing(svg);
    var layers = setupSvgWith3Layers(svg);
    var elementCount = createSomeElementsInGroup(layers[0]) + 1; // +1 for title element
    createSomeElementsInGroup(layers[1]);
    createSomeElementsInGroup(layers[2]);
    equals(layers[0].childElementCount, elementCount);
    equals(layers[1].childElementCount, elementCount);
    equals(layers[2].childElementCount, elementCount);
    drawing.identifyLayers();

    ok(drawing.mergeAllLayers);
    equals(typeof drawing.mergeAllLayers, typeof function () {});

    drawing.mergeAllLayers(mockHrService);

    equals(drawing.getNumLayers(), 1);
    equals(svg.childElementCount, 1);
    equals(drawing.getCurrentLayer(), layers[0]);
    equals(layers[0].childElementCount, elementCount * 3 - 2); // -2 because two titles were deleted.

    // check history record
    equals(mockHrService.startBatchCommand.callCount, 3); // mergeAllLayers + 2 * mergeLayer
    equals(mockHrService.endBatchCommand.callCount, 3);
    equals(mockHrService.startBatchCommand.getCall(0).args[0], 'Merge all Layers');
    equals(mockHrService.startBatchCommand.getCall(1).args[0], 'Merge Layer');
    equals(mockHrService.startBatchCommand.getCall(2).args[0], 'Merge Layer');
    // moveElement count is times 3 instead of 2, because one layer's elements were moved twice.
    // moveElement count is minus 3 because the three titles were not moved.
    equals(mockHrService.moveElement.callCount, elementCount * 3 - 3);
    equals(mockHrService.removeElement.callCount, 2 * 2); // remove group and title twice.

    cleanupSvg(svg);
  });

  test('Test cloneLayer()', function () {
    var mockHrService = {
      startBatchCommand: this.spy(),
      endBatchCommand: this.spy(),
      insertElement: this.spy()
    };

    var drawing = new svgedit.draw.Drawing(svg);
    var layers = setupSvgWith3Layers(svg);
    var layer3 = layers[2];
    var elementCount = createSomeElementsInGroup(layer3) + 1; // +1 for title element
    equals(layer3.childElementCount, elementCount);
    drawing.identifyLayers();

    ok(drawing.cloneLayer);
    equals(typeof drawing.cloneLayer, typeof function () {});

    var clone = drawing.cloneLayer('clone', mockHrService);

    equals(drawing.getNumLayers(), 4);
    equals(svg.childElementCount, 4);
    equals(drawing.getCurrentLayer(), clone);
    equals(clone.childElementCount, elementCount);

    // check history record
    ok(mockHrService.startBatchCommand.calledOnce); // mergeAllLayers + 2 * mergeLayer
    ok(mockHrService.endBatchCommand.calledOnce);
    equals(mockHrService.startBatchCommand.getCall(0).args[0], 'Duplicate Layer');
    equals(mockHrService.insertElement.callCount, 1);
    equals(mockHrService.insertElement.getCall(0).args[0], clone);

    // check that path is cloned properly
    equals(clone.childNodes.length, elementCount);
    var path = clone.childNodes[1];
    equals(path.id, 'svg_1');
    equals(path.getAttribute('d'), PATH_ATTR.d);
    equals(path.getAttribute('transform'), PATH_ATTR.transform);
    equals(path.getAttribute('fill'), PATH_ATTR.fill);
    equals(path.getAttribute('stroke'), PATH_ATTR.stroke);
    equals(path.getAttribute('stroke-width'), PATH_ATTR['stroke-width']);

    // check that g is cloned properly
    var g = clone.childNodes[4];
    equals(g.childNodes.length, 1);
    equals(g.id, 'svg_4');

    cleanupSvg(svg);
  });

  test('Test getLayerVisibility()', function () {
    expect(5);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    ok(drawing.getLayerVisibility);
    equals(typeof drawing.getLayerVisibility, typeof function () {});
    ok(drawing.getLayerVisibility(LAYER1));
    ok(drawing.getLayerVisibility(LAYER2));
    ok(drawing.getLayerVisibility(LAYER3));

    cleanupSvg(svg);
  });

  test('Test setLayerVisibility()', function () {
    expect(6);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    ok(drawing.setLayerVisibility);
    equals(typeof drawing.setLayerVisibility, typeof function () {});

    drawing.setLayerVisibility(LAYER3, false);
    drawing.setLayerVisibility(LAYER2, true);
    drawing.setLayerVisibility(LAYER1, false);

    ok(!drawing.getLayerVisibility(LAYER1));
    ok(drawing.getLayerVisibility(LAYER2));
    ok(!drawing.getLayerVisibility(LAYER3));

    drawing.setLayerVisibility(LAYER3, 'test-string');
    ok(!drawing.getLayerVisibility(LAYER3));

    cleanupSvg(svg);
  });

  test('Test getLayerOpacity()', function () {
    expect(5);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    ok(drawing.getLayerOpacity);
    equals(typeof drawing.getLayerOpacity, typeof function () {});
    ok(drawing.getLayerOpacity(LAYER1) === 1.0);
    ok(drawing.getLayerOpacity(LAYER2) === 1.0);
    ok(drawing.getLayerOpacity(LAYER3) === 1.0);

    cleanupSvg(svg);
  });

  test('Test setLayerOpacity()', function () {
    expect(6);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    ok(drawing.setLayerOpacity);
    equals(typeof drawing.setLayerOpacity, typeof function () {});

    drawing.setLayerOpacity(LAYER1, 0.4);
    drawing.setLayerOpacity(LAYER2, 'invalid-string');
    drawing.setLayerOpacity(LAYER3, -1.4);

    ok(drawing.getLayerOpacity(LAYER1) === 0.4);
    QUnit.log({result: 'layer2 opacity', message: drawing.getLayerOpacity(LAYER2)});
    ok(drawing.getLayerOpacity(LAYER2) === 1.0);
    ok(drawing.getLayerOpacity(LAYER3) === 1.0);

    drawing.setLayerOpacity(LAYER3, 100);
    ok(drawing.getLayerOpacity(LAYER3) === 1.0);

    cleanupSvg(svg);
  });

  test('Test deleteCurrentLayer()', function () {
    expect(6);

    var drawing = new svgedit.draw.Drawing(svg);
    setupSvgWith3Layers(svg);
    drawing.identifyLayers();

    drawing.setCurrentLayer(LAYER2);

    var curLayer = drawing.getCurrentLayer();
    equals(curLayer, drawing.all_layers[1].getGroup());
    var deletedLayer = drawing.deleteCurrentLayer();

    equals(curLayer, deletedLayer);
    equals(2, drawing.getNumLayers());
    equals(LAYER1, drawing.all_layers[0].getName());
    equals(LAYER3, drawing.all_layers[1].getName());
    equals(drawing.getCurrentLayer(), drawing.all_layers[1].getGroup());
  });

  test('Test svgedit.draw.randomizeIds()', function () {
    expect(9);

    // Confirm in LET_DOCUMENT_DECIDE mode that the document decides
    // if there is a nonce.
    var drawing = new svgedit.draw.Drawing(svgN.cloneNode(true));
    ok(!!drawing.getNonce());

    drawing = new svgedit.draw.Drawing(svg.cloneNode(true));
    ok(!drawing.getNonce());

    // Confirm that a nonce is set once we're in ALWAYS_RANDOMIZE mode.
    svgedit.draw.randomizeIds(true, drawing);
    ok(!!drawing.getNonce());

    // Confirm new drawings in ALWAYS_RANDOMIZE mode have a nonce.
    drawing = new svgedit.draw.Drawing(svg.cloneNode(true));
    ok(!!drawing.getNonce());

    drawing.clearNonce();
    ok(!drawing.getNonce());

    // Confirm new drawings in NEVER_RANDOMIZE mode do not have a nonce
    // but that their se:nonce attribute is left alone.
    svgedit.draw.randomizeIds(false, drawing);
    ok(!drawing.getNonce());
    ok(!!drawing.getSvgElem().getAttributeNS(NS.SE, 'nonce'));

    drawing = new svgedit.draw.Drawing(svg.cloneNode(true));
    ok(!drawing.getNonce());

    drawing = new svgedit.draw.Drawing(svgN.cloneNode(true));
    ok(!drawing.getNonce());
  });
});

// Global vars
var pymChild = null;
var isMobile = false;

/*
 * Initialize the graphic.
 */
var onWindowLoaded = function() {
    if (Modernizr.svg) {
        pymChild = new pym.Child({
            renderCallback: render
        });
    } else {
        pymChild = new pym.Child({});
    }

    pymChild.onMessage('on-screen', function(bucket) {
        ANALYTICS.trackEvent('on-screen', bucket);
    });
    pymChild.onMessage('scroll-depth', function(percent) {
        ANALYTICS.trackEvent('scroll-depth', percent);
    });
}

/*
 * Render the graphic.
 */
var render = function(containerWidth) {
    g || (g = !0, a());

    // Update iframe
    if (pymChild) {
        pymChild.sendHeight();
    }
}

function a() {
    var a = $("#cell").height(),
        g = $("#cell").width();
    m = new THREE.Scene, l = new THREE.PerspectiveCamera(50, g / a, .1, 100), k = [], i = new THREE.WebGLRenderer({
        antialias: !0,
        alpha: !0
    }), i.shadowMap.type = THREE.PCFShadowMap, i.shadowMap.enabled = !0, i.setPixelRatio(window.devicePixelRatio), i.setSize(g, a), document.getElementById("cell").appendChild(i.domElement), j = new THREE.OrbitControls(l, $("#cell")[0]), j.enabled = !1, j.enablePan = !1, j.enableZoom = !1, j.enableKeys = !1, j.zoomSpeed = 1;
    var o = new THREE.AmbientLight(4210752);
    m.add(o);
    var p = new THREE.DirectionalLight(16777166, .2);
    p.position.set(0, 6, 0), p.castShadow = !0, m.add(p);
    var q = new THREE.PointLight(16777189, 1, 1.8);
    q.position.set(-.38, .58, -1), m.add(q);
    var r = new THREE.PointLight(16777189, 1, 1.8);
    r.position.set(.38, .58, -1), m.add(r);
    var s = new THREE.PointLight(16777189, .25, 2.5);
    s.position.set(-.3, -.08, 1.28), m.add(s);
    var t = 1e3;
    setTimeout(e, t), setTimeout(f, t + 500), setTimeout(d, t + 6e3), j.autoRotate = !0, $("#cell").on("tmp_hotzone_end", function() {}), $("#cell").on("tmp_hotzone_will_appear", function() {
        j.autoRotate = !0, requestAnimationFrame(c)
    }), $("#cell").on("tmp_hotzone_will_disappear", function() {
        j.autoRotate = !1
    }), THREE.ImageUtils.crossOrigin = "", n = THREE.ImageUtils.loadTexture(h + "models/menardWhite/parkingLotLarge.png", {}, b)
}

function b() {
    var a = new THREE.ColladaLoader;
    a.options.convertUpAxis = !0, a.load(h + "models/menardWhite.dae", function(a) {
        a.scene.traverse(function(a) {
            a.castShadow = !0, a.receiveShadow = !0;
            var b = ["floor", "ceiling", "rightWall", "leftWall", "rearWall", "frontWall", "sittingMan", "layingMan", "shelf", "sink", "toilet", "light", "beds", "parkingLot"]; - 1 != b.indexOf(a.name) && (k[a.name] = a), -1 != b.indexOf(a.name) && "parkingLot" != a.name && (a.visible = !1)
        }), k.parkingLot.children[0].material = new THREE.MeshLambertMaterial({
            map: n
        }), k.leftWall.children[0].material = new THREE.MeshLambertMaterial("0xFFFFFF"), k.rightWall.children[0].material = new THREE.MeshLambertMaterial("0xFFFFFF"), k.rearWall.children[0].material = new THREE.MeshLambertMaterial("0xFFFFFF"), k.frontWall.children[0].material = new THREE.MeshLambertMaterial("0xFFFFFF"), k.ceiling.children[0].material = new THREE.MeshLambertMaterial("0xFFFFFF"), k.floor.children[0].material = new THREE.MeshLambertMaterial("0xFFFFFF"), a.scene.position.set(0, 0, 0), m.add(a.scene), l.position.set(-3.5, 2, 3.5), c()
    })
}

function c() {
    TWEEN.update(), j.update();
    var a = new THREE.Vector3(0, 0, 1).applyQuaternion(k.rightWall.quaternion),
        b = new THREE.Vector3(0, 0, 1).applyQuaternion(k.leftWall.quaternion),
        d = new THREE.Vector3(0, 0, -1).applyQuaternion(l.quaternion);
    a.angleTo(d) > 1.87 ? (k.rightWall.children[0].material.transparent = !0, k.rightWall.children[0].material.opacity = .3) : (k.rightWall.children[0].material.opacity = 1, k.rightWall.children[0].material.transparent = !1), b.angleTo(d) < 1.24 ? (k.leftWall.children[0].material.transparent = !0, k.leftWall.children[0].material.opacity = .3) : (k.leftWall.children[0].material.opacity = 1, k.leftWall.children[0].material.transparent = !1), l.position.x > .7 ? (k.rearWall.children[0].material.transparent = !0, k.rearWall.children[0].material.opacity = .3) : (k.rearWall.children[0].material.opacity = 1, k.rearWall.children[0].material.transparent = !1), l.position.x < -.7 ? (k.frontWall.children[0].material.transparent = !0, k.frontWall.children[0].material.opacity = .3) : (k.frontWall.children[0].material.opacity = 1, k.frontWall.children[0].material.transparent = !1), l.position.y < -1.1 ? (k.ceiling.children[0].material.opacity = 1, k.ceiling.children[0].material.transparent = !1, k.floor.children[0].material.transparent = !0, k.floor.children[0].material.opacity = .3) : l.position.y > 1.1 ? (k.floor.children[0].material.opacity = 1, k.floor.children[0].material.transparent = !1, k.ceiling.children[0].material.transparent = !0, k.ceiling.children[0].material.opacity = .3) : (k.floor.children[0].material.opacity = 1, k.ceiling.children[0].material.opacity = 1, k.floor.children[0].material.transparent = !1, k.ceiling.children[0].material.transparent = !1), i.render(m, l), j.autoRotate && requestAnimationFrame(c)
}

function d() {
    k.parkingLot.children.forEach(function(a) {
        try {
            a.material.transparent = !0, new TWEEN.Tween(a.material).to({
                opacity: .3
            }, 500).onComplete(function() {}).start()
        } catch (b) {}
    })
}

function e() {
    o = !0, k.sittingMan.children.forEach(function(a) {
        try {
            a.material.materials[0].transparent = !0, a.material.materials[0].opacity = 0, new TWEEN.Tween(a.material.materials[0]).to({
                opacity: 1
            }, 500).onStart(function() {
                k.sittingMan.visible = !0
            }).onComplete(function() {
                this.transparent = !1
            }).start()
        } catch (b) {}
    }), k.layingMan.children.forEach(function(a) {
        try {
            a.material.materials[0].transparent = !0, a.material.materials[0].opacity = 0, new TWEEN.Tween(a.material.materials[0]).to({
                opacity: 1
            }, 500).onStart(function() {
                k.layingMan.visible = !0
            }).onComplete(function() {
                this.transparent = !1
            }).start()
        } catch (b) {}
    }), k.toilet.children.forEach(function(a) {
        try {
            a.material.transparent = !0, a.material.opacity = 0, new TWEEN.Tween(a.material).to({
                opacity: 1
            }, 500).onStart(function() {
                k.toilet.visible = !0
            }).onComplete(function() {
                this.transparent = !1
            }).start()
        } catch (b) {}
    }), k.sink.children.forEach(function(a) {
        try {
            a.material.transparent = !0, a.material.opacity = 0, new TWEEN.Tween(a.material).to({
                opacity: 1
            }, 500).onStart(function() {
                k.sink.visible = !0
            }).onComplete(function() {
                this.transparent = !1
            }).start()
        } catch (b) {}
    }), k.beds.children.forEach(function(a) {
        try {
            a.material.transparent = !0, a.material.opacity = 0, new TWEEN.Tween(a.material).to({
                opacity: 1
            }, 500).onStart(function() {
                k.beds.visible = !0
            }).onComplete(function() {
                this.transparent = !1
            }).start()
        } catch (b) {}
    }), k.light.children.forEach(function(a) {
        try {
            a.material.transparent = !0, a.material.opacity = 0, new TWEEN.Tween(a.material).to({
                opacity: 1
            }, 500).onStart(function() {
                k.light.visible = !0
            }).onComplete(function() {
                this.transparent = !1
            }).start()
        } catch (b) {}
    }), k.shelf.children.forEach(function(a) {
        try {
            a.material.transparent = !0, a.material.opacity = 0, new TWEEN.Tween(a.material).to({
                opacity: 1
            }, 500).onStart(function() {
                k.shelf.visible = !0
            }).onComplete(function() {
                this.transparent = !1
            }).start()
        } catch (b) {}
    })
}

function f() {
    k.leftWall.scale.y = 1e-5, k.leftWall.visible = !0, new TWEEN.Tween(k.leftWall.scale).to({
        y: 1
    }, 1e3).delay(0).start(), k.rearWall.scale.y = 1e-5, k.rearWall.visible = !0, new TWEEN.Tween(k.rearWall.scale).to({
        y: 1
    }, 1e3).delay(400).start(), k.rightWall.scale.y = 1e-5, k.rightWall.visible = !0, new TWEEN.Tween(k.rightWall.scale).to({
        y: 1
    }, 1e3).delay(800).start(), k.frontWall.scale.y = 1e-5, k.frontWall.visible = !0, new TWEEN.Tween(k.frontWall.scale).to({
        y: 1
    }, 1e3).delay(1600).start(), k.ceiling.scale.x = 1e-5, k.ceiling.visible = !0, new TWEEN.Tween(k.ceiling.scale).to({
        x: 1
    }, 1e3).delay(1600).start(), k.floor.scale.x = 1e-5, k.floor.visible = !0, new TWEEN.Tween(k.floor.scale).to({
        x: 1
    }, 1e3).delay(1600).start().onComplete(function() {
        j.enabled = !0
    })
}
var g = !1,
    h = "";
var i, j, k, l, m, n, o = !1;
console.warn = function() {}

/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;

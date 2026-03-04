// ═══════════════════════════════════════════════════
//  STRAEGIS — village.js
// ═══════════════════════════════════════════════════

const Village = (() => {

  let scene, camera, renderer, clock;
  let buildingMeshes = {}, wallMeshes = [], towerMeshes = [];
  let animatables = [];
  let battleCamActive = false;
  const camCurrent  = new THREE.Vector3(18, 22, 18);
  const VILLAGE_CAM = new THREE.Vector3(18, 22, 18);
  const BATTLE_CAM  = new THREE.Vector3(0, 16, 22);
  const CAM_LOOK    = new THREE.Vector3(0, 0, 0);

  // ── MATERIALS ──────────────────────────────────
  const M = {};

  function buildMaterials() {
    function lm(color) { return new THREE.MeshLambertMaterial({ color: color }); }
    M.grass    = lm(0x2d4a1e);
    M.grassDk  = lm(0x1e3412);
    M.dirt     = lm(0x5a4a30);
    M.path     = lm(0x7a6a4a);
    M.stone    = lm(0x7a7060);
    M.stoneDk  = lm(0x4a4438);
    M.wood     = lm(0x5a3a1a);
    M.woodDk   = lm(0x3a2010);
    M.roof     = lm(0x3a2a1a);
    M.roofRed  = lm(0x6a2a1a);
    M.iron     = lm(0x4a5a6a);
    M.wall     = lm(0x8a7a60);
    M.towerTop = lm(0x6a5a40);
    M.dark     = lm(0x111418);
    M.gold     = lm(0xc8a84b);

    // Flag — DoubleSide must be set separately
    M.flag = new THREE.MeshLambertMaterial({ color: 0xc8a84b });
    M.flag.side = THREE.DoubleSide;

    // Glass — transparency set separately
    M.glass = new THREE.MeshLambertMaterial({ color: 0x88ccff });
    M.glass.transparent = true;
    M.glass.opacity = 0.55;

    // Flame — emissive set separately (emissive is a Color, use .set())
    M.flame = new THREE.MeshLambertMaterial({ color: 0xff6622 });
    M.flame.emissive.set(0xff3300);
    M.flame.emissiveIntensity = 0.9;

    // Orb — emissive set separately
    M.orb = new THREE.MeshLambertMaterial({ color: 0x44aaff });
    M.orb.emissive.set(0x0044aa);
    M.orb.emissiveIntensity = 0.8;
  }

  // ── INIT ───────────────────────────────────────
  function init(canvas) {
    const W = window.innerWidth;
    const H = window.innerHeight;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e14);
    scene.fog = new THREE.FogExp2(0x0a0e14, 0.024);

    camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.set(18, 22, 18);
    camera.lookAt(CAM_LOOK);

    clock = new THREE.Clock();

    buildMaterials();
    setupLights();
    buildTerrain();
    buildAllBuildings();
    buildWallRing();
    buildDecor();

    Effects.init(scene);

    window.addEventListener('resize', onResize);
    requestAnimationFrame(loop);
  }

  // ── LIGHTS ─────────────────────────────────────
  function setupLights() {
    scene.add(new THREE.AmbientLight(0x334455, 0.9));

    const sun = new THREE.DirectionalLight(0xfff0cc, 1.5);
    sun.position.set(15, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far  = 80;
    sun.shadow.camera.left   = -30;
    sun.shadow.camera.right  =  30;
    sun.shadow.camera.top    =  30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x4466aa, 0.35);
    fill.position.set(-10, 10, -10);
    scene.add(fill);

    const warm = new THREE.DirectionalLight(0xffaa44, 0.2);
    warm.position.set(5, 5, 15);
    scene.add(warm);
  }

  // ── TERRAIN ────────────────────────────────────
  function buildTerrain() {
    const SIZE = 42;
    const gGeo = new THREE.PlaneGeometry(SIZE, SIZE, 40, 40);
    const pos  = gGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      if (Math.sqrt(x * x + y * y) > 7) pos.setZ(i, (Math.random() - 0.5) * 0.12);
    }
    gGeo.computeVertexNormals();
    const ground = new THREE.Mesh(gGeo, M.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const dirt = new THREE.Mesh(new THREE.CircleGeometry(6.5, 48), M.dirt);
    dirt.rotation.x = -Math.PI / 2;
    dirt.position.y = 0.01;
    scene.add(dirt);

    const plaza = new THREE.Mesh(new THREE.CircleGeometry(2.5, 8), M.stone);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.02;
    scene.add(plaza);

    // Cross paths
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, 1.4), M.path);
    ph.rotation.x = -Math.PI / 2; ph.position.y = 0.015;
    scene.add(ph);
    const pv = new THREE.Mesh(new THREE.PlaneGeometry(1.4, SIZE), M.path);
    pv.rotation.x = -Math.PI / 2; pv.position.y = 0.015;
    scene.add(pv);
  }

  // ── HELPERS ────────────────────────────────────
  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }
  function cyl(rt, rb, h, segs, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat);
    m.position.set(x, y, z);
    return m;
  }
  function cone(r, h, segs, mat, x, y, z, ry) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    return m;
  }

  // ── BUILDINGS ──────────────────────────────────
  const BUILDERS = {

    town_hall: function(level) {
      const ms = [];
      const bW = 2.4 + level * 0.15, bD = 2.4 + level * 0.15, bH = 0.9 + level * 0.35;
      ms.push(box(bW + 0.3, 0.25, bD + 0.3, M.stoneDk, 0, 0.125, 0));
      ms.push(box(bW, bH, bD, M.stone, 0, 0.25 + bH / 2, 0));
      const rH = 0.8 + level * 0.15;
      ms.push(cone(Math.max(bW, bD) * 0.72, rH, 4, M.roofRed, 0, 0.25 + bH + rH / 2, 0, Math.PI / 4));
      if (level >= 2) {
        [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(s) {
          const tH = bH * 0.7;
          ms.push(cyl(0.28, 0.28, tH, 6, M.stone, s[0]*(bW/2+0.15), 0.25+tH/2, s[1]*(bD/2+0.15)));
          ms.push(cyl(0.34, 0.28, 0.2, 6, M.stoneDk, s[0]*(bW/2+0.15), 0.25+tH+0.1, s[1]*(bD/2+0.15)));
        });
      }
      const poleH = 1.2 + level * 0.2;
      ms.push(cyl(0.04, 0.04, poleH, 6, M.iron, 0, 0.25 + bH + rH + poleH / 2, 0));
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5 + level * 0.08, 0.28 + level * 0.04), M.flag);
      flag.position.set(0.28 + level * 0.04, 0.25 + bH + rH + poleH - 0.1, 0);
      flag.userData.isFlag = true;
      ms.push(flag);
      return ms;
    },

    barracks: function(level) {
      const ms = [];
      const w = 1.8 + level * 0.2, d = 1.4 + level * 0.1, h = 0.7 + level * 0.25;
      ms.push(box(w + 0.2, 0.2, d + 0.2, M.stoneDk, 0, 0.1, 0));
      ms.push(box(w, h, d, M.wood, 0, 0.2 + h / 2, 0));
      ms.push(box(w + 0.2, 0.15, d / 2, M.roof, 0, 0.2 + h + 0.07, -d / 4));
      ms.push(box(w + 0.2, 0.15, d / 2, M.roof, 0, 0.2 + h + 0.07,  d / 4));
      ms.push(box(0.4, 0.55, 0.08, M.woodDk, 0, 0.2 + 0.275, d / 2 + 0.01));
      return ms;
    },

    armory: function(level) {
      const ms = [];
      const w = 1.8 + level * 0.15, d = 1.6 + level * 0.1, h = 0.8 + level * 0.3;
      ms.push(box(w + 0.25, 0.22, d + 0.25, M.stoneDk, 0, 0.11, 0));
      ms.push(box(w, h, d, M.iron, 0, 0.22 + h / 2, 0));
      ms.push(cone(Math.max(w, d) * 0.65, 0.5 + level * 0.1, 4, M.stoneDk, 0, 0.22 + h + 0.25, 0, Math.PI / 4));
      ms.push(box(0.25, 0.5, 0.25, M.stoneDk, w * 0.3, 0.22 + h + 0.15, 0));
      return ms;
    },

    research_lab: function(level) {
      const ms = [];
      const w = 1.9 + level * 0.1, h = 0.9 + level * 0.25;
      ms.push(box(w + 0.2, 0.2, w + 0.2, M.stoneDk, 0, 0.1, 0));
      ms.push(cyl(w * 0.6, w * 0.6, h, 6, M.iron, 0, 0.2 + h / 2, 0));
      ms.push(cyl(w * 0.5, 0, h * 0.5, 8, M.glass, 0, 0.2 + h + h * 0.25, 0));
      ms.push(cyl(0.03, 0.03, 0.6 + level * 0.15, 6, M.iron, 0, 0.2 + h * 1.5 + 0.3, 0));
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), M.orb);
      orb.position.set(0, 0.2 + h * 1.5 + 0.6 + level * 0.15, 0);
      orb.userData.isOrb = true;
      orb.userData.baseY = orb.position.y;
      ms.push(orb);
      return ms;
    },
  };

  const BPOS = {
    town_hall:    { x: 0,    z: 0    },
    barracks:     { x: -4.5, z: 2.5  },
    armory:       { x: 4.5,  z: 2.5  },
    research_lab: { x: 0,    z: -4.5 },
  };

  function buildAllBuildings() {
    Object.keys(BPOS).forEach(function(id) { buildBuilding(id); });
  }

  function buildBuilding(id) {
    const level = Economy.getBuildingLevel(id);
    if (buildingMeshes[id]) buildingMeshes[id].forEach(function(m) { scene.remove(m); });
    buildingMeshes[id] = [];
    const pos = BPOS[id];
    if (!pos) return;

    if (level === 0) {
      const gm = new THREE.MeshLambertMaterial({ color: 0x334455 });
      gm.transparent = true; gm.opacity = 0.22;
      const def = DATA.BUILDINGS.find(function(b) { return b.id === id; });
      if (!def) return;
      const g = new THREE.Mesh(new THREE.BoxGeometry(def.size.w * 0.9, 0.6, def.size.h * 0.9), gm);
      g.position.set(pos.x, 0.3, pos.z);
      scene.add(g); buildingMeshes[id] = [g];
      return;
    }

    const builder = BUILDERS[id];
    if (!builder) return;
    builder(level).forEach(function(m) {
      m.position.x += pos.x;
      m.position.z += pos.z;
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      buildingMeshes[id].push(m);
    });

    if (id === 'town_hall') {
      const pt = new THREE.PointLight(0xff8833, 1.5, 10);
      pt.position.set(pos.x, 0.5, pos.z);
      scene.add(pt);
      buildingMeshes[id].push(pt);
    }
  }

  // ── WALL RING ──────────────────────────────────
  function buildWallRing() {
    wallMeshes.forEach(function(m) { scene.remove(m); });
    towerMeshes.forEach(function(m) { scene.remove(m); });
    wallMeshes = []; towerMeshes = [];

    const wL = Economy.getBuildingLevel('wall');
    const tL = Economy.getBuildingLevel('tower');
    if (wL === 0) return;

    const R = DATA.TERRAIN.wallRadius;
    const segs = 16;
    const wallH = 0.7 + wL * 0.35;
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x8a7a60 });

    for (let i = 0; i < segs; i++) {
      const a0  = (i / segs) * Math.PI * 2;
      const a1  = ((i + 1) / segs) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      const mx  = Math.cos(mid) * R;
      const mz  = Math.sin(mid) * R;
      const segLen = 2 * R * Math.sin(Math.PI / segs) * 1.05;

      if (i === 0 || i === segs / 2) {
        addGate(mx, mz, mid, wallH);
        continue;
      }

      const wm = new THREE.Mesh(new THREE.BoxGeometry(segLen, wallH, 1.15), wallMat);
      wm.position.set(mx, wallH / 2, mz);
      wm.rotation.y = -mid;
      wm.castShadow = true; wm.receiveShadow = true;
      scene.add(wm); wallMeshes.push(wm);

      // Merlons
      const mCount = Math.floor(segLen / 0.8);
      for (let k = 0; k < mCount; k++) {
        if (k % 2 !== 0) continue;
        const t = (k / mCount - 0.5) * segLen;
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 1.15), wallMat);
        merlon.position.set(mx + Math.cos(mid + Math.PI/2)*t, wallH + 0.14, mz + Math.sin(mid + Math.PI/2)*t);
        merlon.rotation.y = -mid;
        scene.add(merlon); wallMeshes.push(merlon);
      }

      if (i % 4 === 0 && tL > 0) addTower(Math.cos(a0)*(R+0.25), Math.sin(a0)*(R+0.25), tL);
    }
  }

  function addGate(x, z, angle, wallH) {
    const gH = wallH + 0.7;
    const pm = new THREE.MeshLambertMaterial({ color: 0x6a5a3a });
    [-0.9, 0.9].forEach(function(off) {
      const px = x + Math.cos(angle + Math.PI/2)*off;
      const pz = z + Math.sin(angle + Math.PI/2)*off;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, gH, 0.5), pm);
      p.position.set(px, gH / 2, pz); p.castShadow = true;
      scene.add(p); wallMeshes.push(p);
    });
    const arch = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.5), pm);
    arch.position.set(x, gH + 0.1, z); arch.rotation.y = angle;
    scene.add(arch); wallMeshes.push(arch);
    [-0.45, 0.45].forEach(function(off) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.82, gH*0.85, 0.1), M.woodDk);
      door.position.set(x+Math.cos(angle+Math.PI/2)*off, gH*0.425, z+Math.sin(angle+Math.PI/2)*off);
      door.rotation.y = angle;
      scene.add(door); wallMeshes.push(door);
    });
  }

  function addTower(x, z, level) {
    const tH = 1.2 + level * 0.55, tR = 0.55 + level * 0.05;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(tR, tR*1.15, tH, 8), M.wall);
    t.position.set(x, tH/2, z); t.castShadow = true;
    scene.add(t); towerMeshes.push(t);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(tR*1.25, tR, 0.25, 8), M.towerTop);
    cap.position.set(x, tH+0.125, z);
    scene.add(cap); towerMeshes.push(cap);
    addTorch(x + Math.cos(0.5)*tR, z + Math.sin(0.5)*tR, tH + 0.1);
  }

  // ── DECORATIONS ────────────────────────────────
  function buildDecor() {
    scatter(55, 11, 19).forEach(function(p) { addTree(p[0], p[1]); });
    scatter(25, 12, 18).forEach(function(p) { addRock(p[0], p[1]); });
    [[10,0],[0,10],[-10,0],[0,-10]].forEach(function(p) { addTorch(p[0], p[1], 0); });
    addCampfire(-2, 2);
  }

  function scatter(n, min, max) {
    var result = [];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, r = min + Math.random() * (max - min);
      result.push([Math.cos(a)*r, Math.sin(a)*r]);
    }
    return result;
  }

  function addTree(x, z) {
    const tH = 0.4 + Math.random() * 0.7;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, tH, 5), M.wood);
    trunk.position.set(x, tH/2, z); trunk.castShadow = true; scene.add(trunk);
    const layers = 2 + Math.floor(Math.random() * 2);
    for (let l = 0; l < layers; l++) {
      const s = (0.6 - l*0.12) + Math.random()*0.3;
      const c = new THREE.Mesh(new THREE.ConeGeometry(s, s*1.3, 5+l), M.grassDk);
      c.position.set(x, tH + l*s*0.55, z);
      c.rotation.y = Math.random() * Math.PI;
      c.castShadow = true; scene.add(c);
    }
  }

  function addRock(x, z) {
    const s = 0.14 + Math.random() * 0.28;
    const geo = new THREE.SphereGeometry(s, 5, 4); // sphere instead of dodecahedron
    const r = new THREE.Mesh(geo, M.stone);
    r.position.set(x, s*0.35, z);
    r.rotation.set(Math.random()*2, Math.random()*2, Math.random()*2);
    r.castShadow = true; scene.add(r);
  }

  function addTorch(x, z, bY) {
    bY = bY || 0;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), M.wood);
    pole.position.set(x, bY+0.35, z); scene.add(pole);

    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 5), M.flame);
    flame.position.set(x, bY+0.78, z);
    flame.userData.isFlame = true;
    flame.userData.baseY   = bY + 0.78;
    scene.add(flame);

    const light = new THREE.PointLight(0xff7722, 1.0, 5);
    light.position.set(x, bY+0.9, z); scene.add(light);

    const lx = x, lz = z;
    animatables.push(function(t) { light.intensity = 0.8 + Math.sin(t*7 + lx)*0.4; });
    animatables.push(function(t) {
      flame.position.y = flame.userData.baseY + Math.sin(t*6 + lz)*0.05;
      const s = 0.85 + Math.sin(t*9 + lx*2)*0.15;
      flame.scale.set(s, s, s);
    });
  }

  function addCampfire(x, z) {
    for (let i = 0; i < 6; i++) {
      const a = (i/6) * Math.PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), M.wood);
      log.position.set(x+Math.cos(a)*0.22, 0.06, z+Math.sin(a)*0.22);
      log.rotation.z = Math.PI/2; log.rotation.y = a; scene.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), M.flame);
    flame.position.set(x, 0.4, z);
    flame.userData.isFlame = true; flame.userData.baseY = 0.4;
    scene.add(flame);
    const light = new THREE.PointLight(0xff6600, 2.5, 9);
    light.position.set(x, 0.8, z); scene.add(light);
    animatables.push(function(t) { light.intensity = 2.0 + Math.sin(t*5)*0.8; });
    animatables.push(function(t) {
      flame.position.y = 0.4 + Math.sin(t*8)*0.06;
      const s = 0.8 + Math.sin(t*11)*0.2;
      flame.scale.set(s, s, s);
    });
  }

  // ── LOOP ───────────────────────────────────────
  let lastTime = 0;

  function loop(timestamp) {
    requestAnimationFrame(loop);
    const t  = clock.getElapsedTime();
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    for (let i = 0; i < animatables.length; i++) animatables[i](t);

    scene.traverse(function(obj) {
      if (obj.userData.isFlag) {
        obj.rotation.y = Math.sin(t*2 + obj.id*0.3) * 0.15;
        obj.rotation.z = Math.sin(t*2.5 + obj.id*0.3) * 0.08;
      }
      if (obj.userData.isOrb) {
        obj.position.y = obj.userData.baseY + Math.sin(t*2)*0.05;
        obj.material.emissiveIntensity = 0.6 + Math.sin(t*3)*0.4;
      }
    });

    // Camera
    const target = battleCamActive ? BATTLE_CAM : VILLAGE_CAM;
    camCurrent.lerp(target, 0.03);
    camera.position.copy(camCurrent);

    const shake = Effects.consumeShake();
    if (shake > 0) {
      camera.position.x += (Math.random()-0.5) * shake;
      camera.position.y += (Math.random()-0.5) * shake * 0.4;
      camera.position.z += (Math.random()-0.5) * shake;
    }
    camera.lookAt(CAM_LOOK);

    Effects.update(dt);
    renderer.render(scene, camera);
  }

  function onResize() {
    const W = window.innerWidth, H = window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }

  // ── PUBLIC ─────────────────────────────────────
  function onBuildingUpgraded(id, level) {
    if (id === 'wall' || id === 'tower') buildWallRing();
    else buildBuilding(id);
    const pos = BPOS[id];
    if (pos) Effects.spawnExplosion(pos.x, 1.5, pos.z, 0.3);
  }

  function rebuildScene() {
    buildAllBuildings();
    buildWallRing();
  }

  function damageBuilding(id) {
    const pos = BPOS[id];
    if (pos) Effects.spawnBuildingDamage(pos.x, 1.5, pos.z);
    buildBuilding(id);
  }

  return {
    init,
    onBuildingUpgraded,
    rebuildScene,
    damageBuilding,
    enterBattleMode: function() { battleCamActive = true;  },
    exitBattleMode:  function() { battleCamActive = false; },
    getScene:    function() { return scene;    },
    getCamera:   function() { return camera;   },
    getRenderer: function() { return renderer; },
  };

})();

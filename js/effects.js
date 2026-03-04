// ═══════════════════════════════════════════════════
//  STRAEGIS — effects.js  — Particle system only
// ═══════════════════════════════════════════════════

const Effects = (() => {

  const MAX_PARTICLES = 600;
  let particles = [];
  let particleMesh = null;
  let scene = null;
  let shakeIntensity = 0;

  const _dummy = new THREE.Object3D();
  const _color  = new THREE.Color();

  function init(sceneRef) {
    scene = sceneRef;
    const geo = new THREE.SphereGeometry(0.08, 3, 3);
    // Use MeshBasicMaterial without vertexColors — we'll tint via color property
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    particleMesh = new THREE.InstancedMesh(geo, mat, MAX_PARTICLES);
    particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particleMesh.count = 0;
    scene.add(particleMesh);
  }

  // ── SPAWN ──────────────────────────────────────
  function spawnExplosion(x, y, z, intensity) {
    intensity = intensity || 1.0;
    const n = Math.floor(15 * intensity);
    for (let i = 0; i < n; i++) {
      const speed = 1.5 + Math.random() * 3.0 * intensity;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      _push(x, y+0.3, z,
        Math.sin(phi)*Math.cos(theta)*speed,
        Math.cos(phi)*speed*0.8+1.0,
        Math.sin(phi)*Math.sin(theta)*speed,
        0.7+Math.random()*0.7, 0.016+Math.random()*0.012,
        0xff6600, 0x331100, 0.6+Math.random()*0.8*intensity, -3.5);
    }
    shake(0.3 * intensity);
  }

  function spawnDeathEffect(x, z, isHeavy) {
    const n = isHeavy ? 12 : 6;
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.0;
      _push(x, 0.2, z,
        Math.cos(theta)*speed, 1.0+Math.random()*1.5, Math.sin(theta)*speed,
        0.6+Math.random()*0.4, 0.022,
        0xcc1100, 0x440000, 0.2+Math.random()*0.25, -6.0);
    }
  }

  function spawnMuzzleFlash(x, y, z) {
    for (let i = 0; i < 4; i++) {
      const theta = Math.random() * Math.PI * 2;
      _push(x, y, z,
        Math.cos(theta)*1.5, 0.5+Math.random(), Math.sin(theta)*1.5,
        0.25+Math.random()*0.15, 0.06,
        0xffee44, 0xff4400, 0.3+Math.random()*0.2, 0);
    }
  }

  function spawnSparks(x, y, z, n) {
    n = n || 10;
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.0;
      _push(x, y, z,
        Math.cos(theta)*speed, 1.5+Math.random()*2.0, Math.sin(theta)*speed,
        0.4+Math.random()*0.4, 0.03,
        0xffcc00, 0xff2200, 0.1+Math.random()*0.08, -8.0);
    }
  }

  function spawnDust(x, y, z) {
    for (let i = 0; i < 5; i++) {
      _push(x+(Math.random()-0.5)*0.4, y+0.1, z+(Math.random()-0.5)*0.4,
        (Math.random()-0.5)*1.2, 0.4+Math.random()*0.6, (Math.random()-0.5)*1.2,
        0.5+Math.random()*0.3, 0.02,
        0x8a7a5a, 0x3a3020, 0.3+Math.random()*0.35, -0.5);
    }
  }

  function spawnWallHit(x, y, z) {
    spawnSparks(x, y, z, 6);
    spawnDust(x, y, z);
  }

  function spawnBuildingDamage(x, y, z) {
    spawnExplosion(x, y, z, 0.5);
    for (let i = 0; i < 8; i++) {
      const theta = Math.random() * Math.PI * 2;
      _push(x+(Math.random()-0.5)*0.5, y+0.5, z+(Math.random()-0.5)*0.5,
        Math.cos(theta)*(0.5+Math.random()*1.5), 1.0+Math.random()*2.0, Math.sin(theta)*(0.5+Math.random()*1.5),
        0.9+Math.random()*0.6, 0.012,
        0x8a7a60, 0x3a2a10, 0.3+Math.random()*0.4, -4.0);
    }
    shake(0.5);
  }

  function _push(x,y,z, vx,vy,vz, maxLife,decay, cHot,cCold, size,gravity) {
    if (particles.length >= MAX_PARTICLES) return;
    particles.push({ x,y,z, vx,vy,vz, life:1.0, maxLife, decay, cHot, cCold, size, gravity });
  }

  // ── SHAKE ──────────────────────────────────────
  function shake(v) { shakeIntensity = Math.max(shakeIntensity, v); }

  function consumeShake() {
    const v = shakeIntensity;
    shakeIntensity *= 0.85;
    if (shakeIntensity < 0.001) shakeIntensity = 0;
    return v;
  }

  // ── UPDATE ─────────────────────────────────────
  function update(dt) {
    // Update
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.z  += p.vz * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.97;
      p.vz *= 0.97;
      if (p.y < 0) p.y = 0;
    }

    // Render
    if (!particleMesh) return;
    const count = Math.min(particles.length, MAX_PARTICLES);
    particleMesh.count = count;
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const t = Math.max(0, p.life);
      const s = p.size * t;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    particleMesh.instanceMatrix.needsUpdate = true;
  }

  return {
    init, update, shake, consumeShake,
    spawnExplosion, spawnDeathEffect, spawnMuzzleFlash,
    spawnSparks, spawnDust, spawnWallHit, spawnBuildingDamage,
  };

})();

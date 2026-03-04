// ═══════════════════════════════════════════════════
//  STRAEGIS — battle.js
// ═══════════════════════════════════════════════════

const Battle = (() => {

  const TICK_MS  = 80;
  const GEO_UNIT  = new THREE.CylinderGeometry(0.14, 0.14, 0.38, 6);
  const GEO_HEAVY = new THREE.BoxGeometry(0.5, 0.35, 0.7);
  const GEO_AIR   = new THREE.CylinderGeometry(0.35, 0.1, 0.2, 5);
  const GEO_PROJ  = new THREE.SphereGeometry(0.07, 4, 4);

  let active = false;
  let myUnits = [], enemyUnits = [], projectiles = [];
  let wallHp = 0, maxWallHp = 0;
  let tickTimer = null;
  let instanceMeshes = {}, enemyInstanceMeshes = {};
  let projMesh = null;
  let scene = null;
  let towerTimers = [];
  let battleTick = 0;

  const _mat4 = new THREE.Matrix4();
  const _pos  = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _scl  = new THREE.Vector3(1, 1, 1);

  function start() {
    if (active) return;
    const totalArmy = Object.values(Economy.state.army).reduce(function(a,b){return a+b;}, 0);
    if (totalArmy === 0) { UI.log('// No units. Recruit in ARMY tab.', 'bad'); return; }

    scene = Village.getScene();
    active = true;
    battleTick = 0;

    UI.log('// ══════ WAVE ' + Economy.state.wave + ' INITIATED ══════', 'info');
    Village.enterBattleMode();
    setupWall();
    spawnMyArmy();
    spawnEnemyWave();
    setupProjectileMesh();
    setupTowerTimers();

    const btn = document.getElementById('deploy-btn');
    if (btn) btn.disabled = true;
    tickTimer = setInterval(tick, TICK_MS);
    Audio.play('battle_start');
  }

  function setupWall() {
    const wDef = DATA.BUILDINGS.find(function(b){return b.id==='wall';});
    const lvl  = Economy.getBuildingLevel('wall');
    if (lvl > 0) {
      const bonus = Economy.state.stats['wall_hp'] || 0;
      maxWallHp = wDef.hpLevels[lvl] * (1 + bonus);
      wallHp    = maxWallHp;
    } else { wallHp = 0; maxWallHp = 0; }
  }

  function spawnMyArmy() {
    myUnits = [];
    Object.entries(Economy.state.army).forEach(function(entry) {
      const uid = entry[0], count = entry[1];
      if (count <= 0) return;
      const def = DATA.UNITS.find(function(u){return u.id===uid;});
      if (!def) return;
      const atkB = Economy.state.stats[uid+'_atk'] || 0;
      const hpB  = Economy.state.stats[uid+'_hp']  || 0;
      const atk  = def.baseAtk * (1 + atkB);
      const hp   = def.baseHp  * (1 + hpB);
      const geo  = def.isAir ? GEO_AIR : (def.radius > 0.3 ? GEO_HEAVY : GEO_UNIT);
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i/8), col = i%8;
        myUnits.push({
          x: -5 - row*0.8 + (Math.random()-0.5)*0.3,
          z: -3.5 + col*0.9 + (Math.random()-0.5)*0.3,
          hp: hp, maxHp: hp, atk: atk,
          speed: def.speed * (0.9 + Math.random()*0.2),
          groupId: uid, dead: false,
          air: def.isAir || false,
          heavy: def.radius > 0.3,
        });
      }
      buildInstanceMesh(uid, count, def.color, geo, false);
    });
  }

  function spawnEnemyWave() {
    enemyUnits = [];
    const waveDef = DATA.getEnemyWave(Economy.state.wave);
    const wallR   = DATA.TERRAIN.wallRadius;
    const groupMap = {};
    waveDef.forEach(function(g) {
      const key = g.type + (g.fromRight ? '_r' : '_l');
      if (!groupMap[key]) groupMap[key] = { count: 0, color: g.color, radius: g.radius };
      groupMap[key].count += g.count;
    });
    Object.entries(groupMap).forEach(function(entry) {
      const key = entry[0], g = entry[1];
      const geo = g.radius > 0.35 ? GEO_HEAVY : GEO_UNIT;
      buildInstanceMesh(key, g.count, g.color, geo, true);
    });
    waveDef.forEach(function(group) {
      const spawnX = group.fromRight ? wallR+6 : -(wallR+6);
      const key    = group.type + (group.fromRight ? '_r' : '_l');
      for (let i = 0; i < group.count; i++) {
        const row = Math.floor(i/12), col = i%12;
        enemyUnits.push({
          x: spawnX + (group.fromRight ? row : -row)*0.7,
          z: -5.5 + col*0.9 + (Math.random()-0.5)*0.4,
          hp: group.hp, maxHp: group.hp, atk: group.atk,
          speed: group.speed * (0.85 + Math.random()*0.3),
          groupId: key, dead: false,
          fromRight: group.fromRight,
          heavy: group.radius > 0.35,
          wallBreached: false,
        });
      }
    });
    UI.log('// Enemy: ' + enemyUnits.length + ' units inbound on both flanks', 'bad');
  }

  function buildInstanceMesh(gid, count, color, geo, isEnemy) {
    const mat  = new THREE.MeshLambertMaterial({ color: color });
    const mesh = new THREE.InstancedMesh(geo, mat, count + 5);
    mesh.castShadow = true;
    scene.add(mesh);
    if (isEnemy) enemyInstanceMeshes[gid] = mesh;
    else         instanceMeshes[gid]      = mesh;
  }

  function setupProjectileMesh() {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffcc44 });
    projMesh = new THREE.InstancedMesh(GEO_PROJ, mat, 200);
    projMesh.count = 0;
    scene.add(projMesh);
  }

  function setupTowerTimers() {
    towerTimers = [];
    const tLvl = Economy.getBuildingLevel('tower');
    if (tLvl === 0) return;
    const tDef = DATA.BUILDINGS.find(function(b){return b.id==='tower';});
    for (let i = 0; i < 4; i++) {
      towerTimers.push({ cooldown: i*2, atk: tDef.atkLevels[tLvl], idx: i });
    }
  }

  function fireTowers() {
    const alive = enemyUnits.filter(function(e){return !e.dead;});
    if (!alive.length) return;
    const R = DATA.TERRAIN.wallRadius;
    towerTimers.forEach(function(t) {
      t.cooldown--;
      if (t.cooldown > 0) return;
      t.cooldown = 7;
      const a = (t.idx/4) * Math.PI*2;
      const tx = Math.cos(a)*R, tz = Math.sin(a)*R;
      let nearest = null, nearDist = 9999;
      alive.forEach(function(e) {
        const d = Math.hypot(e.x-tx, e.z-tz);
        if (d < nearDist) { nearDist = d; nearest = e; }
      });
      if (nearest && nearDist < 9) {
        nearest.hp -= t.atk;
        if (nearest.hp <= 0) {
          nearest.dead = true;
          Effects.spawnDeathEffect(nearest.x, nearest.z, nearest.heavy);
        } else {
          Effects.spawnSparks(nearest.x, 0.4, nearest.z, 5);
        }
        projectiles.push({ x: tx, y: 1.5, z: tz, tx: nearest.x, ty: 0.3, tz: nearest.z, life: 6 });
      }
    });
  }

  function tick() {
    if (!active) return;
    battleTick++;
    const wallR = DATA.TERRAIN.wallRadius;
    const aliveE = enemyUnits.filter(function(e){return !e.dead;});
    const aliveM = myUnits.filter(function(u){return !u.dead;});

    if (aliveE.length === 0) { endBattle(true); return; }
    if (aliveM.length === 0 && wallHp <= 0) { endBattle(false); return; }

    // Enemy movement
    aliveE.forEach(function(e) {
      if (e.wallBreached || wallHp <= 0 || e.air) {
        const dx = -e.x, dz = -e.z, dist = Math.hypot(dx, dz);
        if (dist > 0.5) { e.x += (dx/dist)*e.speed*(TICK_MS/1000); e.z += (dz/dist)*e.speed*(TICK_MS/1000); }
        if (battleTick%8===0 && Math.random()<0.12) Effects.spawnDust(e.x, 0, e.z);
      } else {
        const dx = -e.x, dz = -e.z, dist = Math.hypot(dx, dz);
        if (dist > wallR + 0.6) {
          e.x += (dx/dist)*e.speed*(TICK_MS/1000);
          e.z += (dz/dist)*e.speed*(TICK_MS/1000);
        } else {
          wallHp -= e.atk * (TICK_MS/1000) * 0.5;
          if (battleTick%5===0) Effects.spawnWallHit(e.x*0.9, 0.8, e.z*0.9);
          if (wallHp <= 0) {
            wallHp = 0; e.wallBreached = true;
            UI.log('// !! WALL BREACHED', 'bad');
            Effects.shake(1.2);
            Audio.play('wall_break');
          }
        }
      }
    });

    // My units attack
    aliveM.forEach(function(u) {
      var target = null, minD = 3.8;
      aliveE.forEach(function(e) {
        const d = Math.hypot(u.x-e.x, u.z-e.z);
        if (d < minD) { minD = d; target = e; }
      });
      if (target) {
        target.hp -= u.atk * (TICK_MS/1000);
        if (battleTick%4===0) Effects.spawnMuzzleFlash(u.x, 0.3, u.z);
        if (target.hp <= 0) {
          target.dead = true;
          Effects.spawnDeathEffect(target.x, target.z, target.heavy);
          Audio.play('enemy_die');
        }
      } else {
        var ne = null, neDist = 9999;
        aliveE.forEach(function(e) {
          const d = Math.hypot(u.x-e.x, u.z-e.z);
          if (d < neDist) { neDist = d; ne = e; }
        });
        if (ne) {
          const dx = ne.x-u.x, dz = ne.z-u.z, dist = Math.hypot(dx, dz);
          if (dist > 0.4) { u.x += (dx/dist)*u.speed*(TICK_MS/1000); u.z += (dz/dist)*u.speed*(TICK_MS/1000); }
        }
      }
    });

    // Enemy attack my units
    aliveE.forEach(function(e) {
      if (!e.wallBreached && wallHp > 0 && !e.air) return;
      var target = null, minD = 2.8;
      myUnits.filter(function(u){return !u.dead;}).forEach(function(u) {
        const d = Math.hypot(e.x-u.x, e.z-u.z);
        if (d < minD) { minD = d; target = u; }
      });
      if (target) {
        target.hp -= e.atk * (TICK_MS/1000);
        if (target.hp <= 0) {
          target.dead = true;
          Effects.spawnDeathEffect(target.x, target.z, target.heavy);
          Audio.play('unit_die');
        }
      }
    });

    fireTowers();

    // Projectile update
    for (let i = projectiles.length-1; i >= 0; i--) {
      const p = projectiles[i];
      p.life--;
      p.x += (p.tx - p.x) * 0.4;
      p.y += (p.ty - p.y) * 0.4;
      p.z += (p.tz - p.z) * 0.4;
      if (p.life <= 0) projectiles.splice(i, 1);
    }

    // Spectacle explosions
    if (battleTick%18===0 && aliveE.length>0 && Math.random()<0.3) {
      const e = aliveE[Math.floor(Math.random()*aliveE.length)];
      Effects.spawnExplosion(e.x, 0.2, e.z, 0.35);
    }

    updateInstances();

    if (battleTick%8===0) {
      const aE = aliveE.length, aM = myUnits.filter(function(u){return !u.dead;}).length;
      UI.log('// Enemy: ' + aE + '  Allies: ' + aM + '  Wall: ' + (wallHp > 0 ? Math.round(wallHp)+'HP' : 'BREACHED'), aM > aE ? 'good' : 'bad');
    }
  }

  function updateInstances() {
    // My units
    const myGroups = {};
    myUnits.forEach(function(u) { if (!myGroups[u.groupId]) myGroups[u.groupId]=[]; myGroups[u.groupId].push(u); });
    Object.entries(myGroups).forEach(function(entry) {
      const gid = entry[0], units = entry[1];
      const mesh = instanceMeshes[gid]; if (!mesh) return;
      let idx = 0;
      units.forEach(function(u) {
        if (u.dead) return;
        _pos.set(u.x, u.air ? 1.4 : 0.19, u.z);
        _mat4.compose(_pos, _quat, _scl);
        mesh.setMatrixAt(idx++, _mat4);
      });
      mesh.count = idx;
      mesh.instanceMatrix.needsUpdate = true;
    });

    // Enemies
    const enGroups = {};
    enemyUnits.forEach(function(u) { if (!enGroups[u.groupId]) enGroups[u.groupId]=[]; enGroups[u.groupId].push(u); });
    Object.entries(enGroups).forEach(function(entry) {
      const gid = entry[0], units = entry[1];
      const mesh = enemyInstanceMeshes[gid]; if (!mesh) return;
      let idx = 0;
      units.forEach(function(u) {
        if (u.dead) return;
        _pos.set(u.x, 0.19, u.z);
        _mat4.compose(_pos, _quat, _scl);
        mesh.setMatrixAt(idx++, _mat4);
      });
      mesh.count = idx;
      mesh.instanceMatrix.needsUpdate = true;
    });

    // Projectiles
    if (projMesh) {
      const cnt = Math.min(projectiles.length, 200);
      for (let i = 0; i < cnt; i++) {
        _pos.set(projectiles[i].x, projectiles[i].y, projectiles[i].z);
        _mat4.compose(_pos, _quat, _scl);
        projMesh.setMatrixAt(i, _mat4);
      }
      projMesh.count = cnt;
      projMesh.instanceMatrix.needsUpdate = true;
    }
  }

  function endBattle(victory) {
    active = false;
    clearInterval(tickTimer); tickTimer = null;
    Object.values(instanceMeshes).forEach(function(m)      { m.count=0; scene.remove(m); });
    Object.values(enemyInstanceMeshes).forEach(function(m) { m.count=0; scene.remove(m); });
    if (projMesh) { scene.remove(projMesh); projMesh = null; }
    instanceMeshes = {}; enemyInstanceMeshes = {};
    const btn = document.getElementById('deploy-btn');
    if (btn) btn.disabled = false;
    Village.exitBattleMode();

    if (victory) {
      UI.log('// ✓ VICTORY — Wave ' + Economy.state.wave + ' repelled!', 'good');
      Audio.play('victory');
      Economy.onWaveVictory();
      Save.save();
      UI.showResult('win', Economy.state.wave - 1);
    } else {
      UI.log('// ✗ DEFEAT — Village breached.', 'bad');
      Audio.play('defeat');
      Economy.onWaveDefeat();
      Save.save();
      UI.showResult('lose', Economy.state.bestWave);
    }
  }

  return {
    start: start,
    get active() { return active; }
  };

})();

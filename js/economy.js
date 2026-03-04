// ═══════════════════════════════════════════════════
//  STRAEGIS — economy.js
// ═══════════════════════════════════════════════════

const Economy = (() => {

  const state = {
    resources: { wood: 50, iron: 20, medals: 0 },
    wave: 1,
    bestWave: 0,
    buildings: {},
    research: {},
    army: {},
    stats: {},
  };

  DATA.BUILDINGS.forEach(b => {
    state.buildings[b.id] = { level: b.id === 'town_hall' ? 1 : 0 };
  });
  DATA.RESEARCH.forEach(r => { state.research[r.id] = { level: 0 }; });
  DATA.UNITS.forEach(u => { state.army[u.id] = 0; });

  // ── RESOURCES ──────────────────────────────────
  function canAfford(cost) {
    return Object.entries(cost).every(([k,v]) => (state.resources[k]||0) >= v);
  }

  function spend(cost) {
    if (!canAfford(cost)) return false;
    Object.entries(cost).forEach(([k,v]) => state.resources[k] -= v);
    UI.updateResources();
    return true;
  }

  function earn(rewards) {
    Object.entries(rewards).forEach(([k,v]) => {
      state.resources[k] = (state.resources[k]||0) + v;
    });
    UI.updateResources();
  }

  // ── BUILDINGS ──────────────────────────────────
  function getBuildingLevel(id) {
    return state.buildings[id]?.level || 0;
  }

  function canUpgradeBuilding(id) {
    const def = DATA.BUILDINGS.find(b => b.id === id);
    if (!def) return false;
    const cur = getBuildingLevel(id);
    if (cur >= def.maxLevel) return false;
    const cost = def.costs[cur + 1];
    if (!cost) return false;
    if (def.requiresBuilding && getBuildingLevel(def.requiresBuilding.id) < def.requiresBuilding.level) return false;
    return canAfford(cost);
  }

  function upgradeBuilding(id) {
    const def = DATA.BUILDINGS.find(b => b.id === id);
    if (!def) return false;
    const cur = getBuildingLevel(id);
    if (cur >= def.maxLevel) return false;
    if (!spend(def.costs[cur + 1])) return false;
    state.buildings[id].level = cur + 1;
    Village.onBuildingUpgraded(id, cur + 1);
    UI.renderBuildPanel();
    UI.renderResearchPanel();
    UI.renderArmyPanel();
    return true;
  }

  // ── RESEARCH ───────────────────────────────────
  function getResearchLevel(id) {
    return state.research[id]?.level || 0;
  }

  function canResearch(id) {
    const def = DATA.RESEARCH.find(r => r.id === id);
    if (!def) return false;
    const cur = getResearchLevel(id);
    if (cur >= def.maxLevel) return false;
    const cost = def.costs[cur + 1];
    if (!cost) return false;
    if (def.requiresBuilding && getBuildingLevel(def.requiresBuilding.id) < def.requiresBuilding.level) return false;
    return canAfford(cost);
  }

  function doResearch(id) {
    const def = DATA.RESEARCH.find(r => r.id === id);
    if (!def) return false;
    const cur = getResearchLevel(id);
    if (cur >= def.maxLevel) return false;
    if (!spend(def.costs[cur + 1])) return false;
    state.research[id].level = cur + 1;
    recomputeStats();
    UI.renderResearchPanel();
    UI.renderArmyPanel();
    return true;
  }

  function recomputeStats() {
    state.stats = {};
    DATA.RESEARCH.forEach(def => {
      const lvl = getResearchLevel(def.id);
      if (lvl > 0 && def.effect) {
        state.stats[def.effect.stat] = (state.stats[def.effect.stat]||0) + def.effect.perLevel * lvl;
      }
    });
  }

  // ── ARMY ───────────────────────────────────────
  function canBuyUnit(id) {
    const def = DATA.UNITS.find(u => u.id === id);
    if (!def) return false;
    if (def.requiresBuilding && getBuildingLevel(def.requiresBuilding.id) < def.requiresBuilding.level) return false;
    if (def.requiresResearch && getResearchLevel(def.requiresResearch) < 1) return false;
    return canAfford(def.cost);
  }

  function buyUnit(id) {
    const def = DATA.UNITS.find(u => u.id === id);
    if (!def || !canBuyUnit(id)) return false;
    if (!spend(def.cost)) return false;
    state.army[id] = (state.army[id]||0) + def.batchSize;
    UI.renderArmyPanel();
    return true;
  }

  // ── WAVE ───────────────────────────────────────
  function onWaveVictory() {
    earn(DATA.WAVE_REWARD);
    if (state.wave > state.bestWave) state.bestWave = state.wave;
    state.wave++;
    UI.floatText('WAVE CLEAR  +' + DATA.WAVE_REWARD.wood + '🪵  +' + DATA.WAVE_REWARD.iron + '⚙️  +' + DATA.WAVE_REWARD.medals + '🏅');
    const wn = document.getElementById('wave-num');
    if (wn) wn.textContent = state.wave;
  }

  function onWaveDefeat() {
    if (state.wave > state.bestWave) state.bestWave = state.wave;
    DATA.BUILDINGS.forEach(b => {
      if ((b.isDefense || b.id === 'town_hall') && state.buildings[b.id].level > 0) {
        state.buildings[b.id].level = Math.max(0, state.buildings[b.id].level - 1);
      }
    });
    DATA.UNITS.forEach(u => { state.army[u.id] = 0; });
    state.wave = 1;
    Village.rebuildScene();
    UI.renderBuildPanel();
    UI.renderArmyPanel();
    const wn = document.getElementById('wave-num');
    if (wn) wn.textContent = state.wave;
  }

  return {
    state,
    canAfford, spend, earn,
    getBuildingLevel, canUpgradeBuilding, upgradeBuilding,
    getResearchLevel, canResearch, doResearch,
    canBuyUnit, buyUnit,
    onWaveVictory, onWaveDefeat,
  };

})();

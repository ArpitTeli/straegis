// ═══════════════════════════════════════════════════
//  STRAEGIS — save.js
//  Persists economy + habit state to localStorage
// ═══════════════════════════════════════════════════

const Save = (() => {

  const KEY = 'straegis_v2';

  function save() {
    try {
      const e = Economy.state;
      const h = Habits.state;
      localStorage.setItem(KEY, JSON.stringify({
        // Economy
        resources: { ...e.resources },
        wave:      e.wave,
        bestWave:  e.bestWave,
        buildings: JSON.parse(JSON.stringify(e.buildings)),
        research:  JSON.parse(JSON.stringify(e.research)),
        army:      { ...e.army },
        // Habits
        habits:        h.habits,
        tasks:         h.tasks,
        history:       h.history,
        lastSeenDate:  h.lastSeenDate,
        savedAt:       Date.now(),
      }));
    } catch(e) { console.warn('Save failed:', e); }
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const p = JSON.parse(raw);

      // Economy
      const e = Economy.state;
      if (p.resources) Object.assign(e.resources, p.resources);
      if (p.wave)      e.wave     = p.wave;
      if (p.bestWave)  e.bestWave = p.bestWave;
      if (p.buildings) Object.entries(p.buildings).forEach(([id,v]) => { if (e.buildings[id]) Object.assign(e.buildings[id], v); });
      if (p.research)  Object.entries(p.research).forEach(([id,v])  => { if (e.research[id])  Object.assign(e.research[id],  v); });
      if (p.army)      Object.assign(e.army, p.army);

      // Habits
      const h = Habits.state;
      if (p.habits)       h.habits       = p.habits;
      if (p.tasks)        h.tasks        = p.tasks;
      if (p.history)      h.history      = p.history;
      if (p.lastSeenDate) h.lastSeenDate = p.lastSeenDate;

      return true;
    } catch(e) { console.warn('Load failed:', e); return false; }
  }

  function clear() { localStorage.removeItem(KEY); }

  return { save, load, clear };

})();

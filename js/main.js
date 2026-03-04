// ═══════════════════════════════════════════════════
//  STRAEGIS — main.js
// ═══════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {

  // Size canvas before anything else
  var canvas = document.getElementById('game-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    var container = document.getElementById('game-container');
    if (container) container.insertBefore(canvas, container.firstChild);
    else document.body.insertBefore(canvas, document.body.firstChild);
  }
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  // Load save
  var hasSave = Save.load();

  // Init 3D scene
  Village.init(canvas);

  // Init UI
  UI.init();

  // Day rollover check
  var rolledOver = Habits.checkDayRollover();

  // Sync wave display
  var wn = document.getElementById('wave-num');
  var bw = document.getElementById('best-wave-num');
  if (wn) wn.textContent = Economy.state.wave;
  if (bw) bw.textContent = Economy.state.bestWave || 0;

  // Re-render after rollover
  UI.renderHabitsPanel();

  // Log
  UI.log('// STRAEGIS — ONLINE', 'info');
  if (hasSave) UI.log('// Save loaded. Wave ' + Economy.state.wave + '.', 'good');
  else         UI.log('// New campaign. Build and track your habits.', '');
  if (rolledOver) UI.showNewDay();

  var ec = DATA.getEnemyWave(Economy.state.wave).reduce(function(t,g){return t+g.count;}, 0);
  UI.log('// Wave ' + Economy.state.wave + ' — ' + ec + ' enemies waiting.', 'bad');

  // Auto-save
  setInterval(function() { Save.save(); }, 60000);
  window.addEventListener('beforeunload', function() { Save.save(); });

  // Midnight check
  setInterval(function() {
    var rolled = Habits.checkDayRollover();
    if (rolled) {
      UI.renderHabitsPanel();
      UI.showNewDay();
      var wne = document.getElementById('wave-num');
      if (wne) wne.textContent = Economy.state.wave;
    }
  }, 60000);

  // Resize
  window.addEventListener('resize', function() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });

});

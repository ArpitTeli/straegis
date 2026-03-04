// ═══════════════════════════════════════════════════
//  STRAEGIS — ui.js
// ═══════════════════════════════════════════════════

const UI = (() => {

  function init() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-pane').forEach(function(p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      });
    });

    document.getElementById('deploy-btn').addEventListener('click', function() { Battle.start(); });
    document.getElementById('result-btn').addEventListener('click', function() {
      document.getElementById('result-overlay').classList.add('hidden');
    });
    document.getElementById('add-modal-backdrop').addEventListener('click', function(e) {
      if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById('add-item-btn').addEventListener('click', openModal);

    document.querySelectorAll('.modal-type-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.modal-type-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('schedule-section').style.display =
          btn.dataset.type === 'habit' ? 'block' : 'none';
      });
    });

    document.getElementById('schedule-type').addEventListener('change', renderScheduleOptions);
    document.getElementById('modal-submit-btn').addEventListener('click', submitModal);

    updateResources();
    renderHabitsPanel();
    renderBuildPanel();
    renderResearchPanel();
    renderArmyPanel();
  }

  // ── RESOURCES ──────────────────────────────────
  function updateResources() {
    const r = Economy.state.resources;
    document.getElementById('wood-val').textContent   = r.wood   || 0;
    document.getElementById('iron-val').textContent   = r.iron   || 0;
    document.getElementById('medals-val').textContent = r.medals || 0;
    const bw = document.getElementById('best-wave-num');
    if (bw) bw.textContent = Economy.state.bestWave || 0;
  }

  // ── HABITS PANEL ───────────────────────────────
  function renderHabitsPanel() {
    const container = document.getElementById('habits-container');
    if (!container) return;
    container.innerHTML = '';

    const habits = Habits.state.habits;
    const tasks  = Habits.state.tasks;

    // Progress bar
    const dueHabits  = habits.filter(function(h) { return !h.paused && Habits.isDueToday(h); });
    const doneHabits = dueHabits.filter(function(h) { return h.doneToday; }).length;
    const doneTasks  = tasks.filter(function(t) { return t.done; }).length;
    const totalToday = dueHabits.length + tasks.length;
    const doneToday  = doneHabits + doneTasks;
    const pct        = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

    container.innerHTML +=
      '<div class="today-progress">' +
        '<div class="today-progress-header">' +
          '<span class="today-label">TODAY — ' + new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}) + '</span>' +
          '<span class="today-pct">' + pct + '%</span>' +
        '</div>' +
        '<div class="today-bar-bg"><div class="today-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="today-counts">' + doneToday + ' / ' + totalToday + ' completed</div>' +
      '</div>';

    // Habits
    if (habits.length > 0) {
      container.innerHTML += '<div class="section-label">HABITS <span class="section-count">' + habits.length + '/10</span></div>';
      habits.forEach(function(h) {
        const due      = !h.paused && Habits.isDueToday(h);
        const reward   = Habits.calcReward(h.streak + 1);
        const cat      = Habits.CATEGORY[h.category];
        const schedLbl = Habits.scheduleLabel(h.schedule);
        const bonus    = h.streak >= 1 ? '+' + Math.round(Math.log10(h.streak+1)*100) + '%' : '';
        const classes  = 'habit-card' + (h.doneToday?' done':'') + (h.paused?' paused':'') + (!due&&!h.paused&&!h.doneToday?' not-due':'');
        container.innerHTML +=
          '<div class="' + classes + '" onclick="UI.handleHabitClick(' + h.id + ')">' +
            '<div class="habit-card-left"><div class="habit-check-box' + (h.doneToday?' checked':'') + '">' + (h.doneToday?'✓':'') + '</div></div>' +
            '<div class="habit-card-body">' +
              '<div class="habit-card-top">' +
                '<span class="habit-cat-dot" style="color:' + cat.color + '">' + cat.icon + '</span>' +
                '<span class="habit-name">' + h.name + '</span>' +
                (h.paused ? '<span class="paused-badge">PAUSED</span>' : '') +
                (!due&&!h.paused&&!h.doneToday ? '<span class="not-due-badge">NOT DUE</span>' : '') +
              '</div>' +
              '<div class="habit-card-meta">' +
                '<span class="habit-schedule">' + schedLbl + '</span>' +
                '<span class="habit-streak">🔥 ' + h.streak + (bonus?' <span class="streak-bonus">'+bonus+'</span>':'') + '</span>' +
                '<span class="habit-reward">+' + reward + ' ' + (cat.resource==='iron'?'⚙️':'🪵') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="habit-card-actions">' +
              '<button class="habit-action-btn" onclick="event.stopPropagation();UI.pauseHabit(' + h.id + ')">' + (h.paused?'▶':'⏸') + '</button>' +
              '<button class="habit-action-btn danger" onclick="event.stopPropagation();UI.deleteHabit(' + h.id + ')">✕</button>' +
            '</div>' +
          '</div>';
      });
    }

    // Tasks
    if (tasks.length > 0) {
      container.innerHTML += '<div class="section-label" style="margin-top:10px;">ONE-TIME TASKS</div>';
      tasks.forEach(function(t) {
        const cat = Habits.CATEGORY[t.category];
        container.innerHTML +=
          '<div class="habit-card' + (t.done?' done':'') + '" onclick="UI.handleTaskClick(' + t.id + ')">' +
            '<div class="habit-card-left"><div class="habit-check-box' + (t.done?' checked':'') + '">' + (t.done?'✓':'') + '</div></div>' +
            '<div class="habit-card-body">' +
              '<div class="habit-card-top">' +
                '<span class="habit-cat-dot" style="color:' + cat.color + '">' + cat.icon + '</span>' +
                '<span class="habit-name">' + t.name + '</span>' +
                '<span class="task-badge">TASK</span>' +
              '</div>' +
              '<div class="habit-card-meta"><span class="habit-reward">+' + Habits.BASE_REWARD + ' ' + (cat.resource==='iron'?'⚙️':'🪵') + '</span></div>' +
            '</div>' +
            '<div class="habit-card-actions">' +
              '<button class="habit-action-btn danger" onclick="event.stopPropagation();UI.deleteTask(' + t.id + ')">✕</button>' +
            '</div>' +
          '</div>';
      });
    }

    if (habits.length === 0 && tasks.length === 0) {
      container.innerHTML += '<div class="empty-state">No habits or tasks yet.<br>Hit + ADD to get started.</div>';
    }

    renderHeatmap(container);
  }

  function renderHeatmap(container) {
    const data = Habits.getHeatmapData();
    let html = '<div class="heatmap-section"><div class="section-label" style="margin-top:12px;">WEEKLY HISTORY</div>';
    html += '<div class="heatmap-day-labels">';
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(function(d) { html += '<span>' + d + '</span>'; });
    html += '</div><div class="heatmap-grid">';
    data.forEach(function(week) {
      [1,2,3,4,5,6,0].forEach(function(dow) {
        const day = week.find(function(d) { return new Date(d.date).getDay() === dow; });
        if (!day || day.isFuture) { html += '<div class="heatmap-cell" style="background:var(--border)"></div>'; return; }
        const pct = day.total > 0 ? day.completed / day.total : -1;
        const col = pct < 0 ? '#1a2830' : pct === 0 ? '#4a1a1a' : pct < 0.5 ? '#6a4a1a' : pct < 1 ? '#4a6a2a' : '#2a8a3a';
        html += '<div class="heatmap-cell' + (day.isToday?' today':'') + '" style="background:' + col + '" title="' + day.date + ': ' + day.completed + '/' + day.total + '"></div>';
      });
    });
    html += '</div><div class="heatmap-legend"><span style="color:#2a8a3a">●</span> 100% &nbsp;<span style="color:#4a1a1a">●</span> 0% &nbsp;<span style="color:#1a2830">●</span> No habits</div></div>';
    container.innerHTML += html;
  }

  // ── HABIT INTERACTIONS ─────────────────────────
  function handleHabitClick(id) {
    const h = Habits.state.habits.find(function(x){return x.id===id;});
    if (!h || h.paused) return;
    if (!Habits.isDueToday(h) && !h.doneToday) return;
    if (h.doneToday) {
      Habits.uncompleteHabit(id);
    } else {
      const result = Habits.completeHabit(id);
      if (result) {
        floatText('+' + result.reward + ' ' + (result.resource==='iron'?'⚙️':'🪵') + '  🔥' + result.streak);
        Audio.play('task_complete');
      }
    }
    renderHabitsPanel();
  }

  function handleTaskClick(id) {
    const t = Habits.state.tasks.find(function(x){return x.id===id;});
    if (!t) return;
    if (t.done) {
      Habits.uncompleteTask(id);
    } else {
      const result = Habits.completeTask(id);
      if (result) {
        floatText('+' + result.reward + ' ' + (result.resource==='iron'?'⚙️':'🪵'));
        Audio.play('task_complete');
      }
    }
    renderHabitsPanel();
  }

  function pauseHabit(id)  { Habits.togglePause(id); renderHabitsPanel(); }
  function deleteHabit(id) { if (confirm('Delete habit? Streak will be lost.')) { Habits.deleteHabit(id); renderHabitsPanel(); } }
  function deleteTask(id)  { Habits.deleteTask(id); renderHabitsPanel(); }

  // ── MODAL ──────────────────────────────────────
  function openModal() {
    document.getElementById('add-modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-name').value = '';
    document.getElementById('schedule-section').style.display = 'block';
    document.querySelectorAll('.modal-type-btn').forEach(function(b,i) { b.classList.toggle('active', i===0); });
    document.getElementById('schedule-type').value = 'daily';
    renderScheduleOptions();
  }

  function closeModal() {
    document.getElementById('add-modal-backdrop').classList.add('hidden');
  }

  function renderScheduleOptions() {
    const type = document.getElementById('schedule-type').value;
    const opts = document.getElementById('schedule-options');
    opts.innerHTML = '';
    if (type === 'days_of_week') {
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      opts.innerHTML = '<div class="dow-picker">' + days.map(function(d,i) {
        return '<label class="dow-label"><input type="checkbox" class="dow-cb" value="' + i + '" ' + ([1,2,3,4,5].includes(i)?'checked':'') + '/><span>' + d + '</span></label>';
      }).join('') + '</div>';
    } else if (type === 'times_per_week') {
      opts.innerHTML = '<div class="opt-row"><label>Times per week</label><input type="number" id="times-per-week" min="1" max="7" value="3" class="num-input"/></div>';
    } else if (type === 'every_n_days') {
      opts.innerHTML = '<div class="opt-row"><label>Every</label><input type="number" id="every-n" min="2" max="30" value="2" class="num-input"/><label>days</label></div>';
    }
  }

  function submitModal() {
    const name     = document.getElementById('modal-name').value.trim();
    const category = document.getElementById('modal-category').value;
    const typeBtn  = document.querySelector('.modal-type-btn.active');
    const itemType = typeBtn ? typeBtn.dataset.type : 'habit';
    if (!name) { document.getElementById('modal-name').focus(); return; }
    if (itemType === 'task') {
      Habits.addTask({ name: name, category: category });
    } else {
      const schedType = document.getElementById('schedule-type').value;
      const schedule  = { type: schedType };
      if (schedType === 'days_of_week') {
        const checked = Array.from(document.querySelectorAll('.dow-cb:checked')).map(function(c){return parseInt(c.value);});
        if (!checked.length) { alert('Select at least one day.'); return; }
        schedule.days = checked;
      } else if (schedType === 'times_per_week') {
        schedule.timesPerWeek = parseInt(document.getElementById('times-per-week').value) || 3;
      } else if (schedType === 'every_n_days') {
        schedule.everyNDays = parseInt(document.getElementById('every-n').value) || 2;
      }
      Habits.addHabit({ name: name, category: category, schedule: schedule });
    }
    closeModal();
    renderHabitsPanel();
    Audio.play('build_complete');
  }

  // ── BUILD / RESEARCH / ARMY ────────────────────
  function renderBuildPanel() {
    const grid = document.getElementById('build-grid');
    grid.innerHTML = '';
    DATA.BUILDINGS.forEach(function(def) {
      const level = Economy.getBuildingLevel(def.id);
      const maxed = level >= def.maxLevel;
      const cost  = !maxed ? def.costs[level+1] : null;
      let reqText = '';
      if (def.requiresBuilding && !maxed) {
        if (Economy.getBuildingLevel(def.requiresBuilding.id) < def.requiresBuilding.level) {
          const rd = DATA.BUILDINGS.find(function(b){return b.id===def.requiresBuilding.id;});
          reqText = 'Requires ' + rd.name + ' Lv' + def.requiresBuilding.level;
        }
      }
      const can = Economy.canUpgradeBuilding(def.id);
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML =
        '<div class="card-header"><div class="card-icon">' + def.icon + '</div><div>' +
          '<div class="card-name">' + def.name + '</div>' +
          '<div class="card-level">Lv ' + level + '/' + def.maxLevel + '</div>' +
        '</div></div>' +
        '<div class="card-desc">' + def.desc + '</div>' +
        (cost ? '<div class="card-cost">🪵' + (cost.wood||0) + ' ⚙️' + (cost.iron||0) + (cost.medals?' 🏅'+cost.medals:'') + '</div>' : '') +
        (reqText ? '<div class="card-cost" style="color:var(--red)">' + reqText + '</div>' : '') +
        '<button class="card-btn' + (maxed?' maxed':'') + '" ' + (maxed||!can?'disabled':'') +
          ' onclick="if(Economy.upgradeBuilding(\'' + def.id + '\')){Audio.play(\'build_complete\');UI.renderBuildPanel();UI.renderResearchPanel();UI.renderArmyPanel();}">' +
          (maxed?'MAX LEVEL':level===0?'BUILD':'UPGRADE → Lv'+(level+1)) +
        '</button>';
      grid.appendChild(card);
    });
  }

  function renderResearchPanel() {
    const grid = document.getElementById('research-grid'); grid.innerHTML = '';
    DATA.RESEARCH.forEach(function(def) {
      const level = Economy.getResearchLevel(def.id);
      const maxed = level >= def.maxLevel;
      const cost  = !maxed ? def.costs[level+1] : null;
      let reqText = '';
      if (def.requiresBuilding && !maxed) {
        if (Economy.getBuildingLevel(def.requiresBuilding.id) < def.requiresBuilding.level) {
          const rd = DATA.BUILDINGS.find(function(b){return b.id===def.requiresBuilding.id;});
          reqText = 'Requires ' + rd.name + ' Lv' + def.requiresBuilding.level;
        }
      }
      const can = Economy.canResearch(def.id);
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML =
        '<div class="card-header"><div class="card-icon">' + def.icon + '</div><div>' +
          '<div class="card-name">' + def.name + '</div>' +
          '<div class="card-level">Lv ' + level + '/' + def.maxLevel + '</div>' +
        '</div></div>' +
        '<div class="card-desc">' + def.desc + '</div>' +
        (cost ? '<div class="card-cost">⚙️' + (cost.iron||0) + (cost.medals?' 🏅'+cost.medals:'') + '</div>' : '') +
        (reqText ? '<div class="card-cost" style="color:var(--red)">' + reqText + '</div>' : '') +
        '<button class="card-btn' + (maxed?' maxed':'') + '" ' + (maxed||!can?'disabled':'') +
          ' onclick="if(Economy.doResearch(\'' + def.id + '\')){Audio.play(\'build_complete\');UI.renderResearchPanel();}">' +
          (maxed?'COMPLETED':level===0?'RESEARCH':'UPGRADE → Lv'+(level+1)) +
        '</button>';
      grid.appendChild(card);
    });
  }

  function renderArmyPanel() {
    const grid = document.getElementById('army-grid'); grid.innerHTML = '';
    DATA.UNITS.forEach(function(def) {
      const owned = Economy.state.army[def.id] || 0;
      let reqText = '';
      if (def.requiresBuilding && Economy.getBuildingLevel(def.requiresBuilding.id) < def.requiresBuilding.level) {
        const bd = DATA.BUILDINGS.find(function(b){return b.id===def.requiresBuilding.id;});
        reqText = 'Requires ' + bd.name + ' Lv' + def.requiresBuilding.level;
      }
      if (def.requiresResearch && Economy.getResearchLevel(def.requiresResearch) < 1) {
        const rd = DATA.RESEARCH.find(function(r){return r.id===def.requiresResearch;});
        reqText = 'Requires: ' + (rd ? rd.name : def.requiresResearch);
      }
      const can = Economy.canBuyUnit(def.id);
      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML =
        '<div class="card-header"><div class="card-icon">' + def.icon + '</div><div>' +
          '<div class="card-name">' + def.name + '</div>' +
          '<div class="card-level">' + owned + ' in reserve</div>' +
        '</div></div>' +
        '<div class="card-desc">' + def.desc + '<br>ATK:' + def.baseAtk + ' HP:' + def.baseHp + ' SPD:' + def.speed + (def.isAir?' ✈AIR':'') + '</div>' +
        '<div class="card-cost">🪵' + def.cost.wood + ' ⚙️' + def.cost.iron + ' — ×' + def.batchSize + '</div>' +
        (reqText ? '<div class="card-cost" style="color:var(--red)">' + reqText + '</div>' : '') +
        '<button class="card-btn" ' + (!can?'disabled':'') +
          ' onclick="if(Economy.buyUnit(\'' + def.id + '\')){Audio.play(\'buy_unit\');UI.renderArmyPanel();}">RECRUIT ×' + def.batchSize + '</button>';
      grid.appendChild(card);
    });
  }

  // ── BATTLE LOG ─────────────────────────────────
  function log(msg, cls) {
    const panel = document.getElementById('battle-log');
    if (!panel) return;
    const line = document.createElement('div');
    line.className = 'log-line' + (cls ? ' ' + cls : '');
    line.textContent = msg;
    panel.appendChild(line);
    panel.scrollTop = panel.scrollHeight;
    while (panel.children.length > 50) panel.removeChild(panel.firstChild);
  }

  // ── RESULT ─────────────────────────────────────
  function showResult(type, waveNum) {
    const overlay = document.getElementById('result-overlay');
    const title   = document.getElementById('result-title');
    const sub     = document.getElementById('result-sub');
    const btn     = document.getElementById('result-btn');
    overlay.classList.remove('hidden');
    if (type === 'win') {
      title.textContent = 'VICTORY'; title.className = 'win';
      sub.innerHTML = 'Wave ' + waveNum + ' repelled.<br>Wave ' + (waveNum+1) + ' will be 18% stronger.';
      btn.textContent = 'PREPARE FOR WAVE ' + (waveNum+1); btn.className = 'win-btn';
    } else {
      title.textContent = 'DEFEATED'; title.className = 'lose';
      sub.innerHTML = 'Village breached.<br>Best wave: ' + waveNum + '.';
      btn.textContent = 'REBUILD'; btn.className = 'lose-btn';
    }
    const wn = document.getElementById('wave-num');
    const bw = document.getElementById('best-wave-num');
    if (wn) wn.textContent = Economy.state.wave;
    if (bw) bw.textContent = Economy.state.bestWave;
  }

  // ── FLOAT TEXT ─────────────────────────────────
  function floatText(msg) {
    const el = document.createElement('div');
    el.className   = 'float-text';
    el.textContent = msg;
    el.style.left  = (30 + Math.random()*200) + 'px';
    el.style.top   = (window.innerHeight - 320) + 'px';
    document.body.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 1400);
  }

  function showNewDay() {
    log('// ═══ NEW DAY — habits reset ═══', 'info');
    log('// Wave ' + Economy.state.wave + ' is waiting.', 'bad');
  }

  return {
    init,
    updateResources,
    renderHabitsPanel,
    renderBuildPanel,
    renderResearchPanel,
    renderArmyPanel,
    handleHabitClick,
    handleTaskClick,
    pauseHabit,
    deleteHabit,
    deleteTask,
    openModal,
    closeModal,
    log,
    showResult,
    floatText,
    showNewDay,
  };

})();

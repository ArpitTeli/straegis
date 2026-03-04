// ═══════════════════════════════════════════════════
//  STRAEGIS — habits.js
//  The real heart of the app.
//  Habits (recurring, streak-powered) + one-time tasks.
// ═══════════════════════════════════════════════════

const Habits = (() => {

  // ── CONSTANTS ──────────────────────────────────
  const CATEGORY = {
    health: { label: 'Health & Fitness', icon: '🏃', resource: 'iron',  color: '#d94f3d' },
    study:  { label: 'Learning & Study', icon: '📚', resource: 'wood',  color: '#3d7fd9' },
  };

  const SCHEDULE_TYPES = {
    daily:       'Daily',
    days_of_week:'Specific days',
    times_per_week: 'X times/week',
    every_n_days:'Every N days',
  };

  const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DAY_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // Base resource reward
  const BASE_REWARD = 10;

  // ── STATE ──────────────────────────────────────
  // Loaded from / persisted to Save
  let state = {
    habits: [],   // recurring habits
    tasks:  [],   // one-time tasks
    history: {},  // { 'YYYY-MM-DD': { completed: N, total: N } }
    lastSeenDate: null,  // ISO date string of last open
  };

  // ── DATE HELPERS ───────────────────────────────
  function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function dayOfWeek() { return new Date().getDay(); } // 0=Sun..6=Sat

  function weekKey(date = new Date()) {
    // Returns Monday of the week containing date
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().slice(0, 10);
  }

  // ── STREAK REWARD FORMULA ──────────────────────
  // Gentle log curve: base × (1 + log10(streak + 1))
  function calcReward(streak) {
    return Math.round(BASE_REWARD * (1 + Math.log10(streak + 1)));
  }

  // ── IS HABIT DUE TODAY ─────────────────────────
  function isDueToday(habit) {
    const dow = dayOfWeek(); // 0-6
    const today = todayStr();

    switch (habit.schedule.type) {
      case 'daily':
        return true;

      case 'days_of_week':
        return habit.schedule.days.includes(dow);

      case 'times_per_week':
        // Due today if hasn't hit weekly target yet
        const wk = weekKey();
        const doneThisWeek = habit.weeklyDone?.[wk] || 0;
        return doneThisWeek < habit.schedule.timesPerWeek;

      case 'every_n_days':
        if (!habit.lastCompletedDate) return true;
        const last = new Date(habit.lastCompletedDate);
        const now  = new Date(today);
        const diff = Math.floor((now - last) / 86400000);
        return diff >= habit.schedule.everyNDays;

      default:
        return true;
    }
  }

  // ── MIDNIGHT RESET ─────────────────────────────
  function checkDayRollover() {
    const today = todayStr();
    if (state.lastSeenDate === today) return false; // same day, no reset

    const yesterday = state.lastSeenDate;

    if (yesterday) {
      // Record yesterday's history
      const totalDue       = state.habits.filter(h => !h.paused && wasDueOn(h, yesterday)).length
                           + state.tasks.filter(t => t.createdDate === yesterday).length;
      const totalCompleted = state.habits.filter(h => h.completedDate === yesterday).length
                           + state.tasks.filter(t => t.doneDate === yesterday).length;

      state.history[yesterday] = { completed: totalCompleted, total: totalDue };

      // Streak check: any habit due yesterday but not completed → reset streak
      state.habits.forEach(h => {
        if (h.paused) return;
        if (wasDueOn(h, yesterday) && h.completedDate !== yesterday) {
          if (h.schedule.type !== 'times_per_week') {
            // Times-per-week handled on Sunday rollover
            if (h.streak > 0) {
              h.streak = 0;
              h.streakBrokenDate = yesterday;
            }
          }
        }
      });

      // Sunday rollover → check times_per_week habits
      const yesterdayDow = new Date(yesterday).getDay();
      if (yesterdayDow === 0) { // Sunday just passed
        const wk = weekKey(new Date(yesterday));
        state.habits.forEach(h => {
          if (h.schedule.type !== 'times_per_week' || h.paused) return;
          const done = h.weeklyDone?.[wk] || 0;
          if (done < h.schedule.timesPerWeek) {
            h.streak = 0;
            h.streakBrokenDate = yesterday;
          }
        });
      }
    }

    // Reset today's completion flags
    state.habits.forEach(h => {
      h.doneToday = false;
    });

    // Remove completed one-time tasks older than today (they're done)
    state.tasks = state.tasks.filter(t => !t.doneDate);

    state.lastSeenDate = today;
    Save.save();
    return true; // rolled over
  }

  function wasDueOn(habit, dateStr) {
    const dow = new Date(dateStr).getDay();
    switch (habit.schedule.type) {
      case 'daily': return true;
      case 'days_of_week': return habit.schedule.days.includes(dow);
      case 'times_per_week': return true; // checked weekly
      case 'every_n_days':
        if (!habit.lastCompletedDate) return true;
        const diff = Math.floor((new Date(dateStr) - new Date(habit.lastCompletedDate)) / 86400000);
        return diff >= habit.schedule.everyNDays;
      default: return true;
    }
  }

  // ── ADD HABIT ──────────────────────────────────
  function addHabit({ name, category, schedule }) {
    if (!name.trim()) return null;
    if (state.habits.length >= 10) { alert('Max 10 habits. Archive one first.'); return null; }

    const habit = {
      id:       Date.now(),
      type:     'habit',
      name:     name.trim(),
      category,
      schedule,
      streak:           0,
      bestStreak:       0,
      doneToday:        false,
      completedDate:    null,
      lastCompletedDate:null,
      weeklyDone:       {},
      paused:           false,
      createdDate:      todayStr(),
      streakBrokenDate: null,
    };
    state.habits.push(habit);
    Save.save();
    return habit;
  }

  // ── ADD TASK ───────────────────────────────────
  function addTask({ name, category }) {
    if (!name.trim()) return null;
    const task = {
      id:          Date.now(),
      type:        'task',
      name:        name.trim(),
      category,
      done:        false,
      doneDate:    null,
      createdDate: todayStr(),
    };
    state.tasks.push(task);
    Save.save();
    return task;
  }

  // ── COMPLETE HABIT ─────────────────────────────
  function completeHabit(id) {
    const h = state.habits.find(x => x.id === id);
    if (!h || h.doneToday || h.paused) return null;
    if (!isDueToday(h)) return null;

    const today = todayStr();
    h.doneToday        = true;
    h.completedDate    = today;
    h.lastCompletedDate= today;
    h.streak++;
    if (h.streak > h.bestStreak) h.bestStreak = h.streak;

    // Track weekly completions
    const wk = weekKey();
    if (!h.weeklyDone) h.weeklyDone = {};
    h.weeklyDone[wk] = (h.weeklyDone[wk] || 0) + 1;

    const reward  = calcReward(h.streak);
    const resKey  = CATEGORY[h.category].resource;
    const rewards = { [resKey]: reward };
    Economy.earn(rewards);
    Save.save();

    return { reward, resource: resKey, streak: h.streak };
  }

  // ── UNCOMPLETE HABIT ───────────────────────────
  function uncompleteHabit(id) {
    const h = state.habits.find(x => x.id === id);
    if (!h || !h.doneToday) return;
    const reward  = calcReward(h.streak);
    const resKey  = CATEGORY[h.category].resource;
    Economy.state.resources[resKey] = Math.max(0, (Economy.state.resources[resKey]||0) - reward);
    h.doneToday     = false;
    h.completedDate = null;
    h.streak        = Math.max(0, h.streak - 1);
    const wk = weekKey();
    if (h.weeklyDone?.[wk] > 0) h.weeklyDone[wk]--;
    UI.updateResources();
    Save.save();
  }

  // ── COMPLETE TASK ──────────────────────────────
  function completeTask(id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t || t.done) return null;
    t.done     = true;
    t.doneDate = todayStr();
    const resKey  = CATEGORY[t.category].resource;
    const rewards = { [resKey]: BASE_REWARD };
    Economy.earn(rewards);
    Save.save();
    return { reward: BASE_REWARD, resource: resKey };
  }

  function uncompleteTask(id) {
    const t = state.tasks.find(x => x.id === id);
    if (!t || !t.done) return;
    const resKey = CATEGORY[t.category].resource;
    Economy.state.resources[resKey] = Math.max(0, (Economy.state.resources[resKey]||0) - BASE_REWARD);
    t.done = false; t.doneDate = null;
    UI.updateResources();
    Save.save();
  }

  // ── DELETE / PAUSE ─────────────────────────────
  function deleteHabit(id) {
    state.habits = state.habits.filter(h => h.id !== id);
    Save.save();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    Save.save();
  }

  function togglePause(id) {
    const h = state.habits.find(x => x.id === id);
    if (h) { h.paused = !h.paused; Save.save(); }
  }

  // ── HEATMAP DATA ───────────────────────────────
  // Returns last 7 weeks of daily completion data
  function getHeatmapData() {
    const result = [];
    const today  = new Date();
    // Go back 7 weeks from today
    for (let w = 6; w >= 0; w--) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7) - (today.getDay() === 0 ? 6 : today.getDay() - 1) + d);
        const ds   = date.toISOString().slice(0, 10);
        const hist = state.history[ds];
        const isFuture = date > today;
        week.push({
          date: ds,
          dayLabel: DAY_NAMES[date.getDay()],
          completed: hist?.completed || 0,
          total:     hist?.total     || 0,
          isFuture,
          isToday: ds === todayStr(),
        });
      }
      result.push(week);
    }
    return result;
  }

  // ── SCHEDULE DISPLAY STRING ────────────────────
  function scheduleLabel(schedule) {
    switch (schedule.type) {
      case 'daily':         return 'Every day';
      case 'days_of_week':  return schedule.days.map(d => DAY_NAMES[d]).join(', ');
      case 'times_per_week':return `${schedule.timesPerWeek}× per week`;
      case 'every_n_days':  return `Every ${schedule.everyNDays} days`;
      default: return '';
    }
  }

  // ── PUBLIC ─────────────────────────────────────
  return {
    state,
    CATEGORY,
    SCHEDULE_TYPES,
    DAY_NAMES,
    BASE_REWARD,
    calcReward,
    isDueToday,
    checkDayRollover,
    addHabit,
    addTask,
    completeHabit,
    uncompleteHabit,
    completeTask,
    uncompleteTask,
    deleteHabit,
    deleteTask,
    togglePause,
    getHeatmapData,
    scheduleLabel,
    todayStr,
  };

})();

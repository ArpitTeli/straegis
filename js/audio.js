// ═══════════════════════════════════════════════════
//  STRAEGIS — audio.js
//  Procedural audio via Web Audio API — no files needed
// ═══════════════════════════════════════════════════

const Audio = (() => {

  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  // ── PRIMITIVE SOUND BUILDER ─────────────────────
  function tone({ freq=440, type='sine', duration=0.2, gain=0.3, attack=0.01, decay=0.1, detune=0, freqEnd=null, gainEnd=0 }) {
    try {
      const c   = getCtx();
      const osc = c.createOscillator();
      const env = c.createGain();
      osc.connect(env); env.connect(c.destination);
      osc.type    = type;
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (freqEnd !== null) osc.frequency.linearRampToValueAtTime(freqEnd, c.currentTime+duration);
      env.gain.setValueAtTime(0, c.currentTime);
      env.gain.linearRampToValueAtTime(gain, c.currentTime+attack);
      env.gain.linearRampToValueAtTime(gainEnd, c.currentTime+duration);
      osc.start(c.currentTime);
      osc.stop(c.currentTime+duration+0.05);
    } catch(e) {}
  }

  function noise({ duration=0.1, gain=0.3, attack=0.005, cutoff=800 }) {
    try {
      const c      = getCtx();
      const bufLen = Math.ceil(c.sampleRate * duration);
      const buf    = c.createBuffer(1, bufLen, c.sampleRate);
      const data   = buf.getChannelData(0);
      for (let i=0; i<bufLen; i++) data[i] = Math.random()*2-1;
      const src    = c.createBufferSource();
      src.buffer   = buf;
      const filt   = c.createBiquadFilter();
      filt.type    = 'lowpass';
      filt.frequency.value = cutoff;
      const env    = c.createGain();
      src.connect(filt); filt.connect(env); env.connect(c.destination);
      env.gain.setValueAtTime(0,   c.currentTime);
      env.gain.linearRampToValueAtTime(gain, c.currentTime+attack);
      env.gain.linearRampToValueAtTime(0,   c.currentTime+duration);
      src.start(c.currentTime);
    } catch(e) {}
  }

  // ── SOUND LIBRARY ──────────────────────────────
  const SOUNDS = {

    battle_start() {
      // Deep drum + rising horn
      noise({ duration:0.4, gain:0.5, attack:0.01, cutoff:200 });
      setTimeout(()=>tone({freq:110,type:'sawtooth',duration:0.8,gain:0.25,attack:0.05,freqEnd:220,gainEnd:0}),200);
      setTimeout(()=>tone({freq:220,type:'sawtooth',duration:0.6,gain:0.2,attack:0.05,freqEnd:330,gainEnd:0}),700);
    },

    wall_break() {
      noise({ duration:0.6, gain:0.6, attack:0.005, cutoff:400 });
      tone({ freq:80, type:'sawtooth', duration:0.5, gain:0.3, attack:0.01, freqEnd:40, gainEnd:0 });
      setTimeout(()=>noise({duration:0.4,gain:0.4,attack:0.01,cutoff:300}),300);
    },

    enemy_die() {
      noise({ duration:0.12, gain:0.18, attack:0.002, cutoff:600 });
    },

    unit_die() {
      noise({ duration:0.1, gain:0.15, attack:0.002, cutoff:400 });
      tone({ freq:200, type:'sine', duration:0.15, gain:0.12, attack:0.01, freqEnd:80, gainEnd:0 });
    },

    victory() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f,i) => {
        setTimeout(()=>tone({freq:f,type:'sine',duration:0.4,gain:0.25,attack:0.02,gainEnd:0}), i*120);
      });
      setTimeout(()=>tone({freq:1047,type:'sine',duration:0.8,gain:0.3,attack:0.02,gainEnd:0}),480);
    },

    defeat() {
      const notes = [400, 320, 250, 180];
      notes.forEach((f,i)=>{
        setTimeout(()=>tone({freq:f,type:'sawtooth',duration:0.4,gain:0.2,attack:0.02,gainEnd:0}),i*150);
      });
      setTimeout(()=>noise({duration:0.6,gain:0.35,attack:0.01,cutoff:200}),500);
    },

    build_complete() {
      tone({freq:440,type:'sine',duration:0.15,gain:0.2,attack:0.01,gainEnd:0});
      setTimeout(()=>tone({freq:660,type:'sine',duration:0.2,gain:0.2,attack:0.01,gainEnd:0}),100);
    },

    buy_unit() {
      tone({freq:330,type:'sine',duration:0.1,gain:0.15,attack:0.005,gainEnd:0});
    },

    task_complete() {
      tone({freq:520,type:'sine',duration:0.12,gain:0.18,attack:0.005,gainEnd:0});
      setTimeout(()=>tone({freq:780,type:'sine',duration:0.15,gain:0.15,attack:0.005,gainEnd:0}),80);
    },

    explosion() {
      noise({duration:0.35,gain:0.45,attack:0.003,cutoff:350});
      tone({freq:60,type:'sine',duration:0.4,gain:0.3,attack:0.005,freqEnd:20,gainEnd:0});
    },
  };

  function play(name) {
    const fn = SOUNDS[name];
    if (fn) {
      // Unlock audio context on first interaction
      try { fn(); } catch(e) {}
    }
  }

  // Resume audio context after user gesture
  document.addEventListener('click', ()=>{ try { getCtx().resume(); } catch(e){} }, {once:true});
  document.addEventListener('keydown', ()=>{ try { getCtx().resume(); } catch(e){} }, {once:true});

  return { play };

})();

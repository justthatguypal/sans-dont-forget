/* Music: two looping tracks — the fight theme, and an extended remix that takes
   over for phase 3. Browsers block playback until the first key press or click,
   so playback starts from audio.unlock().

   Sound effects are the real Undertale samples (assets/sfx), decoded into
   WebAudio buffers so they can overlap and fire with no loading hitch. */

const audio = (() => {
  const MASTER = 0.55;

  const tracks = {
    main: new Audio('assets/audio/megalovania.mp3'),
    phase3: new Audio('assets/audio/megalovania-phase3.mp3'),
  };
  for (const key in tracks) {
    const t = tracks[key];
    t.loop = true;
    t.volume = 0;
    t.preload = 'auto';
  }

  /* name -> file, gain, playback rate, and an optional hard cut in seconds */
  const SFX = {
    blip_sans: { file: 'blip_sans', gain: 0.22, rate: 1 },
    select: { file: 'select', gain: 0.5 },
    move: { file: 'move', gain: 0.3, rate: 1 },
    hurt: { file: 'hurt', gain: 0.6 },
    slash: { file: 'slash', gain: 0.4, rate: 1.3, maxDur: 0.55 },
    blaster: { file: 'blaster', gain: 0.3, rate: 1, maxDur: 1.2 },
    /* the same gigatalk sample, pitched down: this is the voice in the walls */
    gaster: { file: 'blaster', gain: 0.26, rate: 0.68, maxDur: 2.6 },
    charge: { file: 'charge', gain: 0.32, rate: 1.2, maxDur: 0.75 },
    jump: { file: 'jump', gain: 0.22, rate: 1.45, maxDur: 0.3 },
    heal: { file: 'heal', gain: 0.6 },
    levelup: { file: 'levelup', gain: 0.55 },
    death: { file: 'death', gain: 0.6 },
    gameover: { file: 'gameover', gain: 0.6 },
    phase: { file: 'phase', gain: 0.55 },
    /* the screen going: a brittle snap over falling chips, then the deep boom
       underneath it. Both are built from samples already in assets/sfx. */
    crack: { file: 'slash', gain: 0.5, rate: 2.6, maxDur: 0.45 },
    /* the fight bar passing dead centre: a short click, not a note */
    tick: { file: 'blip_sans', gain: 0.13, rate: 4.4, maxDur: 0.05 },
    tinkle: { file: 'blip_sans', gain: 0.16, rate: 3.0, maxDur: 0.26 },
    boom: { file: 'phase', gain: 0.8, rate: 0.42, maxDur: 2.2 },
    boomSub: { file: 'death', gain: 0.75, rate: 0.55, maxDur: 1.7 },
  };

  const BUFFERS = {};

  /* when the last blaster charge started, so a volley doesn't stack into mud */
  let lastRise = -1;

  /* ---- beat grid for the phase 3 drop (adjustable from the tuning screen) ----
     bpm         tempo of the track that is already playing
     beatsPerBar 4/4 by default
     gridOffset  shifts every bar line (use it when the song starts off-beat)
     nudge       extra seconds added to the drop (positive = later)
     minLead     never drop with less than this much warning
     skipInto    seconds into the remix to start, if it has an intro pickup   */
  const DEFAULTS = { bpm: 120, beatsPerBar: 4, gridOffset: 0, nudge: 0, minLead: 0.45, skipInto: 0 };
  const TUNE_KEY = 'sansfight.audio.tuning';

  let tune = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem(TUNE_KEY) || 'null');
    if (saved && typeof saved === 'object') tune = Object.assign(tune, saved);
  } catch (e) { /* storage unavailable: defaults are fine */ }

  function clampTune() {
    tune.bpm = Math.max(40, Math.min(300, Number(tune.bpm) || DEFAULTS.bpm));
    tune.beatsPerBar = Math.max(2, Math.min(8, Math.round(Number(tune.beatsPerBar) || 4)));
    tune.gridOffset = Math.max(-4, Math.min(4, Number(tune.gridOffset) || 0));
    tune.nudge = Math.max(-2, Math.min(2, Number(tune.nudge) || 0));
    tune.minLead = Math.max(0, Math.min(4, Number(tune.minLead) || 0));
    tune.skipInto = Math.max(0, Math.min(120, Number(tune.skipInto) || 0));
  }
  clampTune();

  function barSeconds() { return (60 / tune.bpm) * tune.beatsPerBar; }

  function untilNextBar(t) {
    const bar = barSeconds();
    const local = t - tune.gridOffset;      // position inside the bar grid
    let k = Math.floor(local / bar) + 1;
    let wait = k * bar - local;
    while (wait < tune.minLead) { k++; wait = k * bar - local; }
    return Math.max(0, wait + tune.nudge);
  }

  let current = 'main';
  let unlocked = false;
  let muted = false;
  let dropTimer = null;
  let duckTimer = null;

  let ctx = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch (e) { ctx = null; }

  function ac() {
    if (!ctx) return null;
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  (function loadSfx() {
    if (!ctx) return;
    for (const name in SFX) {
      fetch('assets/sfx/' + SFX[name].file + '.wav')
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('missing sfx'))))
        .then((b) => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
        .then((buf) => { BUFFERS[name] = buf; })
        .catch(() => {});
    }
  })();

  function play(name, over) {
    if (muted || !ctx || !BUFFERS[name]) return;
    const cfg = SFX[name] || {};
    const src = ctx.createBufferSource();
    src.buffer = BUFFERS[name];
    src.playbackRate.value = (over && over.rate != null) ? over.rate : (cfg.rate || 1);
    const g = ctx.createGain();
    g.gain.value = (over && over.gain != null) ? over.gain : (cfg.gain == null ? 0.5 : cfg.gain);
    src.connect(g);
    g.connect(ctx.destination);
    const dur = (over && over.maxDur != null) ? over.maxDur : cfg.maxDur;
    /* a layer can be scheduled a moment later, so one cue can be several hits */
    const at = (over && over.delay) ? ctx.currentTime + over.delay : 0;
    if (dur) src.start(at, 0, dur);
    else src.start(at);
  }

  function fade(el, from, to, ms, done) {
    const start = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - start) / ms);
      el.volume = muted ? 0 : Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
      else if (done) done();
    };
    requestAnimationFrame(step);
  }

  return {
    unlock() {
      ac();
      if (unlocked) return;
      unlocked = true;
      if (!muted) {
        tracks[current].volume = MASTER;
        tracks[current].play().catch(() => {});
      }
    },

    /* 'main' for phases 1-2, 'phase3' for the extended remix.
       With { quantize: true } the new track is held until the next bar line of
       the track that is already playing, so the remix drops in on the beat. */
    setTrack(name, opts) {
      if (!tracks[name] || name === current) return;
      const quantize = !!(opts && opts.quantize);
      const oldName = current;
      const old = tracks[oldName];
      const next = tracks[name];
      current = name;

      clearTimeout(dropTimer);
      clearTimeout(duckTimer);
      dropTimer = null;
      duckTimer = null;

      const playing = unlocked && !muted && !old.paused && old.currentTime > 0;

      if (!quantize || !playing) {
        fade(old, old.volume, 0, 350, () => {
          if (current !== oldName) { old.pause(); old.currentTime = 0; }
        });
        next.currentTime = tune.skipInto;
        next.volume = 0;
        if (unlocked && !muted) next.play().catch(() => {});
        fade(next, 0, MASTER, 550);
        return;
      }

      // wait for the bar, ducking the outgoing track just before it
      const wait = untilNextBar(old.currentTime);
      duckTimer = setTimeout(() => {
        if (current === name) fade(old, old.volume, 0, 260);
      }, Math.max(0, wait - 0.26) * 1000);

      dropTimer = setTimeout(() => {
        if (current !== name) return;
        old.pause();
        old.currentTime = 0;
        next.currentTime = tune.skipInto;
        next.volume = 0;
        if (unlocked && !muted) next.play().catch(() => {});
        fade(next, 0, MASTER, 90); // short ramp so the hit stays punchy
      }, wait * 1000);
    },

    /* exposed for tuning/inspection: seconds until the next bar line */
    barWait(t) { return untilNextBar(t); },

    get tune() { return Object.assign({}, tune); },
    get defaults() { return Object.assign({}, DEFAULTS); },

    setTune(patch) {
      for (const k in patch) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) tune[k] = Number(patch[k]);
      }
      clampTune();
      try { localStorage.setItem(TUNE_KEY, JSON.stringify(tune)); } catch (e) { /* ignore */ }
      return Object.assign({}, tune);
    },

    resetTune() {
      tune = Object.assign({}, DEFAULTS);
      try { localStorage.setItem(TUNE_KEY, JSON.stringify(tune)); } catch (e) { /* ignore */ }
      return Object.assign({}, tune);
    },

    /* Play the theme, then drop the remix on the bar so the timing can be heard. */
    testDrop() {
      ac();
      clearTimeout(dropTimer);
      clearTimeout(duckTimer);
      for (const k in tracks) {
        tracks[k].pause();
        tracks[k].currentTime = 0;
        tracks[k].volume = 0;
      }
      current = 'main';
      unlocked = true;
      if (!muted) {
        tracks.main.volume = MASTER;
        tracks.main.play().catch(() => {});
      }
      dropTimer = setTimeout(() => {
        if (current === 'main') this.setTrack('phase3', { quantize: true });
      }, 900);
    },

    toggleMute() {
      muted = !muted;
      for (const key in tracks) tracks[key].muted = muted;
      if (!muted) {
        tracks[current].volume = MASTER;
        if (unlocked) tracks[current].play().catch(() => {});
      }
      return muted;
    },

    get muted() { return muted; },
    get track() { return current; },
    get sfxLoaded() { return Object.keys(BUFFERS).length; },

    blip(kind) {
      if (kind === 'nar') play('blip_sans', { rate: 0.82, gain: 0.14 });
      else play('blip_sans', { rate: 0.98 + Math.random() * 0.06, gain: 0.22 });
    },
    select() { play('select'); },
    move() { play('move'); },
    cancel() { play('select', { rate: 0.6, gain: 0.4 }); },
    hurt() { play('hurt'); },
    slash() { play('slash'); },
    blaster() { play('blaster'); },
    gaster() { play('gaster'); },

    /* the wind-up: the charge sample loops and climbs in pitch until it fires */
    chargeRise(dur) {
      if (muted || !ctx || !BUFFERS.charge) return;
      const now = ctx.currentTime;
      if (now - lastRise < 0.09) return;
      lastRise = now;

      const d = Math.max(0.2, Math.min(2, dur));
      const src = ctx.createBufferSource();
      src.buffer = BUFFERS.charge;
      src.loop = true;
      src.playbackRate.setValueAtTime(0.8, now);
      src.playbackRate.linearRampToValueAtTime(2.3, now + d);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.24, now + d * 0.88);
      g.gain.linearRampToValueAtTime(0.0001, now + d + 0.04);

      src.connect(g);
      g.connect(ctx.destination);
      src.start(now);
      src.stop(now + d + 0.06);
    },
    charge() { play('charge'); },
    jump() { play('jump'); },
    bone() { play('jump'); },
    heal() { play('heal'); },
    levelup() { play('levelup'); },
    dying() { play('death'); },
    gameover() { play('gameover'); },
    phase() { play('phase'); },
    tick() { play('tick'); },

    /* glass: one hard snap, then chips of it falling away behind */
    crack() {
      play('crack');
      play('tinkle', { delay: 0.05 });
      play('tinkle', { delay: 0.13, rate: 2.6, gain: 0.12 });
      play('tinkle', { delay: 0.24, rate: 2.2, gain: 0.09 });
    },

    /* the whole screen coming apart: the sting dropped low, with a sub under it */
    boom() {
      play('boom');
      play('boomSub', { delay: 0.03 });
    },
  };
})();

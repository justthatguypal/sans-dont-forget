/* SANS — don't forget : a fan-made Undertale fight sim.
   Canvas 640x480, everything drawn at 1x and scaled by CSS.

   Fight structure (24 turns, five phases):
     PHASE 1 (1-5)    bones: sweeps, gaps, spikes, teeth, crossfire
     PHASE 2 (6-10)   blue SOUL: gravity, stairs, blasters, hurdles, a gate
     PHASE 3 (11-15)  blasters from everywhere, rush, rings, and the first
                      time he takes hold of your SOUL and drags it
     PHASE 4 (16-19)  the astral hour: he stops standing on the floor, the
                      walls give up on being walls, the SOUL gets pulled
     PHASE 5 (20-24)  god: the hallway stops pretending, then the finale

   Sans is animated from the full sprite sheet: hand-down cycles for idle and
   talking, hand-up cycles when bones rise, hand-down when they fall, and a
   summoning cycle when blasters appear.
*/

(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width;
  const H = canvas.height;

  const F16 = '16px "Lucida Console","DejaVu Sans Mono",monospace';
  const F18 = '18px "Lucida Console","DejaVu Sans Mono",monospace';
  const F14 = '14px "Lucida Console","DejaVu Sans Mono",monospace';
  const F12 = '12px "Lucida Console","DejaVu Sans Mono",monospace';
  const FBIG = '26px "Lucida Console","DejaVu Sans Mono",monospace';

  const BOX = { x: 32, y: 246, w: 576, h: 132 };
  const IN = { x: BOX.x + 10, y: BOX.y + 10, w: BOX.w - 20, h: BOX.h - 20 };
  const FLOOR = IN.y + IN.h;
  const MENU_Y = 388;
  const STATS_Y = 428;

  const OK_KEYS = ['KeyZ', 'Enter', 'Space'];
  const BACK_KEYS = ['KeyX', 'ShiftLeft', 'ShiftRight', 'Escape'];

  const PHASE_SUB = {
    1: 'bones and bad jokes',
    2: 'the blue hour',
    3: 'a bad time',
    4: 'the astral hour',
    5: 'he is not in the room anymore',
  };

  /* Rows of the audio tuning screen (T on the title card). */
  const TUNER_FIELDS = [
    { key: 'bpm', label: 'BPM', step: 1, fmt: (v) => String(Math.round(v)) },
    { key: 'beatsPerBar', label: 'Beats per bar', step: 1, fmt: (v) => String(Math.round(v)) },
    { key: 'gridOffset', label: 'Bar grid offset (s)', step: 0.01, fmt: (v) => v.toFixed(2) },
    { key: 'nudge', label: 'Drop nudge (s)', step: 0.01, fmt: (v) => v.toFixed(2) },
    { key: 'minLead', label: 'Minimum wait (s)', step: 0.05, fmt: (v) => v.toFixed(2) },
    { key: 'skipInto', label: 'Start remix at (s)', step: 0.05, fmt: (v) => v.toFixed(2) },
  ];

  /* Animation clips cut from the sheet. Each clip is a list of frame indices
     inside one row: handdown_0..4 (arms down) and handup_0..5 (arms up). */
  const POSES = {
    /* the sheet's frames are not all the same pose: 0-2 have an arm raised,
       3-4 have the arms hanging. Idle is the one flat frame so his hands stay
       put; only the bones that rise or fall move them. */
    idle: { set: 'handdown', frames: [4], fps: 1 },
    talk: { set: 'handdown', frames: [2, 4, 3, 1], fps: 7, once: true },
    handUp: { set: 'handup', frames: [3, 4, 3], fps: 10, once: true },
    handDown: { set: 'handdown', frames: [3, 4, 3], fps: 10, once: true },
    summon: { set: 'handup', frames: [3, 5, 4, 5], fps: 13, once: true },
    tired: { set: 'wrapped', frames: [0], fps: 1 },
  };

  /* how much bigger than the raw sheet the blaster skulls are drawn */
  const BLASTER_S = 1.5;

  /* half-width of a beam's hurtbox. The white core is drawn to exactly this
     width, so the bright part of the beam is the only part that burns you. */
  const BEAM_HALF = 12.5;

  /* the blade he draws once he stops pretending. Frames were cut from the sword
     sheet into assets/sprites/sword_<anim>_<n>.png; a held animation is centred
     per frame so it stays put, a swing keeps its sheet position so the arc
     travels across the canvas. */
  const SWORD = {
    idle:  { n: 6, fps: 7,  w: 90,  h: 179, scale: 0.62, ax: 396, ay: 248 },
    equip: { n: 4, fps: 9,  w: 129, h: 214, scale: 0.62, ax: 396, ay: 248 },
    /* the swings are anchored on him, not beside him: the arc is meant to cut
       across the sprite rather than sit in the gap next to it */
    slash: { n: 7, fps: 17, w: 851, h: 172, scale: 0.52, ax: 508, ay: 250 },
    heavy: { n: 4, fps: 11, w: 605, h: 191, scale: 0.52, ax: 508, ay: 250 },
  };

  /* FIGHT bar: how many times the cursor crosses the bar per second.
     0.9 = about 1.1s each way, 1.1 = about 0.9s, 0.6 = a slow crawl. */
  const FIGHT_SWEEP = 1.1;

  /* the bar sings as the cursor nears the middle: each step is closer to the
     centre, higher and a touch louder, and the crossing click is the top note */
  const CUE = [
    { d: 0.26, rate: 3.2, gain: 0.06 },
    { d: 0.19, rate: 3.7, gain: 0.07 },
    { d: 0.13, rate: 4.3, gain: 0.08 },
    { d: 0.08, rate: 5.0, gain: 0.10 },
    { d: 0.04, rate: 5.8, gain: 0.11 },
  ];
  const CUE_TOP = { rate: 6.8, gain: 0.13 };

  /* he wears a different face in every phase: tired, lit up, then empty sockets */
  const PHASE_FACE = { 1: 'face_0', 2: 'face_wide_0', 3: 'face_8', 4: 'face_wide_1', 5: 'face_10' };

  /* difficulty ladder: your health, how hard he hits, and how fast everything
     in the box moves. Speed also tightens every spawn timer, because the
     attacks run on scaled time. */
  const DIFFS = [
    /* bar = how fast the FIGHT cursor sweeps, on top of FIGHT_SWEEP */
    { name: 'EASY', hp: 140, dmg: 0.5, speed: 0.78, bar: 0.8, blurb: 'he is being polite about it.' },
    { name: 'MID', hp: 92, dmg: 1, speed: 1, bar: 1, blurb: 'the way it was meant to go.' },
    { name: 'HARD', hp: 76, dmg: 1.35, speed: 1.18, bar: 1.15, blurb: 'he stops explaining the rules.' },
    { name: 'INSANE', hp: 60, dmg: 1.7, speed: 1.32, bar: 1.3, blurb: 'the hallway stops forgiving.' },
    /* not a difficulty: a different fight. he is past time here, and only his
       own attacks run, with the Lethal Deal track under it. Kept ahead of BAD
       TIME so it is always pickable, whatever has been cleared. */
    { name: 'LETHAL DEAL', hp: 30, dmg: 2.8, speed: 1.62, bar: 1.55, lethal: true, blurb: 'he is above all of it now.', hot: true },
    { name: 'BAD TIME', hp: 56, dmg: 2.1, speed: 1.36, bar: 1.45, blurb: 'you asked for this one.', hot: true },
  ];
  function diffNow() { return DIFFS[G.diff.i] || DIFFS[1]; }

  /* the lethal fight breathes red: bones, the soul and the menu all swing
     between a deep dried red and a bright one, out of step with each other */
  function lethalHot(seed) { return 0.5 + 0.5 * Math.sin(G.t * 8 + (seed || 0)); }
  function lethalBoneCol(seed) { return lethalHot(seed) > 0.5 ? '#ff4a4a' : '#5c0000'; }
  function lethalSoulCol() { return lethalHot(1.6) > 0.45 ? '#ff2b2b' : '#7a0000'; }

  /* the difficulty you last picked is remembered between visits, and BAD TIME
     stays hidden until you've actually cleared the fight on one of the others */
  const SAVE_KEY = 'sans.diff';
  const BAD_TIME = DIFFS.length - 1;

  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s) return { i: 1, cleared: false };
      const cleared = !!s.cleared;
      let i = Number(s.i);
      if (!Number.isInteger(i) || i < 0 || i >= DIFFS.length) i = 1;
      if (i === BAD_TIME && !cleared) i = 1;
      return { i, cleared };
    } catch (e) {
      return { i: 1, cleared: false };
    }
  }

  function saveDiff() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ i: G.diff.i, cleared: G.cleared }));
    } catch (e) { /* storage can be blocked; the fight still runs */ }
  }

  /* BAD TIME only joins the list once the fight has been cleared */
  function diffListLen() { return G.cleared ? DIFFS.length : BAD_TIME; }

  function markCleared() {
    if (G.cleared || G.diff.i === BAD_TIME) return;
    G.cleared = true;
    saveDiff();
  }

  const bootSave = loadSave();

  const START_ITEMS = () => ([
    { name: 'Butterscotch Pie', count: 1, heal: 9999 },
    { name: 'Instant Noodles', count: 1, heal: 15 },
    { name: 'Legendary Hero', count: 1, heal: 30 },
    { name: 'Snowman Piece', count: 1, heal: 22 },
    { name: 'Ketchup', count: 2, heal: 8 },
  ]);

  /* ---------------- input ---------------- */
  const keys = Object.create(null);
  const pressed = new Set();
  const holdState = Object.create(null);

  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
    if (!keys[e.code]) pressed.add(e.code);
    keys[e.code] = true;
    audio.unlock();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  canvas.addEventListener('pointerdown', () => { audio.unlock(); if (G.mode === 'title') startGame(); });

  const okPressed = () => OK_KEYS.some((k) => pressed.has(k));
  const backPressed = () => BACK_KEYS.some((k) => pressed.has(k));

  function heldPress(code, dt, delay = 0.32, rate = 0.085) {
    const first = pressed.has(code);
    if (!keys[code]) { delete holdState[code]; return first; }
    const s = holdState[code] || (holdState[code] = { t: 0, n: 0 });
    s.t += dt;
    if (s.t < delay) return first;
    const n = Math.floor((s.t - delay) / rate);
    if (n > s.n) { s.n = n; return true; }
    return first && s.t < delay + rate;
  }

  /* ---------------- game state ---------------- */
  const G = {
    mode: 'title',
    t: 0,
    shake: 0,
    flash: 0,
    dyingT: 0,
    player: { name: 'FRISK', lv: 19, hp: 92, maxhp: 92, kr: 0, invuln: 0 },
    run: { diff: 1, hits: 0, items: 0, perfect: 0, blueHits: 0, godHits: 0, time: 0, clean: 0, maxClean: 0, mercy: 0, hitAtStart: 0 },
    achI: 0,
    achToast: null,
    items: START_ITEMS(),
    turn: 1,
    phase: 0,
    banner: null,
    bannerPending: false,
    sans: { pose: 'idle', frameIdx: 0, animT: 0, poseHold: 0, poseT: 0, face: 'face_0', alpha: 1, bob: 0 },
    sword: { anim: 'idle', t: 0, frame: 0 },
    soul: { x: 0, y: 0, px: 0, py: 0, w: 12, h: 10, vy: 0, mode: 'red', onGround: false },
    bullets: [],
    sparks: [],
    trail: [],
    dust: [],
    attack: null,
    attackKey: null,
    dlg: null,
    dlgCb: null,
    menu: { i: 0, kind: 'main' },
    fight: null,
    flags: {},
    overIdx: 0,
    saidLowHp: false,
    tuner: { i: 0 },
    diff: { i: bootSave.i },
    cleared: bootSave.cleared,
  };

  function freshFlags() {
    return {
      dad: 0, talk: 0, timelines: 0, remember: 0, joke: 0, taunt: 0, check: 0,
      dodges: 0, revived: false, finale: false, ending: null, intros: {},
      saidRelaxed: false, saidMorning: false, saidLate: false, firstHit: false, memory: false,
    };
  }

  /* ---------------- text helpers ---------------- */
  function txt(s, x, y, color = '#fff', font = F16, align = 'left') {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillText(s, Math.round(x), Math.round(y));
  }

  function textWidth(s, font = F16) {
    ctx.font = font;
    return ctx.measureText(s).width;
  }

  function wrapText(s, maxW, font = F16) {
    ctx.font = font;
    const words = s.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  const SOUL_MASK = [
    '011000000110',
    '111100001111',
    '111110011111',
    '111111111111',
    '111111111111',
    '011111111110',
    '001111111100',
    '000111111000',
    '000011110000',
    '000001100000',
  ];

  function drawSoul(x, y, color = '#ff0000', px = 1, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let r = 0; r < SOUL_MASK.length; r++) {
      const row = SOUL_MASK[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== '1') continue;
        if (px === 1) ctx.fillRect(Math.round(x + c), Math.round(y + r), 1, 1);
        else ctx.fillRect(x + c * px, y + r * px, px, px);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* the heart in the box is drawn larger than its hitbox, which is how the
     original does it: the sprite overshoots, the hurtbox stays tight */
  const SOUL_BIG = 1.6;
  function drawBigSoul(x, y, color = '#ff0000', alpha = 1) {
    const w = SOUL_MASK[0].length * SOUL_BIG;
    const h = SOUL_MASK.length * SOUL_BIG;
    drawSoul(x + 6 - w / 2, y + 5 - h / 2, color, SOUL_BIG, alpha);
  }

  function drawBoxFrame() {
    const t = 4;
    const lit = G.phase >= 2;
    ctx.fillStyle = lit ? neonColor(6) : '#fff';
    if (lit) {
      ctx.save();
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 14;
    }
    ctx.fillRect(BOX.x, BOX.y, BOX.w, t);
    ctx.fillRect(BOX.x, BOX.y + BOX.h - t, BOX.w, t);
    ctx.fillRect(BOX.x, BOX.y, t, BOX.h);
    ctx.fillRect(BOX.x + BOX.w - t, BOX.y, t, BOX.h);
    if (lit) ctx.restore();
  }

  /* ---------------- background / actors ---------------- */
  function drawBackground() {
    /* flat black: no window bars, no tint, nothing behind him to fight the sprite */
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }

  /* ---- Sans animation ---- */
  function sansPose(name, hold) {
    const s = G.sans;
    if (!POSES[name]) name = 'idle';
    if (s.pose !== name) {
      s.pose = name;
      s.frameIdx = 0;
      s.animT = 0;
      s.poseT = 0;
    }
    if (hold) s.poseT = 0;
    s.poseHold = hold == null ? 0 : hold;
  }

  function updateSansAnim(dt) {
    const s = G.sans;
    const pose = POSES[s.pose] || POSES.idle;
    s.animT += dt;
    const stepLen = 1 / pose.fps;
    while (s.animT >= stepLen) {
      s.animT -= stepLen;
      if (pose.once) {
        /* a gesture plays through one time and then just holds */
        if (s.frameIdx < pose.frames.length - 1) s.frameIdx++;
      } else {
        s.frameIdx = (s.frameIdx + 1) % pose.frames.length;
      }
    }
    s.bob = s.pose === 'idle' ? 1.4 : 0;
    if (s.poseHold) {
      s.poseT += dt;
      if (s.poseT > s.poseHold) sansPose('idle');
    }
  }

  /* ---------------- the blade ---------------- */

  function swordAnim(name) {
    if (!SWORD[name]) return;
    G.sword = { anim: name, t: 0, frame: 0 };
  }

  function updateSword(dt) {
    const sw = G.sword;
    if (!sw) return;
    if (G.phase < 5) { sw.anim = 'idle'; sw.t = 0; sw.frame = 0; return; }
    const def = SWORD[sw.anim] || SWORD.idle;
    sw.t += dt;
    /* equip and the swings fire once, then it goes back to floating */
    if (sw.anim !== 'idle' && sw.t >= def.n / def.fps) { sw.anim = 'idle'; sw.t = 0; }
    sw.frame = Math.floor(sw.t * def.fps) % def.n;
  }

  function drawSword() {
    const sw = G.sword;
    if (!sw || G.phase < 5 || G.flags.finale) return;
    const def = SWORD[sw.anim] || SWORD.idle;
    const img = SPR['sword_' + sw.anim + '_' + (sw.frame % def.n)];
    if (!img || !img.complete) return;
    const w = def.w * def.scale;
    const h = def.h * def.scale;
    /* the held blade hangs at his left and breathes */
    const ax = def.ax;
    const ay = def.ay + Math.sin(G.t * 1.7) * 4;
    ctx.save();
    ctx.globalAlpha = G.sans.alpha;
    ctx.drawImage(img, Math.round(ax - w / 2), Math.round(ay - h), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function drawSans() {
    const s = G.sans;
    ctx.globalAlpha = s.alpha;
    const pose = POSES[s.pose] || POSES.idle;

    if (pose.set === 'wrapped') {
      const img = SPR['wrapped_body_' + pose.frames[s.frameIdx % pose.frames.length]];
      const wx = 420;
      const wy = 142;
      if (img && img.complete) ctx.drawImage(img, wx, wy, img.width * 2, img.height * 2);
      const wface = SPR['wrapped_face_' + (s.face === 'face_wide_0' ? 1 : 0)] || SPR.wrapped_face_0;
      if (wface && wface.complete) {
        ctx.drawImage(wface, wx + 30 * 2, wy - 20 * 2, wface.width * 2, wface.height * 2);
      }
      ctx.globalAlpha = 1;
      return;
    }

    const scale = 2;
    const bob = Math.round(Math.sin(G.t * 2.2) * s.bob);
    const bx = 444;
    /* from the astral hour he is not standing on anything */
    const float = G.phase >= 4 ? Math.round(Math.sin(G.t * 1.5) * 6) : 0;
    const by = 92 + bob + float;

    if (G.phase >= 4 && s.alpha > 0.05) {
      const gx = bx + 64, gy = by + 70;
      const r = 150 + Math.sin(G.t * 1.7) * 10;
      const grd = ctx.createRadialGradient(gx, gy, 10, gx, gy, r);
      grd.addColorStop(0, neonAlpha(11, 0.34));
      grd.addColorStop(0.55, neonAlpha(11, 0.12));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
      /* a ring above him, slowly turning */
      ctx.save();
      ctx.translate(gx, gy - 96);
      ctx.rotate(Math.sin(G.t * 0.8) * 0.18);
      ctx.scale(1, 0.28);
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = neonAlpha(8, 0.6);
      ctx.shadowColor = neonColor(8);
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.restore();
    }
    const frame = pose.frames[s.frameIdx % pose.frames.length];
    const body = SPR[pose.set + '_' + frame];
    if (body && body.complete) ctx.drawImage(body, bx, by, 64 * scale, 73 * scale);

    const face = SPR[s.face] || SPR.face_0;
    if (face && face.complete) {
      ctx.drawImage(face, bx + HEAD_OFFSET.x * scale, by + HEAD_OFFSET.y * scale,
        face.width * scale, face.height * scale);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- HUD ---------------- */
  function drawHUD() {
    const p = G.player;
    txt(p.name, 36, STATS_Y, '#fff', F16);
    txt('LV ' + p.lv, 112, STATS_Y, '#fff', F16);
    txt('HP', 186, STATS_Y + 1, '#fff', F14);

    const bx = 214;
    const bw = 84;
    const bh = 15;
    const lit = G.phase >= 2;

    if (lit) {
      ctx.save();
      ctx.shadowColor = neonColor(8);
      ctx.shadowBlur = 12;
    }
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(bx, STATS_Y, bw, bh);
    const frac = Math.max(0, Math.min(1, p.hp / p.maxhp));
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(bx, STATS_Y, Math.round(bw * frac), bh);

    if (p.kr > 0.2) {
      const krFrac = Math.max(0, Math.min(frac, p.kr / p.maxhp));
      ctx.fillStyle = '#c000c0';
      ctx.fillRect(bx + Math.round(bw * (frac - krFrac)), STATS_Y, Math.round(bw * krFrac), bh);
    }
    if (lit) ctx.restore();

    if (p.kr > 0.2) txt('KR', bx + bw + 92, STATS_Y + 1, '#c000c0', F14);
    txt(Math.max(0, Math.ceil(p.hp)) + ' / ' + p.maxhp, bx + bw + 10, STATS_Y + 1, '#fff', F14);
    txt(diffNow().name, W - 36, STATS_Y + 2, '#6a6a6a', F12, 'right');
  }

  /* From phase 2 the buttons light up like a sign: blue, yellow and white,
     sliding through each other instead of snapping. One full trip takes
     NEON_CYCLE seconds; each label is offset so the row drifts out of step. */
  const NEON_CYCLE = 4.2;
  const NEON_RGB = [[0x59, 0xb8, 0xff], [0xff, 0xe1, 0x4d], [0xff, 0xff, 0xff], [0xff, 0x9b, 0x3d]];

  /* same colour, with an alpha, for glows and tethers */
  function neonAlpha(seed, a) {
    return neonColor(seed).replace('rgb(', 'rgba(').replace(')', ',' + a + ')');
  }

  function neonColor(seed) {
    const n = NEON_RGB.length;
    const pos = ((G.t / NEON_CYCLE) * n + seed * 0.7) % n;
    const i = Math.floor(pos);
    /* smoothstep so it lingers on a colour and crosses quickly */
    let f = pos - i;
    f = f * f * (3 - 2 * f);
    const a = NEON_RGB[i % n];
    const b = NEON_RGB[(i + 1) % n];
    const mix = (k) => Math.round(a[k] + (b[k] - a[k]) * f);
    return 'rgb(' + mix(0) + ',' + mix(1) + ',' + mix(2) + ')';
  }

  function glowTxt(s, x, y, color, font = F18, align = 'left', blur = 10) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    txt(s, x, y, color, font, align);
    /* drawn twice so the halo actually reads at this resolution */
    ctx.fillText(s, Math.round(x), Math.round(y));
    ctx.restore();
  }

  function drawMenuRow() {
    const labels = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
    const colW = BOX.w / 4;
    const neon = G.phase >= 2;
    for (let i = 0; i < 4; i++) {
      const cx = BOX.x + colW * i + colW / 2;
      const selected = G.mode === 'menu' && G.menu.i === i;
      if (diffNow().lethal) glowTxt(labels[i], cx, MENU_Y, lethalBoneCol(i * 1.3), F18, 'center', selected ? 22 : 14);
      else if (neon) glowTxt(labels[i], cx, MENU_Y, neonColor(i), F18, 'center', selected ? 20 : 12);
      else txt(labels[i], cx, MENU_Y, selected ? '#ffff00' : '#fff', F18, 'center');
      if (selected) drawSoul(cx - textWidth(labels[i], F18) / 2 - 18, MENU_Y + 4, '#ff0000', 1);
    }
  }

  function drawBanner() {
    if (!G.banner) return;
    const b = G.banner;
    let a = 1;
    if (b.t < 0.22) a = b.t / 0.22;
    else if (b.t > 2.3) a = Math.max(0, 1 - (b.t - 2.3) / 0.45);
    ctx.globalAlpha = a;
    txt(b.name, W / 2, 116, '#fff', FBIG, 'center');
    txt(b.sub, W / 2, 152, '#c8c8c8', F14, 'center');
    ctx.globalAlpha = 1;
  }

  /* ---------------- dialogue ---------------- */
  function normalizeLines(lines) {
    return lines.map((l) => (typeof l === 'string' ? { t: l } : l));
  }

  function showDialogue(lines, cb) {
    G.dlg = { lines: normalizeLines(lines).filter((l) => l.t != null), i: 0, shown: 0, hold: 0 };
    G.dlgCb = cb || null;
    G.mode = 'dialogue';
    applyLineLook(G.dlg.lines[0]);
  }

  function applyLineLook(line) {
    if (!line) return;
    /* a line can carry a voice cue: the gigatalk sample under Gaster's part */
    if (line.voice && audio[line.voice]) audio[line.voice]();
    if (line.f === null) { G.sans.alpha = 0; return; }
    G.sans.alpha = 1;
    if (line.f) G.sans.face = line.f;
    /* he talks standing still, the way he does in the corridor */
    if (G.sans.pose !== 'tired') sansPose('idle');
  }

  function updateDialogue(dt) {
    const d = G.dlg;
    if (!d) return;
    const line = d.lines[d.i];
    if (!line) { finishDialogue(); return; }

    if (d.shown < line.t.length) {
      const before = Math.floor(d.shown);
      d.shown = Math.min(line.t.length, d.shown + 46 * dt);
      const after = Math.floor(d.shown);
      if (after > before && after % 3 === 0) audio.blip(line.f ? 'sans' : 'nar');
    } else {
      d.hold += dt;
    }

    if (okPressed()) {
      if (d.shown < line.t.length) {
        d.shown = line.t.length;
      } else {
        audio.select();
        d.i++;
        d.shown = 0;
        d.hold = 0;
        if (d.i >= d.lines.length) finishDialogue();
        else applyLineLook(d.lines[d.i]);
      }
    }
  }

  function finishDialogue() {
    const cb = G.dlgCb;
    G.dlg = null;
    G.dlgCb = null;
    if (cb) cb();
  }

  function drawDialogue() {
    const d = G.dlg;
    if (!d) return;
    const line = d.lines[d.i];
    if (!line) return;
    const isNarration = !line.f;
    const cut = (isNarration ? '* ' : '') + line.t.slice(0, Math.floor(d.shown));
    const lines = wrapText(cut, IN.w - 28);
    let y = IN.y + 10;
    for (const ln of lines) {
      txt(ln, IN.x + 14, y, '#fff', F16);
      y += 22;
    }
    if (d.shown >= line.t.length && Math.floor(G.t * 2) % 2 === 0) {
      ctx.fillStyle = '#fff';
      const ax = BOX.x + BOX.w - 20;
      const ay = BOX.y + BOX.h - 14;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + 8, ay);
      ctx.lineTo(ax + 4, ay + 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---------------- soul & bullets ---------------- */
  function centreSoul() {
    const s = G.soul;
    s.x = IN.x + IN.w / 2 - s.w / 2;
    s.y = IN.y + IN.h / 2 - s.h / 2;
    s.vy = 0;
    s.onGround = false;
  }

  function soulHitbox() {
    const s = G.soul;
    return { x: s.x + 1, y: s.y + 1, w: s.w - 2, h: s.h - 2 };
  }

  function updateSoul(dt) {
    const s = G.soul;
    s.px = s.x;
    s.py = s.y;
    let ax = 0;
    if (keys.ArrowLeft || keys.KeyA) ax -= 1;
    if (keys.ArrowRight || keys.KeyD) ax += 1;

    /* some attacks take hold of the SOUL and drag it where he wants it */
    const pull = s.pull;
    if (pull) {
      const dx = pull.x - (s.x + s.w / 2);
      const dy = pull.y - (s.y + s.h / 2);
      const d = Math.hypot(dx, dy) || 1;
      if (d > 3) {
        s.x += (dx / d) * pull.power * dt;
        s.y += (dy / d) * pull.power * dt;
      }
    }

    if (s.mode === 'red') {
      let ay = 0;
      if (keys.ArrowUp || keys.KeyW) ay -= 1;
      if (keys.ArrowDown || keys.KeyS) ay += 1;
      const speed = 176;
      s.x += ax * speed * dt;
      s.y += ay * speed * dt;
      s.x = Math.max(IN.x, Math.min(IN.x + IN.w - s.w, s.x));
      s.y = Math.max(IN.y, Math.min(IN.y + IN.h - s.h, s.y));
    } else {
      const speed = 178;
      s.x += ax * speed * dt;
      s.x = Math.max(IN.x, Math.min(IN.x + IN.w - s.w, s.x));

      if ((keys.ArrowUp || keys.KeyW || pressed.has('KeyZ')) && s.onGround) {
        s.vy = -330;
        s.onGround = false;
        audio.jump();
      }
      s.vy += 1000 * dt;
      s.y += s.vy * dt;
      s.onGround = false;

      if (s.vy >= 0) {
        for (const b of G.bullets) {
          if (b.type !== 'bone' || !b.solid) continue;
          const bottom = s.y + s.h;
          const prevBottom = s.py + s.h;
          if (s.x + s.w > b.x + 2 && s.x < b.x + b.w - 2 && prevBottom <= b.y + 3 && bottom >= b.y) {
            s.y = b.y - s.h;
            s.vy = 0;
            s.onGround = true;
            b._stood = true;
          }
        }
      }
      if (s.y + s.h >= FLOOR) { s.y = FLOOR - s.h; s.vy = 0; s.onGround = true; }
      if (s.y < IN.y) { s.y = IN.y; s.vy = 0; }
    }
  }

  /* Only bones that actually travel up or down move his hands: up for bones
     climbing, down for bones dropping. Everything else leaves him in idle. */
  function spawnBone(o) {
    G.bullets.push(Object.assign({ type: 'bone', x: 0, y: 0, w: 14, h: 40, vx: 0, vy: 0, solid: false }, o));
    const up = o.fromBottom || (o.vy || 0) < 0;
    const down = !up && (o.vy || 0) > 0;
    /* one gesture per volley: a rain drops a bone every few frames, and he
       should not flap along with every single one of them */
    const quiet = G.t - (G.sans.gestureAt || -9) > 1.6;
    if (quiet && up) { sansPose('handUp', 0.55); G.sans.gestureAt = G.t; }
    else if (quiet && down) { sansPose('handDown', 0.55); G.sans.gestureAt = G.t; }
  }

  function spawnBlaster(angle, delay = 0, shots = 0) {
    const a = angle == null ? Math.random() * Math.PI * 2 : angle;
    const cx = IN.x + IN.w / 2;
    const cy = IN.y + IN.h / 2;
    const hw = IN.w / 2 + 30 + 12;
    const hh = IN.h / 2 + 30 + 12;
    const k = 1 / Math.sqrt((Math.cos(a) / hw) ** 2 + (Math.sin(a) / hh) ** 2);
    G.bullets.push({
      type: 'blaster',
      x: cx - Math.cos(a) * k - 21,
      y: cy - Math.sin(a) * k - 28,
      angle: a,
      phase: delay > 0 ? 'wait' : 'in',
      pt: 0,
      delay,
      shots,
      t: 0,
      frame: Math.floor(Math.random() * 6),
    });
    /* he doesn't move for these: he just looks at you */
    G.sans.face = 'face_wide_1';
  }

  function blasterOrigin(b) {
    return { x: b.x + 21, y: b.y + 28 };
  }

  function aimAt(b) {
    const o = blasterOrigin(b);
    const sx = G.soul.x + G.soul.w / 2;
    const sy = G.soul.y + G.soul.h / 2;
    return Math.atan2(sy - o.y, sx - o.x);
  }

  function blasterBeamHit(b, hb) {
    const o = blasterOrigin(b);
    const dx = Math.cos(b.angle);
    const dy = Math.sin(b.angle);
    const rx = hb.x + hb.w / 2 - o.x;
    const ry = hb.y + hb.h / 2 - o.y;
    const along = rx * dx + ry * dy;
    const perp = Math.abs(-rx * dy + ry * dx);
    return along > 10 && along < 1200 && perp < BEAM_HALF;
  }

  function burstSparks(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 70 + Math.random() * 170;
      G.sparks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        t: 0,
        life: 0.32 + Math.random() * 0.3,
        f: Math.floor(Math.random() * 4),
      });
    }
  }

  function updateSparks(dt) {
    if (!G.sparks.length) return;
    for (const s of G.sparks) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 240 * dt;
    }
    G.sparks = G.sparks.filter((s) => s.t < s.life);
  }

  function updateBullets(dt) {
    const out = [];
    for (const b of G.bullets) {
      b.t = (b.t || 0) + dt;
      if (b.type === 'bone') {
        if (b.targetH != null && b.h < b.targetH) {
          b.h = Math.min(b.targetH, b.h + (b.growRate || 420) * dt);
          if (b.fromBottom) b.y = FLOOR - b.h;
        }
        if (b.homing) {
          /* leans toward wherever you are, but never fast enough to trap you */
          const targetY = G.soul.y + G.soul.h / 2 - b.h / 2;
          const want = Math.max(-130, Math.min(130, (targetY - b.y) * 2.4));
          b.vy = (b.vy || 0) + (want - (b.vy || 0)) * Math.min(1, dt * 5);
        }
        b.x += (b.vx || 0) * dt;
        b.y += (b.vy || 0) * dt;
        const offRight = b.x > IN.x + IN.w + 120;
        const offLeft = b.x + b.w < IN.x - 120;
        const offDown = b.y > FLOOR + 120;
        const offUp = b.y + b.h < IN.y - 120;
        if (!offRight && !offLeft && !offDown && !offUp) out.push(b);
      } else if (b.type === 'blaster') {
        b.pt += dt;
        if (b.phase === 'wait') {
          if (b.pt > b.delay) { b.phase = 'in'; b.pt = 0; }
        } else if (b.phase === 'in') {
          if (b.pt > 0.38) {
            b.phase = 'aim';
            b.pt = 0;
            b.angle = aimAt(b);
          }
        } else if (b.phase === 'aim') {
          if (b.pt > 0.30) {
            b.phase = 'fire';
            b.pt = 0;
            audio.blaster();
            G.shake = Math.max(G.shake, 11);
            G.flash = Math.min(0.4, G.flash + 0.22);
            const o = blasterOrigin(b);
            const mx = o.x + Math.cos(b.angle) * 32;
            const my = o.y + Math.sin(b.angle) * 32;
            burstSparks(mx, my, 5);
            /* dust shoved off the muzzle at the same instant as the recoil */
            spawnDust(mx, my, b.angle);
          }
        } else if (b.phase === 'fire') {
          if (b.pt > 0.44) {
            if (b.shots > 0) {
              /* it swings back and lines up a second shot */
              b.shots--;
              b.phase = 'aim';
              b.pt = 0;
              b.angle = aimAt(b);
            } else { b.phase = 'out'; b.pt = 0; }
          }
        } else if (b.phase === 'out') {
          if (b.pt > 0.24) b.dead = true;
        }
        /* the moment it starts winding up, start the rising whine. It is timed
           to peak exactly when the beam goes off. */
        if (!b.charged && b.phase !== 'wait') {
          b.charged = true;
          audio.chargeRise(0.68 / diffNow().speed);
        }
        if (!b.dead) out.push(b);
      } else {
        out.push(b);
      }
    }
    G.bullets = out;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function checkCollisions() {
    if (G.mode !== 'bullet' || G.player.invuln > 0) return;
    const hb = soulHitbox();
    for (const b of G.bullets) {
      if (b.type === 'bone') {
        if (b._stood) { b._stood = false; continue; }
        if (rectsOverlap(hb, b)) { hurt(1); return; }
      } else if (b.type === 'blaster' && b.phase === 'fire') {
        if (blasterBeamHit(b, hb)) { hurt(1); return; }
      }
    }
  }

  function hurt(amount) {
    const p = G.player;
    if (p.invuln > 0) return;
    p.hp -= amount * diffNow().dmg;
    p.kr = Math.min(14, p.kr + 4);
    p.invuln = 0.85;
    if (G.run) {
      G.run.hits++;
      G.run.clean = 0;
      if (G.soul.mode === 'blue') G.run.blueHits++;
      if (G.phase >= 5) G.run.godHits++;
    }
    G.shake = 11;
    audio.hurt();
    burstSparks(G.soul.x + 6, G.soul.y + 5, 7);
    if (p.hp <= 0) die();
  }

  function die() {
    G.player.hp = 0;
    G.mode = 'dying';
    G.dyingT = 0;
    G.bullets = [];
    G.sparks = [];
    G.attack = null;
    achBump('deaths');
    achCheck('lose');
    audio.dying();
    audio.gameover();
  }

  /* ---------------- attacks ---------------- */
  const ATTACKS = {
    /* PHASE 1 ---------------------------------------------------------- */
    boneSweep() {
      let t = 0;
      let timer = 0.8;
      let waves = 0;
      return {
        dur: 9.6,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.4) {
            waves++;
            timer = waves > 3 ? 0.9 : 1.04;
            const gapH = waves > 3 ? 50 : 56;
            const gapY = IN.y + 6 + Math.random() * (IN.h - gapH - 12);
            const fromRight = Math.random() < 0.5;
            const w = 15;
            const x = fromRight ? IN.x + IN.w + 8 : IN.x - w - 8;
            const vx = fromRight ? -292 : 292;
            if (gapY > IN.y + 1) spawnBone({ x, y: IN.y, w, h: gapY - IN.y, vx });
            const low = gapY + gapH;
            if (low < FLOOR - 1) spawnBone({ x, y: low, w, h: FLOOR - low, vx });
            if (waves > 4 && Math.random() < 0.5) {
              const x2 = fromRight ? IN.x - w - 8 : IN.x + IN.w + 8;
              const gy = IN.y + 6 + Math.random() * (IN.h - gapH - 12);
              if (gy > IN.y + 1) spawnBone({ x: x2, y: IN.y, w, h: gy - IN.y, vx: -vx });
              if (gy + gapH < FLOOR - 1) spawnBone({ x: x2, y: gy + gapH, w, h: FLOOR - gy - gapH, vx: -vx });
            }
          }
          return t >= 9.4;
        },
      };
    },

    boneGap() {
      let t = 0;
      let timer = 0.55;
      return {
        dur: 9.4,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.2) {
            timer = 0.44;
            const fromTop = Math.random() < 0.5;
            const h = 44 + Math.random() * 64;
            const x = IN.x + 4 + Math.random() * (IN.w - 20);
            spawnBone({ x, y: fromTop ? IN.y - h : FLOOR, w: 14, h, vy: fromTop ? 315 : -315 });
          }
          return t >= 9.2;
        },
      };
    },

    boneSpikes() {
      let t = 0;
      let timer = 0.9;
      return {
        dur: 9.6,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.4) {
            timer = 0.86;
            const fromBottom = Math.random() < 0.5;
            const baseX = IN.x + 10 + Math.random() * (IN.w - 90);
            for (let i = 0; i < 3; i++) {
              const x = Math.min(IN.x + IN.w - 18, baseX + i * 52 + Math.random() * 14);
              const h = 42 + Math.random() * 58;
              spawnBone({
                x,
                y: fromBottom ? FLOOR - 4 : IN.y,
                w: 15,
                h: 5,
                targetH: h,
                growRate: 470,
                fromBottom,
              });
            }
          }
          return t >= 9.4;
        },
      };
    },

    boneTeeth() {
      let t = 0;
      let timer = 0.85;
      return {
        dur: 10.2,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.0) {
            timer = 0.95;
            const gapH = 48;
            const w = 15;
            const fromRight = Math.random() < 0.5;
            const x = fromRight ? IN.x + IN.w + 8 : IN.x - w - 8;
            const vx = fromRight ? -300 : 300;
            const gapY = IN.y + 6 + Math.random() * (IN.h - gapH - 12);
            if (gapY > IN.y + 1) spawnBone({ x, y: IN.y, w, h: gapY - IN.y, vx });
            const low = gapY + gapH;
            if (low < FLOOR - 1) spawnBone({ x, y: low, w, h: FLOOR - low, vx });

            const x2 = fromRight ? IN.x - w - 8 : IN.x + IN.w + 8;
            const gy2 = IN.y + 6 + Math.random() * (IN.h - gapH - 12);
            if (gy2 > IN.y + 1) spawnBone({ x: x2, y: IN.y, w, h: gy2 - IN.y, vx: -vx });
            if (gy2 + gapH < FLOOR - 1) spawnBone({ x: x2, y: gy2 + gapH, w, h: FLOOR - gy2 - gapH, vx: -vx });
          }
          return t >= 10.0;
        },
      };
    },

    boneCross() {
      let t = 0;
      let timer = 0.7;
      return {
        dur: 10,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.8) {
            timer = 0.72;
            if (Math.random() < 0.55) {
              const fromBottom = Math.random() < 0.5;
              const h = 40 + Math.random() * 50;
              const x = IN.x + 4 + Math.random() * (IN.w - 20);
              spawnBone({ x, y: fromBottom ? FLOOR : IN.y - h, w: 14, h, vy: fromBottom ? -300 : 300 });
            } else {
              const y = IN.y + 10 + Math.random() * (IN.h - 36);
              const fromRight = Math.random() < 0.5;
              spawnBone({
                x: fromRight ? IN.x + IN.w + 8 : IN.x - 70,
                y,
                w: 62,
                h: 16,
                vx: fromRight ? -330 : 330,
              });
            }
          }
          return t >= 9.8;
        },
      };
    },

    /* PHASE 2 ---------------------------------------------------------- */
    blueBones() {
      let t = 0;
      let timer = 0.7;
      return {
        dur: 10,
        blue: true,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.8) {
            timer = 0.92;
            const h = 26 + Math.random() * 18;
            spawnBone({ x: IN.x + IN.w + 8, y: FLOOR - h, w: 15, h, vx: -268 });
            if (Math.random() < 0.6) {
              spawnBone({ x: IN.x + IN.w + 140, y: FLOOR - 76, w: 78, h: 9, vx: -268, solid: true });
            }
          }
          return t >= 9.8;
        },
      };
    },

    blueStairs() {
      let t = 0;
      let timer = 1.05;
      let flip = 0;
      return {
        dur: 10.2,
        blue: true,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.9) {
            timer = 0.9;
            flip++;
            const y = FLOOR - (flip % 2 ? 46 : 84);
            spawnBone({ x: IN.x + IN.w + 10, y, w: 98, h: 10, vx: -165, solid: true });
            spawnBone({ x: IN.x + IN.w + 10, y: FLOOR - 32, w: 15, h: 32, vx: -165 });
            if (flip % 3 === 0) {
              spawnBone({ x: IN.x + IN.w + 60, y: IN.y, w: 15, h: 34, vx: -165 });
            }
          }
          return t >= 10.0;
        },
      };
    },

    /* ---------------- the lethal deal ----------------
       Every bone here is coloured, and they come from everywhere at once. */
    lethalColour() {
      let t = 0;
      let timer = 0.45;
      return {
        dur: 10.5,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.4) {
            timer = 0.28;
            const col = ['#ffffff', '#ff4040', '#5fd0ff', '#ffd84a'][(Math.random() * 4) | 0];
            const side = Math.random() < 0.5 ? 1 : -1;
            spawnBone({
              x: side > 0 ? IN.x + IN.w + 8 : IN.x - 24,
              y: IN.y + 10 + Math.random() * (IN.h - 50),
              w: 14, h: 34, vx: -side * (210 + Math.random() * 140), color: col,
            });
          }
          return t >= 10.3;
        },
      };
    },

    lethalTorrent() {
      let t = 0;
      let timer = 0.32;
      return {
        dur: 10.4,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.2) {
            timer = 0.22;
            spawnBone({
              x: IN.x + 6 + Math.random() * (IN.w - 24),
              y: FLOOR - 42, w: 16, h: 42, vy: -300, fromBottom: true,
              color: Math.random() < 0.5 ? '#ff4040' : '#ffd84a',
            });
          }
          return t >= 10.2;
        },
      };
    },

    lethalBlades() {
      let t = 0;
      let timer = 0.55;
      return {
        dur: 11.0,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.6) {
            timer = 0.4;
            const a = Math.random() * Math.PI * 2;
            spawnBlaster(a, 0);
            spawnBlaster(a + Math.PI, 0.28);
            spawnBone({
              x: IN.x + IN.w + 10, y: IN.y + 8, w: 15, h: IN.h - 16, vx: -235,
              color: ['#5fd0ff', '#ff4040', '#ffffff'][(Math.random() * 3) | 0],
            });
          }
          return t >= 10.8;
        },
      };
    },

    lethalCage() {
      let t = 0;
      let timer = 0.95;
      return {
        dur: 10.6,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.0) {
            timer = 0.66;
            const gapY = IN.y + 24 + Math.random() * (IN.h - 72);
            spawnBone({ x: IN.x + 40, y: IN.y - 6, w: 16, h: gapY - IN.y, vy: 250, color: '#ff4040' });
            spawnBone({ x: IN.x + 130, y: gapY + 36, w: 16, h: IN.y + IN.h - gapY - 36, vy: -250, fromBottom: true, color: '#ffd84a' });
            spawnBlaster(Math.PI / 2, 0.15);
          }
          return t >= 10.4;
        },
      };
    },

    lethalHold() {
      /* he keeps the soul himself for this one: it burns while he holds it, and
         moving is exactly what he is punishing */
      let t = 0;
      let timer = 1.1;
      return {
        dur: 9.2,
        dark: true,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.6) {
            timer = 1.1;
            spawnBlaster(Math.random() * Math.PI * 2, 0);
          }
          return t >= 9.0;
        },
      };
    },

    blueGauntlet() {
      let t = 0;
      let timer = 1.3;
      return {
        dur: 10.3,
        blue: true,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.0) {
            timer = 1.7;
            spawnBlaster(Math.PI / 2, 0);
            spawnBone({ x: IN.x + IN.w + 8, y: FLOOR - 26, w: 15, h: 26, vx: -270 });
            if (Math.random() < 0.4) {
              spawnBone({ x: IN.x + IN.w + 8, y: FLOOR - 96, w: 15, h: 26, vx: -270 });
            }
          }
          return t >= 10.1;
        },
      };
    },

    blueRain() {
      let t = 0;
      let timer = 0.6;
      return {
        dur: 10.4,
        blue: true,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.2) {
            timer = 0.95;
            const x = IN.x + 6 + Math.random() * (IN.w - 26);
            spawnBone({ x, y: IN.y - 50, w: 14, h: 50, vy: 300 });
            if (Math.random() < 0.45) {
              spawnBone({ x: x + 40, y: FLOOR - 88, w: 66, h: 10, solid: true, vx: -18 });
            }
          }
          return t >= 10.2;
        },
      };
    },

    /* PHASE 3 ---------------------------------------------------------- */
    blasterArray() {
      let t = 0;
      let timer = 1.0;
      let n = 0;
      return {
        dur: 10.2,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.9) {
            timer = 1.05;
            n++;
            const base = Math.random() * Math.PI * 2;
            spawnBlaster(base, 0);
            spawnBlaster(base + 2.3, 0.24);
            if (n % 3 === 0) spawnBlaster(base + 4.2, 0.5);
            if (n % 3 === 0) {
              spawnBone({ x: IN.x + IN.w + 8, y: FLOOR - 24, w: 14, h: 24, vx: -280 });
            }
          }
          return t >= 10.0;
        },
      };
    },

    boneRush() {
      let t = 0;
      let timer = 0.95;
      return {
        dur: 10,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.6) {
            timer = 1.1;
            const gapH = 46;
            const gapY = IN.y + 4 + Math.random() * (IN.h - gapH - 8);
            const w = 15;
            const x = IN.x + IN.w + 8;
            if (gapY > IN.y + 1) spawnBone({ x, y: IN.y, w, h: gapY - IN.y, vx: -330 });
            const low = gapY + gapH;
            if (low < FLOOR - 1) spawnBone({ x, y: low, w, h: FLOOR - low, vx: -330 });
            if (Math.random() < 0.5) spawnBlaster(null, 0.3);
          }
          return t >= 9.8;
        },
      };
    },

    blasterRing() {
      let t = 0;
      let timer = 1.6;
      return {
        dur: 10.6,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.0) {
            timer = 1.85;
            const off = Math.random() * Math.PI * 2;
            for (let i = 0; i < 5; i++) spawnBlaster(off + (i * Math.PI * 2) / 5, i * 0.2);
          }
          return t >= 10.4;
        },
      };
    },

    overwhelm() {
      let t = 0;
      let bt = 1.0;
      let rt = 0.3;
      return {
        dur: 11,
        blue: false,
        update(dt) {
          t += dt;
          bt -= dt;
          rt -= dt;
          if (bt <= 0 && t < 9.4) { bt = 1.2; spawnBlaster(null, 0); }
          if (rt <= 0 && t < 9.4) {
            rt = 0.45;
            const x = IN.x + 6 + Math.random() * (IN.w - 24);
            if (Math.random() < 0.6) spawnBone({ x, y: IN.y - 62, w: 14, h: 62, vy: 330 });
            else spawnBone({ x, y: FLOOR, w: 14, h: 62, vy: -330 });
          }
          return t >= 10.8;
        },
      };
    },

    blasterCross() {
      let t = 0;
      let timer = 1.0;
      let n = 0;
      return {
        dur: 10.6,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.2) {
            timer = 1.1;
            n++;
            const base = (n * Math.PI) / 2 + (Math.random() < 0.5 ? Math.PI / 4 : 0);
            spawnBlaster(base, 0);
            spawnBlaster(base + Math.PI, 0.15);
            if (n % 3 === 0) spawnBlaster(base + Math.PI / 2, 0.3);
            if (n % 3 === 0) {
              spawnBone({ x: IN.x + IN.w + 8, y: FLOOR - 22, w: 14, h: 22, vx: -300 });
            }
          }
          return t >= 10.4;
        },
      };
    },

    blueHurdles() {
      /* short bones to jump, tall ones to sit still under */
      let t = 0;
      let timer = 0.8;
      let n = 0;
      return {
        dur: 10.2,
        blue: true,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.8) {
            timer = 1.05;
            n++;
            const tall = n % 3 === 0;
            const h = tall ? 76 : 28 + Math.random() * 10;
            spawnBone({ x: IN.x + IN.w + 8, y: FLOOR - h, w: 15, h, vx: -250 });
            if (!tall && Math.random() < 0.45) {
              spawnBone({ x: IN.x + IN.w + 120, y: FLOOR - 98, w: 14, h: 28, vx: -250, solid: true });
            }
          }
          return t >= 10.0;
        },
      };
    },

    blueGate() {
      /* a wall with one gap: you have to be in the air as it passes */
      let t = 0;
      let timer = 1.1;
      return {
        dur: 10.2,
        blue: true,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 8.8) {
            timer = 1.7;
            const w = 26;
            const gapTop = FLOOR - 80;
            const gapBot = FLOOR - 42;
            const x = IN.x + IN.w + 10;
            if (gapTop > IN.y) spawnBone({ x, y: IN.y, w, h: gapTop - IN.y, vx: -122 });
            if (gapBot < FLOOR) spawnBone({ x, y: gapBot, w, h: FLOOR - gapBot, vx: -122 });
            if (Math.random() < 0.4) {
              spawnBone({ x: x + 90, y: FLOOR - 30, w: 15, h: 30, vx: -122 });
            }
          }
          return t >= 10.0;
        },
      };
    },

    boneCrossfire() {
      /* bones on the diagonal, from all four edges */
      let t = 0;
      let timer = 0.4;
      let bt = 1.2;
      return {
        dur: 10.4,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          bt -= dt;
          if (timer <= 0 && t < 9.0) {
            timer = 0.52;
            const side = Math.floor(Math.random() * 4);
            const drift = (Math.random() - 0.5) * 120;
            if (side === 0) spawnBone({ x: IN.x + IN.w + 10, y: IN.y + Math.random() * (IN.h - 40), w: 15, h: 40, vx: -240, vy: drift });
            else if (side === 1) spawnBone({ x: IN.x - 25, y: IN.y + Math.random() * (IN.h - 40), w: 15, h: 40, vx: 240, vy: drift });
            else if (side === 2) spawnBone({ x: IN.x + Math.random() * (IN.w - 40), y: IN.y - 50, w: 15, h: 40, vx: drift, vy: 240 });
            else spawnBone({ x: IN.x + Math.random() * (IN.w - 40), y: FLOOR + 10, w: 15, h: 40, vx: drift, vy: -240 });
          }
          if (bt <= 0 && t < 9.0) { bt = 1.9; spawnBlaster(null, 0); }
          return t >= 10.2;
        },
      };
    },

    blasterSustain() {
      /* blasters that re-aim and fire twice from each position */
      let t = 0;
      let timer = 1.3;
      return {
        dur: 10.6,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.2) {
            timer = 2.2;
            const base = Math.random() * Math.PI * 2;
            spawnBlaster(base, 0, 2);
            spawnBlaster(base + Math.PI, 0.65, 1);
            if (Math.random() < 0.5) {
              spawnBone({ x: IN.x + IN.w + 8, y: FLOOR - 24, w: 14, h: 24, vx: -285 });
            }
          }
          return t >= 10.4;
        },
      };
    },

    boneChase() {
      /* slow bones that follow you across the box, plus covering fire */
      let t = 0;
      let timer = 0.7;
      let side = 1;
      let bt = 1.4;
      return {
        dur: 10.6,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          bt -= dt;
          if (timer <= 0 && t < 9.2) {
            timer = 0.95;
            side = -side;
            const y = G.soul.y - 15 + (Math.random() - 0.5) * 20;
            spawnBone({
              x: side > 0 ? IN.x + IN.w + 10 : IN.x - 25,
              y: Math.max(IN.y + 2, Math.min(FLOOR - 40, y)),
              w: 16, h: 44, vx: 205 * side, homing: true,
            });
          }
          if (bt <= 0 && t < 9.2) { bt = 2.1; spawnBlaster(null, 0); }
          return t >= 10.4;
        },
      };
    },

    soulSlams() {
      /* he takes hold of the SOUL and throws it at the corners of the box,
         along the lines where the bones are already sweeping */
      let t = 0;
      let slamT = 0.2;
      let yank = 0;
      let target = { x: IN.x + IN.w / 2, y: IN.y + IN.h / 2 };
      return {
        dur: 10.4,
        blue: false,
        update(dt) {
          t += dt;
          slamT -= dt;
          yank -= dt;
          if (slamT <= 0 && t < 9.6) {
            slamT = 1.3;
            yank = 0.4;
            const cs = [
              { x: IN.x + 26, y: IN.y + 22 },
              { x: IN.x + IN.w - 26, y: IN.y + 22 },
              { x: IN.x + 26, y: FLOOR - 22 },
              { x: IN.x + IN.w - 26, y: FLOOR - 22 },
            ];
            target = cs[Math.floor(Math.random() * cs.length)];
            const fromLeft = target.x > IN.x + IN.w / 2;
            const y = target.y < IN.y + IN.h / 2 ? IN.y + 6 : FLOOR - 40;
            /* one raking across the row he is dragging you to... */
            spawnBone({ x: fromLeft ? IN.x + IN.w + 8 : IN.x - 23, y, w: 15, h: 34, vx: fromLeft ? -275 : 275 });
            /* ...and one dropping straight onto the corner itself */
            spawnBone({ x: target.x - 7, y: IN.y - 42, w: 15, h: 36, vy: 265 });
          }
          /* the throw is fast enough to beat your feet; the rest is a pull
             you can lean against */
          G.soul.pull = { x: target.x, y: target.y, power: yank > 0 ? 336 : 120 };
          return t >= 10.2;
        },
      };
    },

    soulTug() {
      /* it does not let go: the heart is drawn around a slow circle while he
         aims the blasters at where it is being taken */
      let t = 0;
      let angle = 0;
      let bt = 0.8;
      return {
        dur: 10.6,
        blue: false,
        update(dt) {
          t += dt;
          angle += dt * 0.62;
          const x = IN.x + IN.w * (0.5 + Math.cos(angle) * 0.33);
          const y = IN.y + IN.h * (0.5 + Math.sin(angle) * 0.3);
          G.soul.pull = { x, y, power: 124 };
          bt -= dt;
          if (bt <= 0 && t < 9.4) {
            bt = 1.1;
            spawnBlaster(angle, 0, 1);
          }
          return t >= 10.4;
        },
      };
    },

    astralRain() {
      /* the astral hour: bones out of the ceiling, blasters out of nowhere,
         and the box itself leaning on the SOUL */
      let t = 0;
      let boneT = 0.35;
      let bt = 1.0;
      return {
        dur: 11.2,
        blue: false,
        update(dt) {
          t += dt;
          G.soul.pull = { x: IN.x + IN.w / 2, y: IN.y + IN.h / 2, power: 54 };
          boneT -= dt;
          if (boneT <= 0 && t < 10.2) {
            boneT = 0.42;
            const x = IN.x + 8 + Math.random() * (IN.w - 40);
            spawnBone({ x, y: IN.y - 46, w: 15, h: 40, vy: 235 });
          }
          bt -= dt;
          if (bt <= 0 && t < 9.6) {
            bt = 1.25;
            spawnBlaster(null, 0, 1);
          }
          return t >= 11.0;
        },
      };
    },

    heartCage() {
      /* four walls closing in, each with one gap, and the gaps do not line up */
      let t = 0;
      let timer = 0.3;
      return {
        dur: 10.6,
        blue: false,
        update(dt) {
          t += dt;
          timer -= dt;
          if (timer <= 0 && t < 9.8) {
            timer = 2.15;
            const w = 20;
            const gap = 46;
            /* left and right: a vertical gap each */
            const g1 = IN.y + 24 + Math.random() * (IN.h - 70);
            const g2 = IN.y + 24 + Math.random() * (IN.h - 70);
            spawnBone({ x: IN.x - 6, y: IN.y, w, h: g1 - IN.y, vx: 112 });
            spawnBone({ x: IN.x - 6, y: g1 + gap, w, h: FLOOR - (g1 + gap), vx: 112 });
            spawnBone({ x: IN.x + IN.w - 14, y: IN.y, w, h: g2 - IN.y, vx: -112 });
            spawnBone({ x: IN.x + IN.w - 14, y: g2 + gap, w, h: FLOOR - (g2 + gap), vx: -112 });
            /* every other cage, a pair out of the ceiling with a wide gap */
            if (Math.random() < 0.5) {
              const gx = IN.x + 40 + Math.random() * (IN.w - 180);
              spawnBone({ x: IN.x, y: IN.y - 6, w: gx - IN.x, h: 18, vy: 138 });
              spawnBone({ x: gx + 84, y: IN.y - 6, w: IN.x + IN.w - (gx + 84), h: 18, vy: 138 });
            }
          }
          return t >= 10.4;
        },
      };
    },

    godChaos() {
      /* last phase: the script is gone. Two of his own attacks run at once,
         picked at random, and when they finish he picks again. No two turns
         are the same and nothing in here is hand-placed. */
      const pool = [
        'boneSweep', 'boneGap', 'boneSpikes', 'boneTeeth', 'boneCross',
        'blasterArray', 'boneRush', 'blasterRing', 'overwhelm', 'blasterCross',
        'soulSlams', 'soulTug', 'blasterSustain', 'boneCrossfire',
        'astralRain', 'heartCage',
      ];
      let mods = [];
      let names = [];
      let last = null;

      function pick() {
        const a = pool[Math.floor(Math.random() * pool.length)];
        let b = pool[Math.floor(Math.random() * pool.length)];
        if (b === a || b === last) b = pool[(pool.indexOf(a) + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length];
        last = b;
        mods = [ATTACKS[a](), ATTACKS[b]()].map((m, i) => ({ m, done: false, name: i === 0 ? a : b }));
        names = [a, b];
      }
      pick();

      let t = 0;
      return {
        dur: 11.4,
        blue: false,
        get pick() { return names.join(' + '); },
        update(dt) {
          t += dt;
          for (const s of mods) {
            if (s.done) continue;
            s.done = !!s.m.update(dt);
          }
          /* both spent but the turn is not: he starts something else */
          if (mods.every((s) => s.done) && t < 9.6) pick();
          return t >= 11.2;
        },
      };
    },

    finale() {
      /* the special attack: the screen cracks, then comes apart */
      let t = 0;
      let cracked = false;
      let burst = false;
      return {
        dur: 4.2,
        blue: false,
        update(dt) {
          t += dt;
          if (!cracked && t >= 0.9) { cracked = true; startCracks(); audio.crack(); G.shake = 6; }
          if (!burst && t >= 1.5) { burst = true; shatterScreen(); }
          updateShatter(dt);
          return t >= 4.0;
        },
      };
    },
  };

  /* ---------------- screen shatter ---------------- */
  function makeCracks() {
    const cx = W / 2;
    const cy = 186;
    const out = [];
    for (let i = 0; i < 10; i++) {
      let a = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      let x = cx;
      let y = cy;
      const pts = [[x, y]];
      for (let k = 0; k < 6; k++) {
        const len = 40 + Math.random() * 75;
        a += (Math.random() - 0.5) * 0.75;
        x += Math.cos(a) * len;
        y += Math.sin(a) * len;
        pts.push([x, y]);
      }
      out.push(pts);
    }
    return out;
  }

  function snapshotScreen() {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    c.getContext('2d').drawImage(canvas, 0, 0);
    return c;
  }

  function makeShards() {
    const cols = 4;
    const rows = 3;
    const shards = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const w = W / cols;
        const h = H / rows;
        const x = c * w;
        const y = r * h;
        const cx = x + w / 2;
        const cy = y + h / 2;
        const dx = cx - W / 2;
        const dy = cy - H / 2;
        const d = Math.hypot(dx, dy) || 1;
        const sp = 90 + Math.random() * 220;
        /* thrown outward, flicked up a little, then dropped by gravity. They
           start already askew, so the break never reads as a lattice lifting
           off in step */
        shards.push({
          x, y, w, h, cx, cy,
          vx: (dx / d) * sp * (0.7 + Math.random() * 0.6),
          vy: (dy / d) * sp * 0.5 - (40 + Math.random() * 150),
          rot: (Math.random() - 0.5) * 0.14,
          spin: (Math.random() - 0.5) * 7,
        });
      }
    }
    /* offcuts: small chips taken from wherever they land, so the glass breaks
       into slivers as well as panes */
    for (let i = 0; i < 16; i++) {
      const cw = 7 + Math.random() * 24;
      const ch = 7 + Math.random() * 24;
      const cx0 = Math.random() * (W - cw);
      const cy0 = Math.random() * (H - ch);
      const cx = cx0 + cw / 2;
      const cy = cy0 + ch / 2;
      const dx = cx - W / 2;
      const dy = cy - H / 2;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 130 + Math.random() * 250;
      shards.push({
        x: cx0, y: cy0, w: cw, h: ch, cx, cy, chip: true,
        vx: (dx / d) * sp * (0.8 + Math.random() * 0.7),
        vy: (dy / d) * sp * 0.55 - (50 + Math.random() * 170),
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 15,
      });
    }
    return shards;
  }

  function startCracks() {
    G.shatter = { t: 0, burst: false, cracks: makeCracks(), shards: [], snap: null };
  }

  function shatterScreen() {
    if (!G.shatter) startCracks();
    G.shatter.burst = true;
    G.shatter.t = 0;
    G.shatter.snap = snapshotScreen();
    G.shatter.shards = makeShards();
    G.flash = 0.75;
    G.shake = 18;
    audio.boom();
  }

  /* the pieces are thrown, then fall: gravity takes them off the bottom edge */
  const SHARD_GRAV = 1500;

  function updateShatter(dt) {
    const s = G.shatter;
    if (!s) return;
    s.t += dt;
    if (!s.burst) return;
    const d = Math.min(dt, 0.05);
    for (const p of s.shards) {
      p.vy += SHARD_GRAV * d;
      p.cx += p.vx * d;
      p.cy += p.vy * d;
      p.rot += p.spin * d;
    }
  }

  function drawShatter() {
    const s = G.shatter;
    if (!s) return;

    if (!s.burst) {
      const k = Math.min(1, s.t / 0.45);
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#cfe4ff';
      ctx.shadowBlur = 10;
      for (const pts of s.cracks) {
        const upto = Math.max(2, Math.round(pts.length * k));
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < upto; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    /* the pieces tumble apart over black */
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (!s.snap) return;
    const fade = Math.max(0, 1 - Math.max(0, s.t - 1.15) / 0.75);
    ctx.save();
    ctx.globalAlpha = fade;
    for (const p of s.shards) {
      if (p.cx < -p.w || p.cx > W + p.w || p.cy < -p.h || p.cy > H + p.h) continue;
      ctx.save();
      ctx.translate(p.cx, p.cy);
      ctx.rotate(p.rot);
      ctx.drawImage(s.snap, p.x, p.y, p.w, p.h, -p.w / 2, -p.h / 2, p.w, p.h);
      /* a chip carries almost no picture, so give it an edge to catch the eye */
      if (p.chip) {
        ctx.globalAlpha = fade * 0.45;
        ctx.strokeStyle = '#cfe0ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.globalAlpha = fade;
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------------- drawing bullets ---------------- */
  function drawBones() {
    for (const b of G.bullets) {
      if (b.type !== 'bone') continue;
      if (b.t < 0.08) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.round(b.x) - 3, Math.round(b.y) - 3, Math.round(b.w) + 6, Math.round(b.h) + 6);
        ctx.globalAlpha = 1;
      }
      drawBone(b);
    }
  }

  /* Undertale's bone: one straight shaft with a knuckle at each end. Drawn
     upright and rotated, so floor bones, ceiling bones and sideways bones all
     get the same shape. */
  function drawBone(b) {
    const vertical = b.h >= b.w;
    const len = vertical ? b.h : b.w;
    const thick = vertical ? b.w : b.h;

    ctx.save();
    ctx.translate(Math.round(b.x + b.w / 2), Math.round(b.y + b.h / 2));
    if (!vertical) ctx.rotate(Math.PI / 2);

    const knob = Math.min(thick * 0.31, len * 0.25);
    const shaftW = Math.max(2, thick - knob * 2);
    const endY = len / 2 - knob;

    ctx.fillStyle = diffNow().lethal
      ? lethalBoneCol((b.x + b.y) * 0.06)
      : (b.color || (b.solid ? '#8fd0ff' : '#fff'));
    ctx.beginPath();
    ctx.rect(-shaftW / 2, -endY, shaftW, endY * 2);
    for (const sy of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const kx = sx * (thick / 2 - knob);
        const ky = sy * endY;
        ctx.moveTo(kx + knob, ky);
        ctx.arc(kx, ky, knob, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.restore();
  }

  /* how far the skull has kicked back since it fired, in local pixels */
  /* ---------------- blaster muzzle dust ----------------
     A ring of it is shoved off the skull the frame the beam goes off, in the
     plane the beam leaves through, so it reads as the same hit as the recoil. */
  const DUST_LIFE = 0.3;

  function spawnDust(x, y, angle) {
    G.dust.push({ x, y, angle, t: 0 });
  }

  function updateDust(dt) {
    if (!G.dust.length) return;
    for (const d of G.dust) d.t += dt;
    G.dust = G.dust.filter((d) => d.t < DUST_LIFE);
  }

  function drawDust() {
    for (const d of G.dust) {
      const k = Math.min(1, d.t / DUST_LIFE);
      const a = (1 - k) * (1 - k) * 0.55;
      const r = 9 + 44 * k;
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.scale(0.42, 1);   /* squashed along the beam: it is a ring, not a disc */
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(226,226,255,' + a.toFixed(3) + ')';
      ctx.lineWidth = 3.5 * (1 - k) + 0.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + (a * 0.45).toFixed(3) + ')';
      ctx.lineWidth = 2 * (1 - k) + 0.4;
      ctx.stroke();
      ctx.restore();
    }
  }

  /* how far along its wind-up a blaster is, 0..1 — the wobble uses the same
     clock, so the glow and the strain build together */
  function chargeLevel(b) {
    if (b.phase === 'aim') return Math.min(1, b.pt / 0.30);
    if (b.phase === 'in' && b.pt > 0.18) return Math.max(0, Math.min(1, (b.pt - 0.18) / 0.2));
    if (b.phase === 'fire' && b.pt < 0.1) return Math.max(0, 1 - b.pt / 0.1);
    return 0;
  }

  /* the light gathering in the back of its throat */
  function drawChargeGlows() {
    for (const b of G.bullets) {
      if (b.type !== 'blaster') continue;
      const ch = chargeLevel(b);
      if (ch <= 0.02) continue;
      const dist = 24 + 8 * ch;
      const px = b.x + 21 + Math.cos(b.angle) * dist;
      const py = b.y + 28 + Math.sin(b.angle) * dist;
      const r = (5 + 13 * ch) * (1 + Math.sin(b.pt * 68) * 0.16);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(255,255,255,' + (0.92 * ch).toFixed(3) + ')');
      g.addColorStop(0.42, 'rgba(208,208,255,' + (0.44 * ch).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(110,110,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();

      /* the hot core of it */
      ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * ch).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(px, py, r * 0.3, 0, Math.PI * 2);
      ctx.fill();

      /* a ring that tightens as it reaches full charge */
      if (ch > 0.5) {
        ctx.globalAlpha = ((ch - 0.5) / 0.5) * 0.55;
        ctx.strokeStyle = '#dcdcff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(px, py, r * (1.55 - 0.55 * ch), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function blasterKick(b) {
    if (b.phase !== 'fire') return 0;
    const k = Math.max(0, 1 - b.pt / 0.16);
    return -6 * k * k;
  }

  function drawBeams() {
    for (const b of G.bullets) {
      if (b.type !== 'blaster' || b.phase !== 'fire') continue;
      const grow = Math.min(1, b.pt / 0.07);
      const len = 900 * grow;
      const y0 = 16 * BLASTER_S;
      ctx.save();
      ctx.translate(b.x + 21, b.y + 28);
      ctx.rotate(b.angle - Math.PI / 2);
      /* the beam leaves from the muzzle, which has just been shoved back */
      ctx.translate(0, blasterKick(b));
      ctx.fillStyle = '#d6d6ff';
      ctx.globalAlpha = 0.22;
      ctx.fillRect(-29, y0, 58, len);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(-21, y0 + 3, 42, len);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-BEAM_HALF, y0 + 5, BEAM_HALF * 2, len);
      /* hairline on the hurt edge: inside the white burns, the glow outside it
         does not, so the safe edge is where you can see it */
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = '#a8a8e0';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-BEAM_HALF - 0.7, y0 + 4, BEAM_HALF * 2 + 1.4, len);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  function drawBlasters() {
    for (const b of G.bullets) {
      if (b.type !== 'blaster' || b.phase === 'wait') continue;
      const img = SPR['blaster_' + (b.frame % 6)] || SPR.blaster_0;
      let scale = 1;
      let alpha = 1;
      if (b.phase === 'in') { scale = 0.55 + 0.45 * Math.min(1, b.pt / 0.38); alpha = Math.min(1, b.pt / 0.22); }
      if (b.phase === 'out') { alpha = Math.max(0, 1 - b.pt / 0.24); scale = 1.06; }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(b.x + 21, b.y + 28);
      ctx.rotate(b.angle - Math.PI / 2);

      /* warm-up: it rocks and strains while the charge builds */
      if (b.phase === 'aim' || (b.phase === 'in' && b.pt > 0.18)) {
        const k = Math.max(0, Math.min(1, b.phase === 'aim' ? b.pt / 0.3 : (b.pt - 0.18) / 0.2));
        ctx.rotate(Math.sin(b.pt * 62) * 0.07 * k);
        ctx.translate(Math.sin(b.pt * 47) * 2.4 * k, 0);
        scale *= 1 + Math.sin(b.pt * 55) * 0.045 * k;
      }

      /* recoil: shoved backwards the instant it fires, then settles */
      ctx.translate(0, blasterKick(b));
      if (b.phase === 'fire') scale *= 1 + 0.06 * Math.max(0, 1 - b.pt / 0.16);

      ctx.scale(scale * BLASTER_S, scale * BLASTER_S);
      if (img && img.complete) ctx.drawImage(img, -21, -28, 43, 57);
      ctx.restore();
      ctx.globalAlpha = 1;
      if (b.phase === 'aim') {
        const o = blasterOrigin(b);
        const d = 20 * BLASTER_S;
        /* its line, drawn out over the last third of the charge: dashed while
           it is still settling, solid in the instant before the beam */
        if (b.pt > 0.10) {
          const k = Math.min(1, (b.pt - 0.10) / 0.20);
          ctx.save();
          ctx.globalAlpha = 0.12 + 0.30 * k;
          ctx.strokeStyle = '#dcdcff';
          ctx.lineWidth = 1 + 0.8 * k;
          ctx.setLineDash(k > 0.75 ? [] : [7, 8]);
          ctx.beginPath();
          ctx.moveTo(o.x + Math.cos(b.angle) * (d + 2), o.y + Math.sin(b.angle) * (d + 2));
          ctx.lineTo(o.x + Math.cos(b.angle) * 900, o.y + Math.sin(b.angle) * 900);
          ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.round(o.x + Math.cos(b.angle) * d) - 3, Math.round(o.y + Math.sin(b.angle) * d) - 3, 6, 6);
      }
    }
  }

  function drawSparks() {
    for (const s of G.sparks) {
      const img = SPR['spark_' + (s.f % 4)];
      ctx.globalAlpha = Math.max(0, 1 - s.t / s.life);
      if (img && img.complete) ctx.drawImage(img, Math.round(s.x) - 8, Math.round(s.y) - 8, 16, 16);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- turns ---------------- */
  const TURN_ATTACKS = {
    1: 'boneSweep',
    2: 'boneGap',
    3: 'boneSpikes',
    4: 'boneTeeth',
    5: 'boneCross',
    6: 'blueBones',
    7: 'blueStairs',
    8: 'blueGauntlet',
    9: 'blueRain',
    10: 'blueHurdles',
    11: 'blueGate',
    12: 'blasterArray',
    13: 'boneRush',
    14: 'soulSlams',
    15: 'blasterRing',
    16: 'overwhelm',
    17: 'soulTug',
    18: 'blasterCross',
    19: 'boneCrossfire',
    20: 'blasterSustain',
    21: 'boneChase',
    22: 'astralRain',
    23: 'heartCage',
    24: 'finale',
  };

  const LAST_TURN = 20;

  function phaseForTurn(turn) {
    if (turn >= 20) return 5;
    if (turn >= 16) return 4;
    if (turn >= 11) return 3;
    if (turn >= 6) return 2;
    return 1;
  }

  function startGame() {
    const d = diffNow();
    saveDiff();
    G.player = { name: 'FRISK', lv: 19, hp: d.hp, maxhp: d.hp, kr: 0, invuln: 0 };
    G.items = START_ITEMS();
    G.run = { diff: G.diff.i, hits: 0, items: 0, perfect: 0, blueHits: 0, godHits: 0, time: 0, clean: 0, maxClean: 0, mercy: 0, hitAtStart: 0 };
    G.turn = 1;
    G.phase = 0;
    G.banner = null;
    G.bannerPending = false;
    G.flags = freshFlags();
    G.sans = { pose: 'idle', frameIdx: 0, animT: 0, poseHold: 0, poseT: 0, face: 'face_0', alpha: 1, bob: 0 };
    G.bullets = [];
    G.sparks = [];
    G.trail = [];
    G.dust = [];
    G.attack = null;
    G.shatter = null;
    G.saidLowHp = false;
    centreSoul();
    G.soul.mode = 'red';
    audio.setTrack('main');
    showDialogue(STORY.intro, () => startPlayerTurn());
  }

  function startPlayerTurn() {
    G.mode = 'menu';
    G.menu.i = 0;
    G.menu.kind = 'main';
    G.bullets = [];
    G.sparks = [];
    G.trail = [];
    G.dust = [];
    G.attack = null;
    G.player.invuln = 0;
    G.soul.pull = null;
    G.soul.mode = 'red';
    centreSoul();
    if (G.sans.pose !== 'tired') {
      sansPose('idle');
      G.sans.face = PHASE_FACE[G.phase] || 'face_0';
    }
  }

  function endPlayerAction() {
    startEnemyTurn();
  }

  /* the lethal fight's own run of attacks, cycled for every turn */
  const LETHAL_TURNS = ['lethalColour', 'lethalTorrent', 'lethalBlades', 'lethalCage', 'lethalHold'];

  function startEnemyTurn() {
    achBump('turns');
    let key = diffNow().lethal
      ? (G.turn >= 24 ? 'finale' : LETHAL_TURNS[(G.turn - 1) % LETHAL_TURNS.length])
      : TURN_ATTACKS[G.turn];
    if (!key) { endFightSequence(); return; }
    const ph = diffNow().lethal ? 5 : phaseForTurn(G.turn);
    if (ph !== G.phase) {
      G.phase = ph;
      G.bannerPending = true;
      /* the last phase is where he finally reaches for it */
      if (ph === 5) swordAnim('equip');
    }
    /* checked once the phase is set, so "reach the last phase" sees it */
    achCheck('turn');
    /* once he is like this he does not use his own turn list any more — every
       turn in the last phase is improvised, except the special attack */
    if (ph === 5 && key !== 'finale') key = 'godChaos';
    const introLines = STORY.phase[G.turn];
    if (introLines && !G.flags.intros[G.turn]) {
      G.flags.intros[G.turn] = true;
      const go = () => showDialogue(introLines, () => runAttack(key));
      /* the astral hour opens on the house when it still had people in it,
         and the last phase opens on the night it emptied */
      if (G.turn === 16 && !G.flags.memory) {
        G.flags.memory = true;
        startMemory(go);
      } else if (G.turn === 20 && !G.flags.memory2) {
        G.flags.memory2 = true;
        startMemory(go, MEMORY2);
      } else {
        go();
      }
    } else {
      runAttack(key);
    }
  }

  function runAttack(key) {
    if (G.bannerPending) {
      G.banner = { name: 'PHASE ' + G.phase, sub: PHASE_SUB[G.phase], t: 0 };
      G.bannerPending = false;
      G.flash = Math.max(G.flash, 0.55);
      G.shake = 12;
      audio.phase();
      if (G.phase === 3) audio.setTrack('phase3', { quantize: true });
      if (G.phase === 4) audio.phase();
      if (G.phase === 5) audio.boom();
    }
    G.sans.face = PHASE_FACE[G.phase] || 'face_0';
    const atk = ATTACKS[key]();
    G.attack = atk;
    G.attackKey = key;
    G.attack.t = 0;
    if (G.run) G.run.hitAtStart = G.run.hits;
    G.bullets = [];
    G.sparks = [];
    G.trail = [];
    G.dust = [];
    G.mode = 'bullet';
    /* his own track takes over for this fight */
    if (diffNow().lethal) audio.setTrack('lethal', { quantize: true });
    /* attacks that take the soul hold it for their whole length */
    G.soul.dark = atk.dark ? atk.dur : 0;
    G.soul.pull = null;
    G.soul.mode = atk.blue ? 'blue' : 'red';
    centreSoul();
    if (atk.blue) { G.soul.y = FLOOR - G.soul.h; G.soul.onGround = true; }
    G.player.invuln = 0.4;
    sansPose('idle');
    G.sans.gestureAt = -9;
    if (G.phase === 5) swordAnim(key === 'finale' || Math.random() < 0.3 ? 'heavy' : 'slash');
  }

  function endAttack() {
    if (G.run && G.run.hits === G.run.hitAtStart) {
      G.run.clean++;
      if (G.run.clean > G.run.maxClean) G.run.maxClean = G.run.clean;
    }
    G.attack = null;
    G.bullets = [];
    G.soul.mode = 'red';

    if (G.attackKey === 'finale') {
      G.flags.finale = true;
      G.shatter = null;
      sansPose('tired');
      G.sans.face = 'face_10';
      showDialogue(STORY.finaleAfter, () => {
        G.turn = LAST_TURN + 1;
        startPlayerTurn();
      });
      return;
    }

    G.turn++;
    const p = G.player;
    if (!G.saidLowHp && p.hp < 34) {
      G.saidLowHp = true;
      showDialogue(STORY.lowHp, () => startPlayerTurn());
      return;
    }
    if (!G.flags.saidRelaxed && G.turn === 9) {
      G.flags.saidRelaxed = true;
      showDialogue(STORY.relaxed, () => startPlayerTurn());
      return;
    }
    if (!G.flags.saidMorning && G.turn === 15) {
      G.flags.saidMorning = true;
      showDialogue(STORY.morning, () => startPlayerTurn());
      return;
    }
    if (!G.flags.saidLate && G.turn === 19) {
      G.flags.saidLate = true;
      showDialogue(STORY.late, () => startPlayerTurn());
      return;
    }
    startPlayerTurn();
  }

  function endFightSequence() {
    G.flags.finale = true;
    startPlayerTurn();
  }

  /* ---------------- ACT / ITEM / MERCY ---------------- */
  function actOptions() {
    const opts = [
      { label: 'Check', run: () => doAct('check') },
      { label: 'Talk', run: () => doAct('talk') },
      { label: 'About his dad', run: () => doAct('dad') },
      { label: 'Timelines', run: () => doAct('timelines') },
      { label: 'Remember', run: () => doAct('remember') },
      { label: 'Joke', run: () => doAct('joke') },
      { label: 'Taunt', run: () => doAct('taunt') },
    ];
    if (G.flags.finale) {
      opts.unshift({
        label: 'Say his name',
        run: () => {
          showDialogue([
            { t: 'You say his name out loud.' },
            { t: 'w.d. gaster.' },
            { t: '...', f: 'face_4' },
            { t: 'yeah.', f: 'face_0' },
            { t: "that's the one.", f: 'face_0' },
            { t: "nobody's said it in years. it sounds weird out loud.", f: 'face_1' },
            { t: 'thanks.', f: 'face_0' },
          ], () => startPlayerTurn());
        },
      });
    }
    return opts;
  }

  function doAct(key) {
    const pool = STORY.act[key];
    if (!pool) { endPlayerAction(); return; }
    const n = G.flags[key] || 0;
    G.flags[key] = n + 1;
    let lines = pool[Math.min(n, pool.length - 1)];
    if (key === 'dad' && n === pool.length - 1) {
      lines = lines.concat([{ t: "you've asked me more about him in one fight than anyone has in my whole life.", f: 'face_4' }]);
    }
    showDialogue(lines, () => endPlayerAction());
  }

  function itemOptions() {
    const opts = [];
    G.items.forEach((it, idx) => {
      if (it.count > 0) opts.push({ label: it.name + '  x' + it.count, run: () => useItem(idx) });
    });
    if (!opts.length) opts.push({ label: 'Nothing useful', run: () => { showDialogue(STORY.itemBlank, () => endPlayerAction()); } });
    return opts;
  }

  function useItem(idx) {
    const it = G.items[idx];
    const p = G.player;
    it.count--;
    if (G.run) G.run.items++;
    const healed = Math.min(it.heal, p.maxhp - p.hp);
    p.hp = Math.min(p.maxhp, p.hp + it.heal);
    p.kr = Math.max(0, p.kr - 6);
    audio.heal();
    const verb = it.name === 'Ketchup' ? 'You drank the Ketchup.' : 'You ate the ' + it.name + '.';
    showDialogue([
      { t: verb },
      { t: healed > 0 ? `Your HP was restored by ${healed}.` : 'Your HP was already full. Kind of a waste, honestly.' },
      ...(it.name === 'Ketchup' ? [{ t: 'sans gives you a thumbs up.', f: 'face_1' }] : []),
    ], () => endPlayerAction());
  }

  function mercyOptions() {
    return [
      {
        label: 'Spare',
        run: () => {
          if (G.flags.finale) { spareEnding(); return; }
          showDialogue(STORY.spareAsk, () => endPlayerAction());
        },
      },
      {
        label: 'Flee',
        run: () => { showDialogue(STORY.fleeAsk, () => endPlayerAction()); },
      },
    ];
  }

  function currentList() {
    if (G.mode === 'act') return actOptions();
    if (G.mode === 'item') return itemOptions();
    if (G.mode === 'mercy') return mercyOptions();
    return [];
  }

  /* ---------------- endings ---------------- */
  function spareEnding() {
    markCleared();
    achBump('clears');
    achCheck('win');
    G.flags.ending = 'spare';
    sansPose('idle');
    G.sans.face = 'face_0';
    showDialogue(STORY.spareFinale, () => { G.mode = 'credits'; G.creditsKind = 'spare'; });
  }

  function killEnding() {
    markCleared();
    achBump('clears');
    achCheck('win');
    G.flags.ending = 'kill';
    G.flash = 1;
    G.sans.alpha = 1;
    sansPose('idle');
    showDialogue(STORY.killFinale, () => {
      G.sans.alpha = 0;
      G.mode = 'credits';
      G.creditsKind = 'kill';
    });
  }

  /* ---------------- memory cutscene ----------------
     Three panels he remembers, drawn here rather than loaded: the house back
     when it still had the old man and two kids in it. */
  const MEMORY = [
    { art: 'cradle', line: 'he was careful with him.' },
    { art: 'mobile', line: 'the small one would not stop crying. so he made the bones dance.' },
    { art: 'machine', line: 'the older one watched. he learned the joke before he learned the words.' },
  ];

  /* the second one: the night the machine took him */
  const MEMORY2 = [
    { art: 'break', line: 'the machine came apart with him still holding it.' },
    { art: 'rift', line: 'there was no body. only a hole where he had been standing.' },
    { art: 'after', line: 'they waited by it for years. it never stopped humming.' },
  ];

  function startMemory(cb, panels) {
    G.mem = { i: 0, t: 0, cb, panels: panels || MEMORY };
    G.mode = 'memory';
  }

  function updateMemory(dt) {
    const m = G.mem;
    if (!m) { G.mode = 'menu'; return; }
    m.t += dt;
    if (m.t < 0.22 || !okPressed()) return;
    audio.select();
    m.i++;
    m.t = 0;
    if (m.i >= m.panels.length) {
      const cb = m.cb;
      G.mem = null;
      G.mode = 'menu';
      if (cb) cb();
    }
  }

  function memGaster(x, y, sc, armTo) {
    ctx.fillStyle = '#e6e6e6';
    ctx.beginPath();
    ctx.moveTo(x - 30 * sc, y + 110 * sc);
    ctx.lineTo(x - 18 * sc, y + 10 * sc);
    ctx.lineTo(x + 18 * sc, y + 10 * sc);
    ctx.lineTo(x + 30 * sc, y + 110 * sc);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y - 8 * sc, 18 * sc, 21 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    /* the crack through his face */
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(1, 2 * sc);
    ctx.beginPath();
    ctx.moveTo(x - 6 * sc, y - 26 * sc);
    ctx.lineTo(x + 3 * sc, y - 8 * sc);
    ctx.lineTo(x - 5 * sc, y + 8 * sc);
    ctx.stroke();

    ctx.fillStyle = '#8b5bff';
    ctx.fillRect(x - 12 * sc, y - 12 * sc, 5 * sc, 4 * sc);
    ctx.fillRect(x + 7 * sc, y - 12 * sc, 5 * sc, 4 * sc);

    if (armTo) {
      ctx.strokeStyle = '#e6e6e6';
      ctx.lineWidth = 7 * sc;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 4 * sc, y + 22 * sc);
      ctx.quadraticCurveTo(x + 30 * sc, y + 40 * sc, armTo.x, armTo.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  function memBaby(x, y, sc) {
    ctx.fillStyle = '#f2f2f2';
    ctx.beginPath();
    ctx.ellipse(x, y, 30 * sc, 19 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfcfcf';
    ctx.beginPath();
    ctx.ellipse(x + 14 * sc, y - 8 * sc, 14 * sc, 12 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 13 * sc, y - 11 * sc, 3 * sc, 3 * sc);
    ctx.fillRect(x + 21 * sc, y - 11 * sc, 3 * sc, 3 * sc);
    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 22 * sc, y + 6 * sc);
    ctx.lineTo(x + 2 * sc, y + 16 * sc);
    ctx.stroke();
  }

  function memMobile(x, y, sc) {
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 46 * sc);
    ctx.lineTo(x, y);
    ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(G.t * 1.6) * 0.1 + i * 0.62);
      ctx.strokeStyle = '#8a8a8a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 36 * sc);
      ctx.stroke();
      /* a bone on the end: shaft with a knob top and bottom */
      ctx.fillStyle = '#e6e6e6';
      ctx.fillRect(-2 * sc, 36 * sc, 4 * sc, 20 * sc);
      ctx.fillRect(-6 * sc, 36 * sc, 12 * sc, 5 * sc);
      ctx.fillRect(-6 * sc, 51 * sc, 12 * sc, 5 * sc);
      ctx.restore();
    }
  }

  function memKidSans(x, y, sc) {
    ctx.fillStyle = '#e6e6e6';
    ctx.beginPath();
    ctx.arc(x, y - 28 * sc, 16 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 8 * sc, y - 32 * sc, 5 * sc, 4 * sc);
    ctx.fillRect(x + 3 * sc, y - 32 * sc, 5 * sc, 4 * sc);
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(x - 12 * sc, y - 12 * sc, 24 * sc, 34 * sc);
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(x - 12 * sc, y - 2 * sc, 24 * sc, 4 * sc);
    ctx.fillRect(x - 12 * sc, y + 9 * sc, 24 * sc, 4 * sc);
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(x - 10 * sc, y + 22 * sc, 7 * sc, 18 * sc);
    ctx.fillRect(x + 3 * sc, y + 22 * sc, 7 * sc, 18 * sc);
  }

  function memMachine(x, y, sc) {
    ctx.save();
    ctx.shadowColor = '#8b5bff';
    ctx.shadowBlur = 22;
    ctx.strokeStyle = '#8b5bff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 30 * sc, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = 'rgba(139,91,255,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x, y, (12 + i * 11) * sc, G.t * 0.4 + i * 2, G.t * 0.4 + i * 2 + 2.1);
      ctx.stroke();
    }

    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 22 * sc, y + 20 * sc);
    ctx.lineTo(x - 42 * sc, y + 74 * sc);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 22 * sc, y + 20 * sc);
    ctx.lineTo(x + 42 * sc, y + 74 * sc);
    ctx.stroke();
  }

  /* a tear in the air where he used to be */
  function memRift(x, y, sc) {
    ctx.save();
    ctx.strokeStyle = '#8b5bff';
    ctx.lineWidth = Math.max(1, 3 * sc);
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const yy = y - 60 * sc + i * 10 * sc;
      const xx = x + Math.sin(i * 1.7 + G.t * 0.6) * 9 * sc;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.strokeStyle = '#e6e6e6';
    ctx.lineWidth = Math.max(1, 1.2 * sc);
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const yy = y - 60 * sc + i * 10 * sc;
      const xx = x + Math.cos(i * 2.1 + G.t * 0.8) * 4.5 * sc;
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawMemory() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const m = G.mem;
    if (!m) return;
    const p = m.panels[Math.min(m.i, m.panels.length - 1)];

    ctx.strokeStyle = '#242424';
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 34, 500, 276);

    if (p.art === 'cradle') {
      memGaster(226, 100, 1.35, { x: 330, y: 190 });
      memBaby(356, 198, 1.4);
    } else if (p.art === 'mobile') {
      memBaby(320, 230, 1.5);
      memMobile(320, 118, 1.3);
    } else if (p.art === 'machine') {
      memMachine(348, 138, 1.4);
      memGaster(236, 104, 1.2);
      memKidSans(438, 246, 1.1);
    } else if (p.art === 'break') {
      memMachine(348, 138, 1.4);
      memGaster(236, 104, 1.2, { x: 300, y: 172 });
      /* a plate swinging off it, still attached at one corner */
      ctx.strokeStyle = '#6a6a6a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(302, 150);
      ctx.lineTo(368, 198);
      ctx.stroke();
    } else if (p.art === 'rift') {
      memMachine(348, 138, 1.4);
      memRift(252, 168, 1.6);
      memKidSans(438, 246, 1.1);
    } else {
      memMachine(326, 142, 1.35);
      memKidSans(430, 250, 1.15);
      memBaby(214, 252, 1.15);
    }

    txt(p.line, W / 2, 330, '#dcdcdc', F14, 'center');
    txt('a memory  ' + (m.i + 1) + ' / ' + m.panels.length, 82, 372, '#4a4a4a', F12);
    if (Math.floor(G.t * 2) % 2 === 0) txt('Z', W - 96, 372, '#6a6a6a', F12, 'right');
  }

  /* ---------------- achievements ----------------
     The hard ones are the point of the tab, so most of these ask for things a
     normal clear will not give you. Conditions are checked at the moment they
     become possible rather than every frame. */
  const ACH_KEY = 'sans.ach';

  const ACH = [
    { id: 'clear', name: 'DON\'T FORGET', desc: 'clear the fight, any difficulty', when: 'win' },
    { id: 'clear_hard', name: 'NO RULES LEFT', desc: 'clear on HARD or above', when: 'win', test: (r) => r.diff >= 2 },
    { id: 'clear_insane', name: 'STILL SMILING', desc: 'clear on INSANE or above', when: 'win', test: (r) => r.diff >= 3 },
    { id: 'clear_bad', name: 'BAD TIME', desc: 'clear on BAD TIME', when: 'win', test: (r) => r.diff >= 4 },
    { id: 'flawless', name: 'NOT ONE SCRATCH', desc: 'clear without taking a single hit', when: 'win', test: (r) => r.hits === 0 },
    { id: 'no_items', name: 'EMPTY POCKETS', desc: 'clear without using an item', when: 'win', test: (r) => r.items === 0 },
    { id: 'one_hp', name: 'ONE MORE STEP', desc: 'clear with 1 HP or less', when: 'win', test: (r, g) => g.player.hp <= 1 },
    { id: 'quick', name: 'IN A HURRY', desc: 'clear in under nine minutes', when: 'win', test: (r) => r.time < 540 },
    { id: 'bruised', name: 'STILL STANDING', desc: 'clear after taking 20 hits', when: 'win', test: (r) => r.hits >= 20 },
    { id: 'blue_clean', name: 'BLUE IN THE FACE', desc: 'clear with no blue-soul hits', when: 'win', test: (r) => r.blueHits === 0 },
    { id: 'god_clean', name: 'NOTHING TO HOLD', desc: 'clear the god phase untouched', when: 'win', test: (r) => r.godHits === 0 },
    { id: 'clean_ten', name: 'TEN GOOD TURNS', desc: 'ten attacks in a row without a hit', when: 'win', test: (r) => r.maxClean >= 10 },
    { id: 'perfect', name: 'DEAD CENTRE', desc: 'land a perfect FIGHT hit', when: 'perfect' },
    { id: 'perfect_ten', name: 'TEN DEAD CENTRES', desc: 'ten perfect hits in one run', when: 'perfect', test: (r) => r.perfect >= 10 },
    { id: 'perfect_50', name: 'METRONOME', desc: 'fifty perfect hits, lifetime', when: 'perfect', test: (r, g, s) => s.perfect >= 50 },
    { id: 'reach_god', name: 'HE NOTICED YOU', desc: 'reach the last phase', when: 'turn', test: (r, g) => g.phase >= 5 },
    { id: 'deep', name: 'TO THE LAST TURN', desc: 'reach the finale', when: 'turn', test: (r, g) => g.turn >= 24 },
    { id: 'deaths_25', name: 'TWENTY FIVE TIMES', desc: 'die twenty five times', when: 'lose', test: (r, g, s) => s.deaths >= 25 },
    { id: 'deaths_100', name: 'YOU KEEP COMING', desc: 'die a hundred times', when: 'lose', test: (r, g, s) => s.deaths >= 100 },
    { id: 'turns_200', name: 'MARATHON', desc: 'two hundred turns, lifetime', when: 'turn', test: (r, g, s) => s.turns >= 200 },
    { id: 'no_mercy', name: 'HE NEVER ASKED', desc: 'clear having never pressed MERCY', when: 'win', test: (r) => r.mercy === 0 },
  ];

  function achLoad() {
    try {
      const raw = JSON.parse(localStorage.getItem(ACH_KEY) || 'null');
      if (raw && typeof raw === 'object') return { u: raw.u || {}, s: raw.s || {} };
    } catch (e) { /* storage can be blocked; the tab still works this visit */ }
    return { u: {}, s: {} };
  }
  const ACHS = achLoad();

  function achSave() {
    try { localStorage.setItem(ACH_KEY, JSON.stringify({ u: ACHS.u, s: ACHS.s })); } catch (e) { /* fine */ }
  }
  function achBump(k, n = 1) { ACHS.s[k] = (ACHS.s[k] || 0) + n; achSave(); }

  function achUnlock(id) {
    if (ACHS.u[id]) return;
    ACHS.u[id] = 1;
    achSave();
    G.achToast = { id, t: 0 };
    audio.levelup();
  }

  function achCheck(when) {
    const r = G.run || {};
    for (const a of ACH) {
      if (a.when !== when || ACHS.u[a.id]) continue;
      let ok;
      try { ok = a.test ? !!a.test(r, G, ACHS.s) : true; } catch (e) { ok = false; }
      if (ok) achUnlock(a.id);
    }
  }

  function achName(id) {
    const a = ACH.find((x) => x.id === id);
    return a ? a.name : '';
  }

  function drawAchToast() {
    const t = G.achToast;
    const a = 1 - Math.max(0, t.t - 2.4) / 0.8;
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    txt('ACHIEVEMENT  ' + achName(t.id), W / 2, 22, '#ffff00', F12, 'center');
    ctx.restore();
  }

  /* ---------------- the achievement wall ---------------- */
  function drawAch() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const got = ACH.filter((a) => ACHS.u[a.id]).length;
    txt('ACHIEVEMENTS', W / 2, 44, '#ffff00', F18, 'center');
    txt(got + ' / ' + ACH.length + '  unlocked', W / 2, 66, '#9d9d9d', F12, 'center');

    const rows = 10;
    const top = 96;
    const sel = Math.max(0, Math.min(ACH.length - 1, G.achI || 0));
    const from = Math.max(0, Math.min(ACH.length - rows, sel - Math.floor(rows / 2)));
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, top - 10, 528, rows * 30 + 8);
    for (let i = 0; i < rows && from + i < ACH.length; i++) {
      const a = ACH[from + i];
      const y = top + i * 30;
      const unlocked = !!ACHS.u[a.id];
      const on = from + i === sel;
      if (on) {
        ctx.fillStyle = 'rgba(255,255,0,0.10)';
        ctx.fillRect(58, y - 12, 524, 28);
      }
      txt(a.name, 74, y, unlocked ? '#ffff00' : '#4a4a4a', F12);
      txt(unlocked ? a.desc : 'locked', 286, y, unlocked ? '#bdbdbd' : '#333333', F12);
    }
    txt('↑↓ look       X back', W / 2, 442, '#6a6a6a', F12, 'center');
    txt('a few of these will take a while.', W / 2, 464, '#333333', F12, 'center');
  }

  /* ---------------- per-mode update ---------------- */
  function update(dt) {
    G.t += dt;
    if (G.run) G.run.time += dt;
    if (G.achToast) {
      G.achToast.t += dt;
      if (G.achToast.t > 3.2) G.achToast = null;
    }
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 46);
    if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 1.6);
    if (G.banner) {
      G.banner.t += dt;
      if (G.banner.t > 2.8) G.banner = null;
    }
    updateSparks(dt);
    updateSansAnim(dt);
    updateSword(dt);

    if (heldPress('KeyM', dt, 9, 9)) audio.toggleMute();

    switch (G.mode) {
      case 'memory':
        updateMemory(dt);
        break;

      case 'ach': {
        if (heldPress('ArrowDown', dt) || heldPress('KeyS', dt)) { G.achI = Math.min(ACH.length - 1, (G.achI || 0) + 1); audio.move(); }
        if (heldPress('ArrowUp', dt) || heldPress('KeyW', dt)) { G.achI = Math.max(0, (G.achI || 0) - 1); audio.move(); }
        if (okPressed() || backPressed()) { audio.cancel(); G.mode = 'title'; }
        break;
      }

      case 'title':
        if (pressed.has('KeyT')) { audio.select(); G.tuner.i = 0; G.mode = 'tuner'; break; }
        if (pressed.has('KeyA')) { audio.select(); G.achI = 0; G.mode = 'ach'; break; }
        if (okPressed()) { audio.select(); G.mode = 'diff'; }
        break;

      case 'diff': {
        const n = diffListLen();
        if (G.diff.i >= n) G.diff.i = 0;
        if (heldPress('ArrowDown', dt) || heldPress('KeyS', dt)) { G.diff.i = (G.diff.i + 1) % n; audio.move(); saveDiff(); }
        if (heldPress('ArrowUp', dt) || heldPress('KeyW', dt)) { G.diff.i = (G.diff.i + n - 1) % n; audio.move(); saveDiff(); }
        if (backPressed()) { audio.cancel(); G.mode = 'title'; break; }
        if (okPressed()) { audio.select(); startGame(); }
        break;
      }

      case 'tuner': {
        const nf = TUNER_FIELDS.length;
        if (backPressed()) { audio.cancel(); G.mode = 'title'; break; }
        if (heldPress('ArrowDown', dt) || heldPress('KeyS', dt)) { G.tuner.i = (G.tuner.i + 1) % nf; audio.move(); }
        if (heldPress('ArrowUp', dt) || heldPress('KeyW', dt)) { G.tuner.i = (G.tuner.i + nf - 1) % nf; audio.move(); }
        const field = TUNER_FIELDS[G.tuner.i];
        const tuning = audio.tune;
        let delta = 0;
        if (heldPress('ArrowRight', dt) || heldPress('KeyD', dt)) delta = 1;
        if (heldPress('ArrowLeft', dt) || heldPress('KeyA', dt)) delta = -1;
        if (delta) {
          audio.setTune({ [field.key]: tuning[field.key] + delta * field.step });
          audio.move();
        }
        if (pressed.has('KeyR')) { audio.resetTune(); audio.select(); }
        if (okPressed()) audio.testDrop();
        break;
      }

      case 'dialogue':
        updateDialogue(dt);
        break;

      case 'menu': {
        if (heldPress('ArrowRight', dt) || heldPress('KeyD', dt)) { G.menu.i = (G.menu.i + 1) % 4; audio.move(); }
        if (heldPress('ArrowLeft', dt) || heldPress('KeyA', dt)) { G.menu.i = (G.menu.i + 3) % 4; audio.move(); }
        if (okPressed()) {
          audio.select();
          if (G.menu.i === 0) {
            if (G.flags.finale) { killEnding(); break; }
            G.mode = 'fight';
            /* the attack bar starts sweeping the moment FIGHT is picked */
            G.fight = { stage: 'bar', pos: 0, dir: 1, t: 0, hit: 0, arm: 0, armD: 1 };
          } else if (G.menu.i === 1) { G.mode = 'act'; G.menu.i = 0; }
          else if (G.menu.i === 2) { G.mode = 'item'; G.menu.i = 0; }
          else { if (G.run) G.run.mercy++; G.mode = 'mercy'; G.menu.i = 0; }
        }
        break;
      }

      case 'act':
      case 'item':
      case 'mercy': {
        const opts = currentList();
        if (heldPress('ArrowDown', dt) || heldPress('KeyS', dt)) { G.menu.i = (G.menu.i + 1) % opts.length; audio.move(); }
        if (heldPress('ArrowUp', dt) || heldPress('KeyW', dt)) { G.menu.i = (G.menu.i + opts.length - 1) % opts.length; audio.move(); }
        if (heldPress('ArrowRight', dt) || heldPress('KeyD', dt)) { G.menu.i = (G.menu.i + 4) % opts.length; audio.move(); }
        if (heldPress('ArrowLeft', dt) || heldPress('KeyA', dt)) { G.menu.i = (G.menu.i - 4 + opts.length * 2) % opts.length; audio.move(); }
        if (backPressed()) { audio.cancel(); G.mode = 'menu'; G.menu.i = 0; break; }
        if (okPressed()) {
          audio.select();
          opts[Math.min(G.menu.i, opts.length - 1)].run();
        }
        break;
      }

      case 'fight': {
        const f = G.fight;
        if (!f) break;
        if (f.stage === 'bar') {
          if (backPressed()) { G.mode = 'menu'; break; }
          const prevPos = f.pos;
          f.pos += f.dir * dt * FIGHT_SWEEP * (diffNow().bar || 1);
          if (f.pos > 1) { f.pos = 1; f.dir = -1; }
          if (f.pos < 0) { f.pos = 0; f.dir = 1; }
          /* distance to dead centre, which is what the cue is built on */
          const away = Math.abs(f.pos - 0.5);
          /* it turned back outwards: next pass starts from the bottom of the run */
          if (away > f.armD + 0.004) f.arm = 0;
          /* only gained on the way in, so crossing the middle does not replay
             the whole run of notes at once */
          while (f.arm < CUE.length && away <= CUE[f.arm].d) {
            if (f.armD > CUE[f.arm].d) audio.tick(CUE[f.arm].rate, CUE[f.arm].gain);
            f.arm++;
          }
          f.armD = away;
          /* the note on the crossing itself */
          if ((prevPos < 0.5 && f.pos >= 0.5) || (prevPos > 0.5 && f.pos <= 0.5)) {
            audio.tick(CUE_TOP.rate, CUE_TOP.gain);
          }
          if (okPressed()) {
            audio.slash();
            /* 1 dead centre, 0 at the very end of the bar */
            f.hit = 1 - Math.abs(f.pos - 0.5) * 2;
            /* the one free hit: dead centre, and only the very first time */
            f.landed = !G.flags.firstHit && f.hit >= 0.9;
            f.stage = 'strike';
            f.t = 0;
            G.shake = 5;
          }
        } else if (f.stage === 'strike') {
          f.t += dt;
          if (f.t > 0.62) resolveFight(f.hit);
        }
        break;
      }

      case 'bullet': {
        const a = G.attack;
        if (!a) { startPlayerTurn(); break; }
        a.t += dt;
        /* he takes the soul and holds it: it goes dark red, he decides where it
           is, and any movement key costs you */
        if (G.soul.dark > 0) {
          G.soul.dark -= dt;
          G.player.hp -= dt * 2.2;
          if (G.player.hp <= 0) { die(); break; }
          const moved = keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown
            || keys.KeyA || keys.KeyD || keys.KeyW || keys.KeyS;
          if (moved && G.player.invuln <= 0) hurt(2.2);
          const cx = IN.x + IN.w / 2;
          const cy = IN.y + IN.h / 2;
          G.soul.x = cx - G.soul.w / 2 + Math.sin(G.t * 0.9) * (IN.w / 2 - 40);
          G.soul.y = cy - G.soul.h / 2 + Math.cos(G.t * 1.3) * (IN.h / 2 - 30);
        }
        if (G.player.invuln > 0) G.player.invuln -= dt;
        if (G.player.kr > 0) {
          G.player.hp -= G.player.kr * dt * 0.30;
          G.player.kr = Math.max(0, G.player.kr - dt * 2.4);
          if (G.player.hp <= 0) { die(); break; }
        }
        const adt = dt * diffNow().speed;
        const done = a.update(adt);
        updateSoul(dt);
        G.trail.push({ x: G.soul.x, y: G.soul.y, t: 0 });
        updateDust(dt);
    for (const p of G.trail) p.t += dt;
        G.trail = G.trail.filter((p) => p.t < 0.16).slice(-9);
        updateBullets(adt);
        checkCollisions();
        if (done && G.mode === 'bullet') endAttack();
        break;
      }

      case 'dying': {
        G.dyingT += dt;
        if (G.dyingT > 2.1) {
          if (!G.flags.revived) {
            G.flags.revived = true;
            showDialogue(STORY.revive, () => {
              G.player.hp = G.player.maxhp;
              G.player.kr = 0;
              startPlayerTurn();
            });
          } else {
            G.mode = 'gameover';
            G.overIdx = 0;
          }
        }
        break;
      }

      case 'gameover': {
        if (heldPress('ArrowDown', dt) || heldPress('KeyS', dt) || heldPress('ArrowUp', dt) || heldPress('KeyW', dt)) {
          G.overIdx = 1 - G.overIdx;
          audio.move();
        }
        if (okPressed()) {
          audio.select();
          if (G.overIdx === 0) {
            G.player.hp = G.player.maxhp;
            G.player.kr = 0;
            G.bullets = [];
            G.attack = null;
            showDialogue([
              { t: 'You get back up.', f: 'face_4' },
              { t: 'of course you do.', f: 'face_0' },
            ], () => startPlayerTurn());
          } else {
            G.mode = 'title';
          }
        }
        break;
      }

      case 'credits': {
        if (G.flags.endingText === undefined) G.flags.endingText = G.t;
        if (okPressed() && G.t - G.flags.endingText > 0.4) { G.mode = 'title'; }
        break;
      }
    }
  }

  function resolveFight(closeness) {
    G.flags.dodges++;
    if (G.run && closeness >= 0.98) {
      G.run.perfect++;
      achBump('perfect');
      achCheck('perfect');
    }

    /* the single connection he allows: dead centre, once */
    if (G.fight && G.fight.landed) {
      G.flags.firstHit = true;
      G.flash = Math.max(G.flash, 0.3);
      G.shake = 12;
      audio.hurt();
      showDialogue(STORY.firstHit, () => endPlayerAction());
      return;
    }

    const pool = STORY.dodge;
    const lines = pool[(G.flags.dodges - 1) % pool.length];
    void closeness;
    showDialogue(lines, () => endPlayerAction());
  }

  /* ---------------- per-mode render ---------------- */
  function render() {
    ctx.save();
    if (G.shake > 0.4) {
      ctx.translate(Math.round((Math.random() - 0.5) * G.shake), Math.round((Math.random() - 0.5) * G.shake));
    }

    if (G.mode === 'title') {
      drawTitle();
    } else if (G.mode === 'diff') {
      drawDiff();
    } else if (G.mode === 'tuner') {
      drawTuner();
    } else if (G.mode === 'memory') {
      drawMemory();
    } else if (G.mode === 'credits') {
      drawCredits();
    } else if (G.mode === 'ach') {
      drawAch();
    } else {
      drawBackground();
      if (G.mode !== 'gameover') drawSans();
      drawSword();
      drawBoxFrame();

      ctx.save();
      ctx.beginPath();
      ctx.rect(IN.x, IN.y, IN.w, IN.h);
      ctx.clip();
      if (G.mode === 'bullet' || G.mode === 'dying') {
        drawBones();
        drawBeams();
      }
      ctx.restore();

      if (G.mode === 'bullet' || G.mode === 'dying') {
        drawTether();
        drawBlasters();
        drawChargeGlows();
        drawDust();
        for (const p of G.trail) drawBigSoul(p.x, p.y, '#a01010', 0.3 * (1 - p.t / 0.16));
        drawSoulInBox();
        drawSparks();
      }

      if (G.mode === 'dialogue') drawDialogue();
      if (G.mode === 'act' || G.mode === 'item' || G.mode === 'mercy') drawList();
      if (G.mode === 'fight') drawFight();

      if (G.mode === 'menu' || G.mode === 'act' || G.mode === 'item' || G.mode === 'mercy' || G.mode === 'fight') {
        drawMenuRow();
      }
      drawHUD();
      drawBanner();
      if (G.mode === 'gameover') drawGameOver();
    }

    ctx.restore();

    if (G.shatter) drawShatter();
    if (G.achToast) drawAchToast();

    if (G.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, G.flash) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (audio.muted) txt('MUTED', W - 12, 10, '#4a4a4a', F12, 'right');
  }

  /* when he has hold of the SOUL, you can see the line he is holding it by */
  function drawTether() {
    const pull = G.soul.pull;
    if (!pull) return;
    ctx.save();
    ctx.setLineDash([6, 7]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = neonAlpha(5, 0.55);
    ctx.shadowColor = neonColor(5);
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(444 + 22, 92 + 46);
    ctx.lineTo(G.soul.x + G.soul.w / 2, G.soul.y + G.soul.h / 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawSoulInBox() {
    if (G.player.invuln > 0 && Math.floor(G.t * 20) % 2 === 0) return;
    const held = G.soul.dark > 0;
    drawBigSoul(G.soul.x, G.soul.y, held
      ? (Math.floor(G.t * 10) % 2 ? '#7a0000' : '#3a0000')
      : (diffNow().lethal ? lethalSoulCol() : '#ff0000'));
  }

  function drawList() {
    const opts = currentList();
    const neon = G.phase >= 2;
    for (let i = 0; i < opts.length; i++) {
      const col = i >= 4 ? 1 : 0;
      const row = i % 4;
      const x = IN.x + 20 + col * (IN.w / 2 - 10);
      const y = IN.y + 10 + row * 23;
      const selected = i === Math.min(G.menu.i, opts.length - 1);
      if (neon) glowTxt(opts[i].label, x, y, neonColor(i + 4), F16, 'left', selected ? 18 : 11);
      else txt(opts[i].label, x, y, selected ? '#ffff00' : '#fff', F16);
      if (selected) drawSoul(x - 18, y + 3, '#ff0000', 1);
    }
  }

  function outlinedTxt(s, x, y, fill, stroke, font) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 4;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(s, Math.round(x), Math.round(y));
    ctx.fillStyle = fill;
    ctx.fillText(s, Math.round(x), Math.round(y));
    ctx.restore();
  }

  function drawFight() {
    const f = G.fight;
    if (!f) return;

    /* enemy card, the way Undertale fills the box when you pick FIGHT */
    txt('SANS', IN.x + 20, IN.y + 12, '#ffff00', F18);
    txt('ATK  1    DEF  1', IN.x + IN.w - 20, IN.y + 14, '#fff', F16, 'right');

    const bw = IN.w - 40;
    const bx = IN.x + 20;
    const bh = 22;
    const by = IN.y + 50;

    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(bx, by, bw, bh);
    /* the sweet spot */
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(bx + bw / 2 - 17, by, 34, bh);

    /* the cursor bounces between the ends of the bar */
    const mx = bx + Math.round(f.pos * (bw - 6));
    ctx.fillStyle = f.stage === 'strike' ? '#ffe066' : '#fff';
    ctx.fillRect(mx, by - 7, 6, bh + 14);

    if (f.stage === 'strike') {
      drawStrike(f.t, f.landed);
    } else {
      txt('* Press Z to strike.', IN.x + 20, IN.y + 84, '#8f8f8f', F14);
    }
  }

  /* the swing itself: one fast streak over Sans, then the MISS he always earns */
  function drawStrike(t, landed) {
    const k = Math.min(1, t / 0.18);
    const len = 60 + 150 * k;
    ctx.save();
    ctx.translate(514, 178);
    ctx.rotate(-0.62);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 0.3) / 0.3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-len / 2, -3, len, 6);
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(-len / 2 + 12, -9, len - 26, 3);
    ctx.fillRect(-len / 2 + 26, 5, len - 40, 3);
    ctx.globalAlpha = 1;
    ctx.restore();

    if (t > 0.2) {
      /* outlined so the number still reads on top of his white skull */
      if (landed) outlinedTxt('1', 516, 148, '#ffe14d', '#000', '26px "Lucida Console","DejaVu Sans Mono",monospace');
      else outlinedTxt('MISS', 514, 150, '#ff5050', '#000', F18);
    }
  }

  function drawTitle() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#07070c';
    for (let i = 0; i < 5; i++) ctx.fillRect(40 + i * 132, 90, 54, 300);

    txt('UNDERTALE', W / 2, 86, '#fff', '34px "Lucida Console","DejaVu Sans Mono",monospace', 'center');
    txt('— a fan fight sim —', W / 2, 130, '#8a8a8a', F14, 'center');
    txt('SANS', W / 2, 170, '#fff', '48px "Lucida Console","DejaVu Sans Mono",monospace', 'center');
    txt("don't forget", W / 2, 228, '#c9c9c9', F16, 'center');
    txt('5 phases · 24 turns · ' + diffNow().name.toLowerCase(), W / 2, 254, '#6a6a6a', F12, 'center');

    drawSoul(W / 2 - 6, 290, '#ff0000', 1);

    if (Math.floor(G.t * 2) % 2 === 0) {
      txt('* Press Z to have a bad time.', W / 2, 332, '#fff', F16, 'center');
    }
    txt('T — audio tuning', W / 2, 362, '#6a6a6a', F12, 'center');
    txt('a fan-made tribute. undertale belongs to toby fox.', W / 2, 440, '#4a4a4a', F12, 'center');
    txt('music: MEGALOVANIA (phase 3: 10th anniversary remix)', W / 2, 458, '#4a4a4a', F12, 'center');
  }

  function drawDiff() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    txt('HOW BAD A TIME?', W / 2, 54, '#fff', F18, 'center');

    for (let i = 0; i < diffListLen(); i++) {
      const d = DIFFS[i];
      const y = 112 + i * 40;
      const sel = i === G.diff.i;
      const c = sel ? (d.hot ? '#ff5050' : '#ffff00') : '#8a8a8a';
      if (sel && d.hot) glowTxt(d.name, 214, y, c, F18, 'left', 16);
      else txt(d.name, 214, y, c, F18);
      txt('HP ' + d.hp, 420, y + 3, sel ? '#fff' : '#5a5a5a', F14, 'right');
      /* one pass of the FIGHT cursor, centre to centre: the number you feel */
      txt((1 / (FIGHT_SWEEP * d.bar)).toFixed(2) + 's', 506, y + 3, sel ? '#fff' : '#4a4a4a', F12, 'right');
      if (sel) drawSoul(188, y + 3, '#ff0000', 1);
    }

    const d = DIFFS[G.diff.i];
    txt(d.blurb, W / 2, 322, '#9d9d9d', F14, 'center');
    txt('↑↓ choose      Z / ENTER begin      X back', W / 2, 356, '#bdbdbd', F14, 'center');
    txt('same fight, same jokes. only the hallway changes.', W / 2, 388, '#4a4a4a', F12, 'center');
  }

  function drawTuner() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    txt('AUDIO TUNING', W / 2, 34, '#fff', F18, 'center');
    txt('phase 3 drop — line the remix up with the bar', W / 2, 60, '#8a8a8a', F12, 'center');

    const t = audio.tune;
    for (let i = 0; i < TUNER_FIELDS.length; i++) {
      const f = TUNER_FIELDS[i];
      const y = 102 + i * 30;
      const sel = i === G.tuner.i;
      txt(f.label, 196, y, sel ? '#ffff00' : '#fff', F16);
      txt(f.fmt(t[f.key]), 452, y, sel ? '#ffff00' : '#fff', F16, 'right');
      if (sel) drawSoul(172, y + 3, '#ff0000', 1);
    }

    const bar = (60 / t.bpm) * t.beatsPerBar;
    txt('bar length ' + bar.toFixed(2) + 's', W / 2, 296, '#9d9d9d', F12, 'center');
    txt('↑↓ select      ←→ adjust      Z / ENTER  test the drop', W / 2, 332, '#bdbdbd', F14, 'center');
    txt('R  reset to defaults          X  back', W / 2, 358, '#8a8a8a', F14, 'center');
    txt('saved automatically — the fight uses these values', W / 2, 400, '#4a4a4a', F12, 'center');
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);
    drawBrokenHeart(W / 2 - 22, 146);
    txt('GAME OVER', W / 2, 222, '#fff', '28px "Lucida Console","DejaVu Sans Mono",monospace', 'center');
    txt('You feel your sins crawling on your back.', W / 2, 264, '#9d9d9d', F14, 'center');

    const opts = ['CONTINUE', 'GIVE UP'];
    for (let i = 0; i < opts.length; i++) {
      const y = 310 + i * 30;
      const sel = G.overIdx === i;
      txt(opts[i], W / 2, y, sel ? '#ffff00' : '#fff', F18, 'center');
      if (sel) drawSoul(W / 2 - 66, y + 5, '#ff0000', 1);
    }
  }

  function drawBrokenHeart(x, y) {
    ctx.fillStyle = '#ff0000';
    const cells = 3;
    for (let r = 0; r < SOUL_MASK.length; r++) {
      for (let c = 0; c < SOUL_MASK[r].length; c++) {
        if (SOUL_MASK[r][c] !== '1') continue;
        const split = c > 5 ? 8 : 0;
        const wobble = Math.sin((G.dyingT + r) * 3) * 2;
        ctx.fillRect(x + c * cells + split, y + r * cells + wobble, cells, cells);
      }
    }
  }

  function drawCredits() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const spare = G.creditsKind === 'spare';
    txt(spare ? 'THE END' : 'THE END?', W / 2, 148, '#fff', '30px "Lucida Console","DejaVu Sans Mono",monospace', 'center');

    const lines = spare
      ? [
        'The corridor is quiet, and then it is not your business anymore.',
        'Somewhere under the house, a machine is still humming.',
        'You remembered the name.',
      ]
      : [
        'The corridor is quiet.',
        'The machine in the basement keeps humming for a while,',
        'and then it stops.',
        'Nobody remembers the name. Except you.',
      ];
    let y = 212;
    for (const ln of lines) {
      txt(ln, W / 2, y, '#bdbdbd', F14, 'center');
      y += 24;
    }

    txt(spare ? 'you spared him. he will remember that. he remembers everything.'
      : 'you did not spare him. the timeline resets anyway. it always does.',
      W / 2, 344, spare ? '#ffe066' : '#c06060', F14, 'center');

    if (Math.floor(G.t * 2) % 2 === 0) txt('* Press Z to return to the title.', W / 2, 412, '#fff', F16, 'center');
  }

  /* ---------------- loop ---------------- */
  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (assetsReady) update(dt);
    render();
    pressed.clear();
    requestAnimationFrame(frame);
  }

  render();
  requestAnimationFrame(frame);

})();

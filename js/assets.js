/* Sprite sheet loader. Frames were cut from the supplied Sans sheet into
   assets/sprites/. Bodies ship without a head, so faces are drawn on top. */

const SPRITE_NAMES = (() => {
  const names = [];
  const rows = [
    ['handdown', 5],
    ['handup', 6],
    ['strike', 6],
    ['face', 11],
    ['faceboss', 15],
    ['blaster', 6],
  ];
  for (const [prefix, count] of rows) {
    for (let i = 0; i < count; i++) names.push(prefix + '_' + i);
  }
  names.push(
    'body', 'legs', 'legs_bent',
    'face_wide_0', 'face_wide_1',
    'wrapped_body_0', 'wrapped_body_1',
    'wrapped_face_0', 'wrapped_face_1',
    'shock', 'blaster_unused',
    'spark_0', 'spark_1', 'spark_2', 'spark_3'
  );
  return names;
})();

const SPR = {};
let assetsReady = false;

/* bump this whenever the files in assets/sprites are replaced, so the browser
   does not keep drawing a cached copy of an older sheet */
const SPRITE_VERSION = '2';

(function loadSprites() {
  let left = SPRITE_NAMES.length;
  const done = () => { if (--left <= 0) assetsReady = true; };
  for (const name of SPRITE_NAMES) {
    const img = new Image();
    // handlers first: a memory-cached image can otherwise finish before they attach
    img.onload = done;
    img.onerror = done;
    img.src = 'assets/sprites/' + name + '.png?v=' + SPRITE_VERSION;
    SPR[name] = img;
  }
  // never let a stalled request freeze the game on the title screen
  setTimeout(() => { assetsReady = true; }, 4000);
})();

/* Where the skull sits on the headless body frames (1x coordinates). */
const HEAD_OFFSET = { x: 16, y: -1 };

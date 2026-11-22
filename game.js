import { createWorld, IR, HUT, PED, DOORP, TREE } from './world3d.js';

/* =====================================================================
   SECRET ISLAND 3D  —  first-person. A floating island that looks
   empty. It isn't.
   Logic lives here (coordinates in metres, x/z plane); everything you
   see is drawn by world3d.js.
   ===================================================================== */

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt = n => Math.floor(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const TOUCH = matchMedia('(pointer:coarse)').matches;
const STUD = 0.28;                                   // metres per stud

const TIERS = [
  { n: 'Easy',       c1: '#4da3ff', c2: '#1d4ed8' },
  { n: 'Medium',     c1: '#4ade80', c2: '#15803d' },
  { n: 'Hard',       c1: '#f05a5a', c2: '#c62828' },
  { n: 'Very Hard',  c1: '#ffa23a', c2: '#ff3d00' },
  { n: 'Extreme',    c1: '#a3121f', c2: '#2a0306' },
  { n: 'Impossible', c1: '#8b2be2', c2: '#2e0a58' },
  { n: 'Secret',     c1: '#2b2b2b', c2: '#000000' }
];

// id, tier, icon, name, description
const ACH = [
  // ---- Easy
  ['walk', 0, '👣', 'Hello, Island', 'Walk 50 studs.'],
  ['edge', 0, '🧗', 'Edge of the World', 'Stand at the very edge for 2 seconds.'],
  ['look', 0, '👀', "Don't Look Down", 'Look under the island.'],
  ['fb', 0, '🤜', 'First Blood', 'Hit the zombie.'],
  ['phone', 0, '📱', 'Pocket Lint', 'Open your phone.'],
  ['unread', 0, '✉️', 'Unread (1)', 'Read your first message.'],
  ['bunny', 0, '🐇', 'Bunny Hop', 'Jump 50 times.'],
  ['swing', 0, '⚔️', 'Swordsman', 'Swing your sword 20 times.'],
  // ---- Medium
  ['key', 1, '🗝️', 'Locksmith', 'Pick up a key.'],
  ['door', 1, '🚪', 'Open Sesame', 'Open the locked door.'],
  ['trophy', 1, '🏆', 'Trophy Hunter', 'Take the trophy.'],
  ['sell', 1, '💵', 'Cash Out', 'Sell the trophy on your phone.'],
  ['star', 1, '🌠', 'Shooting Star', 'Witness a meteor falling.'],
  ['rock', 1, '🪨', 'Space Rock', 'Pick up a meteor rock.'],
  ['penpal', 1, '💬', 'Pen Pal', 'Read every message in a single run.'],
  ['baker', 1, '🍪', 'Baker', 'Buy the Cookie Clicker app.'],
  // ---- Hard
  ['million', 2, '💰', 'Millionaire', 'Reach 1,000,000 cookies.'],
  ['dealer', 2, '🤝', 'Rock Dealer', 'Sell a meteor rock.'],
  ['slayer', 2, '🗡️', 'Zombie Slayer', 'Kill the zombie 10 times in a row without dying.'],
  ['suicidal', 2, '☠️', 'Suicidal Sword', 'Zombie killed you with your own sword.'],
  ['gift', 2, '🎁', 'Gift of Death', 'Give the trophy to the zombie.'],
  ['winner', 2, '🎉', 'Winner', 'Click the trophy to win.'],
  ['owl', 2, '🦉', 'Night Owl', 'Survive 15 minutes in a single run.'],
  ['reply', 2, '👍', 'Good Reply', "Send the right answer to the zombie's text."],
  // ---- Very Hard
  ['billion', 3, '💎', 'Billionaire', 'Reach 1,000,000,000 cookies.'],
  ['pacifist', 3, '🕊️', 'Pacifist', 'Win without ever hitting the zombie.'],
  ['speed', 3, '⚡', 'Speedrunner', 'Win in under 45 seconds.'],
  ['double', 3, '💥', 'Double Impact', 'Witness 2 meteors in a single run.'],
  ['ghost', 3, '👻', 'Ghost Contact', 'Reach the hidden number.'],
  ['broke', 3, '📉', 'Broke Billionaire', 'Become a billionaire, then sell every last cookie.'],
  ['eyewit', 3, '🔭', 'Eyewitness', 'See 3 different world events in one run.'],
  // ---- Extreme
  ['trillion', 4, '🏦', 'Trillionaire', 'Reach 1,000,000,000,000 cookies.'],
  ['warm', 4, '🔥', 'Warming Up', 'Unlock every Easy, Medium and Hard achievement.'],
  ['flawless', 4, '✨', 'Flawless', 'Win without taking damage or buying anything.'],
  ['keymaster', 4, '🔑', 'Keymaster', 'Open the door within 15 seconds of starting.'],
  ['chain', 4, '⛓️', 'Chain Reaction', 'Earn 5 achievements within 60 seconds.'],
  ['untouch', 4, '🛡️', 'Untouchable', 'Kill the zombie 5 times in one run without taking damage.'],
  ['both', 4, '⚖️', 'Both Sides', 'See both the Win and the Gift endings.'],
  // ---- Impossible
  ['perfect', 5, '💯', 'Perfect Run', 'Win in under 40 seconds with no damage and no phone.'],
  ['endings', 5, '🎬', 'Every Ending', 'See all 5 endings: win, gift, sword, void and meteor.'],
  ['god', 5, '👑', 'Cookie God', 'Reach 1,000,000,000,000,000 cookies.'],
  ['hundred', 5, '🌟', '100%', 'Unlock every non-secret achievement.'],
  // ---- Secret
  ['friend', 6, '🧟', "Zombie's Friend", 'Stay next to the zombie for 3 minutes without hurting it.'],
  ['void', 6, '🕳️', 'Void Diver', 'Walk off the island.'],
  ['wrong', 6, '📞', 'Wrong Number', 'Dial 666.'],
  ['headache', 6, '🤕', 'Headache', 'Get hit by a meteor.'],
  ['deadmail', 6, '📪', 'Dead Mail', 'Read a message from yourself.'],
  ['grass', 6, '🌱', 'Touch Grass', 'Leave the game for an hour, then come back.'],
  ['dev', 6, '🛠️', "Developer's Room", 'Find the room under the island.'],
  ['never', 6, '🎈', 'The Island Was Never Floating', 'Unlock every other achievement.']
].map(([id, tier, icon, name, desc]) => ({ id, tier, icon, name, desc }));
const BY = {}; ACH.forEach(a => BY[a.id] = a);
const NONSECRET = ACH.filter(a => a.tier < 6);

const MSGS = [
  { id: 'm1', at: 3,   from: 'Unknown', av: '❓', text: "hey. you awake?\nthe island looks empty, right?" },
  { id: 'm2', at: 40,  from: 'Unknown', av: '❓', text: "don't trust the zombie.\nor maybe do. i forgot." },
  { id: 'm3', at: 90,  from: 'Zombie',  av: '🧟', text: "hey. i'm hungry.\nwhat do you give a zombie?",
    opts: [['A brain 🧠', 'gross. but thanks.', 0], ['Your sword 🗡️', '...thank you. very much.', 0], ['A hug 🤗', '...oh. ok. that is nice.', 1]] },
  { id: 'm4', at: 150, from: 'Mom',     av: '👩', text: 'dinner at 7!! and stay away from the edge!!' },
  { id: 'm5', at: 240, from: '???',     av: '👁️', text: 'if you ever need me,\ndial 1337.\nthe biggest tree remembers things.' },
  { id: 'dead', at: 20, from: 'You',    av: '🫥', text: "don't give him the sword.\n...or do. i can't stop you.", dead: true }
];

const ENDINGS = {
  win:    { i: '🏆', t: 'YOU WIN',  s: 'You clicked the trophy. That was it?' },
  gift:   { i: '🧟', t: 'A Gift',   s: 'The zombie hugged the trophy. It will never let go.' },
  sword:  { i: '☠️', t: 'Zombie killed you with your own sword', s: 'You handed it over. Politely.' },
  void:   { i: '🕳️', t: 'Into the void', s: 'The island was floating after all.' },
  meteor: { i: '☄️', t: 'Direct hit', s: 'You should have watched the shadow.' },
  slain:  { i: '💀', t: 'The zombie got you', s: 'Maybe use the sword next time.' }
};

/* ---------------------------------------------------------------- state */
const KEY = 'secretIsland3d.v1';
const defStats = () => ({ dist: 0, jumps: 0, swings: 0, kills: 0, deaths: 0, streak: 0, seen: Date.now(),
  end: { win: 0, gift: 0, sword: 0, void: 0, meteor: 0, slain: 0 } });
const mk = () => ({ v: 1, ach: {}, stats: defStats(), run: null, snd: true });
const newRun = () => ({ t: 0, wt: 0, x: 0, z: 9, yaw: 0, pitch: 0, hp: 5, sword: true, key: false, keyPos: null, door: false,
  trophyOn: false, trophy: false, rocks: 0, rockList: [], cookies: 0, money: 0, clicker: false, usedPhone: false,
  tookDmg: false, hitZ: false, bought: false, kills: 0, billion: false, seenEv: [], meteors: 0, delivered: {}, read: {},
  ans: {}, ghost: false, dug: false, nextEv: 50, nearZ: 0, edgeT: 0, ended: null });

let S = mk();
try {
  const j = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (j && j.v === 1) {
    S = Object.assign(mk(), j);
    S.stats = Object.assign(defStats(), j.stats || {});
    S.stats.end = Object.assign(defStats().end, (j.stats || {}).end || {});
  }
} catch (e) { /* no storage */ }
let R = Object.assign(newRun(), S.run || {});
S.run = R;
function save() { S.run = R; S.stats.seen = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

let W3 = null, ready = false, Z, EV = null, look = false, phoneOpen = false, anim = 0, flash = 0, saveT = 0;
const toasted = {}, queue = [], recent = [], keys = {}, joy = { x: 0, y: 0 };
const ui = { popup: false, pause: false, panel: false, clear: false, endShown: false };
const P = { atkCd: 0, swingT: 0, h: 0, vy: 0, fall: 0, step: 0, speed: 0, onGround: true };
const SPAWN = { x: -9, z: 3 };
function resetZ() { Z = { x: SPAWN.x, z: SPAWN.z, yaw: 1.2, hp: 5, hostile: false, alive: true, rt: 0, atk: 0, hurt: 0, swingT: 0, spd: 0, phase: 0, groan: 3 }; }
resetZ();

/* ---------------------------------------------------------------- audio */
let AC = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, d, type = 'sine', v = 0.12, delay = 0, slide = 0) {
  if (!S.snd) return; const a = ac(); if (!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + 0.03);
}
function noise(d, v = 0.15, delay = 0, freq = 1800) {
  if (!S.snd) return; const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), c = b.getChannelData(0);
  for (let i = 0; i < n; i++) c[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + delay;
  s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = v;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
}
const SFX = {
  click: () => tone(720, 0.05, 'square', 0.05),
  swing: () => noise(0.09, 0.07, 0, 3500),
  hit: () => { noise(0.14, 0.22, 0, 1400); tone(150, 0.14, 'sawtooth', 0.14, 0, -90); },
  hurt: () => { tone(220, 0.25, 'sawtooth', 0.16, 0, -150); noise(0.15, 0.1); },
  growl: () => { tone(95, 0.55, 'sawtooth', 0.13, 0, -35); tone(70, 0.6, 'square', 0.06, 0.05, -20); },
  pickup: () => { tone(660, 0.09, 'triangle', 0.12); tone(990, 0.13, 'triangle', 0.12, 0.08); },
  door: () => { noise(0.35, 0.15, 0, 700); tone(110, 0.4, 'sawtooth', 0.07, 0, -40); },
  coin: () => { tone(1200, 0.07, 'square', 0.07); tone(1600, 0.16, 'square', 0.07, 0.07); },
  msg: () => { tone(880, 0.1, 'sine', 0.12); tone(1175, 0.18, 'sine', 0.12, 0.1); },
  boom: () => { noise(0.9, 0.35, 0, 600); tone(60, 0.8, 'sine', 0.3, 0, -30); },
  warn: () => { tone(440, 0.18, 'square', 0.07); tone(330, 0.3, 'square', 0.07, 0.2); },
  jump: () => tone(300, 0.12, 'sine', 0.08, 0, 260),
  step: () => noise(0.06, 0.05, 0, 700),
  fall: () => tone(700, 1.1, 'sine', 0.12, 0, -620),
  end: () => { tone(330, 0.3, 'triangle', 0.13); tone(262, 0.3, 'triangle', 0.13, 0.25); tone(196, 0.7, 'triangle', 0.13, 0.5); },
  toast: () => { tone(784, 0.1, 'triangle', 0.09); tone(1175, 0.2, 'triangle', 0.09, 0.09); },
  unlock: tier => {
    if (tier === 6) { [392, 311, 262, 233, 196].forEach((f, i) => tone(f, 0.5, 'sawtooth', 0.07, i * 0.14)); tone(55, 1.4, 'sine', 0.2); return; }
    const sc = [523, 659, 784, 1047, 1319, 1568, 2093];
    const n = 3 + tier;
    for (let i = 0; i < n; i++) tone(sc[Math.min(i, sc.length - 1)] * (i >= 7 ? 2 : 1), 0.28, 'triangle', 0.12, i * 0.085);
    if (tier >= 3) { tone(262, 0.9, 'sawtooth', 0.05, 0.05); tone(392, 0.9, 'sawtooth', 0.05, 0.05); }
    if (tier >= 4) tone(65, 0.9, 'sine', 0.22);
    if (tier >= 5) { noise(0.7, 0.2, 0.3, 900); [1568, 2093, 2637].forEach((f, i) => tone(f, 0.6, 'sine', 0.07, 0.5 + i * 0.1)); }
  }
};

/* ---------------------------------------------------------------- achievements */
function unlockedCount(pred) { return ACH.filter(a => (!pred || pred(a)) && S.ach[a.id]).length; }

function award(id) {
  const a = BY[id]; if (!a) return;
  if (S.ach[id]) { if (toasted[id]) return; toasted[id] = 1; toast(a); return; }
  S.ach[id] = Date.now(); toasted[id] = 1;
  recent.push(Date.now());
  while (recent.length && Date.now() - recent[0] > 60000) recent.shift();
  if (W3) W3.burstAtCamera(TIERS[a.tier].c1, 70 + a.tier * 16);
  queue.push(id);
  save();
  if (!ui.popup) openPopup();
  meta();
  if (recent.length >= 5 && !S.ach.chain) award('chain');
}
function meta() {
  if (!S.ach.warm && ACH.filter(a => a.tier <= 2).every(a => S.ach[a.id])) award('warm');
  if (!S.ach.hundred && NONSECRET.filter(a => a.id !== 'hundred').every(a => S.ach[a.id])) award('hundred');
  if (!S.ach.never && ACH.filter(a => a.id !== 'never').every(a => S.ach[a.id])) award('never');
}
function toast(a) {
  const t = TIERS[a.tier], el = document.createElement('div');
  el.className = 'toast'; el.style.background = `linear-gradient(90deg,${t.c1},${t.c2})`;
  el.innerHTML = `<div class="tic">${a.icon}</div><div><small>ACHIEVEMENT MADE</small><b>${esc(a.name)}</b></div>`;
  $('#toasts').appendChild(el); SFX.toast(); setTimeout(() => el.remove(), 3900);
}

/* --- freeze popup: the whole screen shrinks to ~55% near the top --- */
function openPopup() {
  const id = queue.shift(); if (!id) return;
  const a = BY[id], t = TIERS[a.tier], first = !ui.popup, stage = $('#stage');
  if (first) {
    ui.popup = true; keys.a = keys.d = keys.w = keys.s = false; joy.x = joy.y = 0;
    closePhone(); releaseLock();
    const vh = innerHeight, sc = (vh < 520 || innerWidth / vh < 0.7) ? 0.5 : 0.56, top = vh * 0.045;
    stage.style.transform = `translateY(${Math.round(top)}px) scale(${sc})`; stage.classList.add('shrunk');
    $('#popup').style.top = Math.round(top + vh * sc + 16) + 'px';
    $('#ui').classList.add('hide');
  }
  const card = $('#pcard');
  card.style.background = `linear-gradient(90deg,${t.c1},${t.c2})`; card.style.setProperty('--glow', t.c1);
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  $('#pIc').textContent = a.icon; $('#pName').textContent = a.name;
  $('#pRar').textContent = (a.tier === 6 ? '??? ' : '') + t.n; $('#pDesc').textContent = a.desc;
  $('#pHint').style.display = 'block'; $('#pBtns').style.display = 'none'; $('#popup').style.display = 'flex';
  SFX.unlock(a.tier); confetti(card, t.c1, 18 + a.tier * 6);
}
function confetti(card, col, n) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'cf'; const ang = Math.random() * 6.28, d = rnd(60, 220);
    c.style.cssText = `left:50%;top:45%;background:${i % 2 ? '#fff' : col};--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d}px;--r:${rnd(-540, 540)}deg`;
    card.appendChild(c); setTimeout(() => c.remove(), 1200);
  }
}
function closePopup() {
  ui.popup = false; $('#popup').style.display = 'none';
  const stage = $('#stage'); stage.style.transform = ''; stage.classList.remove('shrunk'); $('#ui').classList.remove('hide');
}
$('#pcard').addEventListener('click', () => { SFX.click(); $('#pHint').style.display = 'none'; $('#pBtns').style.display = 'flex'; });
$('#pCont').addEventListener('click', () => { SFX.click(); if (queue.length) openPopup(); else closePopup(); });
$('#pRest').addEventListener('click', () => { queue.length = 0; closePopup(); restartRun(); });

/* ---------------------------------------------------------------- helpers */
const normR = (x, z) => Math.hypot(x, z) / IR;
function blocked(x, z, r) {
  for (const c of W3.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true;
  const bx = R.door ? W3.boxes : W3.boxes.concat([W3.doorBox]);
  for (const b of bx) { const cx = clamp(x, b[0], b[2]), cz = clamp(z, b[1], b[3]); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true; }
  return false;
}
const near = (o, r) => Math.hypot(R.x - o.x, R.z - o.z) < r;
const fwd = () => [-Math.sin(R.yaw), -Math.cos(R.yaw)];
function banner(txt, ms = 2800) { const b = $('#banner'); b.textContent = txt; b.classList.add('on'); clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), ms); }
const frozen = () => ui.popup || ui.pause || ui.panel || ui.clear || !!R.ended;

/* ---------------------------------------------------------------- game logic */
function hurt(n) {
  if (R.ended || P.fall) return;
  R.hp -= n; R.tookDmg = true; flash = 0.4; SFX.hurt(); W3.addShake(0.4);
  if (R.hp <= 0) { R.hp = 0; endRun('slain'); }
}
function endRun(type) {
  if (R.ended) return;
  R.ended = type; S.stats.end[type] = (S.stats.end[type] || 0) + 1;
  if (type !== 'win' && type !== 'gift') { S.stats.deaths++; S.stats.streak = 0; }
  look = false; closePhone(); releaseLock(); SFX.end();
  if (type === 'sword') award('suicidal');
  if (type === 'void') award('void');
  if (type === 'meteor') award('headache');
  if (type === 'gift') award('gift');
  if (type === 'win') {
    award('winner');
    if (!R.hitZ) award('pacifist');
    if (R.t < 45) award('speed');
    if (!R.tookDmg && !R.bought) award('flawless');
    if (R.t < 40 && !R.tookDmg && !R.usedPhone) award('perfect');
  }
  if (S.stats.end.win > 0 && S.stats.end.gift > 0) award('both');
  if (['win', 'gift', 'sword', 'void', 'meteor'].every(k => S.stats.end[k] > 0)) award('endings');
  save();
}
function showEnd() {
  ui.endShown = true; const e = ENDINGS[R.ended] || ENDINGS.slain;
  $('#endIcon').textContent = e.i; $('#endTitle').textContent = e.t; $('#endSub').textContent = e.s; $('#endM').classList.add('on');
}
function restartRun() {
  R = newRun(); S.run = R; resetZ(); EV = null; look = false; phoneOpen = false;
  Object.keys(toasted).forEach(k => delete toasted[k]);
  P.atkCd = P.swingT = P.h = P.vy = P.fall = 0; flash = 0;
  ['endM', 'pauseM', 'achM', 'clearM', 'phoneM'].forEach(m => $('#' + m).classList.remove('on'));
  ui.pause = ui.panel = ui.clear = ui.endShown = false;
  save(); banner('The island looks empty. Is it?', 3200);
}

function attack() {
  if (!ready || frozen() || phoneOpen || look || P.fall || P.atkCd > 0) return;
  P.atkCd = 0.45; P.swingT = 0.3; S.stats.swings++; SFX.swing();
  if (S.stats.swings >= 20) award('swing');
  if (!R.sword || !Z.alive) return;
  const dx = Z.x - R.x, dz = Z.z - R.z, d = Math.hypot(dx, dz) || 1, f = fwd();
  if (d < 2.9 && (dx * f[0] + dz * f[1]) / d > 0.3) setTimeout(() => { if (Z.alive && !R.ended) hitZ(dx / d, dz / d); }, 110);
}
function hitZ(nx, nz) {
  Z.hp--; Z.hurt = 0.25; R.hitZ = true; R.nearZ = 0;
  if (!Z.hostile) { Z.hostile = true; SFX.growl(); }
  Z.x += nx * 0.7; Z.z += nz * 0.7; SFX.hit();
  W3.burst(Z.x, 1.3, Z.z, 0x8bd16a, 14, 3, 6, 0.9); W3.burst(Z.x, 1.3, Z.z, 0x7a0e0e, 8, 2.5, 8, 0.8);
  award('fb'); if (Z.hp <= 0) killZ();
}
function killZ() {
  Z.alive = false; Z.rt = 6; Z.hostile = false; Z.spd = 0;
  R.kills++; S.stats.kills++; S.stats.streak++;
  W3.burst(Z.x, 1, Z.z, 0x8bd16a, 40, 5, 6, 1.2);
  if (!R.key && !R.keyPos && !R.door) {
    const k = { x: Z.x, z: Z.z }, d = normR(k.x, k.z); if (d > 0.82) { k.x *= 0.8 / d; k.z *= 0.8 / d; }
    R.keyPos = k;
  }
  if (S.stats.streak >= 10) award('slayer');
  if (R.kills >= 5 && !R.tookDmg) award('untouch');
}
function jump() {
  if (!ready || frozen() || phoneOpen || look || P.fall || P.h > 0.02) return;
  P.vy = 5.4; P.h = 0.03; S.stats.jumps++; SFX.jump();
  if (S.stats.jumps >= 50) award('bunny');
}

function actions() {
  const a = [];
  if (!ready || R.ended || P.fall || look) return a;
  if (R.keyPos && near(R.keyPos, 1.9)) a.push({ label: '🗝️ Pick up key', fn() { R.key = true; R.keyPos = null; SFX.pickup(); award('key'); banner('You got a key!'); } });
  if (!R.door && near(DOORP, 2.9)) {
    if (R.key) a.push({ label: '🚪 Open door', fn() { R.key = false; R.door = true; R.trophyOn = true; SFX.door(); award('door'); if (R.t < 15) award('keymaster'); } });
    else a.push({ label: '🔒 Locked', dis: true });
  }
  if (R.trophyOn && near(PED, 2.2)) a.push({ label: '🏆 Take trophy', fn() { R.trophyOn = false; R.trophy = true; SFX.pickup(); award('trophy'); banner('Click the trophy to win... or sell it'); } });
  R.rockList.forEach((rk, i) => { if (near(rk, 2)) a.push({ label: '🪨 Pick up rock', fn() { R.rockList.splice(i, 1); R.rocks++; SFX.pickup(); award('rock'); } }); });
  if (Z.alive && near(Z, 2.9)) {
    if (R.sword) a.push({ label: '🗡️ Give sword', fn() { R.sword = false; SFX.growl(); endRun('sword'); } });
    if (R.trophy) a.push({ label: '🎁 Give trophy', fn() { R.trophy = false; SFX.pickup(); endRun('gift'); } });
  }
  if (R.ghost && !R.dug && !R.key && !R.door && near(TREE, 3.6)) a.push({ label: '⛏️ Dig under the tree', fn() { R.dug = true; R.key = true; SFX.pickup(); award('key'); banner('Something was buried here...'); } });
  return a;
}

/* --- world events --- */
function startEvent() {
  const types = ['meteor', 'eclipse', 'rain']; let type;
  if (R.seenEv.length === 0) type = 'meteor';
  else { const unseen = types.filter(t => !R.seenEv.includes(t)); const pool = (unseen.length && Math.random() < 0.6) ? unseen : types; type = pool[Math.floor(Math.random() * pool.length)]; }
  if (!R.seenEv.includes(type)) R.seenEv.push(type);
  if (type === 'meteor') {
    let tx, tz, tries = 0;
    do { const a = rnd(0, 6.28), r = rnd(0.15, 0.72) * IR; tx = Math.cos(a) * r; tz = Math.sin(a) * r; tries++; } while (tries < 40 && (blocked(tx, tz, 2.4) || Math.hypot(tx - R.x, tz - R.z) < 3));
    EV = { type, t: 0, dur: 6, tx, tz, hit: false };
    R.meteors++; award('star'); if (R.meteors >= 2) award('double');
    banner('☄️ A meteor is falling! Watch the red circle!', 4000); SFX.warn();
  } else if (type === 'eclipse') { EV = { type, t: 0, dur: 14 }; banner('🌑 A solar eclipse...', 3500); }
  else { EV = { type, t: 0, dur: 16 }; banner('🌧️ It starts to rain', 3500); }
  if (R.seenEv.length >= 3) award('eyewit');
}
function updEvents(dt) {
  if (!EV && R.wt >= R.nextEv) startEvent();
  if (!EV) return;
  EV.t += dt;
  if (EV.type === 'meteor' && !EV.hit && EV.t >= 4) {
    EV.hit = true; SFX.boom(); const dist = Math.hypot(R.x - EV.tx, R.z - EV.tz);
    W3.onImpact(EV.tx, EV.tz); W3.addShake(clamp(1.3 - dist / 28, 0.15, 1)); flash = Math.max(flash, 0.12);
    R.rockList.push({ x: EV.tx, z: EV.tz });
    if (!P.fall && dist < 1.9 && P.h < 2) endRun('meteor');
  }
  if (EV.t >= EV.dur) { EV = null; R.nextEv = R.wt + rnd(40, 70); }
}
function weather() {
  const o = { eclipse: 0, rain: 0 };
  if (EV && EV.type === 'eclipse') o.eclipse = Math.pow(Math.sin(Math.PI * EV.t / EV.dur), 0.7);
  if (EV && EV.type === 'rain') o.rain = Math.min(1, EV.t / 2, (EV.dur - EV.t) / 2);
  return o;
}

/* --- messages --- */
function deliver() {
  MSGS.forEach(m => {
    if (R.delivered[m.id] || R.t < m.at) return;
    if (m.dead && S.stats.deaths < 1) return;
    R.delivered[m.id] = true; SFX.msg(); banner('📩 New message from ' + m.from, 2500);
  });
}
const unread = () => MSGS.filter(m => R.delivered[m.id] && !R.read[m.id]).length;

/* --- main tick --- */
function tick(dt) {
  R.t += dt; deliver();
  if (R.t >= 900) award('owl');
  if (R.cookies >= 1e6) award('million');
  if (R.cookies >= 1e9) { R.billion = true; award('billion'); }
  if (R.cookies >= 1e12) award('trillion');
  if (R.cookies >= 1e15) award('god');

  if (P.fall) {                                   // falling into the void
    P.fall += dt; P.vy -= 16 * dt; P.h += P.vy * dt; R.x *= 1 + dt * 0.05; R.z *= 1 + dt * 0.05;
    if (P.fall > 1.9) endRun('void');
    return;
  }
  if (phoneOpen || look) { P.speed = 0; return; }   // world pauses while phone / underside view

  R.wt += dt; P.atkCd -= dt; if (P.swingT > 0) P.swingT -= dt; if (flash > 0) flash -= dt;

  // movement (relative to where you look)
  const mx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joy.x, mz = (keys.w ? 1 : 0) - (keys.s ? 1 : 0) - joy.y, len = Math.hypot(mx, mz);
  let moved = 0;
  if (len > 0.08) {
    const m = Math.min(1, len), spd = (keys.shift ? 6.6 : 4.3) * m, ix = mx / len, iz = mz / len;
    const fx = -Math.sin(R.yaw), fz = -Math.cos(R.yaw), rx = Math.cos(R.yaw), rz = -Math.sin(R.yaw);
    const dx = (fx * iz + rx * ix) * spd * dt, dz = (fz * iz + rz * ix) * spd * dt, ox = R.x, oz = R.z;
    if (!blocked(R.x + dx, R.z, 0.42)) R.x += dx;
    if (!blocked(R.x, R.z + dz, 0.42)) R.z += dz;
    moved = Math.hypot(R.x - ox, R.z - oz);
    S.stats.dist += moved / STUD; if (S.stats.dist >= 50) award('walk');
  }
  P.speed = moved / dt; P.onGround = P.h <= 0.02;
  if (P.h > 0 || P.vy > 0) { P.vy -= 14 * dt; P.h += P.vy * dt; if (P.h <= 0) { P.h = 0; P.vy = 0; } }
  if (moved > 0 && P.onGround) { P.step += moved; if (P.step > 2.1) { P.step = 0; SFX.step(); } }

  const d = normR(R.x, R.z);
  if (d > 1.0) { P.fall = 0.001; P.vy = -1; SFX.fall(); }
  if (d > 0.9 && d <= 1.0) { R.edgeT += dt; if (R.edgeT >= 2) award('edge'); } else R.edgeT = 0;

  // zombie
  if (!Z.alive) { Z.rt -= dt; if (Z.rt <= 0) resetZ(); }
  else {
    Z.atk -= dt; if (Z.hurt > 0) Z.hurt -= dt; if (Z.swingT > 0) Z.swingT -= dt; Z.groan -= dt;
    const dx = R.x - Z.x, dz = R.z - Z.z, dd = Math.hypot(dx, dz) || 1;
    let want = 0;
    if (Z.hostile) { if (dd > 1.3) want = 2.3; if (dd <= 1.7 && Z.atk <= 0) { Z.atk = 1.15; Z.swingT = 0.45; hurt(1); } if (Z.groan <= 0 && dd < 16) { SFX.growl(); Z.groan = rnd(3.5, 6.5); } }
    else { if (dd > 4.2) want = 1.35; if (dd < 4.6) { R.nearZ += dt; if (R.nearZ >= 180) award('friend'); } else if (dd > 9) R.nearZ = 0; }
    if (want) {
      const sx = dx / dd * want * dt, sz = dz / dd * want * dt;
      if (!blocked(Z.x + sx, Z.z, 0.45)) Z.x += sx; if (!blocked(Z.x, Z.z + sz, 0.45)) Z.z += sz;
    }
    Z.spd = want; Z.phase += dt * (1.2 + want * 2.1);
    const ty = Math.atan2(dx, dz); let dy = ty - Z.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); Z.yaw += dy * Math.min(1, dt * 5);
  }
  updEvents(dt);
}

/* ---------------------------------------------------------------- phone */
const PH = { scr: 'home', chat: null, dial: '', res: '' };
function openPhone() {
  if (!ready || frozen() || look || P.fall) return;
  releaseLock(); phoneOpen = true; R.usedPhone = true; PH.scr = 'home';
  $('#phoneM').classList.add('on'); renderPhone(); SFX.click();
  award('phone');
}
function closePhone() { phoneOpen = false; $('#phoneM').classList.remove('on'); }
function renderPhone() {
  const b = $('#pbody'), t = $('#ptitle'); $('#pback').style.visibility = PH.scr === 'home' ? 'hidden' : 'visible';
  let h = '';
  if (PH.scr === 'home') {
    t.textContent = '📱 Phone';
    const un = unread();
    h = `<div class="apps">
      <button class="app" data-act="app" data-arg="msgs"><span class="e">💬</span>Messages${un ? `<span class="badge" style="display:block">${un}</span>` : ''}</button>
      <button class="app" data-act="app" data-arg="dial"><span class="e">📞</span>Phone</button>
      <button class="app" data-act="app" data-arg="market"><span class="e">🛒</span>Market</button>
      <button class="app ${R.clicker ? '' : 'lock'}" data-act="app" data-arg="cookies"><span class="e">${R.clicker ? '🍪' : '🔒'}</span>Cookie Clicker</button>
    </div><p style="opacity:.55;font-size:13px;text-align:center;margin-top:18px">$${fmt(R.money)}</p>`;
  } else if (PH.scr === 'msgs') {
    t.textContent = 'Messages';
    const list = MSGS.filter(m => R.delivered[m.id]).reverse();
    h = list.length ? list.map(m => `<button class="row" data-act="chat" data-arg="${m.id}"><span class="av">${m.av}</span><span><b>${esc(m.from)}</b><small>${esc(m.text.split('\n')[0])}</small></span>${R.read[m.id] ? '' : '<span class="dot"></span>'}</button>`).join('')
      : '<p style="opacity:.6;text-align:center;margin-top:40px">No messages yet...</p>';
  } else if (PH.scr === 'chat') {
    const m = MSGS.find(x => x.id === PH.chat); t.textContent = m.from;
    h = `<div class="bub">${esc(m.text).replace(/\n/g, '<br>')}</div>`;
    if (m.opts) {
      const a = R.ans[m.id];
      if (a == null) h += m.opts.map((o, i) => `<button class="opt" data-act="opt" data-arg="${i}">${esc(o[0])}</button>`).join('');
      else h += `<div class="bub me">${esc(m.opts[a][0])}</div><div class="bub">${esc(m.opts[a][1])}</div>`;
    }
  } else if (PH.scr === 'dial') {
    t.textContent = 'Phone';
    h = `<div class="disp">${PH.dial || '&nbsp;'}</div><div class="callres">${PH.res}</div><div class="keys">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map(k => `<button data-act="key" data-arg="${k}">${k}</button>`).join('')}
      <button data-act="del">⌫</button><button class="callbtn" data-act="call">📞</button><span></span></div>`;
  } else if (PH.scr === 'market') {
    t.textContent = '🛒 Market';
    h = `<p style="text-align:center;opacity:.8">Balance: <b>$${fmt(R.money)}</b></p>
      <div class="mk"><div>🏆 Trophy<small>Sells for $150</small></div><button data-act="sell" data-arg="trophy" ${R.trophy ? '' : 'disabled'}>Sell</button></div>
      <div class="mk"><div>🪨 Meteor rock ×${R.rocks}<small>Sells for $300 each</small></div><button data-act="sell" data-arg="rock" ${R.rocks ? '' : 'disabled'}>Sell</button></div>
      <div class="mk"><div>🍪 All cookies (${fmt(R.cookies)})<small>1,000 cookies = $1</small></div><button data-act="sell" data-arg="cookies" ${R.cookies ? '' : 'disabled'}>Sell</button></div>
      <div class="mk"><div>📲 Cookie Clicker<small>App · $100</small></div><button data-act="buy" ${R.clicker || R.money < 100 ? 'disabled' : ''}>${R.clicker ? 'Owned' : 'Buy'}</button></div>`;
  } else if (PH.scr === 'cookies') {
    t.textContent = '🍪 Cookie Clicker';
    h = `<div class="ckwrap"><div class="ck-n" id="ckn">${fmt(R.cookies)}</div><div style="opacity:.7;font-size:13px">cookies · <span id="ckg">+${fmt(1 + Math.floor(R.cookies / 500))}</span> per click</div>
      <button id="cookie">🍪</button><div style="opacity:.55;font-size:12px">The more you have, the more each click gives.</div></div>`;
  }
  b.innerHTML = h;
  const ck = $('#cookie'); if (ck) ck.addEventListener('pointerdown', cookieClick);
}
function cookieClick(e) {
  e.preventDefault();
  const gain = 1 + Math.floor(R.cookies / 500);
  R.cookies = Math.min(R.cookies + gain, 9e15);
  SFX.click();
  $('#ckn').textContent = fmt(R.cookies); $('#ckg').textContent = '+' + fmt(1 + Math.floor(R.cookies / 500));
  const f = document.createElement('div'); f.className = 'float'; f.textContent = '+' + fmt(gain);
  f.style.setProperty('--x', rnd(-60, 60) + 'px'); $('.ckwrap').appendChild(f); setTimeout(() => f.remove(), 800);
}
$('#pbody').addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, arg = el.dataset.arg; SFX.click();
  if (act === 'app') {
    if (arg === 'cookies' && !R.clicker) { banner('Buy Cookie Clicker in the Market first'); return; }
    PH.scr = arg; PH.res = ''; renderPhone();
  } else if (act === 'chat') {
    PH.chat = arg; PH.scr = 'chat'; R.read[arg] = true; award('unread');
    if (arg === 'dead') award('deadmail');
    if (['m1', 'm2', 'm3', 'm4', 'm5'].every(k => R.read[k])) award('penpal');
    renderPhone();
  } else if (act === 'opt') {
    const m = MSGS.find(x => x.id === PH.chat); R.ans[m.id] = +arg;
    if (m.opts[+arg][2]) award('reply');
    renderPhone();
  } else if (act === 'key') { if (PH.dial.length < 8) PH.dial += arg; PH.res = ''; renderPhone(); }
  else if (act === 'del') { PH.dial = PH.dial.slice(0, -1); PH.res = ''; renderPhone(); }
  else if (act === 'call') {
    const n = PH.dial; if (!n) return;
    PH.res = '📞 Calling…'; renderPhone();
    setTimeout(() => {
      if (n === '1337') { R.ghost = true; award('ghost'); PH.res = '👻 "...you found me. dig under the biggest tree. don\'t tell the zombie."'; }
      else if (n === '666') { award('wrong'); PH.res = '😈 "Wrong number." (someone laughs)'; }
      else PH.res = 'The number you dialed is not in service.';
      PH.dial = ''; if (phoneOpen && PH.scr === 'dial') renderPhone();
    }, 1100);
  } else if (act === 'sell') {
    if (arg === 'trophy' && R.trophy) { R.trophy = false; R.money += 150; SFX.coin(); award('sell'); }
    else if (arg === 'rock' && R.rocks) { R.rocks--; R.money += 300; SFX.coin(); award('dealer'); }
    else if (arg === 'cookies' && R.cookies) { R.money += Math.floor(R.cookies / 1000); R.cookies = 0; SFX.coin(); if (R.billion) award('broke'); }
    renderPhone();
  } else if (act === 'buy') {
    if (R.money >= 100 && !R.clicker) { R.money -= 100; R.clicker = true; R.bought = true; SFX.coin(); award('baker'); banner('Cookie Clicker installed!'); }
    renderPhone();
  }
});
$('#pback').addEventListener('click', () => { SFX.click(); PH.scr = PH.scr === 'chat' ? 'msgs' : 'home'; renderPhone(); });
$('#pclose').addEventListener('click', () => { SFX.click(); closePhone(); });
$('#bPhone').addEventListener('click', () => { phoneOpen ? closePhone() : openPhone(); });

/* ---------------------------------------------------------------- panels */
const tip = $('#tip'); let tipT = 0;
function showTip(el, html) {
  tip.innerHTML = html; tip.style.display = 'block';
  const r = el.getBoundingClientRect(), tw = tip.offsetWidth;
  tip.style.left = clamp(r.left + r.width / 2 - tw / 2, 6, innerWidth - tw - 6) + 'px';
  tip.style.top = (r.bottom + 8 + tip.offsetHeight > innerHeight ? r.top - tip.offsetHeight - 8 : r.bottom + 8) + 'px';
  clearTimeout(tipT); tipT = setTimeout(hideTip, 3500);
}
function hideTip() { tip.style.display = 'none'; }
function renderAch() {
  let h = '';
  TIERS.forEach((t, ti) => {
    const list = ACH.filter(a => a.tier === ti && (ti < 6 || S.ach[a.id]));
    if (!list.length) return;
    const got = list.filter(a => S.ach[a.id]).length;
    h += `<div class="sec"><i style="background:${t.c1}"></i>${t.n} <span>${got}/${list.length}</span></div><div class="grid">`;
    list.forEach(a => {
      const on = !!S.ach[a.id];
      h += `<div class="tile ${on ? 'on' : 'off'} ${ti === 6 ? 'secret' : ''}" data-id="${a.id}" style="--c1:${t.c1};--c2:${t.c2}"><div class="ic">${on ? a.icon : '?'}</div><div class="nm">${esc(a.name)}</div></div>`;
    });
    h += '</div>';
  });
  $('#achBody').innerHTML = h;
  $('#achSum').textContent = `${unlockedCount(a => a.tier < 6)} / ${NONSECRET.length}`;
}
$('#achBody').addEventListener('click', e => {
  const el = e.target.closest('.tile'); if (!el) return; const a = BY[el.dataset.id];
  const on = !!S.ach[a.id];
  showTip(el, `<b>${esc(a.name)}</b> · ${TIERS[a.tier].n}<br>${esc(a.desc)}${on ? `<small>Unlocked ${new Date(S.ach[a.id]).toLocaleDateString()}</small>` : '<small>Locked</small>'}`);
});
$('#achBody').addEventListener('pointerover', e => {
  if (e.pointerType === 'touch') return;
  const el = e.target.closest('.tile'); if (el) el.click();
});
$('#achBody').addEventListener('pointerout', e => { if (e.pointerType !== 'touch' && e.target.closest('.tile')) hideTip(); });
function openAch() { releaseLock(); renderAch(); $('#achM').classList.add('on'); ui.panel = true; hideTip(); }
function closeAch() { $('#achM').classList.remove('on'); ui.panel = false; hideTip(); }
function openPause() { if (ui.popup || R.ended) return; releaseLock(); closePhone(); $('#pauseM').classList.add('on'); ui.pause = true; $('#mSound').textContent = S.snd ? '🔊 Sound: On' : '🔇 Sound: Off'; }
function closePause() { $('#pauseM').classList.remove('on'); ui.pause = false; }
$('#bPause').addEventListener('click', () => { SFX.click(); openPause(); });
$('#mResume').addEventListener('click', () => { SFX.click(); closePause(); });
$('#mRestart').addEventListener('click', () => { closePause(); restartRun(); });
$('#mAch').addEventListener('click', () => { SFX.click(); closePause(); openAch(); });
$('#mSound').addEventListener('click', () => { S.snd = !S.snd; $('#mSound').textContent = S.snd ? '🔊 Sound: On' : '🔇 Sound: Off'; SFX.click(); save(); });
$('#bAch').addEventListener('click', () => { if (ui.popup || R.ended) return; SFX.click(); closePhone(); openAch(); });
$('#achClose').addEventListener('click', () => { SFX.click(); closeAch(); if (R.ended && !ui.endShown) ui.endShown = false; });
$('#endAch').addEventListener('click', () => { openAch(); });

/* --- clear all (5s delay) --- */
let clearTimer = null;
function openClear() {
  $('#clearM').classList.add('on'); ui.clear = true;
  const ok = $('#clearOk'); let n = 5; ok.disabled = true; ok.textContent = `Confirm (${n})`;
  clearInterval(clearTimer);
  clearTimer = setInterval(() => {
    n--; if (n > 0) ok.textContent = `Confirm (${n})`;
    else { clearInterval(clearTimer); ok.disabled = false; ok.textContent = 'Confirm — delete everything'; }
  }, 1000);
}
function closeClear() { clearInterval(clearTimer); $('#clearM').classList.remove('on'); ui.clear = false; }
$('#mClear').addEventListener('click', () => { closePause(); openClear(); });
$('#achClear').addEventListener('click', () => { openClear(); });
$('#clearNo').addEventListener('click', () => { SFX.click(); closeClear(); });
$('#clearOk').addEventListener('click', () => {
  if ($('#clearOk').disabled) return;
  S.ach = {}; S.stats = defStats(); recent.length = 0; Object.keys(toasted).forEach(k => delete toasted[k]);
  save(); closeClear(); if ($('#achM').classList.contains('on')) renderAch(); banner('All achievements cleared');
});
$('#endRestart').addEventListener('click', () => { SFX.click(); restartRun(); });

/* ---------------------------------------------------------------- input */
const cv = $('#cv');
let ignoreUnlock = false, mouseDrag = false;
function releaseLock() { if (document.pointerLockElement) { ignoreUnlock = true; try { document.exitPointerLock(); } catch (e) { ignoreUnlock = false; } } }
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) return;
  if (ignoreUnlock) { ignoreUnlock = false; return; }
  if (ready && !frozen() && !phoneOpen && !look && !R.ended) openPause();
});
const SENS = 0.0023;
document.addEventListener('mousemove', e => {
  if (!ready || frozen() || phoneOpen || look) return;
  if (document.pointerLockElement === cv || mouseDrag) { R.yaw -= e.movementX * SENS; R.pitch = clamp(R.pitch - e.movementY * SENS, -1.45, 1.45); }
});
addEventListener('mouseup', () => { mouseDrag = false; });

let lookId = null, lx = 0, ly = 0;
cv.addEventListener('pointerdown', e => {
  ac();
  if (!ready) return;
  if (look) { if (W3.pickDev(e.clientX, e.clientY)) { SFX.door(); award('dev'); banner('🛠️ "You weren\'t supposed to be here."', 3500); } return; }
  if (frozen() || phoneOpen) return;
  if (e.pointerType === 'mouse') {
    if (!document.pointerLockElement) { mouseDrag = true; try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (x) { /* ignore */ } }
    else attack();
  } else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
});
cv.addEventListener('pointermove', e => {
  if (e.pointerId !== lookId || frozen() || phoneOpen || look) return;
  R.yaw -= (e.clientX - lx) * 0.0062; R.pitch = clamp(R.pitch - (e.clientY - ly) * 0.0062, -1.45, 1.45); lx = e.clientX; ly = e.clientY;
});
const endLook = e => { if (e.pointerId === lookId) lookId = null; };
cv.addEventListener('pointerup', endLook); cv.addEventListener('pointercancel', endLook);
cv.addEventListener('contextmenu', e => e.preventDefault());

addEventListener('keydown', e => {
  ac();
  const k = e.key.toLowerCase();
  if (e.repeat) { if (k === ' ') e.preventDefault(); return; }
  if (k === 'escape') {
    if (ui.popup) return;
    if ($('#clearM').classList.contains('on')) closeClear();
    else if (ui.panel) closeAch();
    else if (phoneOpen) closePhone();
    else if (look) setLook(false);
    else if (ui.pause) closePause();
    else openPause();
    return;
  }
  if (k === ' ' || k === 'tab') e.preventDefault();
  if (frozen() || !ready) return;
  if (k === 'w' || k === 'arrowup') keys.w = true;
  if (k === 'a' || k === 'arrowleft') keys.a = true;
  if (k === 's' || k === 'arrowdown') keys.s = true;
  if (k === 'd' || k === 'arrowright') keys.d = true;
  if (k === 'shift') keys.shift = true;
  if (k === 'j' || k === 'f') attack();
  if (k === ' ') jump();
  if (k === 'e') { const a = actions().find(x => !x.dis); if (a) a.fn(); }
  if (k === 'p') phoneOpen ? closePhone() : openPhone();
  if (k === 'l') setLook(!look);
});
addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = false;
  if (k === 'a' || k === 'arrowleft') keys.a = false;
  if (k === 's' || k === 'arrowdown') keys.s = false;
  if (k === 'd' || k === 'arrowright') keys.d = false;
  if (k === 'shift') keys.shift = false;
});
addEventListener('blur', () => { keys.w = keys.a = keys.s = keys.d = keys.shift = false; });

// touch controls
const jb = $('#joy'), jk = $('#jknob'); let jid = null, jc = null;
function moveJ(e) {
  let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const m = 45, l = Math.hypot(dx, dy);
  if (l > m) { dx *= m / l; dy *= m / l; }
  joy.x = dx / m; joy.y = dy / m; jk.style.transform = `translate(${dx}px,${dy}px)`;
}
jb.addEventListener('pointerdown', e => {
  ac(); jid = e.pointerId; try { jb.setPointerCapture(jid); } catch (x) { /* ignore */ }
  const r = jb.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; moveJ(e); e.preventDefault();
});
jb.addEventListener('pointermove', e => { if (e.pointerId === jid) moveJ(e); });
const endJ = e => { if (e.pointerId === jid) { jid = null; joy.x = joy.y = 0; jk.style.transform = ''; } };
jb.addEventListener('pointerup', endJ); jb.addEventListener('pointercancel', endJ);
$('#bAtk').addEventListener('pointerdown', e => { e.preventDefault(); ac(); attack(); });
$('#bJump').addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
$('#bLook').addEventListener('pointerdown', e => { e.preventDefault(); if (!frozen()) setLook(!look); });

function setLook(v) {
  if (v && (frozen() || phoneOpen || P.fall || !ready)) return;
  look = v; document.body.classList.toggle('look', look);
  if (look) { releaseLock(); award('look'); banner(TOUCH ? 'Tap the little door. Tap 👁 to look back.' : 'Click the little door. Press L to look back up.', 3500); }
}

// away-time achievement
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); save(); }
  else if (hiddenAt && Date.now() - hiddenAt > 3600e3) { award('grass'); hiddenAt = 0; }
});
addEventListener('beforeunload', save);

/* ---------------------------------------------------------------- HUD */
let lastHud = '', lastAct = '', curActs = [];
function hud() {
  const inv = [];
  inv.push(`<div class="slot">💲 ${fmt(R.money)}</div>`);
  if (R.sword) inv.push('<div class="slot" title="Sword">🗡️</div>');
  if (R.key) inv.push('<div class="slot" title="Key">🗝️</div>');
  if (R.trophy) inv.push('<div class="slot click" id="slotTrophy" title="Click to win">🏆 Click to win</div>');
  if (R.rocks) inv.push(`<div class="slot" title="Meteor rock">🪨 ×${R.rocks}</div>`);
  const sig = inv.join('') + R.hp + '|' + unread() + '|' + unlockedCount(a => a.tier < 6);
  if (sig !== lastHud) {
    lastHud = sig;
    $('#inv').innerHTML = inv.join('');
    $('#hearts').textContent = '❤️'.repeat(R.hp) + '🖤'.repeat(Math.max(0, 5 - R.hp));
    const u = unread(), bd = $('#badge'); bd.style.display = u ? 'block' : 'none'; bd.textContent = u;
    $('#achCount').textContent = `${unlockedCount(a => a.tier < 6)}/${NONSECRET.length}`;
    const st = $('#slotTrophy'); if (st) st.addEventListener('click', () => { if (!frozen() && !R.ended) endRun('win'); });
  }
  curActs = (frozen() || phoneOpen) ? [] : actions();
  const as = curActs.map(a => a.label + (a.dis ? '!' : '')).join('|');
  if (as !== lastAct) {
    lastAct = as; const box = $('#actions'); box.innerHTML = '';
    curActs.forEach(a => {
      const b = document.createElement('button'); b.className = 'act'; b.textContent = a.label; b.disabled = !!a.dis;
      b.addEventListener('click', () => { if (!a.dis) a.fn(); }); box.appendChild(b);
    });
  }
  $('#hurtV').style.opacity = clamp(flash / 0.4, 0, 1);
  $('#lockHint').style.display = (!TOUCH && !frozen() && !phoneOpen && !look && !document.pointerLockElement) ? 'block' : 'none';
}

/* ---------------------------------------------------------------- loop */
let last = performance.now();
function loop(ts) {
  const dtR = Math.min(0.05, (ts - last) / 1000); last = ts; anim += dtR;
  try {
    const fr = frozen(); if (!fr) tick(dtR);
    const dtW = (fr || phoneOpen || look) ? 0 : dtR;
    if (R.ended && !ui.popup && !queue.length && !ui.endShown && !ui.panel) showEnd();
    hud();
    const w = weather();
    W3.sync(dtR, dtW, {
      x: R.x, z: R.z, yaw: R.yaw, pitch: R.pitch, h: P.h, fall: P.fall, speed: P.speed, onGround: P.onGround, look, hasSword: R.sword,
      swing: P.swingT > 0 ? 1 - P.swingT / 0.3 : 0, door: R.door, trophyOn: R.trophyOn, keyPos: R.keyPos, rocks: R.rockList, ev: EV,
      eclipse: w.eclipse, rain: w.rain,
      zombie: { x: Z.x, z: Z.z, yaw: Z.yaw, alive: Z.alive, deadT: Z.alive ? 0 : Math.max(0, 6 - Z.rt), hostile: Z.hostile, speed: Z.spd, hurt: Z.hurt, swing: Z.swingT > 0 ? 1 - Z.swingT / 0.45 : 0, phase: Z.phase }
    });
    saveT += dtR; if (saveT > 2) { saveT = 0; save(); }
  } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}

/* ---------------------------------------------------------------- start */
(async () => {
  try {
    const low = TOUCH || innerWidth < 700;
    W3 = await createWorld(cv, { low, onProgress: p => { $('#loadbar').style.width = Math.round(p * 100) + '%'; } });
  } catch (e) {
    console.error(e); $('#loadtxt').textContent = 'Could not start 3D (WebGL needed): ' + e.message; return;
  }
  ready = true; $('#loading').classList.add('gone'); setTimeout(() => { const l = $('#loading'); if (l) l.remove(); }, 800);
  addEventListener('resize', () => W3.resize());
  if (R.ended) ui.endShown = false;
  if (Date.now() - (S.stats.seen || Date.now()) > 3600e3) setTimeout(() => award('grass'), 800);
  if (!R.ended && R.t < 2) banner(TOUCH ? 'The island looks empty. Is it?' : 'Click the screen to look around. The island looks empty. Is it?', 4200);
  window.__si = { get R() { return R; }, get Z() { return Z; }, S, award, tick, P, actions, endRun, get EV() { return EV; }, startEvent, setLook };
  requestAnimationFrame(loop);
})();

(() => {
'use strict';

/* =====================================================================
   SECRET ISLAND  —  a floating island that looks empty. It isn't.
   ===================================================================== */

const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const fmt = n => Math.floor(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* ---------------------------------------------------------------- data */
const W = 960, H = 540, CX = 480, CY = 310, RX = 390, RY = 215;
const SC = 1.5;                                  // canvas is 1440x810, logic is 960x540
const WALLS = [[425, 108, 110, 12], [425, 108, 12, 70], [523, 108, 12, 70], [425, 166, 40, 12], [495, 166, 40, 12]];
const DOORR = [465, 166, 30, 12];
const DOORP = { x: 480, y: 184 }, PED = { x: 480, y: 142 }, TREE = { x: 150, y: 325 };
const DECOR = [[150, 250, 40], [205, 395, 36], [770, 250, 38], [820, 350, 42], [700, 445, 36], [300, 455, 34], [640, 205, 34], [330, 212, 30], [610, 400, 30]];
const DEVD = { x: 606, y: 318, w: 24, h: 32 };   // secret door seen from below

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
const KEY = 'secretIsland.v1';
const defStats = () => ({ dist: 0, jumps: 0, swings: 0, kills: 0, deaths: 0, streak: 0, seen: Date.now(),
  end: { win: 0, gift: 0, sword: 0, void: 0, meteor: 0, slain: 0 } });
const mk = () => ({ v: 1, ach: {}, stats: defStats(), run: null, snd: true });
const newRun = () => ({ t: 0, wt: 0, x: 480, y: 345, fx: 0, fy: 1, hp: 5, sword: true, key: false, keyPos: null, door: false,
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

function save() {
  S.run = R; S.stats.seen = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}

// runtime only
let Z, EV = null, look = false, phoneOpen = false, anim = 0, flash = 0, saveT = 0;
const toasted = {}, queue = [], recent = [], parts = [], keys = {}, joy = { x: 0, y: 0 };
const ui = { popup: false, pause: false, panel: false, clear: false, endShown: false };
const P = { atkCd: 0, swingT: 0, jt: 0, fall: 0 };
function resetZ() { Z = { x: 300, y: 350, hp: 5, hostile: false, alive: true, rt: 0, atk: 0, hurt: 0 }; }
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
  if (S.ach[id]) {
    if (toasted[id]) return;
    toasted[id] = 1; toast(a); return;
  }
  S.ach[id] = Date.now(); toasted[id] = 1;
  recent.push(Date.now());
  while (recent.length && Date.now() - recent[0] > 60000) recent.shift();
  burst(R.x, R.y, TIERS[a.tier].c1, 50 + a.tier * 12);
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
  el.className = 'toast';
  el.style.background = `linear-gradient(90deg,${t.c1},${t.c2})`;
  el.innerHTML = `<div class="tic">${a.icon}</div><div><small>ACHIEVEMENT MADE</small><b>${esc(a.name)}</b></div>`;
  $('#toasts').appendChild(el);
  SFX.toast();
  setTimeout(() => el.remove(), 3900);
}

/* --- freeze popup --- */
function openPopup() {
  const id = queue.shift(); if (!id) return;
  const a = BY[id], t = TIERS[a.tier], first = !ui.popup;
  const stage = $('#stage');
  if (first) {
    ui.popup = true; keys.a = keys.d = keys.w = keys.s = false; joy.x = joy.y = 0;
    const r = stage.getBoundingClientRect(), vh = innerHeight, top = vh * 0.05;
    stage.style.transform = `translateY(${Math.round(top - r.top)}px) scale(.6)`;
    stage.classList.add('shrunk');
    $('#popup').style.top = Math.round(top + r.height * 0.6 + 18) + 'px';
    $('#ui').classList.add('hide');
    closePhone();
  }
  const card = $('#pcard');
  card.style.background = `linear-gradient(90deg,${t.c1},${t.c2})`;
  card.style.setProperty('--glow', t.c1);
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
  $('#pIc').textContent = a.icon;
  $('#pName').textContent = a.name;
  $('#pRar').textContent = (a.tier === 6 ? '??? ' : '') + t.n;
  $('#pDesc').textContent = a.desc;
  $('#pHint').style.display = 'block'; $('#pBtns').style.display = 'none';
  $('#popup').style.display = 'flex';
  SFX.unlock(a.tier);
  confetti(card, t.c1, 18 + a.tier * 6);
}
function confetti(card, col, n) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'cf';
    const ang = Math.random() * 6.28, d = rnd(60, 220);
    c.style.cssText = `left:50%;top:45%;background:${i % 2 ? '#fff' : col};--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d}px;--r:${rnd(-540, 540)}deg`;
    card.appendChild(c); setTimeout(() => c.remove(), 1200);
  }
}
function closePopup() {
  ui.popup = false;
  $('#popup').style.display = 'none';
  const stage = $('#stage'); stage.style.transform = ''; stage.classList.remove('shrunk');
  $('#ui').classList.remove('hide');
}
$('#pcard').addEventListener('click', () => { SFX.click(); $('#pHint').style.display = 'none'; $('#pBtns').style.display = 'flex'; });
$('#pCont').addEventListener('click', () => { SFX.click(); if (queue.length) openPopup(); else closePopup(); });
$('#pRest').addEventListener('click', () => { queue.length = 0; closePopup(); restartRun(); });

/* ---------------------------------------------------------------- particles */
function burst(x, y, col, n, spd = 220) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, s = rnd(spd * 0.3, spd);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rnd(0.7, 1.5), max: 1.5, col: i % 3 ? col : '#ffffff', sz: rnd(2, 5), g: 140 });
  }
}
function updParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.99;
  }
  if (parts.length > 600) parts.splice(0, parts.length - 600);
}

/* ---------------------------------------------------------------- helpers */
function norm(x, y) { return Math.hypot((x - CX) / RX, (y - CY) / RY); }
function walls() { return R.door ? WALLS : WALLS.concat([DOORR]); }
function blocked(x, y, r) {
  for (const w of walls()) {
    const cx = clamp(x, w[0], w[0] + w[2]), cy = clamp(y, w[1], w[1] + w[3]);
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}
const near = (o, r) => Math.hypot(R.x - o.x, R.y - o.y) < r;
function banner(txt, ms = 2800) {
  const b = $('#banner'); b.textContent = txt; b.classList.add('on');
  clearTimeout(banner.t); banner.t = setTimeout(() => b.classList.remove('on'), ms);
}
const frozen = () => ui.popup || ui.pause || ui.panel || ui.clear || !!R.ended;

/* ---------------------------------------------------------------- game logic */
function hurt(n) {
  if (R.ended || P.fall) return;
  R.hp -= n; R.tookDmg = true; flash = 0.35; SFX.hurt();
  burst(R.x, R.y, '#ef4444', 14, 160);
  if (R.hp <= 0) { R.hp = 0; endRun('slain'); }
}
function endRun(type) {
  if (R.ended) return;
  R.ended = type; S.stats.end[type] = (S.stats.end[type] || 0) + 1;
  if (type !== 'win' && type !== 'gift') { S.stats.deaths++; S.stats.streak = 0; }
  look = false; closePhone();
  SFX.end();
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
  ui.endShown = true;
  const e = ENDINGS[R.ended] || ENDINGS.slain;
  $('#endIcon').textContent = e.i; $('#endTitle').textContent = e.t; $('#endSub').textContent = e.s;
  $('#endM').classList.add('on');
}
function restartRun() {
  R = newRun(); S.run = R; resetZ(); EV = null; look = false; phoneOpen = false;
  Object.keys(toasted).forEach(k => delete toasted[k]);
  P.atkCd = P.swingT = P.jt = P.fall = 0; flash = 0; parts.length = 0;
  ['endM', 'pauseM', 'achM', 'clearM', 'phoneM'].forEach(m => $('#' + m).classList.remove('on'));
  ui.pause = ui.panel = ui.clear = ui.endShown = false;
  save(); banner('The island looks empty. Is it?', 3200);
}

function attack() {
  if (frozen() || phoneOpen || look || P.fall || P.atkCd > 0) return;
  P.atkCd = 0.32; P.swingT = 0.18; S.stats.swings++; SFX.swing();
  if (S.stats.swings >= 20) award('swing');
  if (!Z.alive) return;
  const dx = Z.x - R.x, dy = Z.y - R.y, d = Math.hypot(dx, dy);
  if (d < 54 && (dx * R.fx + dy * R.fy) / (d || 1) > -0.25) hitZ(dx / (d || 1), dy / (d || 1));
}
function hitZ(nx, ny) {
  Z.hp--; Z.hurt = 0.2; R.hitZ = true; R.nearZ = 0;
  if (!Z.hostile) { Z.hostile = true; SFX.growl(); }
  Z.x += nx * 16; Z.y += ny * 16;
  SFX.hit(); burst(Z.x, Z.y, '#7dd36a', 10, 150);
  award('fb');
  if (Z.hp <= 0) killZ();
}
function killZ() {
  Z.alive = false; Z.rt = 6; Z.hostile = false;
  R.kills++; S.stats.kills++; S.stats.streak++;
  burst(Z.x, Z.y, '#7dd36a', 30, 240);
  if (!R.key && !R.keyPos && !R.door) {
    const k = { x: Z.x, y: Z.y };
    if (norm(k.x, k.y) > 0.9) { k.x = CX + (k.x - CX) * 0.8; k.y = CY + (k.y - CY) * 0.8; }
    R.keyPos = k;
  }
  if (S.stats.streak >= 10) award('slayer');
  if (R.kills >= 5 && !R.tookDmg) award('untouch');
}
function jump() {
  if (frozen() || phoneOpen || look || P.fall || P.jt > 0) return;
  P.jt = 0.45; S.stats.jumps++; SFX.jump();
  if (S.stats.jumps >= 50) award('bunny');
}

function actions() {
  const a = [];
  if (R.ended || P.fall || look) return a;
  if (R.keyPos && near(R.keyPos, 34)) a.push({ label: '🗝️ Pick up key', fn() { R.key = true; R.keyPos = null; SFX.pickup(); award('key'); banner('You got a key!'); } });
  if (!R.door && near(DOORP, 52)) {
    if (R.key) a.push({ label: '🚪 Open door', fn() { R.key = false; R.door = true; R.trophyOn = true; SFX.door(); award('door'); if (R.t < 15) award('keymaster'); } });
    else a.push({ label: '🔒 Locked', dis: true });
  }
  if (R.trophyOn && near(PED, 40)) a.push({ label: '🏆 Take trophy', fn() { R.trophyOn = false; R.trophy = true; SFX.pickup(); award('trophy'); banner('Click the trophy to win... or sell it'); } });
  R.rockList.forEach((rk, i) => { if (near(rk, 36)) a.push({ label: '🪨 Pick up rock', fn() { R.rockList.splice(i, 1); R.rocks++; SFX.pickup(); award('rock'); } }); });
  if (Z.alive && near(Z, 54)) {
    if (R.sword) a.push({ label: '🗡️ Give sword', fn() { R.sword = false; SFX.growl(); endRun('sword'); } });
    if (R.trophy) a.push({ label: '🎁 Give trophy', fn() { R.trophy = false; SFX.pickup(); endRun('gift'); } });
  }
  if (R.ghost && !R.dug && !R.key && !R.door && near(TREE, 60)) a.push({ label: '⛏️ Dig under the tree', fn() { R.dug = true; R.key = true; SFX.pickup(); award('key'); banner('Something was buried here...'); } });
  return a;
}

/* --- world events --- */
function startEvent() {
  const types = ['meteor', 'eclipse', 'rain'];
  let type;
  if (R.seenEv.length === 0) type = 'meteor';
  else {
    const unseen = types.filter(t => !R.seenEv.includes(t));
    const pool = (unseen.length && Math.random() < 0.6) ? unseen : types;
    type = pool[Math.floor(Math.random() * pool.length)];
  }
  if (!R.seenEv.includes(type)) R.seenEv.push(type);
  if (type === 'meteor') {
    let tx, ty, tries = 0;
    do { const a = rnd(0, 6.28), r = rnd(0.15, 0.78); tx = CX + Math.cos(a) * RX * r; ty = CY + Math.sin(a) * RY * r; tries++; }
    while (tries < 30 && (blocked(tx, ty, 40) || Math.hypot(tx - R.x, ty - R.y) < 8));
    EV = { type, t: 0, dur: 6, tx, ty, hit: false };
    R.meteors++; award('star'); if (R.meteors >= 2) award('double');
    banner('☄️ A meteor is falling! Watch the shadow!', 4000); SFX.warn();
  } else if (type === 'eclipse') {
    EV = { type, t: 0, dur: 12 }; banner('🌑 A solar eclipse...', 3500);
  } else {
    EV = { type, t: 0, dur: 14 }; banner('🌧️ It starts to rain', 3500);
  }
  if (R.seenEv.length >= 3) award('eyewit');
}
function updEvents(dt) {
  if (!EV && R.wt >= R.nextEv) startEvent();
  if (!EV) return;
  EV.t += dt;
  if (EV.type === 'meteor' && !EV.hit && EV.t >= 4) {
    EV.hit = true; SFX.boom(); burst(EV.tx, EV.ty, '#ffb454', 60, 320); flash = Math.max(flash, 0.15);
    R.rockList.push({ x: EV.tx, y: EV.ty });
    if (!P.fall && Math.hypot(R.x - EV.tx, R.y - EV.ty) < 32) endRun('meteor');
  }
  if (EV.t >= EV.dur) { EV = null; R.nextEv = R.wt + rnd(40, 70); }
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
    P.fall += dt; R.y += 160 * dt;
    if (P.fall > 1.3) endRun('void');
    return;
  }
  if (phoneOpen || look) return;                  // world pauses while phone / underside view

  R.wt += dt; P.atkCd -= dt; if (P.swingT > 0) P.swingT -= dt; if (P.jt > 0) P.jt -= dt;
  if (flash > 0) flash -= dt;

  // movement
  let ix = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joy.x, iy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0) + joy.y;
  const len = Math.hypot(ix, iy);
  if (len > 0.08) {
    const m = Math.min(1, len); ix /= len; iy /= len; R.fx = ix; R.fy = iy;
    const sp = 135 * m, nx = R.x + ix * sp * dt, ny = R.y + iy * sp * dt, ox = R.x, oy = R.y;
    if (!blocked(nx, R.y, 10)) R.x = nx;
    if (!blocked(R.x, ny, 10)) R.y = ny;
    S.stats.dist += Math.hypot(R.x - ox, R.y - oy) / 8;
    if (S.stats.dist >= 50) award('walk');
  }
  const d = norm(R.x, R.y);
  if (d > 1.0) { P.fall = 0.001; SFX.fall(); }
  if (d > 0.93 && d <= 1.0) { R.edgeT += dt; if (R.edgeT >= 2) award('edge'); } else R.edgeT = 0;

  // zombie
  if (!Z.alive) { Z.rt -= dt; if (Z.rt <= 0) resetZ(); }
  else {
    Z.atk -= dt; if (Z.hurt > 0) Z.hurt -= dt;
    const dx = R.x - Z.x, dy = R.y - Z.y, dd = Math.hypot(dx, dy) || 1;
    if (Z.hostile) {
      if (dd > 24) { Z.x += dx / dd * 68 * dt; Z.y += dy / dd * 68 * dt; }
      if (dd <= 30 && Z.atk <= 0) { Z.atk = 1.1; hurt(1); }
    } else {
      if (dd > 75) { Z.x += dx / dd * 34 * dt; Z.y += dy / dd * 34 * dt; }
      if (dd < 90) { R.nearZ += dt; if (R.nearZ >= 180) award('friend'); } else if (dd > 170) R.nearZ = 0;
    }
  }

  updEvents(dt);
}

/* ---------------------------------------------------------------- phone */
const PH = { scr: 'home', chat: null, dial: '', res: '' };
function openPhone() {
  if (frozen() || look || P.fall) return;
  phoneOpen = true; R.usedPhone = true; PH.scr = 'home';
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
function openAch() { renderAch(); $('#achM').classList.add('on'); ui.panel = true; hideTip(); }
function closeAch() { $('#achM').classList.remove('on'); ui.panel = false; hideTip(); }
function openPause() { if (ui.popup || R.ended) return; closePhone(); $('#pauseM').classList.add('on'); ui.pause = true; $('#mSound').textContent = S.snd ? '🔊 Sound: On' : '🔇 Sound: Off'; }
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
addEventListener('keydown', e => {
  ac();
  const k = e.key.toLowerCase();
  if (e.repeat && !['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { if (k === ' ') e.preventDefault(); return; }
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
  if (k === ' ') e.preventDefault();
  if (frozen()) return;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'w' || k === 'arrowup') keys.w = true;
  if (k === 'a' || k === 'arrowleft') keys.a = true;
  if (k === 's' || k === 'arrowdown') keys.s = true;
  if (k === 'd' || k === 'arrowright') keys.d = true;
  if (k === 'j') attack();
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
});
addEventListener('blur', () => { keys.w = keys.a = keys.s = keys.d = false; });
addEventListener('pointerdown', () => ac(), { passive: true });

// touch controls
const jb = $('#joy'), jk = $('#jknob'); let jid = null, jc = null;
function moveJ(e) {
  let dx = e.clientX - jc.x, dy = e.clientY - jc.y; const m = 45, l = Math.hypot(dx, dy);
  if (l > m) { dx *= m / l; dy *= m / l; }
  joy.x = dx / m; joy.y = dy / m; jk.style.transform = `translate(${dx}px,${dy}px)`;
}
jb.addEventListener('pointerdown', e => {
  jid = e.pointerId; try { jb.setPointerCapture(jid); } catch (x) { /* ignore */ }
  const r = jb.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; moveJ(e); e.preventDefault();
});
jb.addEventListener('pointermove', e => { if (e.pointerId === jid) moveJ(e); });
const endJ = e => { if (e.pointerId === jid) { jid = null; joy.x = joy.y = 0; jk.style.transform = ''; } };
jb.addEventListener('pointerup', endJ); jb.addEventListener('pointercancel', endJ);
$('#bAtk').addEventListener('pointerdown', e => { e.preventDefault(); attack(); });
$('#bJump').addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
$('#bLook').addEventListener('pointerdown', e => { e.preventDefault(); if (!frozen()) setLook(!look); });

// look under the island
function setLook(v) {
  if (v && (frozen() || phoneOpen || P.fall)) return;
  look = v; if (look) { award('look'); banner('Tap/press L to look back up', 2500); }
}
$('#cv').addEventListener('pointerdown', e => {
  if (!look) return;
  const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  if (x > DEVD.x - 12 && x < DEVD.x + DEVD.w + 12 && y > DEVD.y - 12 && y < DEVD.y + DEVD.h + 12) {
    SFX.door(); award('dev'); banner('🛠️ "You weren\'t supposed to be here."', 3500);
  }
});

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
      b.addEventListener('click', () => { if (!a.dis) a.fn(); });
      box.appendChild(b);
    });
  }
}

/* ---------------------------------------------------------------- render */
const cv = $('#cv'), g = cv.getContext('2d');
const TUFTS = Array.from({ length: 90 }, (_, i) => {
  const a = (i * 2.399) % 6.283, r = Math.sqrt(((i * 37) % 100) / 100) * 0.93;
  return [CX + Math.cos(a) * RX * r, CY + Math.sin(a) * RY * r, 3 + (i % 4)];
});
function ell(x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.2832); }
function emoji(ch, x, y, size, alpha = 1) { g.globalAlpha = alpha; g.font = `${size}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x, y); g.globalAlpha = 1; }

function drawSky(dark) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, dark ? '#10102a' : '#3a8ee6'); gr.addColorStop(1, dark ? '#2b2150' : '#d3f0ff');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.fillStyle = dark ? '#ffffff14' : '#ffffffb0';
  for (let i = 0; i < 7; i++) {
    const x = ((i * 190 + anim * (6 + i * 2.5)) % (W + 300)) - 150, y = 30 + ((i * 97) % 480);
    ell(x, y, 70, 16); g.fill(); ell(x + 34, y - 10, 42, 14); g.fill(); ell(x - 38, y + 4, 38, 11); g.fill();
  }
}
function drawIsland() {
  g.fillStyle = '#3d2a1a'; ell(CX, CY + 48, RX * 0.86, RY * 0.84); g.fill();
  g.fillStyle = '#6b4a2f'; ell(CX, CY + 26, RX, RY); g.fill();
  const gr = g.createRadialGradient(CX, CY - 30, 40, CX, CY, RX);
  gr.addColorStop(0, '#78d14f'); gr.addColorStop(1, '#4aa23c');
  g.fillStyle = gr; ell(CX, CY, RX, RY); g.fill();
  g.strokeStyle = '#a5e684aa'; g.lineWidth = 4; ell(CX, CY, RX - 5, RY - 5); g.stroke();
  g.fillStyle = '#3d8a33';
  TUFTS.forEach(t => { ell(t[0], t[1], t[2], t[2] * 0.45); g.fill(); });
}
function drawHut() {
  g.fillStyle = '#c9a56b'; g.fillRect(437, 120, 86, 46);
  g.fillStyle = '#9a7a45'; g.fillRect(437, 120, 86, 4);
  g.fillStyle = '#7a4f24';
  WALLS.forEach(w => g.fillRect(w[0], w[1], w[2], w[3]));
  g.strokeStyle = '#4a2c0c'; g.lineWidth = 2; WALLS.forEach(w => g.strokeRect(w[0], w[1], w[2], w[3]));
  if (!R.door) { g.fillStyle = '#5a3410'; g.fillRect(DOORR[0], DOORR[1], DOORR[2], DOORR[3]); g.strokeRect(DOORR[0], DOORR[1], DOORR[2], DOORR[3]); emoji('🔒', 480, 172, 14); }
  else { g.fillStyle = '#5a3410'; g.fillRect(494, 166, 5, 24); }
  g.fillStyle = '#8b8f98'; ell(PED.x, PED.y + 6, 15, 7); g.fill();
  if (R.trophyOn) { emoji('🏆', PED.x, PED.y - 2 + Math.sin(anim * 3) * 2, 26); }
}
function drawDecor() {
  DECOR.forEach(d => { g.fillStyle = '#0003'; ell(d[0], d[1] + d[2] * 0.4, d[2] * 0.5, d[2] * 0.18); g.fill(); emoji('🌳', d[0], d[1], d[2] * 1.5); });
  g.fillStyle = '#0003'; ell(TREE.x, TREE.y + 28, 34, 10); g.fill(); emoji('🌳', TREE.x, TREE.y, 78);
}
function drawGround() {
  R.rockList.forEach(r => { g.fillStyle = '#2a1a0f99'; ell(r.x, r.y + 6, 22, 9); g.fill(); emoji('🪨', r.x, r.y + Math.sin(anim * 2) * 1.5, 26); });
  if (R.keyPos) { const k = R.keyPos; g.fillStyle = '#fde04788'; ell(k.x, k.y + 8, 14 + Math.sin(anim * 4) * 2, 6); g.fill(); emoji('🗝️', k.x, k.y - 4 + Math.sin(anim * 4) * 3, 24); }
}
function drawZombie() {
  if (!Z.alive) return;
  g.fillStyle = '#0004'; ell(Z.x, Z.y + 14, 14, 5); g.fill();
  if (Z.hostile) { g.fillStyle = '#ef444433'; ell(Z.x, Z.y, 26, 26); g.fill(); }
  emoji('🧟', Z.x + (Z.hurt > 0 ? rnd(-2, 2) : 0), Z.y - 4 + Math.sin(anim * 5) * 1.5, 34, Z.hurt > 0 ? 0.6 : 1);
  if (Z.hp < 5) { g.fillStyle = '#000a'; g.fillRect(Z.x - 16, Z.y - 28, 32, 5); g.fillStyle = '#ef4444'; g.fillRect(Z.x - 15, Z.y - 27, 30 * Z.hp / 5, 3); }
}
function drawPlayer() {
  const jh = P.jt > 0 ? Math.sin(Math.PI * (1 - P.jt / 0.45)) * 22 : 0;
  const sc = P.fall ? Math.max(0.15, 1 - P.fall * 0.7) : 1;
  g.save(); g.translate(R.x, R.y); g.scale(sc, sc);
  g.fillStyle = '#0004'; ell(0, 12, 12 - jh * 0.15, 4.5); g.fill();
  g.translate(0, -jh);
  g.fillStyle = '#38bdf8'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 11, 0, 6.2832); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(R.fx * 5 - 3.5, R.fy * 4 - 2, 2.6, 0, 6.2832); g.arc(R.fx * 5 + 3.5, R.fy * 4 - 2, 2.6, 0, 6.2832); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(R.fx * 6.5 - 3.5, R.fy * 5 - 2, 1.2, 0, 6.2832); g.arc(R.fx * 6.5 + 3.5, R.fy * 5 - 2, 1.2, 0, 6.2832); g.fill();
  if (R.sword) {
    const a = Math.atan2(R.fy, R.fx) + (P.swingT > 0 ? (0.18 - P.swingT) / 0.18 * 2.2 - 1.1 : 0.5);
    g.strokeStyle = '#e5e7eb'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); g.lineTo(Math.cos(a) * 32, Math.sin(a) * 32); g.stroke();
    g.strokeStyle = '#a16207'; g.lineWidth = 5; g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); g.stroke();
    if (P.swingT > 0) { g.strokeStyle = '#ffffff99'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 30, a - 0.9, a); g.stroke(); }
  }
  g.restore();
}
function drawEv() {
  if (!EV) return;
  if (EV.type === 'meteor') {
    const t = EV.t;
    if (t < 4) {
      const k = t / 4; g.fillStyle = `rgba(255,40,20,${0.15 + 0.25 * Math.abs(Math.sin(t * 6))})`; ell(EV.tx, EV.ty, 8 + 28 * k, 5 + 17 * k); g.fill();
      g.strokeStyle = '#ff5030'; g.lineWidth = 2; ell(EV.tx, EV.ty, 8 + 28 * k, 5 + 17 * k); g.stroke();
      if (t > 2.6) { const f = (t - 2.6) / 1.4, x = EV.tx + 260 * (1 - f), y = EV.ty - 560 * (1 - f);
        const gr = g.createRadialGradient(x, y, 2, x, y, 30); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, '#ffb454'); gr.addColorStop(1, '#ff3d0000');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 30, 0, 6.2832); g.fill();
        g.strokeStyle = '#ff8a3d88'; g.lineWidth = 12; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 130 * (1 - f) + 20, y - 280 * (1 - f) - 30); g.stroke(); }
    } else {
      const f = (EV.t - 4) / 2; g.strokeStyle = `rgba(255,200,120,${1 - f})`; g.lineWidth = 4; ell(EV.tx, EV.ty, 20 + 120 * f, 12 + 70 * f); g.stroke();
    }
  } else if (EV.type === 'eclipse') {
    const a = Math.sin(Math.PI * EV.t / EV.dur) * 0.6;
    g.fillStyle = `rgba(5,5,30,${a})`; g.fillRect(0, 0, W, H);
    g.fillStyle = `rgba(0,0,0,${Math.min(1, a * 2)})`; g.strokeStyle = `rgba(255,220,150,${Math.min(1, a * 2)})`; g.lineWidth = 5; g.beginPath(); g.arc(W - 120, 70, 34, 0, 6.2832); g.fill(); g.stroke();
  } else if (EV.type === 'rain') {
    g.fillStyle = 'rgba(40,70,120,.22)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#cfe8ffaa'; g.lineWidth = 1.5; g.beginPath();
    for (let i = 0; i < 90; i++) { const x = (i * 83 + anim * 220) % W, y = (i * 59 + anim * 700) % H; g.moveTo(x, y); g.lineTo(x - 5, y + 16); }
    g.stroke();
  }
}
function drawParts() { parts.forEach(p => { g.globalAlpha = clamp(p.life / 0.6, 0, 1); g.fillStyle = p.col; g.fillRect(p.x, p.y, p.sz, p.sz); }); g.globalAlpha = 1; }

function drawUnder() {
  drawSky(true);
  const gr = g.createLinearGradient(0, 120, 0, 500); gr.addColorStop(0, '#7a5636'); gr.addColorStop(1, '#241509');
  g.fillStyle = gr; g.beginPath(); g.moveTo(CX - RX, 150);
  g.bezierCurveTo(CX - RX + 30, 330, CX - 90, 470, CX, 505);
  g.bezierCurveTo(CX + 90, 470, CX + RX - 30, 330, CX + RX, 150);
  g.ellipse(CX, 150, RX, 62, 0, 0, Math.PI, true); g.closePath(); g.fill();
  g.strokeStyle = '#00000044'; g.lineWidth = 3;
  for (let i = 0; i < 14; i++) { const x = CX - 300 + i * 46; g.beginPath(); g.moveTo(x, 190 + (i % 3) * 14); g.quadraticCurveTo(x + 10, 300, CX + (x - CX) * 0.3, 420); g.stroke(); }
  g.fillStyle = '#4b9a3a'; ell(CX, 150, RX, 62); g.fill(); g.fillStyle = '#7a5636'; ell(CX, 160, RX, 58); g.fill();
  // secret door
  g.fillStyle = '#3a2410'; g.fillRect(DEVD.x - 3, DEVD.y - 3, DEVD.w + 6, DEVD.h + 6);
  g.fillStyle = '#6b3f12'; g.fillRect(DEVD.x, DEVD.y, DEVD.w, DEVD.h);
  g.fillStyle = `rgba(255,220,120,${0.35 + 0.25 * Math.sin(anim * 3)})`; g.fillRect(DEVD.x + 4, DEVD.y + DEVD.h - 4, DEVD.w - 8, 3);
  emoji('🌲', CX - 120, 140, 30); emoji('🌳', CX + 140, 130, 34);
  g.fillStyle = '#ffffffaa'; g.font = '16px system-ui'; g.textAlign = 'center'; g.fillText('The underside of the island. Something looks off...', CX, H - 18);
}
function draw() {
  g.setTransform(SC, 0, 0, SC, 0, 0);
  if (look) { drawUnder(); drawParts(); return; }
  drawSky(false); drawIsland(); drawDecor(); drawHut(); drawGround(); drawZombie(); drawPlayer(); drawEv(); drawParts();
  if (flash > 0) { g.fillStyle = `rgba(255,40,40,${clamp(flash, 0, 0.35)})`; g.fillRect(0, 0, W, H); }
}

/* ---------------------------------------------------------------- loop */
let last = performance.now();
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts; anim += dt;
  try {
    if (!frozen()) tick(dt);
    updParts(dt);
    if (R.ended && !ui.popup && !queue.length && !ui.endShown && !ui.panel) showEnd();
    hud(); draw();
    saveT += dt; if (saveT > 2) { saveT = 0; save(); }
  } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}

/* ---------------------------------------------------------------- start */
if (R.ended) { ui.endShown = false; }
if (Date.now() - (S.stats.seen || Date.now()) > 3600e3) setTimeout(() => award('grass'), 600);
if (!R.ended && R.t < 2) banner('The island looks empty. Is it?', 3500);
requestAnimationFrame(loop);

})();

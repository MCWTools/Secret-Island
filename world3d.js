import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* =====================================================================
   world3d.js — everything you see: textures, island, hut, trees, zombie,
   sword, sky, weather, meteor. All textures are generated procedurally
   at load time (no image files needed).
   ===================================================================== */

export const IR = 18;                                        // island radius (m)
export const HUT = { cx: 0, cz: -11.2, hx: 3.2, hz: 2.8, wall: 0.3, doorW: 1.8, h: 3.1 };
export const PED = { x: 0, z: -11.5 };
export const DOORP = { x: 0, z: -7.5 };
export const TREE = { x: -13, z: -1, r: 1.35 };
const TAU = Math.PI * 2;

/* ------------------------------------------------------------ math */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mixc = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
const hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function hash(ix, iy, s) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
function vnoise(x, y, px, py, s) {                       // periodic value noise -> seamless textures
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
  const a = hash(x0, y0, s), b = hash(x1, y0, s), c = hash(x0, y1, s), d = hash(x1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(u, v, px, py, oct, s) {
  let a = 0.5, f = 1, sum = 0, n = 0;
  for (let o = 0; o < oct; o++) { sum += a * vnoise(u * px * f, v * py * f, px * f, py * f, s + o * 17); n += a; a *= 0.5; f *= 2; }
  return sum / n;
}
function noise2(x, y, s) {                                // non-periodic (terrain)
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function noise3(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const h = (a, b, c) => hash(a + Math.imul(c, 57), b + Math.imul(c, 131), s);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
           l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}

/* ------------------------------------------------------------ terrain */
export function groundH(x, z) {
  const r = Math.hypot(x, z);
  let h = (noise2(x * 0.11, z * 0.11, 3) - 0.5) * 1.3 + (noise2(x * 0.37, z * 0.37, 4) - 0.5) * 0.35;
  const dHut = Math.hypot(x - HUT.cx, z - HUT.cz), dSp = Math.hypot(x, z - 9);
  h *= smooth(5.5, 10, dHut) * smooth(1.5, 5, dSp);
  const rim = smooth(IR * 0.88, IR, r);
  h -= rim * rim * 1.9 + Math.max(0, r - IR) * 0.9;
  return h;
}

/* ------------------------------------------------------------ texture generation */
let MAXANI = 8, TEXSIZE = 512;
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function makeTex(fn, size = TEXSIZE) {
  const c = cnv(size, size), x = c.getContext('2d'), img = x.createImageData(size, size);
  const hc = cnv(size, size), hx = hc.getContext('2d'), him = hx.createImageData(size, size);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const o = fn(i / size, j / size), k = (j * size + i) * 4;
    img.data[k] = o[0]; img.data[k + 1] = o[1]; img.data[k + 2] = o[2]; img.data[k + 3] = o[4] === undefined ? 255 : o[4];
    const hv = clamp(o[3], 0, 1) * 255; him.data[k] = him.data[k + 1] = him.data[k + 2] = hv; him.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0); hx.putImageData(him, 0, 0);
  const map = new THREE.CanvasTexture(c), bump = new THREE.CanvasTexture(hc);
  map.colorSpace = THREE.SRGBColorSpace;
  [map, bump].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAXANI; });
  return { map, bump };
}
function rep(t, rx, ry) {
  const m = t.map.clone(), b = t.bump.clone();
  [m, b].forEach(x => { x.repeat.set(rx, ry); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.needsUpdate = true; });
  return { map: m, bump: b };
}
const T = {
  grass(u, v) {
    const n1 = fbm(u, v, 3, 3, 4, 1), n2 = fbm(u, v, 12, 12, 3, 2), st = fbm(u, v, 90, 10, 4, 3);
    let c = mixc(hex(0x2a6419), hex(0x7bc73f), clamp(n1 * 0.95 + n2 * 0.35 - 0.12, 0, 1));
    c = mul(c, 0.8 + st * 0.4);
    const d = fbm(u, v, 20, 20, 3, 4); if (d > 0.68) c = mixc(c, hex(0x6b4a2a), smooth(0.68, 0.78, d) * 0.75);
    const cl = fbm(u, v, 9, 9, 3, 6); if (cl > 0.66) c = mixc(c, hex(0xa3e060), smooth(0.66, 0.8, cl) * 0.5);
    return [c[0], c[1], c[2], n1 * 0.45 + st * 0.55];
  },
  rock(u, v) {
    const w = fbm(u, v, 3, 3, 4, 11), band = Math.sin((v * 7 + w * 1.8) * TAU) * 0.5 + 0.5;
    let c = mixc(hex(0x5a4838), hex(0x8d7a64), clamp(w * 0.8 + band * 0.3, 0, 1));
    c = mixc(c, hex(0x372d25), smooth(0.55, 0.9, band) * 0.35);
    const r = 1 - Math.abs(2 * fbm(u, v, 7, 7, 4, 12) - 1), crack = Math.pow(r, 10);
    c = mul(c, 0.78 + fbm(u, v, 24, 24, 3, 13) * 0.4);
    c = mixc(c, hex(0x120d0a), clamp(crack * 1.5, 0, 0.75));
    const moss = fbm(u, v, 5, 5, 3, 14); if (moss > 0.62) c = mixc(c, hex(0x4a6c2c), smooth(0.62, 0.75, moss) * 0.5);
    return [c[0], c[1], c[2], w * 0.55 + (1 - crack) * 0.45];
  },
  stone(u, v) {
    const w = fbm(u, v, 4, 4, 4, 41);
    let c = mixc(hex(0x6f6f6c), hex(0xb4b1a8), w);
    const r = 1 - Math.abs(2 * fbm(u, v, 6, 6, 4, 42) - 1); c = mixc(c, hex(0x2a2a28), clamp(Math.pow(r, 12) * 1.3, 0, 0.7));
    c = mul(c, 0.85 + fbm(u, v, 30, 30, 2, 43) * 0.3);
    return [c[0], c[1], c[2], w * 0.6 + (1 - Math.pow(r, 12)) * 0.4];
  },
  bark(u, v) {
    const s = fbm(u, v, 16, 2, 5, 21), r = 1 - Math.abs(2 * fbm(u, v, 10, 2, 4, 22) - 1);
    let c = mixc(hex(0x3a2615), hex(0x7a5530), clamp(s * 0.9 + Math.pow(r, 3) * 0.4, 0, 1));
    const m = fbm(u, v, 4, 4, 3, 23); if (m > 0.6) c = mixc(c, hex(0x4d6b2a), smooth(0.6, 0.8, m) * 0.55);
    c = mixc(c, hex(0x120a04), Math.pow(r, 8) * 0.55);
    return [c[0], c[1], c[2], s * 0.6 + r * 0.4];
  },
  planks(u, v) {
    const N = 5, bi = Math.floor(v * N), lv = v * N - bi, sh = hash(bi, 0, 31);
    let c = mixc(hex(0x66431f), hex(0x9c6e3d), sh);
    const grain = fbm(u, v, 2 + bi % 3, 70, 5, 32 + bi); c = mul(c, 0.76 + grain * 0.48);
    const knot = fbm(u, v, 6, 6, 2, 33 + bi); if (knot > 0.8) c = mixc(c, hex(0x2a1608), smooth(0.8, 0.88, knot) * 0.8);
    const gap = smooth(0, 0.06, lv) * smooth(0, 0.06, 1 - lv);
    c = mixc(hex(0x100803), c, gap);
    const nx = (u * 5) % 1; if (Math.hypot(nx - 0.5, (lv - 0.5) * 0.9) < 0.04) c = hex(0x1c1c1c);
    return [c[0], c[1], c[2], gap * (0.4 + grain * 0.6)];
  },
  skin(u, v) {
    const n1 = fbm(u, v, 4, 4, 4, 61);
    let c = mixc(hex(0x6c8660), hex(0x95a67f), n1);
    const b = fbm(u, v, 5, 5, 3, 62);
    if (b > 0.58) c = mixc(c, hex(0x66507c), smooth(0.58, 0.78, b) * 0.65);
    else if (b < 0.32) c = mixc(c, hex(0x8c7b46), smooth(0.32, 0.12, b) * 0.6);
    const vein = Math.pow(1 - Math.abs(2 * fbm(u, v, 9, 9, 4, 63) - 1), 14);
    c = mixc(c, hex(0x2c4a55), clamp(vein * 0.9, 0, 0.8));
    const pore = fbm(u, v, 70, 70, 2, 64); c = mul(c, 0.88 + pore * 0.22);
    const bl = fbm(u, v, 6, 6, 3, 65); if (bl > 0.7) c = mixc(c, hex(0x6e0f0f), smooth(0.7, 0.78, bl) * 0.85);
    const dirt = fbm(u, v, 3, 3, 3, 66); c = mixc(c, hex(0x2e2618), smooth(0.6, 0.9, dirt) * 0.35);
    return [c[0], c[1], c[2], pore * 0.35 + vein * 0.4 + n1 * 0.25];
  },
  shirt(u, v) {
    const sx = Math.sin(u * TAU * 10) * 0.5 + 0.5, sy = Math.sin(v * TAU * 10) * 0.5 + 0.5;
    const p = clamp(smooth(0.6, 0.85, sx) * 0.6 + smooth(0.6, 0.85, sy) * 0.6, 0, 0.9);
    let c = mixc(hex(0x8b312b), hex(0x241413), p);
    c = mul(c, 0.93 + Math.sin(u * TAU * 150) * Math.sin(v * TAU * 150) * 0.07);
    const d = fbm(u, v, 5, 5, 4, 81); c = mixc(c, hex(0x2c2218), smooth(0.45, 0.8, d) * 0.7);
    const bl = fbm(u, v, 6, 6, 3, 82); if (bl > 0.7) c = mixc(c, hex(0x5a0a0a), smooth(0.7, 0.78, bl) * 0.9);
    const hole = fbm(u, v, 6, 6, 4, 83), hem = fbm(u, v, 14, 2, 3, 84);
    const a = (hole > 0.7 || v < 0.05 + 0.1 * hem || v > 0.97) ? 0 : 255;
    return [c[0], c[1], c[2], d * 0.5 + 0.3, a];
  },
  pants(u, v) {
    let c = mixc(hex(0x233349), hex(0x3d5576), fbm(u, v, 6, 6, 3, 91));
    c = mul(c, 0.9 + Math.sin((u + v) * TAU * 130) * 0.06 + Math.sin((u - v) * TAU * 130) * 0.04);
    const d = fbm(u, v, 4, 4, 4, 92); c = mixc(c, hex(0x2a2015), smooth(0.45, 0.85, d) * 0.75);
    const bl = fbm(u, v, 7, 7, 3, 93); if (bl > 0.72) c = mixc(c, hex(0x540c0c), smooth(0.72, 0.8, bl) * 0.9);
    const hole = fbm(u, v, 6, 6, 4, 94), hem = fbm(u, v, 12, 2, 3, 95);
    const a = (hole > 0.74 || v < 0.04 + 0.1 * hem) ? 0 : 255;
    return [c[0], c[1], c[2], d * 0.5 + 0.25, a];
  },
  steel(u, v) {
    const s = fbm(u, v, 2, 150, 3, 51), s2 = fbm(u, v, 3, 40, 2, 52);
    const k = 150 + s * 70 + s2 * 25; return [k, k + 3, k + 8, s, 255];
  },
  leather(u, v) {
    const n = fbm(u, v, 20, 20, 4, 101), s = fbm(u, v, 3, 60, 2, 102);
    const c = mixc(hex(0x3a2212), hex(0x6c4426), n * 0.7 + s * 0.3); return [c[0], c[1], c[2], n];
  },
  leaf(u, v) {
    const n = fbm(u, v, 10, 10, 4, 71), b = fbm(u, v, 28, 28, 3, 72);
    let c = mixc(hex(0x1c5518), hex(0x71b838), clamp(n * 1.1 + b * 0.4 - 0.2, 0, 1));
    const vein = Math.pow(1 - Math.abs(2 * fbm(u, v, 14, 14, 3, 73) - 1), 6); c = mixc(c, hex(0x10300d), vein * 0.5);
    return [c[0], c[1], c[2], n * 0.5 + b * 0.5];
  }
};

function softCanvas(size, stops) {
  const c = cnv(size, size), x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(s => g.addColorStop(s[0], s[1])); x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function grassBladeTex() {
  const c = cnv(128, 256), x = c.getContext('2d'), r = rng(9);
  for (let i = 0; i < 9; i++) {
    const bx = 14 + i * 12 + r() * 6, h = 120 + r() * 120, lean = (r() - 0.5) * 50, w = 5 + r() * 4;
    const g = x.createLinearGradient(0, 256, 0, 256 - h); g.addColorStop(0, '#2d6a1b'); g.addColorStop(0.6, '#6cbf35'); g.addColorStop(1, '#b8e866');
    x.fillStyle = g; x.beginPath(); x.moveTo(bx - w, 256); x.quadraticCurveTo(bx - w * 0.4 + lean * 0.3, 256 - h * 0.6, bx + lean, 256 - h);
    x.quadraticCurveTo(bx + w * 0.4 + lean * 0.3, 256 - h * 0.6, bx + w, 256); x.closePath(); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = MAXANI; return t;
}
function flowerTex() {
  const c = cnv(64, 128), x = c.getContext('2d');
  x.strokeStyle = '#3f8a2a'; x.lineWidth = 4; x.beginPath(); x.moveTo(32, 128); x.quadraticCurveTo(28, 90, 32, 52); x.stroke();
  x.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; x.beginPath(); x.arc(32 + Math.cos(a) * 12, 40 + Math.sin(a) * 12, 10, 0, TAU); x.fill(); }
  x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(32, 40, 8, 0, TAU); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cloudTex() {
  const c = cnv(256, 256), x = c.getContext('2d'), r = rng(5);
  for (let i = 0; i < 26; i++) {
    const px = 60 + r() * 136, py = 90 + r() * 80, rad = 28 + r() * 40, g = x.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ------------------------------------------------------------ geometry helpers */
function displace(geo, amp, freq, seed, fade) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = (noise3(v.x * freq + 50, v.y * freq + 50, v.z * freq + 50, seed) - 0.5) * 2 * amp * (fade ? fade(v) : 1);
    const l = Math.hypot(v.x, v.y, v.z) || 1; v.x += v.x / l * n; v.y += v.y / l * n; v.z += v.z / l * n;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return geo;
}
const shadowize = (o, cast = true, recv = true) => { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; };

/* ====================================================================
   createWorld
   ==================================================================== */
export async function createWorld(canvas, { low = false, onProgress = () => {} } = {}) {
  const tick = () => new Promise(r => setTimeout(r, 0));
  TEXSIZE = low ? 256 : 512;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1.6 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  MAXANI = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.05, 900);
  camera.rotation.order = 'YXZ'; scene.add(camera);
  scene.fog = new THREE.Fog(0xcfe8ff, 70, 420);

  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;

  /* ---- textures ---- */
  const names = ['grass', 'rock', 'stone', 'bark', 'planks', 'skin', 'shirt', 'pants', 'steel', 'leather', 'leaf'];
  const TX = {};
  for (let i = 0; i < names.length; i++) { TX[names[i]] = makeTex(T[names[i]], names[i] === 'steel' || names[i] === 'leather' ? 256 : TEXSIZE); onProgress((i + 1) / names.length * 0.7); await tick(); }

  const std = (t, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ map: t.map, bumpMap: t.bump, bumpScale: 2.2, roughness: 0.9 }, o));
  const M = {
    grass: std(rep(TX.grass, 1, 1), { vertexColors: true, bumpScale: 1.6 }),
    rock: std(rep(TX.rock, 7, 3), { roughness: 0.95, bumpScale: 4, side: THREE.DoubleSide }),
    rockProp: std(rep(TX.rock, 2, 2), { roughness: 0.95, bumpScale: 4 }),
    stone: std(rep(TX.stone, 1.5, 1.5), { roughness: 0.85, bumpScale: 3 }),
    bark: std(rep(TX.bark, 1.5, 2.5), { roughness: 0.95, bumpScale: 4 }),
    leaf: [0xffffff, 0xe6f4a8, 0xb5dcc0].map(c => std(rep(TX.leaf, 2, 2), { color: c, roughness: 0.8, bumpScale: 3 })),
    planks: std(rep(TX.planks, 1, 1), { roughness: 0.8, bumpScale: 3 }),
    roof: std(rep(TX.planks, 4, 2), { color: 0x8a6a55, roughness: 0.85, bumpScale: 3 }),
    skin: std(rep(TX.skin, 1, 1), { roughness: 0.75, bumpScale: 1.8 }),
    shirt: std(rep(TX.shirt, 1, 1), { roughness: 0.95, bumpScale: 1.5, alphaTest: 0.5, side: THREE.DoubleSide }),
    pants: std(rep(TX.pants, 1, 1), { roughness: 0.95, bumpScale: 1.5, alphaTest: 0.5, side: THREE.DoubleSide }),
    steel: new THREE.MeshStandardMaterial({ map: TX.steel.map, bumpMap: TX.steel.bump, bumpScale: 1, color: 0xdfe6ee, metalness: 0.95, roughness: 0.28 }),
    leather: std(TX.leather, { roughness: 0.7 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc933, metalness: 1, roughness: 0.22, emissive: 0x4a3000, emissiveIntensity: 0.5 }),
    bone: new THREE.MeshStandardMaterial({ color: 0xd8d2bd, roughness: 0.6 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x120a0a, roughness: 1 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 }),
    blood: new THREE.MeshStandardMaterial({ color: 0x5c0a0a, roughness: 0.4, emissive: 0x200000 }),
    mouth: new THREE.MeshStandardMaterial({ color: 0x3a0808, roughness: 0.8 }),
    shoe: new THREE.MeshStandardMaterial({ color: 0x2a211b, roughness: 0.9 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xd2ff5a })
  };

  /* ---- lights ---- */
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x6b8a4a, 0.75); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.6); sun.position.set(55, 85, 35); sun.castShadow = true;
  sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 10, far: 200 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8fb4ff, 0.5); fill.position.set(-10, -30, 8); scene.add(fill);
  const sunDir = sun.position.clone().normalize();

  /* ---- sky ---- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2b74d4) }, hor: { value: new THREE.Color(0xcfe8ff) }, sd: { value: sunDir }, dim: { value: 1 } },
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vP;uniform vec3 top,hor,sd;uniform float dim;
      void main(){float h=vP.y;vec3 c=mix(hor,top,pow(clamp(h,0.,1.),.5));
      if(h<0.)c=mix(hor,vec3(.62,.78,.95),clamp(-h*2.5,0.,1.));
      float s=max(dot(normalize(vP),sd),0.);c+=vec3(1.,.92,.75)*(pow(s,600.)*8.+pow(s,60.)*.5+pow(s,6.)*.18);
      gl_FragColor=vec4(c*dim,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat); sky.renderOrder = -10; scene.add(sky);
  // eclipse disc + corona
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, transparent: true, opacity: 0 }));
  moon.position.copy(sunDir).multiplyScalar(540); moon.lookAt(0, 0, 0); scene.add(moon);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: softCanvas(128, [[0, 'rgba(255,240,200,1)'], [0.3, 'rgba(255,200,120,.5)'], [1, 'rgba(255,160,60,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0 }));
  corona.position.copy(sunDir).multiplyScalar(535); corona.scale.setScalar(90); scene.add(corona);

  // clouds
  const cloudMap = cloudTex(), clouds = new THREE.Group(); scene.add(clouds);
  const cr = rng(77);
  for (let i = 0; i < 60; i++) {
    const a = cr() * TAU, d = 90 + cr() * 330, under = i < 34;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudMap, transparent: true, opacity: under ? 0.95 : 0.7, depthWrite: false, fog: false, color: under ? 0xe8f0ff : 0xffffff }));
    sp.position.set(Math.cos(a) * d, under ? -45 - cr() * 55 : 20 + cr() * 90, Math.sin(a) * d); sp.scale.set(90 + cr() * 140, 50 + cr() * 60, 1); clouds.add(sp);
  }
  onProgress(0.75); await tick();

  /* ---- island ---- */
  const world = new THREE.Group(); scene.add(world);
  {
    const rings = low ? 48 : 72, segs = low ? 96 : 160, pos = [], uv = [], col = [], idx = [];
    for (let r = 0; r <= rings; r++) for (let s = 0; s <= segs; s++) {
      const rad = IR * 1.015 * (r / rings), a = s / segs * TAU, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      pos.push(x, groundH(x, z), z); uv.push(x / 4.5, z / 4.5);
      const mac = 0.78 + noise2(x * 0.09, z * 0.09, 8) * 0.5, dirt = smooth(IR * 0.86, IR * 0.99, rad);
      col.push(mix(mac, 0.5, dirt), mix(mac, 0.36, dirt), mix(mac, 0.22, dirt));
    }
    for (let r = 0; r < rings; r++) for (let s = 0; s < segs; s++) {
      const a = r * (segs + 1) + s, b = a + segs + 1; idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const top = new THREE.Mesh(g, M.grass); top.receiveShadow = true; world.add(top);
  }
  // underside (lathe) with rock texture
  const profR = t => IR * Math.pow(1 - t, 0.62) * (1 + 0.06 * Math.sin(t * 9));
  const DEVA = 0.6, DEVY = -5.2;
  {
    const pts = [], N = 30;
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push(new THREE.Vector2(Math.max(profR(t), 0.05), -0.9 - t * 17)); }
    const geo = new THREE.LatheGeometry(pts, low ? 64 : 112);
    displace(geo, 1.1, 0.22, 5, v => {
      const t = clamp((-0.9 - v.y) / 17, 0, 1), ad = Math.abs(Math.atan2(v.x, v.z) - DEVA);
      const nearDoor = (1 - smooth(0.2, 0.6, Math.min(ad, TAU - ad))) * (1 - smooth(2, 5, Math.abs(v.y - DEVY)));
      return smooth(0, 0.1, t) * (1 - nearDoor);
    });
    const m = new THREE.Mesh(geo, M.rock); m.castShadow = true; m.receiveShadow = true; world.add(m);
    const rr = rng(21);
    for (let i = 0; i < 22; i++) {            // hanging rocks
      const a = rr() * TAU, t = 0.12 + rr() * 0.5, r = profR(t) * 0.82, h = 2 + rr() * 4.5;
      if (Math.abs(a - DEVA) < 0.6) continue;
      const c = new THREE.Mesh(displace(new THREE.ConeGeometry(0.6 + rr() * 1, h, 9, 5), 0.18, 1.4, i), M.rock);
      c.rotation.x = Math.PI; c.position.set(Math.sin(a) * r, -0.9 - t * 17 - h / 2 + 0.6, Math.cos(a) * r); c.castShadow = true; world.add(c);
    }
  }
  onProgress(0.82); await tick();

  /* ---- colliders ---- */
  const circles = [], boxes = [];
  const { hx, hz, wall: wt, h: HH, doorW, cx: HCX, cz: HCZ } = HUT;
  const addBox = (x0, z0, x1, z1) => boxes.push([x0, z0, x1, z1]);
  addBox(HCX - hx, HCZ - hz, HCX + hx, HCZ - hz + wt);                         // back
  addBox(HCX - hx, HCZ - hz, HCX - hx + wt, HCZ + hz);                         // left
  addBox(HCX + hx - wt, HCZ - hz, HCX + hx, HCZ + hz);                         // right
  addBox(HCX - hx, HCZ + hz - wt, HCX - doorW / 2, HCZ + hz);                  // front L
  addBox(HCX + doorW / 2, HCZ + hz - wt, HCX + hx, HCZ + hz);                  // front R
  const doorBox = [HCX - doorW / 2, HCZ + hz - wt, HCX + doorW / 2, HCZ + hz];

  /* ---- hut ---- */
  const hut = new THREE.Group(); hut.position.set(HCX, 0, HCZ); world.add(hut);
  const plank = (rx, ry) => { const t = rep(TX.planks, rx, ry); return std(t, { roughness: 0.8, bumpScale: 3 }); };
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; hut.add(m); return m; };
  box(2 * hx - 0.1, 0.3, 2 * hz - 0.1, plank(3, 2.5), 0, 0.02, 0);                             // floor
  box(2 * hx - 0.2, 0.05, 2 * hz - 0.2, plank(3, 2.5), 0, 0.16, 0);
  box(2 * hx, HH, wt, plank(3, 1.5), 0, HH / 2, -hz + wt / 2);                                  // back
  box(wt, HH, 2 * hz, plank(2.5, 1.5), -hx + wt / 2, HH / 2, 0);                                // left
  box(wt, HH, 2 * hz, plank(2.5, 1.5), hx - wt / 2, HH / 2, 0);                                 // right
  const seg = hx - doorW / 2;
  box(seg, HH, wt, plank(1.5, 1.5), -(hx - seg / 2), HH / 2, hz - wt / 2);                      // front L
  box(seg, HH, wt, plank(1.5, 1.5), (hx - seg / 2), HH / 2, hz - wt / 2);                       // front R
  box(doorW, HH - 2.4, wt, plank(1, 0.5), 0, 2.4 + (HH - 2.4) / 2, hz - wt / 2);                // lintel
  box(doorW + 0.3, 0.12, 0.45, M.stone, 0, 0.0, hz + 0.1);                                      // threshold
  // roof
  const roofL = (HH * 0 + hz + 0.7) / Math.cos(0.5);
  [-1, 1].forEach(s => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(2 * hx + 1, 0.22, roofL), M.roof);
    r.position.set(0, HH + 0.65, s * (hz + 0.7) / 2 * 0.98); r.rotation.x = s * 0.5; r.castShadow = r.receiveShadow = true; hut.add(r);
  });
  [-1, 1].forEach(s => {                                                                         // gables
    const sh = new THREE.Shape(); sh.moveTo(-hz, 0); sh.lineTo(hz, 0); sh.lineTo(0, 1.4); sh.closePath();
    const g = new THREE.Mesh(new THREE.ShapeGeometry(sh), plank(2, 1)); g.rotation.y = s * Math.PI / 2; g.position.set(s * (hx - 0.02), HH, 0); g.castShadow = true; hut.add(g);
  });
  // door
  const doorPivot = new THREE.Group(); doorPivot.position.set(-doorW / 2, 0, hz - wt / 2); hut.add(doorPivot);
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, 2.4, 0.14), plank(1, 1.2)); door.position.set(doorW / 2, 1.2, 0); door.castShadow = true; doorPivot.add(door);
  const lockG = new THREE.Group(); lockG.position.set(doorW * 0.8, 1.15, 0.12); doorPivot.add(lockG);
  lockG.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.08), M.gold));
  const sh = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 16, Math.PI), M.gold); sh.position.y = 0.1; lockG.add(sh);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.1, 0.17), M.dark); b.position.set(doorW / 2, 0.5 + i * 0.7, 0); doorPivot.add(b); }
  // interior
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.95, 20), M.stone); ped.position.set(PED.x - HCX, 0.65, PED.z - HCZ); ped.castShadow = ped.receiveShadow = true; hut.add(ped);
  const lamp = new THREE.PointLight(0xffc27a, 5, 11, 1.6); lamp.position.set(0, 2.5, 0); hut.add(lamp);
  const lampMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); lampMesh.position.set(0, 2.55, 0); hut.add(lampMesh);
  box(0.9, 0.9, 0.9, plank(1, 1), -2.2, 0.6, -1.9); box(0.7, 0.7, 0.7, plank(1, 1), -1.5, 0.5, -2.2); box(0.8, 0.8, 0.8, plank(1, 1), 2.2, 0.55, -1.8);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.2), std(rep(TX.shirt, 2, 2), { alphaTest: 0, roughness: 1, bumpScale: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.2, 0.4); rug.receiveShadow = true; hut.add(rug);
  // trophy + key + rock pickups
  const trophy = new THREE.Group();
  {
    const prof = [[0.001, 0], [0.26, 0], [0.28, 0.05], [0.13, 0.12], [0.08, 0.3], [0.1, 0.42], [0.34, 0.58], [0.4, 0.95], [0.36, 0.96], [0.29, 0.64], [0.001, 0.56]].map(p => new THREE.Vector2(p[0], p[1]));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 36), M.gold); cup.castShadow = true; trophy.add(cup);
    [-1, 1].forEach(s => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 20, Math.PI), M.gold); h.position.set(s * 0.4, 0.72, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; trophy.add(h); });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.1, 20), M.dark); base.position.y = -0.05; trophy.add(base);
    trophy.scale.setScalar(0.85); trophy.position.set(PED.x, 1.2, PED.z); trophy.visible = false; world.add(trophy);
  }
  const trophyLight = new THREE.PointLight(0xffd36a, 0, 7, 1.6); trophyLight.position.set(PED.x, 2, PED.z + 0.3); world.add(trophyLight);

  const keyG = new THREE.Group();
  {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 20), M.gold); ring.position.y = 0.3; keyG.add(ring);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 10), M.gold); keyG.add(shaft);
    [0.05, -0.04, -0.13].forEach((y, i) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.13 - i * 0.02, 0.05, 0.04), M.gold); t.position.set(0.07, y - 0.0, 0); keyG.add(t); });
    keyG.position.set(0, 0.6, 0); keyG.scale.setScalar(1.15); keyG.visible = false; shadowize(keyG); world.add(keyG);
  }
  const keyLight = new THREE.PointLight(0xffd25a, 0, 6, 1.7); world.add(keyLight);
  const rockMeshes = [], rockLights = [];
  function newRockMesh() {
    const m = new THREE.Mesh(displace(new THREE.SphereGeometry(0.42, 20, 14), 0.1, 3, 7), std(rep(TX.rock, 1.5, 1), { emissive: 0xff4a10, emissiveIntensity: 0.4, bumpScale: 4 }));
    m.scale.set(1, 0.8, 1.1); m.castShadow = true; world.add(m); const l = new THREE.PointLight(0xff6a2a, 2.2, 5, 1.8); world.add(l); rockLights.push(l); return m;
  }

  onProgress(0.88); await tick();

  /* ---- trees, rocks, bushes, grass ---- */
  const tr = rng(1234);
  const leafGeoBlob = (r, seed) => displace(new THREE.SphereGeometry(r, 18, 12), r * 0.2, 0.9 / r * 1.5, seed);
  function treeTemplate(seed, leafMat) {
    const g = new THREE.Group(), r = rng(seed);
    const th = 4 + r() * 1.5, tg = new THREE.CylinderGeometry(0.22, 0.42, th, 12, 8); tg.translate(0, th / 2, 0);
    const p = tg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 0.9 + seed) * 0.16); p.setZ(i, p.getZ(i) + Math.cos(y * 0.7 + seed) * 0.12); }
    tg.computeVertexNormals(); g.add(new THREE.Mesh(tg, M.bark));
    const n = 5; for (let i = 0; i < n; i++) {
      const rr = 1.3 + r() * 1.1, b = new THREE.Mesh(leafGeoBlob(rr, seed + i), leafMat);
      b.position.set((r() - 0.5) * 2.4, th - 0.2 + r() * 2.1, (r() - 0.5) * 2.4); b.scale.y = 0.85; g.add(b);
    }
    shadowize(g); return g;
  }
  const tpls = [treeTemplate(3, M.leaf[0]), treeTemplate(8, M.leaf[1]), treeTemplate(13, M.leaf[2]), treeTemplate(19, M.leaf[0])];
  const okSpot = (x, z, r) =>
    Math.hypot(x - HCX, z - HCZ) > 7 + r && Math.hypot(x, z - 9) > 3 + r && Math.hypot(x + 9, z - 3) > 2.5 + r && Math.hypot(x - TREE.x, z - TREE.z) > 4 + r &&
    !(Math.abs(x) < 2.2 + r && z > -9 && z < 10) && circles.every(c => Math.hypot(c.x - x, c.z - z) > c.r + r + 0.6);
  for (let i = 0, tries = 0; i < 24 && tries < 400; tries++) {
    const a = tr() * TAU, d = 4 + tr() * (IR * 0.82 - 4), x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.85 + tr() * 0.7;
    if (!okSpot(x, z, 0.6 * s)) continue;
    const t = tpls[i % tpls.length].clone(); t.position.set(x, groundH(x, z) - 0.05, z); t.scale.setScalar(s); t.rotation.y = tr() * TAU; world.add(t);
    circles.push({ x, z, r: 0.5 * s }); i++;
  }
  {                                                                                              // the old tree
    const t = tpls[0].clone(); t.position.set(TREE.x, groundH(TREE.x, TREE.z) - 0.1, TREE.z); t.scale.setScalar(2.2); t.rotation.y = 1; world.add(t);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU, root = new THREE.Mesh(displace(new THREE.ConeGeometry(0.3, 2.4, 8, 5), 0.1, 2, i), M.bark);
      root.position.set(TREE.x + Math.cos(a) * 1.0, groundH(TREE.x, TREE.z) + 0.1, TREE.z + Math.sin(a) * 1.0);
      root.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); root.castShadow = true; world.add(root);
    }
    circles.push({ x: TREE.x, z: TREE.z, r: TREE.r });
  }
  for (let i = 0, tries = 0; i < 16 && tries < 300; tries++) {                                   // boulders
    const a = tr() * TAU, d = 3 + tr() * (IR * 0.85 - 3), x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.5 + tr() * 1.0;
    if (!okSpot(x, z, s)) continue;
    const m = new THREE.Mesh(displace(new THREE.SphereGeometry(1, 20, 14), 0.28, 1.6, 40 + i), M.rockProp);
    m.scale.set(s * (1 + tr() * 0.4), s * (0.55 + tr() * 0.3), s * (1 + tr() * 0.4)); m.position.set(x, groundH(x, z) + s * 0.15, z); m.rotation.y = tr() * TAU; m.castShadow = m.receiveShadow = true; world.add(m);
    circles.push({ x, z, r: s * 0.95 }); i++;
  }
  for (let i = 0, tries = 0; i < 12 && tries < 200; tries++) {                                   // bushes
    const a = tr() * TAU, d = 3 + tr() * (IR * 0.85 - 3), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!okSpot(x, z, 0.8)) continue;
    const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(leafGeoBlob(0.45 + tr() * 0.3, 90 + k + i), M.leaf[i % 3]); b.position.set((tr() - 0.5) * 0.8, 0.35 + tr() * 0.2, (tr() - 0.5) * 0.8); g.add(b); }
    shadowize(g); g.position.set(x, groundH(x, z), z); world.add(g); circles.push({ x, z, r: 0.7 }); i++;
  }
  for (let i = 0; i < 12; i++) {                                                                 // stepping stones: spawn -> hut
    const z = 7.2 - i * 1.25, x = Math.sin(i * 1.7) * 0.35, m = new THREE.Mesh(displace(new THREE.CylinderGeometry(0.5, 0.55, 0.14, 12, 1), 0.05, 3, 60 + i), M.stone);
    m.position.set(x, groundH(x, z) + 0.03, z); m.rotation.y = i; m.receiveShadow = true; world.add(m);
  }
  {                                                                                              // grass + flowers (instanced)
    const gt = grassBladeTex();
    const gm = new THREE.MeshStandardMaterial({ map: gt, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    const U = { time: { value: 0 } };
    gm.onBeforeCompile = s => {
      s.uniforms.uTime = U.time;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat wv=sin(uTime*1.8+instanceMatrix[3].x*0.6+instanceMatrix[3].z*0.45)*0.10*position.y;\ntransformed.x+=wv;transformed.z+=wv*0.6;');
    };
    const gg = new THREE.PlaneGeometry(0.55, 0.5); gg.translate(0, 0.25, 0);
    const gg2 = gg.clone(); gg2.rotateY(Math.PI / 2);
    const merged = new THREE.BufferGeometry();
    const pa = [...gg.attributes.position.array, ...gg2.attributes.position.array], ua = [...gg.attributes.uv.array, ...gg2.attributes.uv.array], na = [...gg.attributes.normal.array, ...gg2.attributes.normal.array];
    merged.setAttribute('position', new THREE.Float32BufferAttribute(pa, 3)); merged.setAttribute('uv', new THREE.Float32BufferAttribute(ua, 2)); merged.setAttribute('normal', new THREE.Float32BufferAttribute(na, 3));
    merged.setIndex([...gg.index.array, ...Array.from(gg2.index.array, v => v + 4)]);
    const N = low ? 2200 : 5200, gi = new THREE.InstancedMesh(merged, gm, N), d = new THREE.Object3D(), col = new THREE.Color(); let n = 0;
    for (let k = 0; k < N * 2 && n < N; k++) {
      const a = tr() * TAU, rr = Math.sqrt(tr()) * IR * 0.93, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (Math.abs(x - HCX) < hx + 0.3 && Math.abs(z - HCZ) < hz + 0.3) continue;
      if (Math.abs(x) < 0.7 && z > -7 && z < 8) continue;
      d.position.set(x, groundH(x, z) - 0.02, z); d.rotation.set(0, tr() * TAU, 0); const s = 0.7 + tr() * 1.1; d.scale.set(s, s * (0.8 + tr() * 0.9), s); d.updateMatrix();
      gi.setMatrixAt(n, d.matrix); col.setHSL(0.24 + tr() * 0.06, 0.55, 0.42 + tr() * 0.2); gi.setColorAt(n, col); n++;
    }
    gi.count = n; gi.receiveShadow = false; world.add(gi);
    const fm = new THREE.MeshStandardMaterial({ map: flowerTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    const fg = new THREE.PlaneGeometry(0.35, 0.7); fg.translate(0, 0.35, 0);
    const fi = new THREE.InstancedMesh(fg, fm, 160), pastel = [0xffffff, 0xffb3c7, 0xffe27a, 0xb9a6ff, 0xff8f6b];
    for (let k = 0; k < 160; k++) {
      const a = tr() * TAU, rr = Math.sqrt(tr()) * IR * 0.88, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      d.position.set(x, groundH(x, z) - 0.02, z); d.rotation.set(0, tr() * TAU, 0); d.scale.setScalar(0.7 + tr() * 0.6); d.updateMatrix(); fi.setMatrixAt(k, d.matrix); fi.setColorAt(k, col.setHex(pastel[k % 5]));
    }
    world.add(fi);
    world.userData.grassTime = U.time;
  }

  /* ---- zombie ---- */
  function buildZombie() {
    const root = new THREE.Group(), mk = (geo, mat, p) => { const m = new THREE.Mesh(geo, mat); if (p) m.position.set(...p); m.castShadow = true; return m; };
    const hips = new THREE.Group(); hips.position.y = 0.98; root.add(hips);
    const pelvis = mk(new THREE.CapsuleGeometry(0.17, 0.2, 6, 14), M.pants); pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(1, 1, 0.78); hips.add(pelvis);
    const torso = new THREE.Group(); torso.position.y = 0.08; hips.add(torso);
    const chest = mk(new THREE.CapsuleGeometry(0.205, 0.2, 8, 16), M.skin, [0, 0.3, 0]); chest.scale.z = 0.72; torso.add(chest);
    const shirt = mk(new THREE.CapsuleGeometry(0.225, 0.2, 8, 16), M.shirt, [0, 0.3, 0]); shirt.scale.z = 0.76; torso.add(shirt);
    const ribs = mk(new THREE.BoxGeometry(0.26, 0.12, 0.05), M.bone, [0.02, 0.28, 0.16]); ribs.visible = false; torso.add(ribs);
    const neck = mk(new THREE.CylinderGeometry(0.06, 0.075, 0.12, 10), M.skin, [0, 0.66, 0]); torso.add(neck);
    const head = new THREE.Group(); head.position.set(0, 0.8, 0.02); torso.add(head);
    const skull = mk(new THREE.SphereGeometry(0.165, 28, 20), M.skin); skull.scale.set(0.92, 1.08, 1.02); head.add(skull);
    [-1, 1].forEach(s => {
      head.add(mk(new THREE.SphereGeometry(0.048, 14, 10), M.dark, [s * 0.062, 0.035, 0.13]));
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.021, 10, 8), M.eye); e.position.set(s * 0.062, 0.032, 0.168); head.add(e);
      head.add(mk(new THREE.SphereGeometry(0.035, 10, 8), M.skin, [s * 0.165, -0.01, 0]));
    });
    head.add(mk(new THREE.ConeGeometry(0.03, 0.07, 6), M.skin, [0, -0.02, 0.17])).rotation.x = Math.PI / 2 * 0.9;
    head.add(mk(new THREE.SphereGeometry(0.1, 14, 10), M.mouth, [0, -0.085, 0.08]));
    const jaw = new THREE.Group(); jaw.position.set(0, -0.075, 0.02); head.add(jaw);
    const jm = mk(new THREE.SphereGeometry(0.1, 16, 10), M.skin, [0, -0.04, 0.06]); jm.scale.set(0.95, 0.5, 1); jaw.add(jm);
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * 0.026;
      const up = mk(new THREE.BoxGeometry(0.018, 0.026 + (i % 2) * 0.01, 0.014), M.bone, [x, -0.058, 0.138 - Math.abs(i - 2.5) * 0.012]); head.add(up);
      jaw.add(mk(new THREE.BoxGeometry(0.016, 0.02 + (i % 3) * 0.008, 0.012), M.bone, [x, -0.01, 0.13 - Math.abs(i - 2.5) * 0.013]));
    }
    for (let i = 0; i < 6; i++) { const a = mk(new THREE.SphereGeometry(0.04 + (i % 3) * 0.01, 8, 6), M.hair, [Math.sin(i * 2.1) * 0.1, 0.12 + (i % 2) * 0.02, -0.06 - (i % 3) * 0.03]); a.scale.y = 0.45; head.add(a); }
    const wound = mk(new THREE.SphereGeometry(0.05, 12, 8), M.blood, [0.1, 0.1, 0.1]); wound.scale.z = 0.35; head.add(wound);
    const patch = mk(new THREE.SphereGeometry(0.045, 12, 8), M.bone, [-0.09, 0.12, 0.08]); patch.scale.z = 0.3; head.add(patch);

    const arms = [], legs = [];
    [-1, 1].forEach(s => {
      const sh = new THREE.Group(); sh.position.set(s * 0.285, 0.54, 0); torso.add(sh);
      sh.add(mk(new THREE.SphereGeometry(0.075, 12, 10), M.skin));
      sh.add(mk(new THREE.CapsuleGeometry(0.062, 0.2, 6, 12), M.skin, [0, -0.2, 0]));
      sh.add(mk(new THREE.CapsuleGeometry(0.078, 0.12, 6, 12), M.shirt, [0, -0.16, 0]));
      const el = new THREE.Group(); el.position.y = -0.36; sh.add(el);
      el.add(mk(new THREE.CapsuleGeometry(0.052, 0.2, 6, 12), M.skin, [0, -0.17, 0]));
      const hand = new THREE.Group(); hand.position.y = -0.38; el.add(hand);
      hand.add(mk(new THREE.BoxGeometry(0.085, 0.09, 0.035), M.skin, [0, -0.04, 0]));
      for (let f = 0; f < 4; f++) { const fg = mk(new THREE.CapsuleGeometry(0.011, 0.07, 3, 6), M.skin, [(f - 1.5) * 0.02, -0.12, 0.0]); fg.rotation.x = -0.45 - (f % 2) * 0.2; hand.add(fg); }
      arms.push({ sh, el, s });
      const hp = new THREE.Group(); hp.position.set(s * 0.105, 0, 0); hips.add(hp);
      hp.add(mk(new THREE.CapsuleGeometry(0.088, 0.3, 6, 12), M.pants, [0, -0.25, 0]));
      const kn = new THREE.Group(); kn.position.y = -0.5; hp.add(kn);
      kn.add(mk(new THREE.CapsuleGeometry(0.068, 0.3, 6, 12), M.skin, [0, -0.22, 0]));
      kn.add(mk(new THREE.CapsuleGeometry(0.078, 0.13, 6, 12), M.pants, [0, -0.1, 0]));
      kn.add(mk(new THREE.BoxGeometry(0.105, 0.075, 0.27), M.shoe, [0, -0.47, 0.055]));
      legs.push({ hp, kn, s });
    });
    const rootG = new THREE.Group(); rootG.add(root);
    return { group: rootG, root, hips, torso, head, jaw, arms, legs, skin: M.skin };
  }
  const Zb = buildZombie(); world.add(Zb.group); Zb.group.position.set(-9, 0, 3);
  let zGLB = null;
  try {
    const r = await fetch('assets/zombie.glb', { method: 'HEAD' });
    if (r.ok) {
      const gltf = await new GLTFLoader().loadAsync('assets/zombie.glb'), m = gltf.scene, b = new THREE.Box3().setFromObject(m), s = 1.8 / (b.max.y - b.min.y);
      m.scale.setScalar(s); m.position.y = -b.min.y * s; shadowize(m); const g = new THREE.Group(); g.add(m);
      let mixer = null; if (gltf.animations.length) { mixer = new THREE.AnimationMixer(m); mixer.clipAction(gltf.animations[0]).play(); }
      zGLB = { g, mixer }; Zb.root.visible = false; Zb.group.add(g);
    }
  } catch (e) { /* no custom model, procedural zombie it is */ }
  onProgress(0.95); await tick();

  /* ---- first-person sword ---- */
  const sword = new THREE.Group();
  {
    const bs = new THREE.Shape(); bs.moveTo(-0.032, 0); bs.lineTo(0.032, 0); bs.lineTo(0.03, 0.78); bs.lineTo(0, 0.93); bs.lineTo(-0.03, 0.78); bs.closePath();
    const bg = new THREE.ExtrudeGeometry(bs, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 }); bg.translate(0, 0, -0.007);
    const blade = new THREE.Mesh(bg, M.steel); blade.position.y = 0.02; sword.add(blade);
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.6, 0.018), new THREE.MeshStandardMaterial({ color: 0x8a95a3, metalness: 1, roughness: 0.4 })); groove.position.y = 0.4; sword.add(groove);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.055), M.gold); guard.position.y = 0.01; sword.add(guard);
    const hnd = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.021, 0.2, 12), M.leather); hnd.position.y = -0.1; sword.add(hnd);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), M.gold); pom.position.y = -0.21; sword.add(pom);
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), M.skin); fist.position.set(0, -0.1, 0.0); fist.scale.set(1.1, 1, 1.15); sword.add(fist);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.5, 6, 12), M.skin); fore.position.set(0.0, -0.32, 0.18); fore.rotation.x = 0.7; sword.add(fore);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.3, 6, 12), M.shirt); sleeve.position.set(0.0, -0.5, 0.34); sleeve.rotation.x = 0.7; sword.add(sleeve);
    camera.add(sword);
  }
  const swordBase = new THREE.Vector3(0.4, -0.5, -0.72);
  sword.scale.setScalar(0.85);

  /* ---- meteor / weather / particles ---- */
  const meteor = new THREE.Group(); {
    const m = new THREE.Mesh(displace(new THREE.SphereGeometry(1.2, 24, 16), 0.3, 1.3, 33), std(rep(TX.rock, 2, 2), { emissive: 0xff5a14, emissiveIntensity: 1.6, bumpScale: 5 }));
    meteor.add(m); const l = new THREE.PointLight(0xff7a30, 60, 60, 1.6); meteor.add(l);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softCanvas(128, [[0, 'rgba(255,230,160,1)'], [0.4, 'rgba(255,120,40,.6)'], [1, 'rgba(255,60,0,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(9); meteor.add(glow); meteor.visible = false; scene.add(meteor);
  }
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color: 0xff3b1f, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
  const markerFill = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xff2a10, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
  marker.rotation.x = markerFill.rotation.x = -Math.PI / 2; marker.visible = markerFill.visible = false; scene.add(marker, markerFill);
  const craterTex = (() => { const c = cnv(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(10,6,4,.95)'); g.addColorStop(0.6, 'rgba(25,15,8,.8)'); g.addColorStop(1, 'rgba(25,15,8,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffd7a0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })); shock.rotation.x = -Math.PI / 2; scene.add(shock);
  const impactLight = new THREE.PointLight(0xff9a40, 0, 40, 1.5); scene.add(impactLight);
  let shockT = -1, impactPos = new THREE.Vector3(), shake = 0;

  const rainN = low ? 700 : 1500, rainPos = new Float32Array(rainN * 6), rainGeo = new THREE.BufferGeometry();
  const rainSeed = Array.from({ length: rainN }, () => [Math.random() * 44 - 22, Math.random() * 30, Math.random() * 44 - 22]);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.45, fog: true })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);

  const PN = 900, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.16, map: softCanvas(64, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  points.frustumCulled = false; scene.add(points);
  const parts = []; const tmpC = new THREE.Color();
  function burst(x, y, z, color, n, spd = 4, grav = 5, life = 1.4) {
    tmpC.set(color);
    for (let i = 0; i < n && parts.length < PN; i++) {
      const a = Math.random() * TAU, b = Math.acos(2 * Math.random() - 1), s = spd * (0.25 + Math.random() * 0.75);
      parts.push({ x, y, z, vx: Math.sin(b) * Math.cos(a) * s, vy: Math.cos(b) * s + 1, vz: Math.sin(b) * Math.sin(a) * s, life: life * (0.5 + Math.random() * 0.7), max: life, g: grav, c: i % 3 ? tmpC.clone() : new THREE.Color(1, 1, 1) });
    }
  }
  function updParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= p.g * dt; p.vx *= 0.99; p.vz *= 0.99; }
    for (let i = 0; i < PN; i++) {
      const p = parts[i];
      if (p) { const k = clamp(p.life / (p.max * 0.5), 0, 1); pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z; pCol[i * 3] = p.c.r * k; pCol[i * 3 + 1] = p.c.g * k; pCol[i * 3 + 2] = p.c.b * k; }
      else { pPos[i * 3 + 1] = -9999; pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; }
    }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
  }

  /* ---- underside secret door ---- */
  const devPos = new THREE.Vector3(Math.sin(DEVA) * (profR(((-DEVY - 0.9) / 17)) ), DEVY, Math.cos(DEVA) * profR(((-DEVY - 0.9) / 17)));
  const devG = new THREE.Group(); devG.position.copy(devPos); devG.rotation.y = DEVA; world.add(devG);
  const devDoor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.3, 0.2), plank(1, 1.2)); devDoor.position.set(0, 0, 0.55); devG.add(devDoor);
  {
    const fm = M.stone, mk = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fm); m.position.set(x, y, z); m.castShadow = true; devG.add(m); };
    mk(0.3, 2.7, 1.4, -1.0, 0, 0.1); mk(0.3, 2.7, 1.4, 1.0, 0, 0.1); mk(2.3, 0.3, 1.4, 0, 1.4, 0.1); mk(2.5, 0.35, 1.8, 0, -1.55, 0.2);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd48a })); gl.position.set(0, -1.18, 0.66); devG.add(gl);
    const pl = new THREE.PointLight(0xffb866, 8, 18, 1.6); pl.position.set(0, 0.2, 2.2); devG.add(pl);
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), M.gold); star.position.set(0.5, 0, 0.7); devG.add(star);
  }
  const ray = new THREE.Raycaster();
  const lookPos = new THREE.Vector3(devPos.x + Math.sin(DEVA) * 9.5 + 3, DEVY - 0.5, devPos.z + Math.cos(DEVA) * 9.5 - 1);

  onProgress(1);

  /* ---------------------------------------------------------------- sync */
  const clock = { t: 0, bob: 0, look: 0, prevFall: false };
  const camTarget = new THREE.Vector3();
  const sw = { x: 0, y: 0 };

  function applyZombie(dt, z) {
    const g = Zb.group;
    g.position.set(z.x, groundH(z.x, z.z), z.z); g.rotation.y = z.yaw;
    const dead = !z.alive;
    if (zGLB) {
      if (zGLB.mixer && !dead) zGLB.mixer.update(dt);
      zGLB.g.rotation.x = dead ? -Math.min(1, z.deadT / 0.7) * Math.PI / 2 : 0; zGLB.g.position.y = dead ? Math.min(0, -(z.deadT - 4) * 0.5) : 0;
      return;
    }
    const R = Zb.root, ph = z.phase;
    const mv = clamp(z.speed / 2.2, 0, 1.3);
    skinFlash(z.hurt);
    if (dead) {
      const f = Math.min(1, z.deadT / 0.7); R.rotation.x = -f * Math.PI / 2 * 0.97; R.position.y = f * 0.12 + Math.min(0, -(z.deadT - 4) * 0.6) + 0.0;
      Zb.arms.forEach(a => { a.sh.rotation.x = mix(a.sh.rotation.x, -0.3, 0.1); a.el.rotation.x = mix(a.el.rotation.x, -0.2, 0.1); });
      Zb.legs.forEach(l => { l.hp.rotation.x = mix(l.hp.rotation.x, 0, 0.1); l.kn.rotation.x = mix(l.kn.rotation.x, 0.1, 0.1); });
      Zb.jaw.rotation.x = 0.5; return;
    }
    R.rotation.x = 0; R.position.y = 0;
    Zb.hips.position.y = 0.98 + Math.abs(Math.sin(ph)) * 0.035 * mv;
    Zb.hips.rotation.y = Math.sin(ph) * 0.18 * mv; Zb.hips.rotation.z = Math.sin(ph) * 0.05 * mv;
    Zb.torso.rotation.x = 0.16 + Math.sin(ph * 2) * 0.03 * mv + (z.hostile ? 0.12 : 0); Zb.torso.rotation.y = -Math.sin(ph) * 0.2 * mv; Zb.torso.rotation.z = Math.sin(ph * 0.5 + 1) * 0.05;
    Zb.head.rotation.z = 0.22 + Math.sin(clock.t * 1.3) * 0.08; Zb.head.rotation.x = 0.08 + Math.sin(clock.t * 0.9) * 0.05; Zb.head.rotation.y = Math.sin(clock.t * 0.6) * 0.25;
    Zb.jaw.rotation.x = 0.12 + (z.hostile ? 0.25 + Math.sin(clock.t * 14) * 0.12 : Math.sin(clock.t * 2) * 0.06);
    Zb.legs.forEach((l, i) => {
      const p = ph + (i ? Math.PI : 0), sw = Math.sin(p);
      l.hp.rotation.x = -sw * 0.55 * mv; l.kn.rotation.x = (Math.max(0, Math.sin(p + 1.6)) * 0.9) * mv + 0.05;
    });
    const at = z.swing;                                   // 0..1 attack swing
    Zb.arms.forEach((a, i) => {
      const w = Math.sin(ph + (i ? 0.7 : 0)) * 0.08 * mv + Math.sin(clock.t * 1.7 + i) * 0.05;
      a.sh.rotation.x = -1.35 + w - (z.hostile ? 0.2 : 0) + Math.sin(at * Math.PI) * 1.0 * (at > 0 ? 1 : 0);
      a.sh.rotation.z = a.s * (0.12 + (z.hostile ? 0.05 : 0)); a.sh.rotation.y = -a.s * 0.1;
      a.el.rotation.x = -0.35 - Math.sin(clock.t * 2.1 + i * 2) * 0.1 - Math.sin(at * Math.PI) * 0.4;
    });
  }
  const skinCol = new THREE.Color(0xff1a00);
  function skinFlash(h) { M.skin.emissive.copy(skinCol); M.skin.emissiveIntensity = h > 0 ? Math.min(1, h * 5) : 0; }

  const W = {
    renderer, scene, camera, circles, boxes, doorBox, groundH, devPos,
    resize() { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1.6 : 2)); renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); },
    burst,
    burstAtCamera(color, n) {
      const f = new THREE.Vector3(); camera.getWorldDirection(f); const p = camera.position.clone().addScaledVector(f, 1.8);
      burst(p.x, p.y - 0.2, p.z, color, n, 3.2, 1.5, 1.8);
    },
    onImpact(x, z) {
      const y = groundH(x, z); impactPos.set(x, y, z); shockT = 0; shake = 1; burst(x, y + 0.5, z, 0xffa040, 90, 11, 9, 1.8); burst(x, y + 0.5, z, 0x886644, 40, 7, 9, 2.2);
      const c = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ map: craterTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      c.rotation.x = -Math.PI / 2; c.position.set(x, y + 0.03, z); world.add(c);
    },
    addShake(a) { shake = Math.max(shake, a); },
    pickDev(cx, cy) {
      ray.setFromCamera(new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1), camera);
      return ray.intersectObjects(devG.children, true).length > 0;
    },
    sync(dtReal, dt, s) {
      clock.t += dt; world.userData.grassTime.value += dtReal;
      clouds.rotation.y += dtReal * 0.004;
      // weather -> lighting
      const ecl = s.eclipse || 0, rn = s.rain || 0, dim = 1 - ecl * 0.82 - rn * 0.38;
      sun.intensity = 2.6 * (1 - ecl * 0.95) * (1 - rn * 0.6); hemi.intensity = 0.75 * (1 - ecl * 0.7) * (1 - rn * 0.3);
      skyMat.uniforms.dim.value = Math.max(0.1, dim);
      scene.fog.color.setRGB(0.81 * dim, 0.91 * dim, 1 * dim); scene.fog.near = 70 - rn * 55; scene.fog.far = 420 - rn * 250;
      moon.material.opacity = ecl > 0.02 ? 1 : 0; corona.material.opacity = Math.min(1, ecl * 1.6);
      // rain streaks
      rain.visible = rn > 0.02; rain.material.opacity = 0.45 * rn;
      if (rain.visible) {
        for (let i = 0; i < rainN; i++) {
          const r = rainSeed[i]; r[1] -= 26 * dt; if (r[1] < 0) { r[1] += 30; }
          const x = camera.position.x + r[0], y = camera.position.y - 6 + r[1], z = camera.position.z + r[2];
          rainPos[i * 6] = x; rainPos[i * 6 + 1] = y; rainPos[i * 6 + 2] = z; rainPos[i * 6 + 3] = x - 0.04; rainPos[i * 6 + 4] = y + 0.55; rainPos[i * 6 + 5] = z - 0.02;
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      // hut pieces
      doorPivot.rotation.y = mix(doorPivot.rotation.y, s.door ? -1.8 : 0, 1 - Math.pow(0.002, dtReal));
      lockG.visible = !s.door;
      trophy.visible = !!s.trophyOn; trophy.rotation.y += dt * 1.2; trophy.position.y = 1.2 + Math.sin(clock.t * 2) * 0.03; trophyLight.intensity = s.trophyOn ? 2.4 : 0;
      // key
      if (s.keyPos) {
        keyG.visible = true; keyG.position.set(s.keyPos.x, groundH(s.keyPos.x, s.keyPos.z) + 0.75 + Math.sin(clock.t * 3) * 0.1, s.keyPos.z); keyG.rotation.y += dt * 2;
        keyLight.intensity = 4; keyLight.position.set(s.keyPos.x, keyG.position.y + 0.5, s.keyPos.z);
      } else { keyG.visible = false; keyLight.intensity = 0; }
      // rocks
      while (rockMeshes.length < s.rocks.length) rockMeshes.push(newRockMesh());
      rockMeshes.forEach((m, i) => {
        const r = s.rocks[i]; m.visible = !!r; rockLights[i].intensity = r ? 2.2 : 0;
        if (r) { m.position.set(r.x, groundH(r.x, r.z) + 0.3, r.z); rockLights[i].position.set(r.x, m.position.y + 0.6, r.z); }
      });
      // meteor event
      const ev = s.ev;
      if (ev && ev.type === 'meteor') {
        const y = groundH(ev.tx, ev.tz);
        if (ev.t < 4) {
          const k = ev.t / 4, pulse = 0.55 + 0.45 * Math.abs(Math.sin(ev.t * 7));
          marker.visible = markerFill.visible = true; const sc = 0.8 + 2.6 * k;
          marker.scale.setScalar(sc); markerFill.scale.setScalar(sc * 0.96); marker.position.set(ev.tx, y + 0.06, ev.tz); markerFill.position.copy(marker.position);
          marker.material.opacity = pulse; markerFill.material.opacity = 0.12 + 0.2 * pulse;
          if (ev.t > 2.2) {
            const f = (ev.t - 2.2) / 1.8, e = f * f; meteor.visible = true;
            meteor.position.set(ev.tx + 55 * (1 - e), y + 1.2 + 120 * (1 - e), ev.tz - 25 * (1 - e)); meteor.rotation.y += dt * 3;
            if (Math.random() < 0.9) burst(meteor.position.x, meteor.position.y, meteor.position.z, 0xff8a30, 3, 1.2, 0, 0.8);
          }
        } else { marker.visible = markerFill.visible = false; meteor.visible = false; }
      } else { marker.visible = markerFill.visible = false; meteor.visible = false; }
      if (shockT >= 0) {
        shockT += dtReal; const f = shockT / 1.1; shock.visible = f < 1; shock.position.copy(impactPos).y += 0.1; shock.scale.setScalar(1 + f * 22); shock.material.opacity = 0.7 * (1 - f);
        impactLight.position.copy(impactPos).y += 3; impactLight.intensity = 200 * Math.max(0, 1 - shockT * 2.2); if (f >= 1) shockT = -1;
      } else impactLight.intensity = 0;
      // zombie
      applyZombie(dt, s.zombie);
      // camera
      const target = s.look ? 1 : 0; clock.look = mix(clock.look, target, 1 - Math.pow(0.0005, dtReal));
      shake = Math.max(0, shake - dtReal * 1.6);
      const gh = groundH(s.x, s.z), moving = s.speed > 0.2 && s.onGround;
      clock.bob += dt * s.speed * 2.1 * (moving ? 1 : 0);
      const bobY = moving ? Math.sin(clock.bob * 2) * 0.045 : 0, bobX = moving ? Math.cos(clock.bob) * 0.03 : 0;
      const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
      camTarget.set(s.x + (shake ? (Math.random() - 0.5) * shake * 0.3 : 0), gh + 1.68 + s.h + bobY, s.z + (shake ? (Math.random() - 0.5) * shake * 0.3 : 0));
      camera.position.copy(camTarget);
      camera.rotation.set(s.pitch + (s.fall ? Math.sin(s.fall * 3) * 0.25 : 0), s.yaw, s.fall ? Math.sin(s.fall * 2.1) * 0.5 : bobX * 0.2);
      if (clock.look > 0.003) {
        const k = clock.look, e = k * k * (3 - 2 * k);
        camera.position.lerp(lookPos, e); camera.position.x += Math.sin(clock.t * 0.4) * 0.3 * e;
        const q0 = camera.quaternion.clone(); camera.lookAt(devPos.x, devPos.y + 0.2, devPos.z); const q1 = camera.quaternion.clone();
        camera.quaternion.copy(q0).slerp(q1, e);
      }
      sky.position.copy(camera.position); moon.position.copy(sunDir).multiplyScalar(540).add(camera.position); moon.lookAt(camera.position);
      corona.position.copy(sunDir).multiplyScalar(535).add(camera.position);
      // sword
      sword.visible = !!s.hasSword && clock.look < 0.15;
      if (sword.visible) {
        let p = 0; if (s.swing > 0) p = s.swing;           // 0..1
        const idleX = bobX * 1.5, idleY = bobY * 1.2 + Math.sin(clock.t * 1.5) * 0.004;
        const sa = Math.sin(p * Math.PI);
        sword.position.set(swordBase.x + idleX - p * 0.62, swordBase.y + idleY - sa * 0.1, swordBase.z - sa * 0.28);
        sword.rotation.set(-0.78 - sa * 0.7, -0.2 + p * 0.5, -0.42 + p * 1.8);
      }
      updParts(dtReal);
      renderer.render(scene, camera);
    }
  };
  W.PED = PED; W.fx = () => 0;
  return W;
}

import * as THREE from "three";

/**
 * Analytic terrain for the Ocean Shallows bay.
 *
 * The shoreline is a large circle whose centre sits off the top-left corner of
 * the frame, so the beach reads as a gentle curve hugging that corner. Land is
 * inside the circle, water outside it; depth grows with the distance offshore.
 */

export const WORLD_EXTENT = 200; // baked height texture covers [-100, 100]
export const TERRAIN_RES = 512;

export const SHORE_CENTER = new THREE.Vector2(-40, -28);
export const SHORE_RADIUS = 26;

export const PALM_POSITION = new THREE.Vector3(-23.4, 0, -10.6);

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return mix(mix(a, b, u), mix(c, d, u), v);
}

function fbm(x: number, y: number) {
  let v = 0;
  let amp = 0.5;
  let px = x;
  let py = y;
  for (let i = 0; i < 4; i++) {
    v += valueNoise(px, py) * amp;
    px = px * 2.03 + 11.3;
    py = py * 2.03 + 7.7;
    amp *= 0.5;
  }
  return v;
}

/** Signed distance to the waterline: positive inland (beach), negative offshore. */
export function shoreDistance(x: number, z: number) {
  return SHORE_RADIUS - Math.hypot(x - SHORE_CENTER.x, z - SHORE_CENTER.y);
}

/** Terrain elevation in world units (water surface is y = 0). */
export function terrainHeight(x: number, z: number) {
  const inland = shoreDistance(x, z);

  if (inland > 0) {
    // Beach: a gentle berm that flattens into a dune further inland.
    const rise = Math.min(inland * 0.235, 3.1);
    const berm = Math.exp(-Math.pow((inland - 7.5) / 4.6, 2)) * 0.5;
    const dune = Math.exp(-Math.pow((inland - 24) / 9, 2)) * 0.9;
    const grain = (fbm(x * 0.35, z * 0.35) - 0.5) * 0.09;
    const ripple = Math.sin(x * 1.35 + z * 0.72) * 0.022 + Math.sin(z * 1.9 - x * 0.31) * 0.014;
    return rise + berm + dune + grain * smoothstep(1, 6, inland) + ripple * smoothstep(0.5, 4, inland);
  }

  const offshore = -inland;
  const slope = Math.min(offshore * 0.33, 8.4);
  const undulate =
    (Math.sin(x * 0.155 + 1.2) * 0.62 +
      Math.cos(z * 0.132 + 0.4) * 0.5 +
      Math.sin((x + z) * 0.061) * 0.85 +
      (fbm(x * 0.12 + 5.1, z * 0.12 - 2.3) - 0.5) * 1.5) *
    smoothstep(0.0, 5.0, offshore);
  const ripples =
    Math.sin((x * 0.95 + z * 0.32) + fbm(x * 0.2, z * 0.2) * 3.0) * 0.05 * smoothstep(1.0, 7.0, offshore);
  return -(slope + undulate * 0.9 + ripples);
}

/** Water depth at a world position (0 on land). */
export function waterDepth(x: number, z: number) {
  return Math.max(0, -terrainHeight(x, z));
}

export function terrainNormal(x: number, z: number, out = new THREE.Vector3()) {
  const e = 0.6;
  const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z);
  const hz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}

/**
 * Bake the terrain into a float texture: r = height, g = shore distance,
 * b = static noise (used for foam/grain variation), a = 1.
 */
export function bakeTerrainTexture(res = TERRAIN_RES) {
  const data = new Float32Array(res * res * 4);
  for (let i = 0; i < res; i++) {
    const z = (i / (res - 1) - 0.5) * WORLD_EXTENT;
    for (let j = 0; j < res; j++) {
      const x = (j / (res - 1) - 0.5) * WORLD_EXTENT;
      const idx = (i * res + j) * 4;
      data[idx] = terrainHeight(x, z);
      data[idx + 1] = shoreDistance(x, z);
      data[idx + 2] = fbm(x * 0.55 + 3.3, z * 0.55 - 1.7);
      data[idx + 3] = 1;
    }
  }
  const texture = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export { smoothstep, clamp01, mix };

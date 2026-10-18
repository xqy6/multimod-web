import * as THREE from "three";

import { COMMON, TERRAIN_TEXTURE } from "./glsl";
import { FullScreenPass } from "./pass";

/**
 * GPU height-field ripple simulation.
 * Two half-float targets ping-pong a damped wave equation; drops are injected
 * from creature splashes, rain, breaching rays and the player's pointer.
 */

export const SIM_RES = 256;
export const SIM_EXTENT = 110; // world units covered by the sim field

const SIM_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uState;
  uniform vec2 uTexel;
  uniform vec2 uSimRes;
  uniform float uDamping;
  uniform float uWaveSpeed;
  uniform int uDropCount;
  uniform vec4 uDrops[6];      // xy = uv position, z = uv radius, w = strength
  uniform float uRain;
  uniform float uRainSeed;
  uniform float uTime;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uSimRes;
    vec4 state = texture2D(uState, uv);
    float h = state.r;
    float prev = state.g;

    float l = texture2D(uState, uv - vec2(uTexel.x, 0.0)).r;
    float r = texture2D(uState, uv + vec2(uTexel.x, 0.0)).r;
    float d = texture2D(uState, uv - vec2(0.0, uTexel.y)).r;
    float u = texture2D(uState, uv + vec2(0.0, uTexel.y)).r;

    float laplacian = (l + r + d + u) - 4.0 * h;
    float next = (2.0 * h - prev) + laplacian * uWaveSpeed;

    // Absorbing borders: the field fades out instead of reflecting.
    float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float absorb = smoothstep(0.0, 0.09, edge);
    next *= mix(0.86, uDamping, absorb);

    if (uTime > 0.0 && uRain > 0.01) {
      vec2 jitter = vec2(hash12(uv * 91.7 + uRainSeed), hash12(uv * 13.3 - uRainSeed));
      float drop = smoothstep(0.86, 1.0, hash12(floor(uv * 160.0) + uRainSeed));
      next -= drop * jitter.x * 0.02 * uRain;
    }

    vec2 world = (uv - 0.5) * ${SIM_EXTENT.toFixed(1)};
    for (int i = 0; i < 6; i++) {
      if (i >= uDropCount) break;
      vec4 drop = uDrops[i];
      float dist = length(uv - drop.xy);
      next += exp(-dist * dist / max(drop.z * drop.z, 1e-6)) * drop.w;
    }

    gl_FragColor = vec4(clamp(next, -3.0, 3.0), h, 0.0, 1.0);
  }
`;

export type RippleSim = {
  texture: THREE.Texture;
  step: (dt: number) => void;
  drop: (x: number, z: number, strength?: number, radius?: number) => void;
  setRain: (amount: number) => void;
  clear: () => void;
  dispose: () => void;
};

export function createRippleSim(renderer: THREE.WebGLRenderer): RippleSim {
  const options: THREE.RenderTargetOptions = {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  };
  let read = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, options);
  let write = new THREE.WebGLRenderTarget(SIM_RES, SIM_RES, options);

  const uniforms: Record<string, THREE.IUniform> = {
    uState: { value: read.texture },
    uTexel: { value: new THREE.Vector2(1 / SIM_RES, 1 / SIM_RES) },
    uSimRes: { value: new THREE.Vector2(SIM_RES, SIM_RES) },
    uDamping: { value: 0.9945 },
    uWaveSpeed: { value: 0.24 },
    uDropCount: { value: 0 },
    uDrops: {
      value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, 0)),
    },
    uRain: { value: 0 },
    uRainSeed: { value: 0 },
    uTime: { value: 0 },
  };

  const pass = new FullScreenPass(SIM_FRAGMENT, uniforms);
  const pending: THREE.Vector4[] = [];
  let rain = 0;
  let seed = 0;
  let elapsed = 0;

  const clearTarget = (target: THREE.WebGLRenderTarget) => {
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.setRenderTarget(previous);
  };
  clearTarget(read);
  clearTarget(write);

  return {
    get texture() {
      return read.texture;
    },
    step(dt) {
      elapsed += dt;
      const drops = uniforms.uDrops.value as THREE.Vector4[];
      const count = Math.min(pending.length, 6);
      for (let i = 0; i < 6; i++) {
        if (i < count) drops[i].copy(pending[i]);
        else drops[i].set(0, 0, 0, 0);
      }
      pending.length = 0;
      uniforms.uDropCount.value = count;
      uniforms.uState.value = read.texture;
      uniforms.uRain.value = rain;
      uniforms.uRainSeed.value = seed;
      uniforms.uTime.value = elapsed;

      pass.render(renderer, write);
      const swap = read;
      read = write;
      write = swap;
    },
    drop(x, z, strength = 0.16, radius = 5) {
      if (pending.length >= 6) pending.shift();
      pending.push(new THREE.Vector4(x / SIM_EXTENT + 0.5, z / SIM_EXTENT + 0.5, radius / SIM_EXTENT, strength));
    },
    setRain(amount) {
      rain = amount;
      seed = Math.random() * 1000;
    },
    clear() {
      clearTarget(read);
      clearTarget(write);
    },
    dispose() {
      read.dispose();
      write.dispose();
      pass.dispose();
    },
  };
}

export const WATER_VERTEX = /* glsl */ `
  uniform sampler2D uHeight;
  uniform float uSimExtent;
  uniform float uTime;
  uniform vec3 uWhirl;
  uniform float uSwell;

  varying vec3 vWorld;
  varying vec2 vUvW;

  float swellH(vec2 p, float t) {
    vec2 d1 = normalize(vec2(0.42, 1.0));
    vec2 d2 = normalize(vec2(-0.55, 1.0));
    float w = sin(dot(p, d1) * 0.19 - t * 0.62) * 0.55;
    w += sin(dot(p, d2) * 0.34 - t * 0.83 + 1.4) * 0.32;
    w += sin(dot(p, normalize(vec2(0.9, 0.25))) * 0.78 - t * 1.25) * 0.16;
    return w;
  }

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 p = world.xz;
    float h = swellH(p, uTime) * uSwell * 0.26;

    vec2 suv = p / uSimExtent + 0.5;
    if (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
      h += texture2D(uHeight, suv).r * 2.6;
    }

    vec2 wv = p - uWhirl.xy;
    h -= exp(-dot(wv, wv) / 60.0) * uWhirl.z * 0.45;

    world.y += h;
    vWorld = world.xyz;
    vUvW = p;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const WATER_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uShore;
  uniform sampler2D uHeight;
  uniform float uSimExtent;
  uniform sampler2D uRefract;
  uniform vec2 uResolution;
  uniform vec3 uSunDir;
  uniform vec3 uCamPos;
  uniform sampler2D uPalmTex;
  uniform vec4 uPalmRect;
  uniform vec2 uPalmOffset;
  uniform vec3 uWhirl;
  uniform float uRain;
  uniform vec3 uHorizon;
  uniform float uQuality;
  uniform float uSwell;

  varying vec3 vWorld;
  varying vec2 vUvW;

  ${COMMON}
  ${TERRAIN_TEXTURE}

  float swellH(vec2 p, float t) {
    vec2 d1 = normalize(vec2(0.42, 1.0));
    vec2 d2 = normalize(vec2(-0.55, 1.0));
    float w = sin(dot(p, d1) * 0.19 - t * 0.62) * 0.55;
    w += sin(dot(p, d2) * 0.34 - t * 0.83 + 1.4) * 0.32;
    w += sin(dot(p, normalize(vec2(0.9, 0.25))) * 0.78 - t * 1.25) * 0.16;
    return w;
  }

  float palmShadow(vec2 p) {
    vec2 local = p + uPalmOffset - uPalmRect.xy;
    vec2 uv = vec2(local.x, -local.y) / (uPalmRect.z * 2.0) + 0.5;
    if (uv.x < 0.02 || uv.x > 0.98 || uv.y < 0.02 || uv.y > 0.98) return 0.0;
    float s = 0.0;
    float e = 1.5 / 256.0;
    s += texture2D(uPalmTex, uv).r * 0.36;
    s += texture2D(uPalmTex, uv + vec2(e, 0.0)).r * 0.16;
    s += texture2D(uPalmTex, uv - vec2(e, 0.0)).r * 0.16;
    s += texture2D(uPalmTex, uv + vec2(0.0, e)).r * 0.16;
    s += texture2D(uPalmTex, uv - vec2(0.0, e)).r * 0.16;
    float falloff = smoothstep(1.0, 0.72, max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0);
    return clamp(s * falloff, 0.0, 1.0) * uPalmRect.w;
  }

  void main() {
    vec2 p = vWorld.xz;
    float depth = max(0.0, -terrainHeight(p));

    vec2 suv = p / uSimExtent + 0.5;
    float texel = 1.0 / 256.0;
    float hL = 0.0, hR = 0.0, hD = 0.0, hU = 0.0;
    if (suv.x > 0.02 && suv.x < 0.98 && suv.y > 0.02 && suv.y < 0.98) {
      hL = texture2D(uHeight, suv - vec2(texel, 0.0)).r;
      hR = texture2D(uHeight, suv + vec2(texel, 0.0)).r;
      hD = texture2D(uHeight, suv - vec2(0.0, texel)).r;
      hU = texture2D(uHeight, suv + vec2(0.0, texel)).r;
    }

    vec2 grad = vec2(hR - hL, hU - hD) * 4.5;

    // Fine wind ripples keep the surface alive between simulation drops.
    float t = uTime;
    vec2 m1 = normalize(vec2(0.92, 0.4));
    vec2 m2 = normalize(vec2(-0.55, 1.0));
    vec2 m3 = normalize(vec2(0.35, -0.94));
    grad += m1 * cos(dot(p, m1) * 2.2 + t * 1.5) * 0.032;
    grad += m2 * cos(dot(p, m2) * 4.3 - t * 2.0) * 0.018;
    grad += m3 * cos(dot(p, m3) * 7.1 + t * 2.7) * 0.009;

    float sw = 0.8 * uSwell;
    float e = 0.55;
    vec2 sg = vec2(
      swellH(p + vec2(e, 0.0), uTime) - swellH(p - vec2(e, 0.0), uTime),
      swellH(p + vec2(0.0, e), uTime) - swellH(p - vec2(0.0, e), uTime)
    ) * sw;
    grad += sg;

    // Whirlpool swirls the surface normals.
    vec2 wv = p - uWhirl.xy;
    float wd = length(wv);
    float swirl = uWhirl.z * exp(-wd * wd / 55.0);
    grad += vec2(-wv.y, wv.x) / max(wd, 0.001) * swirl * 0.55;

    vec3 normal = normalize(vec3(-grad.x, 1.0, -grad.y));
    vec3 viewDir = normalize(uCamPos - vWorld);

    // --- refracted underwater image -------------------------------------
    vec2 screenUv = gl_FragCoord.xy / uResolution;
    vec2 offset = normal.xz * (0.02 + 0.05 * smoothstep(0.0, 6.0, depth));
    offset += vec2(
      sin(p.y * 0.9 + uTime * 0.9),
      cos(p.x * 0.8 - uTime * 0.7)
    ) * 0.0016;
    vec3 below = texture2D(uRefract, clamp(screenUv + offset, vec2(0.002), vec2(0.998))).rgb;

    vec3 sh = swash(p, uTime);
    float caustic = caustics(p, uTime) * smoothstep(0.0, 1.6, depth);
    below *= 1.0 + min(caustic, 0.9) * 0.16;

    // --- depth colour: absorption + scattering ---------------------------
    float dn = smoothstep(0.0, 7.0, depth);
    vec3 absorb = exp(-depth * vec3(0.26, 0.09, 0.055));
    vec3 scatter = mix(vec3(0.16, 0.72, 0.70), vec3(0.02, 0.17, 0.44), dn);
    float milk = 1.0 - exp(-depth * 0.3);
    vec3 color = below * absorb * 0.95 + scatter * milk * 0.5;

    // Wet sand reads through the very thin film at the waterline.
    float film = 1.0 - smoothstep(0.0, 0.5, depth);
    color = mix(color, mix(below, vec3(0.62, 0.90, 0.86), 0.3), film * 0.5);

    // --- sky reflection + sun glitter -----------------------------------
    float fres = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 4.0);
    vec3 sky = mix(uHorizon, vec3(0.78, 0.92, 0.98), 0.5);
    color = mix(color, sky, clamp(fres * 0.85, 0.0, 0.55));

    vec3 halfVec = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 160.0);
    float sparkleNoise = noise2(p * 6.5 + vec2(uTime * 0.4, -uTime * 0.33));
    color += vec3(1.0, 0.97, 0.9) * (spec * 0.3 + spec * smoothstep(0.55, 0.9, sparkleNoise) * 0.12);

    // --- foam -----------------------------------------------------------
    float crest = smoothstep(0.55, 1.05, swellH(p, uTime) * uSwell * 0.5 + 0.5 + grad.y * 0.35);
    float foamNoise = fbm2(p * 2.3 + vec2(uTime * 0.12, uTime * 0.05));
    float whitecap = crest * smoothstep(0.62, 0.9, foamNoise) * 0.28;
    float shoreFoam = sh.x * (0.4 + 0.3 * smoothstep(0.0, 1.2, depth));
    float waterline = smoothstep(0.4, 0.05, depth) * smoothstep(0.42, 0.7, foamNoise) * 0.55;
    float foam = clamp(whitecap + shoreFoam + waterline, 0.0, 1.0);

    vec3 foamColor = mix(vec3(0.86, 0.95, 0.97), vec3(1.0), sh.y);
    color = mix(color, foamColor, foam * 0.92);

    // --- palm shadow ----------------------------------------------------
    float shadow = palmShadow(p);
    color *= 1.0 - shadow * 0.26;

    // --- rain -----------------------------------------------------------
    color += vec3(0.05) * uRain * (0.5 + 0.5 * noise2(p * 14.0 + uTime));

    // --- distance haze --------------------------------------------------
    float dist = length(vWorld - uCamPos);
    float haze = smoothstep(70.0, 300.0, dist);
    color = mix(color, uHorizon, haze);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export type Water = {
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  dispose: () => void;
};

export function createWater(options: {
  terrain: THREE.Texture;
  terrainExtent: number;
  sim: RippleSim;
  palmTexture: THREE.Texture;
  palmRect: THREE.Vector4;
}): Water {
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uShore: { value: new THREE.Vector3(-40, -28, 26) },
    uTerrain: { value: options.terrain },
    uTerrainExtent: { value: options.terrainExtent },
    uHeight: { value: options.sim.texture },
    uSimExtent: { value: SIM_EXTENT },
    uRefract: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uSunDir: { value: new THREE.Vector3(-0.42, 0.86, -0.3).normalize() },
    uCamPos: { value: new THREE.Vector3() },
    uPalmTex: { value: options.palmTexture },
    uPalmRect: { value: options.palmRect },
    uPalmOffset: { value: new THREE.Vector2() },
    uWhirl: { value: new THREE.Vector3(0, 0, 0) },
    uRain: { value: 0 },
    uHorizon: { value: new THREE.Vector3(0.62, 0.82, 0.9) },
    uQuality: { value: 1 },
    uSwell: { value: 1 },
  };

  const geometry = new THREE.PlaneGeometry(1500, 1500, 240, 240);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WATER_VERTEX,
    fragmentShader: WATER_FRAGMENT,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  mesh.layers.set(1);

  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

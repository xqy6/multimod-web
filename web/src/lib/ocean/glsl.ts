/**
 * Shared GLSL fragments for the Ocean Shallows scene.
 * Every chunk expects the caller to declare:
 *   uniform float uTime; uniform vec3 uShore; // xy = centre, z = radius
 */

export const COMMON = /* glsl */ `
  #define PI 3.141592653589793
  #define TAU 6.283185307179586

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm2(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += noise2(p) * amp;
      p = p * 2.03 + vec2(11.3, 7.7);
      amp *= 0.5;
    }
    return v;
  }

  // Distance inland from the waterline. Positive = dry land.
  float shoreLand(vec2 p) {
    return uShore.z - length(p - uShore.xy);
  }

  // Foam + wet-sand mask driven by the swash that runs up the beach.
  // returns: x = breaking foam, y = wet sand, z = thin backwash sheen
  vec3 swash(vec2 p, float t) {
    float s = shoreLand(p);
    float phase = t * 0.72;
    float front = 0.45 + sin(phase) * 1.25 + sin(phase * 0.41 + 1.9) * 0.42
                + sin(phase * 1.7 + 0.6) * 0.12;
    float d = s - front;

    // Advancing lace of foam, strongest right at the leading edge.
    float lace = fbm2(p * 1.9 + vec2(t * 0.05, t * 0.02));
    float laceB = fbm2(p * 4.6 - vec2(t * 0.07, 0.0));
    float body = smoothstep(0.55, 0.05, abs(d)) * smoothstep(0.28, 0.62, lace * 0.75 + laceB * 0.35);
    float edge = smoothstep(0.55, 0.0, abs(d + 0.34)) * 0.85;
    float foam = clamp(body + edge * 0.8, 0.0, 1.0);

    // Persistent breaker line just offshore.
    float breaker = smoothstep(0.85, 0.0, abs(s + 0.35 + sin(t * 0.72 + p.x * 0.02) * 0.22));
    foam += breaker * smoothstep(0.35, 0.75, laceB) * 0.85;

    // Wet band left behind after the wash drains back.
    float wet = smoothstep(1.55, 0.05, s - max(front, 0.0) * 0.72);
    float sheen = smoothstep(0.9, 0.0, abs(s - front * 0.55)) * 0.5;
    return vec3(clamp(foam, 0.0, 1.0), clamp(wet, 0.0, 1.0), clamp(sheen, 0.0, 1.0));
  }

  // Moving caustic web projected on the seabed.
  float caustics(vec2 p, float t) {
    vec2 q = p * 0.34;
    float a = sin(q.x * 2.3 + t * 0.8) + sin(q.y * 1.9 - t * 1.05) + sin((q.x + q.y) * 1.45 + t * 0.55);
    float b = sin(q.x * 4.1 - t * 1.35) + sin(q.y * 3.4 + t * 0.9);
    float web = abs(a) * 0.45 + abs(b) * 0.22;
    float v = pow(clamp(1.0 - web, 0.0, 1.0), 5.0);
    float n = fbm2(q * 1.7 + vec2(t * 0.1, -t * 0.08));
    return v * (0.35 + 0.9 * n) * 2.2;
  }
`;

export const VERT_WORLD = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUvW;
`;

export const TERRAIN_TEXTURE = /* glsl */ `
  uniform sampler2D uTerrain;
  uniform float uTerrainExtent;
  vec2 terrainUv(vec2 xz) { return xz / uTerrainExtent + 0.5; }
  float terrainHeight(vec2 xz) {
    return texture2D(uTerrain, clamp(terrainUv(xz), vec2(0.001), vec2(0.999))).r;
  }
`;

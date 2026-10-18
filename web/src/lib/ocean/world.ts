import * as THREE from "three";

import { COMMON, TERRAIN_TEXTURE } from "./glsl";
import {
  PALM_POSITION,
  SHORE_CENTER,
  SHORE_RADIUS,
  WORLD_EXTENT,
  clamp01,
  mix,
  shoreDistance,
  smoothstep,
  terrainHeight,
  terrainNormal,
} from "./terrain";

const SAND_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying vec2 vUvW;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vUvW = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SAND_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uShore;
  uniform vec3 uSunDir;
  uniform vec3 uCamPos;
  uniform float uAbove;
  uniform sampler2D uPalmTex;
  uniform vec4 uPalmRect;
  uniform vec2 uPalmOffset;
  uniform float uWetness;

  varying vec3 vWorld;
  varying vec2 vUvW;

  ${COMMON}
  ${TERRAIN_TEXTURE}

  vec3 sandBase(vec2 p, float height) {
    float grain = fbm2(p * 1.6);
    float coarse = noise2(p * 9.0) * 0.5 + noise2(p * 23.0) * 0.5;

    vec3 dry = mix(vec3(1.0, 0.9, 0.56), vec3(0.91, 0.74, 0.4), grain);
    vec3 wet = vec3(0.6, 0.47, 0.3);
    wet = mix(wet, vec3(0.45, 0.49, 0.4), smoothstep(0.3, 1.0, grain) * 0.3);

    float depth = max(0.0, -height);
    vec3 sub = mix(vec3(0.94, 0.84, 0.54), vec3(0.62, 0.68, 0.39), smoothstep(0.5, 8.0, depth));

    // Pronounced current ripples catch the caustic light on the sea floor.
    float ripple = sin((p.x * 1.16 + p.y * 0.42) * 2.9 + fbm2(p * 0.31) * 7.2);
    float fineRipple = sin((p.x * 2.2 - p.y * 0.52) * 3.5 + fbm2(p * 1.1) * 4.0);
    float rippleBand = smoothstep(0.18, 0.9, ripple * 0.5 + 0.5);
    sub *= 0.84 + 0.2 * rippleBand * smoothstep(0.2, 3.6, depth);
    sub += vec3(0.095, 0.09, 0.035) * rippleBand * smoothstep(0.1, 2.4, depth);
    sub *= 0.96 + 0.05 * fineRipple * smoothstep(0.1, 2.4, depth);
    float grass = smoothstep(0.62, 0.8, fbm2(p * 0.42 + 8.0)) * smoothstep(2.0, 6.0, depth);
    sub = mix(sub, vec3(0.24, 0.46, 0.31), grass * 0.42);

    vec3 color = mix(sub, dry, smoothstep(-0.6, 1.2, height));
    color = mix(color, wet, uWetness * smoothstep(-1.2, 0.6, height));
    color *= 0.94 + 0.12 * coarse;
    return color;
  }

  vec3 terrainNormalAt(vec2 p) {
    float e = 0.55;
    float hx = terrainHeight(p + vec2(e, 0.0)) - terrainHeight(p - vec2(e, 0.0));
    float hz = terrainHeight(p + vec2(0.0, e)) - terrainHeight(p - vec2(0.0, e));
    return normalize(vec3(-hx, 2.0 * e, -hz));
  }

  float palmShadow(vec2 p) {
    vec2 local = p + uPalmOffset - uPalmRect.xy;
    vec2 uv = vec2(local.x, -local.y) / (uPalmRect.z * 2.0) + 0.5;
    if (uv.x < 0.02 || uv.x > 0.98 || uv.y < 0.02 || uv.y > 0.98) return 0.0;
    float s = 0.0;
    float e = 2.1 / 1024.0;
    s += texture2D(uPalmTex, uv).r * 0.2;
    s += texture2D(uPalmTex, uv + vec2(e, 0.0)).r * 0.14;
    s += texture2D(uPalmTex, uv - vec2(e, 0.0)).r * 0.14;
    s += texture2D(uPalmTex, uv + vec2(0.0, e)).r * 0.14;
    s += texture2D(uPalmTex, uv - vec2(0.0, e)).r * 0.14;
    s += texture2D(uPalmTex, uv + vec2(e * 1.9, e * 1.9)).r * 0.06;
    s += texture2D(uPalmTex, uv - vec2(e * 1.9, e * 1.9)).r * 0.06;
    s += texture2D(uPalmTex, uv + vec2(e * 1.9, -e * 1.9)).r * 0.06;
    s += texture2D(uPalmTex, uv - vec2(e * 1.9, -e * 1.9)).r * 0.06;
    float falloff = smoothstep(1.0, 0.75, max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0);
    return clamp(s * falloff, 0.0, 1.0) * uPalmRect.w;
  }

  void main() {
    if (uAbove > 0.5) {
      if (vWorld.y < -0.2) discard;
    } else {
      if (vWorld.y > 0.2) discard;
    }

    vec2 p = vWorld.xz;
    vec3 normal = terrainNormalAt(p);
    vec3 viewDir = normalize(uCamPos - vWorld);

    vec3 sw = swash(p, uTime);
    float wetness = uAbove > 0.5 ? sw.y : 1.0;
    vec3 color = sandBase(p, vWorld.y);

    // Wet sand darkens and picks up a specular sheen.
    float sheen = wetness * (uAbove > 0.5 ? 1.0 : 0.6);
    color *= 1.0 - sheen * 0.16;
    vec3 halfVec = normalize(uSunDir + viewDir);
    float spec = pow(max(dot(normal, halfVec), 0.0), 42.0) * sheen;
    float ndl = max(dot(normal, uSunDir), 0.0);
    float sky = 0.5 + 0.5 * normal.y;

    vec3 lit = color * (0.4 + 0.92 * ndl) * mix(0.92, 1.08, sky);
    lit += vec3(1.0, 0.97, 0.8) * spec * 0.2;

    // Caustic light is baked into the sea floor too, so it remains visible
    // through the fresnel reflection on the surface.
    float floorCaustic = caustics(p, uTime) * smoothstep(0.15, 3.5, -vWorld.y);
    lit += vec3(0.82, 0.95, 0.6) * min(floorCaustic, 1.8) * 0.13;

    // Palm shade across sand and shallows.
    lit *= 1.0 - palmShadow(p) * 0.52;

    // Foam that has rushed up the beach.
    if (uAbove > 0.5) {
      float foam = sw.x * (0.6 + 0.4 * noise2(p * 5.0));
      vec3 foamColor = vec3(0.95, 0.97, 0.97) * (0.75 + 0.35 * ndl);
      lit = mix(lit, foamColor, clamp(foam, 0.0, 0.92));
      float backwash = sw.z * 0.12;
      lit += vec3(0.8, 0.9, 0.9) * backwash;
    }

    // Waterline darkening just below the surface.
    lit *= 1.0 - smoothstep(0.0, 0.9, -vWorld.y) * 0.22;

    gl_FragColor = vec4(lit, 1.0);
  }
`;

export type Terrain = {
  group: THREE.Group;
  above: THREE.Mesh;
  below: THREE.Mesh;
  uniformSets: Record<string, THREE.IUniform>[];
};

export function createTerrain(options: {
  terrain: THREE.Texture;
  palmTexture: THREE.Texture;
  palmRect: THREE.Vector4;
  segments?: number;
}): Terrain {
  const segments = options.segments ?? 320;
  const geometry = new THREE.PlaneGeometry(WORLD_EXTENT, WORLD_EXTENT, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, terrainHeight(x, z));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  const shared: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uShore: { value: new THREE.Vector3(SHORE_CENTER.x, SHORE_CENTER.y, SHORE_RADIUS) },
    uSunDir: { value: new THREE.Vector3(-0.48, 0.82, -0.3).normalize() },
    uCamPos: { value: new THREE.Vector3() },
    uAbove: { value: 1 },
    uTerrain: { value: options.terrain },
    uTerrainExtent: { value: WORLD_EXTENT },
    uPalmTex: { value: options.palmTexture },
    uPalmRect: { value: options.palmRect },
    uPalmOffset: { value: new THREE.Vector2() },
    uWetness: { value: 1 },
  };

  const makeMesh = (above: boolean) => {
    const uniforms = { ...shared, uAbove: { value: above ? 1 : 0 } };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: SAND_VERTEX,
      fragmentShader: SAND_FRAGMENT,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.layers.set(above ? 2 : 0);
    mesh.name = above ? "sand-above" : "sand-below";
    return { mesh, uniforms, material };
  };

  const above = makeMesh(true);
  const below = makeMesh(false);
  below.mesh.renderOrder = -2;

  const group = new THREE.Group();
  group.add(below.mesh, above.mesh);

  return {
    group,
    above: above.mesh,
    below: below.mesh,
    uniformSets: [above.uniforms, below.uniforms],
  };
}

/* ------------------------------------------------------------------ */
/* Seabed dressing                                                     */
/* ------------------------------------------------------------------ */

const CORAL_COLORS = [0xd06a4a, 0xc98a52, 0xb06a72, 0x8a72a8, 0x5e9c86, 0xc25a66];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function blobShadowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.55)");
  gradient.addColorStop(0.55, "rgba(0,0,0,0.28)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

export function createSeabed(): THREE.Group {
  const group = new THREE.Group();
  const rand = seededRandom(9182);
  const shadowTexture = blobShadowTexture();
  const contactShadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });

  // ---- coral heads -------------------------------------------------
  const coralGeometry = new THREE.IcosahedronGeometry(1, 4);
  const coralPositions = coralGeometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < coralPositions.count; i++) {
    const x = coralPositions.getX(i);
    const y = coralPositions.getY(i);
    const z = coralPositions.getZ(i);
    const n =
      Math.sin(x * 5.1 + z * 3.3) * 0.16 +
      Math.sin(y * 7.3 - x * 2.1) * 0.12 +
      Math.sin(z * 11.7 + y * 4.4) * 0.06;
    const scale = 1 + n;
    coralPositions.setXYZ(i, x * scale, y * scale * 0.72, z * scale);
  }
  coralGeometry.computeVertexNormals();

  const coralMaterial = new THREE.MeshStandardMaterial({
    vertexColors: false,
    metalness: 0,
    flatShading: false,
    color: 0xffffff,
    roughness: 0.72,
  });

  for (let i = 0; i < 24; i++) {
    const x = -27 + rand() * 54;
    const z = -17 + rand() * 34;
    const height = terrainHeight(x, z);
    if (height > -2.2) continue;
    const material = coralMaterial.clone();
    material.color.setHex(CORAL_COLORS[Math.floor(rand() * CORAL_COLORS.length)]);
    const mesh = new THREE.Mesh(coralGeometry, material);
    const s = 0.62 + rand() * 1.45;
    mesh.scale.set(s, s * (0.7 + rand() * 0.6), s);
    mesh.position.set(x, height + s * 0.28, z);
    mesh.rotation.y = rand() * Math.PI;
    mesh.layers.set(0);
    group.add(mesh);

    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(s * 3.2, s * 3.2),
      contactShadowMaterial,
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, height + 0.06, z);
    blob.layers.set(0);
    group.add(blob);
  }

  // ---- branching coral thickets ------------------------------------
  const branchPalette = [0x356f57, 0x765844, 0x7c5366, 0xa86846, 0x4b7f62];
  for (let cluster = 0; cluster < 10; cluster++) {
    const x = -24 + rand() * 48;
    const z = -15 + rand() * 32;
    const h = terrainHeight(x, z);
    if (h > -2.0) continue;
    const coral = new THREE.Group();
    const baseY = h + 0.02;
    const branches = 5 + Math.floor(rand() * 4);
    for (let b = 0; b < branches; b++) {
      const angle = rand() * Math.PI * 2;
      const radius = rand() * 1.2;
      const start = new THREE.Vector3(Math.cos(angle) * radius * 0.25, baseY, Math.sin(angle) * radius * 0.25);
      const end = new THREE.Vector3(
        Math.cos(angle) * radius,
        baseY + 0.45 + rand() * 1.0,
        Math.sin(angle) * radius,
      );
      const mid = start.clone().lerp(end, 0.54);
      mid.x += (rand() - 0.5) * 0.4;
      mid.z += (rand() - 0.5) * 0.4;
      const material = new THREE.MeshPhysicalMaterial({
        color: branchPalette[Math.floor(rand() * branchPalette.length)],
        roughness: 0.62,
        clearcoat: 0.12,
        clearcoatRoughness: 0.7,
      });
      const branch = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, mid, end]), 20, 0.045 + rand() * 0.045, 8, false),
        material,
      );
      branch.layers.set(0);
      coral.add(branch);
    }
    coral.position.set(x, 0, z);
    const coralShadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.2), contactShadowMaterial);
    coralShadow.rotation.x = -Math.PI / 2;
    coralShadow.position.set(x, h + 0.045, z);
    coralShadow.layers.set(0);
    group.add(coralShadow);
    group.add(coral);
  }

  // ---- boulders ----------------------------------------------------
  const rockGeometry = new THREE.DodecahedronGeometry(1, 3);
  const rockPositions = rockGeometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rockPositions.count; i++) {
    const x = rockPositions.getX(i);
    const y = rockPositions.getY(i);
    const z = rockPositions.getZ(i);
    const n = Math.sin(x * 4.1 + y * 2.7 + z * 5.3) * 0.12;
    rockPositions.setXYZ(i, x * (1 + n), y * (0.62 + n), z * (1 + n));
  }
  rockGeometry.computeVertexNormals();
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0x6f7467,
    roughness: 0.94,
    flatShading: false,
  });

  for (let i = 0; i < 13; i++) {
    const x = -26 + rand() * 52;
    const z = -16 + rand() * 32;
    const height = terrainHeight(x, z);
    if (height > -0.6) continue;
    const mesh = new THREE.Mesh(rockGeometry, rockMaterial);
    const s = 0.62 + rand() * 1.6;
    mesh.scale.set(s, s * 0.8, s);
    mesh.position.set(x, height + s * 0.2, z);
    mesh.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.4);
    mesh.layers.set(0);
    group.add(mesh);

    const rockShadow = new THREE.Mesh(new THREE.PlaneGeometry(s * 2.7, s * 2.4), contactShadowMaterial);
    rockShadow.rotation.x = -Math.PI / 2;
    rockShadow.rotation.z = rand() * Math.PI;
    rockShadow.position.set(x, height + 0.04, z);
    rockShadow.layers.set(0);
    group.add(rockShadow);
  }

  // ---- seagrass meadow --------------------------------------------
  const bladeGeometry = new THREE.PlaneGeometry(0.12, 1, 2, 10);
  bladeGeometry.translate(0, 0.5, 0);
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x337044,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const bladeCount = 1080;
  const grass = new THREE.InstancedMesh(bladeGeometry, grassMaterial, bladeCount);
  grass.layers.set(0);
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let clump = 0; clump < 46 && placed < bladeCount; clump++) {
    const cx = -26 + rand() * 52;
    const cz = -16 + rand() * 32;
    const ch = terrainHeight(cx, cz);
    if (ch > -2.6 || shoreDistance(cx, cz) > -7) continue;
    const blades = 15 + Math.floor(rand() * 12);
    for (let b = 0; b < blades && placed < bladeCount; b++) {
      const angle = rand() * Math.PI * 2;
      const radius = Math.pow(rand(), 0.6) * 2.1;
      const x = cx + Math.cos(angle) * radius;
      const z = cz + Math.sin(angle) * radius;
      dummy.position.set(x, terrainHeight(x, z), z);
      dummy.rotation.set((rand() - 0.5) * 0.28, rand() * Math.PI, (rand() - 0.5) * 0.42);
      const height = 0.8 + rand() * 1.8;
      dummy.scale.set(0.7 + rand() * 0.7, height, 1);
      dummy.updateMatrix();
      grass.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
  }
  grass.count = placed;
  grass.instanceMatrix.needsUpdate = true;
  group.add(grass);

  // ---- rubble ------------------------------------------------------
  const rubbleGeometry = new THREE.IcosahedronGeometry(0.2, 1);
  const rubbleMaterial = new THREE.MeshStandardMaterial({
    color: 0x7b765c,
    roughness: 0.95,
    flatShading: false,
  });
  const rubble = new THREE.InstancedMesh(rubbleGeometry, rubbleMaterial, 55);
  rubble.layers.set(0);
  for (let i = 0; i < 55; i++) {
    const x = -30 + rand() * 60;
    const z = -20 + rand() * 40;
    dummy.position.set(x, terrainHeight(x, z) + 0.06, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    const s = 0.18 + rand() * 0.42;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    rubble.setMatrixAt(i, dummy.matrix);
  }
  rubble.instanceMatrix.needsUpdate = true;
  group.add(rubble);

  // ---- starfish ----------------------------------------------------
  const starShape = new THREE.Shape();
  const arms = 5;
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const wobble = 0.55 + 0.45 * Math.abs(Math.cos((t * arms) / 2));
    const r = 0.28 + wobble * 0.22;
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  const starGeometry = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 3,
    curveSegments: 24,
  });
  starGeometry.rotateX(-Math.PI / 2);
  const starColors = [0xd8734f, 0xe4a24a, 0xc4546f];
  for (let i = 0; i < 14; i++) {
    const x = -27 + rand() * 54;
    const z = -16 + rand() * 32;
    const h = terrainHeight(x, z);
    if (h > -0.9) continue;
    const material = new THREE.MeshStandardMaterial({
      color: starColors[Math.floor(rand() * starColors.length)],
      roughness: 0.78,
    });
    const mesh = new THREE.Mesh(starGeometry, material);
    mesh.position.set(x, h + 0.05, z);
    mesh.rotation.y = rand() * Math.PI * 2;
    mesh.scale.setScalar(0.9 + rand() * 0.9);
    mesh.layers.set(0);
    group.add(mesh);
  }

  // ---- shells ------------------------------------------------------
  const shellGeometry = new THREE.SphereGeometry(0.22, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.45);
  shellGeometry.scale(1.3, 0.55, 1);
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0dfd0,
    roughness: 0.42,
    metalness: 0.05,
  });
  for (let i = 0; i < 8; i++) {
    const x = -28 + rand() * 56;
    const z = -18 + rand() * 36;
    const mesh = new THREE.Mesh(shellGeometry, shellMaterial);
    const h = terrainHeight(x, z);
    mesh.position.set(x, h + 0.05, z);
    mesh.rotation.set((rand() - 0.5) * 0.4, rand() * 6.28, (rand() - 0.5) * 0.4);
    mesh.scale.setScalar(0.5 + rand() * 0.55);
    mesh.layers.set(h > 0 ? 2 : 0);
    group.add(mesh);
  }

  // ---- sea urchins --------------------------------------------------
  const urchinGeometry = new THREE.SphereGeometry(0.28, 32, 20);
  const spineGeometry = new THREE.ConeGeometry(0.026, 0.52, 10, 2);
  spineGeometry.translate(0, 0.25, 0);
  const urchinMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c2338,
    roughness: 0.56,
    flatShading: false,
  });
  for (let i = 0; i < 9; i++) {
    const x = -26 + rand() * 52;
    const z = -16 + rand() * 32;
    const h = terrainHeight(x, z);
    if (h > -2.4) continue;
    const urchin = new THREE.Group();
    urchin.add(new THREE.Mesh(urchinGeometry, urchinMaterial));
    for (let s = 0; s < 44; s++) {
      const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.2, rand() - 0.5).normalize();
      const spine = new THREE.Mesh(spineGeometry, urchinMaterial);
      spine.position.copy(dir).multiplyScalar(0.18);
      spine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      urchin.add(spine);
    }
    urchin.position.set(x, h + 0.12, z);
    urchin.scale.setScalar(0.8 + rand() * 0.7);
    urchin.traverse((child) => child.layers.set(0));
    group.add(urchin);
  }

  // ---- dune grass on the beach -------------------------------------
  const duneGeometry = new THREE.ConeGeometry(0.08, 0.75, 8, 3);
  duneGeometry.translate(0, 0.38, 0);
  const duneMaterial = new THREE.MeshStandardMaterial({
    color: 0xc7c58a,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const dune = new THREE.InstancedMesh(duneGeometry, duneMaterial, 520);
  dune.layers.set(2);
  let dunePlaced = 0;
  for (let i = 0; i < 1100 && dunePlaced < 520; i++) {
    const x = -52 + rand() * 30;
    const z = -42 + rand() * 34;
    const inland = shoreDistance(x, z);
    if (inland < 3 || inland > 20) continue;
    dummy.position.set(x, terrainHeight(x, z), z);
    dummy.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5);
    dummy.scale.set(0.7 + rand() * 0.6, 0.6 + rand() * 0.9, 1);
    dummy.updateMatrix();
    dune.setMatrixAt(dunePlaced, dummy.matrix);
    dunePlaced++;
  }
  dune.count = dunePlaced;
  dune.instanceMatrix.needsUpdate = true;
  group.add(dune);

  return group;
}

/* ------------------------------------------------------------------ */
/* Palm + baked shadow                                                 */
/* ------------------------------------------------------------------ */

export const PALM_SHADOW_SIZE = 1024;

function buildTrunk() {
  const group = new THREE.Group();
  const segments = 48;
  const rings = 16;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.34, 1.9, 0.18),
    new THREE.Vector3(0.72, 3.9, 0.36),
    new THREE.Vector3(0.96, 5.6, 0.5),
    new THREE.Vector3(1.02, 6.5, 0.56),
  ]);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
    const up = tangent.clone().cross(side).normalize();
    const radius = mix(0.46, 0.2, t) * (1 + Math.sin(t * 9) * 0.03);
    for (let j = 0; j < rings; j++) {
      const a = (j / rings) * Math.PI * 2;
      const offset = side
        .clone()
        .multiplyScalar(Math.cos(a) * radius)
        .add(up.clone().multiplyScalar(Math.sin(a) * radius));
      positions.push(center.x + offset.x, center.y + offset.y, center.z + offset.z);
      const shade = 0.72 + 0.14 * ((Math.sin(a * 3 + t * 12) + 1) * 0.5);
      colors.push(shade * 0.72, shade * 0.58, shade * 0.44);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < rings; j++) {
      const a = i * rings + j;
      const b = i * rings + ((j + 1) % rings);
      const c = (i + 1) * rings + j;
      const d = (i + 1) * rings + ((j + 1) % rings);
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);
  return group;
}

function buildFrond(length: number, droop: number, seed: number) {
  const rachisSegments = 96;
  const leafletCount = 34;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const rand = seededRandom(seed);

  const spineAt = (t: number) => {
    const x = t * length;
    const y = Math.sin(t * 1.35) * length * 0.34 - t * t * droop;
    return new THREE.Vector3(x, y, 0);
  };

  const pushTriangle = (a: number, b: number, c: number) => indices.push(a, b, c);

  // A narrow, slightly folded central rachis.
  const rachisBase = positions.length / 3;
  for (let i = 0; i <= rachisSegments; i++) {
    const t = i / rachisSegments;
    const spine = spineAt(t);
    const tangent = spineAt(Math.min(1, t + 0.004)).sub(spineAt(Math.max(0, t - 0.004))).normalize();
    const side = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const width = 0.035 * (1 - t * 0.55);
    const shade = 0.82 + 0.18 * Math.sin(t * 12 + seed);
    positions.push(spine.x - side.x * width, spine.y - side.y * width, spine.z);
    positions.push(spine.x, spine.y + 0.006, spine.z);
    positions.push(spine.x + side.x * width, spine.y + side.y * width, spine.z);
    colors.push(0.2 * shade, 0.4 * shade, 0.18 * shade);
    colors.push(0.3 * shade, 0.56 * shade, 0.25 * shade);
    colors.push(0.2 * shade, 0.4 * shade, 0.18 * shade);
  }
  for (let i = 0; i < rachisSegments; i++) {
    const a = rachisBase + i * 3;
    const b = a + 3;
    pushTriangle(a, b, a + 1);
    pushTriangle(a + 1, b, b + 1);
    pushTriangle(a + 1, b + 1, a + 2);
    pushTriangle(a + 2, b + 1, b + 2);
  }

  // Individual tapered leaflets. Building them as real geometry (rather than
  // a saw-tooth strip) gives the palm crown and its shadow a natural feathery edge.
  for (const sideSign of [-1, 1]) {
    for (let leaf = 0; leaf < leafletCount; leaf++) {
      const t = 0.07 + (leaf / (leafletCount - 1)) * 0.88;
      const spine = spineAt(t);
      const tangent = spineAt(Math.min(1, t + 0.006)).sub(spineAt(Math.max(0, t - 0.006))).normalize();
      const lateral = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
      const leafLength = (length * 0.15 + Math.sin(t * Math.PI) * length * 0.18) * (0.74 + rand() * 0.34);
      const tip = spine
        .clone()
        .addScaledVector(tangent, leafLength * (0.2 + rand() * 0.1))
        .add(new THREE.Vector3(0, -leafLength * (0.08 + t * 0.16), 0))
        .addScaledVector(lateral, sideSign * leafLength);
      const shade = 0.8 + rand() * 0.34;
      const baseIndex = positions.length / 3;
      const steps = 5;
      for (let step = 0; step <= steps; step++) {
        const f = step / steps;
        const center = spine.clone().lerp(tip, f);
        center.y += Math.sin(f * Math.PI) * leafLength * 0.06;
        const leafTangent = tip.clone().sub(spine).normalize();
        const across = new THREE.Vector3(-leafTangent.y, leafTangent.x, 0).normalize();
        const width = Math.sin(f * Math.PI) * leafLength * 0.17;
        positions.push(center.x - across.x * width, center.y + width * 0.16, center.z - across.z * width);
        positions.push(center.x + across.x * width, center.y + width * 0.16, center.z + across.z * width);
        colors.push(0.2 * shade, 0.43 * shade, 0.17 * shade);
        colors.push(0.28 * shade, 0.58 * shade, 0.24 * shade);
      }
      for (let step = 0; step < steps; step++) {
        const a = baseIndex + step * 2;
        const b = a + 2;
        pushTriangle(a, b, a + 1);
        pushTriangle(a + 1, b, b + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.76,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.8,
  });
  return new THREE.Mesh(geometry, material);
}

export type Palm = {
  group: THREE.Group;
  shadowTexture: THREE.WebGLRenderTarget;
  shadowUniforms: { palmTexture: THREE.Texture; palmRect: THREE.Vector4; palmOffset: THREE.Vector2 };
  update: (time: number, dt: number, renderer: THREE.WebGLRenderer) => void;
  dispose: () => void;
};

export function createPalm(_renderer: THREE.WebGLRenderer): Palm {
  const group = new THREE.Group();
  const baseHeight = terrainHeight(PALM_POSITION.x, PALM_POSITION.z);
  group.position.set(PALM_POSITION.x, baseHeight - 0.1, PALM_POSITION.z);
  group.scale.setScalar(1.05);

  const sway = new THREE.Group();
  group.add(sway);
  sway.add(buildTrunk());

  const crown = new THREE.Group();
  crown.position.set(1.02, 6.4, 0.56);
  sway.add(crown);

  const frondCount = 13;
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + 0.2;
    const frond = buildFrond(4.4 + (i % 3) * 0.55, 2.6 + (i % 4) * 0.5, 1200 + i * 37);
    frond.rotation.y = angle;
    frond.rotation.z = -0.12 - (i % 3) * 0.06;
    frond.position.y = (i % 2) * 0.12;
    crown.add(frond);
  }

  // Coconuts
  const coconutGeometry = new THREE.SphereGeometry(0.19, 24, 16);
  const coconutMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4a30, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const coconut = new THREE.Mesh(coconutGeometry, coconutMaterial);
    coconut.position.set(Math.cos(i * 1.7) * 0.28, -0.16, Math.sin(i * 1.7) * 0.28);
    crown.add(coconut);
  }

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.layers.set(2);
  });

  // Shadow target, rendered from directly above the palm.
  const shadowTarget = new THREE.WebGLRenderTarget(PALM_SHADOW_SIZE, PALM_SHADOW_SIZE, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    depthBuffer: true,
  });
  shadowTarget.texture.colorSpace = THREE.NoColorSpace;

  const shadowCamera = new THREE.OrthographicCamera(-34, 34, 34, -34, 1, 120);
  const shadowCenter = new THREE.Vector3(
    PALM_POSITION.x - 3.2,
    0,
    PALM_POSITION.z - 2.6,
  );
  shadowCamera.position.set(shadowCenter.x, 60, shadowCenter.z);
  shadowCamera.up.set(0, 0, -1);
  shadowCamera.layers.enableAll();
  shadowCamera.lookAt(shadowCenter.x, 0, shadowCenter.z);

  const shadowScene = new THREE.Scene();
  const silhouette = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const sunDir = new THREE.Vector3(-0.48, 0.82, -0.3).normalize();
  const palmOffset = new THREE.Vector2(
    (sunDir.x / sunDir.y) * 6.0,
    (sunDir.z / sunDir.y) * 6.0,
  );

  let shadowAge = 0;
  let lastKey = "";

  return {
    group,
    shadowTexture: shadowTarget,
    shadowUniforms: {
      palmTexture: shadowTarget.texture,
      palmRect: new THREE.Vector4(shadowCenter.x, shadowCenter.z, 34, 1),
      palmOffset,
    },
    update(time, dt, activeRenderer) {
      const bend = Math.sin(time * 0.62) * 0.055 + Math.sin(time * 1.37 + 1.1) * 0.02;
      sway.rotation.z = bend * 0.9;
      sway.rotation.x = Math.sin(time * 0.47 + 0.6) * 0.045;
      crown.rotation.y = Math.sin(time * 0.31) * 0.12;
      crown.rotation.z = Math.sin(time * 0.83 + 2.0) * 0.05;

      shadowAge += dt;
      const key = `${bend.toFixed(3)}`;
      if (shadowAge < 0.12 && key === lastKey) return;
      shadowAge = 0;
      lastKey = key;

      const parent = group.parent;
      if (parent) parent.remove(group);
      shadowScene.add(group);
      const previousTarget = activeRenderer.getRenderTarget();
      const previousClear = activeRenderer.getClearColor(new THREE.Color());
      const previousAlpha = activeRenderer.getClearAlpha();
      activeRenderer.setRenderTarget(shadowTarget);
      activeRenderer.setClearColor(0x000000, 1);
      activeRenderer.clear();
      const previousOverride = shadowScene.overrideMaterial;
      shadowScene.overrideMaterial = silhouette;
      activeRenderer.render(shadowScene, shadowCamera);
      shadowScene.overrideMaterial = previousOverride;
      activeRenderer.setRenderTarget(previousTarget);
      activeRenderer.setClearColor(previousClear, previousAlpha);
      shadowScene.remove(group);
      if (parent) parent.add(group);
    },
    dispose() {
      shadowTarget.dispose();
      silhouette.dispose();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

export function sampleNormal(x: number, z: number) {
  return terrainNormal(x, z);
}

export function clampToWater(x: number, z: number, margin = 2) {
  let px = x;
  let pz = z;
  for (let i = 0; i < 12; i++) {
    if (shoreDistance(px, pz) < -margin) break;
    px -= 0.6;
    pz -= 0.6;
  }
  return { x: px, z: pz };
}

export function lerpAngle(a: number, b: number, t: number) {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

export { clamp01, smoothstep };

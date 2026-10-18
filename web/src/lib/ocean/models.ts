import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Canvas textures                                                     */
/* ------------------------------------------------------------------ */

function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function splatter(
  ctx: CanvasRenderingContext2D,
  count: number,
  size: number,
  radius: () => number,
  color: (i: number) => string,
  band?: [number, number],
) {
  for (let i = 0; i < count; i++) {
    const y = band ? band[0] + Math.random() * (band[1] - band[0]) : Math.random();
    ctx.fillStyle = color(i);
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      y * size,
      radius() * size,
      radius() * size * 0.8,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

export type RaySpecies = "manta" | "eagle" | "stingray";

const rayTextures: Partial<Record<string, THREE.CanvasTexture>> = {};

function rayTexture(kind: string) {
  const cached = rayTextures[kind];
  if (cached) return cached;
  const texture = canvasTexture(512, (ctx, size) => {
    if (kind === "manta-back") {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, "#1d2731");
      grad.addColorStop(1, "#080d12");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "rgba(214,236,245,0.92)";
      for (const sx of [0.34, 0.66]) {
        ctx.beginPath();
        ctx.ellipse(size * sx, size * 0.18, size * 0.075, size * 0.11, sx < 0.5 ? 0.4 : -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(150,190,210,0.3)";
      ctx.lineWidth = size * 0.008;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(size * 0.5, size * 0.08);
        ctx.quadraticCurveTo(size * (0.2 + i * 0.1), size * 0.4, size * (0.1 + i * 0.135), size);
        ctx.stroke();
      }
    } else if (kind === "manta-belly") {
      ctx.fillStyle = "#f3efe4";
      ctx.fillRect(0, 0, size, size);
      splatter(ctx, 70, size, () => 0.014 + Math.random() * 0.03, () => "rgba(48,54,62,0.75)", [0.2, 0.95]);
      splatter(ctx, 26, size, () => 0.01 + Math.random() * 0.02, () => "rgba(48,54,62,0.35)", [0.05, 0.4]);
    } else if (kind === "eagle-back") {
      ctx.fillStyle = "#43332f";
      ctx.fillRect(0, 0, size, size);
      splatter(ctx, 90, size, () => 0.014 + Math.random() * 0.028, () => "rgba(240,238,232,0.92)");
      for (let i = 0; i < 26; i++) {
        ctx.strokeStyle = "rgba(240,238,232,0.55)";
        ctx.lineWidth = size * 0.006;
        ctx.beginPath();
        ctx.arc(Math.random() * size, Math.random() * size, size * (0.02 + Math.random() * 0.04), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(120,96,88,0.6)";
      ctx.beginPath();
      ctx.ellipse(size * 0.5, size * 0.16, size * 0.1, size * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "eagle-belly") {
      ctx.fillStyle = "#e9e1d4";
      ctx.fillRect(0, 0, size, size);
      splatter(ctx, 40, size, () => 0.01 + Math.random() * 0.012, () => "rgba(120,110,100,0.3)", [0.2, 0.9]);
    } else if (kind === "stingray-back") {
      ctx.fillStyle = "#a98a5f";
      ctx.fillRect(0, 0, size, size);
      const glow = ctx.createRadialGradient(size * 0.5, size * 0.45, 0, size * 0.5, size * 0.45, size * 0.55);
      glow.addColorStop(0, "rgba(190,164,116,0.85)");
      glow.addColorStop(1, "rgba(120,98,66,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
      splatter(ctx, 46, size, () => 0.012 + Math.random() * 0.022, () => "rgba(64,214,255,0.95)");
      splatter(ctx, 18, size, () => 0.008 + Math.random() * 0.014, () => "rgba(150,240,255,0.8)");
      // eyes + spiracles
      ctx.fillStyle = "#20242a";
      for (const sx of [0.42, 0.58]) {
        ctx.beginPath();
        ctx.arc(size * sx, size * 0.24, size * 0.026, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const sx of [0.47, 0.53]) {
        ctx.beginPath();
        ctx.ellipse(size * sx, size * 0.32, size * 0.014, size * 0.022, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#efe7dc";
      ctx.fillRect(0, 0, size, size);
      splatter(ctx, 30, size, () => 0.012 + Math.random() * 0.02, () => "rgba(170,150,130,0.28)");
    }
  });
  rayTextures[kind] = texture;
  return texture;
}

const silhouetteCache: Partial<Record<string, THREE.CanvasTexture>> = {};

function silhouetteTexture(species: RaySpecies) {
  const cached = silhouetteCache[species];
  if (cached) return cached;
  const texture = canvasTexture(256, (ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#fff";
    if (species === "stingray") {
      ctx.beginPath();
      ctx.ellipse(size * 0.5, size * 0.48, size * 0.44, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(size * 0.47, size * 0.7, size * 0.06, size * 0.28);
    } else {
      ctx.beginPath();
      ctx.moveTo(size * 0.5, size * 0.06);
      ctx.quadraticCurveTo(size * 0.98, size * 0.24, size * 0.96, size * 0.46);
      ctx.quadraticCurveTo(size * 0.72, size * 0.6, size * 0.5, size * 0.62);
      ctx.quadraticCurveTo(size * 0.28, size * 0.6, size * 0.04, size * 0.46);
      ctx.quadraticCurveTo(size * 0.02, size * 0.24, size * 0.5, size * 0.06);
      ctx.fill();
      ctx.fillRect(size * 0.47, size * 0.58, size * 0.06, size * 0.4);
    }
  });
  texture.flipY = true;
  silhouetteCache[species] = texture;
  return texture;
}

/* ------------------------------------------------------------------ */
/* Ray geometry                                                        */
/* ------------------------------------------------------------------ */

const RAY_FLAP_GLSL = /* glsl */ `
  attribute float aSpan;
  attribute float aChord;
  uniform float uFlap;
  uniform float uAmp;
  uniform float uBend;
`;

function wingVertexTransform(kind: "wing" | "disc") {
  if (kind === "wing") {
    return /* glsl */ `
      float span = abs(aSpan);
      float wave = sin(uFlap + span * 2.6 - aChord * 1.1);
      transformed.y += wave * uAmp * pow(span, 1.5) * 1.15;
      transformed.z += wave * uAmp * span * 0.16;
      transformed.y += uBend * (aChord - 0.4) * 0.4;
      transformed.y += span * span * -0.05;
    `;
  }
  return /* glsl */ `
    float edge = smoothstep(0.12, 1.0, aChord);
    transformed.y += sin(uFlap - aChord * 4.4) * uAmp * edge * 1.6;
    transformed.y += uBend * (aChord - 0.5) * 0.2;
  `;
}

type SheetBuilder = {
  positions: number[];
  uvs: number[];
  spans: number[];
  chords: number[];
  indices: number[];
};

function buildWingSheets(options: {
  span: number;
  length: number;
  thickness: number;
  sweep: number;
  chordBase: number;
  chordTip: number;
}) {
  const { span, length, thickness, sweep, chordBase, chordTip } = options;
  const ns = 64;
  const nc = 36;
  const sheets: SheetBuilder[] = [
    { positions: [], uvs: [], spans: [], chords: [], indices: [] },
    { positions: [], uvs: [], spans: [], chords: [], indices: [] },
  ];

  for (let sgn = 0; sgn < 2; sgn++) {
    const sheet = sheets[sgn];
    const sign = sgn === 0 ? 1 : -1;
    for (let i = 0; i <= ns; i++) {
      const s = -1 + (2 * i) / ns;
      const absS = Math.abs(s);
      for (let j = 0; j <= nc; j++) {
        const t = j / nc;
        // Kite-shaped plan form: a nearly straight leading edge with a gentle
        // sweep, and a trailing edge cutting inward towards the wingtips.
        const leadZ = -length * 0.5 + Math.pow(absS, 1.6) * length * sweep;
        const trailZ = length * chordBase * 0.5 - Math.pow(absS, 2.0) * length * chordTip;
        const z = leadZ + (trailZ - leadZ) * t;
        const x = s * span * 0.5;
        const dihedral = -Math.pow(absS, 2.4) * 0.2;
        const dome = Math.sin(Math.PI * t) * 0.06 * (1 - absS * 0.6);
        const taper = Math.pow(1 - Math.pow(absS, 2.6), 0.8) * Math.sin(Math.PI * Math.pow(t, 0.85));
        const y = dihedral + dome + sign * thickness * taper;
        sheet.positions.push(x, y, z);
        sheet.uvs.push((s + 1) * 0.5, t);
        sheet.spans.push(s);
        sheet.chords.push(t);
      }
    }
    for (let i = 0; i < ns; i++) {
      for (let j = 0; j < nc; j++) {
        const a = i * (nc + 1) + j;
        const b = a + 1;
        const c = a + (nc + 1);
        const d = c + 1;
        if (sign > 0) sheet.indices.push(a, c, b, b, c, d);
        else sheet.indices.push(a, b, c, b, d, c);
      }
    }
  }

  return sheets;
}

function buildDiscSheets(options: { radiusX: number; radiusZ: number; thickness: number }) {
  const { radiusX, radiusZ, thickness } = options;
  const rings = 36;
  const segments = 128;
  const sheets: SheetBuilder[] = [
    { positions: [], uvs: [], spans: [], chords: [], indices: [] },
    { positions: [], uvs: [], spans: [], chords: [], indices: [] },
  ];

  const outline = (a: number) => {
    // Snout at -z, rounded pectoral disc, slight rear taper.
    const front = Math.pow(Math.max(0, -Math.sin(a)), 3) * 0.22;
    const rear = Math.pow(Math.max(0, Math.sin(a)), 2) * 0.16;
    return 1 + front - rear;
  };

  for (let sgn = 0; sgn < 2; sgn++) {
    const sheet = sheets[sgn];
    const sign = sgn === 0 ? 1 : -1;
    for (let i = 0; i <= rings; i++) {
      const r = i / rings;
      for (let j = 0; j <= segments; j++) {
        const a = (j / segments) * Math.PI * 2;
        const scale = outline(a);
        const x = Math.cos(a) * radiusX * r * scale;
        const z = Math.sin(a) * radiusZ * r * scale;
        const dome = Math.sqrt(Math.max(0, 1 - r * r)) * thickness;
        const y = sign * dome;
        sheet.positions.push(x, y, z);
        sheet.uvs.push((x / (radiusX * 1.25) + 1) * 0.5, (z / (radiusZ * 1.25) + 1) * 0.5);
        sheet.spans.push(Math.cos(a) * r);
        sheet.chords.push((z / (radiusZ * 1.25) + 1) * 0.5);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * (segments + 1) + j;
        const b = a + 1;
        const c = a + (segments + 1);
        const d = c + 1;
        if (sign > 0) sheet.indices.push(a, c, b, b, c, d);
        else sheet.indices.push(a, b, c, b, d, c);
      }
    }
  }

  return sheets;
}

function sheetGeometry(sheet: SheetBuilder) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(sheet.positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(sheet.uvs, 2));
  geometry.setAttribute("aSpan", new THREE.Float32BufferAttribute(sheet.spans, 1));
  geometry.setAttribute("aChord", new THREE.Float32BufferAttribute(sheet.chords, 1));
  geometry.setIndex(sheet.indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildTail(options: {
  length: number;
  baseWidth: number;
  segments?: number;
  color: number;
  stripes?: boolean;
}) {
  const segments = options.segments ?? 56;
  const sides = 12;
  const positions: number[] = [];
  const indices: number[] = [];
  const along: number[] = [];
  const colors: number[] = [];
  const base = new THREE.Color(options.color);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const radius = options.baseWidth * (1 - Math.pow(t, 1.4)) * (1 - t * 0.25) + 0.005;
    const z = t * options.length;
    const y = -Math.pow(t, 2.2) * options.length * 0.1;
    const band = options.stripes ? (Math.sin(t * Math.PI * 10) > 0 ? 1.25 : 0.5) : 1;
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      positions.push(Math.cos(a) * radius, Math.sin(a) * radius * 0.6 + y, z);
      along.push(t);
      colors.push(base.r * band, base.g * band, base.b * band);
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j;
      const b = i * sides + ((j + 1) % sides);
      const c = (i + 1) * sides + j;
      const d = (i + 1) * sides + ((j + 1) % sides);
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.stripe = options.stripes;
  return mesh;
}

export type RayModel = {
  species: RaySpecies;
  group: THREE.Group;
  span: number;
  length: number;
  flap: { uFlap: THREE.IUniform; uAmp: THREE.IUniform; uBend: THREE.IUniform };
  shadow: THREE.Mesh;
  tail?: THREE.Mesh;
  materials: THREE.Material[];
};

export function createRay(species: RaySpecies): RayModel {
  const flap = {
    uFlap: { value: 0 },
    uAmp: { value: 0.4 },
    uBend: { value: 0 },
  };
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];
  const hook = wingVertexTransform(species === "stingray" ? "disc" : "wing");

  const attachAnimation = (material: THREE.MeshStandardMaterial) => {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uFlap = flap.uFlap;
      shader.uniforms.uAmp = flap.uAmp;
      shader.uniforms.uBend = flap.uBend;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${RAY_FLAP_GLSL}`)
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\n${hook}`,
        );
    };
    material.customProgramCacheKey = () => `ray-${species}-${material.map?.uuid ?? "none"}-${material.side}`;
  };

  const makeMaterial = (map: THREE.Texture, color: number) => {
    const material = new THREE.MeshPhysicalMaterial({
      map,
      color,
      roughness: 0.48,
      metalness: 0.03,
      clearcoat: 0.38,
      clearcoatRoughness: 0.58,
      side: THREE.DoubleSide,
    });
    attachAnimation(material);
    materials.push(material);
    return material;
  };

  if (species === "stingray") {
    const sheets = buildDiscSheets({ radiusX: 2.1, radiusZ: 1.8, thickness: 0.24 });
    const top = new THREE.Mesh(sheetGeometry(sheets[0]), makeMaterial(rayTexture("stingray-back"), 0xffffff));
    const bottom = new THREE.Mesh(sheetGeometry(sheets[1]), makeMaterial(rayTexture("stingray-belly"), 0xffffff));
    group.add(top, bottom);
    const tail = buildTail({ length: 1.5, baseWidth: 0.07, color: 0x7c6440, stripes: true });
    tail.position.z = 1.1;
    group.add(tail);
    const eyeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x14171b,
      roughness: 0.16,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    });
    materials.push(eyeMaterial);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 28, 20), eyeMaterial);
      eye.position.set(sx * 0.38, 0.16, -0.42);
      group.add(eye);
    }
    const spine = new THREE.Mesh(
      new THREE.ConeGeometry(0.022, 0.5, 16, 4),
      new THREE.MeshPhysicalMaterial({ color: 0xd8c9a5, roughness: 0.4, clearcoat: 0.35 }),
    );
    materials.push(spine.material as THREE.Material);
    spine.rotation.x = -0.3;
    spine.position.set(0, 0.04, 1.95);
    group.add(spine);
    const span = 4.2;
    const length = 3.6;
    return { species, group, span, length, flap, shadow: makeShadow("stingray", span, length), tail, materials };
  }

  const isManta = species === "manta";
  const sheets = buildWingSheets({
    span: isManta ? 3.7 : 3.2,
    length: isManta ? 3.3 : 2.7,
    thickness: isManta ? 0.16 : 0.11,
    sweep: isManta ? 0.85 : 0.7,
    chordBase: isManta ? 1.0 : 0.92,
    chordTip: isManta ? 0.42 : 0.36,
  });
  const top = new THREE.Mesh(
    sheetGeometry(sheets[0]),
    makeMaterial(rayTexture(isManta ? "manta-back" : "eagle-back"), 0xffffff),
  );
  const bottom = new THREE.Mesh(
    sheetGeometry(sheets[1]),
    makeMaterial(rayTexture(isManta ? "manta-belly" : "eagle-belly"), 0xffffff),
  );
  group.add(top, bottom);

  if (isManta) {
    const finMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1b242d,
      roughness: 0.48,
      clearcoat: 0.3,
      clearcoatRoughness: 0.55,
    });
    materials.push(finMaterial);
    for (const sx of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * 0.28, 0.03, -1.25),
        new THREE.Vector3(sx * 0.33, 0.1, -1.52),
        new THREE.Vector3(sx * 0.25, 0.16, -1.78),
      ]);
      const fin = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.055, 10, false), finMaterial);
      fin.scale.set(1.0, 0.72, 1.0);
      group.add(fin);
    }
  }

  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0d1116,
    roughness: 0.18,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
  });
  materials.push(eyeMaterial);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 28, 20), eyeMaterial);
    eye.position.set(sx * 0.34, 0.1, -1.18);
    group.add(eye);
  }

  const tail = buildTail({
    length: isManta ? 1.6 : 2.9,
    baseWidth: isManta ? 0.08 : 0.055,
    color: isManta ? 0x161b21 : 0x2a2020,
    stripes: !isManta,
  });
  tail.position.z = isManta ? 1.42 : 1.16;
  group.add(tail);

  const span = isManta ? 5.4 : 4.6;
  const length = isManta ? 4.6 : 3.8;
  return { species, group, span, length, flap, shadow: makeShadow(species, span, length), tail, materials };
}

function makeShadow(species: RaySpecies, span: number, length: number) {
  const texture = silhouetteTexture(species);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.34,
    color: 0x0a1a1a,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(span * 1.25, length * 1.5), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  mesh.renderOrder = -1;
  mesh.name = "ray-shadow";
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Camera-facing ribbons (jelly tentacles + oral arms)                 */
/* ------------------------------------------------------------------ */

export class CameraRibbon {
  readonly mesh: THREE.Mesh;
  private positions: Float32Array;
  private uvs: Float32Array;
  private readonly segments: number;
  private readonly width: number;
  private readonly material: THREE.ShaderMaterial;

  constructor(options: {
    segments: number;
    width: number;
    color: THREE.Color;
    opacity: number;
    fade?: number;
  }) {
    this.segments = options.segments;
    this.width = options.width;
    const count = (options.segments + 1) * 2;
    this.positions = new Float32Array(count * 3);
    this.uvs = new Float32Array(count * 2);
    const indices: number[] = [];
    for (let i = 0; i < options.segments; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    for (let i = 0; i <= options.segments; i++) {
      const t = i / options.segments;
      this.uvs[i * 4] = 0;
      this.uvs[i * 4 + 1] = t;
      this.uvs[i * 4 + 2] = 1;
      this.uvs[i * 4 + 3] = t;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(this.uvs, 2));
    geometry.setIndex(indices);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: options.color.clone() },
        uOpacity: { value: options.opacity },
        uFade: { value: options.fade ?? 0.55 },
      },
      vertexShader: /* glsl */ `
        varying float vT;
        varying vec2 vUv;
        void main() {
          vT = uv.y;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uFade;
        varying float vT;
        varying vec2 vUv;
        void main() {
          float edge = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
          float tip = smoothstep(1.0, uFade, vT);
          float alpha = uOpacity * edge * tip;
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  setOpacity(value: number) {
    this.material.uniforms.uOpacity.value = value;
  }

  /** points: world-space spine from root to tip. */
  update(points: THREE.Vector3[], camera: THREE.Camera, taper = 0.45) {
    const count = Math.min(points.length, this.segments + 1);
    for (let i = 0; i < count; i++) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(count - 1, i + 1)];
      const tangent = new THREE.Vector3().subVectors(next, prev);
      if (tangent.lengthSq() < 1e-8) tangent.set(0, -1, 0);
      const view = new THREE.Vector3().subVectors(camera.position, p);
      const side = new THREE.Vector3().crossVectors(tangent, view);
      if (side.lengthSq() < 1e-8) side.set(1, 0, 0);
      side.normalize();
      const t = i / (count - 1);
      const w = this.width * (1 - taper * t) * 0.5;
      const idx = i * 6;
      this.positions[idx] = p.x - side.x * w;
      this.positions[idx + 1] = p.y - side.y * w;
      this.positions[idx + 2] = p.z - side.z * w;
      this.positions[idx + 3] = p.x + side.x * w;
      this.positions[idx + 4] = p.y + side.y * w;
      this.positions[idx + 5] = p.z + side.z * w;
    }
    (this.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}

/* ------------------------------------------------------------------ */
/* Jellyfish                                                           */
/* ------------------------------------------------------------------ */

export type JellySpecies = "moon" | "nettle";

const JELLY_BELL_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform vec3 uInner;
  uniform vec3 uRim;
  uniform vec3 uStripe;
  uniform float uOpacity;
  uniform float uStripeAmount;
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    vec3 lightDir = normalize(vec3(-0.48, 0.82, -0.3));
    float fres = pow(1.0 - abs(dot(n, viewDir)), 2.1);
    float glow = pow(max(dot(n, lightDir), 0.0), 1.6);
    vec3 color = mix(uInner, uRim, fres * 0.9 + glow * 0.08);
    float radial = sin(vUv.x * 6.2831853 * 24.0) * 0.5 + 0.5;
    float stripes = smoothstep(0.58, 0.96, radial) * smoothstep(0.04, 0.42, vUv.y);
    color = mix(color, uStripe, stripes * uStripeAmount);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 56.0);
    color += vec3(1.0, 0.94, 0.76) * spec * (0.34 + fres * 0.26);
    color += uRim * glow * 0.05;
    float alpha = uOpacity * (0.2 + 0.9 * fres);
    alpha *= 0.84 + 0.16 * sin(uTime * 2.0 + vUv.y * 6.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

const JELLY_BELL_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export type JellyModel = {
  species: JellySpecies;
  group: THREE.Group;
  bell: THREE.Mesh;
  radius: number;
  update: (
    time: number,
    dt: number,
    camera: THREE.Camera,
    state: { held: boolean; velocity: THREE.Vector3; pulse: number },
  ) => void;
  tentacleTips: THREE.Vector3[];
  materials: THREE.Material[];
};

export function createJelly(species: JellySpecies): JellyModel {
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];
  const moon = species === "moon";
  const bellRadius = moon ? 0.62 : 0.5;

  const profile: THREE.Vector2[] = [];
  const profileSteps = 64;
  for (let i = 0; i <= profileSteps; i++) {
    const t = i / profileSteps;
    const r = Math.pow(Math.sin(t * Math.PI * 0.56), 0.75) * bellRadius;
    const y = Math.cos(t * Math.PI * 0.56) * bellRadius * 0.86;
    profile.push(new THREE.Vector2(Math.max(r, 0.004), y));
  }
  // Flared rim lip.
  profile.push(new THREE.Vector2(bellRadius * 1.06, -bellRadius * 0.28));
  profile.push(new THREE.Vector2(bellRadius * 0.92, -bellRadius * 0.16));

  const bellGeometry = new THREE.LatheGeometry(profile, 128);
  const bellMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uInner: { value: new THREE.Color(moon ? 0xdff3f6 : 0xf0b46a) },
      uRim: { value: new THREE.Color(moon ? 0xa8e6f0 : 0xffd9a0) },
      uStripe: { value: new THREE.Color(0xb85c34) },
      uOpacity: { value: moon ? 0.42 : 0.5 },
      uStripeAmount: { value: moon ? 0.0 : 0.55 },
      uTime: { value: 0 },
    },
    vertexShader: JELLY_BELL_VERTEX,
    fragmentShader: JELLY_BELL_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(bellMaterial);

  const bell = new THREE.Mesh(bellGeometry, bellMaterial);
  group.add(bell);

  // Gonads / stomach.
  if (moon) {
    const gonadMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2a3c8,
      roughness: 0.5,
      transparent: true,
      opacity: 0.92,
    });
    materials.push(gonadMaterial);
    for (let i = 0; i < 4; i++) {
      const gonad = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.038, 12, 36, Math.PI * 1.15), gonadMaterial);
      gonad.position.set(Math.cos((i / 4) * Math.PI * 2) * 0.17, 0.16, Math.sin((i / 4) * Math.PI * 2) * 0.17);
      gonad.rotation.set(Math.PI / 2, (i / 4) * Math.PI * 2, 0);
      group.add(gonad);
    }
    const canalMaterial = new THREE.MeshBasicMaterial({
      color: 0xd8f2f7,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    materials.push(canalMaterial);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const start = new THREE.Vector3(Math.cos(angle) * 0.04, 0.11, Math.sin(angle) * 0.04);
      const end = new THREE.Vector3(
        Math.cos(angle) * bellRadius * 0.9,
        0.03,
        Math.sin(angle) * bellRadius * 0.9,
      );
      const mid = start.clone().lerp(end, 0.48);
      mid.y += 0.045;
      const canal = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, mid, end]), 18, 0.007, 6, false),
        canalMaterial,
      );
      group.add(canal);
    }
  } else {
    const stomachMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8a86a,
      roughness: 0.55,
      transparent: true,
      opacity: 0.9,
    });
    materials.push(stomachMaterial);
    const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 20), stomachMaterial);
    stomach.position.y = 0.14;
    stomach.scale.set(1, 0.8, 1);
    group.add(stomach);
  }

  if (moon) {
    const fringeMaterial = new THREE.MeshBasicMaterial({
      color: 0xe6f7fb,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    materials.push(fringeMaterial);
    for (let i = 0; i < 2; i++) {
      const fringe = new THREE.Mesh(
        new THREE.TorusGeometry(bellRadius * (1.0 + i * 0.04), 0.01, 8, 128),
        fringeMaterial,
      );
      fringe.rotation.x = Math.PI / 2;
      fringe.position.y = -bellRadius * 0.22 - i * 0.05;
      group.add(fringe);
    }
  }

  const tentacles: CameraRibbon[] = [];
  const tips: THREE.Vector3[] = [];
  const tentacleCount = moon ? 18 : 16;
  const tentacleLength = moon ? 1.05 : 3.2;
  const tentacleColor = new THREE.Color(moon ? 0xe7f6fa : 0xf3e3c8);

  for (let i = 0; i < tentacleCount; i++) {
    const angle = (i / tentacleCount) * Math.PI * 2 + (moon ? 0.12 : 0);
    const ribbon = new CameraRibbon({
      segments: 22,
      width: moon ? 0.026 : 0.045,
      color: tentacleColor,
      opacity: moon ? 0.52 : 0.64,
      fade: 0.32,
    });
    ribbon.mesh.userData.anchor = new THREE.Vector3(
      Math.cos(angle) * bellRadius * 1.02,
      -bellRadius * 0.24,
      Math.sin(angle) * bellRadius * 1.02,
    );
    ribbon.mesh.userData.length = tentacleLength * (0.78 + Math.random() * 0.38);
    ribbon.mesh.userData.phase = i * 1.31;
    ribbon.mesh.layers.set(2);
    tentacles.push(ribbon);
    tips.push(new THREE.Vector3());
    group.add(ribbon.mesh);
  }

  // Frilly oral arms for the sea nettle.
  const arms: CameraRibbon[] = [];
  const armCount = moon ? 4 : 6;
  for (let i = 0; i < armCount; i++) {
    const ribbon = new CameraRibbon({
      segments: 24,
      width: moon ? 0.075 : 0.2 + (i % 2) * 0.04,
      color: new THREE.Color(moon ? 0xeaf9fb : 0xf7ead6),
      opacity: moon ? 0.26 : 0.46,
      fade: 0.36,
    });
    ribbon.mesh.userData.angle = (i / armCount) * Math.PI * 2;
    ribbon.mesh.userData.length = moon ? 1.15 : 1.9 + (i % 3) * 0.16;
    ribbon.mesh.layers.set(2);
    arms.push(ribbon);
    group.add(ribbon.mesh);
  }

  const pointsBuffer = new THREE.Vector3();
  const worldAnchor = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  const update: JellyModel["update"] = (time, dt, camera, state) => {
    void dt;
    bellMaterial.uniforms.uTime.value = time;
    const pulse = state.pulse;
    const squash = 1 - pulse * 0.16;
    bell.scale.set(1 + pulse * 0.07, squash, 1 + pulse * 0.07);

    const velocity = state.velocity;
    const speed = velocity.length();
    const trail = velocity.clone().normalize().multiplyScalar(Math.min(speed * 0.45, 0.6));
    const droop = state.held ? 1 : 0.75;

    for (let i = 0; i < tentacles.length; i++) {
      const ribbon = tentacles[i];
      const anchor = ribbon.mesh.userData.anchor as THREE.Vector3;
      worldAnchor.copy(anchor);
      group.localToWorld(worldAnchor);
      const swayPhase = (ribbon.mesh.userData.phase as number) + time * 1.4;
      const ribbonLength = ribbon.mesh.userData.length as number;
      const count = ribbon.mesh.geometry.attributes.position.count / 2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j < count; j++) {
        const t = j / (count - 1);
        pointsBuffer
          .copy(worldAnchor)
          .addScaledVector(trail, -t * ribbonLength * 0.55)
          .addScaledVector(up, -t * ribbonLength * droop);
        const sway = Math.sin(swayPhase - t * 2.6) * 0.16 * t;
        const swayZ = Math.cos(swayPhase * 0.8 - t * 2.1) * 0.14 * t;
        pointsBuffer.x += sway;
        pointsBuffer.z += swayZ;
        pts.push(pointsBuffer.clone());
      }
      ribbon.update(pts, camera, 0.35);
      tips[i].copy(pts[pts.length - 1]);
    }

    for (let i = 0; i < arms.length; i++) {
      const ribbon = arms[i];
      const angle = ribbon.mesh.userData.angle as number;
      const armLength = ribbon.mesh.userData.length as number;
      const count = ribbon.mesh.geometry.attributes.position.count / 2;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j < count; j++) {
        const t = j / (count - 1);
        worldAnchor.set(Math.cos(angle) * 0.12, 0.05, Math.sin(angle) * 0.12);
        group.localToWorld(worldAnchor);
        pointsBuffer
          .copy(worldAnchor)
          .addScaledVector(trail, -t * armLength * 0.8)
          .addScaledVector(up, -t * armLength * 1.2 * droop);
        const frill = Math.sin(t * 9 + time * 2.2 + i) * 0.1 * t;
        pointsBuffer.x += Math.cos(angle) * frill;
        pointsBuffer.z += Math.sin(angle) * frill;
        pointsBuffer.x += Math.sin(angle + time * 0.7) * 0.14 * t;
        pointsBuffer.z += Math.cos(angle + time * 0.7) * 0.14 * t;
        pts.push(pointsBuffer.clone());
      }
      ribbon.update(pts, camera, 0.5);
    }
  };

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.layers.set(2);
  });

  return {
    species,
    group,
    bell,
    radius: bellRadius,
    update,
    tentacleTips: tips,
    materials,
  };
}

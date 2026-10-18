import * as THREE from "three";

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const contactShadowTexture = createContactShadowTexture();

const roofGeometry = new THREE.ConeGeometry(1, 1, 4, 1, false);
roofGeometry.rotateY(Math.PI / 4);
const trunkGeometry = new THREE.CylinderGeometry(0.09, 0.13, 1, 8);
const columnGeometry = new THREE.CylinderGeometry(0.055, 0.065, 1, 10);
const lanternGeometry = new THREE.SphereGeometry(1, 16, 12);
const broadLeafGeometry = new THREE.IcosahedronGeometry(1, 2);
const pineLeafGeometry = new THREE.ConeGeometry(1, 1, 12, 4);
const rockGeometry = new THREE.DodecahedronGeometry(1, 1);

export const PALETTE = {
  earth: "#9b9a73",
  earthLight: "#b9b890",
  earthDark: "#6f7459",
  water: "#5e9ca5",
  waterDeep: "#3e7681",
  waterLight: "#9bc4c2",
  road: "#d9cba8",
  stone: "#c8c0ad",
  stoneDark: "#817c72",
  wall: "#e8dfcc",
  wallWarm: "#d7c8ac",
  wood: "#6d4030",
  woodLight: "#9b6545",
  roof: "#3d4140",
  roofBlue: "#354b50",
  roofWarm: "#5e493c",
  gold: "#d6a84d",
  red: "#a74332",
  green: "#758f65",
  greenDark: "#3f6753",
  pine: "#496c55",
  pineDark: "#315846",
  tree: "#64815a",
  treeWarm: "#7f9159",
  brass: "#b78b4b",
};

export function material(
  color: string,
  roughness = 0.86,
  metalness = 0,
  emissive?: string,
) {
  const key = `${color}:${roughness}:${metalness}:${emissive ?? ""}`;
  const existing = materialCache.get(key);
  if (existing) return existing;
  const next = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    emissive: emissive ?? "#000000",
    emissiveIntensity: emissive ? 0.34 : 0,
  });
  materialCache.set(key, next);
  return next;
}

export function disposePrimitiveResources() {
  materialCache.forEach((item) => item.dispose());
  materialCache.clear();
  roofGeometry.dispose();
  trunkGeometry.dispose();
  columnGeometry.dispose();
  lanternGeometry.dispose();
  broadLeafGeometry.dispose();
  pineLeafGeometry.dispose();
  rockGeometry.dispose();
  contactShadowTexture.dispose();
}

function createContactShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context?.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient?.addColorStop(0, "rgba(28, 31, 25, 0.64)");
  gradient?.addColorStop(0.5, "rgba(28, 31, 25, 0.26)");
  gradient?.addColorStop(1, "rgba(28, 31, 25, 0)");
  if (context && gradient) {
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function addContactShadow(
  target: THREE.Object3D,
  width: number,
  depth: number,
  opacity = 0.48,
) {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({
      map: contactShadowTexture,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.034;
  shadow.renderOrder = 3;
  target.add(shadow);
  return shadow;
}

export function createRoof(
  width: number,
  depth: number,
  height: number,
  color = PALETTE.roof,
  ribs = true,
) {
  const group = new THREE.Group();
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const vertices = new Float32Array([
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    halfWidth, 0, halfDepth,
    -halfWidth, 0, halfDepth,
    -halfWidth, height, 0,
    halfWidth, height, 0,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex([
    0, 1, 5, 0, 5, 4,
    2, 3, 4, 2, 4, 5,
    0, 4, 3, 0, 3, 2,
    1, 2, 5,
  ]);
  geometry.computeVertexNormals();
  const roof = new THREE.Mesh(geometry, material(color, 0.78, 0.02));
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const ridgeMaterial = material(PALETTE.stoneDark, 0.72, 0.12);
  const ridge = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.01, 0.045, 0.055),
    ridgeMaterial,
  );
  ridge.position.y = height + 0.015;
  ridge.castShadow = true;
  group.add(ridge);

  const eave = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.045, 0.04, depth * 1.035),
    material(PALETTE.roofBlue, 0.76, 0.05),
  );
  eave.position.y = -0.01;
  eave.castShadow = true;
  group.add(eave);


  if (ribs && width * depth > 0.9) {
    const ribMaterial = material(PALETTE.roofBlue, 0.72, 0.06);
    const ribLength = Math.hypot(halfDepth, height);
    const ribGeometry = new THREE.BoxGeometry(0.026, 0.026, ribLength);
    const count = Math.min(12, Math.max(4, Math.round(width / 0.28)));
    for (let index = 1; index < count; index += 1) {
      const x = -halfWidth + (index / count) * width;
      for (const side of [-1, 1]) {
        const rib = new THREE.Mesh(ribGeometry, ribMaterial);
        rib.position.set(x, height / 2, side * halfDepth / 2);
        rib.rotation.x = side * -Math.atan2(height, halfDepth);
        group.add(rib);
      }
    }
  }
  return group;
}

export function createHouse(options: {
  width?: number;
  depth?: number;
  height?: number;
  wallColor?: string;
  roofColor?: string;
  windows?: boolean;
  ribs?: boolean;
}) {
  const {
    width = 1.2,
    depth = 0.9,
    height = 0.65,
    wallColor = PALETTE.wall,
    roofColor = PALETTE.roof,
    windows = true,
    ribs = true,
  } = options;
  const group = new THREE.Group();
  addContactShadow(group, width * 1.65, depth * 1.8, 0.38);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.06, 0.08, depth * 1.08),
    material(PALETTE.stoneDark, 0.94),
  );
  base.position.y = 0.04;
  base.receiveShadow = true;
  group.add(base);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    material(wallColor, 0.9),
  );
  body.position.y = 0.08 + height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const beamY = 0.08 + height + 0.025;
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.045, 0.05, depth * 1.045),
    material(PALETTE.wood, 0.78),
  );
  beam.position.y = beamY;
  beam.castShadow = true;
  group.add(beam);

  const roof = createRoof(width * 1.28, depth * 1.36, height * 0.48, roofColor, ribs);
  roof.position.y = 0.08 + height + 0.075;
  group.add(roof);

  if (windows) {
    const windowMaterial = material(PALETTE.wood, 0.68);
    const frontZ = depth / 2 + 0.01;
    const window = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(0.24, width * 0.25), 0.22, 0.025),
      windowMaterial,
    );
    window.position.set(-width * 0.2, 0.08 + height * 0.52, frontZ);
    group.add(window);
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(Math.min(0.25, width * 0.26), 0.36, 0.03),
      material(PALETTE.woodLight, 0.72),
    );
    door.position.set(width * 0.18, 0.08 + 0.18, frontZ + 0.005);
    group.add(door);
  }
  return group;
}

export function createPavilion(options: {
  radius?: number;
  height?: number;
  tiers?: number;
  roofColor?: string;
  wallColor?: string;
}) {
  const {
    radius = 0.8,
    height = 0.9,
    tiers = 1,
    roofColor = PALETTE.roofBlue,
    wallColor = PALETTE.wallWarm,
  } = options;
  const group = new THREE.Group();
  addContactShadow(group, radius * 3.2, radius * 3.2, 0.5);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.25, radius * 1.32, 0.12, 16),
    material(PALETTE.stone, 0.94),
  );
  platform.position.y = 0.06;
  platform.receiveShadow = true;
  group.add(platform);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.08, 12),
    material(PALETTE.woodLight, 0.8),
  );
  floor.position.y = 0.16;
  group.add(floor);

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const column = new THREE.Mesh(columnGeometry, material(PALETTE.wood, 0.75));
    column.position.set(Math.cos(angle) * radius * 0.72, 0.18 + height / 2, Math.sin(angle) * radius * 0.72);
    column.scale.y = height;
    column.castShadow = true;
    group.add(column);
  }

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, height * 0.68, 8),
    material(wallColor, 0.9),
  );
  wall.position.y = 0.18 + height * 0.36;
  wall.castShadow = true;
  group.add(wall);

  for (let tier = 0; tier < tiers; tier += 1) {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(radius * (1.07 - tier * 0.12), radius * 0.5, 8),
      material(roofColor, 0.78, 0.02),
    );
    roof.position.y = 0.18 + height + tier * 0.38;
    roof.rotation.y = Math.PI / 8;
    roof.castShadow = true;
    group.add(roof);
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 8),
      material(PALETTE.gold, 0.42, 0.46),
    );
    crown.position.y = roof.position.y + radius * 0.26;
    group.add(crown);
  }
  return group;
}

export function createPagoda(levels = 5, scale = 1) {
  const group = new THREE.Group();
  addContactShadow(group, 2.2 * scale, 2.2 * scale, 0.46);
  const stoneBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78 * scale, 0.9 * scale, 0.18 * scale, 8),
    material(PALETTE.stoneDark, 0.96),
  );
  stoneBase.position.y = 0.09 * scale;
  stoneBase.receiveShadow = true;
  group.add(stoneBase);

  for (let level = 0; level < levels; level += 1) {
    const levelScale = 1 - level * 0.1;
    const bodyHeight = (0.58 - level * 0.035) * scale;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5 * levelScale * scale, 0.56 * levelScale * scale, bodyHeight, 8),
      material(level % 2 ? PALETTE.wallWarm : PALETTE.wall, 0.9),
    );
    body.position.y = (0.18 + level * 0.55 + bodyHeight / 2) * scale;
    body.castShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.82 * levelScale * scale, 0.32 * scale, 8),
      material(PALETTE.roofBlue, 0.78, 0.02),
    );
    roof.position.y = (0.18 + level * 0.55 + bodyHeight + 0.15) * scale;
    roof.rotation.y = Math.PI / 8;
    roof.castShadow = true;
    group.add(roof);
  }
  const finial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 0.48 * scale, 8),
    material(PALETTE.gold, 0.38, 0.58),
  );
  finial.position.y = (0.3 + levels * 0.55) * scale;
  group.add(finial);
  return group;
}

export function createBridge(options: {
  length?: number;
  width?: number;
  arch?: number;
  axis?: "x" | "z";
  color?: string;
}) {
  const {
    length = 2.4,
    width = 0.58,
    arch = 0.42,
    axis = "x",
    color = PALETTE.stone,
  } = options;
  const group = new THREE.Group();
  const segmentCount = 9;
  const segmentLength = length / segmentCount;
  for (let index = 0; index < segmentCount; index += 1) {
    const t = (index + 0.5) / segmentCount;
    const y = Math.sin(t * Math.PI) * arch;
    const slope = Math.cos(t * Math.PI) * arch;
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(segmentLength * 1.06, 0.12, width),
      material(color, 0.92),
    );
    step.position.set(-length / 2 + (index + 0.5) * segmentLength, y, 0);
    step.rotation.z = Math.atan2(slope, segmentLength);
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);
  }
  for (const side of [-1, 1]) {
    for (let index = 0; index <= segmentCount; index += 2) {
      const t = index / segmentCount;
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.34, 0.07),
        material(PALETTE.stoneDark, 0.88),
      );
      post.position.set(-length / 2 + t * length, Math.sin(t * Math.PI) * arch + 0.22, side * width * 0.43);
      group.add(post);
    }
  }
  if (axis === "z") group.rotation.y = Math.PI / 2;
  return group;
}

export function createBoat(scale = 1, sailColor = PALETTE.red) {
  const group = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(0.92 * scale, 0.16 * scale, 0.34 * scale),
    material(PALETTE.wood, 0.74),
  );
  hull.position.y = 0.1 * scale;
  hull.castShadow = true;
  group.add(hull);
  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(0.19 * scale, 0.28 * scale, 4),
    material(PALETTE.woodLight, 0.7),
  );
  bow.rotation.z = -Math.PI / 2;
  bow.position.set(0.54 * scale, 0.1 * scale, 0);
  group.add(bow);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.34 * scale, 0.22 * scale, 0.27 * scale),
    material(PALETTE.wallWarm, 0.86),
  );
  cabin.position.set(-0.08 * scale, 0.27 * scale, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const roof = createRoof(0.48 * scale, 0.38 * scale, 0.12 * scale, PALETTE.roofBlue, false);
  roof.position.set(-0.08 * scale, 0.37 * scale, 0);
  group.add(roof);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018 * scale, 0.025 * scale, 0.72 * scale, 8),
    material(PALETTE.wood, 0.68),
  );
  mast.position.set(0.34 * scale, 0.45 * scale, 0);
  group.add(mast);
  const sail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42 * scale, 0.48 * scale),
    new THREE.MeshStandardMaterial({
      color: sailColor,
      side: THREE.DoubleSide,
      roughness: 0.92,
    }),
  );
  sail.position.set(0.25 * scale, 0.54 * scale, 0.01);
  group.add(sail);
  return group;
}

export function createTree(kind: "pine" | "broad" | "golden", scale = 1) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeometry, material(PALETTE.wood, 0.92));
  trunk.scale.set(scale, 0.42 * scale, scale);
  trunk.position.y = 0.21 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  if (kind === "pine") {
    const leafMaterial = material(PALETTE.pine, 0.92);
    for (let tier = 0; tier < 4; tier += 1) {
      const leaf = new THREE.Mesh(pineLeafGeometry, leafMaterial);
      const tierScale = (0.46 - tier * 0.065) * scale;
      leaf.scale.set(tierScale, (0.58 - tier * 0.06) * scale, tierScale);
      leaf.position.y = (0.38 + tier * 0.22) * scale;
      leaf.castShadow = true;
      group.add(leaf);
    }
  } else {
    const leafMaterial = material(kind === "golden" ? PALETTE.gold : PALETTE.tree, 0.9);
    const clusters = kind === "golden" ? 5 : 4;
    for (let index = 0; index < clusters; index += 1) {
      const angle = (index / clusters) * Math.PI * 2;
      const leaf = new THREE.Mesh(broadLeafGeometry, leafMaterial);
      leaf.scale.setScalar((0.33 + (index % 2) * 0.06) * scale);
      leaf.position.set(
        Math.cos(angle) * 0.16 * scale,
        (0.62 + (index % 3) * 0.13) * scale,
        Math.sin(angle) * 0.16 * scale,
      );
      leaf.castShadow = true;
      group.add(leaf);
    }
  }
  return group;
}

export function createRock(scale = 1) {
  const rock = new THREE.Mesh(rockGeometry, material(PALETTE.stoneDark, 1));
  rock.scale.set(scale, scale * 0.62, scale * 0.82);
  rock.rotation.set(scale * 0.7, scale, scale * 0.3);
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}

export function createLantern(scale = 1) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.024, 0.58 * scale, 8),
    material(PALETTE.wood, 0.8),
  );
  pole.position.y = 0.29 * scale;
  group.add(pole);
  const lantern = new THREE.Mesh(
    lanternGeometry,
    material(PALETTE.red, 0.64, 0, "#7d241d"),
  );
  lantern.scale.set(0.09 * scale, 0.13 * scale, 0.09 * scale);
  lantern.position.y = 0.55 * scale;
  group.add(lantern);
  return group;
}

export function createWaterPlane(
  width: number,
  depth: number,
  color = PALETTE.water,
  opacity = 0.94,
) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.34,
      metalness: 0.04,
      transparent: opacity < 1,
      opacity,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function createGate(scale = 1) {
  const group = new THREE.Group();
  addContactShadow(group, 2.2 * scale, 1.4 * scale, 0.46);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.1 * scale, 0.16 * scale, 0.7 * scale),
    material(PALETTE.stoneDark, 0.92),
  );
  base.position.y = 0.08 * scale;
  base.receiveShadow = true;
  group.add(base);
  for (const x of [-0.72, 0.72]) {
    for (const z of [-0.22, 0.22]) {
      const column = new THREE.Mesh(columnGeometry, material(PALETTE.red, 0.78));
      column.scale.y = 0.86 * scale;
      column.position.set(x * scale, 0.5 * scale, z * scale);
      column.castShadow = true;
      group.add(column);
    }
  }
  const roof = createRoof(2.25 * scale, 0.92 * scale, 0.46 * scale, PALETTE.roofWarm, true);
  roof.position.y = 0.91 * scale;
  group.add(roof);
  return group;
}

export function createWallSegment(length = 2, height = 0.48, scale = 1) {
  const group = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(length * scale, height * scale, 0.16 * scale),
    material(PALETTE.wallWarm, 0.92),
  );
  wall.position.y = height * scale / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);
  const roof = createRoof(length * 1.05 * scale, 0.28 * scale, 0.12 * scale, PALETTE.roof, false);
  roof.position.y = height * scale;
  group.add(roof);
  return group;
}

export function createCanal(width: number, depth: number) {
  const plane = createWaterPlane(width, depth, PALETTE.waterLight, 0.92);
  plane.position.y = 0.045;
  return plane;
}

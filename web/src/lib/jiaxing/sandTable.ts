import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { JIAXING_ATTRACTIONS } from "@/data/jiaxingAttractions";

import { createAttractionModel } from "./attractionModels";
import {
  PALETTE,
  createRock,
  createTree,
  material,
} from "./primitives";

export type SandTableCallbacks = {
  onSelect: (id: string) => void;
  onProject: (id: string, x: number, y: number, visible: boolean) => void;
  onReady?: () => void;
};

export type SandTableController = {
  select: (id: string, moveCamera?: boolean) => void;
  reset: () => void;
  setAutoRotate: (active: boolean) => void;
  zoomBy: (delta: number) => void;
  dispose: () => void;
};

const BOARD_WIDTH = 29;
const BOARD_DEPTH = 19.5;
const CAMERA_HOME = new THREE.Vector3(19.5, 23.5, 22);
const CAMERA_TARGET = new THREE.Vector3(0, 0.4, 0.8);

function gaussian(
  x: number,
  z: number,
  centerX: number,
  centerZ: number,
  radiusX: number,
  radiusZ: number,
  height: number,
) {
  const dx = (x - centerX) / radiusX;
  const dz = (z - centerZ) / radiusZ;
  return Math.exp(-(dx * dx + dz * dz)) * height;
}

export function terrainHeight(x: number, z: number) {
  const ridges =
    gaussian(x, z, 7.2, 6.1, 2.8, 2.1, 0.86) +
    gaussian(x, z, 10.2, 3.2, 2.2, 2.6, 0.72) +
    gaussian(x, z, -6.8, -2.8, 3.1, 2.2, 0.34) +
    gaussian(x, z, -5.8, 4.6, 3.8, 2.1, 0.28) +
    gaussian(x, z, 3.1, 6.3, 2.1, 1.5, 0.25);
  const ripples =
    Math.sin(x * 0.43 + z * 0.18) * 0.045 +
    Math.cos(z * 0.56 - x * 0.12) * 0.035;
  return 0.035 + ridges + ripples;
}

function createRoundedSlab(
  width: number,
  depth: number,
  radius: number,
  height: number,
) {
  const shape = new THREE.Shape();
  const left = -width / 2;
  const right = width / 2;
  const top = -depth / 2;
  const bottom = depth / 2;
  shape.moveTo(left + radius, top);
  shape.lineTo(right - radius, top);
  shape.quadraticCurveTo(right, top, right, top + radius);
  shape.lineTo(right, bottom - radius);
  shape.quadraticCurveTo(right, bottom, right - radius, bottom);
  shape.lineTo(left + radius, bottom);
  shape.quadraticCurveTo(left, bottom, left, bottom - radius);
  shape.lineTo(left, top + radius);
  shape.quadraticCurveTo(left, top, left + radius, top);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.18,
    bevelThickness: 0.12,
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function createBoard(scene: THREE.Scene) {
  const board = new THREE.Mesh(
    createRoundedSlab(BOARD_WIDTH + 0.8, BOARD_DEPTH + 0.8, 1.05, 0.72),
    material("#4a3528", 0.76, 0.08),
  );
  board.position.y = -0.72;
  board.receiveShadow = true;
  board.castShadow = true;
  scene.add(board);

  const frameMaterial = material(PALETTE.brass, 0.44, 0.52);
  const horizontal = new THREE.BoxGeometry(BOARD_WIDTH + 0.3, 0.035, 0.055);
  const vertical = new THREE.BoxGeometry(0.055, 0.035, BOARD_DEPTH + 0.3);
  for (const z of [-BOARD_DEPTH / 2 + 0.22, BOARD_DEPTH / 2 - 0.22]) {
    const rail = new THREE.Mesh(horizontal, frameMaterial);
    rail.position.set(0, 0.025, z);
    scene.add(rail);
  }
  for (const x of [-BOARD_WIDTH / 2 + 0.22, BOARD_WIDTH / 2 - 0.22]) {
    const rail = new THREE.Mesh(vertical, frameMaterial);
    rail.position.set(x, 0.025, 0);
    scene.add(rail);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(17, 64),
    new THREE.MeshBasicMaterial({
      color: "#6b5946",
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.74;
  scene.add(shadow);
}

function createTerrain(scene: THREE.Scene) {
  const geometry = new THREE.PlaneGeometry(
    BOARD_WIDTH - 0.9,
    BOARD_DEPTH - 0.9,
    84,
    58,
  );
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    positions.setY(index, terrainHeight(x, z));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geometry,
    material(PALETTE.earthLight, 0.97),
  );
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  scene.add(terrain);

  const southHaze = new THREE.Mesh(
    new THREE.CircleGeometry(7.4, 64),
    new THREE.MeshBasicMaterial({
      color: "#758c68",
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
    }),
  );
  southHaze.rotation.x = -Math.PI / 2;
  southHaze.position.set(7.2, 0.9, 6.1);
  scene.add(southHaze);

  return terrain;
}

function createRibbon(
  points: THREE.Vector3[],
  width: number,
  ribbonMaterial: THREE.Material,
  yOffset: number,
  segments = 90,
) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.4);
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x)
      .normalize()
      .multiplyScalar(width / 2);
    const left = point.clone().add(perpendicular);
    const right = point.clone().sub(perpendicular);
    left.y = terrainHeight(left.x, left.z) + yOffset;
    right.y = terrainHeight(right.x, right.z) + yOffset;
    vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);
    if (index < segments) {
      const offset = index * 2;
      indices.push(offset, offset + 1, offset + 2);
      indices.push(offset + 1, offset + 3, offset + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, ribbonMaterial);
  mesh.receiveShadow = true;
  return mesh;
}

function createWaterNetwork(scene: THREE.Scene) {
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: PALETTE.water,
    roughness: 0.3,
    metalness: 0.03,
    clearcoat: 0.24,
    clearcoatRoughness: 0.24,
    side: THREE.DoubleSide,
  });
  const channels = [
    [
      [-7.2, -0.6],
      [-4.4, -0.15],
      [-1.4, 0.4],
      [1.1, -0.2],
      [3.2, -1.2],
      [5.9, -2.1],
    ],
    [
      [-6.1, -0.6],
      [-5.3, 1.25],
      [-3.6, 1.35],
      [-1.1, 1.15],
      [0.3, 2.1],
      [3.75, 3.35],
    ],
    [
      [-0.5, 0.35],
      [0.1, 2.1],
      [1.9, 4.2],
      [2.1, 6.2],
    ],
    [
      [0.3, 2.1],
      [2.1, 2.8],
      [3.75, 3.35],
      [6.6, 6.6],
    ],
    [
      [3.2, -1.2],
      [4.8, 0.8],
      [4.6, 3.1],
      [3.8, 4.8],
    ],
  ];
  channels.forEach((channel, index) => {
    const points = channel.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const water = createRibbon(
      points,
      index === 2 ? 0.34 : 0.2 + index * 0.025,
      waterMaterial,
      0.08,
    );
    scene.add(water);
  });
}

function createRoads(scene: THREE.Scene) {
  const roadMaterial = material(PALETTE.road, 0.96);
  const outlineMaterial = material("#85765c", 0.98);
  const routes = [
    [[-6.1, -0.6], [-3.6, 1.35], [-1.4, 1.1], [0.3, 2.1]],
    [[0.3, 2.1], [2.1, 2.8], [3.7, 3.35], [6.6, 6.6]],
    [[-0.5, 0.35], [1.4, -0.8], [3.2, -1.2], [5.9, -2.1]],
    [[0.3, 2.1], [1.3, 4.3], [2.1, 6.2]],
    [[3.7, 3.35], [5.5, 3.7], [8.7, 4.15]],
  ];
  routes.forEach((route) => {
    const points = route.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const outline = createRibbon(points, 0.13, outlineMaterial, 0.085, 72);
    const road = createRibbon(points, 0.076, roadMaterial, 0.098, 72);
    scene.add(outline, road);
  });
}

function createScenery(scene: THREE.Scene) {
  let seed = 90210;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const attractionPositions = JIAXING_ATTRACTIONS.map((item) =>
    new THREE.Vector2(item.position[0], item.position[1]),
  );
  const treePositions: Array<[number, number, number?]> = [];
  let attempts = 0;
  while (treePositions.length < 118 && attempts < 900) {
    attempts += 1;
    const x = -13 + random() * 26;
    const z = -8.3 + random() * 16.6;
    const tooClose = attractionPositions.some(
      (position) => position.distanceTo(new THREE.Vector2(x, z)) < 1.45,
    );
    if (tooClose) continue;
    treePositions.push([x, z, 0.62 + random() * 0.72]);
  }
  treePositions.forEach(([x, z, scale]) => {
    const height = terrainHeight(x, z);
    const kind = height > 0.5 || random() > 0.68 ? "pine" : "broad";
    const tree = createTree(kind, scale ?? 0.8);
    tree.position.set(x, height, z);
    tree.rotation.y = random() * Math.PI * 2;
    scene.add(tree);
  });

  const rockPositions: Array<[number, number, number]> = [];
  for (let index = 0; index < 30; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 0.8 + random() * 1.9;
    const center = index % 2 === 0 ? [7.2, 6.1] : [10.1, 3.2];
    rockPositions.push([
      center[0] + Math.cos(angle) * radius,
      center[1] + Math.sin(angle) * radius * 0.7,
      0.18 + random() * 0.24,
    ]);
  }
  rockPositions.forEach(([x, z, scale]) => {
    const rock = createRock(scale);
    rock.position.set(x, terrainHeight(x, z) + 0.03, z);
    scene.add(rock);
  });
}

function findAttractionId(object: THREE.Object3D): string | undefined {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (typeof current.userData.attractionId === "string") {
      return current.userData.attractionId as string;
    }
    current = current.parent;
  }
  return undefined;
}

function createLighting(scene: THREE.Scene, lowPower: boolean) {
  const hemisphere = new THREE.HemisphereLight("#f6e6c8", "#536159", 1.48);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight("#ffd7a3", lowPower ? 2.25 : 2.75);
  sun.position.set(-11, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  sun.shadow.camera.left = -17;
  sun.shadow.camera.right = 17;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 3;
  scene.add(sun);

  const fill = new THREE.DirectionalLight("#a9c4c2", 0.66);
  fill.position.set(14, 9, -12);
  scene.add(fill);

  const warmBounce = new THREE.PointLight("#e5a15b", lowPower ? 4 : 7, 18, 2);
  warmBounce.position.set(-4, 2.5, 5);
  scene.add(warmBounce);
}

function createAttractionNodes(scene: THREE.Scene) {
  const nodes = new Map<string, THREE.Group>();
  const rings = new Map<string, THREE.Mesh>();
  const floaters: Array<{ object: THREE.Object3D; baseY: number; phase: number }> = [];

  JIAXING_ATTRACTIONS.forEach((attraction, index) => {
    const [x, z] = attraction.position;
    const y = terrainHeight(x, z);
    const anchor = new THREE.Group();
    anchor.position.set(x, y, z);
    anchor.userData.attractionId = attraction.id;
    anchor.userData.interactive = true;

    const model = createAttractionModel(attraction.id);
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData.attractionId = attraction.id;
        child.userData.interactive = true;
      }
      if (child.name.includes("boat")) {
        floaters.push({
          object: child,
          baseY: child.position.y,
          phase: index * 0.8 + floaters.length * 0.23,
        });
      }
    });
    anchor.add(model);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.035, 8, 52),
      new THREE.MeshStandardMaterial({
        color: attraction.accent,
        emissive: attraction.accent,
        emissiveIntensity: 0.35,
        roughness: 0.5,
        transparent: true,
        opacity: 0.74,
      }),
    );
    ring.name = `ring-${attraction.id}`;
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.075;
    ring.renderOrder = 5;
    rings.set(attraction.id, ring);
    anchor.add(ring);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.045, 0.82, 10),
      material(attraction.accent, 0.48, 0.18),
    );
    stem.position.y = 0.86;
    stem.castShadow = true;
    anchor.add(stem);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 12),
      material("#f0dfbb", 0.45, 0.24, attraction.accent),
    );
    cap.position.y = 1.28;
    cap.castShadow = true;
    anchor.add(cap);

    scene.add(anchor);
    nodes.set(attraction.id, anchor);
  });

  return { nodes, rings, floaters };
}

function easeInOutCubic(value: number) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function createSandTable(
  canvas: HTMLCanvasElement,
  callbacks: SandTableCallbacks,
): SandTableController {
  const lowPower =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory! <= 4;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.35 : 1.75));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#dedacf");
  scene.fog = new THREE.FogExp2("#dedacf", 0.016);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  camera.position.copy(CAMERA_HOME);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 11;
  controls.maxDistance = 42;
  controls.minPolarAngle = 0.48;
  controls.maxPolarAngle = 1.34;
  controls.rotateSpeed = 0.58;
  controls.zoomSpeed = 0.72;
  controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.autoRotateSpeed = 0.2;
  controls.target.copy(CAMERA_TARGET);
  controls.update();

  createBoard(scene);
  createTerrain(scene);
  createWaterNetwork(scene);
  createRoads(scene);
  createScenery(scene);
  createLighting(scene, lowPower);
  const { nodes, rings, floaters } = createAttractionNodes(scene);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const markerWorld = new THREE.Vector3();
  let selectedId = "nanhu";
  let pointerDown:
    | { id: number; x: number; y: number; time: number }
    | undefined;
  let cameraTween:
    | {
        startedAt: number;
        duration: number;
        cameraStart: THREE.Vector3;
        cameraEnd: THREE.Vector3;
        targetStart: THREE.Vector3;
        targetEnd: THREE.Vector3;
      }
    | undefined;

  function updateSelection(nextId: string) {
    selectedId = nextId;
    rings.forEach((ring, id) => {
      const isSelected = id === nextId;
      const ringMaterial = ring.material as THREE.MeshStandardMaterial;
      ringMaterial.opacity = isSelected ? 0.98 : 0.56;
      ringMaterial.emissiveIntensity = isSelected ? 0.92 : 0.28;
      ring.scale.setScalar(isSelected ? 1.2 : 0.9);
    });
  }

  function focusCamera(id: string) {
    const node = nodes.get(id);
    if (!node) return;
    const targetEnd = node.position.clone().add(new THREE.Vector3(0, 0.7, 0));
    const cameraEnd = targetEnd.clone().add(new THREE.Vector3(6.2, 7.6, 6.4));
    cameraTween = {
      startedAt: performance.now(),
      duration: 900,
      cameraStart: camera.position.clone(),
      cameraEnd,
      targetStart: controls.target.clone(),
      targetEnd,
    };
  }

  function select(id: string, moveCamera = true) {
    if (!nodes.has(id)) return;
    updateSelection(id);
    if (moveCamera) focusCamera(id);
  }

  function reset() {
    cameraTween = {
      startedAt: performance.now(),
      duration: 1000,
      cameraStart: camera.position.clone(),
      cameraEnd: CAMERA_HOME.clone(),
      targetStart: controls.target.clone(),
      targetEnd: CAMERA_TARGET.clone(),
    };
  }

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    pointerDown = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
  }

  function handlePointerUp(event: PointerEvent) {
    if (!pointerDown || pointerDown.id !== event.pointerId) return;
    const distance = Math.hypot(
      event.clientX - pointerDown.x,
      event.clientY - pointerDown.y,
    );
    const elapsed = performance.now() - pointerDown.time;
    pointerDown = undefined;
    if (distance > 8 || elapsed > 650) return;

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(Array.from(nodes.values()), true);
    const id = hits.map((hit) => findAttractionId(hit.object)).find(Boolean);
    if (id) {
      select(id);
      callbacks.onSelect(id);
    }
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", () => {
    pointerDown = undefined;
  });

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  updateSelection(selectedId);

  const clock = new THREE.Clock();
  let readySent = false;
  const animate = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    if (cameraTween) {
      const progress = Math.min(
        1,
        (performance.now() - cameraTween.startedAt) / cameraTween.duration,
      );
      const eased = easeInOutCubic(progress);
      camera.position.lerpVectors(
        cameraTween.cameraStart,
        cameraTween.cameraEnd,
        eased,
      );
      controls.target.lerpVectors(
        cameraTween.targetStart,
        cameraTween.targetEnd,
        eased,
      );
      if (progress >= 1) cameraTween = undefined;
    }

    rings.forEach((ring, id) => {
      const selected = id === selectedId;
      const pulse = 1 + Math.sin(elapsed * 2.4 + ring.position.x) * 0.055;
      ring.scale.setScalar((selected ? 1.2 : 0.9) * pulse);
      ring.rotation.z += delta * (selected ? 0.18 : 0.05);
    });
    floaters.forEach(({ object, baseY, phase }) => {
      object.position.y = baseY + Math.sin(elapsed * 1.5 + phase) * 0.027;
    });

    controls.update();
    nodes.forEach((node, id) => {
      markerWorld.set(0, 1.55, 0);
      node.localToWorld(markerWorld);
      projected.copy(markerWorld).project(camera);
      const visible =
        projected.z > -1.05 &&
        projected.z < 1.05 &&
        projected.x > -1.2 &&
        projected.x < 1.2 &&
        projected.y > -1.2 &&
        projected.y < 1.2;
      const x = (projected.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (-projected.y * 0.5 + 0.5) * canvas.clientHeight;
      callbacks.onProject(id, x, y, visible);
    });
    renderer.render(scene, camera);
    if (!readySent) {
      readySent = true;
      callbacks.onReady?.();
    }
  };
  renderer.setAnimationLoop(animate);

  return {
    select,
    reset,
    setAutoRotate: (active) => {
      controls.autoRotate = active;
    },
    zoomBy: (delta) => {
      const direction = camera.position.clone().sub(controls.target);
      const nextDistance = THREE.MathUtils.clamp(
        direction.length() * (1 + delta),
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.copy(
        controls.target.clone().add(direction.normalize().multiplyScalar(nextDistance)),
      );
      controls.update();
    },
    dispose: () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      controls.dispose();
      renderer.dispose();
    },
  };
}

export default createSandTable;

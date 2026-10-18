import * as THREE from "three";

import {
  PALETTE,
  createBoat,
  createBridge,
  createCanal,
  createGate,
  createHouse,
  createLantern,
  createPavilion,
  createPagoda,
  createRock,
  createTree,
  createWallSegment,
  createWaterPlane,
  material,
} from "./primitives";

function addTrees(
  group: THREE.Group,
  positions: Array<[number, number, number?]>,
  kind: "pine" | "broad" | "golden" = "broad",
  scale = 1,
) {
  positions.forEach(([x, z, localScale]) => {
    const tree = createTree(kind, localScale ?? scale);
    tree.position.set(x, 0.04, z);
    group.add(tree);
  });
}

function createHill(radius: number, height: number, color = PALETTE.greenDark) {
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    material(color, 1),
  );
  hill.scale.set(radius, height, radius);
  hill.receiveShadow = true;
  return hill;
}

function createCanalNetwork(axis: "x" | "z", length: number, width = 0.72) {
  const canal = createCanal(width, length);
  if (axis === "x") canal.rotation.z = Math.PI / 2;
  return canal;
}

function addRows(
  group: THREE.Group,
  count: number,
  distance: number,
  spread: number,
  options?: { flip?: boolean; compact?: boolean },
) {
  const { flip = false, compact = false } = options ?? {};
  const cell = spread / count;
  const rowWidth = Math.min(compact ? 0.54 : 0.66, cell * 0.66);
  const rowDepth = Math.min(compact ? 0.44 : 0.54, distance * 0.68);
  for (let index = 0; index < count; index += 1) {
    const z = -spread / 2 + ((index + 0.5) / count) * spread;
    const left = createHouse({
      width: rowWidth,
      depth: rowDepth,
      height: compact ? 0.48 : 0.58,
      roofColor: index % 2 ? PALETTE.roofBlue : PALETTE.roof,
      ribs: !compact,
    });
    left.position.set(-distance, 0, z);
    left.rotation.y = Math.PI / 2;
    group.add(left);

    const right = createHouse({
      width: rowWidth,
      depth: rowDepth,
      height: compact ? 0.48 : 0.58,
      roofColor: index % 3 ? PALETTE.roof : PALETTE.roofWarm,
      ribs: !compact,
    });
    right.position.set(distance, 0, z);
    right.rotation.y = flip ? -Math.PI / 2 : Math.PI / 2;
    group.add(right);
  }
}

function createNanhu() {
  const group = new THREE.Group();
  const lake = createWaterPlane(4.6, 2.7, PALETTE.water, 0.96);
  lake.position.y = 0.045;
  group.add(lake);

  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.16, 0.16, 28),
    material(PALETTE.earthLight, 1),
  );
  island.position.y = 0.16;
  island.receiveShadow = true;
  island.castShadow = true;
  group.add(island);

  const shore = new THREE.Mesh(
    new THREE.TorusGeometry(1.06, 0.055, 8, 48),
    material(PALETTE.stone, 0.94),
  );
  shore.rotation.x = Math.PI / 2;
  shore.position.y = 0.23;
  group.add(shore);

  const pavilion = createPavilion({ radius: 0.78, height: 0.92, tiers: 2 });
  pavilion.position.set(0, 0.22, 0);
  group.add(pavilion);

  const entrance = createGate(0.54);
  entrance.position.set(0, 0.22, 0.85);
  entrance.rotation.y = Math.PI;
  group.add(entrance);

  const redBoat = createBoat(0.82, "#a83228");
  redBoat.position.set(1.75, 0.03, 0.3);
  redBoat.rotation.y = -0.35;
  redBoat.name = "red-boat";
  group.add(redBoat);

  const touringBoat = createBoat(0.72, "#d4c18d");
  touringBoat.position.set(-1.62, 0.03, -0.42);
  touringBoat.rotation.y = 0.7;
  group.add(touringBoat);
  addTrees(group, [[-0.6, -0.48, 0.72], [0.65, -0.55, 0.68], [0.64, 0.56, 0.62]]);
  return group;
}

function createYuehe() {
  const group = new THREE.Group();
  const canal = createCanalNetwork("z", 4.75, 0.78);
  group.add(canal);
  addRows(group, 5, 0.96, 4.2, { compact: true });

  const bridge = createBridge({ length: 1.65, width: 0.66, arch: 0.48, axis: "x" });
  bridge.position.set(0, 0.08, 0.62);
  group.add(bridge);

  const stoneBridge = createBridge({ length: 1.4, width: 0.58, arch: 0.32, axis: "x" });
  stoneBridge.position.set(0, 0.08, -1.25);
  group.add(stoneBridge);

  for (const z of [-1.75, -0.72, 0.2, 1.18, 1.85]) {
    const lanternLeft = createLantern(0.68);
    lanternLeft.position.set(-0.75, 0.04, z);
    group.add(lanternLeft);
    const lanternRight = createLantern(0.68);
    lanternRight.position.set(0.76, 0.04, z + 0.16);
    group.add(lanternRight);
  }
  addTrees(group, [[-1.65, 1.42, 0.86], [1.62, -1.48, 0.82]]);
  return group;
}

function createWuzhen() {
  const group = new THREE.Group();
  const canal = createCanalNetwork("z", 5.4, 0.92);
  group.add(canal);
  addRows(group, 7, 1.05, 4.8, { compact: false });

  const firstBridge = createBridge({ length: 1.9, width: 0.62, arch: 0.5, axis: "x" });
  firstBridge.position.set(0, 0.08, 1.25);
  group.add(firstBridge);
  const secondBridge = createBridge({ length: 1.8, width: 0.58, arch: 0.42, axis: "x" });
  secondBridge.position.set(0, 0.08, -1.2);
  group.add(secondBridge);

  const dyeWorks = new THREE.Group();
  dyeWorks.position.set(-1.8, 0.04, -1.75);
  for (let index = 0; index < 5; index += 1) {
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.9 + (index % 2) * 0.22),
      new THREE.MeshStandardMaterial({
        color: index % 2 ? "#315b69" : "#d0b36f",
        roughness: 0.96,
        side: THREE.DoubleSide,
      }),
    );
    cloth.position.set(index * 0.18 - 0.36, 0.58, 0);
    cloth.rotation.y = -0.14;
    dyeWorks.add(cloth);
  }
  group.add(dyeWorks);

  const artHall = createHouse({
    width: 1.25,
    depth: 0.86,
    height: 0.74,
    wallColor: "#dfd7c8",
    roofColor: "#2f3738",
  });
  artHall.position.set(2.05, 0, -1.9);
  artHall.rotation.y = -Math.PI / 2;
  group.add(artHall);
  addTrees(group, [[-2.4, 2.05, 1], [2.46, 1.95, 0.92], [2.42, -2.2, 0.84]], "broad");
  return group;
}

function createXitang() {
  const group = new THREE.Group();
  const canal = createCanalNetwork("z", 5.5, 0.88);
  group.add(canal);
  addRows(group, 7, 0.96, 4.9, { flip: true, compact: true });

  const corridor = new THREE.Group();
  corridor.position.set(-1.15, 0.04, 0);
  const path = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.08, 4.5),
    material(PALETTE.stone, 0.92),
  );
  path.position.y = 0.04;
  path.receiveShadow = true;
  corridor.add(path);
  for (let index = 0; index < 11; index += 1) {
    const z = -2.1 + index * 0.42;
    for (const x of [-0.27, 0.27]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.045, 0.66, 8),
        material(PALETTE.wood, 0.8),
      );
      post.position.set(x, 0.39, z);
      corridor.add(post);
    }
  }
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.08, 4.65),
    material(PALETTE.roof, 0.8),
  );
  roof.position.y = 0.75;
  roof.rotation.z = -0.06;
  roof.castShadow = true;
  corridor.add(roof);
  group.add(corridor);

  const bridge = createBridge({ length: 1.75, width: 0.62, arch: 0.46, axis: "x" });
  bridge.position.set(0, 0.08, -0.2);
  group.add(bridge);
  const alleyWall = createWallSegment(2.1, 0.42, 1);
  alleyWall.position.set(1.8, 0.04, 1.85);
  alleyWall.rotation.y = Math.PI / 2;
  group.add(alleyWall);
  addTrees(group, [[2.1, -2.2, 0.82], [-2.25, -2.1, 0.76]]);
  return group;
}

function createPuyuan() {
  const group = new THREE.Group();
  const canal = createCanalNetwork("z", 3.7, 0.76);
  group.add(canal);
  addRows(group, 4, 0.96, 3.3, { compact: false });

  const gate = createGate(0.92);
  gate.position.set(-1.95, 0.04, 1.58);
  gate.rotation.y = Math.PI / 2;
  group.add(gate);

  const tower = createPavilion({ radius: 0.78, height: 1.16, tiers: 3, roofColor: "#4a4f48" });
  tower.position.set(1.85, 0.04, -1.47);
  group.add(tower);

  const fashionHall = createHouse({
    width: 1.55,
    depth: 1,
    height: 0.84,
    wallColor: "#ded4c2",
    roofColor: "#354b50",
  });
  fashionHall.position.set(1.78, 0.04, 0.86);
  fashionHall.rotation.y = -Math.PI / 2;
  group.add(fashionHall);

  const flags = ["#a94434", "#d0a04d", "#3a6f78", "#8c5e3d"];
  flags.forEach((color, index) => {
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.24),
      new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.9 }),
    );
    flag.position.set(-0.25 + index * 0.43, 0.77, 1.72);
    group.add(flag);
  });
  addTrees(group, [[-2.25, -1.35, 0.82], [2.36, 2.05, 0.92]]);
  return group;
}

function createYanguan() {
  const group = new THREE.Group();
  const river = createWaterPlane(5.2, 1.25, PALETTE.waterDeep, 0.97);
  river.position.set(0, 0.045, 1.05);
  group.add(river);

  const embankment = new THREE.Group();
  for (let index = 0; index < 5; index += 1) {
    const wall = createWallSegment(1.05, 0.48, 0.9);
    wall.position.set(-2.2 + index * 1.08, 0.04, 0.28);
    wall.rotation.y = 0.02 * (index % 2 ? 1 : -1);
    embankment.add(wall);
  }
  group.add(embankment);

  const tower = createPagoda(6, 0.74);
  tower.position.set(-1.55, 0.04, -0.82);
  group.add(tower);

  const temple = createHouse({
    width: 1.5,
    depth: 0.84,
    height: 0.62,
    wallColor: "#d8cab4",
    roofColor: PALETTE.roofWarm,
  });
  temple.position.set(0.38, 0.04, -1.18);
  group.add(temple);

  const academy = createHouse({
    width: 1.22,
    depth: 0.76,
    height: 0.56,
    wallColor: "#e3dccb",
    roofColor: PALETTE.roofBlue,
  });
  academy.position.set(1.82, 0.04, -0.78);
  academy.rotation.y = -0.2;
  group.add(academy);

  for (let index = 0; index < 4; index += 1) {
    const wave = new THREE.Mesh(
      new THREE.TorusGeometry(1.35 + index * 0.48, 0.035, 6, 42, Math.PI * 1.1),
      new THREE.MeshStandardMaterial({
        color: "#e8eee8",
        emissive: "#8eb9bd",
        emissiveIntensity: 0.12,
        transparent: true,
        opacity: 0.78,
        roughness: 0.45,
      }),
    );
    wave.rotation.x = Math.PI / 2;
    wave.rotation.z = -0.25;
    wave.position.set(-0.7 + index * 0.38, 0.09, 1.1 - index * 0.12);
    wave.scale.set(1, 0.55, 1);
    group.add(wave);
  }
  addTrees(group, [[-2.25, -1.52, 0.92], [2.35, -1.45, 0.84], [2.45, 0.2, 0.76]]);
  return group;
}

function createNanbeiLake() {
  const group = new THREE.Group();
  const lake = createWaterPlane(3.8, 2.2, "#679da4", 0.96);
  lake.position.set(0.25, 0.045, 0.2);
  group.add(lake);

  const eastHill = createHill(1.55, 1.18, "#55735d");
  eastHill.position.set(1.45, 0, 1.2);
  group.add(eastHill);
  const westHill = createHill(1.15, 0.82, "#607b60");
  westHill.position.set(-1.55, 0, 1.62);
  group.add(westHill);

  const ridge = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 1.5, 6, 12),
    material("#4f6c58", 1),
  );
  ridge.rotation.z = Math.PI / 2;
  ridge.rotation.y = 0.22;
  ridge.scale.set(1, 0.78, 1);
  ridge.position.set(0.6, 0.52, 1.68);
  ridge.castShadow = true;
  group.add(ridge);

  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.8, 0.14, 24),
    material(PALETTE.earthLight, 1),
  );
  island.position.set(0.15, 0.14, 0.25);
  island.castShadow = true;
  group.add(island);
  const pavilion = createPavilion({ radius: 0.46, height: 0.72, tiers: 2 });
  pavilion.position.set(0.15, 0.2, 0.25);
  group.add(pavilion);

  const temple = createHouse({
    width: 1.1,
    depth: 0.72,
    height: 0.58,
    wallColor: "#ded4bf",
    roofColor: PALETTE.roofWarm,
  });
  temple.position.set(-1.15, 0.4, 1.35);
  temple.rotation.y = 0.18;
  group.add(temple);

  const stoneCity = createWallSegment(1.5, 0.5, 0.8);
  stoneCity.position.set(1.8, 0.86, 1.05);
  stoneCity.rotation.y = 0.12;
  group.add(stoneCity);
  addTrees(group, [[-1.95, 0.58, 0.96], [2.03, 0.38, 0.88], [1.75, 2.12, 1.02], [-0.85, 2.05, 0.84] ], "pine");
  return group;
}

function createMeihuazhou() {
  const group = new THREE.Group();
  const canalX = createCanal(0.72, 4.7);
  canalX.rotation.z = Math.PI / 2;
  canalX.position.set(0, 0.045, 0.15);
  group.add(canalX);
  const canalZ = createCanal(0.68, 4.1);
  canalZ.position.set(0.15, 0.048, 0);
  group.add(canalZ);

  const temple = createHouse({
    width: 1.62,
    depth: 0.9,
    height: 0.72,
    wallColor: "#d8cfba",
    roofColor: PALETTE.roofWarm,
  });
  temple.position.set(-1.25, 0.04, -1.25);
  group.add(temple);

  const pagoda = createPavilion({ radius: 0.56, height: 0.92, tiers: 3 });
  pagoda.position.set(1.45, 0.04, -1.32);
  group.add(pagoda);

  const bridgeOne = createBridge({ length: 1.55, width: 0.56, arch: 0.38, axis: "x" });
  bridgeOne.position.set(0.15, 0.08, 1.25);
  group.add(bridgeOne);
  const bridgeTwo = createBridge({ length: 1.42, width: 0.52, arch: 0.34, axis: "z" });
  bridgeTwo.position.set(-1.25, 0.08, 0.15);
  group.add(bridgeTwo);

  const ginkgo = createTree("golden", 1.65);
  ginkgo.position.set(-1.7, 0.05, 1.55);
  ginkgo.name = "ancient-ginkgo";
  group.add(ginkgo);
  const secondTree = createTree("golden", 0.92);
  secondTree.position.set(1.78, 0.05, 1.45);
  group.add(secondTree);

  const arch = createWallSegment(1.2, 0.36, 0.8);
  arch.position.set(1.42, 0.04, 0.73);
  arch.rotation.y = Math.PI / 2;
  group.add(arch);
  addTrees(group, [[2.08, -1.92, 0.92], [-1.95, -1.86, 0.84]]);
  return group;
}

function createJiulongshan() {
  const group = new THREE.Group();
  const sea = createWaterPlane(2.1, 4.8, "#376d79", 0.98);
  sea.position.set(1.55, 0.045, 0);
  group.add(sea);

  const hillA = createHill(1.65, 1.52, "#486755");
  hillA.position.set(-0.85, 0, 0.55);
  group.add(hillA);
  const hillB = createHill(1.45, 1.18, "#58735b");
  hillB.position.set(-0.95, 0, -1.05);
  group.add(hillB);
  const hillC = createHill(1.2, 0.92, "#647963");
  hillC.position.set(0.05, 0, 1.63);
  group.add(hillC);

  const lighthouseBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.38, 0.42, 16),
    material(PALETTE.stone, 0.88),
  );
  lighthouseBase.position.set(0.12, 0.72, 0.85);
  lighthouseBase.castShadow = true;
  group.add(lighthouseBase);
  const lighthouse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 0.72, 16),
    material("#d9d1bc", 0.74),
  );
  lighthouse.position.set(0.12, 1.26, 0.85);
  lighthouse.castShadow = true;
  group.add(lighthouse);
  const light = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.2, 16),
    material("#d6b25e", 0.4, 0.1, "#a87a20"),
  );
  light.position.set(0.12, 1.68, 0.85);
  group.add(light);

  const fort = createWallSegment(1.45, 0.5, 0.82);
  fort.position.set(-0.15, 0.24, -1.55);
  fort.rotation.y = -0.18;
  group.add(fort);

  const pavilion = createPavilion({ radius: 0.42, height: 0.62, tiers: 1 });
  pavilion.position.set(-1.2, 0.92, -0.2);
  group.add(pavilion);

  for (const [x, z] of [[1.2, 1.8], [1.45, 0.85], [1.6, -0.3], [1.35, -1.45], [1.65, -2.1]]) {
    const rock = createRock(0.34 + Math.abs(z) * 0.04);
    rock.position.set(x, 0.06, z);
    group.add(rock);
  }
  addTrees(group, [[-1.9, 1.55, 1.06], [-1.75, -0.28, 1.12], [-0.35, 2.05, 0.96], [0.35, -2.05, 0.84] ], "pine");
  return group;
}

export function createAttractionModel(id: string) {
  const builders: Record<string, () => THREE.Group> = {
    nanhu: createNanhu,
    yuehe: createYuehe,
    wuzhen: createWuzhen,
    xitang: createXitang,
    puyuan: createPuyuan,
    yanguan: createYanguan,
    "nanbei-lake": createNanbeiLake,
    meihuazhou: createMeihuazhou,
    jiulongshan: createJiulongshan,
  };
  return builders[id]?.() ?? new THREE.Group();
}

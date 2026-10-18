import * as THREE from "three";

import { CREATURE_KINDS, SPECIES_META, type CreatureKind } from "./creatures";
import { createJelly, createRay } from "./models";

/**
 * Renders each dock thumbnail from the actual in-scene 3D model, so the cards
 * always match what gets thrown into the water.
 */
export function renderCreatureThumbnails(size = { width: 384, height: 256 }) {
  const result: Partial<Record<CreatureKind, string>> = {};
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return result;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(size.width, size.height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, size.width / size.height, 0.1, 100);
  camera.layers.enableAll();
  const light = new THREE.DirectionalLight(0xfff4e2, 2.4);
  light.position.set(3.5, 6, 4.5);
  scene.add(light);
  scene.add(new THREE.HemisphereLight(0xcdeef7, 0x1b2a30, 1.5));

  for (const kind of CREATURE_KINDS) {
    const meta = SPECIES_META[kind];
    const holder = new THREE.Group();
    let radius: number;

    if (meta.isRay) {
      const ray = createRay(kind as "manta" | "eagle" | "stingray");
      ray.group.rotation.x = -0.12;
      ray.group.rotation.y = 0.5;
      ray.flap.uAmp.value = 0.32;
      holder.add(ray.group);
      radius = ray.span * 0.52;
    } else {
      const jelly = createJelly(kind === "moon" ? "moon" : "nettle");
      jelly.group.rotation.z = 0.18;
      jelly.update(0.6, 0.016, camera, {
        held: false,
        velocity: new THREE.Vector3(0, 0.4, 0),
        pulse: 0.2,
      });
      holder.add(jelly.group);
      radius = 1.15;
    }

    scene.add(holder);
    const distance = radius * 2.5 + 1.4;
    camera.position.set(distance * 0.32, distance * 0.72, distance * 0.86);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    result[kind] = canvas.toDataURL("image/png");
    scene.remove(holder);

    holder.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material.dispose();
      }
    });
  }

  renderer.dispose();
  return result;
}

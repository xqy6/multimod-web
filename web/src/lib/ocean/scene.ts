import * as THREE from "three";

import { createSound } from "./audio";
import { CreatureField, MAX_CREATURES, type CreatureKind } from "./creatures";
import { createEffects } from "./effects";
import { bakeTerrainTexture, WORLD_EXTENT } from "./terrain";
import { createPalm, createSeabed, createTerrain } from "./world";
import { createRippleSim, createWater } from "./water";

export type OceanCounts = { rays: number; jellies: number; total: number };

export type OceanController = {
  throwCreature: (kind: CreatureKind) => void;
  beginHold: (kind: CreatureKind, clientX: number, clientY: number) => number;
  moveHold: (id: number, clientX: number, clientY: number) => void;
  endHold: (id: number, clientX: number, clientY: number) => void;
  setRain: (active: boolean) => void;
  setWhirlpool: (active: boolean) => void;
  setCalm: (active: boolean) => void;
  clearSea: () => void;
  setSound: (active: boolean) => boolean;
  counts: () => OceanCounts;
  dispose: () => void;
};

type Options = {
  onCounts?: (counts: OceanCounts) => void;
  onQualityChange?: (quality: number) => void;
};

const DEEP_CLEAR = new THREE.Color(0.016, 0.075, 0.2);
const HORIZON = new THREE.Color(0.62, 0.82, 0.9);
const CAMERA_HEIGHT = 48;
const CAMERA_DISTANCE = 13;

export function createOceanScene(canvas: HTMLCanvasElement, options: Options = {}): OceanController {
  THREE.ColorManagement.enabled = false;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = false;
  renderer.setClearColor(HORIZON, 1);

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1400);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);
  camera.lookAt(0, 0, 0);

  // --- lights -------------------------------------------------------
  const sunDirection = new THREE.Vector3(-0.42, 0.86, -0.3).normalize();
  const sun = new THREE.DirectionalLight(0xfff3df, 2.1);
  sun.position.copy(sunDirection).multiplyScalar(60);
  sun.layers.enableAll();
  scene.add(sun);
  const fill = new THREE.HemisphereLight(0xbfe6f2, 0x3a4a4f, 1.35);
  fill.layers.enableAll();
  scene.add(fill);
  const ambient = new THREE.AmbientLight(0x9cc9d6, 0.55);
  ambient.layers.enableAll();
  scene.add(ambient);

  // --- world --------------------------------------------------------
  const terrainTexture = bakeTerrainTexture();
  const palm = createPalm(renderer);
  scene.add(palm.group);

  const terrain = createTerrain({
    terrain: terrainTexture,
    palmTexture: palm.shadowUniforms.palmTexture,
    palmRect: palm.shadowUniforms.palmRect,
    segments: 220,
  });
  scene.add(terrain.group);

  const seabed = createSeabed();
  scene.add(seabed);

  const sim = createRippleSim(renderer);
  const water = createWater({
    terrain: terrainTexture,
    terrainExtent: WORLD_EXTENT,
    sim,
    palmTexture: palm.shadowUniforms.palmTexture,
    palmRect: palm.shadowUniforms.palmRect,
  });
  scene.add(water.mesh);

  const effects = createEffects({ scene, sim, sandHeight: () => 0 });
  const sound = createSound();

  let counts: OceanCounts = { rays: 0, jellies: 0, total: 0 };
  const field = new CreatureField({
    scene,
    sim,
    effects,
    sound,
    onChange: () => {
      counts = field.counts();
      options.onCounts?.(counts);
    },
  });

  // --- render targets ----------------------------------------------
  let renderTarget = makeTarget(1);

  function makeTarget(scale: number) {
    const width = Math.max(256, Math.floor(canvas.clientWidth * scale * pixelRatio));
    const height = Math.max(256, Math.floor(canvas.clientHeight * scale * pixelRatio));
    const target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    water.uniforms.uRefract.value = target.texture;
    return target;
  }

  // --- sizing -------------------------------------------------------
  let quality = 1;
  let rtScale = 0.75;

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(pixelRatio * (quality === 1 ? 1 : quality === 2 ? 0.85 : 0.7));
    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.aspect = aspect;
    // Portrait screens need to pull back and pan up-left so the beach stays in frame.
    const portrait = THREE.MathUtils.clamp((1.2 - aspect) / 0.7, 0, 1);
    const zoom = 1 + portrait * 0.34;
    const targetX = -12 * portrait;
    const targetZ = -6 * portrait;
    camera.position.set(targetX, CAMERA_HEIGHT * zoom, targetZ + CAMERA_DISTANCE * zoom);
    camera.lookAt(targetX, 0, targetZ);
    camera.updateProjectionMatrix();
    water.uniforms.uResolution.value.set(
      width * renderer.getPixelRatio(),
      height * renderer.getPixelRatio(),
    );
    renderTarget.dispose();
    renderTarget = makeTarget(rtScale);
  }

  resize();
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  // --- interaction state -------------------------------------------
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  function toWaterPoint(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const point = raycaster.ray.intersectPlane(groundPlane, hit);
    return point ? point.clone() : null;
  }

  let rainTarget = 0;
  let rain = 0;
  let calmTarget = 0;
  let calm = 0;
  let whirlpoolActive = false;
  let whirlpoolStrength = 0;
  const whirlpool = new THREE.Vector2(4, 6);
  let draggingWhirlpool = false;
  let lastRipple = 0;
  let heldId: number | null = null;

  const onPointerDown = (event: PointerEvent) => {
    sound.unlock();
    const point = toWaterPoint(event.clientX, event.clientY);
    if (!point) return;
    if (whirlpoolActive) {
      draggingWhirlpool = true;
      whirlpool.set(point.x, point.z);
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    sim.drop(point.x, point.z, 0.09, 7);
    field.scare(point.x, point.z, 7);
  };

  const onPointerMove = (event: PointerEvent) => {
    const point = toWaterPoint(event.clientX, event.clientY);
    if (!point) return;
    if (draggingWhirlpool) {
      whirlpool.set(point.x, point.z);
      return;
    }
    if (heldId !== null) {
      field.moveHeld(heldId, point.x, point.z);
      return;
    }
    const now = performance.now();
    if (now - lastRipple > 130) {
      lastRipple = now;
      sim.drop(point.x, point.z, 0.018, 2.6);
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (draggingWhirlpool) {
      draggingWhirlpool = false;
      canvas.releasePointerCapture?.(event.pointerId);
      return;
    }
    if (heldId !== null) {
      const point = toWaterPoint(event.clientX, event.clientY);
      if (point) field.moveHeld(heldId, point.x, point.z);
      field.dropHeld(heldId);
      heldId = null;
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);

  // --- intro creatures ---------------------------------------------
  const introTimers: number[] = [];
  let introCancelled = false;
  const introPlan: CreatureKind[] = ["manta", "eagle", "moon", "stingray", "moon", "eagle", "nettle"];
  introPlan.forEach((kind, index) => {
    introTimers.push(
      window.setTimeout(() => {
        if (!introCancelled) field.spawn(kind);
      }, 700 + index * 520),
    );
  });

  // --- render loop --------------------------------------------------
  const clock = new THREE.Clock();
  let elapsed = 0;
  let frameAccumulator = 0;
  let frameCount = 0;
  let raf = 0;
  let disposed = false;

  const renderFrame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    rain += (rainTarget - rain) * Math.min(1, dt * 2.4);
    calm += (calmTarget - calm) * Math.min(1, dt * 1.4);
    whirlpoolStrength += ((whirlpoolActive ? 1 : 0) - whirlpoolStrength) * Math.min(1, dt * 2);

    water.uniforms.uTime.value = elapsed;
    water.uniforms.uCamPos.value.copy(camera.position);
    water.uniforms.uPalmOffset.value.copy(palm.shadowUniforms.palmOffset);
    water.uniforms.uWhirl.value.set(whirlpool.x, whirlpool.y, whirlpoolStrength * (whirlpoolActive ? 1 : 0));
    water.uniforms.uRain.value = rain;
    water.uniforms.uSwell.value = THREE.MathUtils.lerp(1, 0.32, calm);

    for (const set of terrain.uniformSets) {
      set.uTime.value = elapsed;
      set.uCamPos.value.copy(camera.position);
      set.uPalmOffset.value.copy(palm.shadowUniforms.palmOffset);
      set.uWetness.value = 1;
    }

    sim.setRain(rain);
    effects.setRain(rain);
    sound.setRain(rain);
    sound.setSurf(0.5 + 0.5 * Math.sin(elapsed * 0.72));

    field.setWhirlpool(whirlpool.x, whirlpool.y, whirlpoolStrength * (whirlpoolActive ? 1 : 0));
    field.setCalm(calm > 0.5);

    sim.step(dt);
    water.uniforms.uHeight.value = sim.texture;

    field.update(dt, elapsed, camera);
    effects.update(dt, elapsed, camera);
    palm.update(elapsed, dt, renderer);

    // --- pass 1: underwater -----------------------------------------
    renderer.setRenderTarget(renderTarget);
    renderer.setClearColor(DEEP_CLEAR, 1);
    renderer.clear();
    camera.layers.set(0);
    renderer.render(scene, camera);

    // --- pass 2: water surface --------------------------------------
    renderer.setRenderTarget(null);
    renderer.setClearColor(HORIZON, 1);
    renderer.clear();
    camera.layers.set(1);
    renderer.render(scene, camera);

    // --- pass 3: everything above the waterline ---------------------
    camera.layers.set(2);
    renderer.render(scene, camera);

    // --- pass 4: spray, rings, rain ---------------------------------
    camera.layers.set(3);
    renderer.render(scene, camera);

    // --- adaptive quality -------------------------------------------
    frameAccumulator += dt;
    frameCount++;
    if (frameCount >= 75) {
      const average = frameAccumulator / frameCount;
      frameAccumulator = 0;
      frameCount = 0;
      if (average > 0.028 && quality < 3) {
        quality++;
        rtScale = quality === 2 ? 0.6 : 0.45;
        renderTarget.dispose();
        renderTarget = makeTarget(rtScale);
        resize();
        options.onQualityChange?.(quality);
      } else if (average < 0.0135 && quality > 1) {
        quality--;
        rtScale = quality === 1 ? 0.75 : 0.6;
        renderTarget.dispose();
        renderTarget = makeTarget(rtScale);
        resize();
        options.onQualityChange?.(quality);
      }
    }

    raf = requestAnimationFrame(renderFrame);
  };

  resize();
  raf = requestAnimationFrame(renderFrame);

  counts = field.counts();
  options.onCounts?.(counts);

  return {
    throwCreature(kind) {
      sound.unlock();
      const target = new THREE.Vector2(
        (Math.random() - 0.5) * 44,
        (Math.random() - 0.5) * 26 + 4,
      );
      const from = new THREE.Vector3(target.x * 0.45, 11, target.y + 13);
      field.spawn(kind, { target, origin: from });
    },
    beginHold(kind, clientX, clientY) {
      sound.unlock();
      const point = toWaterPoint(clientX, clientY);
      const x = point?.x ?? 0;
      const z = point?.z ?? 0;
      const id = field.hold(kind, x, z);
      heldId = id;
      return id;
    },
    moveHold(id, clientX, clientY) {
      const point = toWaterPoint(clientX, clientY);
      if (point) field.moveHeld(id, point.x, point.z);
    },
    endHold(id, clientX, clientY) {
      const point = toWaterPoint(clientX, clientY);
      if (point) field.moveHeld(id, point.x, point.z);
      field.dropHeld(id);
      if (heldId === id) {
        heldId = null;
      }
    },
    setRain(active) {
      rainTarget = active ? 1 : 0;
    },
    setWhirlpool(active) {
      whirlpoolActive = active;
    },
    setCalm(active) {
      calmTarget = active ? 1 : 0;
    },
    clearSea() {
      introCancelled = true;
      for (const timer of introTimers) window.clearTimeout(timer);
      introTimers.length = 0;
      field.clear();
    },
    setSound(active) {
      if (active) {
        sound.unlock();
        return sound.isEnabled();
      }
      sound.setEnabled(false);
      return false;
    },
    counts() {
      return field.counts();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      for (const timer of introTimers) window.clearTimeout(timer);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      sound.dispose();
      effects.dispose();
      field.clear();
      palm.dispose();
      sim.dispose();
      water.dispose();
      renderTarget.dispose();
      terrain.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const material = child.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      seabed.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const material = child.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      terrainTexture.dispose();
      renderer.dispose();
    },
  };
}

export { MAX_CREATURES };

import * as THREE from "three";

import { createJelly, createRay, type JellyModel, type RayModel } from "./models";
import { shoreDistance, terrainHeight } from "./terrain";
import { clamp01, lerpAngle } from "./world";
import type { SoundEngine } from "./audio";
import type { Effects } from "./effects";
import type { RippleSim } from "./water";

export type CreatureKind = "manta" | "eagle" | "stingray" | "moon" | "nettle";

export const RAY_KINDS: CreatureKind[] = ["manta", "eagle", "stingray"];
export const JELLY_KINDS: CreatureKind[] = ["moon", "nettle"];
export const CREATURE_KINDS: CreatureKind[] = [...RAY_KINDS, ...JELLY_KINDS];
export const MAX_CREATURES = 48;

export const SPECIES_META: Record<CreatureKind, { name: string; latin: string; isRay: boolean }> = {
  manta: { name: "Manta", latin: "Mobula birostris", isRay: true },
  eagle: { name: "Spotted Eagle Ray", latin: "Aetobatus narinari", isRay: true },
  stingray: { name: "Blue-spotted Stingray", latin: "Taeniura lymma", isRay: true },
  moon: { name: "Moon Jelly", latin: "Aurelia aurita", isRay: false },
  nettle: { name: "Sea Nettle", latin: "Chrysaora fuscescens", isRay: false },
};

type Arc = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
  height: number;
};

type State = "swim" | "fly" | "held" | "breach" | "rest";

type Creature = {
  kind: CreatureKind;
  isRay: boolean;
  group: THREE.Group;
  ray?: RayModel;
  jelly?: JellyModel;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  heading: number;
  bank: number;
  speed: number;
  state: State;
  arc?: Arc;
  wander: THREE.Vector2;
  wanderTimer: number;
  flee: number;
  breachTimer: number;
  flapPhase: number;
  pulse: number;
  pulseClock: number;
  heldHeight: number;
  dripTimer: number;
  layer: number;
  shadow?: THREE.Mesh;
  age: number;
};

const WATER_MIN = -5.2;
const BOUND_X = 58;
const BOUND_Z = 50;

export class CreatureField {
  private readonly scene: THREE.Scene;
  private readonly sim: RippleSim;
  private readonly effects: Effects;
  private readonly sound: SoundEngine;
  private readonly onChange: () => void;
  private creatures: Creature[] = [];
  private counter = 0;
  private whirlpool = new THREE.Vector3(0, 0, 0);
  private calm = false;

  constructor(options: {
    scene: THREE.Scene;
    sim: RippleSim;
    effects: Effects;
    sound: SoundEngine;
    onChange: () => void;
  }) {
    this.scene = options.scene;
    this.sim = options.sim;
    this.effects = options.effects;
    this.sound = options.sound;
    this.onChange = options.onChange;
  }

  setWhirlpool(x: number, z: number, strength: number) {
    this.whirlpool.set(x, 0, z);
    this.whirlpoolStrength = strength;
  }

  private whirlpoolStrength = 0;

  setCalm(calm: boolean) {
    this.calm = calm;
  }

  counts() {
    let rays = 0;
    let jellies = 0;
    for (const creature of this.creatures) {
      if (creature.isRay) rays++;
      else jellies++;
    }
    return { rays, jellies, total: this.creatures.length };
  }

  private makeRoom() {
    while (this.creatures.length >= MAX_CREATURES) {
      const oldest = this.creatures.shift();
      if (!oldest) break;
      this.destroy(oldest);
    }
  }

  spawn(kind: CreatureKind, options: { target?: THREE.Vector2; origin?: THREE.Vector3 } = {}) {
    this.makeRoom();
    const target =
      options.target ??
      new THREE.Vector2(
        (Math.random() - 0.5) * 54,
        (Math.random() - 0.5) * 34 + 6,
      );
    const clamped = this.toWater(target.x, target.y, 4);
    const to = new THREE.Vector3(clamped.x, 0, clamped.z);
    const from = options.origin ?? new THREE.Vector3(to.x * 0.4, 13 + Math.random() * 3, to.z + 16);

    const creature = this.build(kind, from);
    creature.state = "fly";
    creature.arc = {
      from: from.clone(),
      to,
      t: 0,
      duration: 0.85 + Math.random() * 0.25,
      height: 4 + Math.random() * 2,
    };
    creature.heading = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI;
    this.creatures.push(creature);
    this.sound.plink();
    this.onChange();
  }

  hold(kind: CreatureKind, x: number, z: number): number {
    this.makeRoom();
    const clamped = this.toWater(x, z, 3);
    const creature = this.build(kind, new THREE.Vector3(clamped.x, 2.4, clamped.z));
    creature.state = "held";
    creature.heading = Math.random() * Math.PI * 2;
    this.creatures.push(creature);
    this.onChange();
    return creature.group.id;
  }

  moveHeld(id: number, x: number, z: number) {
    const creature = this.creatures.find((c) => c.group.id === id);
    if (!creature || creature.state !== "held") return;
    const clamped = this.toWater(x, z, 3);
    creature.position.x = clamped.x;
    creature.position.z = clamped.z;
  }

  dropHeld(id: number) {
    const creature = this.creatures.find((c) => c.group.id === id);
    if (!creature || creature.state !== "held") return;
    creature.state = "swim";
    creature.velocity.set(0, -3.4, 0);
    const { x, z } = creature.position;
    this.effects.splash(x, z, creature.isRay ? 0.9 : 0.55);
    this.sound.splash(creature.isRay ? 0.8 : 0.45);
    this.sim.drop(x, z, 0.09, 6);
  }

  cancelHeld(id: number) {
    const creature = this.creatures.find((c) => c.group.id === id);
    if (!creature) return;
    this.creatures = this.creatures.filter((c) => c !== creature);
    this.destroy(creature);
    this.onChange();
  }

  scare(x: number, z: number, radius = 6) {
    if (this.calm) return;
    for (const creature of this.creatures) {
      if (creature.state !== "swim" && creature.state !== "rest") continue;
      const dx = creature.position.x - x;
      const dz = creature.position.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist > radius) continue;
      creature.flee = 1.6 + Math.random() * 0.8;
      const angle = Math.atan2(-dx, -dz);
      creature.wander.set(
        creature.position.x - Math.sin(angle) * 14,
        creature.position.z - Math.cos(angle) * 14,
      );
      creature.wanderTimer = 3.5;
      if (creature.kind === "stingray" && creature.state === "rest") {
        this.effects.silt(creature.position.x, creature.position.y, creature.position.z);
        creature.state = "swim";
      }
    }
  }

  clear() {
    for (const creature of this.creatures) this.destroy(creature);
    this.creatures = [];
    this.onChange();
  }

  update(dt: number, time: number, camera: THREE.Camera) {
    for (const creature of this.creatures) {
      creature.age += dt;
      if (creature.isRay) this.updateRay(creature, dt, time);
      else this.updateJelly(creature, dt, time, camera);
      creature.group.position.copy(creature.position);
      creature.group.rotation.set(
        creature.group.rotation.x,
        creature.heading,
        creature.group.rotation.z,
      );
      if (creature.isRay) this.updateRayShadow(creature);
    }
  }

  /* ---------------------------------------------------------------- */

  private build(kind: CreatureKind, position: THREE.Vector3): Creature {
    const meta = SPECIES_META[kind];
    const creature: Creature = {
      kind,
      isRay: meta.isRay,
      group: new THREE.Group(),
      position: position.clone(),
      velocity: new THREE.Vector3(),
      heading: Math.random() * Math.PI * 2,
      bank: 0,
      speed: meta.isRay ? 1.6 : 0.4,
      state: "swim",
      wander: new THREE.Vector2(),
      wanderTimer: 0,
      flee: 0,
      breachTimer: 12 + Math.random() * 20,
      flapPhase: Math.random() * Math.PI * 2,
      pulse: 0,
      pulseClock: Math.random() * 2,
      heldHeight: 2.4,
      dripTimer: 0,
      layer: -1,
      age: 0,
    };

    if (meta.isRay) {
      const ray = createRay(kind as RayModel["species"]);
      ray.group.scale.setScalar(kind === "stingray" ? 1.15 : 1.12 + Math.random() * 0.2);
      creature.ray = ray;
      creature.group.add(ray.group);
      creature.shadow = ray.shadow;
      this.scene.add(ray.shadow);
      creature.position.y = -2.2;
    } else {
      const jelly = createJelly(kind === "moon" ? "moon" : "nettle");
      jelly.group.scale.setScalar(0.85 + Math.random() * 0.4);
      creature.jelly = jelly;
      creature.group.add(jelly.group);
      creature.position.y = -2.4;
    }

    creature.group.position.copy(creature.position);
    this.scene.add(creature.group);
    creature.wander.set(
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 44,
    );
    creature.wanderTimer = 2 + Math.random() * 5;
    this.counter++;
    return creature;
  }

  private destroy(creature: Creature) {
    this.scene.remove(creature.group);
    creature.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
    if (creature.shadow) {
      this.scene.remove(creature.shadow);
      creature.shadow.geometry.dispose();
      (creature.shadow.material as THREE.Material).dispose();
    }
  }

  private setLayer(creature: Creature, layer: number) {
    if (creature.layer === layer) return;
    creature.layer = layer;
    creature.group.traverse((child) => child.layers.set(layer));
  }

  private toWater(x: number, z: number, margin: number) {
    let px = x;
    let pz = z;
    for (let i = 0; i < 40; i++) {
      if (shoreDistance(px, pz) < -margin) break;
      const cx = 6 - px;
      const cz = 8 - pz;
      const len = Math.hypot(cx, cz) || 1;
      px += (cx / len) * 1.4;
      pz += (cz / len) * 1.4;
    }
    px = THREE.MathUtils.clamp(px, -BOUND_X, BOUND_X);
    pz = THREE.MathUtils.clamp(pz, -BOUND_Z, BOUND_Z);
    return { x: px, z: pz };
  }

  private pickWander(creature: Creature) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = (Math.random() - 0.5) * 2 * BOUND_X * 0.8;
      const z = (Math.random() - 0.5) * 2 * BOUND_Z * 0.7 + 4;
      if (shoreDistance(x, z) < -10) {
        creature.wander.set(x, z);
        return;
      }
    }
    creature.wander.set(4, 6);
  }

  private updateRay(creature: Creature, dt: number, time: number) {
    const ray = creature.ray!;
    const isStingray = creature.kind === "stingray";

    // --- state machine ------------------------------------------------
    if (creature.state === "fly" && creature.arc) {
      const arc = creature.arc;
      arc.t += dt / arc.duration;
      const t = clamp01(arc.t);
      creature.position.lerpVectors(arc.from, arc.to, t);
      creature.position.y = THREE.MathUtils.lerp(arc.from.y, 0, t) + Math.sin(t * Math.PI) * arc.height;
      creature.group.rotation.x = -t * Math.PI * 0.55;
      if (arc.t >= 1) {
        creature.state = "swim";
        creature.position.y = -0.6;
        creature.velocity.set(0, -2.6, 0);
        creature.group.rotation.x = 0;
        this.effects.splash(creature.position.x, creature.position.z, 1);
        this.sound.splash(1);
      }
      ray.flap.uFlap.value += dt * 18;
      ray.flap.uAmp.value = 0.5;
      this.setLayer(creature, 2);
      return;
    }

    if (creature.state === "held") {
      creature.position.y += (creature.heldHeight + Math.sin(time * 2.4) * 0.09 - creature.position.y) * Math.min(1, dt * 6);
      creature.group.rotation.x = Math.sin(time * 1.6) * 0.12;
      ray.flap.uFlap.value += dt * 12;
      ray.flap.uAmp.value = 0.42;
      ray.flap.uBend.value = Math.sin(time * 2) * 0.3;
      this.setLayer(creature, 2);
      return;
    }

    if (creature.state === "breach") {
      creature.velocity.y -= 17 * dt;
      creature.position.addScaledVector(creature.velocity, dt);
      creature.group.rotation.x = -creature.velocity.y * 0.12;
      ray.flap.uFlap.value += dt * 20;
      ray.flap.uAmp.value = 0.55;
      this.setLayer(creature, creature.position.y < 0 ? 0 : 2);
      if (creature.position.y < -0.15 && creature.velocity.y < 0) {
        creature.state = "swim";
        creature.position.y = -0.9;
        creature.velocity.y = -1.2;
        creature.group.rotation.x = 0;
        this.effects.splash(creature.position.x, creature.position.z, 1.25);
        this.sound.splash(1.2);
      }
      return;
    }

    // --- swimming -----------------------------------------------------
    creature.wanderTimer -= dt;
    creature.flee = Math.max(0, creature.flee - dt);
    if (creature.wanderTimer <= 0) {
      this.pickWander(creature);
      creature.wanderTimer = 5 + Math.random() * 9;
    }

    let dirX = creature.wander.x - creature.position.x;
    let dirZ = creature.wander.y - creature.position.z;
    const distToTarget = Math.hypot(dirX, dirZ);
    if (distToTarget < 4) creature.wanderTimer = Math.min(creature.wanderTimer, 0.4);

    // Keep away from the beach and the world edge.
    const shore = shoreDistance(creature.position.x, creature.position.z);
    if (shore > -7) {
      const away = new THREE.Vector2(6 - creature.position.x, 8 - creature.position.z).normalize();
      dirX += away.x * 22;
      dirZ += away.y * 22;
    }
    if (Math.abs(creature.position.x) > BOUND_X - 8) dirX -= Math.sign(creature.position.x) * 18;
    if (Math.abs(creature.position.z) > BOUND_Z - 8) dirZ -= Math.sign(creature.position.z) * 18;

    if (creature.flee > 0) {
      dirX *= 2.2;
      dirZ *= 2.2;
    }

    const targetHeading = Math.atan2(-dirX, -dirZ);
    const previous = creature.heading;
    const turnRate = isStingray ? 1.6 : 2.1;
    creature.heading = lerpAngle(creature.heading, targetHeading, Math.min(1, dt * turnRate));
    let delta = creature.heading - previous;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    creature.bank += (THREE.MathUtils.clamp(delta * 5.5, -0.75, 0.75) - creature.bank) * Math.min(1, dt * 3);

    const baseSpeed = isStingray ? 0.9 : 1.9;
    const targetSpeed = creature.flee > 0 ? baseSpeed * 2.8 : this.calm ? baseSpeed * 0.45 : baseSpeed;
    creature.speed += (targetSpeed - creature.speed) * Math.min(1, dt * 1.4);

    const forwardX = -Math.sin(creature.heading);
    const forwardZ = -Math.cos(creature.heading);
    creature.position.x += forwardX * creature.speed * dt;
    creature.position.z += forwardZ * creature.speed * dt;

    // Depth: stingrays hug the sand, the others cruise mid-water.
    const sand = terrainHeight(creature.position.x, creature.position.z);
    const targetY = isStingray
      ? Math.max(sand + 0.22, WATER_MIN)
      : THREE.MathUtils.clamp(sand * 0.3 - 1.1, WATER_MIN, -1.1);
    creature.position.y += (targetY - creature.position.y) * Math.min(1, dt * 1.1);

    creature.group.rotation.x = THREE.MathUtils.lerp(creature.group.rotation.x, -creature.velocity.y * 0.2, dt * 2);
    creature.group.rotation.z = creature.bank;

    ray.flap.uFlap.value += dt * (isStingray ? 7.5 : 10.5) * (0.7 + creature.speed * 0.35);
    ray.flap.uAmp.value = isStingray ? 0.16 : 0.38;
    ray.flap.uBend.value = creature.bank * 0.55;

    // Surface wake + breach for the pelagic rays.
    if (!isStingray) {
      creature.breachTimer -= dt;
      if (creature.breachTimer <= 0 && creature.flee <= 0 && shore < -14 && !this.calm) {
        creature.breachTimer = 16 + Math.random() * 22;
        if (Math.random() < 0.6) {
          creature.state = "breach";
          creature.velocity.y = 8.5 + Math.random() * 2.5;
          this.sim.drop(creature.position.x, creature.position.z, 0.07, 5);
        }
      }
      if (creature.position.y > -1.1 && Math.random() < dt * 6) {
        this.sim.drop(creature.position.x, creature.position.z, 0.012, 2.2);
      }
    }

    this.setLayer(creature, creature.position.y < 0 ? 0 : 2);
  }

  private updateRayShadow(creature: Creature) {
    const shadow = creature.shadow;
    if (!shadow) return;
    const { x, z } = creature.position;
    const sand = terrainHeight(x, z);
    shadow.visible = creature.position.y < 0.6 && (creature.state === "swim" || creature.state === "rest");
    shadow.position.set(x, sand + 0.06, z);
    shadow.rotation.z = -creature.heading;
    const height = Math.max(0.2, Math.abs(creature.position.y - sand));
    const material = shadow.material as THREE.MeshBasicMaterial;
    material.opacity = THREE.MathUtils.clamp(0.34 - height * 0.02, 0.06, 0.34);
    const scale = 1 + height * 0.03;
    shadow.scale.setScalar(scale);
  }

  private updateJelly(creature: Creature, dt: number, time: number, camera: THREE.Camera) {
    const jelly = creature.jelly!;

    if (creature.state === "fly" && creature.arc) {
      const arc = creature.arc;
      arc.t += dt / arc.duration;
      const t = clamp01(arc.t);
      creature.position.lerpVectors(arc.from, arc.to, t);
      creature.position.y = THREE.MathUtils.lerp(arc.from.y, 0, t) + Math.sin(t * Math.PI) * arc.height;
      if (arc.t >= 1) {
        creature.state = "swim";
        creature.position.y = -0.8;
        this.effects.splash(creature.position.x, creature.position.z, 0.55);
        this.sound.splash(0.45);
      }
      this.setLayer(creature, 2);
      jelly.update(time, dt, camera, { held: true, velocity: creature.velocity, pulse: 0.4 });
      return;
    }

    if (creature.state === "held") {
      const bob = Math.sin(time * 1.7) * 0.07;
      creature.position.y += (creature.heldHeight + bob - creature.position.y) * Math.min(1, dt * 5);
      creature.velocity.set(0, 0, 0);
      creature.dripTimer -= dt;
      if (creature.dripTimer <= 0) {
        creature.dripTimer = 0.35 + Math.random() * 0.4;
        for (const tip of jelly.tentacleTips) {
          if (tip.y > 0.2) this.effects.drop(tip.x, tip.y, tip.z, 0.25);
        }
      }
      this.setLayer(creature, 2);
      creature.pulseClock += dt;
      const cycle = creature.pulseClock % 1;
      const pulse = cycle < 0.2 ? Math.sin((cycle / 0.2) * Math.PI) : 0;
      jelly.update(time, dt, camera, { held: true, velocity: creature.velocity, pulse });
      return;
    }

    // --- swimming -----------------------------------------------------
    creature.pulseClock += dt;
    const speedFactor = this.calm ? 0.55 : 1;
    const cycle = creature.pulseClock % 2.2;
    const pulse =
      cycle < 0.36
        ? Math.sin((cycle / 0.36) * Math.PI) * speedFactor
        : Math.max(0, Math.sin(((cycle - 0.36) / 1.84) * Math.PI)) * 0.18;
    creature.pulse = pulse;

    // Currents + whirlpool.
    const currentX = Math.sin(creature.position.z * 0.07 + time * 0.12) * 0.28 + Math.cos(creature.position.x * 0.05) * 0.16;
    const currentZ = Math.cos(creature.position.x * 0.06 + time * 0.09) * 0.28 + Math.sin(creature.position.z * 0.04) * 0.16;
    creature.velocity.x += (currentX - creature.velocity.x) * dt * 0.6;
    creature.velocity.z += (currentZ - creature.velocity.z) * dt * 0.6;

    if (this.whirlpoolStrength > 0.01) {
      const dx = this.whirlpool.x - creature.position.x;
      const dz = this.whirlpool.z - creature.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 30) {
        const pull = this.whirlpoolStrength * 3.4 / (dist + 3);
        creature.velocity.x += (dx / (dist || 1)) * pull * dt * 6;
        creature.velocity.z += (dz / (dist || 1)) * pull * dt * 6;
        creature.velocity.x += (-dz / (dist || 1)) * pull * 2.2 * dt * 6;
        creature.velocity.z += (dx / (dist || 1)) * pull * 2.2 * dt * 6;
      }
    }

    creature.velocity.y = pulse * 1.5 - (this.calm ? 0.05 : 0.22);
    creature.position.addScaledVector(creature.velocity, dt);
    creature.position.x = THREE.MathUtils.clamp(creature.position.x, -BOUND_X, BOUND_X);
    creature.position.z = THREE.MathUtils.clamp(creature.position.z, -BOUND_Z, BOUND_Z);

    const sand = terrainHeight(creature.position.x, creature.position.z);
    if (creature.position.y < sand + 0.5) creature.velocity.y = Math.abs(creature.velocity.y) * 0.7 + 0.2;
    if (creature.position.y > -0.55) creature.velocity.y -= 0.9 * dt * 6;
    creature.position.y = THREE.MathUtils.clamp(creature.position.y, sand + 0.5, -0.55);

    // Drift is slow, so tilt the bell along the motion.
    const tiltX = THREE.MathUtils.clamp(creature.velocity.z * 0.1, -0.3, 0.3);
    const tiltZ = THREE.MathUtils.clamp(-creature.velocity.x * 0.1, -0.3, 0.3);
    creature.group.rotation.x += (tiltX - creature.group.rotation.x) * Math.min(1, dt * 1.5);
    creature.group.rotation.z += (tiltZ - creature.group.rotation.z) * Math.min(1, dt * 1.5);
    creature.heading = 0;

    this.setLayer(creature, creature.position.y < 0 ? 0 : 2);
    jelly.update(time, dt, camera, { held: false, velocity: creature.velocity, pulse });
  }
}

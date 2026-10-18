import * as THREE from "three";

import type { RippleSim } from "./water";

function spriteTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.85)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

type Particle = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  kind: "droplet" | "silt" | "foam";
};

export type Effects = {
  splash: (x: number, z: number, strength?: number) => void;
  drop: (x: number, y: number, z: number, strength?: number) => void;
  silt: (x: number, y: number, z: number) => void;
  update: (dt: number, time: number, camera: THREE.Camera) => void;
  setRain: (amount: number) => void;
  setWhirlpool: (x: number, z: number, strength: number) => void;
  setQuality: (quality: number) => void;
  dispose: () => void;
};

export function createEffects(options: {
  scene: THREE.Scene;
  sim: RippleSim;
  sandHeight: (x: number, z: number) => number;
}): Effects {
  const { scene, sim, sandHeight } = options;
  const sprite = spriteTexture();

  const MAX_PARTICLES = 900;
  const particles: Particle[] = [];
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const sizes = new Float32Array(MAX_PARTICLES);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  const alphas = new Float32Array(MAX_PARTICLES);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
  geometry.setDrawRange(0, 0);

  const material = new THREE.ShaderMaterial({
    uniforms: { uSprite: { value: sprite } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec3 aColor;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * 320.0 / max(-mv.z, 0.1);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uSprite;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec4 tex = texture2D(uSprite, gl_PointCoord);
        if (tex.a * vAlpha < 0.01) discard;
        gl_FragColor = vec4(vColor, tex.a * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.layers.set(3);
  points.renderOrder = 5;
  scene.add(points);

  // Expanding rings on the surface.
  const ringGeometry = new THREE.RingGeometry(0.86, 1, 64);
  ringGeometry.rotateX(-Math.PI / 2);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xdff6ff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rings: { mesh: THREE.Mesh; life: number; max: number; size: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const mesh = new THREE.Mesh(ringGeometry, ringMaterial.clone());
    mesh.visible = false;
    mesh.layers.set(3);
    mesh.renderOrder = 4;
    scene.add(mesh);
    rings.push({ mesh, life: 0, max: 1, size: 1 });
  }
  let ringCursor = 0;

  const spawn = (particle: Particle) => {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(particle);
  };

  const spawnRing = (x: number, z: number, size: number, life = 1.4) => {
    const ring = rings[ringCursor % rings.length];
    ringCursor++;
    ring.life = 0;
    ring.max = life;
    ring.size = size;
    ring.mesh.visible = true;
    ring.mesh.position.set(x, 0.03, z);
    ring.mesh.scale.setScalar(size * 0.2);
    (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
  };

  const splash = (x: number, z: number, strength = 1) => {
    sim.drop(x, z, 0.1 * strength, 4 + 3 * strength);
    spawnRing(x, z, 1.6 + strength * 2.2, 1.5);
    spawnRing(x, z, 0.8 + strength, 0.9);
    const count = Math.round(22 * strength) + 12;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.2 + Math.random() * 3.4) * strength;
      spawn({
        position: new THREE.Vector3(x + Math.cos(angle) * 0.2, 0.05, z + Math.sin(angle) * 0.2),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * 0.6,
          2.2 + Math.random() * 4.2 * strength,
          Math.sin(angle) * speed * 0.6,
        ),
        life: 0,
        maxLife: 0.9 + Math.random() * 0.8,
        size: 0.1 + Math.random() * 0.22,
        gravity: 14,
        kind: "droplet",
      });
    }
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      spawn({
        position: new THREE.Vector3(x, 0.1, z),
        velocity: new THREE.Vector3(Math.cos(angle) * 0.7, 0.6 + Math.random(), Math.sin(angle) * 0.7),
        life: 0,
        maxLife: 0.7,
        size: 0.3 + Math.random() * 0.5,
        gravity: -0.4,
        kind: "foam",
      });
    }
  };

  const drop = (x: number, y: number, z: number, strength = 0.6) => {
    spawnRing(x, z, 0.8 + strength, 0.8);
    for (let i = 0; i < 6; i++) {
      spawn({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2),
        life: 0,
        maxLife: 0.5,
        size: 0.06 + Math.random() * 0.1,
        gravity: 9,
        kind: "droplet",
      });
    }
  };

  const silt = (x: number, y: number, z: number) => {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      spawn({
        position: new THREE.Vector3(x, y + 0.1, z),
        velocity: new THREE.Vector3(
          Math.cos(angle) * (0.4 + Math.random()),
          0.15 + Math.random() * 0.4,
          Math.sin(angle) * (0.4 + Math.random()),
        ),
        life: 0,
        maxLife: 1.6 + Math.random(),
        size: 0.2 + Math.random() * 0.4,
        gravity: -0.3,
        kind: "silt",
      });
    }
  };

  let rainAmount = 0;
  const rainCount = 700;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 140;
    rainPositions[i * 3 + 1] = Math.random() * 40;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.PointsMaterial({
    color: 0xd8f2ff,
    size: 0.14,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const rain = new THREE.Points(rainGeometry, rainMaterial);
  rain.frustumCulled = false;
  rain.layers.set(3);
  scene.add(rain);

  let quality = 1;

  // ---- whirlpool vortex -------------------------------------------------
  const whirlpoolGeometry = new THREE.PlaneGeometry(24, 24);
  whirlpoolGeometry.rotateX(-Math.PI / 2);
  const whirlpoolMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStrength: { value: 0 },
      uFoam: { value: new THREE.Color(0.88, 0.98, 0.92) },
      uDeep: { value: new THREE.Color(0.012, 0.11, 0.13) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform float uStrength;
      uniform vec3 uFoam;
      uniform vec3 uDeep;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float a = atan(p.y, p.x);
        float edge = smoothstep(1.0, 0.68, r);
        float spiralA = a * 3.0 + log(r + 0.08) * 8.0 - uTime * 5.2;
        float spiralB = a * 5.0 - log(r + 0.05) * 11.0 + uTime * 7.4;
        float armsA = smoothstep(0.2, 0.78, sin(spiralA) * 0.5 + 0.5);
        float armsB = smoothstep(0.55, 0.94, sin(spiralB) * 0.5 + 0.5);
        float ripple = smoothstep(0.5, 0.93, sin(r * 44.0 - uTime * 6.0) * 0.5 + 0.5);
        float outerRing = smoothstep(0.045, 0.0, abs(r - 0.86));
        float innerRing = smoothstep(0.025, 0.0, abs(r - 0.36));
        float foam = (armsA * 0.58 + armsB * 0.35 + ripple * 0.2 + outerRing * 0.55 + innerRing * 0.32) * edge;
        foam *= smoothstep(0.08, 0.3, r);
        float alphaFoam = uStrength * clamp(foam, 0.0, 1.0) * 0.72;
        float alphaDark = uStrength * (1.0 - smoothstep(0.1, 0.78, r)) * 0.48;
        vec3 color = mix(uDeep, uFoam, clamp(alphaFoam / (alphaDark + alphaFoam + 0.001), 0.0, 1.0));
        float alpha = clamp(alphaDark + alphaFoam, 0.0, 0.88);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  const whirlpoolMesh = new THREE.Mesh(whirlpoolGeometry, whirlpoolMaterial);
  whirlpoolMesh.layers.set(3);
  whirlpoolMesh.renderOrder = 7;
  whirlpoolMesh.visible = false;
  scene.add(whirlpoolMesh);

  let whirlpoolX = 2;
  let whirlpoolZ = 0;
  let whirlpoolStrength = 0;
  let whirlpoolFoamClock = 0;

  return {
    splash,
    drop,
    silt,
    setRain(amount) {
      rainAmount = amount;
      rainMaterial.opacity = amount * 0.55;
      rain.visible = amount > 0.01;
    },
    setWhirlpool(x, z, strength) {
      whirlpoolX = x;
      whirlpoolZ = z;
      whirlpoolStrength = strength;
      whirlpoolMesh.visible = strength > 0.02;
      whirlpoolMesh.position.set(x, 0.065, z);
      whirlpoolMesh.scale.setScalar(0.82 + strength * 0.28);
    },
    setQuality(next) {
      quality = next;
    },
    update(dt, time) {
      whirlpoolMaterial.uniforms.uTime.value = time;
      whirlpoolMaterial.uniforms.uStrength.value = whirlpoolStrength;

      // Fine orbiting foam makes the vortex read immediately even when the
      // player is looking at a still frame.
      if (whirlpoolStrength > 0.025) {
        whirlpoolFoamClock += dt * (7 + whirlpoolStrength * 18);
        while (whirlpoolFoamClock >= 1) {
          whirlpoolFoamClock -= 1;
          const angle = Math.random() * Math.PI * 2;
          const radius = 2.2 + Math.random() * 6.2;
          const x = whirlpoolX + Math.cos(angle) * radius;
          const z = whirlpoolZ + Math.sin(angle) * radius;
          const tangent = 1.4 + Math.random() * 2.2;
          spawn({
            position: new THREE.Vector3(x, 0.08, z),
            velocity: new THREE.Vector3(
              -Math.sin(angle) * tangent,
              0.15 + Math.random() * 0.45,
              Math.cos(angle) * tangent,
            ),
            life: 0,
            maxLife: 0.65 + Math.random() * 0.55,
            size: 0.1 + Math.random() * 0.22,
            gravity: -0.15,
            kind: "foam",
          });
        }
      }

      // --- rain -----------------------------------------------------
      if (rainAmount > 0.01) {
        const array = rainGeometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < rainCount; i++) {
          let y = array.getY(i) - dt * (22 + (i % 7) * 2);
          if (y < 0) {
            y = 36 + Math.random() * 8;
            if (Math.random() < 0.12) {
              sim.drop(array.getX(i), array.getZ(i), 0.03, 2.5);
            }
          }
          array.setY(i, y);
        }
        array.needsUpdate = true;
      }

      // --- particles -------------------------------------------------
      let write = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) continue;
        p.velocity.y -= p.gravity * dt;
        p.position.addScaledVector(p.velocity, dt);
        if (p.kind === "droplet" && p.position.y < -0.02 && p.velocity.y < 0) {
          if (Math.random() < 0.35) sim.drop(p.position.x, p.position.z, 0.02, 1.6);
          continue;
        }
        if (p.kind === "silt") {
          p.velocity.multiplyScalar(0.97);
        }
        const t = p.life / p.maxLife;
        const pos = write * 3;
        positions[pos] = p.position.x;
        positions[pos + 1] = p.position.y;
        positions[pos + 2] = p.position.z;
        sizes[write] = p.size * (p.kind === "droplet" ? 1 : 1.4);
        alphas[write] = Math.min(1, (1 - t) * 1.6) * (p.kind === "silt" ? 0.5 : 0.9);
        if (p.kind === "silt") {
          colors[pos] = 0.62;
          colors[pos + 1] = 0.55;
          colors[pos + 2] = 0.4;
        } else if (p.kind === "foam") {
          colors[pos] = 0.92;
          colors[pos + 1] = 0.97;
          colors[pos + 2] = 1;
        } else {
          colors[pos] = 0.82;
          colors[pos + 1] = 0.94;
          colors[pos + 2] = 1;
        }
        particles[write] = p;
        write++;
      }
      particles.length = write;
      geometry.setDrawRange(0, write);
      (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
      (geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;

      // --- rings -----------------------------------------------------
      for (const ring of rings) {
        if (!ring.mesh.visible) continue;
        ring.life += dt;
        const t = ring.life / ring.max;
        if (t >= 1) {
          ring.mesh.visible = false;
          continue;
        }
        const scale = ring.size * (0.25 + t * 1.35);
        ring.mesh.scale.setScalar(scale);
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.55;
      }
      void quality;
      void sandHeight;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      sprite.dispose();
      ringGeometry.dispose();
      for (const ring of rings) {
        (ring.mesh.material as THREE.Material).dispose();
      }
      rainGeometry.dispose();
      rainMaterial.dispose();
      whirlpoolGeometry.dispose();
      whirlpoolMaterial.dispose();
      scene.remove(whirlpoolMesh);
      void scene;
    },
  };
}

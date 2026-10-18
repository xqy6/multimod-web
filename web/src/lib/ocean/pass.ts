import * as THREE from "three";

/** Minimal full-screen quad helper used for the GPU height-field passes. */
export class FullScreenPass {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  readonly material: THREE.RawShaderMaterial | THREE.ShaderMaterial;
  readonly mesh: THREE.Mesh;

  constructor(fragmentShader: string, uniforms: Record<string, THREE.IUniform>, vertexShader?: string) {
    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:
        vertexShader ??
        /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null) {
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previous);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

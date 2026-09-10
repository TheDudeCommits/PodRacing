import { Box3, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3, type WebGLRenderer } from 'three';
import { InkstormRacerShadow, INKSTORM_RACER_SHADOW_GLSL } from '../render/inkstorm/InkstormRacerShadow';
import { saltDuskUniforms } from '../render/saltDusk/SaltDuskAssets';
import { SALT_DUSK_LIGHT_GLSL } from '../render/saltDusk/SaltDuskLighting';
import type { RacerPresentation } from '../render/vehicles/RacerPresentation';

/** Preview-only receiving surface. Its sibling placement keeps it out of the
 * model's camera-fit bounds. All textures are borrowed from the preview lease. */
export class VehiclePreviewStage {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly shadow = new InkstormRacerShadow({ resolution: 512, maxCasters: 8 });
  private readonly center = new Vector3();
  private readonly size = new Vector3();
  private caster: RacerPresentation | null = null;
  private revision = -1;
  private disposed = false;

  constructor() {
    const material = new ShaderMaterial({
      name: 'Preview salt floor', transparent: true, depthWrite: false, toneMapped: false,
      uniforms: {
        ...saltDuskUniforms(), ...this.shadow.uniforms,
        uStageCenter: { value: new Vector2() }, uStageRadius: { value: new Vector2(1, 1) },
        uStageViewport: { value: new Vector2(1, 1) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec3 vWorld;
        uniform sampler2D uDuskGround;
        uniform sampler2D uDuskGroundNormal;
        uniform sampler2D uDuskGroundRoughness;
        uniform float uDuskGroundReady;
        uniform vec2 uStageCenter;
        uniform vec2 uStageRadius;
        uniform vec2 uStageViewport;
        ${SALT_DUSK_LIGHT_GLSL}
        ${INKSTORM_RACER_SHADOW_GLSL}
        void main() {
          vec2 local = (vWorld.xz - uStageCenter) / uStageRadius;
          // Fade the receiving surface at every canvas edge independently of
          // the pod fit; this never masks or alters the pod's own pixels.
          vec2 screen = gl_FragCoord.xy / max(uStageViewport, vec2(1.0));
          vec2 edge = smoothstep(vec2(0.005), vec2(0.13), min(screen, 1.0 - screen));
          float alpha = (1.0 - smoothstep(0.42, 0.98, length(local))) * edge.x * edge.y * 0.68;
          if (alpha < 0.003) discard;
          vec3 base = vec3(0.15, 0.17, 0.19);
          vec3 n = vec3(0.0, 1.0, 0.0);
          float roughness = 0.8;
          if (uDuskGroundReady > 0.5) {
            vec2 uv = vWorld.xz * 0.075;
            float mineral = dot(texture2D(uDuskGround, uv).rgb, vec3(0.2126, 0.7152, 0.0722));
            base = mix(base, mineral * vec3(0.50, 0.54, 0.59), 0.45);
            vec3 detail = texture2D(uDuskGroundNormal, uv).xyz * 2.0 - 1.0;
            n = normalize(vec3(detail.x * 0.16, 1.0, -detail.y * 0.16));
            roughness = clamp(texture2D(uDuskGroundRoughness, uv).r, 0.62, 0.94);
          }
          float visibility = inkstormRacerSunVisibility(vWorld, vec3(0.0, 1.0, 0.0));
          vec3 color = duskTone(duskLight(base, n, vWorld, roughness, 0.0, visibility));
          gl_FragColor = vec4(color, alpha);
          #include <colorspace_fragment>
        }
      `,
    });
    this.mesh = new Mesh(new PlaneGeometry(1, 1), material);
    this.mesh.name = 'vehicle-preview-salt-stage';
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    this.mesh.renderOrder = -1;
  }

  /** Called only by an existing snapshot/inspection render, never a new loop. */
  update(renderer: WebGLRenderer, vehicle: RacerPresentation, modelBounds: Box3): void {
    if (this.disposed) return;
    if (modelBounds.isEmpty()) { this.mesh.visible = false; this.shadow.clear(); return; }
    modelBounds.getCenter(this.center); modelBounds.getSize(this.size);
    const floorY = modelBounds.min.y - 0.25;
    const width = Math.max(24, this.size.x * 2.7);
    const depth = Math.max(28, this.size.z * 2.2);
    this.mesh.position.set(this.center.x, floorY, this.center.z);
    this.mesh.scale.set(width, depth, 1);
    this.mesh.material.uniforms.uStageCenter!.value.set(this.center.x, this.center.z);
    this.mesh.material.uniforms.uStageRadius!.value.set(width / 2, depth / 2);
    renderer.getDrawingBufferSize(this.mesh.material.uniforms.uStageViewport!.value);
    this.mesh.visible = true;
    this.mesh.updateMatrixWorld(true);
    if (this.caster !== vehicle || this.revision !== vehicle.geometryRevision) {
      this.caster = vehicle; this.revision = vehicle.geometryRevision;
      this.shadow.refreshCasters(vehicle);
    }
    // Do not bind a scene: only this floor receives these private uniforms.
    this.shadow.update(renderer, vehicle, undefined, floorY);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.shadow.dispose();
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.caster = null;
  }
}

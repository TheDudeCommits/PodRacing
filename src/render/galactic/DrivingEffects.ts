import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import type { RuptureFlameAtlas } from './RuptureFlameAtlas';
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, SphereGeometry, Vector3, PlaneGeometry, ShaderMaterial } from 'three';
import { DRIFT_COLORS, driftStage } from '../../game/simulation/drift';
import type { PodAbilityState } from '../../game/galactic/podAbilities';
import { POD_FOOTPRINTS } from '../../game/podGeometry';
import type { PodIdentityId } from '../../game/podIdentity';
import type { PodracerState } from '../../game/simulation/types';
const CAPACITY = 640;
interface Spark { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; total: number; size: number; color: number }
/** Four bounded draws for every pod's skid energy, hot scrapes and damaged-engine smoke.
 * Particles are presentation only. No simulation inputs or lights; borrows the admitted rupture atlas. */
export class DrivingEffects extends Group {
  private readonly sparks = Array.from({ length: CAPACITY }, (): Spark => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, total: 1, size: 1, color: 0xffffff }));
  private cursor = 0;
  private sequence = 0;
  private readonly sparkMesh = new InstancedMesh(new SphereGeometry(1, 4, 2), new MeshBasicMaterial({ vertexColors: false, blending: AdditiveBlending, transparent: true, opacity: .94, depthWrite: false, toneMapped: false }), CAPACITY);
  private readonly smokeMesh = new InstancedMesh(new SphereGeometry(1, 5, 3), new MeshBasicMaterial({ transparent: true, opacity: .38, depthWrite: false, color: '#262c35', toneMapped: false }), 96);
  private readonly abilityMesh = new InstancedMesh(new CylinderGeometry(1, .08, 1, 10, 1, true).translate(0, .5, 0).rotateX(Math.PI / 2), new MeshBasicMaterial({ transparent: true, opacity: .32, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }), 24);
  private readonly flameMesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  private readonly vertical = new Vector3(0, 1, 0);
  private readonly roll = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
  private readonly tempMatrix = new Matrix4();
  private readonly tempPosition = new Vector3();
  private readonly tempScale = new Vector3();
  private readonly tempRotation = new Quaternion();
  private readonly color = new Color();
  private lastTime = -1;
  constructor(atlas: RuptureFlameAtlas['uniforms']) {
    super(); this.name = 'Staged drift and contact feedback';
    this.flameMesh = new InstancedMesh(new PlaneGeometry(1, 1).translate(.444, .138, 0), new ShaderMaterial({
      uniforms: { ...atlas, uTime: { value: 0 } }, transparent: true, premultipliedAlpha: true,
      depthWrite: false, side: DoubleSide, toneMapped: false,
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform sampler2D uRuptureAtlas; uniform float uRuptureAtlasReady; uniform float uTime; varying vec2 vUv;
        void main() {
          if (uRuptureAtlasReady < .5) discard;
          vec4 rect = mod(floor(uTime * 14.), 2.) < .5 ? vec4(860.,102.,1254.,489.) : vec4(194.,730.,720.,1134.);
          vec2 uv = mix(rect.xy + .5, rect.zw - .5, vec2(vUv.x, 1. - vUv.y)) / 1254.;
          vec4 texel = texture2D(uRuptureAtlas, uv); if (texel.a < .04) discard;
          gl_FragColor = vec4(texel.rgb * texel.a, texel.a);
        }`,
    }), 16);
    this.flameMesh.renderOrder = 4;
    for (const mesh of [this.sparkMesh, this.smokeMesh, this.abilityMesh, this.flameMesh]) {
      mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; this.add(mesh);
    }
  }
  private spawn(s: PodracerState, x: number, z: number, color: number, scale: number, time: number): void {
    const p = this.sparks[this.cursor++ % CAPACITY]!;
    const yaw = s.orientation.yaw, sin = Math.sin(yaw), cos = Math.cos(yaw);
    const phase = ++this.sequence * 2.39996;
    Object.assign(p, { x: s.position.x + x * cos + z * sin, y: s.position.y - 1.25,
      z: s.position.z - x * sin + z * cos, vx: s.velocity.x * .48 + Math.sin(phase) * 11,
      vy: 2 + Math.cos(phase * 1.7) * 3, vz: s.velocity.z * .48 + Math.cos(phase) * 11,
      life: .35 + (1 + Math.sin(time * 4 + phase)) * .20, size: scale, color });
    p.total = p.life;
  }
  impact(s: PodracerState, severity: number): void {
    for (let i = 0; i < 14 + severity * 30; i++) this.spawn(s, Math.sin(i * 2.4) * 4, 5 + Math.cos(i) * 3, 0xffb63e, .3 + severity * .6, s.simulationTime);
  }
  update(time: number, racers: readonly { vehicle: PodracerState; identity: PodIdentityId; running: boolean; ability?: PodAbilityState }[]): void {
    const dt = this.lastTime < 0 ? 0 : Math.min(.05, Math.max(0, time - this.lastTime));
    if (time < this.lastTime) this.clearEffects(); this.lastTime = time;
    let smoke = 0, abilities = 0, flames = 0;
    this.flameMesh.material.uniforms.uTime!.value = time;
    for (const racer of racers) {
      const s = racer.vehicle, footprint = POD_FOOTPRINTS[racer.identity];
      if (!racer.running) continue;
      const ability = racer.ability;
      if (ability && (ability.windup > 0 || ability.remaining > 0)) {
        const flame = ability.kind === 'flame', active = ability.remaining > 0;
        const yaw = s.orientation.yaw + (flame ? ability.direction * .8 : 0);
        this.tempRotation.setFromAxisAngle(this.vertical, yaw);
        this.tempPosition.set(s.position.x + Math.sin(s.orientation.yaw) * (flame ? 12 : 3),
          s.position.y + 1, s.position.z + Math.cos(s.orientation.yaw) * (flame ? 12 : 3));
        if (flame && active) {
          // Two crossed sheets retain the original inked fire from both chase and side views.
          // The root, direction and reach match the simulation cone; no point lights or allocations.
          for (let layer = 0; layer < 2; layer++) {
            this.tempRotation.setFromAxisAngle(this.vertical, yaw - Math.PI / 2);
            if (layer) this.tempRotation.multiply(this.roll);
            this.tempScale.set(38, 22 * (.92 + .08 * Math.sin(time * 47)), 1);
            this.flameMesh.setMatrixAt(flames++, this.tempMatrix.compose(this.tempPosition, this.tempRotation, this.tempScale));
          }
        } else {
          this.tempScale.set(flame ? 12 : 5, flame ? .25 : 2, flame ? 36 : 10);
          this.abilityMesh.setMatrixAt(abilities, this.tempMatrix.compose(this.tempPosition, this.tempRotation, this.tempScale));
          this.abilityMesh.setColorAt(abilities++, this.color.setHex(flame ? 0xffb72d : ability.kind === 'vent' ? 0x54eaff : 0xb5a0ff));
        }
      }
      if (dt > 0 && s.grounded && s.drift.blend > .2) {
        const stage = driftStage(s.drift.charge);
        for (const side of [-1, 1]) for (let i = 0; i < Math.ceil(dt * (stage ? 95 : 30)); i++) {
          this.spawn(s, side * (footprint.engineX + (footprint.hull[0]?.radius ?? 1.5) + .4), footprint.exhaustZ - .6, DRIFT_COLORS[stage], .3 + stage * .28, time);
        }
      }
      // Broken hulls vent soot from their real engine footprint; never from the camera.
      if (s.damage > .28) for (let i = 0; i < 10; i++) {
        const age = ((time * .8 + i / 10) % 1), side = i % 2 ? -1 : 1;
        this.tempPosition.set(s.position.x + Math.cos(s.orientation.yaw) * side * footprint.engineX - s.velocity.x * age * .2,
          s.position.y + 1 + age * (3 + s.damage * 8), s.position.z - Math.sin(s.orientation.yaw) * side * footprint.engineX - s.velocity.z * age * .2);
        const size = (.25 + age * 2.5) * s.damage;
        this.tempScale.setScalar(size); this.tempRotation.identity();
        this.smokeMesh.setMatrixAt(smoke++, this.tempMatrix.compose(this.tempPosition, this.tempRotation, this.tempScale));
      }
    }
    let count = 0;
    for (const p of this.sparks) {
      p.life -= dt; if (p.life <= 0) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= dt * 9;
      const fade = Math.min(1, p.life / p.total * 2);
      this.tempPosition.set(p.x, p.y, p.z); this.tempRotation.identity();
      this.tempScale.set(p.size * fade, p.size * .5 * fade, p.size * 2.8 * fade);
      this.sparkMesh.setMatrixAt(count, this.tempMatrix.compose(this.tempPosition, this.tempRotation, this.tempScale));
      this.sparkMesh.setColorAt(count++, this.color.setHex(p.color));
    }
    this.sparkMesh.count = count; this.smokeMesh.count = smoke; this.abilityMesh.count = abilities;
    this.flameMesh.count = flames; this.flameMesh.instanceMatrix.needsUpdate = true;
    this.abilityMesh.instanceMatrix.needsUpdate = true;
    if (this.abilityMesh.instanceColor) this.abilityMesh.instanceColor.needsUpdate = true;
    this.sparkMesh.instanceMatrix.needsUpdate = this.smokeMesh.instanceMatrix.needsUpdate = true;
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
  }
  clearEffects(): void { for (const p of this.sparks) p.life = 0; this.sparkMesh.count = this.smokeMesh.count = this.abilityMesh.count = this.flameMesh.count = 0; }
  dispose(): void { for (const mesh of [this.sparkMesh, this.smokeMesh, this.abilityMesh, this.flameMesh]) { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); } }
}

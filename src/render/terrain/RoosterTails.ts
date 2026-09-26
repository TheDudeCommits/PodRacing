import {
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Sphere,
  Vector3,
} from 'three';

import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { SKY_SUN, WORLD_SUN } from '../lighting/WorldLight';
import type { RacingBiomeId } from '../../game/race/racingBiomes';

/** One racer's emitters for this frame, in world space. */
export interface RoosterTailSource {
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
  readonly speed: number;
  readonly velocityX: number;
  readonly velocityZ: number;
  /** Height of the hull above the ground; plumes fade out when airborne. */
  readonly clearance: number;
  /** Engine lateral offsets (metres) and the exhaust plane (local +Z forward). */
  readonly engineX: number;
  readonly exhaustZ: number;
  readonly boosting: boolean;
  readonly visible: boolean;
}

const CAPACITY = 3000;

const VERTEX = /* glsl */ `
attribute vec4 iPosition;   // xyz world centre, w size
attribute vec4 iData;       // x alpha, y seed, z tint, w age 0..1
attribute float iGround;    // terrain height under the particle
varying float vAboveGround;
varying vec2 vUv;
varying vec4 vData;
varying vec3 vRight;
varying vec3 vUp;
varying vec3 vToCamera;
void main() {
  vUv = uv;
  vData = iData;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  float angle = iData.y * 6.2831 + iData.w * (iData.y - .5) * 3.0;
  float c = cos(angle), s = sin(angle);
  vec2 corner = vec2(position.x * c - position.y * s, position.x * s + position.y * c);
  vec3 p = iPosition.xyz + (right * corner.x + up * corner.y) * iPosition.w;
  vRight = right; vUp = up;
  vToCamera = normalize(cameraPosition - iPosition.xyz);
  vAboveGround = p.y - iGround;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uShade;
uniform vec3 uSunColor;
uniform vec3 uWorldSun;
uniform vec3 uSkySun;
varying vec2 vUv;
varying vec4 vData;
varying vec3 vRight;
varying vec3 vUp;
varying vec3 vToCamera;
varying float vAboveGround;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec2 q = vUv * 2.0 - 1.0;
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  vec2 np = q * 1.7 + vData.y * 17.0 + vData.w * 0.9;
  float billow = n(np) * 0.55 + n(np * 2.3) * 0.3 + n(np * 5.1) * 0.15;
  float shape = smoothstep(1.0, 0.2, r2 + (billow - 0.5) * 0.75);
  // Soft contact: fade where the billboard dips into the ground instead of a hard cut.
  float alpha = shape * vData.x * smoothstep(0.0, 1.6, vAboveGround);
  if (alpha < 0.01) discard;
  // A pseudo-spherical normal lets the low sun sculpt each billow.
  vec3 normal = normalize(vRight * q.x + vUp * q.y + vToCamera * sqrt(max(0.0, 1.0 - r2)));
  float lit = clamp(dot(normal, normalize(uWorldSun)) * 0.6 + 0.5, 0.0, 1.0);
  float backlight = pow(max(dot(-vToCamera, normalize(uSkySun)), 0.0), 6.0) * (1.0 - shape * 0.6);
  vec3 base = mix(uShade, uColor, lit) * (0.9 + vData.z * 0.2) * (0.85 + billow * 0.3);
  vec3 color = base + uSunColor * (backlight * 1.6 + lit * 0.12);
  gl_FragColor = vec4(color, alpha);
}
`;

interface BiomeDust { color: string; shade: string; opacity: number; lift: number; size: number }
const BIOME_DUST: Readonly<Record<RacingBiomeId, BiomeDust>> = Object.freeze({
  desert: { color: '#ffd1a1', shade: '#9a6a6e', opacity: .62, lift: 1, size: 2.3 },
  frozen: { color: '#f2f7ff', shade: '#7b92c6', opacity: .44, lift: 1.1, size: 2.2 },
  volcanic: { color: '#7a6461', shade: '#2a1e26', opacity: .6, lift: .9, size: 2.2 },
  jungle: { color: '#e2e6d8', shade: '#66735c', opacity: .36, lift: .8, size: 1.9 },
});

interface Particle {
  x: number; y: number; z: number; ground: number;
  vx: number; vy: number; vz: number;
  age: number; life: number; size: number; drag: number; rise: number;
  seed: number; tint: number;
}

/**
 * Billowing dust thrown up behind every engine: presentation only. Particles
 * are simulated on the CPU (a few thousand at most) and uploaded as one
 * compact instance buffer, so capture stepping stays deterministic.
 */
export class RoosterTails {
  readonly mesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly position: InstancedBufferAttribute;
  private readonly data: InstancedBufferAttribute;
  private readonly ground: InstancedBufferAttribute;
  private readonly particles: Particle[] = [];
  private readonly free: Particle[] = [];
  private lastTime: number | null = null;
  private readonly carry: number[] = [];
  private random = 0x5eed;
  private biome: BiomeDust = BIOME_DUST.desert;
  private intensity = 1;

  constructor() {
    const quad = new PlaneGeometry(1, 1);
    const geometry = new InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute('position', quad.getAttribute('position'));
    geometry.setAttribute('uv', quad.getAttribute('uv'));
    this.position = new InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4).setUsage(DynamicDrawUsage);
    this.data = new InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4).setUsage(DynamicDrawUsage);
    geometry.setAttribute('iPosition', this.position);
    geometry.setAttribute('iData', this.data);
    this.ground = new InstancedBufferAttribute(new Float32Array(CAPACITY), 1).setUsage(DynamicDrawUsage);
    geometry.setAttribute('iGround', this.ground);
    geometry.instanceCount = 0;
    geometry.boundingSphere = new Sphere(new Vector3(), 1e7);
    const material = new ShaderMaterial({
      name: 'RoosterTailDust', vertexShader: VERTEX, fragmentShader: FRAGMENT,
      transparent: true, depthWrite: false, blending: NormalBlending, toneMapped: false,
      uniforms: {
        uColor: { value: new Color(BIOME_DUST.desert.color) }, uShade: { value: new Color(BIOME_DUST.desert.shade) },
        uSunColor: { value: new Color('#ffcf8f') }, uWorldSun: WORLD_SUN, uSkySun: SKY_SUN,
      },
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'Rooster tail dust';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 9;
    this.mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
  }

  setBiome(biome: RacingBiomeId, sunColor?: Color): void {
    this.biome = BIOME_DUST[biome];
    const u = this.mesh.material.uniforms;
    (u.uColor!.value as Color).set(this.biome.color);
    (u.uShade!.value as Color).set(this.biome.shade);
    if (sunColor) (u.uSunColor!.value as Color).copy(sunColor);
  }

  /** Emission scale; reduced motion and low quality thin the cloud. */
  setIntensity(intensity: number): void { this.intensity = Math.max(0, intensity); }

  clear(): void {
    this.free.push(...this.particles);
    this.particles.length = 0;
    this.mesh.geometry.instanceCount = 0;
    this.lastTime = null;
  }

  private rand(): number {
    this.random = (this.random * 1664525 + 1013904223) >>> 0;
    return this.random / 4294967296;
  }

  private spawn(): Particle | null {
    if (this.particles.length >= CAPACITY) return null;
    const particle = this.free.pop() ?? { x: 0, y: 0, z: 0, ground: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, size: 1, drag: 1, rise: 0, seed: 0, tint: 0 };
    this.particles.push(particle);
    return particle;
  }

  /** `time` is presentation seconds; repeated times only re-upload. */
  update(time: number, sources: readonly RoosterTailSource[], heightAt: (x: number, z: number) => number,
    cameraX: number, cameraY: number, cameraZ: number): void {
    const previous = this.lastTime;
    this.lastTime = time;
    const dt = previous === null || time < previous || time - previous > 0.5 ? 0 : time - previous;
    if (dt > 0) {
      // Integrate and retire.
      let write = 0;
      for (let read = 0; read < this.particles.length; read++) {
        const p = this.particles[read]!;
        p.age += dt;
        if (p.age >= p.life) { this.free.push(p); continue; }
        const damp = Math.exp(-p.drag * dt);
        p.vx *= damp; p.vz *= damp; p.vy = p.vy * damp + (p.rise - 0.4 * p.age) * dt * 2;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        this.particles[write++] = p;
      }
      this.particles.length = write;
      this.emit(dt, sources, heightAt);
    }
    this.upload(cameraX, cameraY, cameraZ);
  }

  private emit(dt: number, sources: readonly RoosterTailSource[], heightAt: (x: number, z: number) => number): void {
    for (let index = 0; index < sources.length; index++) {
      const racer = sources[index]!;
      if (this.carry.length <= index) this.carry.push(0);
      if (!racer.visible || racer.speed < 18) { this.carry[index] = 0; continue; }
      const ground = 1 - Math.min(1, Math.max(0, (racer.clearance - 2.5) / 6));
      if (ground <= 0.02) continue;
      const rate = (Math.min(1, (racer.speed - 18) / 90) * 110 + (racer.boosting ? 50 : 0)) * ground * this.intensity;
      this.carry[index]! += rate * dt;
      const count = Math.floor(this.carry[index]!);
      this.carry[index]! -= count;
      const sin = Math.sin(racer.yaw), cos = Math.cos(racer.yaw);
      for (let k = 0; k < count; k++) {
        const p = this.spawn();
        if (!p) return;
        // Most of the cloud is an under-engine wash that rides along with the
        // craft for a moment (readable from the chase camera); the rest is a
        // long plume left hanging in world space for rivals and replays.
        const wash = this.rand() < 0.68;
        const side = this.rand() < 0.5 ? -1 : 1;
        const lx = side * Math.max(racer.engineX, 1.2) + (this.rand() - 0.5) * 2.2;
        // Repulsor wash leaves from under the engine bodies; the plume from the nozzles.
        const lz = wash ? racer.exhaustZ - 2 + this.rand() * 12 : racer.exhaustZ - 1 - this.rand() * 5;
        p.x = racer.x + cos * lx + sin * lz;
        p.z = racer.z - sin * lx + cos * lz;
        p.ground = heightAt(p.x, p.z);
        p.y = p.ground + 0.9 + this.rand() * 0.8;
        const outward = side * (wash ? 7 + this.rand() * 16 : 3 + this.rand() * 8);
        const carry = wash ? 0.95 + this.rand() * 0.04 : 0.05 + this.rand() * 0.12;
        p.vx = racer.velocityX * carry + cos * outward;
        p.vz = racer.velocityZ * carry - sin * outward;
        p.vy = (wash ? 5 + this.rand() * 8 : 2 + this.rand() * 5) * this.biome.lift;
        p.drag = wash ? 0.6 : 2.2;
        p.rise = (wash ? 1.2 : 1.4) * this.biome.lift;
        p.age = this.rand() * dt;
        p.life = wash ? 0.7 + this.rand() * 0.5 : 1.2 + this.rand() * 0.9;
        p.size = this.biome.size * (wash ? 1.1 + this.rand() * 0.9 : 0.9 + this.rand() * 0.7) * (racer.boosting ? 1.25 : 1);
        p.seed = this.rand();
        p.tint = this.rand();
      }
    }
  }

  private upload(cameraX: number, cameraY: number, cameraZ: number): void {
    const pos = this.position.array as Float32Array, data = this.data.array as Float32Array;
    const ground = this.ground.array as Float32Array;
    let count = 0;
    for (const p of this.particles) {
      const t = p.age / p.life;
      const dx = p.x - cameraX, dy = p.y - cameraY, dz = p.z - cameraZ;
      const near = Math.min(1, Math.max(0, (Math.sqrt(dx * dx + dy * dy + dz * dz) - 3) / 9));
      const alpha = this.biome.opacity * Math.min(1, t / 0.07) * (1 - Math.max(0, (t - 0.5) / 0.5)) * near;
      if (alpha <= 0.004) continue;
      const o = count * 4;
      pos[o] = p.x; pos[o + 1] = p.y; pos[o + 2] = p.z; pos[o + 3] = p.size * (0.5 + 1.8 * Math.sqrt(t));
      data[o] = alpha; data[o + 1] = p.seed; data[o + 2] = p.tint; data[o + 3] = t;
      ground[count] = p.ground;
      count++;
    }
    this.mesh.geometry.instanceCount = count;
    this.position.clearUpdateRanges(); this.data.clearUpdateRanges(); this.ground.clearUpdateRanges();
    if (count > 0) {
      this.position.addUpdateRange(0, count * 4); this.data.addUpdateRange(0, count * 4); this.ground.addUpdateRange(0, count);
      this.position.needsUpdate = true; this.data.needsUpdate = true; this.ground.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

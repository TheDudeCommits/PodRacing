import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CircleGeometry, Color, DoubleSide, Group, Mesh,
  MeshBasicMaterial, PlaneGeometry, Points, Quaternion, ShaderMaterial, Sphere, Vector3, type Camera,
} from 'three';

import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';

type HeightAt = (x: number, z: number) => number;

/** World pose of the grid gantry (local +Z is the racing direction). */
export interface GantryPose { x: number; y: number; z: number; yaw: number }
/** A racer's grid position; forward is (sin yaw, cos yaw). */
export interface GridSlot { x: number; z: number; yaw: number }
export interface CeremonyState {
  phase: 'countdown' | 'racing' | 'finished';
  /** True while the menu holds the grid before the player commits. */
  awaiting: boolean;
  countdownRemaining: number;
  raceTime: number;
}

/** Lamp housing centres measured from foundry-gantry.glb (local metres). */
const LAMP_X = [-11, -5.5, 0, 5.5, 11];
const LAMP_Y = 41;
const LAMP_FACE_Z = -1.75;
const RED = new Color(7.5, .3, .08);
const GREEN = new Color(.35, 7, 1.6);
const IDLE = new Color(.2, .06, .03);
const SPARKS = 900;

const HALO_VERTEX = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const HALO_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
void main(){
  float r = length(vUv - .5) * 2.;
  float glow = exp(-r * r * 5.) * .7 + exp(-r * 14.) * .9;
  gl_FragColor = vec4(uColor * glow, 1.);
}`;

const GRID_VERTEX = /* glsl */ `
attribute float aFront;
attribute float aSlot;
varying float vFront;
varying float vSlot;
varying vec2 vUv;
void main(){ vFront = aFront; vSlot = aSlot; vUv = uv; gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.); }`;
const GRID_FRAGMENT = /* glsl */ `
uniform float uPaint;
uniform float uGlow;
uniform float uWave;
uniform vec3 uGlowColor;
varying float vFront;
varying float vSlot;
varying vec2 vUv;
void main(){
  // Worn paint: broken along its length, soft at its edges.
  float wear = .72 + .28 * fract(sin(dot(floor(vUv * vec2(1., 6.)), vec2(12.9898, 78.233))) * 43758.5453);
  float edge = smoothstep(0., .22, vUv.x) * smoothstep(1., .78, vUv.x);
  // The light runs forward through the grid, row by row.
  float wave = exp(-pow((vSlot - uWave) * 1.4, 2.));
  vec3 paint = vec3(.92, .86, .74) * uPaint * wear;
  vec3 light = uGlowColor * (uGlow * (.35 + vFront * .65) + wave * 1.6 * vFront);
  gl_FragColor = vec4((paint + light) * edge, edge * clamp(uPaint + uGlow + wave, 0., 1.));
}`;

const SPARK_VERTEX = /* glsl */ `
attribute float aLife;
uniform float uPixelRatio;
varying float vLife;
void main(){
  vLife = aLife;
  vec4 view = viewMatrix * vec4(position, 1.);
  gl_PointSize = aLife > 0. ? (2. + aLife * 5.) * uPixelRatio * 90. / max(-view.z, 1.) : 0.;
  gl_Position = projectionMatrix * view;
}`;
const SPARK_FRAGMENT = /* glsl */ `
varying float vLife;
void main(){
  vec2 q = gl_PointCoord * 2. - 1.;
  float d = dot(q, q);
  if (d > 1. || vLife <= 0.) discard;
  vec3 hot = mix(vec3(3.2, .45, .05), vec3(9., 5.5, 2.), vLife);
  gl_FragColor = vec4(hot * exp(-d * 3.), 1.);
}`;

/**
 * The race start as a ceremony: the grid gantry's five lamps count the pack
 * down (two, four, five reds, then all green), painted grid boxes pulse with
 * each call and ripple forward on GO, and spark fountains fire from the
 * gantry legs. Presentation only; it reads the countdown, never drives it.
 */
export class StartCeremony {
  readonly group = new Group();
  /** Review evidence: where the ceremony was staged. */
  readonly receipt = { gantry: null as GantryPose | null, slots: 0, sparks: 0, lampsLit: 0, green: false };
  private readonly gantry = new Group();
  private readonly lamps: Mesh<CircleGeometry, MeshBasicMaterial>[] = [];
  private readonly halos: Mesh<PlaneGeometry, ShaderMaterial>[] = [];
  private readonly gridMaterial: ShaderMaterial;
  private grid: Mesh<BufferGeometry, ShaderMaterial> | null = null;
  private readonly sparks: Points<BufferGeometry, ShaderMaterial>;
  private readonly sparkPositions = new Float32Array(SPARKS * 3);
  private readonly sparkVelocities = new Float32Array(SPARKS * 3);
  private readonly sparkLife = new Float32Array(SPARKS);
  private sparkCursor = 0;
  private sparkSeed = 0x51a7;
  private lastCue = -1;
  private cueTime = -10;
  private goTime = -10;
  private previousRaceTime = 0;
  private readonly tmp = new Vector3();
  private readonly inverseGantry = new Quaternion();

  constructor() {
    this.group.name = 'Start ceremony';
    this.group.add(this.gantry);
    this.gantry.visible = false;
    const lens = new CircleGeometry(1.22, 28);
    const halo = new PlaneGeometry(10, 10);
    for (const x of LAMP_X) {
      const lamp = new Mesh(lens, new MeshBasicMaterial({ color: IDLE.clone(), toneMapped: false }));
      lamp.position.set(x, LAMP_Y, LAMP_FACE_Z);
      lamp.rotation.y = Math.PI;
      lamp.name = 'start-lamp';
      this.gantry.add(lamp);
      this.lamps.push(lamp);
      const glow = new Mesh(halo, new ShaderMaterial({
        vertexShader: HALO_VERTEX, fragmentShader: HALO_FRAGMENT,
        uniforms: { uColor: { value: new Color(0, 0, 0) } },
        transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
      }));
      glow.position.set(x, LAMP_Y, LAMP_FACE_Z - .6);
      glow.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
      glow.renderOrder = 12;
      this.gantry.add(glow);
      this.halos.push(glow);
    }
    this.gridMaterial = new ShaderMaterial({
      name: 'Start grid paint', vertexShader: GRID_VERTEX, fragmentShader: GRID_FRAGMENT,
      uniforms: { uPaint: { value: .8 }, uGlow: { value: 0 }, uWave: { value: -10 }, uGlowColor: { value: new Color(4, 2.2, .7) } },
      transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const sparkGeometry = new BufferGeometry();
    sparkGeometry.setAttribute('position', new BufferAttribute(this.sparkPositions, 3));
    sparkGeometry.setAttribute('aLife', new BufferAttribute(this.sparkLife, 1));
    sparkGeometry.boundingSphere = new Sphere(new Vector3(), 1e7);
    this.sparks = new Points(sparkGeometry, new ShaderMaterial({
      name: 'Start sparks', vertexShader: SPARK_VERTEX, fragmentShader: SPARK_FRAGMENT,
      uniforms: { uPixelRatio: { value: 1 } },
      transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
    }));
    this.sparks.frustumCulled = false;
    this.sparks.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.sparks.renderOrder = 11;
    this.group.add(this.sparks);
  }

  setGantry(pose: GantryPose | null): void {
    this.gantry.visible = pose !== null;
    this.receipt.gantry = pose ? { ...pose } : null;
    if (!pose) return;
    this.gantry.position.set(pose.x, pose.y, pose.z);
    this.gantry.rotation.set(0, pose.yaw, 0);
    this.gantry.updateMatrixWorld(true);
    this.inverseGantry.copy(this.gantry.quaternion).invert();
  }

  /** Paints one box per racer, draped over the physical terrain. */
  setGrid(slots: readonly GridSlot[], heightAt: HeightAt): void {
    if (this.grid) { this.group.remove(this.grid); this.grid.geometry.dispose(); this.grid = null; }
    this.receipt.slots = slots.length;
    if (!slots.length) return;
    const positions: number[] = [], uvs: number[] = [], fronts: number[] = [], slotIds: number[] = [], indices: number[] = [];
    // Rows run from the front of the grid backward, so the GO ripple moves forward.
    const ordered = [...slots].map((slot, index) => ({ slot, index }));
    const forwardOf = (s: GridSlot) => ({ x: Math.sin(s.yaw), z: Math.cos(s.yaw) });
    const lead = forwardOf(slots[0]!);
    ordered.sort((a, b) => (b.slot.x * lead.x + b.slot.z * lead.z) - (a.slot.x * lead.x + a.slot.z * lead.z));
    const halfWidth = 6.5, front = 24, tick = 7, line = .6;
    const addStrip = (ax: number, az: number, bx: number, bz: number, width: number, isFront: number, rank: number) => {
      const length = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(length / 2));
      const nx = -(bz - az) / length * width / 2, nz = (bx - ax) / length * width / 2;
      const base = positions.length / 3;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        for (const side of [-1, 1]) {
          const px = x + nx * side, pz = z + nz * side;
          positions.push(px, heightAt(px, pz) + .55, pz);
          uvs.push(side < 0 ? 0 : 1, t * length / 3);
          fronts.push(isFront); slotIds.push(rank);
        }
      }
      for (let i = 0; i < steps; i++) { const a = base + i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    };
    ordered.forEach(({ slot }, rank) => {
      const f = forwardOf(slot), r = { x: f.z, z: -f.x };
      const corner = (along: number, across: number) => ({ x: slot.x + f.x * along + r.x * across, z: slot.z + f.z * along + r.z * across });
      const fl = corner(front, -halfWidth), fr = corner(front, halfWidth), bl = corner(front - tick, -halfWidth), br = corner(front - tick, halfWidth);
      // A painted starting slot: a bold front bar with short brackets behind it.
      addStrip(bl.x, bl.z, fl.x, fl.z, line, 0, rank);
      addStrip(br.x, br.z, fr.x, fr.z, line, 0, rank);
      addStrip(fl.x, fl.z, fr.x, fr.z, line * 2.4, 1, rank);
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
    geometry.setAttribute('aFront', new BufferAttribute(new Float32Array(fronts), 1));
    geometry.setAttribute('aSlot', new BufferAttribute(new Float32Array(slotIds), 1));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    this.grid = new Mesh(geometry, this.gridMaterial);
    this.grid.name = 'Start grid boxes';
    this.grid.renderOrder = 2;
    this.grid.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.group.add(this.grid);
  }

  private random(): number {
    this.sparkSeed = (Math.imul(this.sparkSeed, 1664525) + 1013904223) >>> 0;
    return this.sparkSeed / 4294967296;
  }

  /** A curtain of sparks pours from the crossbar across the whole track. */
  private emitSparks(count: number): void {
    const yaw = this.gantry.rotation.y, c = Math.cos(yaw), s = Math.sin(yaw);
    for (let k = 0; k < count; k++) {
      const i = this.sparkCursor = (this.sparkCursor + 1) % SPARKS;
      this.tmp.set((this.random() - .5) * 84, 44 + this.random() * 4, (this.random() - .5) * 4).applyMatrix4(this.gantry.matrixWorld);
      this.sparkPositions.set([this.tmp.x, this.tmp.y, this.tmp.z], i * 3);
      const across = (this.random() - .5) * 5, up = 2 + this.random() * 9, along = (this.random() - .5) * 7;
      this.sparkVelocities.set([across * c + along * s, up, -across * s + along * c], i * 3);
      this.sparkLife[i] = .8 + this.random() * .2;
    }
  }

  update(state: CeremonyState, dt: number, camera: Camera, pixelRatio: number): void {
    const counting = state.phase === 'countdown' && !state.awaiting;
    const cue = counting ? Math.max(0, Math.ceil(state.countdownRemaining)) : state.phase === 'racing' ? 0 : -1;
    const now = counting ? 3 - state.countdownRemaining : 3 + state.raceTime;
    if (cue !== this.lastCue) {
      if (cue === 0 && this.lastCue > 0) { this.goTime = now; this.emitSparks(160); }
      if (cue > 0) this.cueTime = now;
      this.lastCue = cue;
    }
    // A restarted race rewinds its clock; re-arm the ceremony.
    if (state.raceTime + 1e-6 < this.previousRaceTime) { this.goTime = -10; this.cueTime = -10; }
    this.previousRaceTime = state.raceTime;
    const sinceGo = now - this.goTime, sinceCue = now - this.cueTime;
    const lit = counting ? (cue >= 3 ? 2 : cue === 2 ? 4 : 5) : 0;
    const green = !counting && sinceGo >= 0 && sinceGo < 5;
    for (let i = 0; i < this.lamps.length; i++) {
      const material = this.lamps[i]!.material, halo = this.halos[i]!.material.uniforms.uColor!.value as Color;
      if (green) {
        const strength = sinceGo < 3 ? 1 + 1.4 * Math.exp(-sinceGo * 3) : Math.max(0, (5 - sinceGo) / 2);
        material.color.copy(GREEN).multiplyScalar(Math.max(.03, strength));
        halo.copy(GREEN).multiplyScalar(.18 * strength);
      } else if (i < lit) {
        // Newly lit lamps flash as they strike.
        const fresh = i >= (cue >= 3 ? 0 : cue === 2 ? 2 : 4) ? Math.exp(-sinceCue * 5) : 0;
        const strength = 1 + fresh * 1.2;
        material.color.copy(RED).multiplyScalar(strength);
        halo.copy(RED).multiplyScalar(.14 * strength);
      } else {
        material.color.copy(IDLE);
        halo.setRGB(0, 0, 0);
      }
      // Halos face the camera in world space; undo the gantry's own yaw.
      this.halos[i]!.quaternion.copy(camera.quaternion).premultiply(this.inverseGantry);
    }
    // Grid paint: pulses with each call, then a ripple runs forward on GO.
    const u = this.gridMaterial.uniforms;
    if (counting) {
      u.uGlow!.value = .35 + 1.2 * Math.exp(-sinceCue * 3.2);
      (u.uGlowColor!.value as Color).setRGB(4, 1.2, .35);
      u.uWave!.value = -10;
    } else if (sinceGo >= 0 && sinceGo < 4) {
      u.uGlow!.value = 2.2 * Math.exp(-sinceGo * 1.6);
      (u.uGlowColor!.value as Color).setRGB(.5, 4.2, 1.4);
      u.uWave!.value = -1 + sinceGo * 8;
    } else {
      u.uGlow!.value = 0;
      u.uWave!.value = -10;
    }
    u.uPaint!.value = .78;
    // Spark fountains keep firing briefly after GO, then fall under gravity.
    if (sinceGo >= 0 && sinceGo < 1.6) this.emitSparks(Math.max(1, Math.round(dt * 150)));
    let alive = 0;
    for (let i = 0; i < SPARKS; i++) {
      if (this.sparkLife[i]! <= 0) continue;
      alive++;
      this.sparkLife[i] = Math.max(0, this.sparkLife[i]! - dt * .42);
      this.sparkVelocities[i * 3 + 1] = this.sparkVelocities[i * 3 + 1]! - 26 * dt;
      for (let k = 0; k < 3; k++) {
        this.sparkVelocities[i * 3 + k] = this.sparkVelocities[i * 3 + k]! * (1 - dt * .35);
        this.sparkPositions[i * 3 + k] = this.sparkPositions[i * 3 + k]! + this.sparkVelocities[i * 3 + k]! * dt;
      }
    }
    this.sparks.visible = alive > 0;
    Object.assign(this.receipt, { sparks: alive, lampsLit: lit, green });
    if (alive) {
      this.sparks.geometry.attributes.position!.needsUpdate = true;
      this.sparks.geometry.attributes.aLife!.needsUpdate = true;
    }
    this.sparks.material.uniforms.uPixelRatio!.value = pixelRatio;
  }

  dispose(): void {
    this.grid?.geometry.dispose();
    this.gridMaterial.dispose();
    for (const lamp of this.lamps) lamp.material.dispose();
    this.lamps[0]?.geometry.dispose();
    for (const halo of this.halos) halo.material.dispose();
    this.halos[0]?.geometry.dispose();
    this.sparks.geometry.dispose();
    this.sparks.material.dispose();
  }
}

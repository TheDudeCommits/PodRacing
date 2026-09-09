import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Camera,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Euler,
  Frustum,
  FrontSide,
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Sphere,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { RUPTURE_ATLAS_GLSL, RUPTURE_FLAME_ATLAS, RuptureFlameAtlas, ruptureArtworkScale, type RuptureAtlasOptions } from './RuptureFlameAtlas';
import type { WreckGroundFootprint } from '../combat/WreckGroundContact';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { TERRAIN_GLSL } from '../terrain/terrainShaderChunks';
import { createCourseGulfUniforms, type CourseGulfUniforms } from '../terrain/CourseGulfTextures';
import { createContactDustMaterial, createSolidEffectMaterial } from './SolidEffectMaterial';
import {
  createContactDustGeometry, createSolidHardwareGeometry, createSolidRubbleGeometry,
  SOLID_HARDWARE_MINE_DEPTH_SCALE, SOLID_RUBBLE_BASE_Y,
} from './SolidEffectGeometry';
import { CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY } from '../post/CelPrepassMaterial';

/** Plain-number inputs keep this adapter independent from simulation objects. */
export interface GalacticPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type GalacticEffectColor = number | string;
export type GalacticBurstStyle = 'crash' | 'mine' | 'sand' | 'rock' | 'redline' | 'reward' | 'energy' | 'recovery';

export interface ShieldEffectState {
  readonly position: GalacticPoint;
  readonly radius: number;
  readonly intensity?: number;
  readonly phase?: number;
  readonly color?: GalacticEffectColor;
  readonly mode?: 'shield' | 'recovery' | 'redline';
}

export interface WeaponBoltEffectState {
  readonly origin: GalacticPoint;
  readonly target: GalacticPoint;
  readonly radius?: number;
  readonly intensity?: number;
  readonly color?: GalacticEffectColor;
}

export interface HeatLanceEffectState {
  readonly origin: GalacticPoint;
  readonly target: GalacticPoint;
  readonly width?: number;
  readonly intensity?: number;
  readonly phase?: number;
  readonly color?: GalacticEffectColor;
}

export interface ScrapMineEffectState {
  readonly position: GalacticPoint;
  readonly yaw?: number;
  readonly armed?: boolean;
  readonly phase?: number;
  readonly scale?: number;
  readonly variant?: 'mine' | 'pickup' | 'emp' | 'repair';
}

export type GalacticHazardKind = 'heat-vent' | 'sand-geyser' | 'rockfall';

export interface HazardEffectState {
  readonly kind: GalacticHazardKind;
  readonly position: GalacticPoint;
  readonly radius: number;
  readonly height?: number;
  readonly intensity?: number;
  readonly phase?: number;
  readonly warning?: number;
}

export interface CrashEffectEvent {
  readonly type: 'crash';
  readonly time: number;
  readonly position: GalacticPoint;
  readonly velocity?: GalacticPoint;
  /** Optional authored engine-facing direction for a rupture cone. */
  readonly direction?: GalacticPoint;
  /** Actual authored fracture-face outward normal. Its world position is
   * already supported by the displayed mesh; do not lift it off that surface. */
  readonly surfaceNormal?: GalacticPoint;
  /** Fixed racer index and actual wreck count bind retained aftermath slots. */
  readonly wreckOwner?: number;
  readonly wreckSequence?: number;
  readonly groundY?: number;
  readonly severity?: number;
  readonly color?: GalacticEffectColor;
  readonly style?: GalacticBurstStyle;
}

export type GalacticEffectEvent = CrashEffectEvent;

/**
 * Snapshot contract: call `setState` whenever authoritative render state
 * changes, then `update` once per rendered frame. Arrays are copied into fixed
 * pools, so callers may freely reuse or discard their serializable objects.
 */
export interface GalacticEffectsState {
  readonly shields?: readonly ShieldEffectState[];
  readonly weaponBolts?: readonly WeaponBoltEffectState[];
  readonly heatLances?: readonly HeatLanceEffectState[];
  readonly scrapMines?: readonly ScrapMineEffectState[];
  readonly hazards?: readonly HazardEffectState[];
}

export const GALACTIC_EFFECT_DRAW_CALL_BUDGET = 9;
export const GALACTIC_EFFECT_CAPACITY = Object.freeze({
  shields: 8,
  weaponBolts: 32,
  heatLances: 12,
  scrapMines: 24,
  hazardTelegraphs: 24,
  hazardBodies: 48,
  crashDebris: 64,
  contactDust: 40,
  explosionPlates: 16,
  hazardPlumes: 72,
});

/** Only the actual race sampler and authoritative wreck identity are retained.
 * The emitter copies footprint numbers; it never writes terrain or simulation. */
export interface WreckGroundSurfaceContext {
  readonly terrain: { heightAt(x: number, z: number): number };
  readonly owner: number;
  readonly sequence: number;
}
interface ContactDustSlot {
  active: boolean; startTime: number; owner: number; sequence: number;
  terrain: WreckGroundSurfaceContext['terrain'] | null;
  x: number; z: number; axisX: number; axisZ: number; sign: number;
  along: number; drift: number; width: number; peak: number;
  lastAge: number; matrix: Matrix4; cx: number; cy: number; cz: number; radius: number;
}
const CONTACT_DUST_GROUND_PROBES = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [1, -1], [-1, 1], [1, 1]] as const;

interface ColoredSlot {
  r: number;
  g: number;
  b: number;
}

interface ShieldSlot extends ColoredSlot {
  x: number;
  y: number;
  z: number;
  radius: number;
  intensity: number;
  phase: number;
  mode: 'shield' | 'recovery' | 'redline';
}

interface BeamSlot extends ColoredSlot {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  width: number;
  intensity: number;
  phase: number;
}

interface MineSlot {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
  armed: boolean;
  phase: number;
  variant: 'mine' | 'pickup' | 'emp' | 'repair';
}

interface HazardSlot {
  kind: GalacticHazardKind;
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  intensity: number;
  phase: number;
  warning: number;
}

interface DebrisSlot extends ColoredSlot {
  active: boolean;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  ax: number;
  ay: number;
  az: number;
  scale: number;
  groundY: number;
  metal: boolean;
  spark: boolean;
  ember: boolean;
  contactSpark: boolean;
  contactGround: boolean;
  authoredEjection: boolean;
  emberPhase: number;
  wreckOwner: number;
  wreckSequence: number;
}

interface ExplosionSlot extends ColoredSlot {
  active: boolean;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  z: number;
  scale: number;
  style: GalacticBurstStyle;
  billboard: boolean;
  contactLayer: number;
  contactHalfLength: number;
  contactHalfWidth: number;
  authoredSurface: boolean;
  wreckOwner: number;
  wreckSequence: number;
  nx: number;
  ny: number;
  nz: number;
  vx: number;
  vz: number;
}

const EMPTY_STATES: readonly never[] = [];
const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);
const IDENTITY = new Quaternion();
const GROUND_RING = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const EFFECT_VISIBILITY_DISTANCE = Object.freeze({
  shields: 2_200,
  beams: 2_200,
  mines: 1_200,
  hazards: 1_600,
  crashes: 1_800,
});
const RUPTURE_FLASH_SCALE = 3.6;
const RUPTURE_FLASH_CORE_RADIUS = 0.64;

function finite(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function positive(value: number | undefined, fallback: number): number {
  return Math.max(0.001, finite(value, fallback));
}

function createHeatLanceGeometry() {
  // The outer lance is deliberately irregular instead of a smooth neon tube.
  // Three faceted energy strands overlap under additive blending, producing a
  // graphic orange sheath around the separate white-hot core without adding a
  // scene node or draw call per projectile.
  const spine = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(0.16, 0.08, 0.14),
    new Vector3(-0.13, -0.07, 0.31),
    new Vector3(0.17, 0.05, 0.48),
    new Vector3(-0.14, 0.09, 0.66),
    new Vector3(0.09, -0.1, 0.84),
    new Vector3(0, 0, 1),
  ]);
  const strandA: Vector3[] = [];
  const strandB: Vector3[] = [];
  for (let index = 0; index <= 10; index += 1) {
    const progress = index / 10;
    const angle = progress * Math.PI * 4.5;
    const radius = 0.44 * (0.76 + Math.sin(progress * Math.PI) * 0.24);
    strandA.push(new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, progress));
    strandB.push(new Vector3(
      Math.cos(angle + Math.PI) * radius,
      Math.sin(angle + Math.PI) * radius,
      progress,
    ));
  }
  const body = new TubeGeometry(spine, 16, 0.38, 4, false);
  const arcA = new TubeGeometry(new CatmullRomCurve3(strandA), 18, 0.095, 3, false);
  const arcB = new TubeGeometry(new CatmullRomCurve3(strandB), 18, 0.095, 3, false);
  const geometry = mergeGeometries([body, arcA, arcB], false);
  body.dispose();
  arcA.dispose();
  arcB.dispose();
  if (!geometry) throw new Error('Unable to build procedural Heat Lance geometry.');
  return geometry;
}

function createShieldGeometry() {
  // A translucent low-poly volume reads as an authored pulse shell. The old
  // six-hoop cage looked like editor/debug rotation guides and hid the craft.
  const indexedShell = new IcosahedronGeometry(0.98, 1);
  const shell = indexedShell.index ? indexedShell.toNonIndexed() : indexedShell.clone();
  const indexedRing = new TorusGeometry(1.025, 0.018, 3, 16);
  const ringZ = indexedRing.index ? indexedRing.toNonIndexed() : indexedRing.clone();
  const ringDiagonalA = ringZ.clone().rotateX(Math.PI * 0.29).rotateY(Math.PI * 0.21);
  const geometry = mergeGeometries([
    shell,
    ringZ,
    ringDiagonalA,
  ], false);
  indexedShell.dispose();
  shell.dispose();
  indexedRing.dispose();
  ringZ.dispose();
  ringDiagonalA.dispose();
  if (!geometry) throw new Error('Unable to build procedural pulse-shell geometry.');
  return geometry;
}

function createHazardTelegraphGeometry(): BufferGeometry {
  const ring = new RingGeometry(0.963, 1, 64).rotateX(-Math.PI / 2);
  const pieces: BufferGeometry[] = [ring];
  // Small flat perimeter ticks retain the real danger radius without erecting
  // multi-metre cubes when the unit shape is scaled to a wide geyser footprint.
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    pieces.push(new BoxGeometry(0.022, 0.001, 0.082)
      .translate(0, 0, 1.035).rotateY(angle));
  }
  const geometry = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();
  if (!geometry) throw new Error('Unable to build hazard footprint.');
  return geometry;
}

function createExplosionPlateGeometry(): BufferGeometry {
  // Dust and brief impact washes share a feathered billboard draw. A separate
  // per-instance kind keeps persistent dust from looking like opaque rubble.
  const geometry = new PlaneGeometry(2, 2);
  geometry.setAttribute('aEffectSurface', new InstancedBufferAttribute(new Float32Array(
    (GALACTIC_EFFECT_CAPACITY.explosionPlates + GALACTIC_EFFECT_CAPACITY.hazardPlumes) * 3,
  ), 3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('aRuptureAtlasSpan', new InstancedBufferAttribute(new Float32Array(
    (GALACTIC_EFFECT_CAPACITY.explosionPlates + GALACTIC_EFFECT_CAPACITY.hazardPlumes) * 2,
  ), 2).setUsage(DynamicDrawUsage));
  return geometry;
}

function createCrashDebrisGeometry(): BufferGeometry {
  // Keep the same twelve triangles. Bent, tapered edges read as torn casing
  // rather than identical luminous boxes; sparks use this draw at a thin scale.
  const geometry = new BoxGeometry(1, 0.38, 1.7);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
    positions.setXYZ(index, x * (z > 0 ? 0.65 : 1), y + z * 0.12 + x * 0.08, z);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('aFragmentMetal', new InstancedBufferAttribute(
    new Float32Array(GALACTIC_EFFECT_CAPACITY.crashDebris), 1,
  ).setUsage(DynamicDrawUsage));
  return geometry;
}

function createCrashDebrisMaterial(): MeshBasicMaterial {
  const result = material(1);
  result.name = 'Burnt casing and sparse hot fragments';
  result.depthWrite = true;
  result.side = FrontSide;
  result.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute float aFragmentMetal;
      varying float vFragmentMetal;
      varying vec3 vFragmentNormal;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vFragmentMetal = aFragmentMetal;
      vec3 fragmentNormal = normal;
      #ifdef USE_INSTANCING
        mat3 fragmentInstance = mat3(instanceMatrix);
        fragmentNormal = fragmentInstance * (fragmentNormal / max(vec3(
          dot(fragmentInstance[0], fragmentInstance[0]),
          dot(fragmentInstance[1], fragmentInstance[1]),
          dot(fragmentInstance[2], fragmentInstance[2])), vec3(0.000001)));
      #endif
      vFragmentNormal = normalize(mat3(modelMatrix) * fragmentNormal);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying float vFragmentMetal;
      varying vec3 vFragmentNormal;
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      float sun = max(0.0, dot(normalize(vFragmentNormal), normalize(vec3(-.42, .76, -.5))));
      // 0: existing hot fragment, 1: casing, 2: contact sand clod.
      // Both solid kinds receive the same actual world-sun facet response.
      diffuseColor.rgb *= mix(1.0, .32 + sun * .86, min(vFragmentMetal, 1.0));
    `);
  };
  result.customProgramCacheKey = () => 'inkstorm-crash-casing-contact-grit-v2';
  return result;
}

function createAtmosphericMaterial(atlas: RuptureFlameAtlas): MeshBasicMaterial {
  const result = material(1);
  result.name = 'Painterly dust and impact wash';
  result.transparent = true;
  result.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, atlas.uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute vec3 aEffectSurface;
      attribute vec2 aRuptureAtlasSpan;
      varying vec2 vRuptureAtlasSpan;
      varying vec3 vEffectSurface;
      varying vec2 vEffectUv;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vEffectSurface = aEffectSurface;
      vRuptureAtlasSpan = aRuptureAtlasSpan;
      vEffectUv = uv;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec3 vEffectSurface;
      varying vec2 vEffectUv;
      ${RUPTURE_ATLAS_GLSL}
      float paintHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float paintNoise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(paintHash(cell), paintHash(cell + vec2(1.0, 0.0)), f.x),
          mix(paintHash(cell + vec2(0.0, 1.0)), paintHash(cell + 1.0), f.x), f.y);
      }
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 p = vEffectUv * 2.0 - 1.0;
      float brush = paintNoise(p * vec2(3.2, 4.7) + vEffectSurface.z);
      float grain = paintNoise(p * vec2(16.0, 10.0) + vEffectSurface.z);
      float radius = length(p);
      float alpha;
      if (vEffectSurface.x > 9.5) {
        // Low directional ejecta occupies a world sheet, not a vertical
        // curtain. Unequal rolling heads break its outer edge; the open skirt
        // still reveals the sand and source casing behind the impulse.
        float t = (p.y + 1.0) * 0.5;
        float settling = step(10.5, vEffectSurface.x);
        float head = 0.68 + 0.12 * sin(p.x * 5.2 + vEffectSurface.z)
          + 0.08 * sin(p.x * 9.1 - vEffectSurface.z * 0.7);
        float lateral = 1.0 - smoothstep(0.72, 1.0, abs(p.x) + (brush - 0.5) * 0.12);
        float front = 1.0 - smoothstep(head - 0.14, head + 0.12, t);
        float channels = smoothstep(0.18, 0.55, grain + brush * 0.22);
        alpha = lateral * front * smoothstep(0.0, 0.055, t)
          * mix(0.52 + 0.48 * channels, 0.40 + 0.60 * brush, settling);
        diffuseColor.rgb *= mix(0.58, 1.25, smoothstep(0.02, 0.72, t))
          * (0.88 + grain * 0.18);
      } else if (uRuptureAtlasReady > 0.5 && vEffectSurface.x > 5.5 && vEffectSurface.x < 7.5) {
        vec4 ink = ruptureArtwork(vEffectSurface.x, vEffectSurface.z, p);
        alpha = ink.a;
        // Crossfades use premultiplied colors; the material still outputs
        // straight alpha through Three's existing transparent blend state.
        diffuseColor.rgb = ink.rgb / max(ink.a, 0.00001);
      } else if (vEffectSurface.x > 7.5) {
        // Two bounded smoke plates, each a different collection of billows.
        // The winning lobe supplies a curved light response, rather than one
        // height ramp across an opaque column. This is authored sprite shading,
        // not a new scene light or a volumetric simulation.
        float age = vEffectSurface.z;
        float layer = step(8.5, vEffectSurface.x);
        vec2 q = p;
        q.x += (paintNoise(p * vec2(3.0, 4.0) + vec2(age * 0.42, -age * 0.8)) - 0.5) * 0.16;
        q.y += (paintNoise(p * vec2(4.0, 3.0) + vec2(-age * 0.3, -age * 0.6)) - 0.5) * 0.12;
        q.x = mix(q.x, -q.x, layer);
        vec2 a = (q - vec2(-0.28, -0.06)) / vec2(0.39, 0.37);
        vec2 b = (q - vec2(0.22, 0.27 + layer * 0.07)) / vec2(0.38, 0.39);
        vec2 c = (q - vec2(0.48, -0.07)) / vec2(0.25, 0.27);
        vec2 lobe = a;
        if (dot(b, b) < dot(lobe, lobe)) lobe = b;
        if (dot(c, c) < dot(lobe, lobe)) lobe = c;
        float distanceToBillow = length(lobe);
        float broken = paintNoise(q * vec2(6.0, 5.0) + vec2(age * 0.3, -age * 0.5));
        float edge = distanceToBillow + (broken - 0.5) * 0.18;
        float density = smoothstep(0.19, 0.62, broken + (1.0 - distanceToBillow) * 0.20);
        // Separate rounded heads leave open channels; the lower skirt cannot
        // grow into a full opaque mask over the informative cut face.
        alpha = (1.0 - smoothstep(0.78, 1.0, edge))
          * smoothstep(-0.63, -0.31, p.y) * (0.36 + density * 0.64);
        vec3 formNormal = normalize(vec3(lobe * 0.75,
          sqrt(max(0.04, 1.0 - dot(lobe, lobe)))));
        float light = clamp(dot(formNormal, normalize(vec3(-0.45, 0.55, 0.70))), 0.0, 1.0);
        float warm = smoothstep(0.06, 0.70, -lobe.y)
          * (1.0 - smoothstep(-0.12, 0.55, p.y));
        diffuseColor.rgb = mix(vec3(0.017, 0.013, 0.016), vec3(0.12, 0.095, 0.073), light)
          + vec3(0.16, 0.045, 0.008) * warm;
        diffuseColor.rgb *= 0.82 + broken * 0.28;
      } else if (vEffectSurface.x > 5.5) {
        // Local +X still follows the real projected cut normal. Pressure birth
        // is a short connected gas mass; retained fire curls and sheds uneven
        // hot pockets. No closest-point tapered rays remain in either phase.
        float age = vEffectSurface.z;
        vec2 q = p;
        float warp = smoothstep(0.04, 0.40, length(p));
        q += vec2(paintNoise(p * vec2(3.5, 4.0) + vec2(-age * 2.6, age * 0.8)) - 0.5,
          paintNoise(p * vec2(4.0, 3.0) + vec2(-age * 1.7, -age * 1.3)) - 0.5) * warp * 0.25;
        float contour;
        float pockets;
        if (vEffectSurface.x < 6.5) {
          // Unequal overlapping lobes produce a broad short pressure pulse.
          float root = length(q / vec2(0.27, 0.40));
          float shoulder = length((q - vec2(0.26, 0.18)) / vec2(0.34, 0.31));
          float lower = length((q - vec2(0.35, -0.18)) / vec2(0.32, 0.24));
          contour = min(root, min(shoulder, lower));
          pockets = 0.8;
        } else {
          float travel = clamp(q.x, 0.0, 1.0);
          // Curvature has zero displacement at the fixed hot root. Advection
          // moves the bends themselves, not just a hash painted on a triangle.
          q.y -= warp * (0.16 * sin(travel * 8.0 - age * 5.0) + travel * travel * 0.27);
          float root = length(q / vec2(0.19, 0.24));
          float body = length((q - vec2(0.26, 0.01)) / vec2(0.30, 0.23));
          float curl = length((q - vec2(0.56, 0.15)) / vec2(0.24, 0.26));
          float tip = length((q - vec2(0.70, 0.31)) / vec2(0.18, 0.15));
          contour = min(root, min(body, min(curl, tip)));
          // A notch and rolling cool channels make irregular separated cores,
          // while the outer gas still gives an attached directional silhouette.
          float notch = length((q - vec2(0.48, 0.28)) / vec2(0.13, 0.15));
          contour = max(contour, (1.0 - notch) * 1.08);
          pockets = paintNoise(q * vec2(7.0, 5.0) + vec2(-age * 3.0, age * 0.7));
        }
        float eroded = contour + (paintNoise(q * vec2(8.0, 6.0)
          + vec2(-age * 2.0, age)) - 0.5) * 0.20;
        float edge = 1.0 - smoothstep(0.77, 1.04, eroded);
        float rootCore = 1.0 - smoothstep(0.045, 0.14, length(p));
        float core = max(rootCore, (1.0 - smoothstep(0.26, 0.73, eroded))
          * smoothstep(0.34, 0.72, pockets));
        diffuseColor.rgb = mix(vec3(1.0, 0.15, 0.012), vec3(1.0, 0.95, 0.73), core);
        alpha = edge * (1.0 - smoothstep(0.88, 1.0, abs(p.x)))
          * (1.0 - smoothstep(0.82, 1.0, abs(p.y)));
      } else if (vEffectSurface.x > 3.5) {
        // Contact ejecta starts at a tight grounded root and opens into a
        // directional sand fan. A broad circular wash cannot mark the strike.
        float height = clamp((p.y + 1.0) * 0.5, 0.0, 1.0);
        float spread = vEffectSurface.x > 4.5 ? 0.62 + height * 0.32 : 0.08 + height * 0.86;
        float edge = abs(p.x + (brush - 0.5) * height * 0.18) / spread;
        alpha = (1.0 - smoothstep(0.65, 1.0, edge))
          * smoothstep(0.0, 0.055, height) * (1.0 - smoothstep(0.76, 1.0, height))
          * (0.78 + brush * 0.22);
        diffuseColor.rgb *= mix(0.60, 1.35, height) * (0.9 + grain * 0.16);
      } else if (vEffectSurface.x > 2.5) {
        // Three broad charcoal billows with a broken painted edge. Full-wreck
        // smoke has mass; the softer dust/hazard wash keeps its original path.
        float lower = length((p - vec2(-0.14, -0.10)) * vec2(1.02, 1.18));
        float rightLobe = length((p - vec2(0.28, 0.19)) * vec2(1.42, 1.52));
        float crown = length((p - vec2(-0.20, 0.39)) * vec2(1.55, 1.56));
        float billow = min(lower, min(rightLobe, crown)) + brush * 0.18 + grain * 0.035;
        alpha = (1.0 - smoothstep(0.57, 0.78, billow))
          * smoothstep(-0.98, -0.61, p.y) * (0.78 + brush * 0.22);
        diffuseColor.rgb *= mix(0.48, 1.5, smoothstep(-0.45, 0.72, p.y)) * (0.8 + grain * 0.3);
      } else if (vEffectSurface.x > 1.5) {
        // A lobed incandescent mass, with the existing fragments supplying
        // sparks. Positive erosion keeps every hot pixel inside the protected
        // world-space radius instead of creating a flat radial star symbol.
        float flameRadius = radius + brush * 0.10 + grain * 0.025;
        float core = 1.0 - smoothstep(0.35, ${RUPTURE_FLASH_CORE_RADIUS}, flameRadius);
        float ivory = 1.0 - smoothstep(0.18, 0.46, flameRadius + (1.0 - brush) * 0.08);
        diffuseColor.rgb = mix(vec3(1.0, 0.30, 0.045), vec3(1.0, 0.98, 0.81), ivory);
        alpha = core;
      } else if (vEffectSurface.x > 0.5) {
        // Soft, uneven rolling lobes with a darker dense belly. Empty corners
        // and a feathered skirt prevent billboard edges or a solid ground seam.
        float lobe = radius + (brush - 0.5) * 0.28;
        alpha = (1.0 - smoothstep(0.34, 0.96, lobe))
          * smoothstep(-1.0, -0.48, p.y) * (0.64 + brush * 0.36);
        diffuseColor.rgb *= mix(0.69, 1.16, smoothstep(-0.6, 0.8, p.y))
          * (0.91 + grain * 0.12);
      } else {
        // A compact flash and broken pressure rim replace the full opaque
        // sixteen-point sheet; brief energy hits still have a decisive center.
        float angle = atan(p.y, p.x);
        float rim = 0.65 + sin(angle * 7.0 + vEffectSurface.z) * 0.055;
        float ring = (1.0 - smoothstep(0.045, 0.14, abs(radius - rim))) * 0.34;
        alpha = max((1.0 - smoothstep(0.1, 0.62, radius)) * 0.72, ring)
          * (0.67 + brush * 0.33);
      }
      diffuseColor.a *= alpha * vEffectSurface.y;
      if (diffuseColor.a < 0.008) discard;
    `);
  };
  result.customProgramCacheKey = () => 'painterly-atmosphere-low-contact-v10';
  return result;
}

function material(opacity: number, additive = false): MeshBasicMaterial {
  const result = new MeshBasicMaterial({
    color: '#ffffff',
    // Instance colors are provided separately by InstancedMesh. Enabling the
    // ordinary vertex-color path on geometry without a `color` attribute
    // multiplied the intended tint by zero and produced black polygons.
    vertexColors: false,
    transparent: additive || opacity < 1,
    opacity,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
  if (additive) result.blending = AdditiveBlending;
  return result;
}

/** Terrain-bound warning paint uses the same physical gulf field as the road. */
function createHazardGroundMaterial(uniforms: CourseGulfUniforms): MeshBasicMaterial {
  const result = material(.62);
  result.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${TERRAIN_GLSL}`)
      .replace('#include <project_vertex>', `
        vec4 groundPoint=vec4(transformed,1.);
        #ifdef USE_INSTANCING
        groundPoint=instanceMatrix*groundPoint;
        #endif
        groundPoint=modelMatrix*groundPoint;
        vec3 groundRegion;
        groundPoint.y=terrainFields(groundPoint.xz,groundRegion)+.14;
        vec4 mvPosition=viewMatrix*groundPoint;
        gl_Position=projectionMatrix*mvPosition;
      `);
  };
  result.customProgramCacheKey = () => 'Inkstorm-terrain-bound-hazard-paint-v1';
  return result;
}

function createHazardMaterial(): MeshBasicMaterial {
  return createSolidEffectMaterial();
}

function createShieldMaterial(): MeshBasicMaterial {
  const result = material(0.25);
  // Only the outward polygon layer is needed; double-sided alpha stacked into
  // an opaque cyan blob at grazing angles.
  result.side = FrontSide;
  return result;
}

function prepare(mesh: InstancedMesh, name: string, order: number): InstancedMesh {
  mesh.name = name;
  mesh.count = 0;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.setColorAt(0, new Color('#ffffff'));
  mesh.instanceColor?.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
  return mesh;
}

function hash01(seed: number): number {
  const value = Math.sin(seed * 91.731 + 17.117) * 43_758.5453;
  return value - Math.floor(value);
}

/** Nine fixed instanced pools, including one owned rear-contact volume mesh. */
export class GalacticEffectsView extends Group {
  private readonly hazardGroundUniforms = createCourseGulfUniforms();

  setTerrainUniforms(uniforms: CourseGulfUniforms): void { Object.assign(this.hazardGroundUniforms, uniforms); }

  readonly shieldShells = prepare(new InstancedMesh(
    createShieldGeometry(),
    createShieldMaterial(),
    GALACTIC_EFFECT_CAPACITY.shields,
  ), 'galactic-shield-shells', 28);

  readonly weaponBolts = prepare(new InstancedMesh(
    new CylinderGeometry(0.18, 0.07, 1, 5),
    material(1, true),
    GALACTIC_EFFECT_CAPACITY.weaponBolts,
  ), 'galactic-weapon-bolts', 29);

  readonly heatLances = prepare(new InstancedMesh(
    createHeatLanceGeometry(),
    material(1, true),
    GALACTIC_EFFECT_CAPACITY.heatLances,
  ), 'galactic-heat-lances', 29);

  readonly scrapMines = prepare(new InstancedMesh(
    createSolidHardwareGeometry(),
    createSolidEffectMaterial(true),
    GALACTIC_EFFECT_CAPACITY.scrapMines,
  ), 'galactic-scrap-mines', 23);

  readonly hazardTelegraphs = prepare(new InstancedMesh(
    createHazardTelegraphGeometry(),
    createHazardGroundMaterial(this.hazardGroundUniforms),
    GALACTIC_EFFECT_CAPACITY.hazardTelegraphs,
  ), 'galactic-hazard-telegraphs', 21);

  readonly hazardBodies = prepare(new InstancedMesh(
    createSolidRubbleGeometry(),
    createHazardMaterial(),
    GALACTIC_EFFECT_CAPACITY.hazardBodies,
  ), 'galactic-hazard-bodies', 22);

  readonly crashDebris = prepare(new InstancedMesh(
    createCrashDebrisGeometry(),
    createCrashDebrisMaterial(),
    GALACTIC_EFFECT_CAPACITY.crashDebris,
  ), 'galactic-crash-debris', 30);

  readonly contactDust = prepare(new InstancedMesh(
    createContactDustGeometry(), createContactDustMaterial(), GALACTIC_EFFECT_CAPACITY.contactDust,
  ), 'galactic-ground-contact-volume', 24);
  private readonly contactDustSlots = Array.from({ length: GALACTIC_EFFECT_CAPACITY.contactDust },
    (): ContactDustSlot => ({ active: false, startTime: 0, owner: -1, sequence: -1, terrain: null,
      x: 0, z: 0, axisX: 1, axisZ: 0, sign: 1, along: 0, drift: 1, width: 1, peak: 1.5,
      lastAge: NaN, matrix: new Matrix4(), cx: 0, cy: 0, cz: 0, radius: 0 }));
  private contactDustCursor = 0;
  private readonly contactDustAge = new InstancedBufferAttribute(
    new Float32Array(GALACTIC_EFFECT_CAPACITY.contactDust), 1).setUsage(DynamicDrawUsage);
  private readonly contactGroundHeights = new Float64Array(9);

  private readonly ruptureFlameAtlas = new RuptureFlameAtlas();

  readonly explosionPlates = prepare(new InstancedMesh(
    createExplosionPlateGeometry(),
    createAtmosphericMaterial(this.ruptureFlameAtlas),
    GALACTIC_EFFECT_CAPACITY.explosionPlates + GALACTIC_EFFECT_CAPACITY.hazardPlumes,
  ), 'galactic-explosion-plates', 31);

  private readonly shieldSlots = Array.from(
    { length: GALACTIC_EFFECT_CAPACITY.shields },
    (): ShieldSlot => ({ x: 0, y: 0, z: 0, radius: 1, intensity: 1, phase: 0, mode: 'shield', r: 0, g: 1, b: 1 }),
  );
  private readonly boltSlots = Array.from(
    { length: GALACTIC_EFFECT_CAPACITY.weaponBolts },
    (): BeamSlot => ({ x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 1, width: 0.2, intensity: 1, phase: 0, r: 0.3, g: 0.9, b: 1 }),
  );
  private readonly lanceSlots = Array.from(
    { length: GALACTIC_EFFECT_CAPACITY.heatLances },
    (): BeamSlot => ({ x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 1, width: 0.3, intensity: 1, phase: 0, r: 1, g: 0.3, b: 0.08 }),
  );
  private readonly mineSlots = Array.from(
    { length: GALACTIC_EFFECT_CAPACITY.scrapMines },
    (): MineSlot => ({ x: 0, y: 0, z: 0, yaw: 0, scale: 1, armed: false, phase: 0, variant: 'mine' }),
  );
  private readonly hazardSlots = Array.from(
    { length: GALACTIC_EFFECT_CAPACITY.hazardTelegraphs },
    (): HazardSlot => ({ kind: 'heat-vent', x: 0, y: 0, z: 0, radius: 1, height: 2, intensity: 1, phase: 0, warning: 1 }),
  );
  private readonly debrisSlots = Array.from(
    { length: GALACTIC_EFFECT_CAPACITY.crashDebris },
    (): DebrisSlot => ({ active: false, startTime: 0, duration: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, ax: 0, ay: 0, az: 0, scale: 1, groundY: 0, metal: false, spark: false, ember: false, contactSpark: false, contactGround: false, authoredEjection: false, emberPhase: 0, wreckOwner: -1, wreckSequence: -1, r: 1, g: 0.3, b: 0.1 }),
  );
  private readonly explosionSlots = Array.from(
    { length: GALACTIC_EFFECT_CAPACITY.explosionPlates },
    (): ExplosionSlot => ({
      active: false,
      startTime: 0,
      duration: 0,
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      style: 'crash',
      billboard: false,
      contactLayer: -1, contactHalfLength: 0, contactHalfWidth: 0,
      authoredSurface: false,
      wreckOwner: -1, wreckSequence: -1, nx: 0, ny: 0, nz: 1,
      vx: 0,
      vz: 0,
      r: 1,
      g: 0.3,
      b: 0.1,
    }),
  );

  private shieldCount = 0;
  private boltCount = 0;
  private lanceCount = 0;
  private mineCount = 0;
  private hazardCount = 0;
  private plumeCount = 0;
  private debrisCursor = 0;
  private explosionCursor = 0;
  private eventSequence = 0;
  private readonly tempPosition = new Vector3();
  private readonly tempScale = new Vector3();
  private readonly direction = new Vector3();
  private readonly ruptureAxis = new Vector3();
  private readonly ruptureEjection = new Vector3();
  private readonly ruptureRotation = new Quaternion();
  private readonly midpoint = new Vector3();
  private readonly tempQuaternion = new Quaternion();
  private readonly beamTwistQuaternion = new Quaternion();
  private readonly billboardQuaternion = new Quaternion();
  private readonly billboardToCamera = new Vector3();
  private readonly euler = new Euler();
  private readonly tempMatrix = new Matrix4();
  private readonly viewProjection = new Matrix4();
  private readonly viewFrustum = new Frustum();
  private readonly visibilitySphere = new Sphere();
  private readonly color = new Color();
  private visibilityCamera: Camera | null = null;

  constructor(options?: { readonly flameAtlas?: RuptureAtlasOptions }) {
    super();
    // Boot/warmup request only. Pure CPU/default views perform no image I/O.
    if (options?.flameAtlas) this.ruptureFlameAtlas.load(options.flameAtlas);
    this.name = 'galactic-effects';
    // Solid hazard matter must occlude outlines too, not only the beauty pass.
    this.hazardBodies.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = false;
    this.scrapMines.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = false;
    // Keep opaque depth/silhouettes while attenuating the triangle-edge ink.
    // The existing flag reduces all Sobel ink; it does not alter world masks.
    this.hazardBodies.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
    this.scrapMines.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
    this.contactDust.geometry.setAttribute('aContactAge', this.contactDustAge);
    this.contactDust.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = false;
    this.contactDust.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
    this.add(
      this.shieldShells,
      this.weaponBolts,
      this.heatLances,
      this.scrapMines,
      this.hazardTelegraphs,
      this.hazardBodies,
      this.crashDebris,
      this.explosionPlates,
      this.contactDust,
    );
  }

  get flameAtlasDiagnostics() { return this.ruptureFlameAtlas.diagnostics; }

  setState(state: Readonly<GalacticEffectsState>): void {
    this.setShields(state.shields ?? EMPTY_STATES);
    this.setWeaponBolts(state.weaponBolts ?? EMPTY_STATES);
    this.setHeatLances(state.heatLances ?? EMPTY_STATES);
    this.setScrapMines(state.scrapMines ?? EMPTY_STATES);
    this.setHazards(state.hazards ?? EMPTY_STATES);
  }

  setShields(states: readonly ShieldEffectState[]): void {
    this.shieldCount = Math.min(states.length, this.shieldSlots.length);
    for (let index = 0; index < this.shieldCount; index += 1) {
      const state = states[index];
      const slot = this.shieldSlots[index];
      if (!state || !slot) continue;
      slot.x = finite(state.position.x, 0);
      slot.y = finite(state.position.y, 0);
      slot.z = finite(state.position.z, 0);
      slot.radius = positive(state.radius, 1);
      slot.intensity = MathUtils.clamp(finite(state.intensity, 1), 0, 1.5);
      slot.phase = finite(state.phase, 0);
      slot.mode = state.mode ?? 'shield';
      this.writeColor(slot, state.color, '#72f4ff');
    }
  }

  setWeaponBolts(states: readonly WeaponBoltEffectState[]): void {
    this.boltCount = Math.min(states.length, this.boltSlots.length);
    for (let index = 0; index < this.boltCount; index += 1) {
      const state = states[index];
      const slot = this.boltSlots[index];
      if (!state || !slot) continue;
      this.copyBeam(slot, state.origin, state.target, state.radius, state.intensity, 0, state.color, '#66ecff');
    }
  }

  setHeatLances(states: readonly HeatLanceEffectState[]): void {
    this.lanceCount = Math.min(states.length, this.lanceSlots.length);
    for (let index = 0; index < this.lanceCount; index += 1) {
      const state = states[index];
      const slot = this.lanceSlots[index];
      if (!state || !slot) continue;
      this.copyBeam(slot, state.origin, state.target, state.width, state.intensity, state.phase, state.color, '#ff5a1f');
    }
  }

  setScrapMines(states: readonly ScrapMineEffectState[]): void {
    this.mineCount = Math.min(states.length, this.mineSlots.length);
    for (let index = 0; index < this.mineCount; index += 1) {
      const state = states[index];
      const slot = this.mineSlots[index];
      if (!state || !slot) continue;
      slot.x = finite(state.position.x, 0);
      slot.y = finite(state.position.y, 0);
      slot.z = finite(state.position.z, 0);
      slot.yaw = finite(state.yaw, 0);
      slot.scale = positive(state.scale, 1);
      slot.armed = state.armed === true;
      slot.phase = finite(state.phase, 0);
      slot.variant = state.variant === 'pickup' || state.variant === 'emp' || state.variant === 'repair'
        ? state.variant : 'mine';
    }
  }

  setHazards(states: readonly HazardEffectState[]): void {
    this.hazardCount = Math.min(states.length, this.hazardSlots.length);
    for (let index = 0; index < this.hazardCount; index += 1) {
      const state = states[index];
      const slot = this.hazardSlots[index];
      if (!state || !slot) continue;
      slot.kind = state.kind;
      slot.x = finite(state.position.x, 0);
      slot.y = finite(state.position.y, 0);
      slot.z = finite(state.position.z, 0);
      slot.radius = positive(state.radius, 1);
      slot.height = positive(state.height, state.kind === 'rockfall' ? 2.2 : 4);
      slot.intensity = MathUtils.clamp(finite(state.intensity, 1), 0, 1.5);
      slot.phase = finite(state.phase, 0);
      slot.warning = MathUtils.clamp(finite(state.warning, 1), 0, 1);
    }
  }

  /** Adds a deterministic burst to the fixed crash pools; no scene nodes spawn. */
  emit(event: GalacticEffectEvent): void {
    this.emitCrash(event);
  }

  emitCrash(event: CrashEffectEvent): void {
    const severity = MathUtils.clamp(finite(event.severity, 1), 0.2, 2);
    const style = event.style ?? 'crash';
    const contactBurst = style === 'redline' || style === 'crash';
    const authoredY = finite(event.position.y, 0);
    const surface = event.surfaceNormal;
    const surfaceLength = surface ? Math.hypot(surface.x, surface.y, surface.z) : 0;
    const authoredSurface = contactBurst && !!surface
      && Number.isFinite(surface.x + surface.y + surface.z)
      && Number.isFinite(surfaceLength) && surfaceLength > .001;
    if (authoredSurface) {
      this.ruptureAxis.set(surface!.x, surface!.y, surface!.z).multiplyScalar(1 / surfaceLength);
      this.ruptureRotation.setFromUnitVectors(FORWARD, this.ruptureAxis);
    }
    const tracked = authoredSurface && Number.isInteger(event.wreckOwner) && event.wreckOwner! >= 0 && event.wreckOwner! < 8
      && Number.isInteger(event.wreckSequence) && event.wreckSequence! >= 0;
    // A long, rigid wreck can rotate an authored nozzle beneath the ground.
    // Project only the render burst onto the sampled surface, keeping X/Z.
    // Clearance covers the flash's maximum bright-core radius plus a small
    // depth pad; this is presentation projection, not a physics contact point.
    const burstY = contactBurst && !authoredSurface && Number.isFinite(event.groundY)
      ? Math.max(authoredY, event.groundY! + severity * RUPTURE_FLASH_SCALE * RUPTURE_FLASH_CORE_RADIUS + 0.04)
      : authoredY;
    // Recovery restores the craft; it does not tear off opaque casing. The
    // former energy route launched green chunks through the returning camera.
    const fragmentCount = style === 'recovery' ? 0
      : Math.min(18, Math.max(7, Math.round((style === 'rock' ? 9 : 11) * severity)));
    const fallbackColor = style === 'recovery' ? '#60ff91' : style === 'reward' || style === 'energy'
      ? '#55ffc1'
      : style === 'sand'
        ? '#ffd071'
        : style === 'rock'
          ? '#7f3f25'
          : style === 'redline'
            ? '#ff301d'
            : '#ff6a24';
    const radialScale = style === 'reward'
      ? 0.72
      : style === 'sand'
        ? 1.15
        : style === 'rock'
          ? 0.86
          : style === 'mine'
            ? 1.1
            : 1.25;
    const liftScale = style === 'reward' ? 1.7 : style === 'sand' ? 1.35 : style === 'rock' ? 1.05 : 1.45;
    const fragmentScale = style === 'sand'
      ? 0.8
      : style === 'rock'
        ? 1.35
        : style === 'reward' || style === 'energy'
          ? 0.55
          : style === 'mine'
            ? 0.55
            : 1;
    const inheritedVelocity = style === 'mine' ? 0.025 : style === 'sand' || style === 'rock' ? 0.08 : 0.14;
    this.color.set(event.color ?? fallbackColor);
    this.eventSequence += 1;
    for (let fragment = 0; fragment < fragmentCount; fragment += 1) {
      const slot = this.debrisSlots[this.debrisCursor];
      if (!slot) break;
      this.debrisCursor = (this.debrisCursor + 1) % this.debrisSlots.length;
      const seed = this.eventSequence * 31 + fragment * 7;
      const directed = contactBurst && event.direction && Number.isFinite(event.direction.x + event.direction.z)
        && Math.hypot(event.direction.x, event.direction.z) > .001;
      const angle = directed
        ? Math.atan2(-event.direction!.z, -event.direction!.x) + (hash01(seed) - .5) * 2.4
        : hash01(seed) * Math.PI * 2;
      if (authoredSurface) {
        // Stratified sectors prevent a thin rising column when the source
        // normal points upward. Every fragment remains in its outward half-space.
        const cone = .42 + hash01(seed + 16) * .58;
        // Leaders1/7/13 previously shared sector1, hiding their silhouette
        // punctuation in one lane. Keep satellites unchanged; place the three
        // leaders in separate outward sectors of the same source-normal cone.
        const sector = fragment % 6 === 1 ? Math.floor(fragment / 6) * 2 : fragment % 6;
        const azimuth = (sector + .15 + hash01(seed + 17) * .7) * Math.PI / 3;
        this.ruptureEjection.set(Math.sin(cone) * Math.cos(azimuth), Math.sin(cone) * Math.sin(azimuth), Math.cos(cone))
          .applyQuaternion(this.ruptureRotation);
      }
      const ember = tracked && fragment >= fragmentCount - 2;
      const spark = ember || (contactBurst ? fragment % 6 === 0 : fragment % 4 === 0);
      const radial = contactBurst
        ? ((spark ? 24 : 18) + hash01(seed + 1) * (spark ? 16 : 12)) * Math.sqrt(severity)
        : (5.5 + hash01(seed + 1) * 11) * severity * radialScale;
      slot.active = true;
      slot.contactSpark = false; slot.contactGround = false;
      slot.authoredEjection = authoredSurface;
      slot.ember = ember; slot.emberPhase = ember && fragment === fragmentCount - 1 ? .21 : 0; slot.wreckOwner = ember ? event.wreckOwner! : -1;
      slot.wreckSequence = ember ? event.wreckSequence! : -1;
      slot.startTime = finite(event.time, 0);
      slot.duration = ember ? 2.15 : contactBurst
        ? (spark ? 0.24 + hash01(seed + 2) * 0.22 : 1.25 + hash01(seed + 2) * 0.65)
        : 0.85 + hash01(seed + 2) * 1.15;
      slot.x = finite(event.position.x, 0);
      slot.y = burstY;
      slot.z = finite(event.position.z, 0);
      if (contactBurst) {
        // Open casing fragments already occupy a short rupture cone at birth,
        // so the slow-motion impact reads before the flare has disappeared.
        const opening = (.8 + hash01(seed + 14) * .7) * Math.sqrt(severity);
        slot.x += (authoredSurface ? this.ruptureEjection.x : Math.cos(angle)) * opening;
        slot.y += authoredSurface ? this.ruptureEjection.y * opening : 0;
        slot.z += (authoredSurface ? this.ruptureEjection.z : Math.sin(angle)) * opening;
      }
      slot.vx = finite(event.velocity?.x, 0) * inheritedVelocity + (authoredSurface ? this.ruptureEjection.x : Math.cos(angle)) * radial;
      slot.vy = finite(event.velocity?.y, 0) * 0.12
        + (authoredSurface ? this.ruptureEjection.y * radial
          : contactBurst ? (4 + hash01(seed + 3) * 8) * Math.sqrt(severity)
          : (5.5 + hash01(seed + 3) * 11) * severity * liftScale);
      slot.vz = finite(event.velocity?.z, 0) * inheritedVelocity + (authoredSurface ? this.ruptureEjection.z : Math.sin(angle)) * radial;
      slot.rx = hash01(seed + 4) * Math.PI;
      slot.ry = hash01(seed + 5) * Math.PI;
      slot.rz = hash01(seed + 6) * Math.PI;
      slot.ax = (hash01(seed + 7) - 0.5) * 15;
      slot.ay = (hash01(seed + 8) - 0.5) * 15;
      slot.az = (hash01(seed + 9) - 0.5) * 15;
      slot.scale = contactBurst
        ? (spark ? 0.28 + hash01(seed + 10) * 0.2 : 0.42 + hash01(seed + 10) * 0.35) * Math.sqrt(severity)
        : (0.12 + hash01(seed + 10) * 0.38) * severity * fragmentScale;
      if (authoredSurface && !spark) {
        // Three casing plates carry the silhouette; smaller satellites reveal
        // the direction without making every fragment the same black block.
        slot.scale = (fragment % 6 === 1 ? (.91 + hash01(seed + 10) * .16) * 1.15
          : .27 + hash01(seed + 10) * .28) * Math.sqrt(severity);
      }
      if (ember) {
        slot.vx = this.ruptureEjection.x * 5; slot.vy = this.ruptureEjection.y * 5 + 2;
        slot.vz = this.ruptureEjection.z * 5; slot.scale = .2;
      }
      slot.groundY = finite(event.groundY, event.position.y - 1);
      slot.metal = contactBurst && !spark;
      slot.spark = contactBurst && spark;
      slot.r = spark ? (style === 'reward' ? 1 : style === 'energy' ? 0.72 : 1) : this.color.r * (0.72 + hash01(seed + 11) * 0.28);
      slot.g = spark ? (style === 'reward' ? 0.86 : style === 'mine' || style === 'redline' ? 0.84 : 1) : this.color.g * (0.72 + hash01(seed + 12) * 0.28);
      slot.b = spark ? (style === 'reward' ? 0.24 : style === 'energy' ? 1 : 0.38) : this.color.b * (0.72 + hash01(seed + 13) * 0.28);
      if (slot.metal) {
        // Neutral burnt metal owns fifteen of eighteen full-wreck silhouettes.
        // Input signal color must not turn every fragment into a red light.
        const value = 0.055 + hash01(seed + 11) * 0.065;
        slot.r = value * 1.08;
        slot.g = value * 0.9;
        slot.b = value * 0.82;
      } else if (slot.spark) {
        slot.r = 1;
        slot.g = fragment % 12 === 0 ? 0.88 : 0.5;
        slot.b = fragment % 12 === 0 ? 0.56 : 0.13;
      }
    }

    const plateCount = style === 'rock' || style === 'recovery' ? 2 : contactBurst || style === 'reward' || style === 'energy' ? 4 : 3;
    for (let plate = 0; plate < plateCount; plate += 1) {
      const slot = this.explosionSlots[this.explosionCursor];
      if (!slot) break;
      this.explosionCursor = (this.explosionCursor + 1) % this.explosionSlots.length;
      slot.active = true;
      slot.contactLayer = contactBurst ? plate : -1;
      slot.authoredSurface = authoredSurface;
      slot.wreckOwner = tracked ? event.wreckOwner! : -1; slot.wreckSequence = tracked ? event.wreckSequence! : -1;
      slot.nx = authoredSurface ? this.ruptureAxis.x : 0; slot.ny = authoredSurface ? this.ruptureAxis.y : 0;
      slot.nz = authoredSurface ? this.ruptureAxis.z : 1;
      slot.vx = 0; slot.vz = 0;
      if (contactBurst) {
        // A hot core, amber pressure flare and two smoke lobes read against
        // the full-size engines. Their four slots and lifetimes stay bounded.
        slot.startTime = finite(event.time, 0) + (authoredSurface && plate === 1 ? .065 : plate === 0 ? 0 : plate * 0.025);
        slot.duration = (tracked ? [.24, 2.05, 2.05, 2.15] : [.22, .42, 1.6, 1.9])[plate]!;
        // End the authored pressure peak before the retained aftermath. Fire
        // starts at .065 s, providing a short overlap without a dark gap.
        if (authoredSurface && plate === 0) slot.duration = .085;
        slot.x = finite(event.position.x, 0);
        slot.y = burstY + (plate > 1 ? (plate - 1) * 0.35 : 0);
        slot.z = finite(event.position.z, 0);
        if (authoredSurface && plate > 1) {
          slot.vx = this.ruptureAxis.x * (plate === 2 ? 1.2 : 2);
          slot.vz = this.ruptureAxis.z * (plate === 2 ? 1.2 : 2);
        }
        slot.scale = severity * [RUPTURE_FLASH_SCALE,
          authoredSurface ? 2.45 : tracked ? 1.25 : 3.5, 2.7, 3.2][plate]!;
        slot.billboard = true;
        slot.style = style;
        slot.r = [1, 1, 0.075, 0.14][plate]!;
        slot.g = [0.9, 0.42, 0.065, 0.11][plate]!;
        slot.b = [0.62, 0.08, 0.055, 0.085][plate]!;
        continue;
      }
      if (style === 'recovery') {
        // Two small surface pulses share the existing transparent plate pool.
        // Keep them below the pilot and expire before ordinary driving
        // resumes; no ballistic fragments or independent recovery timer.
        slot.startTime = finite(event.time, 0) + plate * .04;
        slot.duration = .26 + plate * .08;
        slot.x = finite(event.position.x, 0);
        slot.y = finite(event.groundY, authoredY - 1) + .12 + plate * .15;
        slot.z = finite(event.position.z, 0);
        slot.scale = severity * (.9 + plate * .25);
        slot.style = style;
        slot.billboard = false;
        slot.r = this.color.r; slot.g = this.color.g; slot.b = this.color.b;
        continue;
      }
      slot.startTime = finite(event.time, 0) + plate * 0.035;
      slot.duration = (style === 'reward' ? 0.62 : style === 'mine' ? 0.52 : 0.42) + plate * 0.1;
      slot.x = finite(event.position.x, 0);
      slot.billboard = style === 'mine' && plate > 0;
      slot.y = style === 'rock'
        ? finite(event.groundY, event.position.y - 1) + 0.15 + plate * 0.06
        : style === 'mine'
        ? finite(event.groundY, event.position.y - 1)
          + (plate === 0 ? 0.12 : 1.2 + plate * 0.8)
        : style === 'reward'
          ? finite(event.position.y, 0) - 1.2 + plate * 0.9
          : finite(event.position.y, 0) + plate * 0.22;
      slot.z = finite(event.position.z, 0);
      slot.scale = style === 'rock'
        ? severity * (1.4 + plate * 0.8)
        : style === 'mine'
        ? severity * (plate === 0 ? 4.8 : 3.4 + plate * 1.15)
        : style === 'reward'
          ? severity * (2.2 + plate * 0.55)
          : severity * (2.4 + plate * 1.35);
      slot.style = style;
      slot.r = style === 'rock' ? this.color.r : plate === 0 ? 1 : this.color.r;
      slot.g = style === 'rock' ? this.color.g : plate === 0 ? (style === 'reward' ? 0.86 : 1) : this.color.g;
      slot.b = style === 'rock' ? this.color.b : plate === 0 ? (style === 'reward' ? 0.24 : style === 'energy' ? 1 : 0.46) : this.color.b;
    }
  }

  /** One sampled engine/sand presentation contact, deduplicated by the caller.
   * Authored terrain/owner context selects five closed rolling dust cores;
   * point or context-free calls retain their existing two-plate behavior.
   */
  emitWreckGroundContact(time: number, position: GalacticPoint, direction: GalacticPoint, footprint?: WreckGroundFootprint, surface?: WreckGroundSurfaceContext): void {
    if (!Number.isFinite(time + position.x + position.y + position.z + direction.x + direction.z)) return;
    const length = Math.hypot(direction.x, direction.z);
    if (length < .001) return;
    const dx = -direction.x / length, dz = -direction.z / length;
    const heading = Math.atan2(dz, dx);
    const span = footprint && Number.isFinite(footprint.center.x + footprint.center.y + footprint.center.z
      + footprint.axis.x + footprint.axis.z + footprint.halfLength + footprint.halfWidth)
      && footprint.halfLength >= 1 && footprint.halfLength <= 12 && footprint.halfWidth >= 0 && footprint.halfWidth <= 6
      && Math.abs(Math.hypot(footprint.axis.x, footprint.axis.z) - 1) < .001 ? footprint : undefined;
    // A malformed optional edge pair falls back to the admitted centre fan.
    // Copy only bounded scalar data into the existing two slots; the producer
    // reuses these vectors on every rendered pose.
    let edges = span?.edges;
    if (edges) for (let index = 0; index < 2; index++) {
      const edge = edges[index], sign = index === 0 ? -1 : 1;
      const ex = edge ? edge.x - span!.center.x : NaN, ez = edge ? edge.z - span!.center.z : NaN;
      const along = ex * span!.axis.x + ez * span!.axis.z;
      const across = (ex * span!.axis.z - ez * span!.axis.x) * sign;
      if (!edge || !Number.isFinite(edge.x + edge.y + edge.z) || Math.abs(along) > span!.halfLength + 4
        || across < Math.max(.05, span!.halfWidth) || across > 6 || Math.abs(edge.y - span!.center.y) > 6) { edges = undefined; break; }
    }
    const origin = span?.center ?? position;
    this.eventSequence++;
    for (let index = 0; index < 10; index++) {
      const slot = this.debrisSlots[this.debrisCursor]!;
      this.debrisCursor = (this.debrisCursor + 1) % this.debrisSlots.length;
      const seed = this.eventSequence * 31 + index * 7;
      const angle = heading + (hash01(seed) - .5) * 1.8;
      const speed = 12 + hash01(seed + 1) * 14;
      slot.active = true; slot.startTime = time; slot.duration = .28 + hash01(seed + 2) * .20;
      const along = span ? (index / 9 - .5) * span.halfLength * 1.8 : 0;
      slot.x = origin.x + (span?.axis.x ?? 0) * along;
      slot.y = origin.y + .18; slot.z = origin.z + (span?.axis.z ?? 0) * along;
      slot.vx = Math.cos(angle) * speed; slot.vz = Math.sin(angle) * speed;
      slot.vy = 2 + hash01(seed + 3) * 4;
      slot.rx = 0; slot.ry = 0; slot.rz = 0; slot.ax = 0; slot.ay = 0; slot.az = 0;
      slot.scale = .34 + hash01(seed + 4) * .20;
      slot.groundY = origin.y; slot.metal = false; slot.spark = true; slot.contactSpark = true; slot.authoredEjection = false;
      slot.ember = false; slot.emberPhase = 0; slot.wreckOwner = -1; slot.wreckSequence = -1;
      slot.contactGround = !!span;
      slot.r = 1; slot.g = index % 3 === 0 ? .87 : .48; slot.b = index % 3 === 0 ? .5 : .09;
      if (span) {
        // Same ten entries: three raking casing pieces and seven short sand
        // clods. The measured birth band is unchanged; these are departing
        // particles, not additional contact witnesses or gameplay impacts.
        const casing = index < 3, rakeSpeed = casing ? 10 + hash01(seed + 1) * 5 : 5 + hash01(seed + 1) * 5;
        slot.vx = Math.cos(angle) * rakeSpeed; slot.vz = Math.sin(angle) * rakeSpeed;
        slot.vy = 2 + hash01(seed + 3) * 2;
        slot.rx = hash01(seed + 5) * 2; slot.ry = hash01(seed + 6) * 6; slot.rz = hash01(seed + 7) * 2;
        slot.ax = (hash01(seed + 8) - .5) * 8; slot.ay = (hash01(seed + 9) - .5) * 6; slot.az = (hash01(seed + 10) - .5) * 8;
        slot.scale = casing ? .60 + hash01(seed + 4) * .18 : .20 + hash01(seed + 4) * .16;
        slot.metal = casing; slot.spark = false; slot.contactSpark = false;
        slot.r = casing ? .14 : .52; slot.g = casing ? .12 : .31; slot.b = casing ? .10 : .12;
      }
    }
    if (span && edges && surface && typeof surface.terrain?.heightAt === 'function'
      && Number.isInteger(surface.owner) && surface.owner >= 0 && surface.owner < 8
      && Number.isSafeInteger(surface.sequence) && surface.sequence >= 0) {
      const inverseAxis = 1 / Math.hypot(span.axis.x, span.axis.z);
      for (let index = 0; index < 5; index++) {
        const slot = this.contactDustSlots[this.contactDustCursor]!;
        this.contactDustCursor = (this.contactDustCursor + 1) % this.contactDustSlots.length;
        // Indexed source edges, never a camera-facing offset or new witness.
        const edgeIndex = index < 3 ? 1 : 0, edge = edges[edgeIndex]!;
        slot.active = true; slot.startTime = time; slot.owner = surface.owner;
        slot.sequence = surface.sequence; slot.terrain = surface.terrain;
        slot.x = edge.x; slot.z = edge.z; slot.axisX = span.axis.x * inverseAxis;
        slot.axisZ = span.axis.z * inverseAxis; slot.sign = edgeIndex ? 1 : -1;
        slot.along = span.halfLength * (index < 3 ? (index - 1) * .68 : (index - 3.5) * .8);
        slot.drift = .8 + hash01(index * 7 + this.eventSequence) * .4;
        slot.width = .82 + hash01(index * 11 + this.eventSequence) * .26;
        slot.peak = 1.3 + hash01(index * 13 + this.eventSequence) * .5;
        slot.lastAge = NaN;
      }
      return;
    }
    for (let index = 0; index < 2; index++) {
      const slot = this.explosionSlots[this.explosionCursor]!;
      this.explosionCursor = (this.explosionCursor + 1) % this.explosionSlots.length;
      slot.active = true; slot.startTime = time + index * .04; slot.duration = index === 0 ? .52 : 1.15;
      const edge = edges?.[index], sign = index === 0 ? -1 : 1;
      const outX = edge ? span!.axis.z * sign : dx, outZ = edge ? -span!.axis.x * sign : dz;
      slot.x = edge?.x ?? origin.x + dx * index * .7; slot.z = edge?.z ?? origin.z + dz * index * .7;
      slot.y = (edge?.y ?? origin.y) + .08;
      slot.vx = outX * (index === 0 ? 3.2 : 4.8); slot.vz = outZ * (index === 0 ? 3.2 : 4.8);
      slot.scale = index === 0 ? 3.8 : 4.6;
      slot.style = 'sand'; slot.billboard = true; slot.contactLayer = 4 + index;
      slot.contactHalfLength = span?.halfLength ?? 0; slot.contactHalfWidth = span?.halfWidth ?? 0;
      slot.nx = span?.axis.x ?? 0; slot.nz = span?.axis.z ?? 1;
      slot.authoredSurface = false; slot.wreckOwner = -1; slot.wreckSequence = -1;
      slot.r = index === 0 ? .31 : .65; slot.g = index === 0 ? .18 : .42; slot.b = index === 0 ? .065 : .19;
    }
  }

  /** Move retained heat/smoke/embers with the displayed cut. No new emission,
   * objects, timers or slots: a wrapped pool entry never follows its old owner.
   * Call once per racer before update; missing/recovered geometry clears only
   * that owner's retained aftermath, leaving unrelated effects untouched. */
  syncWreckRupture(owner: number, sequence: number, rupture?: { readonly position: GalacticPoint; readonly direction: GalacticPoint }): void {
    if (!Number.isInteger(owner) || owner < 0 || owner >= 8) return;
    const p = rupture?.position, n = rupture?.direction;
    const length = n ? Math.hypot(n.x, n.y, n.z) : 0;
    const valid = !!p && !!n && Number.isInteger(sequence) && Number.isFinite(p.x + p.y + p.z + length) && length > .001;
    for (const slot of this.contactDustSlots) {
      if (slot.active && slot.owner === owner && (!valid || slot.sequence !== sequence)) {
        slot.active = false; slot.terrain = null;
      }
    }
    for (const slot of this.explosionSlots) {
      if (!slot.active || slot.wreckOwner !== owner) continue;
      if (!valid || slot.wreckSequence !== sequence) { slot.active = false; continue; }
      slot.nx = n!.x / length; slot.ny = n!.y / length; slot.nz = n!.z / length;
      const offset = slot.contactLayer === 0 ? 0 : slot.contactLayer === 1 ? .6 : .35;
      slot.x = p!.x + slot.nx * offset; slot.y = p!.y + slot.ny * offset;
      slot.z = p!.z + slot.nz * offset;
      if (slot.contactLayer > 1) {
        slot.vx = slot.nx * (slot.contactLayer === 2 ? 1.2 : 2);
        slot.vz = slot.nz * (slot.contactLayer === 2 ? 1.2 : 2);
      }
    }
    for (const slot of this.debrisSlots) {
      if (!slot.active || !slot.ember || slot.wreckOwner !== owner) continue;
      if (!valid || slot.wreckSequence !== sequence) { slot.active = false; continue; }
      slot.x = p!.x + n!.x / length * .5; slot.y = p!.y + n!.y / length * .5; slot.z = p!.z + n!.z / length * .5;
      slot.vx = n!.x / length * 5; slot.vy = n!.y / length * 5 + 2; slot.vz = n!.z / length * 5;
    }
  }

  update(time: number, camera?: Camera): void {
    this.prepareVisibility(camera);
    if (camera) {
      camera.getWorldQuaternion(this.billboardQuaternion);
      this.billboardToCamera.set(0, 0, 1).applyQuaternion(this.billboardQuaternion);
    } else {
      this.billboardQuaternion.identity();
      this.billboardToCamera.set(0, 0, 0);
    }
    this.updateShields(time);
    this.updateWeaponCores(time);
    this.updateBeams(this.heatLances, this.lanceSlots, this.lanceCount, true, time);
    this.updateMines(time);
    this.updateHazards(time);
    this.updateCrash(time);
    this.updateContactDust(time);
  }

  clearEffects(): void {
    this.shieldCount = 0;
    this.boltCount = 0;
    this.lanceCount = 0;
    this.mineCount = 0;
    this.hazardCount = 0;
    this.plumeCount = 0;
    for (const slot of this.contactDustSlots) { slot.active = false; slot.terrain = null; }
    for (const slot of this.debrisSlots) slot.active = false;
    for (const slot of this.explosionSlots) slot.active = false;
    for (const mesh of this.children) {
      if (mesh instanceof InstancedMesh) mesh.count = 0;
    }
  }

  dispose(): void {
    this.clearEffects();
    this.ruptureFlameAtlas.dispose();
    for (const child of this.children) {
      if (!(child instanceof InstancedMesh)) continue;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const childMaterial of materials) childMaterial.dispose();
    }
  }

  private updateContactDust(time: number): void {
    let count = 0;
    for (const slot of this.contactDustSlots) {
      if (!slot.active || !slot.terrain) continue;
      const age = time - slot.startTime;
      if (age < 0) continue;
      if (age >= 1.65) { slot.active = false; slot.terrain = null; continue; }
      if (age !== slot.lastAge) {
        const swell = MathUtils.smoothstep(age, 0, .14);
        const decay = 1 - MathUtils.smoothstep(age, 1.2, 1.65);
        const width = slot.width * (.12 + .88 * swell) * Math.sqrt(decay);
        const depth = width * (.72 + .12 * Math.sin(age * 5 + slot.peak));
        const height = (.02 + (slot.peak - .02) * swell)
          * (1 - .72 * MathUtils.smoothstep(age, .45, 1.25)) * decay;
        // Smoothstep can round to one immediately before the nominal end.
        // Retire invisible dimensions before terrain gradients divide by them.
        if (!Number.isFinite(width + depth + height) || Math.min(width, depth, height) <= 1e-6) {
          slot.active = false; slot.terrain = null; continue;
        }
        const travel = slot.drift * (1 - Math.exp(-age * 4));
        const ax = slot.axisX, az = slot.axisZ, bx = -az, bz = ax;
        const x = slot.x + ax * slot.along - bx * slot.sign * travel;
        const z = slot.z + az * slot.along - bz * slot.sign * travel;
        // Nine fixed samples cover the current lobe, not the old birth plane.
        // Terrain can still occlude between probes; no continuous-surface claim.
        const rx = width * 1.06, rz = depth * 1.06;
        let finiteGround = true;
        for (let i = 0; i < CONTACT_DUST_GROUND_PROBES.length; i++) {
          const [u, v] = CONTACT_DUST_GROUND_PROBES[i]!;
          const h = slot.terrain.heightAt(x + ax * u * rx + bx * v * rz,
            z + az * u * rx + bz * v * rz);
          this.contactGroundHeights[i] = h; finiteGround &&= Number.isFinite(h);
        }
        if (!finiteGround) { slot.active = false; slot.terrain = null; continue; }
        const h = this.contactGroundHeights;
        const gx = (h[2]! - h[1]!) / (2 * rx), gz = (h[4]! - h[3]!) / (2 * rz);
        let residual = 0;
        for (let i = 0; i < CONTACT_DUST_GROUND_PROBES.length; i++) {
          const [u, v] = CONTACT_DUST_GROUND_PROBES[i]!;
          residual = Math.max(residual, h[i]! - h[0]! - gx * u * rx - gz * v * rz);
        }
        const y = h[0]! + residual + .04;
        // Positive determinant; a vertical shear follows the actual terrain
        // grade while keeping the cap's height and grounded base explicit.
        slot.matrix.set(ax * width, 0, bx * depth, x,
          gx * width, height, gz * depth, y,
          az * width, 0, bz * depth, z, 0, 0, 0, 1);
        slot.cx = x; slot.cy = y + height * .5; slot.cz = z;
        slot.radius = Math.hypot(rx, rz, height + Math.abs(gx * rx) + Math.abs(gz * rz));
        slot.lastAge = age;
      }
      if (!this.isVisible(slot.cx, slot.cy, slot.cz, slot.radius, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
      this.contactDust.setMatrixAt(count, slot.matrix);
      this.contactDustAge.setX(count, age);
      this.color.setRGB(.62, .34, .13); this.contactDust.setColorAt(count, this.color);
      count++;
    }
    if (count > 0) this.contactDustAge.needsUpdate = true;
    this.dirty(this.contactDust, count);
  }

  private copyBeam(
    slot: BeamSlot,
    origin: GalacticPoint,
    target: GalacticPoint,
    width: number | undefined,
    intensity: number | undefined,
    phase: number | undefined,
    color: GalacticEffectColor | undefined,
    fallbackColor: string,
  ): void {
    slot.x = finite(origin.x, 0);
    slot.y = finite(origin.y, 0);
    slot.z = finite(origin.z, 0);
    slot.tx = finite(target.x, 0);
    slot.ty = finite(target.y, 0);
    slot.tz = finite(target.z, 0);
    slot.width = positive(width, 0.2);
    slot.intensity = MathUtils.clamp(finite(intensity, 1), 0, 1.5);
    slot.phase = finite(phase, 0);
    this.writeColor(slot, color, fallbackColor);
  }

  private writeColor(slot: ColoredSlot, value: GalacticEffectColor | undefined, fallback: string): void {
    this.color.set(value ?? fallback);
    slot.r = this.color.r;
    slot.g = this.color.g;
    slot.b = this.color.b;
  }

  private prepareVisibility(camera?: Camera): void {
    this.visibilityCamera = camera ?? null;
    if (!camera) return;
    camera.updateMatrixWorld(true);
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.viewFrustum.setFromProjectionMatrix(this.viewProjection);
  }

  private isVisible(
    x: number,
    y: number,
    z: number,
    radius: number,
    maxDistance: number,
  ): boolean {
    const camera = this.visibilityCamera;
    if (!camera) return true;
    const dx = x - camera.position.x;
    const dy = y - camera.position.y;
    const dz = z - camera.position.z;
    const distance = maxDistance + radius;
    if (dx * dx + dy * dy + dz * dz > distance * distance) return false;
    this.visibilitySphere.center.set(x, y, z);
    this.visibilitySphere.radius = Math.max(0.01, radius);
    return this.viewFrustum.intersectsSphere(this.visibilitySphere);
  }

  private writeInstance(
    mesh: InstancedMesh,
    index: number,
    x: number,
    y: number,
    z: number,
    quaternion: Quaternion,
    sx: number,
    sy: number,
    sz: number,
    r: number,
    g: number,
    b: number,
  ): void {
    this.tempPosition.set(x, y, z);
    this.tempScale.set(sx, sy, sz);
    this.tempMatrix.compose(this.tempPosition, quaternion, this.tempScale);
    mesh.setMatrixAt(index, this.tempMatrix);
    this.color.setRGB(r, g, b);
    mesh.setColorAt(index, this.color);
  }

  private dirty(mesh: InstancedMesh, count: number): void {
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  private updateShields(time: number): void {
    let visibleCount = 0;
    for (let index = 0; index < this.shieldCount; index += 1) {
      const slot = this.shieldSlots[index];
      if (!slot) continue;
      const pulseRate = slot.mode === 'redline' ? 17 : slot.mode === 'recovery' ? 6 : 9;
      const pulseDepth = slot.mode === 'redline' ? 0.12 : slot.mode === 'recovery' ? 0.065 : 0.045;
      const pulse = 1 + Math.sin(time * pulseRate + slot.phase) * pulseDepth;
      const radius = slot.radius * pulse;
      if (!this.isVisible(slot.x, slot.y, slot.z, radius, EFFECT_VISIBILITY_DISTANCE.shields)) continue;
      // Keep the faceted shell below display white so cyan, recovery green,
      // and redline orange retain their authored hues over bright sand.
      const energy = 0.78 + slot.intensity * 0.1;
      this.euler.set(
        slot.mode === 'redline' ? 0.2 : 0,
        time * (slot.mode === 'redline' ? 2.8 : slot.mode === 'recovery' ? -0.75 : 0.48) + slot.phase,
        slot.mode === 'recovery' ? 0.08 : 0,
      );
      this.tempQuaternion.setFromEuler(this.euler);
      const scan = slot.mode === 'recovery'
        ? ((time * 0.58 + slot.phase * 0.07) % 1 + 1) % 1
        : 0.5;
      const scanWidth = 0.76 + Math.sin(scan * Math.PI) * 0.34;
      const scaleX = radius * (slot.mode === 'redline' ? 1.28 : slot.mode === 'recovery' ? scanWidth : 1);
      const scaleY = radius * (slot.mode === 'redline' ? 0.7 : slot.mode === 'recovery' ? 0.055 : 0.88);
      const scaleZ = radius * (slot.mode === 'redline' ? 1.5 : slot.mode === 'recovery' ? scanWidth : 1);
      const renderY = slot.mode === 'recovery'
        ? slot.y + (scan - 0.5) * radius * 1.65
        : slot.y;
      this.writeInstance(this.shieldShells, visibleCount, slot.x, renderY, slot.z, this.tempQuaternion,
        scaleX, scaleY, scaleZ, slot.r * energy, slot.g * energy, slot.b * energy);
      visibleCount += 1;
    }
    this.dirty(this.shieldShells, visibleCount);
  }

  private updateBeams(
    mesh: InstancedMesh,
    slots: readonly BeamSlot[],
    count: number,
    curved: boolean,
    time: number,
  ): void {
    let visibleCount = 0;
    for (let index = 0; index < count; index += 1) {
      const slot = slots[index];
      if (!slot) continue;
      this.direction.set(slot.tx - slot.x, slot.ty - slot.y, slot.tz - slot.z);
      const length = Math.max(0.01, this.direction.length());
      this.direction.multiplyScalar(1 / length);
      this.midpoint.set(slot.x + slot.tx, slot.y + slot.ty, slot.z + slot.tz).multiplyScalar(0.5);
      if (!this.isVisible(
        this.midpoint.x,
        this.midpoint.y,
        this.midpoint.z,
        length * 0.5 + slot.width,
        EFFECT_VISIBILITY_DISTANCE.beams,
      )) continue;
      this.tempQuaternion.setFromUnitVectors(curved ? FORWARD : UP, this.direction);
      if (curved) {
        // Rotate the asymmetric strands around the direction of travel. The
        // result reads as a fast corkscrew/pulse instead of a static tube.
        this.beamTwistQuaternion.setFromAxisAngle(FORWARD, time * 7.5 + slot.phase * 2.2 + index);
        this.tempQuaternion.multiply(this.beamTwistQuaternion);
      }
      const pulse = 0.88 + Math.sin(time * 19 + slot.phase + index) * 0.12;
      const width = slot.width * pulse;
      const energy = 0.45 + slot.intensity * 0.55;
      if (curved) {
        this.writeInstance(mesh, visibleCount, slot.x, slot.y, slot.z, this.tempQuaternion,
          width, width, length, slot.r * energy, slot.g * energy, slot.b * energy);
      } else {
        this.writeInstance(mesh, visibleCount, this.midpoint.x, this.midpoint.y, this.midpoint.z, this.tempQuaternion,
          width, length, width, slot.r * energy, slot.g * energy, slot.b * energy);
      }
      visibleCount += 1;
    }
    this.dirty(mesh, visibleCount);
  }

  /**
   * Shares the already-budgeted bolt pool between ordinary bolts and the two
   * inner layers of every Heat Lance. A full white-hot core keeps the weapon
   * readable at speed; a shorter pulse races toward its nose and leaves the
   * orange corkscrew sheath visible around it.
   */
  private updateWeaponCores(time: number): void {
    let visibleCount = 0;
    for (let index = 0; index < this.boltCount && visibleCount < GALACTIC_EFFECT_CAPACITY.weaponBolts; index += 1) {
      const slot = this.boltSlots[index];
      if (!slot) continue;
      this.direction.set(slot.tx - slot.x, slot.ty - slot.y, slot.tz - slot.z);
      const length = Math.max(0.01, this.direction.length());
      this.direction.multiplyScalar(1 / length);
      this.midpoint.set(slot.x + slot.tx, slot.y + slot.ty, slot.z + slot.tz).multiplyScalar(0.5);
      if (!this.isVisible(
        this.midpoint.x,
        this.midpoint.y,
        this.midpoint.z,
        length * 0.5 + slot.width,
        EFFECT_VISIBILITY_DISTANCE.beams,
      )) continue;
      this.tempQuaternion.setFromUnitVectors(UP, this.direction);
      const pulse = 0.9 + Math.sin(time * 22 + slot.phase + index) * 0.1;
      const width = slot.width * pulse;
      const energy = 0.45 + slot.intensity * 0.55;
      this.writeInstance(this.weaponBolts, visibleCount, this.midpoint.x, this.midpoint.y, this.midpoint.z,
        this.tempQuaternion, width, length, width,
        slot.r * energy, slot.g * energy, slot.b * energy);
      visibleCount += 1;
    }

    for (let index = 0; index < this.lanceCount && visibleCount < GALACTIC_EFFECT_CAPACITY.weaponBolts; index += 1) {
      const slot = this.lanceSlots[index];
      if (!slot) continue;
      this.direction.set(slot.tx - slot.x, slot.ty - slot.y, slot.tz - slot.z);
      const length = Math.max(0.01, this.direction.length());
      this.direction.multiplyScalar(1 / length);
      this.midpoint.set(slot.x + slot.tx, slot.y + slot.ty, slot.z + slot.tz).multiplyScalar(0.5);
      if (!this.isVisible(
        this.midpoint.x,
        this.midpoint.y,
        this.midpoint.z,
        length * 0.5 + slot.width,
        EFFECT_VISIBILITY_DISTANCE.beams,
      )) continue;
      this.tempQuaternion.setFromUnitVectors(UP, this.direction);
      const flicker = 0.92 + Math.sin(time * 31 + slot.phase * 5.1 + index) * 0.08;
      const coreWidth = slot.width * 0.24 * flicker;
      const coreR = MathUtils.lerp(slot.r, 1, 0.82);
      const coreG = MathUtils.lerp(slot.g, 1, 0.82);
      const coreB = MathUtils.lerp(slot.b, 1, 0.82);
      this.writeInstance(this.weaponBolts, visibleCount, this.midpoint.x, this.midpoint.y, this.midpoint.z,
        this.tempQuaternion, coreWidth, length * 0.97, coreWidth,
        coreR, coreG, coreB);
      visibleCount += 1;

      if (visibleCount >= GALACTIC_EFFECT_CAPACITY.weaponBolts) break;
      const travel = ((time * 3.7 + slot.phase * 0.31 + index * 0.19) % 1 + 1) % 1;
      const pulseDistance = length * (0.18 + travel * 0.74);
      const pulseLength = Math.min(10, Math.max(1.6, length * 0.2));
      const pulseWidth = slot.width * (0.48 + Math.sin(travel * Math.PI) * 0.18);
      this.tempPosition.set(slot.x, slot.y, slot.z).addScaledVector(this.direction, pulseDistance);
      this.writeInstance(this.weaponBolts, visibleCount,
        this.tempPosition.x, this.tempPosition.y, this.tempPosition.z,
        this.tempQuaternion, pulseWidth, pulseLength, pulseWidth,
        1, 0.94, 0.8);
      visibleCount += 1;
    }
    this.dirty(this.weaponBolts, visibleCount);
  }

  private updateMines(time: number): void {
    let visibleCount = 0;
    for (let index = 0; index < this.mineCount; index += 1) {
      const slot = this.mineSlots[index];
      if (!slot) continue;
      const pickup = slot.variant !== 'mine';
      const emp = slot.variant === 'emp';
      const repair = slot.variant === 'repair';
      const spin = slot.yaw
        + time * (pickup ? 1.8 : 0)
        + Math.sin(time * 2 + slot.phase) * 0.08;
      if (pickup) {
        // Salvage floats as a tilted rotating casing, distinct from the flat
        // armed mine that shares this instanced draw pool.
        this.euler.set(emp ? 1.3 : repair ? 0 : 0.68, spin, repair ? 0 : 0.24);
        this.tempQuaternion.setFromEuler(this.euler);
      } else {
        this.tempQuaternion.setFromAxisAngle(UP, spin);
      }
      const pulse = slot.scale * (1 + Math.sin(time * 7 + slot.phase) * (pickup ? 0.18 : slot.armed ? 0.12 : 0.035));
      const y = slot.y + (pickup ? 2.8 + Math.sin(time * 2.6 + slot.phase) * 0.75 : 0);
      if (!this.isVisible(slot.x, y, slot.z, pulse * 1.8, EFFECT_VISIBILITY_DISTANCE.mines)) continue;
      const hot = slot.armed && Math.sin(time * 12 + slot.phase) > 0;
      this.writeInstance(this.scrapMines, visibleCount, slot.x, y, slot.z, this.tempQuaternion,
        pulse, pulse * (emp ? 0.7 : repair ? 1.3 : pickup ? 1 : SOLID_HARDWARE_MINE_DEPTH_SCALE), pulse,
        emp ? 0.74 : repair ? 0.4 : pickup ? 0.2 : slot.armed ? (hot ? 1 : 0.78) : 0.22,
        emp ? 0.24 : repair ? 1 : pickup ? 1 : slot.armed ? (hot ? 0.22 : 0.1) : 0.68,
        emp ? 1 : repair ? 0.24 : pickup ? 0.66 : slot.armed ? 0.05 : 0.72);
      visibleCount += 1;
    }
    this.dirty(this.scrapMines, visibleCount);
  }

  private updateHazards(time: number): void {
    let visibleCount = 0;
    let bodyCount = 0;
    this.plumeCount = 0;
    for (let index = 0; index < this.hazardCount; index += 1) {
      const slot = this.hazardSlots[index];
      if (!slot) continue;
      const pulse = 1 + Math.sin(time * 5 + slot.phase) * 0.1;
      // Never animate the footprint smaller than its collision envelope.
      const warningRadius = slot.radius;
      const bodyRadius = slot.radius * (0.32 + slot.intensity * 0.38) * pulse;
      const bodyHeight = slot.height * (0.28 + slot.intensity * 0.72);
      const boundsRadius = Math.max(warningRadius * 1.22, bodyRadius, bodyHeight + 8);
      if (!this.isVisible(
        slot.x,
        slot.y + bodyHeight * 0.5,
        slot.z,
        boundsRadius,
        EFFECT_VISIBILITY_DISTANCE.hazards,
      )) continue;
      let r = 1;
      let g = 0.28;
      let b = 0.06;
      if (slot.kind === 'sand-geyser') {
        r = 1;
        g = 0.43;
        b = 0.10;
      } else if (slot.kind === 'rockfall') {
        // Warning paint stays distinct from mint route assistance;
        // stone itself uses the environment's vermilion/indigo art language.
        r = 1;
        g = 0.54;
        b = 0.16;
      }
      this.writeInstance(this.hazardTelegraphs, visibleCount, slot.x, slot.y + 0.26, slot.z, IDENTITY,
        warningRadius, warningRadius, warningRadius, r, g * (0.45 + slot.warning * 0.55), b);
      const fallingRock = slot.kind === 'rockfall';
      if (!fallingRock) {
        // The full warning footprint remains stable while three staggered
        // columns rise through it. Sand/steam never enter the opaque rock pool.
        for (let plume = 0; plume < 3; plume += 1) {
          const cycle = ((time * 0.24 + plume / 3 + slot.phase * 0.13) % 1 + 1) % 1;
          const drift = (plume - 1) * slot.radius * 0.28;
          const plumeWidth = slot.radius * (0.25 + cycle * 0.19);
          const plumeHeight = bodyHeight * (0.29 + cycle * 0.19);
          const opacity = (0.24 + slot.intensity * 0.22)
            * Math.sin(cycle * Math.PI) * (slot.kind === 'heat-vent' ? 0.86 : 1);
          const plumeIndex = this.plumeCount++;
          this.writeInstance(this.explosionPlates, plumeIndex,
            slot.x + drift + Math.sin(slot.phase + plume) * cycle * 1.6,
            slot.y + plumeHeight * 0.68 + cycle * bodyHeight * 0.7,
            slot.z + Math.cos(slot.phase + plume * 1.7) * slot.radius * 0.22,
            this.billboardQuaternion, plumeWidth, plumeHeight, 1,
            slot.kind === 'heat-vent' ? 0.85 : 0.64,
            slot.kind === 'heat-vent' ? 0.27 : 0.39,
            slot.kind === 'heat-vent' ? 0.08 : 0.2);
          this.writeEffectSurface(plumeIndex, 1, opacity, index * 7.31 + plume * 2.43);
        }
        visibleCount += 1;
        continue;
      }
      const fallCycle = ((time * 0.52 + slot.phase * 0.11) % 1 + 1) % 1;
      const rockScale = Math.max(2.6, slot.radius * 1.08);
      const groundedRockHeight = rockScale * .94;
      const bodyY = fallingRock ? slot.y - SOLID_RUBBLE_BASE_Y * groundedRockHeight + .04 : slot.y + bodyHeight * 0.5;
      this.euler.set(
        fallingRock ? time * 1.7 + slot.phase : 0,
        fallingRock ? time * -1.2 + slot.phase : 0,
        fallingRock ? 0.34 : 0,
      );
      this.tempQuaternion.setFromEuler(this.euler);
      // One full-size breakaway mass and its debris apron must read from a
      // braking distance. The earlier pebble cluster occupied <35% of the zone.
      // Grounded rubble persists for the entire active hazard. Falling chips
      // provide visible cause; the player never sees an empty damaging zone.
      this.writeInstance(this.hazardBodies, bodyCount++, slot.x, bodyY, slot.z,
        fallingRock ? IDENTITY : this.tempQuaternion,
        fallingRock ? rockScale * 1.35 : bodyRadius,
        fallingRock ? groundedRockHeight : bodyHeight,
        fallingRock ? rockScale * 1.35 : bodyRadius,
        fallingRock ? 0.52 : r, fallingRock ? 0.18 : g, fallingRock ? 0.13 : b);
      if (fallingRock) {
        const dropHeight = slot.y + 1.2 + (1 - fallCycle * fallCycle) * Math.max(7, bodyHeight + 5);
        const chipScale = rockScale * 0.72;
        this.writeInstance(this.hazardBodies, bodyCount++, slot.x + Math.sin(slot.phase) * rockScale * 0.45,
          dropHeight, slot.z, this.tempQuaternion, chipScale, chipScale, chipScale, 0.72, 0.29, 0.19);
      }
      visibleCount += 1;
    }
    this.dirty(this.hazardTelegraphs, visibleCount);
    this.dirty(this.hazardBodies, bodyCount);
  }

  private updateCrash(time: number): void {
    let debrisCount = 0;
    for (const slot of this.debrisSlots) {
      if (!slot.active) continue;
      const age = time - slot.startTime;
      if (age < 0 || age > slot.duration) {
        if (age > slot.duration) slot.active = false;
        continue;
      }
      const motionAge = slot.ember ? (age + slot.emberPhase) % .42 : age;
      // Free casing loses horizontal velocity, then falls. Its actual birth
      // impulse remains distinct from the two retained moving-root embers.
      const travelAge = slot.contactGround ? -Math.expm1(-4 * motionAge) / 4
        : slot.authoredEjection && slot.metal ? -Math.expm1(-2.2 * motionAge) / 2.2 : motionAge;
      const x = slot.x + slot.vx * travelAge;
      // Retained embers start at the moving fracture, not the terrain height
      // sampled at its birth. A stale floor would detach them on a descent.
      let y = slot.ember ? slot.y + Math.max(0, slot.vy) * motionAge - 1.5 * motionAge * motionAge
        : Math.max(slot.groundY + 0.04, slot.y + slot.vy * motionAge
          - (slot.contactGround || slot.authoredEjection && slot.metal ? 17 : 7.2) * motionAge * motionAge);
      const z = slot.z + slot.vz * travelAge;
      this.euler.set(slot.rx + slot.ax * age, slot.ry + slot.ay * age, slot.rz + slot.az * age);
      this.tempQuaternion.setFromEuler(this.euler);
      if (slot.spark) {
        this.direction.set(slot.vx, slot.vy - 14.4 * motionAge, slot.vz).normalize();
        this.tempQuaternion.setFromUnitVectors(FORWARD, this.direction);
      }
      const progress = age / slot.duration;
      const fade = slot.ember ? (1 - motionAge / .42) * (1 - MathUtils.smoothstep(progress, .8, 1))
        : slot.metal || slot.contactGround ? 1 : MathUtils.clamp(1 - progress, 0.12, 1);
      // Metal holds its value while tumbling, then contracts over the last
      // quarter of its life instead of becoming black floating rectangles.
      const size = slot.scale * (slot.metal || slot.contactGround ? 1 - MathUtils.smoothstep(progress, 0.75, 1) : 1);
      if (slot.contactGround || slot.authoredEjection && slot.metal) {
        // Contact clods use only the sampled birth plane. Terrain away from
        // that plane is not queried or asserted here. Full rotated support
        // prevents the primitive from being buried by its own floor clamp.
        // Analytic support of the existing bent primitive's local bounds:
        // x±.5, y±.332, z±.85. No vertex scan or terrain query per frame.
        this.tempMatrix.makeRotationFromQuaternion(this.tempQuaternion);
        const e = this.tempMatrix.elements;
        const support = size * (Math.abs(e[1]!) * .5 + Math.abs(e[5]!) * .332 * (slot.metal ? .65 : 1) + Math.abs(e[9]!) * .85);
        y = Math.max(y, slot.groundY + .04 + support);
      }
      if (!this.isVisible(x, y, z, slot.scale * 1.4, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
      this.writeInstance(this.crashDebris, debrisCount, x, y, z, this.tempQuaternion,
        size * (slot.spark ? slot.contactSpark ? .26 : .09 : 1), size * (slot.spark ? slot.contactSpark ? .32 : .12 : slot.metal ? .65 : 1),
        size * (slot.spark ? 2.8 : 1), slot.r * fade, slot.g * fade, slot.b * fade);
      this.crashDebris.geometry.getAttribute('aFragmentMetal').setX(debrisCount, slot.contactGround && !slot.metal ? 2 : slot.metal ? 1 : 0);
      debrisCount += 1;
    }
    this.dirty(this.crashDebris, debrisCount);
    this.crashDebris.geometry.getAttribute('aFragmentMetal').needsUpdate = true;

    let plateCount = this.plumeCount;
    // Instanced transparent plates cannot sort per-instance. Write smoke and
    // flare first, then hot fronts, including when the fixed ring wraps.
    for (let layer = 0; layer < 2; layer += 1) {
      for (const slot of this.explosionSlots) {
        if (!slot.active || (slot.contactLayer === 0 || (slot.wreckOwner >= 0 && slot.contactLayer === 1)) !== (layer === 1)) continue;
        const age = time - slot.startTime;
        if (age < 0 || age > slot.duration) {
          if (age > slot.duration) slot.active = false;
          continue;
        }
        const progress = MathUtils.clamp(age / slot.duration, 0, 1);
        if (slot.contactLayer >= 4) {
          // One low, dark scrape tongue and one raised sand fan make the
          // actual support witness readable. Both keep their existing slots,
          // world departure direction and feathered dust shader.
          const scrape = slot.contactLayer === 4;
          const broad = slot.contactHalfLength > 0;
          if (broad) {
            // The same two measured edge roots stay fixed. Cosmetic sand
            // expands outward and along the birth band; it does not enlarge
            // the reported contact footprint or move an engine/heat root.
            const expansion = -Math.expm1(-7 * age);
            const width = slot.contactHalfLength + (scrape ? 1.8 : 2.6) * expansion;
            const reach = .35 + (scrape ? 3.6 : 4.6) * expansion;
            const liftPhase = MathUtils.clamp(age / (scrape ? .32 : .5), 0, 1);
            const rise = (scrape ? .16 : .12) + (scrape ? 1.14 : .65) * Math.sin(Math.PI * liftPhase);
            const across = slot.vx * slot.nz - slot.vz * slot.nx;
            const sign = Math.abs(across) > .001 ? Math.sign(across) : scrape ? -1 : 1;
            const inverseAxisLength = 1 / Math.hypot(slot.nx, slot.nz);
            const outX = slot.nz * sign * inverseAxisLength, outZ = -slot.nx * sign * inverseAxisLength;
            const x = slot.x + outX * reach * .5, y = slot.y + rise * .5, z = slot.z + outZ * reach * .5;
            if (!this.isVisible(x, y, z, Math.hypot(width, reach * .5, rise * .5), EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
            this.direction.set(slot.nx, 0, slot.nz).normalize();
            this.ruptureAxis.set(outX * reach, rise, outZ * reach).normalize();
            this.ruptureEjection.crossVectors(this.direction, this.ruptureAxis).normalize();
            this.tempMatrix.makeBasis(this.direction, this.ruptureAxis, this.ruptureEjection);
            this.tempQuaternion.setFromRotationMatrix(this.tempMatrix);
            this.writeInstance(this.explosionPlates, plateCount, x, y, z, this.tempQuaternion,
              width, Math.hypot(reach, rise) * .5, width, slot.r, slot.g, slot.b);
            this.writeEffectSurface(plateCount, scrape ? 10 : 11, .82
              * (1 - MathUtils.smoothstep(progress, .25, 1)), slot.startTime * 1.37);
            plateCount++;
            continue;
          }
          const width = slot.scale * (scrape ? .50 + progress * .70 : .30 + progress * .65);
          const height = broad ? (scrape ? .35 + slot.contactHalfWidth * .4 + progress * .7 : 1.4 + progress * 1.8)
            : width * (scrape ? .18 : .54);
          const x = slot.x + slot.vx * age, z = slot.z + slot.vz * age;
          const y = slot.y + height * 1.05;
          if (!this.isVisible(x, y, z, width * 1.5, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
          // Keep the ejecta root along the measured engine support line.
          // A point-shaped billboard under a ten-metre casing is easily hidden.
          if (broad) this.tempQuaternion.setFromAxisAngle(UP, Math.atan2(-slot.nz, slot.nx));
          this.writeInstance(this.explosionPlates, plateCount, x, y, z,
            broad ? this.tempQuaternion : this.billboardQuaternion, width, height, width, slot.r, slot.g, slot.b);
          this.writeEffectSurface(plateCount, broad ? 5 : 4, (broad ? .82 : .67)
            * (1 - MathUtils.smoothstep(progress, .25, 1)), slot.startTime * 1.37);
          plateCount++;
          continue;
        }
        if (slot.authoredSurface && slot.contactLayer >= 0) {
          const smoke = slot.contactLayer > 1, flash = slot.contactLayer === 0;
          const opticalScale = smoke ? 1 : ruptureArtworkScale(flash, age);
          // Enlarge the existing plate/cull volume together. Changing only UV
          // scale would clip the artwork against the previous quad boundary.
          const size = slot.scale * (smoke ? .74 + progress * .62 : flash ? .78 + progress * .22 : .90 + Math.sin(age * 19) * .05) * opticalScale;
          const lift = smoke ? size * (slot.contactLayer === 2 ? .46 : .72) + progress * 1.2 : 0;
          const x = slot.x + slot.vx * age, y = slot.y + lift, z = slot.z + slot.vz * age;
          if (!this.isVisible(x, y, z, size * 1.9, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
          let rotation = this.billboardQuaternion;
          if (!smoke) {
            // Rotate within the camera plane: local +X follows the *actual*
            // normal's projection. It stays stable for a fixed camera/normal.
            this.ruptureRotation.copy(this.billboardQuaternion).invert();
            this.ruptureAxis.set(slot.nx, slot.ny, slot.nz).applyQuaternion(this.ruptureRotation);
            const angle = Math.hypot(this.ruptureAxis.x, this.ruptureAxis.y) > .001
              ? Math.atan2(this.ruptureAxis.y, this.ruptureAxis.x) : 0;
            this.tempQuaternion.setFromAxisAngle(FORWARD, angle).premultiply(this.billboardQuaternion);
            rotation = this.tempQuaternion;
          }
          const opacity = (smoke ? .90 : 1)
            * (1 - MathUtils.smoothstep(progress, smoke ? .68 : flash ? .10 : .78, 1));
          this.writeInstance(this.explosionPlates, plateCount, x, y, z, rotation,
            size, size * (smoke ? 1.22 : flash ? .82 : .70), size, slot.r, slot.g, slot.b);
          // Authored branches consume actual event age, so a moving root cannot
          // restart the pressure/fire progression. Legacy seed semantics stay unchanged.
          const severity = slot.scale / (flash ? RUPTURE_FLASH_SCALE : 2.45);
          const pixelsPerWorld = RUPTURE_FLAME_ATLAS.pixelsPerWorldAtUnitSeverity / (severity * opticalScale);
          this.writeEffectSurface(plateCount, smoke ? (slot.contactLayer === 2 ? 8 : 9) : flash ? 6 : 7, opacity, age,
            smoke ? 0 : size * pixelsPerWorld,
            smoke ? 0 : size * (flash ? .82 : .70) * pixelsPerWorld);
          plateCount++;
          continue;
        }
        if (slot.contactLayer >= 0) {
          const smoke = slot.contactLayer > 1;
          const flash = slot.contactLayer === 0;
          const hotFace = slot.wreckOwner >= 0 && slot.contactLayer === 1;
          const size = slot.scale * (smoke ? 0.5 + progress * 0.9 : 0.75 + progress * 0.25);
          const y = slot.y + (smoke ? progress * (slot.authoredSurface ? 2 : 4.8) : 0);
          const x = slot.x + slot.vx * age, z = slot.z + slot.vz * age;
          if (!this.isVisible(x, y, z, size * (flash || smoke ? 1.7 : 1.42), EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
          const opacity = (smoke ? 0.68 : flash || hotFace ? 1 : 0.68)
            * (1 - MathUtils.smoothstep(progress, hotFace ? .82 : smoke ? slot.authoredSurface ? .65 : .28 : .08, 1));
          // Put the hot front lobe within the fire volume, ahead of casing born
          // at its centre. Keep depth testing: scenery still occludes the burst.
          const front = flash || hotFace ? size * .25 : 0;
          this.writeInstance(this.explosionPlates, plateCount,
            x + this.billboardToCamera.x * front,
            y + Math.max(0, this.billboardToCamera.y) * front,
            z + this.billboardToCamera.z * front,
            this.billboardQuaternion, size, size * (smoke ? 1.22 : hotFace ? .75 + Math.sin(age * 23) * .08 : 1), size, slot.r, slot.g, slot.b);
          this.writeEffectSurface(plateCount, smoke ? 3 : flash || hotFace ? 2 : 0,
            opacity, slot.startTime * 1.37);
          plateCount += 1;
          continue;
        }
        if (slot.style === 'recovery') {
          const size = slot.scale * (.65 + progress * .35);
          const y = slot.y + progress * .55;
          if (!this.isVisible(slot.x, y, slot.z, size * 1.42, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
          this.writeInstance(this.explosionPlates, plateCount, slot.x, y, slot.z,
            GROUND_RING, size, size, size, slot.r, slot.g, slot.b);
          this.writeEffectSurface(plateCount, 0, .42 * (1 - progress) * (1 - progress), slot.startTime * 1.37);
          plateCount++;
          continue;
        }
        const groundedMine = slot.style === 'mine';
        const installation = slot.style === 'reward';
        const size = installation
          ? slot.scale * (0.78 + Math.sin(progress * Math.PI) * 0.18)
          : groundedMine
            ? slot.scale * (0.3 + progress * 1.35)
            : slot.scale * (0.32 + progress * 1.5);
        const renderY = installation ? slot.y + progress * 4.2 : slot.y;
        if (!this.isVisible(slot.x, renderY, slot.z, size, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
        const fade = 1 - progress * (installation ? 0.58 : 0.82);
        const quaternion = (groundedMine && !slot.billboard) || installation || slot.style === 'rock'
          ? GROUND_RING
          : this.billboardQuaternion;
        this.writeInstance(this.explosionPlates, plateCount, slot.x, renderY, slot.z,
          quaternion, size, size, size, slot.r * fade, slot.g * fade, slot.b * fade);
        this.writeEffectSurface(plateCount, slot.style === 'sand' ? 1 : 0,
          fade * (slot.style === 'sand' ? 0.54 : 0.9), slot.startTime * 1.37);
        plateCount += 1;
      }
    }
    this.dirty(this.explosionPlates, plateCount);
    this.explosionPlates.geometry.getAttribute('aEffectSurface').needsUpdate = true;
    this.explosionPlates.geometry.getAttribute('aRuptureAtlasSpan').needsUpdate = true;
  }

  private writeEffectSurface(index: number, kind: number, opacity: number, seed: number, spanX = 0, spanY = 0): void {
    this.explosionPlates.geometry.getAttribute('aEffectSurface').setXYZ(index, kind, opacity, seed);
    this.explosionPlates.geometry.getAttribute('aRuptureAtlasSpan').setXY(index, spanX, spanY);
  }
}

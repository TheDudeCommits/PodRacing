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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { TERRAIN_GLSL } from '../terrain/terrainShaderChunks';
import { createCourseGulfUniforms, type CourseGulfUniforms } from '../terrain/CourseGulfTextures';
import { createSolidEffectMaterial } from './SolidEffectMaterial';
import {
  createSolidHardwareGeometry, createSolidRubbleGeometry,
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

export const GALACTIC_EFFECT_DRAW_CALL_BUDGET = 8;
export const GALACTIC_EFFECT_CAPACITY = Object.freeze({
  shields: 8,
  weaponBolts: 32,
  heatLances: 12,
  scrapMines: 24,
  hazardTelegraphs: 24,
  hazardBodies: 48,
  crashDebris: 64,
  explosionPlates: 16,
  hazardPlumes: 72,
});

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
  authoredSurface: boolean;
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
      diffuseColor.rgb *= mix(1.0, .32 + sun * .86, vFragmentMetal);
    `);
  };
  result.customProgramCacheKey = () => 'inkstorm-crash-casing-v1';
  return result;
}

function createAtmosphericMaterial(): MeshBasicMaterial {
  const result = material(1);
  result.name = 'Painterly dust and impact wash';
  result.transparent = true;
  result.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute vec3 aEffectSurface;
      varying vec3 vEffectSurface;
      varying vec2 vEffectUv;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vEffectSurface = aEffectSurface;
      vEffectUv = uv;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec3 vEffectSurface;
      varying vec2 vEffectUv;
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
      if (vEffectSurface.x > 2.5) {
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
  result.customProgramCacheKey = () => 'painterly-atmosphere-contact-v4';
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

/** Eight instanced pools: the entire active expansion costs at most 8 draws. */
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

  readonly explosionPlates = prepare(new InstancedMesh(
    createExplosionPlateGeometry(),
    createAtmosphericMaterial(),
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
    (): DebrisSlot => ({ active: false, startTime: 0, duration: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, ax: 0, ay: 0, az: 0, scale: 1, groundY: 0, metal: false, spark: false, r: 1, g: 0.3, b: 0.1 }),
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
      contactLayer: -1,
      authoredSurface: false,
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

  constructor() {
    super();
    this.name = 'galactic-effects';
    // Solid hazard matter must occlude outlines too, not only the beauty pass.
    this.hazardBodies.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = false;
    this.scrapMines.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = false;
    // Keep opaque depth/silhouettes while attenuating the triangle-edge ink.
    // The existing flag reduces all Sobel ink; it does not alter world masks.
    this.hazardBodies.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
    this.scrapMines.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
    this.add(
      this.shieldShells,
      this.weaponBolts,
      this.heatLances,
      this.scrapMines,
      this.hazardTelegraphs,
      this.hazardBodies,
      this.crashDebris,
      this.explosionPlates,
    );
  }

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
        const cone = .18 + hash01(seed + 16) * .32, azimuth = hash01(seed + 17) * Math.PI * 2;
        this.ruptureEjection.set(Math.sin(cone) * Math.cos(azimuth), Math.sin(cone) * Math.sin(azimuth), Math.cos(cone))
          .applyQuaternion(this.ruptureRotation);
      }
      const spark = contactBurst ? fragment % 6 === 0 : fragment % 4 === 0;
      const radial = contactBurst
        ? ((spark ? 24 : 18) + hash01(seed + 1) * (spark ? 16 : 12)) * Math.sqrt(severity)
        : (5.5 + hash01(seed + 1) * 11) * severity * radialScale;
      slot.active = true;
      slot.startTime = finite(event.time, 0);
      slot.duration = contactBurst
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
      slot.vx = 0; slot.vz = 0;
      if (contactBurst) {
        // A hot core, amber pressure flare and two smoke lobes read against
        // the full-size engines. Their four slots and lifetimes stay bounded.
        slot.startTime = finite(event.time, 0) + (plate === 0 ? 0 : plate * 0.025);
        slot.duration = [0.22, 0.42, 1.6, 1.9][plate]!;
        slot.x = finite(event.position.x, 0);
        slot.y = burstY + (plate > 1 ? (plate - 1) * 0.35 : 0);
        slot.z = finite(event.position.z, 0);
        if (authoredSurface && plate > 1) {
          slot.vx = this.ruptureAxis.x * (plate === 2 ? 1.2 : 2);
          slot.vz = this.ruptureAxis.z * (plate === 2 ? 1.2 : 2);
        }
        slot.scale = severity * [RUPTURE_FLASH_SCALE, 3.5, 2.7, 3.2][plate]!;
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

  /** One sampled engine/sand presentation contact. Reuses ten debris slots and
   * two dust plates; no new mesh, material, timer or per-frame event allocation.
   * The caller deduplicates the actual wreck identity before calling this.
   */
  emitWreckGroundContact(time: number, position: GalacticPoint, direction: GalacticPoint): void {
    if (!Number.isFinite(time + position.x + position.y + position.z + direction.x + direction.z)) return;
    const length = Math.hypot(direction.x, direction.z);
    if (length < .001) return;
    const dx = -direction.x / length, dz = -direction.z / length;
    const heading = Math.atan2(dz, dx);
    this.eventSequence++;
    for (let index = 0; index < 10; index++) {
      const slot = this.debrisSlots[this.debrisCursor]!;
      this.debrisCursor = (this.debrisCursor + 1) % this.debrisSlots.length;
      const seed = this.eventSequence * 31 + index * 7;
      const angle = heading + (hash01(seed) - .5) * 1.8;
      const speed = 12 + hash01(seed + 1) * 14;
      slot.active = true; slot.startTime = time; slot.duration = .28 + hash01(seed + 2) * .20;
      slot.x = position.x; slot.y = position.y + .18; slot.z = position.z;
      slot.vx = Math.cos(angle) * speed; slot.vz = Math.sin(angle) * speed;
      slot.vy = 2 + hash01(seed + 3) * 4;
      slot.rx = 0; slot.ry = 0; slot.rz = 0; slot.ax = 0; slot.ay = 0; slot.az = 0;
      slot.scale = .34 + hash01(seed + 4) * .20;
      slot.groundY = position.y; slot.metal = false; slot.spark = true;
      slot.r = 1; slot.g = index % 3 === 0 ? .87 : .48; slot.b = index % 3 === 0 ? .5 : .09;
    }
    for (let index = 0; index < 2; index++) {
      const slot = this.explosionSlots[this.explosionCursor]!;
      this.explosionCursor = (this.explosionCursor + 1) % this.explosionSlots.length;
      slot.active = true; slot.startTime = time + index * .04; slot.duration = index === 0 ? .85 : 1.15;
      slot.x = position.x + dx * index * .7; slot.z = position.z + dz * index * .7;
      slot.y = position.y + .08; slot.vx = dx * (index === 0 ? 3.2 : 4.8); slot.vz = dz * (index === 0 ? 3.2 : 4.8);
      slot.scale = index === 0 ? 3.8 : 4.6;
      slot.style = 'sand'; slot.billboard = true; slot.contactLayer = 4 + index;
      slot.authoredSurface = false;
      slot.r = .43; slot.g = .27; slot.b = .13;
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
  }

  clearEffects(): void {
    this.shieldCount = 0;
    this.boltCount = 0;
    this.lanceCount = 0;
    this.mineCount = 0;
    this.hazardCount = 0;
    this.plumeCount = 0;
    for (const slot of this.debrisSlots) slot.active = false;
    for (const slot of this.explosionSlots) slot.active = false;
    for (const mesh of this.children) {
      if (mesh instanceof InstancedMesh) mesh.count = 0;
    }
  }

  dispose(): void {
    for (const child of this.children) {
      if (!(child instanceof InstancedMesh)) continue;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const childMaterial of materials) childMaterial.dispose();
    }
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
      const x = slot.x + slot.vx * age;
      const y = Math.max(slot.groundY + 0.04, slot.y + slot.vy * age - 7.2 * age * age);
      const z = slot.z + slot.vz * age;
      if (!this.isVisible(x, y, z, slot.scale * 1.4, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
      this.euler.set(slot.rx + slot.ax * age, slot.ry + slot.ay * age, slot.rz + slot.az * age);
      this.tempQuaternion.setFromEuler(this.euler);
      if (slot.spark) {
        this.direction.set(slot.vx, slot.vy - 14.4 * age, slot.vz).normalize();
        this.tempQuaternion.setFromUnitVectors(FORWARD, this.direction);
      }
      const progress = age / slot.duration;
      const fade = slot.metal ? 1 : MathUtils.clamp(1 - progress, 0.12, 1);
      // Metal holds its value while tumbling, then contracts over the last
      // quarter of its life instead of becoming black floating rectangles.
      const size = slot.scale * (slot.metal ? 1 - MathUtils.smoothstep(progress, 0.75, 1) : 1);
      this.writeInstance(this.crashDebris, debrisCount, x, y, z, this.tempQuaternion,
        size * (slot.spark ? 0.09 : 1), size * (slot.spark ? 0.12 : slot.metal ? 0.65 : 1),
        size * (slot.spark ? 2.8 : 1), slot.r * fade, slot.g * fade, slot.b * fade);
      this.crashDebris.geometry.getAttribute('aFragmentMetal').setX(debrisCount, slot.metal ? 1 : 0);
      debrisCount += 1;
    }
    this.dirty(this.crashDebris, debrisCount);
    this.crashDebris.geometry.getAttribute('aFragmentMetal').needsUpdate = true;

    let plateCount = this.plumeCount;
    // Instanced transparent plates cannot sort per-instance. Write smoke and
    // flare first, then hot fronts, including when the fixed ring wraps.
    for (let layer = 0; layer < 2; layer += 1) {
      for (const slot of this.explosionSlots) {
        if (!slot.active || (slot.contactLayer === 0) !== (layer === 1)) continue;
        const age = time - slot.startTime;
        if (age < 0 || age > slot.duration) {
          if (age > slot.duration) slot.active = false;
          continue;
        }
        const progress = MathUtils.clamp(age / slot.duration, 0, 1);
        if (slot.contactLayer >= 4) {
          const width = slot.scale * (.45 + progress * .70);
          const height = width * .48;
          const x = slot.x + slot.vx * age, z = slot.z + slot.vz * age;
          const y = slot.y + height * .78;
          if (!this.isVisible(x, y, z, width * 1.5, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
          this.writeInstance(this.explosionPlates, plateCount, x, y, z,
            this.billboardQuaternion, width, height, width, slot.r, slot.g, slot.b);
          this.writeEffectSurface(plateCount, 1, .67 * (1 - MathUtils.smoothstep(progress, .25, 1)), slot.startTime * 1.37);
          plateCount++;
          continue;
        }
        if (slot.contactLayer >= 0) {
          const smoke = slot.contactLayer > 1;
          const flash = slot.contactLayer === 0;
          const size = slot.scale * (smoke ? 0.5 + progress * 0.9 : 0.75 + progress * 0.25);
          const y = slot.y + (smoke ? progress * (slot.authoredSurface ? 2 : 4.8) : 0);
          const x = slot.x + slot.vx * age, z = slot.z + slot.vz * age;
          if (!this.isVisible(x, y, z, size * (flash || smoke ? 1.7 : 1.42), EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
          const opacity = (smoke ? 0.68 : flash ? 1 : 0.68)
            * (1 - MathUtils.smoothstep(progress, smoke ? slot.authoredSurface ? .65 : .28 : .08, 1));
          // Put the hot front lobe within the fire volume, ahead of casing born
          // at its centre. Keep depth testing: scenery still occludes the burst.
          const front = flash ? size * 0.25 : 0;
          this.writeInstance(this.explosionPlates, plateCount,
            x + this.billboardToCamera.x * front,
            y + Math.max(0, this.billboardToCamera.y) * front,
            z + this.billboardToCamera.z * front,
            this.billboardQuaternion, size, size * (smoke ? 1.22 : 1), size, slot.r, slot.g, slot.b);
          this.writeEffectSurface(plateCount, smoke ? 3 : flash ? 2 : 0,
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
  }

  private writeEffectSurface(index: number, kind: number, opacity: number, seed: number): void {
    this.explosionPlates.geometry.getAttribute('aEffectSurface').setXYZ(index, kind, opacity, seed);
  }
}

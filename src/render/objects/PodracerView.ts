import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  LatheGeometry,
  Group,
  MathUtils,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  DistantRivalLod,
  PerformanceDecision,
} from '../../diagnostics/performance/types';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';

export type { DistantRivalLod } from '../../diagnostics/performance/types';

export interface DistantRivalLodTarget {
  setLodMode(mode: DistantRivalLod): void;
}

type DistantRivalLodDecision = Pick<
  PerformanceDecision,
  'distantRivalLod' | 'distantRivalLodDistance'
> & {
  /**
   * Optional authored boundary for the baked horizon proxy. This is separate
   * from the governor boundary: a non-focus pack racer can keep its simplified
   * engine/cockpit masses nearby, then become one merged cel silhouette before
   * the global opposite-side-of-the-circuit safeguard applies.
   */
  horizonSilhouetteDistance?: number;
  horizonSilhouetteHysteresis?: number;
};

/**
 * Distance hysteresis is deliberately expressed in world metres. Entering the
 * cheaper representation happens at the governor's requested boundary, while
 * returning to full detail requires the rival to come materially closer. This
 * prevents a side-by-side battle from toggling dozens of pilot meshes every
 * time the chase spring crosses one distance sample.
 */
export const DISTANT_RIVAL_LOD_HYSTERESIS = 24;

/**
 * Even the highest quality tier must not submit a fully articulated racer on
 * the opposite side of the circuit. At this distance the craft is a small
 * graphic mark, so the authored silhouette LOD preserves its readable mass
 * while retiring pilot, turbine and chassis-detail draws.
 */
export const FULL_QUALITY_RIVAL_SILHOUETTE_DISTANCE = 900;
export const FULL_QUALITY_RIVAL_SILHOUETTE_HYSTERESIS = 120;

export function resolveDistantRivalLod(
  current: DistantRivalLod,
  desired: DistantRivalLod,
  distance: number,
  threshold: number,
  hysteresis = DISTANT_RIVAL_LOD_HYSTERESIS,
): DistantRivalLod {
  if (desired === 'full') return 'full';
  if (!Number.isFinite(distance)) return 'full';
  const safeDistance = Math.max(0, distance);
  const safeThreshold = Math.max(0, Number.isFinite(threshold) ? threshold : 0);
  const safeHysteresis = Math.max(0, Number.isFinite(hysteresis) ? hysteresis : 0);
  if (current === 'full') {
    return safeDistance >= safeThreshold ? desired : 'full';
  }
  return safeDistance <= Math.max(0, safeThreshold - safeHysteresis)
    ? 'full'
    : desired;
}

/** Applies one governor decision without issuing redundant scene-graph writes. */
export function applyDistantRivalLodDecision(
  target: DistantRivalLodTarget,
  current: DistantRivalLod,
  decision: Readonly<DistantRivalLodDecision>,
  distance: number,
): DistantRivalLod {
  let next: DistantRivalLod;
  if (Number.isFinite(distance)) {
    const safeDistance = Math.max(0, distance);
    const authoredSilhouetteDistance = Math.max(
      0,
      Number.isFinite(decision.horizonSilhouetteDistance)
        ? decision.horizonSilhouetteDistance ?? FULL_QUALITY_RIVAL_SILHOUETTE_DISTANCE
        : FULL_QUALITY_RIVAL_SILHOUETTE_DISTANCE,
    );
    const authoredSilhouetteHysteresis = Math.max(
      0,
      Number.isFinite(decision.horizonSilhouetteHysteresis)
        ? decision.horizonSilhouetteHysteresis ?? FULL_QUALITY_RIVAL_SILHOUETTE_HYSTERESIS
        : FULL_QUALITY_RIVAL_SILHOUETTE_HYSTERESIS,
    );
    const enterDistance = Math.max(
      authoredSilhouetteDistance,
      decision.distantRivalLod === 'full' ? decision.distantRivalLodDistance : 0,
    );
    const exitDistance = Math.max(
      0,
      enterDistance - authoredSilhouetteHysteresis,
    );
    const horizonSilhouette = current === 'silhouette'
      ? safeDistance > exitDistance
      : safeDistance >= enterDistance;
    next = horizonSilhouette
      ? 'silhouette'
      : resolveDistantRivalLod(
        current,
        decision.distantRivalLod,
        safeDistance,
        decision.distantRivalLodDistance,
      );
  } else {
    next = resolveDistantRivalLod(
      current,
      decision.distantRivalLod,
      distance,
      decision.distantRivalLodDistance,
    );
  }
  if (next !== current) target.setLodMode(next);
  return next;
}

export interface PodracerMaterials {
  shell: Material;
  secondary: Material;
  metal: Material;
  ink: Material;
  canopy: Material;
  accent: Material;
}

export interface PodracerPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  steer: number;
  throttle: number;
  speed: number;
  boost: number;
  damage: number;
  redline?: number;
  wrecked?: boolean;
}

/**
 * Rendering archetype used by the eight-racer presentation layer. Physics stays
 * in the simulation; this type only promises a recognisable procedural
 * silhouette and a matching animation temperament.
 */
export type RacerVehicleClass =
  | 'podracer'
  | 'landspeeder'
  | 'speeder-bike'
  | 'skim-speeder';

const RACER_VEHICLE_CLASSES: readonly RacerVehicleClass[] = [
  'podracer',
  'landspeeder',
  'speeder-bike',
  'skim-speeder',
];

export function resolveRacerVehicleClass(racerIndex: number): RacerVehicleClass {
  const safeIndex = Number.isFinite(racerIndex) ? Math.abs(Math.trunc(racerIndex)) : 0;
  return RACER_VEHICLE_CLASSES[safeIndex % RACER_VEHICLE_CLASSES.length] ?? 'podracer';
}

const beamVertex = /* glsl */ `
  attribute float aArcSeed;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uPower;
  float arcHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float arcNoise(float x,float phase){
    float cell=floor(x), f=fract(x);
    return mix(arcHash(vec2(cell,phase)),arcHash(vec2(cell+1.,phase)),f)*2.-1.;
  }
  void main() {
    vUv = uv;
    vec3 arc=position;
    float anchor=sin(uv.x*3.14159265);
    float phase=floor(uTime*14.)+aArcSeed;
    arc.y+=arcNoise(uv.x*23.,phase)*anchor*.28;
    arc.z+=arcNoise(uv.x*17.,phase+29.)*anchor*.20;
    vec4 worldPosition = modelMatrix * vec4(arc, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const beamFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColor;
  void main() {
    float edge = step(abs(vUv.y - 0.5), 0.34);
    float movingBand = step(0.58, fract(vUv.x * 4.0 - uTime * (2.0 + uPower * 3.0)));
    float core = 1.-smoothstep(.045,.18,abs(vUv.y-.5));
    float alpha = edge * (0.38 + core * 0.6 + movingBand * 0.3) * (0.68 + uPower * 0.4);
    vec3 beamColor = mix(uColor, vec3(.65, 1., 1.), core * 0.45);
    gl_FragColor = vec4(beamColor * (1.0 + core * 0.18), alpha);
  }
`;

const exhaustVertex = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vViewPosition;
  varying vec3 vViewNormal;
  void main() {
    vLocal = position;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -viewPosition.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const exhaustFragment = /* glsl */ `
  precision highp float;
  varying vec3 vLocal;
  varying vec3 vViewPosition;
  varying vec3 vViewNormal;
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uHot;
  void main() {
    // One existing closed mesh: soft axial extinction and flowing filaments
    // replace quantized plates. No scene sampling or extra particle pass.
    float along = clamp((vLocal.y + 4.25) / 8.5, 0.0, 1.0);
    float angle = atan(vLocal.z, vLocal.x);
    float power = clamp(uPower, 0.0, 1.6);
    float flow = uTime * (7.0 + power * 2.0);
    float curl = sin(angle * 3.0 + along * 19.0 - flow);
    float filament = pow(0.5 + 0.5 * sin(angle * 5.0 - along * 26.0 + flow + curl * 0.6), 3.0);
    float reach = 0.56 + power * 0.18;
    float tail = 1.0 - smoothstep(reach * 0.35, reach, along);
    float facing = abs(dot(normalize(vViewNormal), normalize(vViewPosition)));
    float softEdge = 0.32 + 0.68 * smoothstep(0.015, 0.25, facing);
    float ignition = exp(-along * 5.0);
    float shimmer = 0.88 + 0.12 * sin(along * 43.0 - flow * 1.7 + curl);
    float alpha = tail * softEdge * shimmer
      * (0.065 + ignition * 0.52 + filament * 0.16) * (0.65 + power * 0.35);
    vec3 color = mix(uHot * 0.66, vec3(0.91, 0.97, 1.0), ignition * 0.76);

    // The nozzle remains a translucent blue-white core with a feathered rim,
    // allowing the authored vanes to read through its outer radius.
    float radius = length(vLocal.xz) / 0.82;
    float cap = 1.0 - smoothstep(0.0, 0.004, along);
    float core = exp(-radius * radius * 13.0);
    float rim = exp(-pow((radius - 0.60) / 0.19, 2.0));
    float edge = 1.0 - smoothstep(0.80, 1.0, radius);
    float capAlpha = (core * 0.85 + rim * 0.25) * edge;
    vec3 capColor = mix(uHot, vec3(0.96, 0.99, 1.0), core * 0.9);
    color = mix(color, capColor, cap);
    alpha = mix(alpha, capAlpha, cap);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

const direction = new Vector3();
const midpoint = new Vector3();

function defaultMaterials(accent = '#e85034'): PodracerMaterials {
  return {
    shell: new MeshBasicMaterial({ color: '#d64b30' }),
    secondary: new MeshBasicMaterial({ color: '#f2b647' }),
    metal: new MeshBasicMaterial({ color: '#53546c' }),
    ink: new MeshBasicMaterial({ color: '#171423' }),
    canopy: new MeshBasicMaterial({ color: '#3e335e' }),
    accent: new MeshBasicMaterial({ color: accent }),
  };
}

function addMesh(
  parent: Group,
  geometry: BufferGeometry,
  material: Material,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
  name?: string,
): Mesh {
  const object = new Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.name = name ?? '';
  object.castShadow = false;
  object.receiveShadow = false;
  parent.add(object);
  return object;
}

function addStrut(
  parent: Group,
  start: Vector3,
  end: Vector3,
  radius: number,
  material: Material,
  name = '',
): Mesh {
  direction.copy(end).sub(start);
  midpoint.copy(start).add(end).multiplyScalar(0.5);
  const object = new Mesh(new CylinderGeometry(radius, radius, direction.length(), 7), material);
  object.name = name;
  object.position.copy(midpoint);
  object.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
  parent.add(object);
  return object;
}

/**
 * Bake static sibling transforms into one geometry per material. Engine pods
 * are articulated as whole groups, so their dozens of armour plates do not
 * need individual Object3D submissions. Disconnected cel silhouettes remain
 * intact and can share a single inverted-hull draw after the merge.
 */
function batchStaticSiblings(
  parent: Group,
  label: string,
  include: (mesh: Mesh) => boolean = (mesh) => (
    !Array.isArray(mesh.material) && !mesh.material.transparent
  ),
): void {
  const batches = new Map<Material, Mesh[]>();
  for (const child of [...parent.children]) {
    if (!(child instanceof Mesh) || !include(child)) continue;
    const material = Array.isArray(child.material) ? null : child.material;
    if (!material) continue;
    const batch = batches.get(material) ?? [];
    batch.push(child);
    batches.set(material, batch);
  }

  let batchIndex = 0;
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const baked = meshes.map((mesh) => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const mergedGeometry = mergeGeometries(baked, false);
    for (const geometry of baked) geometry.dispose();
    if (!mergedGeometry) continue;

    const merged = new Mesh(mergedGeometry, material);
    merged.name = `${label}-${material.name || 'surface'}-${batchIndex}`;
    merged.castShadow = false;
    merged.receiveShadow = false;
    merged.renderOrder = Math.max(...meshes.map((mesh) => mesh.renderOrder));
    for (const mesh of meshes) {
      parent.remove(mesh);
      mesh.geometry.dispose();
    }
    parent.add(merged);
    batchIndex += 1;
  }
}

/** A low-poly, closed loft with a broad shoulder and chamfered underside. */
function createFairing(
  sections: readonly (readonly [z: number, halfWidth: number, bottom: number, crown: number])[],
): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [z, width, bottom, crown] of sections) {
    const shoulder = bottom + (crown - bottom) * .68;
    for (const [x, y] of [
      [-width * .7, bottom], [width * .7, bottom], [width, shoulder],
      [width * .72, crown], [-width * .72, crown], [-width, shoulder],
    ] as const) positions.push(x, y, z);
  }
  for (let station = 0; station < sections.length - 1; station++) {
    for (let face = 0; face < 6; face++) {
      const a = station * 6 + face;
      const b = station * 6 + (face + 1) % 6;
      indices.push(a, b, a + 6, b, b + 6, a + 6);
    }
  }
  for (let face = 1; face < 5; face++) {
    indices.push(0, face + 1, face);
    const last = (sections.length - 1) * 6;
    indices.push(last, last + face, last + face + 1);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  // The static material merger expects every mesh to expose position/normal/uv.
  geometry.setAttribute('uv', new Float32BufferAttribute(new Array(positions.length / 3 * 2).fill(0), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Swept aerofoil within the old engine envelope; no added racing width. */
function createSweptVane(): BufferGeometry {
  return createFairing([
    [-2.15, .045, 0, .28],
    [-1.4, .095, 0, 1.12],
    [-.62, .13, 0, 1.03],
    [.72, .11, 0, .36],
    [1.25, .055, 0, .06],
  ]);
}

/** Inward-facing burner walls expose a real recessed cavity from the chase lens. */
function inwardFacing(geometry: BufferGeometry): BufferGeometry {
  const index = geometry.getIndex();
  if (index) for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1);
    index.setX(i + 1, index.getX(i + 2));
    index.setX(i + 2, b);
  }
  const normal = geometry.getAttribute('normal');
  for (let i = 0; i < normal.count; i++) normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
  return geometry;
}

/** Closed overlapping heat-shield petal; its bends replace the plain exhaust sleeve. */
function createNozzlePetal(angle: number): BufferGeometry {
  const stations = [[-7.96, 1.23], [-6.88, 1.34], [-5.5, 1.47], [-4.57, 1.48]] as const;
  const positions: number[] = [], indices: number[] = [];
  const row = 3, layer = stations.length * row;
  for (let inside = 0; inside < 2; inside++) for (const [z, radius] of stations) {
    for (let arc = 0; arc < row; arc++) {
      const theta = angle + (arc / (row - 1) - .5) * .72;
      const r = radius - inside * .055;
      positions.push(Math.cos(theta) * r, Math.sin(theta) * r, z);
    }
  }
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, b, c, a, c, d);
  for (let z = 0; z < stations.length - 1; z++) {
    for (let arc = 0; arc < row - 1; arc++) {
      const a = z * row + arc, b = a + 1, c = b + row, d = a + row;
      quad(a, b, c, d); quad(a + layer, d + layer, c + layer, b + layer);
    }
    const a = z * row, b = a + row, c = a + row - 1, d = c + row;
    quad(a, b, b + layer, a + layer); quad(c, c + layer, d + layer, d);
  }
  for (let arc = 0; arc < row - 1; arc++) {
    quad(arc, arc + layer, arc + layer + 1, arc + 1);
    const a = (stations.length - 1) * row + arc;
    quad(a, a + 1, a + 1 + layer, a + layer);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array(positions.length / 3 * 2), 2));
  geometry.setIndex(indices);
  const flat = geometry.toNonIndexed(); geometry.dispose(); flat.computeVertexNormals();
  flat.setIndex(Array.from({ length: flat.getAttribute('position').count }, (_, i) => i));
  return flat;
}

function createEngine(materials: PodracerMaterials, side: number): {
  root: Group;
  exhaust: Mesh<BufferGeometry, ShaderMaterial>;
  turbines: Group;
} {
  const root = new Group();
  root.name = side < 0 ? 'engine-left' : 'engine-right';
  root.position.set(side * 8.4, 1.25, 7.2);

  // A dark stepped pressure vessel remains visible through the actual gaps
  // between broad jacket segments. These are open shells, not panel decals on
  // one unbroken cylinder, so lighting can describe distinct assembled stages.
  const pressureProfile = [
    [0, -4.8], [1.08, -4.8], [1.28, -4.2], [1.28, -3.5],
    [1.45, -3.15], [1.45, -.9], [1.29, -.7], [1.29, .0],
    [1.46, .25], [1.46, 2.3], [1.25, 2.6], [1.25, 4.7], [0, 4.7],
  ].map(([radius, z]) => new Vector2(radius, z));
  addMesh(root, new LatheGeometry(pressureProfile, 20), materials.ink,
    [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 1], 'engine-pressure-core');
  for (const [stage, z, length, radius] of [
    [0, -3.03, 2.45, 1.72], [1, .13, 2.76, 1.69], [2, 3.17, 2.25, 1.57],
  ] as const) {
    for (let quadrant = 0; quadrant < 4; quadrant++) {
      const arc = Math.PI / 2 - .2;
      addMesh(root, new CylinderGeometry(radius * .96, radius, length, 6, 1, true,
        quadrant * Math.PI / 2 + .1, arc),
      stage === 1 && quadrant === (side < 0 ? 1 : 2) ? materials.secondary : materials.shell,
      [0, 0, z], [Math.PI / 2, 0, 0], [1, 1, 1], 'segmented-pressure-jacket');
    }
  }
  for (const z of [-4.35, -1.62, 1.68, 4.35]) {
    addMesh(root, new TorusGeometry(1.37, .095, 4, 20), materials.metal, [0, 0, z]);
  }
  addMesh(root, new CylinderGeometry(1.88, 1.54, 2.4, 24), materials.secondary,
    [0, 0, 5.4], [Math.PI / 2, 0, 0], [1, 1, 1], 'intake-cowl');
  addMesh(root, new CylinderGeometry(1.36, 1.36, 0.68, 10), materials.ink,
    [0, 0, 6.65], [Math.PI / 2, 0, 0], [1, 1, 1], 'intake-mouth');
  addMesh(root, new ConeGeometry(1.04, 2.15, 10, 1, true), materials.metal,
    [0, 0, 6.9], [-Math.PI / 2, 0, 0], [1, 1, 1], 'intake-spinner');
  addMesh(root, new CylinderGeometry(1.34, 1.10, 3.36, 16, 1, true), materials.ink,
    [0, 0, -6.25], [Math.PI / 2, 0, 0], [1, 1, 1], 'nozzle-pressure-liner');
  for (let petal = 0; petal < 8; petal++) {
    const angle = petal / 8 * Math.PI * 2 + side * .055;
    addMesh(root, createNozzlePetal(angle), petal % 5 === 1 ? materials.metal : materials.shell,
      [0, 0, 0], [0, 0, 0], [1, 1, 1], 'overlapping-exhaust-heat-shield');
    // Recessed actuator mounts expose the dark liner between the painted petals.
    if (petal % 2 === 0) addMesh(root, new BoxGeometry(.20, .10, .72), materials.metal,
      [Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, -5.15], [0, 0, angle - Math.PI / 2], [1, 1, 1], 'nozzle-actuator-mount');
  }

  const turbines = new Group();
  turbines.name = side < 0 ? 'engine-left-turbines' : 'engine-right-turbines';
  turbines.position.z = 6.65;
  for (let blade = 0; blade < 8; blade += 1) {
    addMesh(turbines, new BoxGeometry(0.15, 1.05, 0.18), materials.secondary,
      [0, 0.56, 0], [0, 0, blade * Math.PI / 4], [1, 1, 1]);
  }
  batchStaticSiblings(turbines, 'engine-turbine');
  root.add(turbines);

  for (const z of [-1.62, 4.28]) {
    addMesh(root, new TorusGeometry(1.65, .11, 4, 20), materials.metal, [0, 0, z]);
  }

  // A stepped nozzle lip and radial brake vanes make the rear view read as a
  // machine assembled from distinct pressure stages, not a capped cylinder.
  addMesh(root, new TorusGeometry(1.34, 0.17, 5, 10), materials.secondary,
    [0, 0, -5.2]);
  addMesh(root, new TorusGeometry(1.08, 0.14, 5, 10), materials.ink,
    [0, 0, -6.25]);
  addMesh(root, inwardFacing(new CylinderGeometry(.65, 1.15, 1.35, 24, 1, true)), materials.ink,
    [0, 0, -7.36], [Math.PI / 2, 0, 0], [1, 1, 1], 'recessed-burner-wall');
  addMesh(root, new CylinderGeometry(.65, .65, .1, 20), materials.ink,
    [0, 0, -6.73], [Math.PI / 2, 0, 0], [1, 1, 1], 'burner-dark-backplate');
  addMesh(root, new TorusGeometry(1.20, .12, 5, 24), materials.shell,
    [0, 0, -8.06], [0, 0, 0], [1, 1, 1], 'blue-nozzle-return-lip');
  for (let vane = 0; vane < 4; vane += 1) {
    const angle = vane * Math.PI / 2 + (side < 0 ? 0.08 : -0.08);
    addMesh(root, new BoxGeometry(0.2, 0.72, 1.55), vane % 2 === 0 ? materials.secondary : materials.metal,
      [Math.cos(angle) * 1.28, Math.sin(angle) * 1.28, -5.9], [0, 0, angle]);
  }

  const glow=new MeshBasicMaterial({name:'Recessed engine core',color:'#78f2ff',toneMapped:false});
  addMesh(root,new TorusGeometry(.83,.065,5,24),glow,[0,0,-7.62]);
  addMesh(root,new SphereGeometry(.24,12,6),glow,[0,0,-7.03],[0,0,0],[1,1,.35]);
  for(let blade=0;blade<11;blade++){
    const a=blade*Math.PI*2/11;
    addMesh(root,new BoxGeometry(.11,.42,.11),materials.metal,
      [Math.cos(a)*.55,Math.sin(a)*.55,-7.28],[.32*Math.sin(a),.32*Math.cos(a),a-.62]);
  }
  // Small fastening heads sit on four structural ears rather than outlining
  // the whole opening in another perfectly repeated bright bead necklace.
  for (let lug=0;lug<4;lug++) {
    const a=lug*Math.PI/2+.4;
    addMesh(root,new BoxGeometry(.22,.38,.36),materials.metal,
      [Math.cos(a)*1.25,Math.sin(a)*1.25,-7.90],[0,0,a-.5]);
    addMesh(root,new CylinderGeometry(.085,.085,.06,6),materials.secondary,
      [Math.cos(a)*1.25,Math.sin(a)*1.25,-8.12],[Math.PI/2,0,0]);
  }

  // Readable mechanical break-up: armour tabs, fins, cable clips, asymmetry.
  for (let panel = 0; panel < 4; panel += 1) {
    const angle = panel * Math.PI / 2 + (side < 0 ? 0.15 : -0.12);
    addMesh(root, new BoxGeometry(0.44, 0.24, 3.2), panel % 2 === 0 ? materials.secondary : materials.metal,
      [Math.cos(angle) * 1.58, Math.sin(angle) * 1.58, 0.6], [0, 0, angle], [1, 1, 1]);
  }
  // Broad, low swept armour shoulders replace a thin upright knife. The
  // entire panel still fits within the previous outer engine/cable envelope.
  addMesh(root, createFairing([
    [-4.28, 1.90, -.04, .07], [-3.42, 1.94, 0, .30],
    [-2.42, 1.49, .02, .38], [-.45, .64, .06, .19], [.3, .12, .02, .06],
  ]), materials.shell, [0, 1.63, 0], [0, 0, side * -.025], [1, 1, 1], 'broad-swept-engine-shoulder');
  addMesh(root, createSweptVane(), materials.secondary,
    [side * -.47, 1.75, -.45], [0, 0, side * -.4], [1, .46, .72], 'swept-dorsal-fairing');
  for (const mountSide of [-1, 1]) {
    addMesh(root, createFairing([
      [-4.08,.08,.02,.09],[-3.22,.12,.02,.23],[-1.85,.10,.03,.20],[-.8,.035,.02,.06],
    ]),materials.metal,[mountSide*.68,1.87,0],[0,mountSide*-.065,0],[1,1,1],'swept-fairing-pressure-rib');
  }
  // A second low side fairing interrupts the nozzle outline in chase view,
  // while staying inside the former cable-and-cowl width.
  addMesh(root, createSweptVane(), materials.shell,
    [side * 1.29, -.35, -3.8], [0, 0, side * -1.12], [1, .7, .8], 'swept-nozzle-fairing');
  addMesh(root, new BoxGeometry(0.72, 0.7, 1.1), materials.ink,
    [side * 1.3, -1.18, 1.6], [0, 0, 0]);
  // The intake brow and offset service hatch give each pod a face and a clear
  // left/right manufacturing asymmetry in close hero shots.
  addMesh(root, new BoxGeometry(1.36, 0.24, 0.72), materials.ink,
    [side * 0.28, 1.52, 5.62], [0.08, 0, side * -0.16]);
  addMesh(root, new BoxGeometry(0.72, 0.18, 1.18), materials.secondary,
    [side * -1.35, -0.92, -2.15], [0, 0, side * 0.18]);

  const cableCurve = new CatmullRomCurve3([
    new Vector3(side * 0.85, 1.2, 4.5),
    new Vector3(side * 1.85, 2.05, 2.1),
    new Vector3(side * 1.8, 1.75, -1.4),
    new Vector3(side * 0.95, 0.9, -4.5),
  ]);
  addMesh(root, new TubeGeometry(cableCurve, 24, 0.12, 5, false), materials.ink);
  // Exposed return pipes and stepped inspection plates break the large clean
  // pressure vessel into serviceable parts without widening its racing shape.
  for (const level of [-.62, .58]) {
    const coolant = new CatmullRomCurve3([
      new Vector3(side * 1.42, level, 3.6),
      new Vector3(side * 1.77, level + .22, 2.8),
      new Vector3(side * 1.72, level + .18, -3.8),
      new Vector3(side * 1.05, level, -5.4),
    ]);
    addMesh(root, new TubeGeometry(coolant, 14, .105, 6, false), materials.metal);
    for (const z of [-3.3, -.2, 2.3]) {
      addMesh(root, new BoxGeometry(.28, .24, .34), materials.secondary,
        [side * 1.74, level + .18, z]);
    }
  }
  for (let panel = 0; panel < 5; panel++) {
    addMesh(root, new BoxGeometry(1.12, .12, .86),
      panel % 3 === 0 ? materials.secondary : materials.shell,
      [side * .35, 1.57, -4.2 + panel * 1.15], [0.04, side * -.1, side * .14]);
    addMesh(root, new BoxGeometry(.86, .075, .1), materials.ink,
      [side * .35, 1.66, -4.6 + panel * 1.15], [0.04, side * -.1, side * .14]);
  }

  const exhaustMaterial = new ShaderMaterial({
    name: 'DuskEngineExhaust',
    vertexShader: exhaustVertex,
    fragmentShader: exhaustFragment,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uPower: { value: 0.4 },
      uHot: { value: new Color('#b9eaff') },
    },
  });
  // Straight sides need no extra axial subdivisions: five rings plus the cap
  // use fewer triangles than the previous six-ring open cone at the same rim.
  const exhaust = addMesh(root, new ConeGeometry(.82, 8.5, 18, 5, false), exhaustMaterial,
    [0, 0, -9.15], [-Math.PI / 2, 0, 0], [1, .4, 1], 'engine-exhaust') as Mesh<BufferGeometry, ShaderMaterial>;
  exhaust.renderOrder = 12;
  batchStaticSiblings(root, 'engine');
  return { root, exhaust, turbines };
}

type ScaleTuple = readonly [number, number, number];
type PositionTuple = readonly [number, number, number];

interface VehiclePresentationConfig {
  engineSpread: number;
  leftEngineScale: ScaleTuple;
  rightEngineScale: ScaleTuple;
  cockpitPosition: PositionTuple;
  cockpitScale: ScaleTuple;
  cockpitRoll: number;
  engineRestY: number;
  leftEngineRoll: number;
  rightEngineRoll: number;
  vibration: number;
  steerRoll: number;
  couplingSpan: number;
  couplingY: readonly number[];
  couplingZ: number;
  dustSpread: number;
  wakeSpread: number;
  wakeZ: number;
}

const VEHICLE_PRESENTATION: Readonly<Record<RacerVehicleClass, VehiclePresentationConfig>> = {
  podracer: {
    engineSpread: 8.4,
    leftEngineScale: [1, 1, 1],
    rightEngineScale: [1, 1, 1],
    cockpitPosition: [0, 1.2, -5.2],
    cockpitScale: [1, 1, 1],
    cockpitRoll: 0,
    engineRestY: 1.25,
    leftEngineRoll: 0,
    rightEngineRoll: 0,
    vibration: 1,
    steerRoll: 0.08,
    couplingSpan: 6.8,
    couplingY: [1.15, 1.32],
    couplingZ: 5.2,
    dustSpread: 8.4,
    wakeSpread: 8.4,
    wakeZ: -7.8,
  },
  landspeeder: {
    engineSpread: 3.65,
    leftEngineScale: [1.18, 0.78, 0.72],
    rightEngineScale: [1.18, 0.78, 0.72],
    cockpitPosition: [0, 0.85, -2.4],
    cockpitScale: [1.34, 0.94, 0.88],
    cockpitRoll: 0,
    engineRestY: 0.72,
    leftEngineRoll: 0.018,
    rightEngineRoll: -0.018,
    vibration: 0.46,
    steerRoll: 0.035,
    couplingSpan: 3.25,
    couplingY: [0.68],
    couplingZ: 8.25,
    dustSpread: 3.7,
    wakeSpread: 3.55,
    wakeZ: -5.8,
  },
  'speeder-bike': {
    engineSpread: 1.62,
    leftEngineScale: [0.46, 0.52, 0.9],
    rightEngineScale: [0.46, 0.52, 0.9],
    cockpitPosition: [0, 1.48, -4.55],
    cockpitScale: [0.5, 0.72, 1.08],
    cockpitRoll: 0,
    engineRestY: 1.18,
    leftEngineRoll: 0.04,
    rightEngineRoll: -0.04,
    vibration: 1.42,
    steerRoll: 0.15,
    couplingSpan: 1.48,
    couplingY: [1.18],
    couplingZ: 5.95,
    dustSpread: 1.45,
    wakeSpread: 1.38,
    wakeZ: -7.15,
  },
  'skim-speeder': {
    engineSpread: 5.65,
    leftEngineScale: [1.24, 0.52, 0.68],
    rightEngineScale: [0.94, 0.62, 0.78],
    cockpitPosition: [0, 1.08, -2.7],
    cockpitScale: [0.8, 0.66, 0.92],
    cockpitRoll: 0.035,
    engineRestY: 0.86,
    leftEngineRoll: 0.075,
    rightEngineRoll: -0.105,
    vibration: 0.78,
    steerRoll: 0.21,
    couplingSpan: 5.25,
    couplingY: [0.92],
    couplingZ: 7.15,
    dustSpread: 5.6,
    wakeSpread: 5.4,
    wakeZ: -5.9,
  },
};

/** Adds class-defining masses beneath the cockpit so reduced MRT LOD keeps them. */
function addVehicleClassSilhouette(
  cockpit: Group,
  materials: PodracerMaterials,
  vehicleClass: RacerVehicleClass,
): void {
  if (vehicleClass === 'landspeeder') {
    // A continuous armoured deck and low ram rails turn the separated pod
    // recipe into a visibly heavy contact racer.
    addMesh(cockpit, new BoxGeometry(7.2, 0.72, 10.4), materials.shell,
      [0, -0.3, 4.4], [0.02, 0, 0], [1, 1, 1], 'landspeeder-armour-deck');
    addMesh(cockpit, new BoxGeometry(8.7, 0.38, 4.8), materials.secondary,
      [0, -0.14, 6.3], [-0.05, 0, 0], [1, 1, 1], 'landspeeder-shoulder');
    for (const side of [-1, 1]) {
      addMesh(cockpit, new BoxGeometry(0.42, 0.55, 7.6), materials.metal,
        [side * 4.05, -0.48, 4.9], [0, side * -0.055, side * -0.035], [1, 1, 1], 'landspeeder-ram-rail');
      addMesh(cockpit, new BoxGeometry(1.35, 0.28, 2.1), materials.ink,
        [side * 3.18, 0.08, 8.55], [0, side * -0.08, 0], [1, 1, 1], 'landspeeder-intake-brow');
      addMesh(cockpit, new BoxGeometry(1.1, 0.16, 1.75), materials.accent,
        [side * 2.75, 0.34, 7.7], [0, 0, side * 0.04], [1, 1, 1], 'landspeeder-warning-plate');
    }
    addMesh(cockpit, new BoxGeometry(3.2, 0.4, 1.15), materials.ink,
      [0, -0.5, 10.05], [0, 0, 0], [1, 1, 1], 'landspeeder-ram-mouth');
    return;
  }

  if (vehicleClass === 'speeder-bike') {
    // A needle spine, exposed fork and high tail leave almost no horizontal
    // mass: this craft reads as a bike even beside the much wider player pod.
    addMesh(cockpit, new BoxGeometry(1.05, 0.42, 11.8), materials.shell,
      [0, -0.42, 4.45], [-0.035, 0, 0], [1, 1, 1], 'speeder-bike-spine');
    addMesh(cockpit, new BoxGeometry(0.24, 1.35, 4.2), materials.secondary,
      [0, 0.32, 7.15], [0.12, 0, 0], [1, 1, 1], 'speeder-bike-fin');
    for (const side of [-1, 1]) {
      addMesh(cockpit, new BoxGeometry(0.18, 0.22, 5.6), materials.metal,
        [side * 0.72, -0.32, 6.1], [0, side * -0.04, side * -0.08], [1, 1, 1], 'speeder-bike-fork');
      addMesh(cockpit, new BoxGeometry(0.2, 0.7, 1.65), materials.ink,
        [side * 0.58, 0.46, -0.8], [side * 0.18, 0, side * 0.12], [1, 1, 1], 'speeder-bike-tail-vane');
    }
    addMesh(cockpit, new ConeGeometry(0.42, 2.7, 6), materials.accent,
      [0, -0.27, 10.72], [Math.PI / 2, 0, 0], [1, 1, 1], 'speeder-bike-needle');
    return;
  }

  if (vehicleClass === 'skim-speeder') {
    // Swept, wafer-thin plates produce the broad banking silhouette. Unequal
    // service fins keep the erratic racer's salvaged character at hero range.
    addMesh(cockpit, new BoxGeometry(10.8, 0.24, 4.5), materials.shell,
      [0, -0.28, 5.15], [0.01, 0, 0], [1, 1, 1], 'skim-speeder-wing');
    for (const side of [-1, 1]) {
      addMesh(cockpit, new BoxGeometry(5.2, 0.18, 3.5), side < 0 ? materials.secondary : materials.shell,
        [side * 4.1, -0.18 + (side > 0 ? 0.1 : 0), 3.9], [0, side * 0.34, side * -0.035], [1, 1, 1], 'skim-speeder-swept-tip');
      addMesh(cockpit, new BoxGeometry(0.2, side < 0 ? 1.65 : 1.15, 2.6), materials.ink,
        [side * 4.65, 0.45, 3.35], [side * 0.1, side * 0.22, side * -0.14], [1, 1, 1], 'skim-speeder-edge-vane');
      addMesh(cockpit, new BoxGeometry(2.2, 0.15, 0.52), materials.accent,
        [side * 3.5, 0.02, 6.35], [0, side * 0.18, 0], [1, 1, 1], 'skim-speeder-edge-light');
    }
    addMesh(cockpit, new BoxGeometry(1.35, 0.5, 10.1), materials.metal,
      [0, -0.46, 3.65], [-0.03, 0, 0], [1, 1, 1], 'skim-speeder-keel');
  }
}

function createVehicleConnectivity(
  materials: PodracerMaterials,
  vehicleClass: RacerVehicleClass,
  presentation: VehiclePresentationConfig,
): Group {
  const root = new Group();
  root.name = `vehicle-connectivity-${vehicleClass}`;
  root.userData.vehicleClass = vehicleClass;
  const cockpitStrutZ = presentation.cockpitPosition[2] + 1.7;
  const engineStrutX = presentation.engineSpread * 0.86;
  if (vehicleClass === 'podracer') {
    // Towed engines use flexible corrugated conduits. The sag and broad socket
    // ends replace the rigid triangle with the mechanical tension in the target.
    const ringNormal = new Vector3(0, 0, 1);
    for (const side of [-1, 1]) {
      const curve = new CatmullRomCurve3([
        new Vector3(side * 1.85, 1.36, cockpitStrutZ - .65),
        new Vector3(side * 3.8, .55, cockpitStrutZ - .1),
        new Vector3(side * 5.7, .48, -.85),
        new Vector3(side * engineStrutX, 1.12, 1.8),
      ]);
      addMesh(root, new TubeGeometry(curve, 28, .22, 8, false), materials.ink);
      for (let ring = 0; ring < 18; ring++) {
        const t = (ring + .5) / 18;
        const cuff = addMesh(root, new TorusGeometry(.23, ring % 4 === 1 ? .055 : .032, 4, 8),
          ring % 4 === 1 ? materials.metal : materials.ink);
        cuff.position.copy(curve.getPointAt(t));
        cuff.quaternion.setFromUnitVectors(ringNormal, curve.getTangentAt(t));
      }
      for (const t of [0, 1]) {
        const fitting = addMesh(root, new CylinderGeometry(.34, .31, .66, 8), materials.metal);
        fitting.position.copy(curve.getPointAt(t));
        fitting.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), curve.getTangentAt(t));
      }
    }
  } else {
    addStrut(root, new Vector3(-1.35, 1.2, cockpitStrutZ), new Vector3(-engineStrutX, 1.15, 3.5), 0.25, materials.metal, 'upper-strut-left');
    addStrut(root, new Vector3(1.35, 1.2, cockpitStrutZ), new Vector3(engineStrutX, 1.15, 3.5), 0.25, materials.metal, 'upper-strut-right');
    addStrut(root, new Vector3(-1.0, 0.9, cockpitStrutZ + 0.3), new Vector3(-engineStrutX, 0.2, 1.2), 0.12, materials.ink, 'lower-strut-left');
    addStrut(root, new Vector3(1.0, 0.9, cockpitStrutZ + 0.3), new Vector3(engineStrutX, 0.2, 1.2), 0.12, materials.ink, 'lower-strut-right');
  }
  batchStaticSiblings(root, `${vehicleClass}-chassis`, () => true);
  root.traverse((object) => {
    if (object instanceof Mesh) object.userData.vehicleClass = vehicleClass;
  });
  return root;
}

export class PodracerView extends Group {
  readonly authoredVehicleClass: RacerVehicleClass;
  readonly pilotAnchor = new Group();
  readonly dustAnchors: Group[] = [];
  readonly wakeAnchors: Group[] = [];
  private readonly leftEngine: ReturnType<typeof createEngine>;
  private readonly rightEngine: ReturnType<typeof createEngine>;
  private readonly couplingMaterial: ShaderMaterial;
  private readonly cockpit: Group;
  private readonly classModules = new Map<RacerVehicleClass, Group>();
  private readonly connectivityGroups = new Map<RacerVehicleClass, Group>();
  private readonly couplingGroups = new Map<RacerVehicleClass, Group>();
  private readonly couplingMeshes: Mesh[] = [];
  private readonly chassisDetailMeshes: Mesh[] = [];
  private readonly ownedMaterials: PodracerMaterials | null;
  private readonly silhouetteMaterial: Material;
  private prepassProxy: Mesh | null = null;
  private silhouetteProxy: Mesh | null = null;
  private readonly fullPrepassGeometries = new Map<RacerVehicleClass, BufferGeometry>();
  private readonly reducedPrepassGeometries = new Map<RacerVehicleClass, BufferGeometry>();
  private lodModeValue: DistantRivalLod = 'full';
  private vehicleClassValue: RacerVehicleClass;
  private presentation: VehiclePresentationConfig;

  constructor(
    materials?: PodracerMaterials,
    readonly racerIndex = 0,
  ) {
    super();
    this.name = `podracer-${racerIndex}`;
    this.authoredVehicleClass = resolveRacerVehicleClass(racerIndex);
    this.vehicleClassValue = this.authoredVehicleClass;
    this.presentation = VEHICLE_PRESENTATION[this.vehicleClassValue];
    this.userData.vehicleClass = this.vehicleClassValue;
    this.userData.authoredVehicleClass = this.authoredVehicleClass;
    const palette = materials ?? defaultMaterials(['#ef4e34', '#34b7d8', '#88b83d', '#a25be2'][racerIndex] ?? '#ef4e34');
    this.ownedMaterials = materials ? null : palette;
    this.silhouetteMaterial = palette.shell;

    this.leftEngine = createEngine(palette, -1);
    this.rightEngine = createEngine(palette, 1);
    this.leftEngine.root.position.set(
      -this.presentation.engineSpread,
      this.presentation.engineRestY,
      7.2,
    );
    this.rightEngine.root.position.set(
      this.presentation.engineSpread,
      this.presentation.engineRestY,
      7.2,
    );
    this.leftEngine.root.scale.set(...this.presentation.leftEngineScale);
    this.rightEngine.root.scale.set(...this.presentation.rightEngineScale);
    this.leftEngine.root.rotation.z = this.presentation.leftEngineRoll;
    this.rightEngine.root.rotation.z = this.presentation.rightEngineRoll;
    this.add(this.leftEngine.root, this.rightEngine.root);

    const cockpit = new Group();
    this.cockpit = cockpit;
    cockpit.name = 'cockpit';
    cockpit.position.set(...this.presentation.cockpitPosition);
    addMesh(cockpit, createFairing([
      [-3.35, .42, -.24, .16], [-2.5, 1.48, -.6, .67],
      [-.95, 2.2, -.86, .74], [.95, 1.83, -.72, .65],
      [2.36, 1.14, -.5, .3], [3.35, .19, -.22, -.1],
    ]), palette.shell, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'sculpted-cockpit-shell');
    addMesh(cockpit,new BoxGeometry(1.68,.16,1.75),palette.ink,[0,.70,.25],[0,0,0],[1,1,1],'open-seat-well');
    // A continuous raised rear deck closes the black rectangle behind the
    // driver. The narrow padded bucket faces forward inside a blue back shell.
    addMesh(cockpit, createFairing([
      [-3.32,.38,.02,.27],[-2.55,1.18,.39,.88],[-1.72,1.6,.56,1.2],
      [-1.05,1.34,.59,1.18],[-.64,.84,.6,.81],
    ]),palette.shell,[0,0,0],[0,0,0],[1,1,1],'continuous-rear-cockpit-deck');
    addMesh(cockpit, createFairing([
      [-1.36,.48,.69,1.13],[-1.13,.84,.68,1.66],[-.86,.7,.68,1.56],
    ]),palette.shell,[0,0,0],[0,0,0],[1,1,1],'contoured-seat-back-shell');
    addMesh(cockpit,new BoxGeometry(1.06,.58,.13),palette.ink,[0,1.17,-.79],[-.15,0,0],[1,1,1],'padded-seat-back');
    addMesh(cockpit,createFairing([
      [-2.95,.06,.49,.53],[-2.15,.16,1.05,1.12],[-1.53,.19,1.22,1.26],
    ]),palette.secondary,[0,0,0],[0,0,0],[1,1,1],'rear-deck-racing-stripe');
    for (const side of [-1,1]) {
      addMesh(cockpit, createFairing([
        [-2.78, .06, .33, .48], [-2.1, .32, .52, 1.04],
        [-1.12, .42, .61, 1.23], [.15, .28, .6, .98], [.87, .08, .47, .67],
      ]), palette.shell, [side * 1.28, 0, 0], [0, side * -.08, 0], [1, 1, 1], 'sculpted-rear-cowl');
      addMesh(cockpit, createFairing([
        [-2.28, .06, .85, .9], [-1.18, .22, 1.19, 1.26], [.05, .13, .93, 1.0],
      ]), palette.secondary, [side * 1.28, .01, 0], [0, side * -.08, 0], [1, 1, 1], 'cowl-racing-stripe');
    }
    addMesh(cockpit,new BoxGeometry(2.25,.11,.86),palette.canopy,[0,1.1,1.08],[-.48,0,0],[1,1,1],'instrument-windscreen');
    for(const side of [-1,1]){
      addMesh(cockpit,new BoxGeometry(.48,.16,3.3),palette.secondary,[side*1.6,.57,-.2],[0,side*.12,side*-.18],[1,1,1],'painted-side-rail');
      for(let vent=0;vent<7;vent++)addMesh(cockpit,new BoxGeometry(.55,.09,.09),palette.ink,[side*1.55,.68,-1.45+vent*.19],[0,0,0]);
    }
    addMesh(cockpit, new ConeGeometry(1.18, 3.5, 8), palette.secondary,
      [0, -0.1, 3.7], [Math.PI / 2, 0, 0], [1, 1, 1], 'cockpit-nose');
    addMesh(cockpit, createFairing([
      [-2.05, .54, -.67, -.53], [-1.3, 1.85, -.72, -.48], [-.72, 1.35, -.65, -.50],
    ]), palette.metal, [0, 0, 0], [0, 0, 0], [1, 1, 1], 'tapered-cockpit-undertray');
    for (const vehicleClass of RACER_VEHICLE_CLASSES) {
      const module = new Group();
      module.name = `vehicle-module-${vehicleClass}`;
      module.userData.vehicleClass = vehicleClass;
      addVehicleClassSilhouette(module, palette, vehicleClass);
      batchStaticSiblings(module, `${vehicleClass}-module`);
      module.traverse((object) => {
        if (object instanceof Mesh) object.userData.vehicleClass = vehicleClass;
      });
      this.classModules.set(vehicleClass, module);
      cockpit.add(module);
    }
    this.pilotAnchor.position.set(0, 1.0, -0.55);
    cockpit.add(this.pilotAnchor);
    cockpit.scale.set(...this.presentation.cockpitScale);
    cockpit.rotation.z = this.presentation.cockpitRoll;
    batchStaticSiblings(cockpit, 'cockpit');
    this.add(cockpit);

    for (const vehicleClass of RACER_VEHICLE_CLASSES) {
      const connectivity = createVehicleConnectivity(
        palette,
        vehicleClass,
        VEHICLE_PRESENTATION[vehicleClass],
      );
      connectivity.traverse((object) => {
        if (object instanceof Mesh) this.chassisDetailMeshes.push(object);
      });
      this.connectivityGroups.set(vehicleClass, connectivity);
      this.add(connectivity);
    }

    this.couplingMaterial = new ShaderMaterial({
      name: 'EnergyCoupling',
      vertexShader: beamVertex,
      fragmentShader: beamFragment,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uPower: { value: 0.5 },
        uColor: { value: new Color('#75f4ff') },
      },
    });
    for (const vehicleClass of RACER_VEHICLE_CLASSES) {
      const coupling = new Group();
      coupling.name = `vehicle-coupling-${vehicleClass}`;
      coupling.userData.vehicleClass = vehicleClass;
      const presentation = VEHICLE_PRESENTATION[vehicleClass];
      for (const y of presentation.couplingY) {
        const span = presentation.couplingSpan;
        const z = presentation.couplingZ;
        const curve = new CatmullRomCurve3([
          new Vector3(-span, y, z),
          new Vector3(-span * 0.5, y + 0.28, z - 0.15),
          new Vector3(0, y - 0.12, z),
          new Vector3(span * 0.5, y + 0.28, z - 0.15),
          new Vector3(span, y, z),
        ]);
        const beam = new Mesh(
          new TubeGeometry(curve, 48, y < 1 ? 0.05 : 0.04, 5, false),
          this.couplingMaterial,
        );
        beam.geometry.setAttribute('aArcSeed', new Float32BufferAttribute(new Float32Array(beam.geometry.getAttribute('position').count).fill(y * 17), 1));
        beam.name = `${vehicleClass}-energy-coupling`;
        beam.userData.vehicleClass = vehicleClass;
        beam.renderOrder = 14;
        coupling.add(beam);
      }
      if (vehicleClass === 'podracer') {
        // Short reconnecting forks share the main batch; no extra draw or light.
        for (const side of [-1, 1]) {
          const fork = new CatmullRomCurve3([
            new Vector3(side * 4.5, 1.25, 5.2),
            new Vector3(side * 3.5, 1.52, 5.38),
            new Vector3(side * 2.5, .98, 5.42),
            new Vector3(side * 1.5, 1.25, 5.2),
          ]);
          const beam = new Mesh(new TubeGeometry(fork, 18, .019, 4, false), this.couplingMaterial);
          beam.geometry.setAttribute('aArcSeed', new Float32BufferAttribute(new Float32Array(beam.geometry.getAttribute('position').count).fill(side * 9.3), 1));
          beam.name = 'podracer-reconnecting-energy-fork'; beam.renderOrder = 14;
          coupling.add(beam);
        }
      }
      batchStaticSiblings(coupling, `${vehicleClass}-energy-coupling`, () => true);
      coupling.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.userData.vehicleClass = vehicleClass;
        this.couplingMeshes.push(object);
      });
      this.couplingGroups.set(vehicleClass, coupling);
      this.add(coupling);
    }

    for (const x of [-this.presentation.dustSpread, 0, this.presentation.dustSpread]) {
      const dust = new Group();
      dust.position.set(x, -1.65, x === 0 ? this.presentation.cockpitPosition[2] : 5.3);
      this.dustAnchors.push(dust);
      this.add(dust);
    }
    for (const x of [-this.presentation.wakeSpread, this.presentation.wakeSpread]) {
      const wake = new Group();
      wake.position.set(x, -0.8, this.presentation.wakeZ);
      this.wakeAnchors.push(wake);
      this.add(wake);
    }

    this.applyClassVisibility();
  }

  get lodMode(): DistantRivalLod {
    return this.lodModeValue;
  }

  get vehicleClass(): RacerVehicleClass {
    return this.vehicleClassValue;
  }

  /**
   * Runtime presentation switch used by the player's vehicle-cycle control.
   * Rivals should still be constructed with their final `racerIndex`, which
   * includes the richer class-specific armour kit. A live switch toggles the
   * pre-authored armour/connectivity set and its exact MRT geometry without
   * replacing stable pilot, outline, dust or wake references.
   */
  setVehicleClass(vehicleClass: RacerVehicleClass): void {
    if (vehicleClass === this.vehicleClassValue) return;
    this.vehicleClassValue = vehicleClass;
    this.presentation = VEHICLE_PRESENTATION[vehicleClass];
    this.userData.vehicleClass = vehicleClass;

    this.leftEngine.root.position.set(
      -this.presentation.engineSpread,
      this.presentation.engineRestY,
      7.2,
    );
    this.rightEngine.root.position.set(
      this.presentation.engineSpread,
      this.presentation.engineRestY,
      7.2,
    );
    this.leftEngine.root.scale.set(...this.presentation.leftEngineScale);
    this.rightEngine.root.scale.set(...this.presentation.rightEngineScale);
    this.leftEngine.root.rotation.z = this.presentation.leftEngineRoll;
    this.rightEngine.root.rotation.z = this.presentation.rightEngineRoll;
    this.cockpit.position.set(...this.presentation.cockpitPosition);
    this.cockpit.scale.set(...this.presentation.cockpitScale);
    this.cockpit.rotation.z = this.presentation.cockpitRoll;

    const leftDust = this.dustAnchors[0];
    const centerDust = this.dustAnchors[1];
    const rightDust = this.dustAnchors[2];
    if (leftDust) leftDust.position.set(-this.presentation.dustSpread, -1.65, 5.3);
    if (centerDust) centerDust.position.set(0, -1.65, this.presentation.cockpitPosition[2]);
    if (rightDust) rightDust.position.set(this.presentation.dustSpread, -1.65, 5.3);
    const leftWake = this.wakeAnchors[0];
    const rightWake = this.wakeAnchors[1];
    if (leftWake) leftWake.position.set(-this.presentation.wakeSpread, -0.8, this.presentation.wakeZ);
    if (rightWake) rightWake.position.set(this.presentation.wakeSpread, -0.8, this.presentation.wakeZ);

    this.applyClassVisibility();
    this.syncPrepassGeometry();
  }

  /**
   * Runtime rival LOD. Simplified rivals retain their articulated engine and
   * cockpit masses. Horizon-scale rivals use one baked cel silhouette, keeping
   * the authored class proportions without dozens of sub-pixel submissions.
   * `full` restores the exact constructor state used by close racing cameras.
   */
  setLodMode(mode: DistantRivalLod): void {
    if (mode === this.lodModeValue) return;
    this.lodModeValue = mode;
    this.applyLodVisibility(mode);
  }

  private applyLodVisibility(mode: DistantRivalLod): void {
    const full = mode === 'full';
    const silhouette = mode === 'silhouette';
    this.pilotAnchor.visible = full && !silhouette;
    this.leftEngine.turbines.visible = full && !silhouette;
    this.rightEngine.turbines.visible = full && !silhouette;
    this.cockpit.visible = !silhouette;
    this.leftEngine.root.visible = !silhouette;
    this.rightEngine.root.visible = !silhouette;
    this.leftEngine.exhaust.visible = !silhouette;
    this.rightEngine.exhaust.visible = !silhouette;
    if (this.silhouetteProxy) this.silhouetteProxy.visible = silhouette;
    this.applyClassVisibility(mode);
    if (this.prepassProxy) {
      this.prepassProxy.visible = true;
      this.syncPrepassGeometry(mode);
    }
  }

  private applyClassVisibility(mode: DistantRivalLod = this.lodModeValue): void {
    const showConnectivity = mode !== 'silhouette';
    for (const vehicleClass of RACER_VEHICLE_CLASSES) {
      const active = vehicleClass === this.vehicleClassValue;
      const module = this.classModules.get(vehicleClass);
      const connectivity = this.connectivityGroups.get(vehicleClass);
      const coupling = this.couplingGroups.get(vehicleClass);
      if (module) module.visible = active;
      if (connectivity) connectivity.visible = active && showConnectivity;
      if (coupling) coupling.visible = active && showConnectivity;
    }
    for (const mesh of this.couplingMeshes) {
      mesh.visible = mesh.userData.vehicleClass === this.vehicleClassValue && showConnectivity;
    }
    for (const mesh of this.chassisDetailMeshes) {
      mesh.visible = mesh.userData.vehicleClass === this.vehicleClassValue && showConnectivity;
    }
  }

  private syncPrepassGeometry(mode: DistantRivalLod = this.lodModeValue): void {
    if (!this.prepassProxy) return;
    const geometries = mode === 'full'
      ? this.fullPrepassGeometries
      : this.reducedPrepassGeometries;
    this.prepassProxy.geometry = geometries.get(this.vehicleClassValue)
      ?? this.prepassProxy.geometry;
    this.prepassProxy.scale.set(1, 1, 1);
    if (this.silhouetteProxy) {
      this.silhouetteProxy.geometry = this.reducedPrepassGeometries.get(this.vehicleClassValue)
        ?? this.silhouetteProxy.geometry;
      this.silhouetteProxy.scale.set(1, 1, 1);
    }
  }

  private belongsToReducedPrepass(object: Mesh): boolean {
    let ancestor = object.parent;
    while (ancestor && ancestor !== this) {
      if (
        ancestor === this.pilotAnchor
        || ancestor === this.leftEngine.turbines
        || ancestor === this.rightEngine.turbines
      ) return false;
      ancestor = ancestor.parent;
    }

    ancestor = object.parent;
    while (ancestor && ancestor !== this) {
      if (
        ancestor === this.cockpit
        || ancestor === this.leftEngine.root
        || ancestor === this.rightEngine.root
      ) return true;
      ancestor = ancestor.parent;
    }
    return false;
  }

  private isVisibleForPrepass(object: Object3D): boolean {
    let current: Object3D | null = object;
    while (current && current !== this) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  /**
   * Builds a single normal/depth proxy for the post-process prepass.
   *
   * The beauty pass still renders every authored cel surface and inverted
   * hull. The proxy only replaces dozens of repeated MRT submissions with one
   * disconnected, transform-baked geometry, so depth discontinuities and
   * face normals remain available to the Sobel pass. Engine vibration and
   * pilot animation are intentionally left to the hull system at their small
   * screen scale; the baked proxy tracks the whole racer transform.
   */
  createCelPrepassProxy(): Mesh {
    if (this.prepassProxy) return this.prepassProxy;

    // Bake one exact full/reduced silhouette for each selectable class. Runtime
    // switching then swaps immutable geometry at identity scale, keeping Sobel
    // depth and normals registered with independently moved beauty-pass parts.
    const requestedLod = this.lodModeValue;
    const requestedClass = this.vehicleClassValue;
    const initiallyExcluded = new Set<Mesh>();
    const sourcesToExclude = new Set<Mesh>();
    this.traverse((object) => {
      if (object instanceof Mesh && object.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] === true) {
        initiallyExcluded.add(object);
      }
    });

    this.lodModeValue = 'full';
    this.applyLodVisibility('full');
    let failedClass: RacerVehicleClass | null = null;
    for (const vehicleClass of RACER_VEHICLE_CLASSES) {
      this.setVehicleClass(vehicleClass);
      this.applyClassVisibility('full');
      this.updateMatrixWorld(true);
      const rootInverse = new Matrix4().copy(this.matrixWorld).invert();
      const relativeTransform = new Matrix4();
      const bakedGeometries: BufferGeometry[] = [];
      const reducedGeometries: BufferGeometry[] = [];

      this.traverse((object) => {
        if (!(object instanceof Mesh) || !this.isVisibleForPrepass(object)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (materials.some((material) => (
          material.transparent
          || !material.depthWrite
          || material.visible === false
        ))) return;
        if (initiallyExcluded.has(object)) return;

        object.updateWorldMatrix(true, false);
        relativeTransform.multiplyMatrices(rootInverse, object.matrixWorld);
        const geometry = object.geometry.index
          ? object.geometry.toNonIndexed()
          : object.geometry.clone();
        for (const attribute of Object.keys(geometry.attributes)) {
          if (attribute !== 'position' && attribute !== 'normal') {
            geometry.deleteAttribute(attribute);
          }
        }
        geometry.applyMatrix4(relativeTransform);
        bakedGeometries.push(geometry);
        if (this.belongsToReducedPrepass(object)) reducedGeometries.push(geometry.clone());
        sourcesToExclude.add(object);
      });

      const mergedGeometry = mergeGeometries(bakedGeometries, false);
      const reducedGeometry = mergeGeometries(reducedGeometries, false);
      for (const geometry of bakedGeometries) geometry.dispose();
      for (const geometry of reducedGeometries) geometry.dispose();
      if (!mergedGeometry || !reducedGeometry) {
        mergedGeometry?.dispose();
        reducedGeometry?.dispose();
        failedClass = vehicleClass;
        break;
      }
      mergedGeometry.computeBoundingSphere();
      reducedGeometry.computeBoundingSphere();
      this.fullPrepassGeometries.set(vehicleClass, mergedGeometry);
      this.reducedPrepassGeometries.set(vehicleClass, reducedGeometry);
    }

    this.setVehicleClass(requestedClass);
    this.lodModeValue = requestedLod;
    this.applyLodVisibility(requestedLod);
    if (failedClass) {
      for (const geometry of this.fullPrepassGeometries.values()) geometry.dispose();
      for (const geometry of this.reducedPrepassGeometries.values()) geometry.dispose();
      this.fullPrepassGeometries.clear();
      this.reducedPrepassGeometries.clear();
      throw new Error(`Unable to build ${failedClass} cel prepass proxy for ${this.name}.`);
    }
    for (const source of sourcesToExclude) {
      source.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    }

    const initialGeometry = this.fullPrepassGeometries.get(requestedClass);
    if (!initialGeometry) throw new Error(`Missing ${requestedClass} cel prepass proxy for ${this.name}.`);

    // A material that is skipped by the beauty renderer. GameApp temporarily
    // swaps in its shared CelPrepassMaterial for the dedicated MRT draw.
    const hiddenBeautyMaterial = new MeshBasicMaterial({ visible: false });
    const proxy = new Mesh(initialGeometry, hiddenBeautyMaterial);
    proxy.name = `${this.name}-cel-prepass-proxy`;
    proxy.castShadow = false;
    proxy.receiveShadow = false;
    this.prepassProxy = proxy;
    this.add(proxy);

    const initialSilhouetteGeometry = this.reducedPrepassGeometries.get(requestedClass);
    if (!initialSilhouetteGeometry) {
      throw new Error(`Missing ${requestedClass} distant silhouette geometry for ${this.name}.`);
    }
    const silhouetteProxy = new Mesh(initialSilhouetteGeometry, this.silhouetteMaterial);
    silhouetteProxy.name = `${this.name}-distant-cel-silhouette`;
    silhouetteProxy.castShadow = false;
    silhouetteProxy.receiveShadow = false;
    silhouetteProxy.visible = false;
    // The separately registered merged MRT proxy supplies this exact shape to
    // the Sobel pass, so the beauty proxy must not be submitted there again.
    silhouetteProxy.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] = true;
    this.silhouetteProxy = silhouetteProxy;
    this.add(silhouetteProxy);
    this.applyLodVisibility(requestedLod);
    return proxy;
  }

  update(pose: PodracerPose, time: number): void {
    this.position.set(pose.x, pose.y, pose.z);
    this.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');
    const speedT = MathUtils.clamp(pose.speed / 230, 0, 1);
    const power = MathUtils.clamp(pose.throttle * 0.65 + speedT * 0.35 + pose.boost * 0.55, 0, 1.35);
    const redline = MathUtils.clamp((pose.redline ?? 0) - 0.65, 0, 0.55) / 0.55;
    const redlinePulse = redline * (0.82 + Math.sin(time * 18 + this.racerIndex) * 0.18);
    const wrecked = pose.wrecked === true;
    const wreckOscillation = wrecked ? Math.sin(time * 6.2 + this.racerIndex) : 0;

    const vibration = this.presentation.vibration;
    const leftJitter = Math.sin(time * (31 + this.racerIndex * 1.7))
      * (0.035 + power * 0.07) * vibration;
    const rightJitter = Math.sin(time * (33.7 + this.racerIndex * 1.3) + 1.9)
      * (0.035 + power * 0.07) * vibration;
    const verticalTorque = this.vehicleClass === 'speeder-bike' ? 0.18 : 0.13;
    this.leftEngine.root.position.set(
      -this.presentation.engineSpread - (wrecked ? 0.45 : 0),
      this.presentation.engineRestY + leftJitter + pose.steer * verticalTorque
        + (wrecked ? 0.35 : 0),
      7.2 + (wrecked ? 0.6 : 0),
    );
    this.rightEngine.root.position.set(
      this.presentation.engineSpread + (wrecked ? 1.65 : 0),
      this.presentation.engineRestY + rightJitter - pose.steer * verticalTorque
        + (wrecked ? 0.85 + wreckOscillation * 0.25 : 0),
      7.2 - (wrecked ? 2.1 : 0),
    );
    this.leftEngine.root.rotation.x = wrecked ? -0.12 : 0;
    this.leftEngine.root.rotation.y = wrecked ? 0.08 : 0;
    this.rightEngine.root.rotation.x = wrecked ? 0.38 + wreckOscillation * 0.08 : 0;
    this.rightEngine.root.rotation.y = wrecked ? -0.32 : 0;
    this.leftEngine.root.rotation.z = this.presentation.leftEngineRoll
      - pose.steer * this.presentation.steerRoll + leftJitter * 0.2;
    this.rightEngine.root.rotation.z = this.presentation.rightEngineRoll
      - pose.steer * this.presentation.steerRoll + rightJitter * 0.2
      + (wrecked ? -0.24 : 0);
    const activeCoupling = this.couplingGroups.get(this.vehicleClassValue);
    if (activeCoupling) {
      activeCoupling.position.set(0, wrecked ? 0.4 + wreckOscillation * 0.18 : 0, wrecked ? -0.55 : 0);
      activeCoupling.rotation.z = wrecked ? 0.22 + wreckOscillation * 0.05 : 0;
      activeCoupling.scale.set(wrecked ? 1.12 : 1, wrecked ? 0.68 : 1, 1);
    }
    // Skim craft exaggerate bank visually without altering the authoritative
    // world pose; the pilot and broad wing remain one coherent mass.
    this.cockpit.rotation.z = this.presentation.cockpitRoll
      - (this.vehicleClass === 'skim-speeder' ? pose.steer * 0.12 : 0);
    this.leftEngine.turbines.rotation.z = time * (5 + power * 20);
    this.rightEngine.turbines.rotation.z = -time * (5.4 + power * 21);

    for (const exhaust of [this.leftEngine.exhaust, this.rightEngine.exhaust]) {
      exhaust.material.uniforms.uTime!.value = time;
      exhaust.material.uniforms.uPower!.value = power + redlinePulse * 0.45;
      exhaust.material.uniforms.uHot!.value.set(redline > 0 ? '#ffc19a' : '#b9eaff');
      exhaust.scale.x = 1 + redlinePulse * 0.42;
      exhaust.scale.z = 1 + redlinePulse * 0.42;
      exhaust.scale.y = 0.21 + power * 0.20 + Math.sin(time * 17 + this.racerIndex) * 0.008;
    }
    this.couplingMaterial.uniforms.uTime!.value = time;
    this.couplingMaterial.uniforms.uPower!.value = power + redlinePulse * 0.5;
    this.couplingMaterial.uniforms.uColor!.value.set(redline > 0 ? '#ff4325' : '#75f4ff');
  }

  dispose(): void {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    this.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of objectMaterials) materials.add(material);
    });
    for (const geometry of this.fullPrepassGeometries.values()) geometries.add(geometry);
    for (const geometry of this.reducedPrepassGeometries.values()) geometries.add(geometry);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    if (this.ownedMaterials) {
      for (const material of Object.values(this.ownedMaterials)) material.dispose();
    }
  }
}

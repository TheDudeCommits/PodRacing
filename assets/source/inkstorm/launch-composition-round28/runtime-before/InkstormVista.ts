import {
  BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute,
  Matrix4, Mesh, Quaternion, SphereGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PodraceCourse } from '../../game/race/course';
import type { CourseSample } from '../../game/race/types';
import { getLaunchBasinAnchor } from '../../game/race/CourseGulfField';
import { LAUNCH_INDUSTRIAL_BENCHES, LAUNCH_INDUSTRIAL_CENTER, LAUNCH_RIDGES } from '../../game/race/LaunchBasinPlan';
import { CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY } from '../post/CelPrepassMaterial';
import { InkstormSurfaceMaterial } from './InkstormSurfaceMaterial';
import { groundInkstormButtress } from './InkstormRockGrounding';

type HeightAt = (x: number, z: number) => number;
interface Point2 { x: number; z: number }
interface CorridorPoint extends Point2 { width: number }
interface CorridorSegment { a: CorridorPoint; b: CorridorPoint }
export interface VistaFootprint extends Point2 { id: string; radius: number }
export interface VistaSign extends VistaFootprint {
  y: number;
  yaw: number;
  /** Screen-space arrow angle relative to straight ahead; positive points right. */
  direction: number;
  approach: Point2;
  target: Point2;
  routeId: string;
}
interface VistaBarrier extends VistaFootprint {
  y: number;
  bottom: number;
  outwardX: number;
  outwardZ: number;
  yaw: number;
  progress: number;
  /** Signed camera-screen direction of the real tangent 55 metres ahead. */
  direction: number;
  sign: boolean;
}
interface VistaFinishMarker extends VistaFootprint {
  y: number;
  bottom: number;
  yaw: number;
  side: number;
  height: number;
  progress: number;
}
interface VistaBeacon extends VistaFootprint { y: number }
export interface VistaLandform extends VistaFootprint {
  family: 'canyon-buttress' | 'fractured-spire';
  yaw: number;
  sx: number;
  sy: number;
  sz: number;
  /** Geometric depth from the launch reveal, independent of the camera. */
  forward: number;
  settlement: boolean;
  ridgeId?: string;
  /** Sparse basin shoulder forms, separate from the small ridge-top accents. */
  depthLayer?: 'near' | 'middle' | 'far';
}
export interface VistaIndustrialTerrace extends VistaFootprint {
  y: number;
  bottom: number;
  yaw: number;
  width: number;
  depth: number;
}
export interface InkstormVistaPlan {
  citadel: (VistaFootprint & { y: number; bottom: number; yaw: number; launch: CourseSample }) | null;
  landforms: readonly VistaLandform[];
  terraces: readonly VistaIndustrialTerrace[];
  barriers: readonly VistaBarrier[];
  finishMarkers: readonly VistaFinishMarker[];
  signs: readonly VistaSign[];
  beacons: readonly VistaBeacon[];
}

const UP = new Vector3(0, 1, 0);
const CLEARANCE = 10; // Eight metres requested, plus two metres for curve sampling error.
const CITADEL_RADIUS = 330;
const PALETTE = {
  iron: '#303342', blue: '#426070', rust: '#ac5135', ochre: '#ce8b48',
  bone: '#ded0ae', violet: '#574452', teal: '#53b8b7', shadow: '#292333',
};

function distanceToSegment(point: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point.x - a.x - dx * t, point.z - a.z - dz * t);
}

function corridorSegments(course: PodraceCourse): CorridorSegment[] {
  const render = course.getRenderData(2048);
  const segments: CorridorSegment[] = [];
  for (let i = 0; i < render.points.length; i++) {
    segments.push({ a: render.points[i]!, b: render.points[(i + 1) % render.points.length]! });
  }
  for (const branch of render.branches ?? []) {
    for (let i = 1; i < branch.points.length; i++) segments.push({ a: branch.points[i - 1]!, b: branch.points[i]! });
  }
  return segments;
}

function isClear(footprint: VistaFootprint, segments: readonly CorridorSegment[], clearance = CLEARANCE): boolean {
  return segments.every(({ a, b }) => distanceToSegment(footprint, a, b)
    >= Math.max(a.width, b.width) + footprint.radius + clearance);
}

// Five full-volume scans occupy unequal depth planes. Their original XYZ
// proportions are uniformly scaled; grounding may only add a bounded buried
// toe. Existing shared high/LOD batches cost at most 140,000 / 21,000 added
// triangles, with no new material, texture, draw family or per-frame allocation.
const LAUNCH_SHOULDER_FORMS = [
  { id: 'near-west-toe', forward: 225, right: -190, scale: .72, yaw: -.42, depthLayer: 'near' },
  { id: 'west-valley-shelf', forward: 445, right: -430, scale: 1.1, yaw: .86, depthLayer: 'middle' },
  { id: 'east-basin-notch', forward: 430, right: 245, scale: 1.1, yaw: -.94, depthLayer: 'middle' },
  { id: 'west-inner-shoulder', forward: 735, right: -260, scale: 1.15, yaw: .34, depthLayer: 'middle' },
  { id: 'refinery-back-crown', forward: 1160, right: 405, scale: .8, yaw: 1.16, depthLayer: 'far' },
] as const;
const LAUNCH_SHOULDER_CLEARANCE = 9.6 + 7 + 2;

function screenArrowAngle(forwardX: number, forwardZ: number, targetX: number, targetZ: number): number {
  // A Three camera looks down local -Z. With world up +Y, its right axis is
  // forward × up = (-forwardZ, 0, forwardX), opposite course.rightX/rightZ.
  return Math.atan2(-targetX * forwardZ + targetZ * forwardX, targetX * forwardX + targetZ * forwardZ);
}

/** View-only landmarks. Every accepted enclosing disk clears every ground and elevated route in plan. */
export function getInkstormVistaPlan(course: PodraceCourse, heightAt: HeightAt): InkstormVistaPlan {
  const segments = corridorSegments(course);
  const samples = course.getRenderData(256).points;
  const launchPoints = samples.filter(point => point.tag === 'launch-crest');
  const basinAnchor = getLaunchBasinAnchor(course);
  const citadelRadius = basinAnchor ? LAUNCH_INDUSTRIAL_CENTER.radius : CITADEL_RADIUS;
  let citadel: InkstormVistaPlan['citadel'] = null;
  if (launchPoints.length) {
    const launch = basinAnchor ?? course.sampleAtProgress(launchPoints[Math.floor((launchPoints.length - 1) * .4)]!.progress);
    // The flagship district uses the same physical benches as the signed
    // landscape. Other courses retain their clearance-checked distant site.
    const furthest = Math.max(...segments.flatMap(({ a, b }) => [a, b]).map(point =>
      (point.x - launch.x) * launch.tangentX + (point.z - launch.z) * launch.tangentZ));
    const distance = basinAnchor ? LAUNCH_INDUSTRIAL_CENTER.forward : Math.max(1200, furthest + citadelRadius + 130);
    // Negative course-right is camera-screen right. Keep the destination at the
    // right third, leaving the center of the real basin reveal open.
    for (const lateral of basinAnchor ? [-LAUNCH_INDUSTRIAL_CENTER.right] : [-380, -420, -330, -500]) {
      const x = launch.x + launch.tangentX * distance + launch.rightX * lateral;
      const z = launch.z + launch.tangentZ * distance + launch.rightZ * lateral;
      const footprint = { id: 'launch-citadel', x, z, radius: citadelRadius };
      if (!isClear(footprint, segments)) continue;
      let bottom = heightAt(x, z) - 14, highest = heightAt(x, z);
      for (let ring = 0; ring <= 4; ring++) for (let spoke = 0; spoke < 20; spoke++) {
        const angle = spoke / 20 * Math.PI * 2, r = citadelRadius * ring / 4;
        const ground = heightAt(x + Math.cos(angle) * r, z + Math.sin(angle) * r);
        bottom = Math.min(bottom, ground - 14); highest = Math.max(highest, ground);
      }
      // The skyline rises from the real ridge; its tanks provide height.
      // Raising the entire deck above launch forced every factory onto stilts.
      const y = highest + 7;
      citadel = { ...footprint, y, bottom, yaw: Math.atan2(launch.tangentX, launch.tangentZ), launch };
      break;
    }
  }

  const landforms: VistaLandform[] = [];
  const terraces: VistaIndustrialTerrace[] = [];
  if (basinAnchor) {
    for (const form of LAUNCH_SHOULDER_FORMS) {
      const { forward, right, scale: size } = form;
      const x = basinAnchor.x + basinAnchor.tangentX * forward - basinAnchor.rightX * right;
      const z = basinAnchor.z + basinAnchor.tangentZ * forward - basinAnchor.rightZ * right;
      // The live scan and its LOD share exact [-40,40] x [-50,50] bounds.
      // This enclosing disk contains every yaw-transformed source vertex.
      const radius = Math.hypot(40 * size, 50 * size);
      const footprint = { id: `launch-depth-${form.id}`, x, z, radius };
      if (!isClear(footprint, segments, LAUNCH_SHOULDER_CLEARANCE)) continue;
      if (LAUNCH_INDUSTRIAL_BENCHES.some(bench => Math.hypot(
        Math.max(0, Math.abs(forward - bench.forward) - bench.halfForward - 8),
        Math.max(0, Math.abs(right - bench.right) - bench.halfRight - 8),
      ) <= radius)) continue;
      // Leave the same 24-degree central basin view open. These are separate
      // shoulders and a rock behind the refinery, never another valley wall.
      if (Math.abs(right) - radius < Math.tan(Math.PI / 15) * (forward + radius)) continue;
      const placement = { ...footprint, sx: size, sy: size, sz: size,
        yaw: Math.atan2(basinAnchor.tangentX, basinAnchor.tangentZ) + form.yaw };
      const grounded = groundInkstormButtress(placement, heightAt);
      // Reject a steep site rather than stretching the scan into a thin face.
      if (grounded.scaleY / size > 1.75) continue;
      landforms.push({ ...placement, forward, family: 'canyon-buttress',
        settlement: false, depthLayer: form.depthLayer });
    }
    for (const ridge of LAUNCH_RIDGES) {
      const near = ridge.id === 'near-west-rim';
      // The signed terrain now carries the continuous mountain silhouette.
      // Scans are occasional ledges on its shoulders, not a second wall laid
      // across the valley. Unequal gaps leave the actual landscape visible.
      const accentIndices = near ? [0, 2, 4] : ridge.side === 1 ? [0, 2, 5] : [0, 2, 4];
      for (const i of accentIndices) {
        const station = ridge.stations[i]!;
        const previous = ridge.stations[Math.max(0, i - 1)]!, next = ridge.stations[Math.min(ridge.stations.length - 1, i + 1)]!;
        const df = next.forward - previous.forward, dr = next.right - previous.right;
        const dx = basinAnchor.tangentX * df - basinAnchor.rightX * dr;
        const dz = basinAnchor.tangentZ * df - basinAnchor.rightZ * dr;
        const yaw = Math.atan2(dx, dz) + .075 * Math.sin(i * 2.3);
        const sx = station.width * (near ? .22 : .16) / 40;
        const sz = near ? .92 : i === 0 ? .76 : i === 2 ? 1.03 : .86;
        const radius = Math.hypot(40 * sx, 50 * sz);
        // Place these into the upper shoulder. A narrow source footprint and a
        // crown only 12–24m above its own centre avoid towering stretched slabs.
        const right = station.right - ridge.side * station.width * (near ? .33 : .25);
        for (const setback of [0, 30, 65, 105, 150, 200]) {
          const r = right + ridge.side * setback;
          const x = basinAnchor.x + basinAnchor.tangentX * station.forward - basinAnchor.rightX * r;
          const z = basinAnchor.z + basinAnchor.tangentZ * station.forward - basinAnchor.rightZ * r;
          const footprint = { id: `launch-ridge-${ridge.id}-${i}`, x, z, radius };
          if (!isClear(footprint, segments)) continue;
          // Keep scans out of the founded yards as well as the racing corridor.
          // The enclosing disk includes every rotated source corner, so this
          // rectangle-distance test also protects pipes and retaining edges.
          if (LAUNCH_INDUSTRIAL_BENCHES.some(bench => Math.hypot(
            Math.max(0, Math.abs(station.forward - bench.forward) - bench.halfForward - 8),
            Math.max(0, Math.abs(r - bench.right) - bench.halfRight - 8),
          ) <= radius)) continue;
          // Protect a 24-degree panorama from the real launch anchor. This is
          // a geometric visual guard, independent of the unchanged drive lanes.
          if (!near && Math.abs(r) - radius < Math.tan(Math.PI / 15) * (station.forward + radius)) continue;
          const relief = near ? 24 - i * 2 : 12 + (i % 3) * 3;
          landforms.push({ ...footprint, forward: station.forward, sx,
            sy: (relief + 1.5) / 120, sz, yaw,
            family: 'canyon-buttress', settlement: false, ridgeId: ridge.id });
          break;
        }
      }
    }
  }
  if (citadel) {
    const anchor = basinAnchor ?? citadel.launch;
    const forwardCenter = (citadel.x - anchor.x) * anchor.tangentX + (citadel.z - anchor.z) * anchor.tangentZ;
    const rightCenter = -(citadel.x - anchor.x) * anchor.rightX - (citadel.z - anchor.z) * anchor.rightZ;
    for (const bench of LAUNCH_INDUSTRIAL_BENCHES) {
      const f = forwardCenter + bench.forward - LAUNCH_INDUSTRIAL_CENTER.forward, r = rightCenter + bench.right - LAUNCH_INDUSTRIAL_CENTER.right;
      const x = anchor.x + anchor.tangentX * f - anchor.rightX * r;
      const z = anchor.z + anchor.tangentZ * f - anchor.rightZ * r;
      const width = bench.halfRight * 2, depth = bench.halfForward * 2;
      const footprint = { id: bench.id, x, z, radius: Math.hypot(width / 2, depth / 2) + 8 };
      if (!isClear(footprint, segments)) continue;
      let low = Infinity, high = -Infinity;
      const cos = Math.cos(citadel.yaw), sin = Math.sin(citadel.yaw);
      for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) {
        const px = col * width / 4, pz = row * depth / 4;
        const y = heightAt(x + cos * px + sin * pz, z - sin * px + cos * pz);
        low = Math.min(low, y); high = Math.max(high, y);
      }
      terraces.push({ ...footprint, y: high + 6, bottom: low - 9, yaw: citadel.yaw, width, depth });
    }
  }

  const barriers: VistaBarrier[] = [];
  const hairpins = course.getRenderData(1024).points.filter(point => point.tag === 'hairpin');
  let lastDistance = -Infinity;
  for (const point of hairpins) {
    const sample = course.sampleAtProgress(point.progress);
    if (sample.distance - lastDistance < 14 || Math.abs(sample.curvature) < .0005) continue;
    lastDistance = sample.distance;
    const turn = Math.sign(sample.curvature);
    const lateral = -turn * (sample.width + 27);
    const x = sample.x + sample.rightX * lateral, z = sample.z + sample.rightZ * lateral;
    const footprint = { id: `finish-barrier-${barriers.length}`, x, z, radius: 13 };
    if (!isClear(footprint, segments)) continue;
    const ahead = course.sampleAtDistance(sample.distance + 55);
    const direction = screenArrowAngle(sample.tangentX, sample.tangentZ, ahead.tangentX, ahead.tangentZ);
    const outwardX = -turn * sample.rightX, outwardZ = -turn * sample.rightZ;
    // Anchor the coping to the protected shoulder, while the retaining toe is
    // founded below the actual steepened outer terrain. No lane is raised.
    const y = heightAt(x - outwardX * 10, z - outwardZ * 10);
    let bottom = Math.min(y, heightAt(x, z));
    for (const offset of [-4, 0, 4, 10]) bottom = Math.min(bottom, heightAt(x + outwardX * offset, z + outwardZ * offset));
    barriers.push({ ...footprint, y, bottom: bottom - 8, outwardX, outwardZ,
      yaw: Math.atan2(sample.tangentX, sample.tangentZ), progress: sample.progress, direction, sign: barriers.length % 5 === 0 });
    if (barriers.length >= 88) break;
  }

  // A paired signal landmark sits along the real continuation after the tight
  // core of the final bend. Its two founded structures remain outside all lanes;
  // there is no floating gantry drawn over an invented route.
  const finishMarkers: VistaFinishMarker[] = [];
  if (hairpins.length) {
    const focus = course.sampleAtProgress(hairpins[Math.floor(hairpins.length * .35)]!.progress);
    let apex = focus;
    for (let distance = focus.distance; distance <= focus.distance + 260; distance += 10) {
      const p = course.sampleAtDistance(distance);
      if (Math.sign(p.curvature) === Math.sign(focus.curvature) && Math.abs(p.curvature) > Math.abs(apex.curvature)) apex = p;
    }
    const exit = course.sampleAtDistance(apex.distance + 70);
    for (const side of [-1, 1]) {
      for (const setback of [47, 59, 73]) {
        const x = exit.x + exit.rightX * side * (exit.width + setback);
        const z = exit.z + exit.rightZ * side * (exit.width + setback);
        const footprint = { id: `finish-continuation-${side}`, x, z, radius: 23 };
        if (!isClear(footprint, segments)) continue;
        let y = heightAt(x, z), bottom = y;
        for (const dx of [-12, 0, 12]) for (const dz of [-12, 0, 12]) {
          const ground = heightAt(x + dx, z + dz); y = Math.max(y, ground); bottom = Math.min(bottom, ground);
        }
        finishMarkers.push({ ...footprint, y: y + 2, bottom: bottom - 10, yaw: Math.atan2(exit.tangentX, exit.tangentZ),
          side, height: side === -Math.sign(focus.curvature) ? 78 : 57, progress: exit.progress });
        break;
      }
    }
  }

  const signs: VistaSign[] = [], beacons: VistaBeacon[] = [];
  for (const branch of course.branches) {
    const target = branch.points[Math.min(branch.points.length - 1, Math.max(1, Math.floor(branch.points.length * .24)))];
    if (!target) continue;
    const canonical = course.sampleAtProgress(branch.entryProgress + 115 / course.totalLength);
    const entry = course.sampleAtProgress(branch.entryProgress);
    const branchSide = Math.sign((target.x - entry.x) * entry.rightX + (target.z - entry.z) * entry.rightZ) || 1;
    for (const [side, routeId, destination] of [[-branchSide, 'canonical', canonical], [branchSide, branch.id, target]] as const) {
      for (const setback of [44, 68, 94]) {
        const approach = course.sampleAtProgress(branch.entryProgress - setback / course.totalLength);
        const x = approach.x + approach.rightX * side * (approach.width + 24);
        const z = approach.z + approach.rightZ * side * (approach.width + 24);
        const footprint = { id: `fork-sign-${branch.id}-${routeId}`, x, z, radius: 9 };
        if (!isClear(footprint, segments)) continue;
        const dx = destination.x - approach.x, dz = destination.z - approach.z;
        const direction = screenArrowAngle(approach.tangentX, approach.tangentZ, dx, dz);
        signs.push({ ...footprint, y: heightAt(x, z), yaw: Math.atan2(approach.tangentX, approach.tangentZ), direction, approach: { x: approach.x, z: approach.z }, target: { x: destination.x, z: destination.z }, routeId });
        break;
      }
    }
    // Cyan posts mark only actual branch edges; they do not imply another road.
    for (let i = 2; i < Math.min(branch.points.length - 1, 12); i += 2) {
      const point = branch.points[i]!, next = branch.points[i + 1]!;
      const dx = next.x - point.x, dz = next.z - point.z, length = Math.hypot(dx, dz) || 1;
      for (const side of [-1, 1]) {
        const x = point.x + dz / length * side * (point.width + 14);
        const z = point.z - dx / length * side * (point.width + 14);
        const footprint = { id: `fork-beacon-${branch.id}-${i}-${side}`, x, z, radius: 2.5 };
        if (isClear(footprint, segments)) beacons.push({ ...footprint, y: heightAt(x, z) });
      }
    }
  }
  return { citadel, landforms, terraces, barriers, finishMarkers, signs, beacons };
}

/** One colour attribute and one material per batch; temporary primitives never survive assembly. */
class VistaBatch {
  private readonly parts: BufferGeometry[] = [];
  constructor(private readonly transform = new Matrix4()) {}
  add(source: BufferGeometry, color: string, x: number, y: number, z: number, yaw = 0, tilt = 0): void {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.deleteAttribute('uv');
    const rotation = new Quaternion().setFromAxisAngle(UP, yaw);
    if (tilt) rotation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), tilt));
    geometry.applyMatrix4(new Matrix4().compose(new Vector3(x, y, z), rotation, new Vector3(1, 1, 1)));
    geometry.applyMatrix4(this.transform);
    const count = geometry.getAttribute('position').count, tint = new Color(color), colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) tint.toArray(colors, i * 3);
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.clearGroups(); this.parts.push(geometry);
  }
  box(color: string, x: number, y: number, z: number, width: number, height: number, depth: number, yaw = 0, tilt = 0): void {
    this.add(new BoxGeometry(width, height, depth), color, x, y, z, yaw, tilt);
  }
  cylinder(color: string, x: number, y: number, z: number, top: number, bottom: number, height: number, segments = 12): void {
    this.add(new CylinderGeometry(top, bottom, height, segments), color, x, y, z);
  }
  finish(name: string): Mesh | null {
    if (!this.parts.length) return null;
    const geometry = mergeGeometries(this.parts, false);
    for (const part of this.parts) part.dispose();
    this.parts.length = 0;
    if (!geometry) throw new Error(`Could not merge ${name}`);
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, new InkstormSurfaceMaterial(false));
    mesh.name = name; mesh.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY] = true;
    return mesh;
  }
}

function localTransform(x: number, y: number, z: number, yaw: number): Matrix4 {
  return new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(UP, yaw), new Vector3(1, 1, 1));
}

function createCitadel(plan: NonNullable<InkstormVistaPlan['citadel']>, terraces: readonly VistaIndustrialTerrace[], heightAt: HeightAt): Mesh {
  const transform = localTransform(plan.x, plan.y, plan.z, plan.yaw);
  const inverse = transform.clone().invert();
  const batch = new VistaBatch(transform);
  const localTerraces = terraces.map(terrace => ({ ...terrace,
    center: new Vector3(terrace.x, terrace.y, terrace.z).applyMatrix4(inverse),
    base: terrace.bottom - plan.y,
  }));
  const beam = (a: Vector3, b: Vector3, width: number, color: string): void => {
    const delta = b.clone().sub(a), length = delta.length(), center = a.clone().add(b).multiplyScalar(.5);
    const geometry = new CylinderGeometry(width, width, length, 8);
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, delta.divideScalar(length)));
    batch.add(geometry, color, center.x, center.y, center.z);
  };
  const walkway = (x: number, y: number, z: number, width: number, depth: number): void => {
    batch.box(PALETTE.iron, x, y, z, width, 2.1, depth);
    for (const side of [-1, 1]) {
      batch.box(PALETTE.bone, x, y + 5, z + side * depth / 2, width, .7, .7);
      for (let post = -width / 2 + 1; post < width / 2; post += 12) {
        batch.box(PALETTE.iron, x + post, y + 2.5, z + side * depth / 2, .7, 5, .7);
      }
    }
  };
  const tank = (x: number, y: number, z: number, radius: number, height: number, tint = PALETTE.blue): void => {
    batch.cylinder(PALETTE.shadow, x, y + 3, z, radius + 4, radius + 5, 6, 16);
    batch.cylinder(tint, x, y + height / 2 + 6, z, radius, radius * 1.035, height, 20);
    // Low unequal pressure domes read as a process district, rather than three
    // identical gigantic silo toys. Riveted bands and risers carry the scale.
    const dome = new SphereGeometry(radius, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    dome.scale(1, .58, 1);
    batch.add(dome, PALETTE.ochre, x, y + height + 6, z);
    for (const ring of [8, height * .49 + 6, height + 5]) {
      batch.cylinder(PALETTE.iron, x, y + ring, z, radius + .9, radius + .9, 1.5, 20);
    }
    // A few partial panels leave intentional broad painted areas. No uniform
    // floor-to-roof white stripes across the whole vessel.
    batch.add(new CylinderGeometry(radius + .18, radius * 1.035 + .18, height * .34, 6, 1, true, 2.9, .8),
      PALETTE.rust, x, y + height * .59, z);
    const riserX = x + radius + 3;
    beam(new Vector3(riserX, y + 4, z), new Vector3(riserX, y + height + 10, z), 1.4, PALETTE.rust);
    for (let level = 10; level < height; level += 13) batch.cylinder(PALETTE.iron, riserX, y + level, z, 2.2, 2.2, 1.2, 8);
    for (const side of [-1, 1]) beam(new Vector3(x + side * 2.6, y + 4, z - radius - 2),
      new Vector3(x + side * 2.6, y + height + 8, z - radius - 2), .55, PALETTE.iron);
    for (let rung = 7; rung < height + 8; rung += 4) beam(new Vector3(x - 2.6, y + rung, z - radius - 2),
      new Vector3(x + 2.6, y + rung, z - radius - 2), .45, PALETTE.bone);
    batch.cylinder(PALETTE.iron, x, y + height + radius * .58 + 7, z, radius * .26, radius * .26, 2, 12);
    batch.cylinder(PALETTE.rust, x, y + height + radius * .58 + 10, z, 2.1, 2.1, 6, 8);
  };
  for (const [index, terrace] of localTerraces.entries()) {
    const { x, y, z } = terrace.center, width = terrace.width, depth = terrace.depth;
    const foundationHeight = y - terrace.base;
    // A complete solid footing reaches below the entire sampled terrain
    // footprint. Only its short retaining face remains above the ridge bench.
    batch.box(PALETTE.violet, x, terrace.base + foundationHeight / 2, z, width, foundationHeight, depth);
    batch.box(PALETTE.iron, x, y + 1.5, z, width + 4, 3, depth + 4);
    for (const side of [-1, 1]) {
      batch.box(PALETTE.rust, x, y - 2, z + side * (depth / 2 - 2), width + 3, 5, 6);
      batch.box(PALETTE.bone, x, y + 8, z + side * depth / 2, width, 1.6, 1.6);
      for (let offset = -width / 2 + 8; offset <= width / 2 - 6; offset += 22) {
        batch.box(PALETTE.iron, x + offset, y + 5, z + side * depth / 2, 1.5, 7, 1.5);
        batch.box(PALETTE.rust, x + offset, y - Math.min(12, foundationHeight / 2), z + side * (depth / 2 + 1), 5, Math.min(24, foundationHeight), 5);
      }
    }
    if (index === 0) {
      tank(x + 34, y + 3, z + 9, 20, 31, PALETTE.violet);
      batch.box(PALETTE.blue, x - 30, y + 15, z + 10, 52, 27, 47);
      batch.box(PALETTE.rust, x - 28, y + 31, z + 7, 59, 5, 53);
      for (let bay = 0; bay < 3; bay++) {
        batch.box(PALETTE.shadow, x - 49 + bay * 19, y + 12, z - 14, 14, 18, 1.8);
        batch.box(PALETTE.bone, x - 49 + bay * 19, y + 24, z - 16, 16, 2, 4);
      }
      for (let crate = 0; crate < 7; crate++) batch.box(crate % 2 ? PALETTE.ochre : PALETTE.blue,
        x - 53 + crate * 15, y + 6 + crate % 2 * 3, z - 37, 10, 9 + crate % 2 * 6, 10);
      // Layer the loading frontage with a shallow awning and actual braces.
      batch.box(PALETTE.ochre, x - 30, y + 25, z - 24, 60, 1.7, 18);
      for (const dx of [-55, -29, -5]) {
        beam(new Vector3(x + dx, y + 4, z - 32), new Vector3(x + dx, y + 25, z - 32), .85, PALETTE.iron);
        beam(new Vector3(x + dx, y + 16, z - 32), new Vector3(x + dx, y + 24, z - 24), .6, PALETTE.rust);
      }
      for (const dx of [-40, -20]) {
        batch.box(PALETTE.iron, x + dx, y + 37, z + 18, 12, 8, 14);
        batch.cylinder(PALETTE.bone, x + dx, y + 42, z + 18, 4, 4, 2, 12);
      }
      beam(new Vector3(x + 34, y + 15, z - 14), new Vector3(x - 4, y + 15, z - 14), 2, PALETTE.rust);
    } else if (index === 1) {
      tank(x - 25, y + 3, z + 17, 25, 47);
      // An open process rack separates machinery from the much taller stack.
      // Its empty spaces, diagonal members and staggered platforms are visible
      // through the silhouette from the launch, unlike the former solid block.
      for (const dx of [18, 53]) for (const dz of [-10, 42]) {
        beam(new Vector3(x + dx, y + 3, z + dz), new Vector3(x + dx, y + 83, z + dz), 1.25, PALETTE.iron);
      }
      for (const h of [22, 49, 77]) {
        walkway(x + 35.5, y + h, z + 16, 43, 58);
        beam(new Vector3(x + 18, y + h - 19, z - 10), new Vector3(x + 53, y + h, z - 10), .8, PALETTE.rust);
      }
      for (const [dx, radius, h] of [[29, 5, 54], [45, 4, 66]] as const) {
        batch.cylinder(PALETTE.rust, x + dx, y + h / 2 + 9, z + 19, radius, radius, h, 12);
        for (const offset of [12, 34, 52]) if (offset < h) batch.cylinder(PALETTE.iron,
          x + dx, y + offset + 9, z + 19, radius + 1.1, radius + 1.1, 2, 12);
      }
      for (const h of [20, 43]) beam(new Vector3(x - 11, y + h, z - 14), new Vector3(x + 47, y + h, z - 14), 1.7, PALETTE.rust);
      // The crane is a light laced jib beside the process rack. A huge solid
      // picture-frame gantry no longer encloses the whole refinery skyline.
      const mast = new Vector3(x - 53, y, z - 39);
      for (const dz of [-2, 2]) beam(mast.clone().add(new Vector3(0, 3, dz)), mast.clone().add(new Vector3(0, 100, dz)), 1.05, PALETTE.iron);
      beam(mast.clone().add(new Vector3(0, 94, 0)), mast.clone().add(new Vector3(62, 94, 0)), 1.3, PALETTE.rust);
      beam(mast.clone().add(new Vector3(0, 100, 0)), mast.clone().add(new Vector3(62, 94, 0)), .65, PALETTE.bone);
      beam(mast.clone().add(new Vector3(45, 94, 0)), mast.clone().add(new Vector3(45, 61, 0)), .55, PALETTE.iron);
      batch.box(PALETTE.ochre, x - 8, y + 58, z - 39, 6, 6, 6);
    } else {
      tank(x - 37, y + 3, z - 1, 28, 39, PALETTE.violet);
      tank(x + 32, y + 3, z + 13, 20, 64);
      for (const [dx, dz, height, radius] of [[-64, 44, 123, 4.2], [65, -38, 158, 3.6], [1, 47, 237, 5.4]] as const) {
        batch.cylinder(PALETTE.shadow, x + dx, y + height / 2, z + dz, radius, radius + 2, height, 12);
        for (const fraction of [.24, .55, .82]) {
          const h = height * fraction;
          batch.cylinder(PALETTE.rust, x + dx, y + h, z + dz, radius + 1.2, radius + 1.2, 2.1, 12);
          if (height === 237) walkway(x + dx, y + h, z + dz, 22, 19);
        }
        batch.cylinder(PALETTE.bone, x + dx, y + height + 3, z + dz, radius + 1.3, radius + 1.3, 3, 12);
        if (height === 237) {
          for (const side of [-1, 1]) {
            beam(new Vector3(x + dx + side * 9, y + 3, z + dz), new Vector3(x + dx + side * 7, y + 198, z + dz), .95, PALETTE.iron);
            for (const h of [40, 85, 130, 175]) beam(new Vector3(x + dx - side * 8, y + h - 30, z + dz),
              new Vector3(x + dx + side * 8, y + h, z + dz), .6, PALETTE.rust);
          }
        }
      }
      walkway(x, y + 32, z - 37, 117, 11);
      for (const dx of [-51, 6, 51]) {
        beam(new Vector3(x + dx, y + 3, z - 37), new Vector3(x + dx, y + 32, z - 37), 1, PALETTE.iron);
      }
      for (const h of [17, 24]) {
        beam(new Vector3(x - 56, y + h, z - 24), new Vector3(x + 57, y + h, z - 24), 1.7, PALETTE.rust);
        beam(new Vector3(x + 57, y + h, z - 24), new Vector3(x + 57, y + h, z + 33), 1.7, PALETTE.rust);
      }
    }
  }
  // Real sloping pipe/service galleries join all three grounded tiers. Narrow
  // piers are used only for these spans, and each has its own terrain footing.
  for (let i = 1; i < localTerraces.length; i++) {
    const a = localTerraces[i - 1]!, b = localTerraces[i]!;
    const start = a.center.clone().add(new Vector3(-a.width * .3, 13, a.depth * .35));
    const end = b.center.clone().add(new Vector3(-b.width * .3, 13, -b.depth * .35));
    for (const lateral of [-4, 4]) beam(start.clone().add(new Vector3(lateral, 0, 0)), end.clone().add(new Vector3(lateral, 0, 0)), 2.5, PALETTE.rust);
    beam(start.clone().add(new Vector3(0, 5, 0)), end.clone().add(new Vector3(0, 5, 0)), 1.1, PALETTE.bone);
    for (const t of [.25, .75]) {
      const p = start.clone().lerp(end, t), world = p.clone().applyMatrix4(transform);
      const bottom = heightAt(world.x, world.z) - 5 - plan.y;
      batch.box(PALETTE.violet, p.x, bottom + 3, p.z, 17, 6, 17);
      batch.box(PALETTE.iron, p.x, (p.y + bottom) / 2, p.z, 6, p.y - bottom, 9);
    }
  }
  const mesh = batch.finish('Inkstorm launch industrial citadel')!;
  mesh.userData.inkstormVistaFootprints = [{ id: plan.id, x: plan.x, z: plan.z, radius: plan.radius }];
  mesh.userData.inkstormVistaLaunch = plan.launch;
  mesh.userData.inkstormVistaTerraces = terraces;
  // The continuous physical ridge replaces the four disconnected support heaps.
  mesh.userData.inkstormVistaRockSupports = [];
  return mesh;
}

function chevron(batch: VistaBatch, x: number, y: number, z: number, yaw: number, direction: number, scale = 1): void {
  // Panel local +X is camera-screen left. A screen-right tip therefore uses -X.
  const world = localTransform(x, y, z, yaw);
  for (const side of [-1, 1]) {
    const point = new Vector3(0, side * 1.4 * scale, -.61).applyMatrix4(world);
    batch.box(PALETTE.ochre, point.x, point.y, point.z, 1.1 * scale, 4.1 * scale, .24, yaw, -side * Math.sign(direction) * Math.PI / 4);
  }
}

/** Closed retaining prisms interpolate both coping and founded toe along the bend. */
function retainingSpan(batch: VistaBatch, a: VistaBarrier, b: VistaBarrier, color: string, width: number,
  bottomA: number, bottomB: number, topA: number, topB: number): void {
  const vertices: number[] = [];
  for (const [p, bottom, top] of [[a, bottomA, topA], [b, bottomB, topB]] as const) {
    for (const [side, y] of [[-1, bottom], [1, bottom], [1, top], [-1, top]]) {
      vertices.push(p.x + p.outwardX * side! * width / 2, y!, p.z + p.outwardZ * side! * width / 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  const indices = [0,3,2,0,2,1,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5];
  if (a.outwardX * (b.z - a.z) - a.outwardZ * (b.x - a.x) < 0) {
    for (let i = 0; i < indices.length; i += 3) [indices[i], indices[i + 2]] = [indices[i + 2]!, indices[i]!];
  }
  geometry.setIndex(indices);
  geometry.computeVertexNormals(); batch.add(geometry, color, 0, 0, 0);
}

function createBarriers(plan: readonly VistaBarrier[], markers: readonly VistaFinishMarker[]): Mesh | null {
  const batch = new VistaBatch();
  const joinedSpans: { from: string; to: string; length: number }[] = [];
  const connected = new Set<string>();
  const buildSpan = (a: VistaBarrier, b: VistaBarrier): void => {
    retainingSpan(batch, a, b, PALETTE.violet, 7, a.bottom, b.bottom, a.y + 1, b.y + 1);
    retainingSpan(batch, a, b, PALETTE.rust, 7, a.y + 1, b.y + 1, a.y + 5.5, b.y + 5.5);
    retainingSpan(batch, a, b, PALETTE.bone, 8.4, a.y + 5.5, b.y + 5.5, a.y + 6.2, b.y + 6.2);
    retainingSpan(batch, a, b, PALETTE.iron, .9, a.y + 8.8, b.y + 8.8, a.y + 9.5, b.y + 9.5);
    retainingSpan(batch, a, b, PALETTE.iron, .75, a.y + 7.1, b.y + 7.1, a.y + 7.7, b.y + 7.7);
  };
  for (let i = 1; i < plan.length; i++) {
    const a = plan[i - 1]!, b = plan[i]!;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    // Every joining span is covered by the adjacent cleared 13m disks. Never
    // bridge a rejected placement, a change of turn side or another route.
    if (length > 24 || a.outwardX * b.outwardX + a.outwardZ * b.outwardZ < .8) continue;
    buildSpan(a, b); connected.add(a.id); connected.add(b.id);
    joinedSpans.push({ from: a.id, to: b.id, length });
  }
  for (const p of plan) {
    if (!connected.has(p.id)) {
      const dx = Math.sin(p.yaw) * 7, dz = Math.cos(p.yaw) * 7;
      buildSpan({ ...p, x: p.x - dx, z: p.z - dz }, { ...p, x: p.x + dx, z: p.z + dz });
    }
    const ribHeight = p.y + 4 - p.bottom;
    batch.box(PALETTE.rust, p.x + p.outwardX * 4.5, p.bottom + ribHeight / 2, p.z + p.outwardZ * 4.5, 2.5, ribHeight, 3.2, p.yaw);
    batch.box(PALETTE.iron, p.x, p.y + 7.8, p.z, 1.2, 4.2, 1.3, p.yaw);
    if (p.sign) {
      for (const side of [-1, 1]) batch.box(PALETTE.iron, p.x + Math.cos(p.yaw) * side * 5, p.y + 9, p.z - Math.sin(p.yaw) * side * 5, .9, 6, 1, p.yaw);
      batch.box(PALETTE.iron, p.x, p.y + 12, p.z, 14, 9, 1, p.yaw);
      for (const offset of [-4.1, 4.1]) chevron(batch, p.x + Math.cos(p.yaw) * offset, p.y + 12, p.z - Math.sin(p.yaw) * offset, p.yaw, p.direction);
    }
  }
  for (const marker of markers) {
    const transform = localTransform(marker.x, marker.y, marker.z, marker.yaw);
    const box = (color: string, x: number, y: number, z: number, width: number, height: number, depth: number): void => {
      const p = new Vector3(x, y, z).applyMatrix4(transform);
      batch.box(color, p.x, p.y, p.z, width, height, depth, marker.yaw);
    };
    const foundation = marker.y - marker.bottom;
    box(PALETTE.violet, 0, -foundation / 2, 0, 18, foundation, 22);
    box(PALETTE.rust, 0, 3, 0, 20, 6, 22);
    box(PALETTE.blue, 0, marker.height / 2, 0, 12, marker.height, 15);
    for (const side of [-1, 1]) box(PALETTE.iron, side * 6.3, marker.height / 2, -5, 2, marker.height, 4);
    for (const y of [13, 29, 45, 61]) if (y < marker.height) box(PALETTE.rust, 0, y, 0, 15, 3, 18);
    box(PALETTE.iron, -marker.side * 7, marker.height - 5, 0, 28, 5, 9);
    box(PALETTE.bone, -marker.side * 9, marker.height - 9, -5.1, 22, 2.2, 1.3);
    box(PALETTE.shadow, -marker.side * 7, marker.height - 20, -8, 24, 14, 2);
    for (const x of [-7, 0, 7]) box(PALETTE.teal, -marker.side * 7 + x, marker.height - 20, -9.2, 3.5, 10, .8);
    box(PALETTE.bone, 0, marker.height + 4, 0, 3, 8, 3);
  }
  const mesh = batch.finish('Inkstorm finish outer-curve barriers, retaining walls and exit signals');
  if (mesh) {
    mesh.userData.inkstormVistaFootprints = [...plan, ...markers];
    mesh.userData.inkstormFinishBarriers = plan;
    mesh.userData.inkstormFinishSpans = joinedSpans;
    mesh.userData.inkstormFinishMarkers = markers;
  }
  return mesh;
}

function createForkSigns(plan: InkstormVistaPlan): Mesh | null {
  const batch = new VistaBatch();
  for (const p of plan.signs) {
    const color = p.routeId === 'canonical' ? PALETTE.ochre : PALETTE.teal;
    batch.box(PALETTE.iron, p.x, p.y + 8, p.z, 1.5, 16, 1.5, p.yaw);
    batch.box(PALETTE.blue, p.x, p.y + 16, p.z, 12, 11, 1, p.yaw);
    const transform = localTransform(p.x, p.y + 15.5, p.z, p.yaw)
      .multiply(new Matrix4().makeRotationZ(p.direction));
    const shaft = new Vector3(0, -.7, -.66).applyMatrix4(transform);
    batch.box(color, shaft.x, shaft.y, shaft.z, 1.5, 4.5, .25, p.yaw, p.direction);
    const arrow = new BufferGeometry();
    arrow.setAttribute('position', new Float32BufferAttribute([-3, 1, -.8, 0, 4.3, -.8, 3, 1, -.8, 3, 1, -.8, 0, 4.3, -.8, -3, 1, -.8], 3));
    arrow.computeVertexNormals(); arrow.applyMatrix4(transform);
    batch.add(arrow, color, 0, 0, 0);
    batch.cylinder(color, p.x, p.y + 23, p.z, 1.6, 1.6, 4, 8);
  }
  for (const p of plan.beacons) {
    batch.cylinder(PALETTE.iron, p.x, p.y + 4.5, p.z, .9, 2.2, 9, 8);
    batch.cylinder(PALETTE.teal, p.x, p.y + 9.5, p.z, 1.05, 1.05, 2.6, 8);
    batch.cylinder(PALETTE.bone, p.x, p.y + 11.1, p.z, 1.2, 1.2, .5, 8);
  }
  const mesh = batch.finish('Inkstorm actual-route fork beacons');
  if (mesh) {
    mesh.userData.inkstormVistaFootprints = [...plan.signs, ...plan.beacons];
    mesh.userData.inkstormVistaSigns = plan.signs;
  }
  return mesh;
}

/** At most three draw calls. Caller owns and disposes each returned geometry and material. */
export function createInkstormVista(course: PodraceCourse, heightAt: HeightAt): Mesh[] {
  const plan = getInkstormVistaPlan(course, heightAt);
  const citadel = plan.citadel ? createCitadel(plan.citadel, plan.terraces, heightAt) : null;
  if (citadel) citadel.userData.inkstormVistaLandforms = plan.landforms;
  return [citadel, createBarriers(plan.barriers, plan.finishMarkers), createForkSigns(plan)]
    .filter((mesh): mesh is Mesh => mesh !== null);
}

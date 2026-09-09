import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PodraceCourse } from '../../../../src/game/race/course';
import type { CourseBranchPoint, CourseRenderData } from '../../../../src/game/race/types';
import { InkstormSurfaceMaterial } from '../../../../src/render/inkstorm/InkstormSurfaceMaterial';

type Point = readonly [number, number, number];
type RoutePoint = { x: number; y: number; z: number; width: number };
type HeightAt = (x: number, z: number) => number;
export interface ForkWayfindingBox { id: string; center: Point; size: Point; yaw: number; color: string; graphic?: boolean; roll?: number }
export interface ForkWayfindingPlan {
  branchId: string | null; entryProgress: number | null;
  boxes: ForkWayfindingBox[];
  stations: { id: string; route: 'advance' | 'main' | 'bridge'; center: Point; distanceFromEntry: number; clearance: number; foundationHeights: number[] }[];
  diagram: { main: readonly Point[]; bridge: readonly Point[]; bridgeSide: -1 | 1 } | null;
  omitted: string[];
}
const COLORS = { body: '#34404b', rim: '#a88b6e', foot: '#675651', main: '#f0d6a5', bridge: '#66c9c2', ink: '#1e2431' };
const UP = new Vector3(0, 1, 0);

/** Continuous XZ clearance from every legal main/alternate segment, not nearest route only. */
export function forkWayfindingClearance(x: number, z: number, data: CourseRenderData): number {
  let clearance = Infinity;
  const paths = [data.points, ...(data.branches ?? []).map(b => b.points)];
  for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
    const path = paths[pathIndex]!;
    for (let i = 0; i < path.length - (pathIndex ? 1 : 0); i++) {
      const a = path[i]!, b = path[(i + 1) % path.length]!, dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / Math.max(.001, dx * dx + dz * dz)));
      clearance = Math.min(clearance, Math.hypot(x - a.x - dx * t, z - a.z - dz * t) - Math.max(a.width, b.width));
    }
  }
  return clearance;
}

const localPoint = (origin: Point, yaw: number, x: number, y: number, z = 0): Point =>
  [origin[0] + Math.cos(yaw) * x + Math.sin(yaw) * z, origin[1] + y,
    origin[2] - Math.sin(yaw) * x + Math.cos(yaw) * z];

/** Route guidance only. No road/terrain/physics mutation, texture, canvas, or frame callback. */
export function getInkstormForkWayfindingPlan(course: PodraceCourse, heightAt: HeightAt): ForkWayfindingPlan {
  const plan: ForkWayfindingPlan = { branchId: null, entryProgress: null, boxes: [], stations: [], diagram: null, omitted: [] };
  if (course.seed !== 0x494e4b53) return plan;
  const branch = course.branches.find(b => b.id === 'branch-1-shortcut' && b.elevated);
  if (!branch || branch.points.length < 5) return plan;
  plan.branchId = branch.id; plan.entryProgress = branch.entryProgress;
  const lanes = course.getRenderData(2048), entry = course.sampleAtProgress(branch.entryProgress);
  const sampleMain = (distance: number) => course.sampleAtProgress(branch.entryProgress + distance / course.totalLength);
  const alongBranch = (t: number): CourseBranchPoint => {
    const f = Math.max(0, Math.min(1, t)) * (branch.points.length - 1), i = Math.min(branch.points.length - 2, Math.floor(f)), a = branch.points[i]!, b = branch.points[i + 1]!, u = f - i;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u,
      width: Math.max(a.width, b.width), routeProgress: t, canonicalProgress: a.canonicalProgress + (b.canonicalProgress - a.canonicalProgress) * u };
  };
  const branchPoint = alongBranch(.2), mainPoint = course.sampleAtProgress(branchPoint.canonicalProgress);
  const bridgeSide = Math.sign((branchPoint.x - mainPoint.x) * entry.rightX + (branchPoint.z - mainPoint.z) * entry.rightZ) < 0 ? -1 : 1;
  const mainSide = -bridgeSide;
  // Diagram coordinates preserve the actual route handedness and shared root.
  // It is a topology guide, not a false metrically scaled mini-map.
  const diagramMain: Point[] = [[0, -2.4, 0], [0, -1.25, 0], [mainSide * 1.2, -.3, 0], [mainSide * 2.6, 1, 0], [mainSide * 2.6, 2.1, 0]];
  const diagramBridge: Point[] = [[0, -1.25, 0], [bridgeSide * 1.2, -.3, 0], [bridgeSide * 2.6, 1, 0], [bridgeSide * 2.6, 2.1, 0]];
  plan.diagram = { main: diagramMain, bridge: diagramBridge, bridgeSide };
  const add = (id: string, origin: Point, yaw: number, offset: Point, size: Point, color: string, graphic = false, roll = 0) =>
    plan.boxes.push({ id, center: localPoint(origin, yaw, ...offset), size, yaw, color, ...(graphic ? { graphic: true } : {}), ...(roll ? { roll } : {}) });

  function findShoulder(route: RoutePoint, yaw: number, halfWidth: number, preferred: number, referenceY: number, alternateSide = true) {
    for (const extra of [halfWidth + 4.2, halfWidth + 7.2, halfWidth + 11.2]) {
      for (const side of alternateSide ? [preferred, -preferred] : [preferred]) {
        const x = route.x + Math.cos(yaw) * (route.width + extra) * side;
        const z = route.z - Math.sin(yaw) * (route.width + extra) * side;
        let clearance = Infinity;
        const ground: number[] = [];
        for (const lateral of [-halfWidth, 0, halfWidth]) for (const depth of [-1.15, 1.15]) {
          const p = localPoint([x, 0, z], yaw, lateral, 0, depth);
          clearance = Math.min(clearance, forkWayfindingClearance(p[0], p[2], lanes)); ground.push(heightAt(p[0], p[2]));
        }
        const bottom = Math.min(...ground), top = Math.max(...ground);
        // Never move a marker onto an unwalkable gulf floor or grow an absurd pole.
        if (clearance < 3.2 || top - bottom > 3 || Math.abs(top - referenceY) > 7) continue;
        return { center: [x, top, z] as Point, clearance, ground };
      }
    }
    return null;
  }

  function line(id: string, a: Point, b: Point, origin: Point, yaw: number, color: string, width: number, depth = -.245) {
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    add(id, origin, yaw, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, depth], [width, length + width * .2, .075], color, true, -Math.atan2(dx, dy));
  }
  function arrow(id: string, x: number, y: number, origin: Point, yaw: number, color: string, width: number) {
    line(`${id}-left`, [x - .65, y - .72, 0], [x, y, 0], origin, yaw, color, width);
    line(`${id}-right`, [x + .65, y - .72, 0], [x, y, 0], origin, yaw, color, width);
  }
  // One advance directory, supported by two independently terrain-seated feet.
  // At 410 km/h its station is 1.54 s before entry; first sight at 150 m adds 1.32 s.
  const advance = sampleMain(-175), yaw = Math.atan2(advance.tangentX, advance.tangentZ);
  const shoulder = findShoulder(advance, yaw, 5.65, mainSide, advance.y);
  if (shoulder) {
    const origin: Point = [shoulder.center[0], shoulder.center[1] + 10.7, shoulder.center[2]];
    add('advance-body', origin, yaw, [0, 0, 0], [10.8, 7.6, .4], COLORS.body);
    add('advance-inset', origin, yaw, [0, 0, -.215], [10.3, 7.1, .06], COLORS.ink);
    for (const side of [-1, 1]) {
      add(`advance-rim-${side}`, origin, yaw, [side * 5.45, 0, 0], [.22, 7.8, .5], COLORS.rim);
      const foot = localPoint(shoulder.center, yaw, side * 3.8, 0);
      const footY = heightAt(foot[0], foot[2]), top = origin[1] + 3.6;
      plan.boxes.push({ id: `advance-foot-${side}`, center: [foot[0], footY -.25, foot[2]], size: [1.9, 1.3, 2.2], yaw, color: COLORS.foot });
      plan.boxes.push({ id: `advance-post-${side}`, center: [foot[0], (footY + top) / 2, foot[2]], size: [.45, top - footY, .55], yaw, color: COLORS.body });
    }
    for (const [name, path, color] of [['main', diagramMain, COLORS.main], ['bridge', diagramBridge, COLORS.bridge]] as const) {
      // The two colors overlap at the shared root; separate their front planes
      // by 2.5 cm so the junction cannot flicker between coplanar triangles.
      for (let i = 1; i < path.length; i++) line(`advance-${name}-${i}`, path[i - 1]!, path[i]!, origin, yaw, color, name === 'main' ? .55 : .48, name === 'bridge' ? -.27 : -.245);
      arrow(`advance-${name}-arrow`, path.at(-1)![0], 2.12, origin, yaw, color, .38);
    }
    // The bridge has a deck with two piers; main has a broad open-road twin line.
    for (const side of [-1, 1]) {
      add(`advance-bridge-pier-${side}`, origin, yaw, [bridgeSide * 2.6 + side * .65, 2.77, -.26], [.18, .6, .08], COLORS.bridge, true);
      add(`advance-main-lane-${side}`, origin, yaw, [mainSide * 2.6 + side * .3, 2.9, -.26], [.15, .75, .08], COLORS.main, true);
    }
    add('advance-bridge-deck', origin, yaw, [bridgeSide * 2.6, 3.12, -.26], [1.65, .18, .08], COLORS.bridge, true);
    plan.stations.push({ id: 'advance', route: 'advance', center: shoulder.center, distanceFromEntry: -175, clearance: shoulder.clearance, foundationHeights: shoulder.ground });
  } else plan.omitted.push('advance');

  function marker(id: string, routeName: 'main' | 'bridge', route: RoutePoint, heading: number, preferred: number, distance: number) {
    const candidate = findShoulder(route, heading, .65, preferred, route.y, false);
    if (!candidate) { plan.omitted.push(id); return; }
    const base = candidate.center, color = routeName === 'main' ? COLORS.main : COLORS.bridge;
    const y = Math.max(base[1] + 3.2, route.y + 3.8), footY = heightAt(base[0], base[2]);
    plan.boxes.push({ id: `${id}-foot`, center: [base[0], footY -.2, base[2]], size: [1.15, 1, 1.3], yaw: heading, color: COLORS.foot });
    plan.boxes.push({ id: `${id}-stem`, center: [base[0], (footY + y) / 2, base[2]], size: [.22, y - footY, .3], yaw: heading, color: COLORS.body });
    const head: Point = [base[0], y, base[2]];
    add(`${id}-head`, head, heading, [0, 0, 0], [1.05, 1.85, .3], COLORS.body);
    for (const side of [-1, 1]) add(`${id}-route-${side}`, head, heading, [side * .23, 0, -.2], [.13, 1.12, .09], color, true);
    if (routeName === 'bridge') add(`${id}-deck`, head, heading, [0, .6, -.2], [.76, .14, .09], color, true);
    plan.stations.push({ id, route: routeName, center: base, distanceFromEntry: distance, clearance: candidate.clearance, foundationHeights: candidate.ground });
  }
  // Paired low main-road markers trace the first four actual segments around the
  // landmark. They remain below 5 m on level ground and never form a wall.
  for (const distance of [35, 75, 120, 175]) {
    const p = sampleMain(distance), heading = Math.atan2(p.tangentX, p.tangentZ);
    marker(`main-${distance}-inner`, 'main', p, heading, bridgeSide, distance);
    marker(`main-${distance}-outer`, 'main', p, heading, mainSide, distance);
  }
  for (const t of [.16, .3]) {
    const p = alongBranch(t), next = alongBranch(t + .01), heading = Math.atan2(next.x - p.x, next.z - p.z);
    marker(`bridge-${t}`, 'bridge', p, heading, bridgeSide, (p.canonicalProgress - branch.entryProgress) * course.totalLength);
  }
  return plan;
}

/** Two opaque material groups; ownership fits InkstormWorld's existing disposal. */
export function createInkstormForkWayfinding(course: PodraceCourse, heightAt: HeightAt): Mesh | null {
  const plan = getInkstormForkWayfindingPlan(course, heightAt);
  if (!plan.boxes.length) return null;
  const sets: BufferGeometry[][] = [[], []];
  for (const box of plan.boxes) {
    const original = new BoxGeometry(...box.size), geometry = original.toNonIndexed(); original.dispose();
    const rotation = new Quaternion().setFromAxisAngle(UP, box.yaw);
    if (box.roll) rotation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), box.roll));
    geometry.applyMatrix4(new Matrix4().compose(new Vector3(...box.center), rotation, new Vector3(1, 1, 1)));
    geometry.deleteAttribute('uv'); geometry.clearGroups();
    const colors = new Float32Array(geometry.getAttribute('position').count * 3), color = new Color(box.color);
    for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3)); sets[box.graphic ? 1 : 0]!.push(geometry);
  }
  const groups = sets.map(parts => { const g = mergeGeometries(parts, false); for (const p of parts) p.dispose(); return g; });
  if (groups.some(g => !g)) { for (const g of groups) g?.dispose(); throw new Error('Unable to merge fork guidance groups'); }
  const geometry = mergeGeometries(groups as BufferGeometry[], true); for (const g of groups) g!.dispose();
  if (!geometry) throw new Error('Unable to merge fork guidance');
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const mesh = new Mesh(geometry, [new InkstormSurfaceMaterial(false), new MeshBasicMaterial({ vertexColors: true, toneMapped: false })]);
  mesh.name = 'Inkstorm fork advance guidance'; mesh.userData.inkstormForkWayfindingPlan = plan;
  return mesh;
}

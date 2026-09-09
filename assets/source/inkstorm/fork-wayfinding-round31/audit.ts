import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { createProceduralPodraceCourse } from '../../../../src/game/race/course';
import { createCourseGulfField } from '../../../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../../../src/render/terrain/terrainMath';
import { createInkstormForkWayfinding, forkWayfindingClearance, getInkstormForkWayfindingPlan } from './InkstormForkWayfinding';

const folder = 'assets/source/inkstorm/fork-wayfinding-round31', started = performance.now();
let field: ReturnType<typeof createCourseGulfField> = null;
const heightAt = (x: number, z: number) => sampleTerrainHeight(x, z, field);
const course = createProceduralPodraceCourse({ heightAt }, 0x494e4b53);
field = createCourseGulfField(course); course.refreshTerrainHeights({ heightAt: sampleTerrainHeight });
const plan = getInkstormForkWayfindingPlan(course, heightAt), lanes = course.getRenderData(2048);
const checks: { name: string; pass: boolean; value: unknown }[] = [];
const fail = (name: string, pass: boolean, value: unknown) => checks.push({ name, pass, value });
fail('One advance directory precedes the actual branch entry by 175 metres', plan.stations.filter(s => s.route === 'advance').length === 1 && plan.stations.find(s => s.route === 'advance')?.distanceFromEntry === -175, plan.stations.filter(s => s.route === 'advance'));
fail('Main route gets at least four founded continuation markers', plan.stations.filter(s => s.route === 'main').length >= 4, plan.stations.filter(s => s.route === 'main').length);
fail('Both route choices get matching confirmation markers', plan.stations.some(s => s.route === 'bridge'), plan.stations.filter(s => s.route === 'bridge'));
let minClearance = Infinity, minFootBurial = Infinity, samples = 0;
const offending: unknown[] = [];
const segmentDistance = (a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[]) => {
  const orient = (p: readonly number[], q: readonly number[], r: readonly number[]) => (q[0]! - p[0]!) * (r[1]! - p[1]!) - (q[1]! - p[1]!) * (r[0]! - p[0]!);
  const distance = (p: readonly number[], q: readonly number[], r: readonly number[]) => {
    const dx = r[0]! - q[0]!, dz = r[1]! - q[1]!, t = Math.max(0, Math.min(1, ((p[0]! - q[0]!) * dx + (p[1]! - q[1]!) * dz) / Math.max(.000001, dx * dx + dz * dz)));
    return Math.hypot(p[0]! - q[0]! - t * dx, p[1]! - q[1]! - t * dz);
  };
  if (orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0) return 0;
  return Math.min(distance(a, c, d), distance(b, c, d), distance(c, a, b), distance(d, a, b));
};
let exactFootprintClearance = Infinity;
for (const box of plan.boxes) {
  const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), box.yaw);
  if (box.roll) rotation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), box.roll));
  const matrix = new Matrix4().compose(new Vector3(...box.center), rotation, new Vector3(1, 1, 1));
  // Exact XZ rectangle enclosing this yaw/roll box. Segment-to-rectangle checks
  // cover its interior and boundaries, rather than treating probes as proof.
  const roll = box.roll ?? 0, hw = (Math.abs(Math.cos(roll)) * box.size[0] + Math.abs(Math.sin(roll)) * box.size[1]) / 2, hd = box.size[2] / 2;
  const transform = (x: number, z: number) => [box.center[0] + Math.cos(box.yaw) * x + Math.sin(box.yaw) * z, box.center[2] - Math.sin(box.yaw) * x + Math.cos(box.yaw) * z];
  const rectangle = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => transform(x!, z!));
  const paths = [lanes.points, ...(lanes.branches ?? []).map(b => b.points)];
  for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
    const path = paths[pathIndex]!;
    for (let i = 0; i < path.length - (pathIndex ? 1 : 0); i++) {
      const a = path[i]!, b = path[(i + 1) % path.length]!, ac = [a.x, a.z], bc = [b.x, b.z];
      const localX = Math.cos(box.yaw) * (a.x - box.center[0]) - Math.sin(box.yaw) * (a.z - box.center[2]);
      const localZ = Math.sin(box.yaw) * (a.x - box.center[0]) + Math.cos(box.yaw) * (a.z - box.center[2]);
      let d = Math.abs(localX) <= hw && Math.abs(localZ) <= hd ? 0 : Infinity;
      for (let edge = 0; edge < 4; edge++) d = Math.min(d, segmentDistance(ac, bc, rectangle[edge]!, rectangle[(edge + 1) % 4]!));
      exactFootprintClearance = Math.min(exactFootprintClearance, d - Math.max(a.width, b.width));
    }
  }
  // Corner plus face-midpoint probes include the whole sign face's XZ footprint,
  // rotated arrow slats, post cross sections and buried foot extents.
  for (const x of [-.5, 0, .5]) for (const y of [-.5, 0, .5]) for (const z of [-.5, 0, .5]) {
    const p = new Vector3(x * box.size[0], y * box.size[1], z * box.size[2]).applyMatrix4(matrix);
    const clearance = forkWayfindingClearance(p.x, p.z, lanes); minClearance = Math.min(minClearance, clearance); samples++;
    if (clearance < 3 && offending.length < 8) offending.push({ id: box.id, point: p.toArray(), clearance });
    if (box.id.includes('-foot-') || box.id.endsWith('-foot')) if (y === -.5) minFootBurial = Math.min(minFootBurial, heightAt(p.x, p.z) - p.y);
  }
}
fail('Every added solid stays outside every sampled continuous legal lane by 3m', minClearance >= 3, { minClearance, samples, offending });
fail('Exact box-footprint to every legal lane segment clearance exceeds 3m', exactFootprintClearance >= 3, { exactFootprintClearance });
fail('Every foundation bottom penetrates the actual terrain', minFootBurial > .1, { minFootBurial });
const centerDistances = plan.stations.flatMap((a, i) => plan.stations.slice(i + 1).map(b => ({ a: a.id, b: b.id, d: Math.hypot(a.center[0] - b.center[0], a.center[2] - b.center[2]) })));
fail('No two station centers overlap within 2m', centerDistances.every(p => p.d > 2), centerDistances.sort((a, b) => a.d - b.d).slice(0, 3));
const mesh = createInkstormForkWayfinding(course, heightAt)!;
const positions = mesh.geometry.getAttribute('position');
fail('Finite geometry under 1800 triangles, two opaque material groups', Array.from(positions.array).every(Number.isFinite) && positions.count / 3 < 1800 && mesh.geometry.groups.length === 2, { triangles: positions.count / 3, groups: mesh.geometry.groups });
const otherSeed = Object.create(course) as typeof course;
Object.defineProperty(otherSeed, 'seed', { value: 123 });
fail('Non-flagship courses receive no guidance', getInkstormForkWayfindingPlan(otherSeed, heightAt).boxes.length === 0, null);
const paths = ['src/render/inkstorm/InkstormWorld.ts', 'src/render/inkstorm/InkstormRoad.ts', 'src/render/inkstorm/InkstormBridge.ts', 'src/render/inkstorm/InkstormForkFoundation.ts', 'src/game/race/course.ts', 'src/game/race/branches.ts', 'src/game/race/bridgeSurface.ts', 'src/game/race/CourseGulfField.ts', 'src/camera/CourseJunctionFraming.ts', 'src/render/inkstorm/InkstormSurfaceMaterial.ts'];
const sourceHashes = Object.fromEntries(paths.map(p => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
const receipt = { status: checks.every(c => c.pass) ? 'PASS' : 'FAIL', scope: 'Bounded CPU geometry/route placement checks only; no browser, GPU, Blender, network, production edits or visual acceptance.', seed: course.seed, courseSignature: course.signature, totalLength: course.totalLength, sourceHashes, checks,
  costs: { geometryTriangles: positions.count / 3, attributeBytes: Object.values(mesh.geometry.attributes).reduce((s, a) => s + a.array.byteLength, 0), additionalMainPassDraws: 2, addedTextures: 0, addedRenderPasses: 0, frameCallbacks: 0 }, elapsedMs: performance.now() - started,
  limits: ['Continuous-lane check uses actual 2048-point road segments and exact branch samples; it is not a physical driving test.', 'Screen-space readability/occlusion at ordinary chase speed and overlap with existing scenery require real-image integration review.', 'The marker treatment does not expose a road hidden by terrain or satisfy original concept04 parity.'] };
writeFileSync(`${folder}/plan.json`, JSON.stringify(plan, null, 2) + '\n');
writeFileSync(`${folder}/cpu-receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
mesh.geometry.dispose(); for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
if (receipt.status !== 'PASS') process.exitCode = 1;

/** CPU pose/geometry receipt. This neither opens a browser nor captures images. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RaceSimulation } from '../src/game/race/RaceSimulation';
import { getInkstormForkDividers } from '../src/game/race/inkstormLayout';
import { CinematicCamera, type CameraSubject } from '../src/camera/CinematicCamera';
import { updateCourseJunctionFraming } from '../src/camera/CourseJunctionFraming';
import { groundInkstormButtress } from '../src/render/inkstorm/InkstormRockGrounding';
import { sampleTerrainHeight } from '../src/render/terrain/terrainMath';

const label = (process.argv.find(arg => arg.startsWith('--label='))?.slice(8) ?? 'fork-physical-profile').replace(/[^a-z0-9_-]/gi, '-');
const output = `output/terrain/${label}`;
const race = new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: 0x494e4b53, competitionProfile: 'time-trial' });
const course = race.course, branch = course.branches.find(value => value.elevated)!;
const entry = branch.entryProgress * course.totalLength;
const placements = getInkstormForkDividers(course);
const denseRoute = course.getRenderData(8192).points;
const clearances = placements.map(rock => {
  let minimum = Infinity;
  const cos = Math.cos(rock.yaw), sin = Math.sin(rock.yaw);
  const sample = (x: number, z: number, width: number) => {
    const dx = x - rock.x, dz = z - rock.z;
    minimum = Math.min(minimum, Math.hypot(Math.max(0, Math.abs(dx * cos - dz * sin) - 40 * rock.sx),
      Math.max(0, Math.abs(dx * sin + dz * cos) - 50 * rock.sz)) - width);
  };
  for (const point of denseRoute) sample(point.x, point.z, point.width);
  for (const branch of course.branches) for (let index = 1; index < branch.points.length; index++) {
    const a = branch.points[index - 1]!, b = branch.points[index]!;
    for (let step = 0; step <= 24; step++) sample(a.x + (b.x - a.x) * step / 24,
      a.z + (b.z - a.z) * step / 24, Math.max(a.width, b.width));
  }
  return { id: rock.id, minimumFullBoxLaneClearanceM: minimum };
});
const bytes = readFileSync('public/assets/inkstorm/canyon-buttress.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const rocks = placements.map(placement => {
  const object = gltf.scene.clone(true);
  const grounded = groundInkstormButtress(placement, (x, z) => race.terrain.heightAt(x, z));
  object.position.set(placement.x, grounded.baseY, placement.z);
  object.quaternion.setFromAxisAngle(new Vector3(0, 1, 0), placement.yaw);
  object.scale.set(placement.sx, grounded.scaleY, placement.sz);
  object.updateMatrixWorld(true);
  return object;
});
function branchSample(distance: number) {
  const progress = (entry + distance) / course.totalLength;
  let index = 0;
  while (index < branch.points.length - 2 && branch.points[index + 1]!.canonicalProgress < progress) index++;
  const a = branch.points[index]!, b = branch.points[index + 1]!;
  const t = Math.max(0, Math.min(1, (progress - a.canonicalProgress) / (b.canonicalProgress - a.canonicalProgress)));
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  return { x: a.x + dx * t, y: a.y + (b.y - a.y) * t, z: a.z + dz * t,
    rightX: dz / length, rightZ: -dx / length, width: a.width + (b.width - a.width) * t };
}
const ray = new Raycaster(), direction = new Vector3();
const rig = new CinematicCamera(), poses = [];
for (const approach of [-120, -60, 0, 20, 60, 100, 150]) for (const path of approach <= 0 ? ['main'] : ['main', 'bridge']) {
  const main = course.sampleAtDistance(entry + approach);
  const point = path === 'main' ? main : branchSample(approach);
  const x = point.x + point.rightX * 6, z = point.z + point.rightZ * 6;
  const forward = new Vector3(-point.rightZ, 0, point.rightX), speed = 114;
  const subject: CameraSubject = { position: new Vector3(x, race.terrain.heightAt(x, z) + 2.25, z),
    forward, velocity: forward.clone().multiplyScalar(speed), speed };
  const target = new Vector3();
  subject.junctionWeight = updateCourseJunctionFraming(course, main.progress, subject.position, forward, target);
  if (subject.junctionWeight) subject.junctionLookAhead = target;
  const ahead = course.sampleAtDistance(entry + approach + 55 + Math.min(70, speed * .3));
  subject.routeLookAhead = new Vector3(ahead.x, ahead.y + 3, ahead.z);
  rig.snap(subject); rig.camera.updateMatrixWorld(true);
  const cameraDirection = rig.camera.getWorldDirection(new Vector3());
  const yawDegrees = Math.atan2(cameraDirection.x * point.rightX + cameraDirection.z * point.rightZ,
    cameraDirection.x * forward.x + cameraDirection.z * forward.z) * 180 / Math.PI;
  const targets = [];
  for (const distance of [90, 150, 220]) for (const route of ['main', 'bridge']) {
    const p = route === 'main' ? course.sampleAtDistance(entry + distance) : branchSample(distance);
    const position = new Vector3(p.x, p.y + 1, p.z);
    const projected = position.clone().project(rig.camera);
    direction.subVectors(position, rig.camera.position); const length = direction.length(); direction.normalize();
    ray.set(rig.camera.position, direction); ray.far = length - 1;
    const rockHit = ray.intersectObjects(rocks, true)[0];
    let minimumGroundEnvelopeClearance = Infinity;
    for (let along = 2; along < length - 3; along += 2) {
      const q = rig.camera.position.clone().addScaledVector(direction, along);
      minimumGroundEnvelopeClearance = Math.min(minimumGroundEnvelopeClearance,
        q.y - race.terrain.heightAt(q.x, q.z));
    }
    targets.push({ route, canonicalAheadM: distance, projected: projected.toArray(),
      insideLens: Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && projected.z < 1,
      currentDividerMeshOccludes: Boolean(rockHit), minimumGroundEnvelopeClearance });
  }
  poses.push({ approach, path, position: subject.position.toArray(), camera: rig.camera.position.toArray(),
    yawDegrees, junctionWeight: subject.junctionWeight, targets });
}
rig.dispose();
gltf.scene.traverse(object => { if (object instanceof Mesh) object.geometry.dispose(); });
const sources = ['src/camera/CourseJunctionFraming.ts', 'src/camera/CinematicCamera.ts', 'src/game/race/inkstormLayout.ts',
  'src/render/app/GameApp.ts', 'src/game/race/branches.ts', 'src/game/race/CourseGulfField.ts',
  'src/render/inkstorm/InkstormRockGrounding.ts', 'public/assets/inkstorm/canyon-buttress.glb'];
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/framing.json`, JSON.stringify({ generatedAt: new Date().toISOString(),
  limitation: 'CPU projection and current divider GLB ray tests; not an in-world image, human readability, full-world occlusion or FPS acceptance. Height-envelope rays conservatively include raised bridge support.',
  hashes: Object.fromEntries(sources.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  branchHash: createHash('sha256').update(JSON.stringify(course.branches)).digest('hex'),
  checkpointHash: createHash('sha256').update(JSON.stringify(course.checkpoints)).digest('hex'),
  placements, clearances, poses }, null, 2) + '\n');
console.log(JSON.stringify(poses.map(pose => ({ approach: pose.approach, path: pose.path, yaw: pose.yawDegrees,
  inLens: pose.targets.filter(target => target.insideLens).length,
  rockOccluded: pose.targets.filter(target => target.currentDividerMeshOccludes).length,
  groundOccluded: pose.targets.filter(target => target.minimumGroundEnvelopeClearance < 0).length })), null, 2));

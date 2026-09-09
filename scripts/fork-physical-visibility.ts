/** CPU recreation of the shipped road/clipmap displacement. No browser/renderer. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { CourseBranchDefinition } from '../src/game/race/types';
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createProceduralPodraceCourse } from '../src/game/race/course';
import { createCourseGulfField } from '../src/game/race/CourseGulfField';
import { createBridgeHeightSampler } from '../src/game/race/bridgeSurface';
import { sampleTerrainHeight } from '../src/render/terrain/terrainMath';
import { TerrainSystem } from '../src/render/terrain/TerrainSystem';
import { createInkstormRoad } from '../src/render/inkstorm/InkstormRoad';
import { createInkstormBridge } from '../src/render/inkstorm/InkstormBridge';
import { CinematicCamera } from '../src/camera/CinematicCamera';
import { updateCourseJunctionFraming } from '../src/camera/CourseJunctionFraming';

const base = { heightAt: sampleTerrainHeight }, seed = 0x494e4b53;
const baseCourse = createProceduralPodraceCourse(base, seed), branch = baseCourse.branches.find(b => b.elevated)!;
const entry = branch.entryProgress * baseCourse.totalLength;
const solid = new MeshBasicMaterial({ side: DoubleSide });
const ray = new Raycaster(), down = new Vector3(0, -1, 0), direction = new Vector3();
const results = [];
function branchPoint(distance: number, branch: CourseBranchDefinition) {
  const progress = (entry + distance) / baseCourse.totalLength;
  let i = 0; while (i < branch.points.length - 2 && branch.points[i + 1]!.canonicalProgress < progress) i++;
  const a = branch.points[i]!, b = branch.points[i + 1]!;
  const t = (progress - a.canonicalProgress) / (b.canonicalProgress - a.canonicalProgress);
  const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
  return { x: a.x + dx * t, z: a.z + dz * t, rightX: dz / length, rightZ: -dx / length, width: a.width };
}
const originalBranches = JSON.parse(readFileSync('docs/inkstorm-overhaul/fixtures/fork-course7.json', 'utf8')).branches as CourseBranchDefinition[];
for (const stage of ['original-path', 'diverged-path', 'profile-and-divergence']) {
  const enabled = stage === 'profile-and-divergence';
  const branches = stage === 'original-path' ? originalBranches : baseCourse.branches;
  const branch = branches.find(value => value.elevated)!;
  // Read-only adapter for the saved original path; no runtime racer mutation.
  const branchCourse = new Proxy(baseCourse, { get(target, key) {
    if (key === 'branches') return branches;
    const value = Reflect.get(target, key, target);
    return typeof value === 'function' ? value.bind(target) : value;
  } });
  const field = createCourseGulfField(branchCourse, { forkApproach: enabled })!;
  const ground = { heightAt: (x: number, z: number) => sampleTerrainHeight(x, z, field) };
  const supported = createBridgeHeightSampler(ground, branches);
  const course = createProceduralPodraceCourse(base, seed);
  const data = course.getRenderData(1536);
  const makeRoad = (raised: boolean) => {
    const mesh = createInkstormRoad(raised ? branch.points.map(p => ({ ...p, progress: p.canonicalProgress, tag: 'hairpin' as const })) : data.points, !raised, raised);
    const positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) positions.setY(i, raised ? positions.getY(i) + .04 : ground.heightAt(positions.getX(i), positions.getZ(i)) + .45);
    mesh.geometry.computeBoundingSphere();
    mesh.material.dispose();
    const result = new Mesh(mesh.geometry, solid); result.name = raised ? 'bridge-road' : 'main-road';
    return result;
  };
  const mainRoad = makeRoad(false), branchRoad = makeRoad(true), bridgeMesh = createInkstormBridge(branch, ground.heightAt);
  bridgeMesh.name = 'bridge-structure';
  const terrain = new TerrainSystem({ levels: 3 }), rig = new CinematicCamera();
  for (const approach of [-60, -20, 0, 20]) for (const lateral of [-6, 0, 6]) {
    const p = course.sampleAtDistance(entry + approach);
    const x = p.x + p.rightX * lateral, z = p.z + p.rightZ * lateral, speed = 113.76;
    const forward = new Vector3(p.tangentX, 0, p.tangentZ), position = new Vector3(x, supported.heightAt(x, z) + 2.25, z);
    const ahead = course.sampleAtDistance(entry + approach + 55 + Math.min(70, speed * .3));
    const target = new Vector3(), weight = updateCourseJunctionFraming(branchCourse, p.progress, position, forward, target);
    rig.snap({ position, forward, velocity: forward.clone().multiplyScalar(speed), speed,
      junctionLookAhead: target, junctionWeight: weight,
      routeLookAhead: new Vector3(ahead.x, ground.heightAt(ahead.x, ahead.z) + 3, ahead.z) });
    rig.camera.updateMatrixWorld(true);
    // The three near ring topologies and continuous camera-centered placement
    // match TerrainSystem. Evaluate the same bilinear field at every vertex.
    const renderedTerrain = terrain.meshes.map(source => {
      const geometry = source.geometry.clone(), positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) + rig.camera.position.x, z = positions.getZ(i) + rig.camera.position.z;
        positions.setXYZ(i, x, positions.getY(i) + ground.heightAt(x, z), z);
      }
      geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, solid); mesh.name = 'terrain-clipmap'; return mesh;
    });
    const samples = [];
    for (const along of [90, 120, 150, 180, 220]) for (const route of ['main', 'bridge']) for (const across of [-.8, -.4, 0, .4, .8]) {
      const p = route === 'main' ? course.sampleAtDistance(entry + along) : branchPoint(along, branch);
      const x = p.x + p.rightX * p.width * across, z = p.z + p.rightZ * p.width * across;
      ray.set(new Vector3(x, 100, z), down); ray.far = 300;
      const road = route === 'main' ? mainRoad : branchRoad;
      const roadHit = ray.intersectObject(road)[0];
      if (!roadHit) throw new Error('Road triangle missing under diagnostic lane point');
      const target = roadHit.point.clone().add(new Vector3(0, .05, 0));
      direction.subVectors(target, rig.camera.position); const distance = direction.length(); direction.normalize();
      ray.set(rig.camera.position, direction); ray.far = distance - .5;
      const occluder = ray.intersectObjects([...renderedTerrain, mainRoad, branchRoad, bridgeMesh])[0];
      const ndc = target.clone().project(rig.camera);
      samples.push({ route, along, across, visible: !occluder && Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1,
        occluder: occluder?.object.name ?? null, faceIndex: occluder?.faceIndex ?? null, hitPoint: occluder?.point.toArray() ?? null, hitDistance: occluder?.distance ?? null, targetDistance: distance, projected: ndc.toArray() });
    }
    results.push({ stage, enabled, approach, lateral, camera: rig.camera.position.toArray(), samples });
    for (const mesh of renderedTerrain) mesh.geometry.dispose();
  }
  mainRoad.geometry.dispose(); branchRoad.geometry.dispose(); bridgeMesh.geometry.dispose(); bridgeMesh.dispose();
  terrain.dispose(); rig.dispose();
}
solid.dispose();
const beforeField = createCourseGulfField(baseCourse, { forkApproach: false })!;
const afterField = createCourseGulfField(baseCourse)!;
let previousMaximumGrade = 0, maximumGrade = 0, maximumChangedGrade = 0, maximumCut = 0;
for (let distance = 0; distance <= 460; distance += 2) {
  const a = baseCourse.sampleAtDistance(entry + distance), b = baseCourse.sampleAtDistance(entry + distance + 8);
  const oldA = sampleTerrainHeight(a.x, a.z, beforeField), oldB = sampleTerrainHeight(b.x, b.z, beforeField);
  const newA = sampleTerrainHeight(a.x, a.z, afterField), newB = sampleTerrainHeight(b.x, b.z, afterField);
  const grade = Math.abs(newB - newA) / 8;
  previousMaximumGrade = Math.max(previousMaximumGrade, Math.abs(oldB - oldA) / 8);
  maximumGrade = Math.max(maximumGrade, grade);
  maximumCut = Math.max(maximumCut, oldA - newA);
  if (Math.abs(oldA - newA) > .1 || Math.abs(oldB - newB) > .1) maximumChangedGrade = Math.max(maximumChangedGrade, grade);
}
const summary = results.map(pose => ({ stage: pose.stage, enabled: pose.enabled, approach: pose.approach, lateral: pose.lateral,
  main: pose.samples.filter(s => s.route === 'main' && s.visible).length,
  bridge: pose.samples.filter(s => s.route === 'bridge' && s.visible).length }));
mkdirSync('output/terrain/fork-physical-profile', { recursive: true });
writeFileSync('output/terrain/fork-physical-profile/rendered-visibility.json', JSON.stringify({
  limitation: 'CPU road/clipmap/bridge triangle rays, with exact shipping topology and shared Float32 field. Does not include all scenery, other racers, fragment transparency, GPU precision differences or human readability.',
  physicalProfile: { entryDistance: entry, scope: 'Centreline, entry through +460m, 2m samples and 8m forward grade; comparison is the same newly diverged branch with and without the main carve.',
    previousMaximumGrade, maximumGrade, maximumChangedGrade, maximumCut,
    textureBytes: afterField.grids.reduce((sum, grid) => sum + grid.values.byteLength, 0),
    finishGridMinimum: afterField.grids[1].values.reduce((minimum, value) => Math.min(minimum, value), 0) },
  hashes: Object.fromEntries(['src/game/race/branches.ts', 'src/game/race/CourseGulfField.ts',
    'src/render/inkstorm/InkstormRoad.ts', 'src/render/inkstorm/InkstormBridge.ts',
    'src/camera/CinematicCamera.ts', 'src/camera/CourseJunctionFraming.ts',
    'docs/inkstorm-overhaul/fixtures/fork-course7.json'].map(path =>
      [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  results, summary }, null, 2));
console.log(summary);

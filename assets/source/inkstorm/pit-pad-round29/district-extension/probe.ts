import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createProceduralPodraceCourse } from '../../../../../src/game/race/course';
import { getInkstormLayout } from '../../../../../src/game/race/inkstormLayout';
import { CourseGulfField } from '../../../../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../../../../src/render/terrain/terrainMath';
import { TerrainSystem } from '../../../../../src/render/terrain/TerrainSystem';
import { createPitPadField as createPreviousPitField } from '../../../../../src/game/race/PitPadField';
import { createPitPadField, padLocalToWorld, type PitPad } from './PitPadField';

const dir = 'assets/source/inkstorm/pit-pad-round29/district-extension';
const hash = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const saved = JSON.parse(readFileSync('assets/source/inkstorm/launch-composition-round28/candidate-field.json', 'utf8'));
const grids = saved.grids.map((g: any) => {
  const bytes = readFileSync('assets/source/inkstorm/launch-composition-round28/' + g.filename);
  assert.equal(hash(bytes), g.sha256);
  return { ...g, values: new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)) };
});
const gulf = new CourseGulfField(grids, saved.launchProfile);
const pitCameras = JSON.parse(readFileSync('output/gauntlet/grid-grounding-round29-before/receipts.json', 'utf8')).views.map((v: any) => v.position);

const districtCameras = JSON.parse(readFileSync('output/gauntlet/grid-district-round29-central-before/receipts.json', 'utf8')).views.map((v: any) => v.position);
// Clip actual indexed terrain triangles against the exact rotated source slab.
// Maxima of a linear triangle over the clipped polygon occur at these vertices.
type Vertex = [number, number, number];
function clippedTriangle(triangle: Vertex[], pad: PitPad): Vertex[] {
  const c = Math.cos(pad.yaw), s = Math.sin(pad.yaw);
  let poly = triangle.map(([x, y, z]) => [(x - pad.centerX) * c - (z - pad.centerZ) * s, y,
    (x - pad.centerX) * s + (z - pad.centerZ) * c] as Vertex);
  for (const [axis, side, bound] of [[0, -1, pad.halfX], [0, 1, pad.halfX], [2, -1, pad.halfZ], [2, 1, pad.halfZ]]) {
    const next: Vertex[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!, b = poly[(i + 1) % poly.length]!, da = a[axis!]! * side! - bound!, db = b[axis!]! * side! - bound!;
      if (da <= 0) next.push(a);
      if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
        const t = da / (da - db); next.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    }
    poly = next; if (!poly.length) break;
  }
  return poly;
}
function meshCeiling(terrain: TerrainSystem, camera: number[], pad: PitPad, heightAt: (x: number, z: number) => number) {
  let maxHeight = -Infinity, triangles = 0, maxLod = 0;
  const extent = Math.hypot(pad.halfX, pad.halfZ) + 25;
  for (const mesh of terrain.meshes) {
    const g = mesh.geometry, pos = g.getAttribute('position'), index = g.index!;
    const vertices = new Map<number, Vertex>();
    const vertex = (i: number): Vertex => {
      const old = vertices.get(i); if (old) return old;
      const x = pos.getX(i) + camera[0]!, z = pos.getZ(i) + camera[2]!;
      const v: Vertex = [x, heightAt(x, z) + pos.getY(i), z]; vertices.set(i, v); return v;
    };
    for (let i = 0; i < index.count; i += 3) {
      const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      if (ids.every(id => Math.abs(pos.getX(id) + camera[0]! - pad.centerX) > extent || Math.abs(pos.getZ(id) + camera[2]! - pad.centerZ) > extent)) continue;
      const clipped = clippedTriangle(ids.map(vertex), pad); if (!clipped.length) continue;
      triangles++; maxLod = Math.max(maxLod, Number(mesh.userData.terrainLod));
      for (const v of clipped) maxHeight = Math.max(maxHeight, v[1]);
    }
  }
  return { triangles, maxLod, maxHeight, maxAboveSlabBottom: maxHeight - pad.anchorHeight - pad.slabBottomOffset };
}
const reports = [];
for (const seed of [0x494e4b53, 42, 1234]) {
  const begin = performance.now();
  const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, seed);
  const before = (x: number, z: number) => sampleTerrainHeight(x, z) + (seed === 0x494e4b53 ? gulf.sampleOffset(x, z) : 0);
  const route = Array.from({ length: 2048 }, (_, i) => course.samplePlanAtProgress(i / 2048));
  const placements = getInkstormLayout(course);
  const previous = createPreviousPitField(placements, route, course.branches, before);
  const candidateStarted = performance.now();
  const field = createPitPadField(placements, route, course.branches, before);
  const candidateBakeMs = performance.now() - candidateStarted;
  const bakeMs = performance.now() - begin;
  const after = (x: number, z: number) => before(x, z) + field.sampleOffset(x, z);
  let corridorProbeCount = 0, maxCorridorDelta = 0;
  for (let i = 0; i < 8192; i++) {
    const p = course.samplePlanAtProgress((i + .371) / 8192);
    for (const lateral of [-p.width - 10, -p.width, 0, p.width, p.width + 10]) {
      const x = p.x + p.rightX * lateral, z = p.z + p.rightZ * lateral;
      for (const [dx, dz] of [[0, 0], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]]) {
        maxCorridorDelta = Math.max(maxCorridorDelta, Math.abs(field.sampleOffset(x + dx!, z + dz!))); corridorProbeCount++;
      }
    }
  }
  for (const branch of course.branches) for (let i = 0; i < branch.points.length - 1; i++) {
    const a = branch.points[i]!, b = branch.points[i + 1]!, dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    for (const t of [0, .123, .5, .877, 1]) {
      const width = a.width + (b.width - a.width) * t;
      for (const lateral of [-width - 10, -width, 0, width, width + 10]) {
        const x = a.x + dx * t + dz / length * lateral, z = a.z + dz * t - dx / length * lateral;
        for (const [nx, nz] of [[0, 0], [1.15, 0], [-1.15, 0], [0, 1.15], [0, -1.15]]) {
          maxCorridorDelta = Math.max(maxCorridorDelta, Math.abs(field.sampleOffset(x + nx!, z + nz!))); corridorProbeCount++;
        }
      }
    }
  }
  assert.equal(maxCorridorDelta, 0);
  const terrain = seed === 0x494e4b53 ? new TerrainSystem() : null;
  if (terrain) terrain.setCourseGulfField(gulf);
  const pads = field.pads.map((pad, padIndex) => {
    let samples = 0, minHeight = Infinity, maxHeight = -Infinity, beforeMax = -Infinity, maxTargetError = 0, aboveSlabBottom = 0, modifiedSamples = 0, maximumPriorCoreDelta = 0;
    const belowTargetCounts = { halfMetre: 0, twoMetres: 0, fiveMetres: 0 };
    for (let ix = 0; ix <= 150; ix++) for (let iz = 0; iz <= 61; iz++) {
      const [x, z] = padLocalToWorld(pad, -pad.halfX + ix / 150 * pad.halfX * 2, -pad.halfZ + iz / 61 * pad.halfZ * 2);
      const old = before(x, z) + previous.sampleOffset(x, z), h = after(x, z); samples++;
      minHeight = Math.min(minHeight, h); maxHeight = Math.max(maxHeight, h); beforeMax = Math.max(beforeMax, old);
      maxTargetError = Math.max(maxTargetError, Math.abs(h - pad.targetHeight));
      maximumPriorCoreDelta = Math.max(maximumPriorCoreDelta, Math.abs(h - old));
      belowTargetCounts.halfMetre += Number(h < pad.targetHeight - .5); belowTargetCounts.twoMetres += Number(h < pad.targetHeight - 2); belowTargetCounts.fiveMetres += Number(h < pad.targetHeight - 5);
      aboveSlabBottom += Number(h > pad.anchorHeight + pad.slabBottomOffset); modifiedSamples += Number(Math.abs(h - old) > .001);
    }
    const apron = [];
    for (const side of [-1, 1]) for (const axis of [0, 1]) {
      let previous = 0, maxStep = 0, maxSlope = 0, outsideDelta = 0;
      const points = [];
      for (let distance = 0; distance <= 40; distance += .5) {
        const [x, z] = padLocalToWorld(pad, axis === 0 ? side * (pad.halfX + distance) : 0, axis === 1 ? side * (pad.halfZ + distance) : 0);
        const h = after(x, z), delta = field.sampleOffset(x, z);
        if (distance > 0) { maxStep = Math.max(maxStep, Math.abs(h - previous)); maxSlope = Math.max(maxSlope, Math.abs(h - previous) / .5); }
        if (distance >= 37) outsideDelta = Math.max(outsideDelta, Math.abs(delta));
        if (distance % 4 === 0) points.push({ distance, height: h, delta });
        previous = h;
      }
      apron.push({ side, axis, maxHalfMetreStep: maxStep, maxSlope, outsideDelta, points });
    }
    const familyIndex = pad.family === 'pit-district' ? padIndex - 3 : padIndex;
    const camera = pad.family === 'pit-district' ? districtCameras[familyIndex] : pitCameras[familyIndex];
    const visualMesh = terrain ? meshCeiling(terrain, camera, pad, after) : null;
    const meshPhaseChecks = terrain ? [[.75, 0], [0, .75], [3, 3], [-3, -3]].map(([dx, dz]) => {
      const shiftedCamera = [...camera]; shiftedCamera[0] += dx!; shiftedCamera[2] += dz!;
      return { dx, dz, ...meshCeiling(terrain, shiftedCamera, pad, after) };
    }) : [];
    return { ...pad, samples, minHeight, maxHeight, beforeMax, beforeAboveSlabBottom: beforeMax - pad.anchorHeight - pad.slabBottomOffset,
      maxAboveSlabBottom: maxHeight - pad.anchorHeight - pad.slabBottomOffset, maxTargetError, aboveSlabBottom, modifiedSamples, maximumPriorCoreDelta, belowTargetCounts,
      savedAnchorDelta: field.anchorHeight(pad.id)! - before(pad.x, pad.z), priorPadOffsetAtAnchor: previous.sampleOffset(pad.x, pad.z),
      gradedGroundAtAnchorDelta: field.sampleOffset(pad.x, pad.z), visualMesh, meshPhaseChecks, apron };
  });
  for (const pad of pads) {
    assert.equal(pad.savedAnchorDelta, 0);
    if (pad.accepted) assert.equal(pad.aboveSlabBottom, 0, `${seed}/${pad.id} has terrain inside source footprint`);
    if (pad.visualMesh) assert(pad.visualMesh.maxAboveSlabBottom < -.1);
    for (const phase of pad.meshPhaseChecks) assert(phase.maxAboveSlabBottom < -.1);
    // Different atlas origins can change double subtraction at ~1e-14 m;
    // road/normal offsets above still require literal zero, independently.
    if (pad.family === 'pit-complex') assert(pad.maximumPriorCoreDelta < 1e-10, 'district extension changed an existing pit core');
    // Adjacent pad aprons may contribute outside this one pad; receipt records that overlap.
  }
  if (seed === 42) assert.equal(pads[2]!.declineReason, 'protected-road-overlap');
  terrain?.dispose();
  const g = field.grid!;
  const bytes = new Uint8Array(g.values.buffer), gridHash = hash(bytes);
  writeFileSync(`${dir}/seed-${seed}.f32`, bytes);
  let minOffset = Infinity, maxOffset = -Infinity, changedTexels = 0, nonFinite = 0;
  for (const v of g.values) { minOffset = Math.min(minOffset, v); maxOffset = Math.max(maxOffset, v); changedTexels += Number(v !== 0); nonFinite += Number(!Number.isFinite(v)); }
  assert.equal(nonFinite, 0);
  let gpuParityMaxError = 0;
  for (let i = 0; i < 2000; i++) {
    const gx = ((i * 73) % (g.columns - 2)) + .37, gz = ((i * 47) % (g.rows - 2)) + .81, ix = Math.floor(gx), iz = Math.floor(gz), at = iz * g.columns + ix;
    const mix = (a: number, b: number, t: number) => a * (1 - t) + b * t;
    const expected = mix(mix(g.values[at]!, g.values[at + 1]!, .37), mix(g.values[at + g.columns]!, g.values[at + g.columns + 1]!, .37), .81);
    gpuParityMaxError = Math.max(gpuParityMaxError, Math.abs(field.sampleOffset(g.minX + gx, g.minZ + gz) - expected));
  }
  assert(gpuParityMaxError < 1e-8);
  reports.push({ seed, signature: course.signature, bakeMs, candidateBakeMs, grid: { ...g, values: undefined, sha256: gridHash, bytes: bytes.length, minOffset, maxOffset, changedTexels },
    corridorProbeCount, maxCorridorDelta, gpuParityProbes: 2000, gpuParityMaxError, pads });
  console.log(JSON.stringify({ seed, signature: course.signature, bakeMs, bytes: bytes.length, minOffset, maxOffset, changedTexels, corridorProbeCount, maxCorridorDelta,
    pads: pads.map(p => ({ id: p.id, accepted: p.accepted, minRoadClearance: p.minRoadClearance, maxAboveSlabBottom: p.maxAboveSlabBottom, aboveSlabBottom: p.aboveSlabBottom, visualMesh: p.visualMesh })) }));
}
const result = { scope: 'Isolated staged CPU field, source-slab and real indexed terrain geometry analysis. No runtime, GPU or FPS acceptance.',
  candidateSourceSha256: hash(readFileSync(`${dir}/PitPadField.ts`)), gulfArraysUnchanged: grids.map((g: any) => ({ name: g.name, sha256: hash(new Uint8Array(g.values.buffer)), expected: g.sha256 })), reports };
for (const g of result.gulfArraysUnchanged) assert.equal(g.sha256, g.expected);
writeFileSync(`${dir}/receipt.json`, JSON.stringify(result, null, 2) + '\n');

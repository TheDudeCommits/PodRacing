/** CPU-only construction study. Importing runs the bounded canonical study, not runtime integration. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createProceduralPodraceCourse } from '../../../../../src/game/race/course';
import { CourseGulfField } from '../../../../../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../../../../../src/render/terrain/terrainMath';
import { PitPadField, padLocalToWorld, type PitPad } from '../district-extension/PitPadField';

const dir = 'assets/source/inkstorm/pit-pad-round29/access-study';
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const sourceReceipt = JSON.parse(readFileSync('assets/source/inkstorm/pit-pad-round29/district-extension/receipt.json', 'utf8'));
const report = sourceReceipt.reports[0];
const bytes = readFileSync('assets/source/inkstorm/pit-pad-round29/district-extension/seed-1229867859.f32');
assert.equal(sha(bytes), 'a415f1a18f0dbcc386b38fe5878e33dd2429bd9ae401099135f487ac065c3b64');
const pads: PitPad[] = report.pads;
const field = new PitPadField(pads, { ...report.grid, values: new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)) });
const saved = JSON.parse(readFileSync('assets/source/inkstorm/launch-composition-round28/candidate-field.json', 'utf8'));
const gulfHashes: string[] = [];
const grids = saved.grids.map((g: any) => {
  const data = readFileSync('assets/source/inkstorm/launch-composition-round28/' + g.filename);
  assert.equal(sha(data), g.sha256); gulfHashes.push(sha(data));
  return { ...g, values: new Float32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)) };
});
const gulf = new CourseGulfField(grids, saved.launchProfile);
const heightAt = (x: number, z: number) => sampleTerrainHeight(x, z) + gulf.sampleOffset(x, z) + field.sampleOffset(x, z);
const localHeight = (pad: PitPad, x: number, z: number) => heightAt(...padLocalToWorld(pad, x, z));
const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, 0x494e4b53);
type Segment = { ax: number; az: number; dx: number; dz: number; lengthSq: number; width: number };
const segments: Segment[] = [];
function addRoute(points: readonly { x: number; z: number; width: number }[], closed: boolean) {
  for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!, dx = b.x - a.x, dz = b.z - a.z;
    segments.push({ ax: a.x, az: a.z, dx, dz, lengthSq: dx * dx + dz * dz, width: Math.max(a.width, b.width) });
  }
}
addRoute(Array.from({ length: 4096 }, (_, i) => course.samplePlanAtProgress(i / 4096)), true);
for (const branch of course.branches) addRoute(branch.points, false);
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
// Main plus branch segments intersecting a 220 m local envelope; all omitted
// segments are farther away than this study's <= 120 m construction radius.
const nearby = new Map(pads.map(pad => [pad.id, segments.filter(s => {
  const t = clamp(((pad.centerX - s.ax) * s.dx + (pad.centerZ - s.az) * s.dz) / Math.max(s.lengthSq, 1e-9));
  return Math.hypot(pad.centerX - s.ax - s.dx * t, pad.centerZ - s.az - s.dz * t) < 220 + s.width;
})]));
function roadClearance(pad: PitPad, lx: number, lz: number): number {
  const [x, z] = padLocalToWorld(pad, lx, lz); let result = Infinity;
  for (const s of nearby.get(pad.id)!) {
    const t = clamp(((x - s.ax) * s.dx + (z - s.az) * s.dz) / Math.max(s.lengthSq, 1e-9));
    result = Math.min(result, Math.hypot(x - s.ax - s.dx * t, z - s.az - s.dz * t) - s.width);
  }
  return result;
}
const frontProfiles = pads.map(pad => {
  const entranceX = pad.family === 'pit-complex' ? -9 : -2 * pad.halfX / 60;
  const top = pad.anchorHeight + (pad.family === 'pit-complex' ? 2.45 : 1.5);
  return { id: pad.id, top, entranceX, frontZ: pad.halfZ,
    profile: Array.from({ length: 13 }, (_, i) => {
      const out = i * 2, z = pad.halfZ + out, height = localHeight(pad, entranceX, z);
      return { out, height, drop: top - height, roadClearance: roadClearance(pad, entranceX, z) };
    }) };
});
writeFileSync(`${dir}/front-profiles.json`, JSON.stringify({ sourceFieldSha: sha(bytes), gulfHashes, frontProfiles }, null, 2) + '\n');
type Point = [number, number];
function otherPadClearance(pad: PitPad, lx: number, lz: number): number {
  const [x, z] = padLocalToWorld(pad, lx, lz); let result = Infinity;
  for (const other of pads) {
    if (other.id === pad.id) continue;
    const dx = x - other.centerX, dz = z - other.centerZ, c = Math.cos(other.yaw), s = Math.sin(other.yaw);
    const ax = Math.abs(dx * c - dz * s) - other.halfX, az = Math.abs(dx * s + dz * c) - other.halfZ;
    result = Math.min(result, Math.hypot(Math.max(0, ax), Math.max(0, az)) + Math.min(0, Math.max(ax, az)));
  }
  return result;
}
// Full construction width includes clear 2.4 m path plus 0.4 m on each side
// for rails/stringers. Sampled 0.25 m ribbons retain a 0.4 m road reserve.
const OUTER_HALF_WIDTH = 1.6, MIN_SAMPLED_ROAD_CLEARANCE = 13.0;
function ribbon(pad: PitPad, a: Point, b: Point, halfWidth: number, fn: (x: number, z: number, t: number) => void) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz), nx = -dz / length, nz = dx / length;
  const count = Math.ceil(length / .25);
  for (let i = 0; i <= count; i++) for (const across of [-halfWidth, -halfWidth / 2, 0, halfWidth / 2, halfWidth]) {
    const t = i / count; fn(a[0] + dx * t + nx * across, a[1] + dz * t + nz * across, t);
  }
}
function terrainPatch(pad: PitPad, x: number, z: number, half = 1.6, ux = 1, uz = 0) {
  let min = Infinity, max = -Infinity, slope = 0;
  for (let ix = -half; ix <= half + 1e-5; ix += .4) for (let iz = -half; iz <= half + 1e-5; iz += .4) {
    const px = x + ux * ix - uz * iz, pz = z + uz * ix + ux * iz;
    const h = localHeight(pad, px, pz); min = Math.min(min, h); max = Math.max(max, h);
    slope = Math.max(slope, Math.hypot(localHeight(pad, px + .2, pz) - localHeight(pad, px - .2, pz),
      localHeight(pad, px, pz + .2) - localHeight(pad, px, pz - .2)) / .4);
  }
  return { min, max, range: max - min, slope };
}
function stairProfile(top: number, bottom: number, length: number) {
  const rise = top - bottom, risers = Math.ceil(rise / .18), landings = Math.floor((risers - 1) / 12);
  if (risers < 1 || risers > 100 || length < risers * .3 + landings * 1.5) return null;
  const riser = rise / risers, tread = (length - landings * 1.5) / risers;
  if (tread > .55) return null;
  const pieces: { kind: 'tread' | 'landing'; start: number; end: number; top: number }[] = [];
  let distance = 0;
  for (let i = 1; i <= risers; i++) {
    pieces.push({ kind: 'tread', start: distance, end: distance + tread, top: top - i * riser }); distance += tread;
    if (i % 12 === 0 && i !== risers) { pieces.push({ kind: 'landing', start: distance, end: distance + 1.5, top: top - i * riser }); distance += 1.5; }
  }
  return { risers, riser, tread, landings, length, pieces };
}
const studies = pads.map(pad => {
  const entranceX = pad.family === 'pit-complex' ? -9 : -2 * pad.halfX / 60;
  const top = pad.anchorHeight + (pad.family === 'pit-complex' ? 2.45 : 1.5), front = pad.halfZ;
  const candidates: any[] = [], rejected: any[] = [];
  let searched = 0, feasibleProfile = 0, legalFootprint = 0, grounded = 0;
  for (const outStart of [7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 12, 13, 14]) for (const outEnd of [7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 12, 13, 14, 15])
    for (const direction of [-1, 1]) for (let run = 5; run <= 68; run += 1) {
      searched++;
      const topLandingCenter: Point = [entranceX, front + outStart], b: Point = [entranceX + direction * run, front + outEnd];
      const totalLength = Math.hypot(b[0] - topLandingCenter[0], b[1] - topLandingCenter[1]);
      const ux = (b[0] - topLandingCenter[0]) / totalLength, uz = (b[1] - topLandingCenter[1]) / totalLength;
      const a: Point = [topLandingCenter[0] + ux * 1.6, topLandingCenter[1] + uz * 1.6];
      // Keep the full stair and landings within the corresponding frontage.
      if (Math.abs(b[0]) > pad.halfX - 4) continue;
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const quickGround = localHeight(pad, b[0], b[1]), quick = stairProfile(top, quickGround + .1, length);
      if (!quick) continue;
      // End orientation uses a conservative world-local square enclosing the
      // 2.4 m clear landing. Exact footprint is generated after selection.
      const endPatch = terrainPatch(pad, b[0], b[1], 1.6, ux, uz);
      if (endPatch.range > 1.3 || endPatch.slope > .6) continue;
      const bottom = endPatch.max + .12;
      const profile = stairProfile(top, bottom, length); if (!profile) continue; feasibleProfile++;
      let minRoad = Infinity, minOther = Infinity, minimumWalkingClearance = Infinity;
      const check = (x: number, z: number, walk: number) => {
        minRoad = Math.min(minRoad, roadClearance(pad, x, z)); minOther = Math.min(minOther, otherPadClearance(pad, x, z));
        minimumWalkingClearance = Math.min(minimumWalkingClearance, walk - localHeight(pad, x, z));
      };
      // Bottom landing extends 1.6 m each side of end; top bridge overlaps the
      // inspected source landing and is level until the first descending step.
      ribbon(pad, [entranceX, front - 1.6], topLandingCenter, OUTER_HALF_WIDTH, (x, z) => check(x, z, top));
      for (let x = -1.6; x <= 1.601; x += .4) for (let z = -1.6; z <= 1.601; z += .4)
        check(topLandingCenter[0] + ux * x - uz * z, topLandingCenter[1] + uz * x + ux * z, top);
      ribbon(pad, a, b, OUTER_HALF_WIDTH, (x, z, t) => {
        const piece = profile.pieces.find(p => p.end >= t * length - 1e-8)!; check(x, z, piece.top);
      });
      for (let x = -1.6; x <= 1.601; x += .4) for (let z = -1.6; z <= 1.601; z += .4) check(b[0] + ux * x - uz * z, b[1] + uz * x + ux * z, bottom);
      // A short, closed terminal ramp joins the flat bottom landing to the
      // actual irregular ground. Its outer edge follows sampled ground, with
      // a 4 cm exposed threshold and a buried 30 cm structural shoe.
      const nx = -uz, nz = ux;
      const rampStart: Point = [b[0] + ux * 1.6, b[1] + uz * 1.6], rampLength = 3;
      const contacts: { across: number; x: number; z: number; ground: number; top: number }[] = [];
      let maxTerminalGrade = 0, maxContactCrossGrade = 0, previousContact: number | undefined;
      for (let across = -1.6; across <= 1.601; across += .4) {
        const x = rampStart[0] + ux * rampLength + nx * across, z = rampStart[1] + uz * rampLength + nz * across;
        const ground = localHeight(pad, x, z), contact = ground + .04;
        maxTerminalGrade = Math.max(maxTerminalGrade, Math.abs(contact - bottom) / rampLength);
        if (previousContact !== undefined) maxContactCrossGrade = Math.max(maxContactCrossGrade, Math.abs(contact - previousContact) / .4);
        previousContact = contact; contacts.push({ across, x, z, ground, top: contact });
        let previousRamp = bottom;
        for (let i = 0; i <= 12; i++) {
          const t = i / 12, walk = bottom * (1 - t) + contact * t + .12 * Math.sin(Math.PI * t);
          if (i > 0) maxTerminalGrade = Math.max(maxTerminalGrade, Math.abs(walk - previousRamp) / (rampLength / 12));
          previousRamp = walk; check(rampStart[0] + ux * rampLength * t + nx * across,
            rampStart[1] + uz * rampLength * t + nz * across, walk);
        }
      }
      if (minRoad < MIN_SAMPLED_ROAD_CLEARANCE || minOther < .75 || minimumWalkingClearance < .025 || maxTerminalGrade > .5 || maxContactCrossGrade > .3)
        rejected.push({ a, b, minRoad, minOther, minimumWalkingClearance, maxTerminalGrade, maxContactCrossGrade, endPatch,
          penalty: Math.max(0, 13 - minRoad) * 100 + Math.max(0, .75 - minOther) * 100 + Math.max(0, .025 - minimumWalkingClearance) * 10 + Math.max(0, maxTerminalGrade - .5) * 10 + Math.max(0, maxContactCrossGrade - .3) * 10 });
      if (minRoad < MIN_SAMPLED_ROAD_CLEARANCE || minOther < .75) continue; legalFootprint++;
      if (minimumWalkingClearance < .025 || maxTerminalGrade > .5 || maxContactCrossGrade > .3) continue; grounded++;
      candidates.push({ kind: 'frontage-crew-stair', topLandingCenter, localStart: a, localEnd: b, top, bottom,
        drop: top - bottom, profile, endPatch, terminal: { start: rampStart, length: rampLength, camber: .12, longitudinalSections: 12, contacts, maxTerminalGrade, maxContactCrossGrade }, minRoadClearance: minRoad,
        minOtherPadClearance: minOther, minimumWalkingClearance, bridgeLength: outStart + 1.6,
        score: length + outStart + endPatch.range * 30 });
    }
  candidates.sort((a, b) => a.score - b.score); rejected.sort((a,b)=>a.penalty-b.penalty);
  return { id: pad.id, family: pad.family, anchorHeight: pad.anchorHeight, top, entranceX, frontZ: front,
    search: { searched, feasibleProfile, legalFootprint, grounded }, selected: candidates[0] ?? null, alternatives: candidates.slice(1, 4), bestDeclined: rejected.slice(0, 2) };
});
writeFileSync(`${dir}/access-candidates.json`, JSON.stringify({ status: 'CPU study only; not integrated or visually accepted', sourceFieldSha: sha(bytes), gulfHashes, studies }, null, 2) + '\n');
console.log(JSON.stringify(studies.map(s => ({id:s.id, search:s.search, selected:s.selected && {a:s.selected.localStart,b:s.selected.localEnd,drop:s.selected.drop,risers:s.selected.profile.risers,tread:s.selected.profile.tread,clear:s.selected.minRoadClearance,terrain:s.selected.minimumWalkingClearance}}))));

// Physical construction geometry: front deck, inboard counterforts, closed
// stems and buried toe footings. This does not paint over or modify terrain.
const construction = pads.map((pad, index) => {
  const study = studies[index]!, access = study.selected;
  const panels: any[] = [], count = Math.ceil(pad.halfX * 2 / 6);
  for (let i = 0; i < count; i++) {
    const x0 = -pad.halfX + pad.halfX * 2 * i / count, x1 = -pad.halfX + pad.halfX * 2 * (i + 1) / count;
    let limit = 6.2;
    if (access && Math.max(x0, Math.min(access.localStart[0], access.localEnd[0]) - 5) <= Math.min(x1, Math.max(access.localStart[0], access.localEnd[0]) + 5))
      limit = Math.min(limit, Math.min(access.localStart[1], access.localEnd[1]) - pad.halfZ - 2.35);
    let selected: any = null;
    for (let out = Math.floor(limit * 10) / 10; out >= .599; out -= .2) {
      let minRoad = Infinity, minOther = Infinity, maxGround = -Infinity, footMin = Infinity, footMax = -Infinity;
      for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / Math.ceil((x1 - x0) / .25)) {
        for (let z = pad.halfZ - .25; z <= pad.halfZ + out + .0001; z += .25) maxGround = Math.max(maxGround, localHeight(pad, x, z));
        for (const z of [pad.halfZ + out - .9, pad.halfZ + out, pad.halfZ + out + .9]) {
          const ground = localHeight(pad, x, z); footMin = Math.min(footMin, ground); footMax = Math.max(footMax, ground);
          minRoad = Math.min(minRoad, roadClearance(pad, x, z)); minOther = Math.min(minOther, otherPadClearance(pad, x, z));
        }
      }
      if (minRoad < 13 || minOther < .75 || maxGround > study.top - .2) continue;
      selected = { localX: [x0, x1], frontZ: pad.halfZ, outerWallZ: pad.halfZ + out,
        top: study.top, deckThickness: .18, stemThickness: .6, footingWidth: 1.8,
        footingTop: footMin - .2, footingBottom: footMin - 1.0, footingGroundMax: footMax,
        exposedWallHeight: study.top - footMin, promenadeWidth: out, minRoadClearance: minRoad,
        minOtherPadClearance: minOther, minimumDeckGroundClearance: study.top - maxGround,
        counterfort: { pitch: 6, inboardProjection: Math.min(out, 1.1), thickness: .45 },
        triangles: { deck: 12, stem: 12, footing: 12, counterfort: 8 },
        purpose: out >= 3.2 ? 'retaining-front-and-service-deck' : 'retaining-return-no-through-access' };
      break;
    }
    panels.push(selected ?? { localX: [x0, x1], declined: true, reason: 'terrain-or-protected-footprint-conflict' });
  }
  const active = panels.filter(p => !p.declined);
  const steps = access?.profile.risers ?? 0, flights = access ? access.profile.landings + 1 : 0;
  const railPosts = access ? Math.ceil((access.profile.length + access.bridgeLength + 6.2) / 1.5) * 2 + 4 : 0;
  const accessTriangles = access ? steps * 12 + (access.profile.landings + 3) * 12 + 24 + railPosts * 12 + (flights + 3) * 4 * 12 + 464 + 10 * 24 : 0;
  return { id: pad.id, family: pad.family, padFrame: { centerX: pad.centerX, centerZ: pad.centerZ, yaw: pad.yaw },
    selectedAccess: access, panels, counts: { panels: active.length, declinedPanels: panels.length - active.length, steps, flights, railPosts },
    budget: { wallTriangles: active.length * 44, accessTriangles, totalHighTriangles: active.length * 44 + accessTriangles,
      totalLodTriangles: active.length * 24 + (access ? 240 : 0) },
    minimumRoadClearance: Math.min(...active.map(p => p.minRoadClearance), access?.minRoadClearance ?? Infinity),
    maxExposedWallHeight: Math.max(...active.map(p => p.exposedWallHeight)),
    groundConnection: access ? 'closed terminal shoe follows physical field; 4 cm threshold' : 'access unresolved; retain existing floor and do not imply an entrance' };
});
writeFileSync(`${dir}/construction.json`, JSON.stringify({ status: 'CPU design stage; requires exact rendered-terrain mesh and visual review before integration',
  sourceFieldSha: sha(bytes), gulfHashes, minRoadGuard: 13, designWalkWidth: 2.4, outerConstructionWidth: 3.2,
  coordinateConvention: 'pad-centered metres, world yaw transform; y is absolute world height',
  plots: construction, totals: { highTriangles: construction.reduce((sum, c) => sum + c.budget.totalHighTriangles, 0),
    lodTriangles: construction.reduce((sum, c) => sum + c.budget.totalLodTriangles, 0) } }, null, 2) + '\n');
console.log(JSON.stringify(construction.map(c => ({ id: c.id, counts: c.counts, budget: c.budget, maxWall: c.maxExposedWallHeight, minRoad: c.minimumRoadClearance }))));

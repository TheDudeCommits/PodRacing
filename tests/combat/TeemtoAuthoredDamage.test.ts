import { Matrix4, Mesh, Object3D, Quaternion, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION } from '../../src/render/combat/WreckVisualPose';
import { TeemtoWreckBreakup } from '../../src/render/combat/TeemtoWreckBreakup';
import { CinematicCamera, type CameraSubject } from '../../src/camera/CinematicCamera';

const fileModule: string = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fileModule);
const variants = ['hero', 'rival'] as const;
const sources = new Map<string, Group>();
const privatePath = 'assets/source/inkstorm/combat-round35/authored-damage-v16/packaged-b/';

async function load(path: string, stripImages = false): Promise<Group> {
  const data = readFileSync(path);
  if (!stripImages) return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '')).scene;
  const size = data.readUInt32LE(12), json = JSON.parse(data.subarray(20, 20 + size).toString());
  // Original names, hierarchy, geometry accessors and complete BIN are exact.
  // CPU geometry tests remove only image/material references from a memory copy.
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  delete json.materials; delete json.images; delete json.textures; delete json.samplers;
  const text = new TextEncoder().encode(JSON.stringify(json)), padded = Math.ceil(text.byteLength / 4) * 4;
  const binary = data.subarray(28 + size), output = new Uint8Array(28 + padded + binary.byteLength), h = new DataView(output.buffer);
  h.setUint32(0, 0x46546c67, true); h.setUint32(4, 2, true); h.setUint32(8, output.byteLength, true);
  h.setUint32(12, padded, true); h.setUint32(16, 0x4e4f534a, true); output.fill(32, 20, 20 + padded); output.set(text, 20);
  h.setUint32(20 + padded, binary.byteLength, true); h.setUint32(24 + padded, 0x004e4942, true); output.set(binary, 28 + padded);
  expect(binary.equals(output.subarray(28 + padded))).toBe(true);
  return (await new GLTFLoader().parseAsync(output.buffer, '')).scene;
}
function meshes(root: Object3D): Mesh[] { const result: Mesh[] = []; root.traverse(o => { if (o instanceof Mesh) result.push(o); }); return result; }
function fixture(name: typeof variants[number]) {
  const root = sources.get(name)!.clone(true), original = meshes(root), nodes = new Map<string, Object3D>();
  root.traverse(node => nodes.set(node.name, node)); root.updateMatrixWorld(true);
  const cache = new WreckVisualPoseCache(); cache.refresh(root, original, 1);
  const breakup = TeemtoWreckBreakup.create(root, nodes, original)!; expect(breakup).not.toBeNull();
  const damageRoot = sources.get(`${name}-damage`)!.clone(true), damage = meshes(damageRoot); root.add(damageRoot);
  expect(breakup.installDamageVariant(damage)).toBe(true);
  return { root, original, damage, cache, breakup, all: [...original, ...damage] };
}
function race() { return new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: 1229867859,
  totalLaps: 1, countdownSeconds: 3, competitionProfile: 'time-trial' }); }
function step(sim: RaceSimulation, frame: number) { sim.step({ brake: 1, boost: frame >= 558 && frame <= 910 }); }
function matrices(art: ReturnType<typeof fixture>) { return art.all.map(m => [...m.matrix.elements, ...m.position.toArray(), ...m.quaternion.toArray()]); }

beforeAll(async () => {
  for (const name of variants) {
    sources.set(name, await load(`public/assets/inkstorm/vehicles/teemto-${name === 'hero' ? 'hero-open-v2' : 'rival'}.glb`, true));
    sources.set(`${name}-damage`, await load(`${privatePath}teemto-damage-${name}-v16.glb`));
  }
});
afterAll(() => { for (const root of sources.values()) for (const mesh of meshes(root)) {
  mesh.geometry.dispose(); for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
} });

describe('actual authored Teemto damage packages', () => {
  it.each(variants)('%s keeps intact birth/reset, original pilot and deterministic random-access transforms without vertex reads', name => {
    const art = fixture(name), sim = race(); for (let frame = 1; frame <= 910; frame++) step(sim, frame);
    const before = JSON.stringify(sim.state), rest = matrices(art), pilots = art.original.filter(m => m.name.startsWith('teemto-pilot-'));
    const pilotParents = pilots.map(m => m.parent), pilotMatrices = pilots.map(m => m.matrix.clone());
    const spies = art.all.map(m => vi.spyOn(m.geometry, 'getAttribute').mockImplementation(() => { throw new Error('Runtime vertex read'); }));
    try {
      const sample = (age: number) => { const remaining = WRECK_PRESENTATION_DURATION - age;
        const pose = art.cache.update(sim.state.entries[0]!.vehicle, remaining, sim.terrain);
        art.breakup.update(pose, remaining, sim.terrain); return pose; };
      const birth = sample(0), face = name === 'hero'
        ? new Vector3(4.023553848266602, 2.6643872261047363, 15.200007438659668)
        : new Vector3(4.022682189941406, 2.6537137031555176, 15.200004577636719);
      expect(birth.rupture).toBeDefined();
      const witness = birth.rupture!;
      expect(witness.position.distanceTo(face.clone().applyEuler(birth.rotation).add(birth.position))).toBeLessThan(1e-8);
      expect(witness.direction.distanceTo(new Vector3(0, 0, 1).applyEuler(birth.rotation))).toBeLessThan(1e-8);
      expect(art.breakup.active).toBe(false); expect(art.breakup.damageVariantAvailable).toBe(true);
      expect(art.damage.every(m => !m.visible)).toBe(true); expect(matrices(art)).toEqual(rest);
      const open = sample(.12); expect(open.rupture).toBe(witness); expect(art.breakup.damageVariantActive).toBe(true);
      expect(art.damage.every(m => m.visible)).toBe(true);
      expect(art.original.find(m => m.name === 'teemto-engine-right-body')!.visible).toBe(false);
      expect(art.original.find(m => m.name === 'teemto-cockpit-body')!.visible).toBe(name === 'rival');
      art.root.updateMatrixWorld(true);
      const moving = [art.original.find(m => m.name === 'teemto-engine-left-body')!, ...art.damage.filter(m => !m.name.includes('cockpit'))];
      const earlyRotation = moving.map(m => new Quaternion().setFromRotationMatrix(m.matrixWorld));
      const early = matrices(art); sample(.8); art.root.updateMatrixWorld(true);
      // Every major mass follows through after opening; the left engine can no
      // longer remain fixed in the same airborne exploded-diagram position.
      moving.forEach((mesh, index) => expect(new Quaternion().setFromRotationMatrix(mesh.matrixWorld)
        .angleTo(earlyRotation[index]!)).toBeGreaterThan(.20));
      // Stable aftermath: each engine's long axis follows nearby terrain,
      // rather than preserving the parent wreck pitch and balancing on a tip.
      const settledPose = art.cache.pose;
      for (const mesh of moving.filter(m => !m.name.includes('tethers'))) {
        const world = new Matrix4().compose(settledPose.position, new Quaternion().setFromEuler(settledPose.rotation), new Vector3(1, 1, 1))
          .multiply(mesh.matrixWorld);
        const axis = new Vector3(0, 0, 1).transformDirection(world);
        expect(Math.abs(axis.y), `${mesh.name}: long axis broadly terrain-aligned`).toBeLessThan(.36);
      }
      sample(.12); expect(matrices(art)).toEqual(early);
      const backToBirth = sample(0);
      expect(art.breakup.damageVariantActive).toBe(false); expect(matrices(art)).toEqual(rest);
      expect(backToBirth.rupture!.position.distanceTo(face.clone().applyEuler(backToBirth.rotation).add(backToBirth.position))).toBeLessThan(1e-8);
      art.breakup.reset(); expect(backToBirth.rupture).toBeUndefined();
      sample(.12); expect(matrices(art)).toEqual(early);
      for (const [i, pilot] of pilots.entries()) {
        expect(pilot.parent).toBe(pilotParents[i]); expect(pilot.matrix.equals(pilotMatrices[i]!)).toBe(true); expect(pilot.visible).toBe(true);
      }
      const exhaust = new Vector3(4.025, .178, 5.638), rear = art.damage.find(m => m.name === 'teemto-damage-right-rear-v16')!;
      const originalRear = sources.get(`${name}-damage`)!.getObjectByName(rear.name)!;
      const expected = exhaust.clone().applyMatrix4(new Matrix4().multiplyMatrices(rear.matrix, originalRear.matrix.clone().invert()));
      art.breakup.transformAttachment('exhaustRight', exhaust); expect(exhaust.distanceTo(expected)).toBeLessThan(1e-9);
      const deformation = new Matrix4().multiplyMatrices(rear.matrix, originalRear.matrix.clone().invert());
      const body = new Matrix4().compose(open.position, new Quaternion().setFromEuler(open.rotation), new Vector3(1, 1, 1));
      const world = new Matrix4().multiplyMatrices(body, deformation);
      expect(open.rupture!.position.distanceTo(face.clone().applyMatrix4(world))).toBeLessThan(1e-8);
      expect(open.rupture!.direction.distanceTo(new Vector3(0, 0, 1).transformDirection(world))).toBeLessThan(1e-8);
      sample(WRECK_PRESENTATION_DURATION); expect(art.breakup.damageVariantActive).toBe(false);
      expect(art.original.every(m => m.visible)).toBe(true); expect(art.damage.every(m => !m.visible)).toBe(true);
      expect(matrices(art)).toEqual(rest); art.breakup.reset(); expect(matrices(art)).toEqual(rest);
      expect(open.rupture).toBeUndefined();
      expect(JSON.stringify(sim.state)).toBe(before);
    } finally { for (const spy of spies) spy.mockRestore(); art.breakup.reset(); }
  });

  it.each(variants)('%s contains every visible source vertex through actual wreck trajectory and side/chase camera aspects', name => {
    const art = fixture(name), sim = race(), point = new Vector3(), body = new Matrix4(), world = new Matrix4();
    const q = new Quaternion(), unit = new Vector3(1, 1, 1), statistics = new Map<string, { gap: number; frame: number; vertex: number }>();
    const aspects = [1440 / 900, 16 / 9, 390 / 844, 844 / 390];
    const rigs = aspects.map(aspect => { const camera = new CinematicCamera(); camera.camera.aspect = aspect; return camera; });
    let positionsTested = 0, contactSamples = 0, cameraPositions = 0, maxQueries = 0;
    const settledMaximumGap = new Map<string, number>();
    try {
      for (let frame = 1; frame <= 1168; frame++) {
        step(sim, frame); if (frame < 910) continue;
        const entry = sim.state.entries[0]!, before = JSON.stringify(sim.state); let queries = 0;
        const terrain = { heightAt: (x: number, z: number) => { queries++; return sim.terrain.heightAt(x, z); } };
        const pose = art.cache.update(entry.vehicle, entry.galactic!.wreck.timer, terrain);
        queries = 0; art.breakup.update(pose, entry.galactic!.wreck.timer, terrain); maxQueries = Math.max(maxQueries, queries);
        if (pose.groundContact) contactSamples++;
        art.root.updateMatrixWorld(true); body.compose(pose.position, q.setFromEuler(pose.rotation), unit);
        for (const mesh of art.all) {
          if (!mesh.visible) continue;
          world.multiplyMatrices(body, mesh.matrixWorld);
          const p = mesh.geometry.getAttribute('position'); let meshMinimum = Infinity;
          for (let vertex = 0; vertex < p.count; vertex++) {
            point.fromBufferAttribute(p, vertex).applyMatrix4(world);
            const gap = point.y - sim.terrain.heightAt(point.x, point.z), old = statistics.get(mesh.name);
            if (!old || gap < old.gap) statistics.set(mesh.name, { gap, frame, vertex });
            meshMinimum = Math.min(meshMinimum, gap); positionsTested++;
          }
          const age = WRECK_PRESENTATION_DURATION - entry.galactic!.wreck.timer;
          if (age >= .6 && age <= 1.75 && (mesh.name === 'teemto-engine-left-body' || (mesh.name.startsWith('teemto-damage-') && !mesh.name.includes('cockpit')))) {
            settledMaximumGap.set(mesh.name, Math.max(settledMaximumGap.get(mesh.name) ?? -Infinity, meshMinimum));
          }
        }
        const vehicle = entry.vehicle;
        const subject: CameraSubject = { position: new Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z),
          forward: pose.forward, velocity: new Vector3(), speed: 0, combatFocus: pose.center, combatForward: pose.forward,
          combatRadius: pose.radius, combatBounds: pose.bounds, combatTerrain: sim.terrain, combatImpactPosition: pose.rupture?.position };
        if (frame % 12 === 0 || [910, 922, 943, 1168].includes(frame)) for (const rig of rigs) for (const mode of ['side', 'chase'] as const) {
          rig.setMode(mode); rig.setCombatFraming(mode === 'side'); subject.wreckChase = mode === 'chase'; rig.snap(subject);
          rig.camera.updateMatrixWorld(true);
          for (const bound of pose.bounds) {
            point.copy(bound).project(rig.camera); cameraPositions++;
            expect(point.x, `${name}/${frame}/${mode}: horizontal safe bound`).toBeGreaterThanOrEqual(-.780001);
            expect(point.x).toBeLessThanOrEqual(.780001); expect(point.y).toBeGreaterThanOrEqual(-.580001);
            expect(point.y).toBeLessThanOrEqual(.700001); expect(point.z).toBeGreaterThan(-1); expect(point.z).toBeLessThan(1);
          }
          // Actual vertices are inside the tested transformed source boxes.
          for (const mesh of art.all) if (mesh.visible) {
            world.multiplyMatrices(body, mesh.matrixWorld); const p = mesh.geometry.getAttribute('position');
            for (let vertex = 0; vertex < p.count; vertex++) {
              point.fromBufferAttribute(p, vertex).applyMatrix4(world).project(rig.camera); cameraPositions++;
              if (point.x < -.780001 || point.x > .780001 || point.y < -.580001 || point.y > .700001 || point.z <= -1 || point.z >= 1)
                throw new Error(`${name}/${frame}/${mode}/${rig.camera.aspect}/${mesh.name}/${vertex}: clipped ${point.toArray()}`);
            }
          }
        }
        expect(JSON.stringify(sim.state)).toBe(before);
      }
      console.info('V21 actual authored damage geometry support/projection:', JSON.stringify({ name, positionsTested,
        cameraPositions, contactSamples, maxQueries, settledMaximumGap: Object.fromEntries(settledMaximumGap), minimumGapByMesh: Object.fromEntries(statistics) }));
      // V28 adds one late front support-balance pass (111/102 cached points).
      // Exact measured fixed budgets; source no-burial/projection gates stay unchanged.
      // V32 publishes left/front bands with one additional center sample each.
      expect(maxQueries).toBeLessThanOrEqual((name === 'hero' ? 459 : 402) + 2);
      expect(contactSamples).toBeGreaterThan(0);
      for (const [mesh, metric] of statistics) expect(metric.gap, `${name}/${mesh}/${metric.frame}: actual source no burial`).toBeGreaterThanOrEqual(-1e-6);
      expect(statistics.get('teemto-damage-right-rear-v16')!.gap).toBeLessThan(.15);
      expect(settledMaximumGap.size).toBe(name === 'hero' ? 4 : 3);
      for (const [mesh, gap] of settledMaximumGap) expect(gap, `${mesh}: sustained ground settling`).toBeLessThan(.25);
    } finally { art.breakup.reset(); for (const rig of rigs) rig.dispose(); }
  }, 45_000);
});


describe('actual principal world strike', () => {
  it.each(variants)('%s drops once, arrests and differentiates real world departure instead of inheriting parent orbit', name => {
    const art = fixture(name), sim = race(); for (let frame = 1; frame <= 910; frame++) step(sim, frame);
    const state = sim.state.entries[0]!.vehicle, frozen = JSON.stringify(sim.state);
    const rear = art.damage.find(m => m.name === 'teemto-damage-right-rear-v16')!;
    rear.geometry.computeBoundingBox(); const center = rear.geometry.boundingBox!.getCenter(new Vector3());
    const world = new Matrix4(), body = new Matrix4(), q = new Quaternion(), unit = new Vector3(1, 1, 1);
    const sample = (age: number, source = state) => {
      const remaining = WRECK_PRESENTATION_DURATION - age;
      const pose = art.cache.update(source, remaining, sim.terrain); art.breakup.update(pose, remaining, sim.terrain);
      art.root.updateMatrixWorld(true); body.compose(pose.position, q.setFromEuler(pose.rotation), unit);
      world.multiplyMatrices(body, rear.matrixWorld);
      return { position: center.clone().applyMatrix4(world), rotation: new Quaternion().setFromRotationMatrix(world),
        direction: pose.groundContact?.direction.clone() };
    };
    try {
      const birth = sample(0), strike = sample(.08), rest = sample(.9), later = sample(1.6);
      expect(birth.position.y - strike.position.y).toBeGreaterThan(.5);
      expect(rest.position.distanceTo(later.position)).toBeLessThan(1e-7);
      expect(rest.rotation.angleTo(later.rotation)).toBeLessThan(1e-7);
      const repeat = sample(.08); expect(repeat.position.distanceTo(strike.position)).toBeLessThan(1e-8);
      const moving = structuredClone(state);
      moving.orientation = { pitch: .1, yaw: .6, roll: -.15, bank: .03 };
      moving.angularVelocity = { pitch: .1, yaw: .7, roll: -.12, bank: .05 };
      moving.velocity = { x: 12, y: 0, z: -5 };
      const value = sample(.14, moving); expect(value.direction).toBeDefined();
      const epsilon = .0001, positions: Vector3[] = [];
      for (const delta of [-epsilon, epsilon]) {
        const shifted = structuredClone(moving);
        shifted.position.x += moving.velocity.x * delta; shifted.position.z += moving.velocity.z * delta;
        for (const key of ['pitch', 'yaw', 'roll', 'bank'] as const) shifted.orientation[key] += moving.angularVelocity[key] * delta;
        positions.push(sample(.14 + delta, shifted).position);
      }
      const measured = positions[1]!.sub(positions[0]!); measured.y = 0; measured.normalize();
      expect(measured.dot(value.direction!)).toBeGreaterThan(.999999);
      console.info('Actual principal strike/arrest:', JSON.stringify({ name, birthY: birth.position.y,
        strikeY: strike.position.y, terminalWorldDrift: rest.position.distanceTo(later.position),
        terminalAngularDrift: rest.rotation.angleTo(later.rotation), worldDirectionDot: measured.dot(value.direction!) }));
      expect(JSON.stringify(sim.state)).toBe(frozen);
    } finally { art.breakup.reset(); }
  });
});

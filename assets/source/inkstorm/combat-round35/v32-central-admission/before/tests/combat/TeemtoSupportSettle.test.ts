import { Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { fixture, matrices, race, step, variants } from '../fixtures/teemtoActualCamera';
import { sampleTeemtoContactRoll, teemtoSlideTime, teemtoStrikeTime } from '../../src/render/combat/TeemtoStrikeMotion';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION } from '../../src/render/combat/WreckVisualPose';
import { ImportedVehiclePresentation } from '../../src/render/vehicles/ImportedVehiclePresentation';
import { VehicleArtLibrary } from '../../src/render/vehicles/VehicleArtLibrary';
import { TEEMTO_ART_DEFINITIONS } from '../../src/game/vehicleAppearance';
import { InkstormRacerShadow } from '../../src/render/inkstorm/InkstormRacerShadow';

const names = ['teemto-engine-left-body', 'teemto-damage-right-front-v16', 'teemto-damage-right-rear-v16'];
const starts = [0.18, 0.13, 0.075], ends = [0.88, 0.77, 0.675];
const peaks = [.376, .3092, .243], rebounds = [.656, .5652, .483];
const criticalAges = [...new Set([0, .05, ...starts.flatMap(t => [t - 1e-6, t, t + 1e-6]),
  ...peaks, ...rebounds, ...ends, ...[.65, .77].flatMap(t => [t-1e-6,t,t+1e-6]), .25, .35, .45, .55, .65, .71, .9, 1.8, 1.96, 2.15])].sort((a, b) => a - b);
const unit = new Vector3(1, 1, 1);
const measurements: unknown[] = [];
afterAll(async () => {
  const path = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.V28_SUPPORT_METRICS_PATH;
  if (path) {
    const module: string = 'node:fs';
    const { writeFileSync } = await import(/* @vite-ignore */ module);
    writeFileSync(path, JSON.stringify(measurements, null, 2) + '\n');
  }
});

function stoppedRace() { const sim = race(); for (let frame = 1; frame <= 910; frame++) step(sim, frame); return sim; }

describe('support-pivot impact and settling', () => {
  it.each([0, 1, 2])('mass %i has one bounded asymmetric rebound and stops exactly before recovery', index => {
    const start = starts[index]!, end = ends[index]!, peak = sampleTeemtoContactRoll(index, peaks[index]!);
    expect(teemtoStrikeTime(index)).toBe(start); expect(start + teemtoSlideTime(index)).toBeCloseTo(end, 12);
    expect(Math.abs(peak)).toBeGreaterThan(.07); expect(Math.abs(peak)).toBeLessThanOrEqual(.11);
    const rebound = sampleTeemtoContactRoll(index, rebounds[index]!);
    expect(Math.sign(rebound)).toBe(-Math.sign(peak));
    expect(Math.abs(rebound)).toBeLessThan(Math.abs(peak) * .25);
    expect(Math.abs(rebound)).toBeGreaterThan(Math.abs(peak) * .20);
    for (const age of [-1, 0, start, end, 1.8, 2.15, NaN, Infinity]) expect(sampleTeemtoContactRoll(index, age)).toBe(0);
    const epsilon = 1e-6;
    for (const age of [start, peaks[index]!, rebounds[index]!, end]) {
      expect(Math.abs(sampleTeemtoContactRoll(index, age + epsilon) - sampleTeemtoContactRoll(index, age - epsilon))).toBeLessThan(.00001);
    }
    // Contact injects angular motion; terminal rest has no residual angular drift.
    expect(Math.abs(sampleTeemtoContactRoll(index, start + epsilon) / epsilon)).toBeGreaterThan(.3);
    expect(Math.abs(sampleTeemtoContactRoll(index, end - epsilon) / epsilon)).toBeLessThan(.00001);
  });

  it.each(variants)('%s keeps complete actual geometry above terrain at contact and angular extrema within one additional fixed front support pass', name => {
    const art = fixture(name), sim = stoppedRace(), state = sim.state.entries[0]!.vehicle;
    const before = JSON.stringify(sim.state), rest = matrices(art), world = new Matrix4(), p = new Vector3();
    const engine = names.map(n => art.all.find(m => m.name === n)!);
    const frontSupports = new WreckVisualPoseCache(true); frontSupports.refresh(art.root, [engine[1]!], 0);
    const queryCap = (name === 'hero' ? 348 : 300) + frontSupports.supportPoints.length;
    const sourceCounts = art.all.map(m => m.geometry.getAttribute('position').count);
    const snapshots = new Map<number, { corners: Vector3[]; rotations: Quaternion[]; matrices: number[][] }>();
    let maxQueries = 0, positions = 0, minimum = Infinity;
    const sample = (age: number, checkSource = true) => {
      const remaining = WRECK_PRESENTATION_DURATION - age, pose = art.cache.update(state, remaining, sim.terrain);
      let queries = 0;
      const spies = art.all.map(m => vi.spyOn(m.geometry, 'getAttribute').mockImplementation(() => { throw new Error('Uncached runtime source read'); }));
      try { art.breakup.update(pose, remaining, { heightAt(x, z) { queries++; return sim.terrain.heightAt(x, z); } }); }
      finally { for (const spy of spies) spy.mockRestore(); }
      maxQueries = Math.max(maxQueries, queries); expect(queries).toBeLessThanOrEqual(queryCap);
      art.root.updateMatrixWorld(true);
      const body = new Matrix4().compose(pose.position, new Quaternion().setFromEuler(pose.rotation), unit);
      const rotations = engine.map(m => new Quaternion().setFromRotationMatrix(world.copy(body).multiply(m.matrixWorld)));
      if (checkSource) {
        let count = 0;
        for (const mesh of art.all) if (mesh.visible) {
          world.copy(body).multiply(mesh.matrixWorld); const source = mesh.geometry.getAttribute('position');
          for (let i = 0; i < source.count; i++) {
            p.fromBufferAttribute(source, i).applyMatrix4(world);
            const gap = p.y - sim.terrain.heightAt(p.x, p.z); minimum = Math.min(minimum, gap); count++; positions++;
            if (gap < -1e-6 || !Number.isFinite(gap)) throw new Error(`${name}/${age}/${mesh.name}/${i}: source burial ${gap}`);
          }
        }
        expect(count).toBe(name === 'hero' ? (art.breakup.active ? 90581 : 73048) : (art.breakup.active ? 45605 : 42278));
      }
      if (art.breakup.active) {
        expect(pose.bounds).toHaveLength(name === 'hero' ? 40 : 32); expect(pose.impactFraming!.bounds).toHaveLength(26);
        for (const mesh of engine) {
          mesh.geometry.computeBoundingBox(); const box = mesh.geometry.boundingBox!;
          world.copy(body).multiply(mesh.matrixWorld);
          for (let i = 0; i < 8; i++) {
            p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(world);
            expect(Math.min(...pose.bounds.map(b => b.distanceTo(p)))).toBeLessThan(1e-7);
            // The close-up temporarily collapses left-engine composition points.
            // Its complete physical corners remain in pose.bounds above at every age.
            if (mesh !== engine[0] || age >= .65) {
              expect(Math.min(...pose.impactFraming!.bounds.map(b => b.distanceTo(p)))).toBeLessThan(1e-7);
            }
          }
        }
      }
      return { corners: pose.bounds.map(v => v.clone()), rotations, matrices: matrices(art) };
    };
    try {
      for (const age of criticalAges) snapshots.set(age, sample(age));
      const angularResponses: number[] = [];
      for (let index = 0; index < 3; index++) {
        const start = starts[index]!;
        const a = snapshots.get(start - 1e-6)!, b = snapshots.get(start + 1e-6)!;
        expect(Math.max(...a.corners.map((point, i) => point.distanceTo(b.corners[i]!))), `mass ${index} contact continuity`).toBeLessThan(.002);
        const contact = snapshots.get(start)!.rotations[index]!, peak = snapshots.get(peaks[index]!)!.rotations[index]!;
        expect(peak.angleTo(contact), `mass ${index} visible post-contact angular response`).toBeGreaterThan(.035);
        expect(peak.angleTo(contact)).toBeLessThan(index === 1 ? .5 : .14);
        if (index === 1) expect(peak.angleTo(contact)).toBeGreaterThan(.35);
        angularResponses.push(peak.angleTo(contact));
      }
      for (const age of [.65, .77]) {
        const a = snapshots.get(age - 1e-6)!, b = snapshots.get(age + 1e-6)!;
        expect(Math.max(...a.corners.map((p, i) => p.distanceTo(b.corners[i]!))), `front balance transition ${age}`).toBeLessThan(.002);
      }
      expect(sample(peaks[2]!, false).matrices).toEqual(snapshots.get(peaks[2]!)!.matrices);
      expect(sample(.9, false).matrices).toEqual(snapshots.get(.9)!.matrices);
      sample(2.15, false); expect(matrices(art)).toEqual(rest);
      expect(art.all.map(m => m.geometry.getAttribute('position').count)).toEqual(sourceCounts);
      expect(JSON.stringify(sim.state)).toBe(before);
      measurements.push({ name, ages: criticalAges, positions, minimum, maxQueries, queryCap, extraFrontSupportSamples: frontSupports.supportPoints.length, postContactAngularRadians: angularResponses });
    } finally { art.breakup.reset(); }
  });

  it.each(variants)('%s retains one-way capped world-center travel while rotating about support', name => {
    const art = fixture(name), sim = stoppedRace(), state = sim.state.entries[0]!.vehicle;
    const body = new Matrix4(), world = new Matrix4();
    const engines = names.map(n => art.all.find(m => m.name === n)!);
    const centers = engines.map(m => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox!.getCenter(new Vector3()); });
    const sample = (age: number) => {
      const remaining = WRECK_PRESENTATION_DURATION - age;
      const pose = art.cache.update(state, remaining, sim.terrain); art.breakup.update(pose, remaining, sim.terrain);
      art.root.updateMatrixWorld(true); body.compose(pose.position, new Quaternion().setFromEuler(pose.rotation), unit);
      return engines.map((m, i) => centers[i]!.clone().applyMatrix4(world.copy(body).multiply(m.matrixWorld)).setY(0));
    };
    try {
      const birth = sample(0), terminal = sample(.9);
      const directions = terminal.map((p, i) => p.clone().sub(birth[i]!).normalize()), previous = birth.map(p => p.clone());
      // The front now follows the actual first-contact edge arc; its measured
      // hero/rival terminal displacement is 4.382/4.389 m. Other caps are unchanged.
      const travel = [3.2, 4.4, 5]; let worstStep = Infinity;
      for (let tick = 1; tick <= 120; tick++) {
        const age = tick * .9 / 120, points = sample(age);
        for (let i = 0; i < 3; i++) {
          const advance = points[i]!.clone().sub(previous[i]!).dot(directions[i]!); worstStep = Math.min(worstStep, advance);
          expect(advance, `${name}/${age}/${names[i]}: actual center must not reverse`).toBeGreaterThanOrEqual(-1e-8);
          expect(points[i]!.distanceTo(birth[i]!), `${name}/${age}/${names[i]}: total displacement cap`).toBeLessThanOrEqual(travel[i]! + 1e-7);
          previous[i]!.copy(points[i]!);
        }
      }
      measurements.push({ name, worldCenterSamples: 120, worstForwardStep: worstStep, terminalDisplacements: terminal.map((p, i) => p.distanceTo(birth[i]!)) });
    } finally { art.breakup.reset(); }
  });

  it.each(variants)('%s shares actual source matrices with the production prepass and shadow adapters through settle and reset', async name => {
    const art = fixture(name), sim = stoppedRace(), damageRoot = art.damage[0]!.parent!;
    damageRoot.removeFromParent(); art.breakup.reset();
    const definition = TEEMTO_ART_DEFINITIONS[name];
    const library = new VehicleArtLibrary({ load: async url => url === definition.damageVariant!.url ? damageRoot : art.root, maxIdleEntries: 0 });
    const presentation = new ImportedVehiclePresentation(library, { maxTriangles: 200000 });
    const shadow = new InkstormRacerShadow();
    try {
      expect(await presentation.setSource(definition)).toBe('ready');
      const cache = new WreckVisualPoseCache(); cache.refresh(presentation, presentation.geometryMeshes, presentation.geometryRevision);
      shadow.refreshCasters(presentation);
      const access = shadow as unknown as { selectCasters(): void; bindings: Array<{ source: Mesh; proxy: Mesh }> };
      const registration = [...access.bindings], prepasses = presentation.prepassMeshes;
      for (const age of [0, ...peaks, ...rebounds, .9, 1.96, 2.15]) {
        const remaining = WRECK_PRESENTATION_DURATION - age;
        const pose = cache.update(sim.state.entries[0]!.vehicle, remaining, sim.terrain);
        presentation.updateWreckBreakup(pose, remaining, sim.terrain);
        presentation.position.copy(pose.position); presentation.quaternion.setFromEuler(pose.rotation);
        presentation.updateMatrixWorld(true); access.selectCasters();
        for (const proxy of prepasses) if (proxy.visible) {
          const source = proxy.parent as Mesh;
          expect(proxy.geometry).toBe(source.geometry); expect(proxy.matrixWorld.elements).toEqual(source.matrixWorld.elements);
        }
        for (const { source, proxy } of access.bindings) if (proxy.visible) {
          expect(proxy.geometry).toBe(source.geometry); expect(proxy.matrix.elements).toEqual(source.matrixWorld.elements);
        }
        if (age > 0 && age < 2.15) for (const name of names) {
          expect(access.bindings.find(b => b.source.name === name)?.proxy.visible, name).toBe(true);
          expect(prepasses.find(p => p.parent?.name === name)?.visible, name).toBe(true);
        }
        expect(presentation.prepassMeshes).toBe(prepasses); expect(access.bindings).toEqual(registration);
      }
      expect(shadow.receipt.refreshes).toBe(1); expect(presentation.damageVariantActive).toBe(false);
    } finally { shadow.dispose(); presentation.dispose(); library.dispose(); }
  });
});

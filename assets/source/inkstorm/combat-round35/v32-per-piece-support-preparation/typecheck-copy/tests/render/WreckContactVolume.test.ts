import { Matrix4, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { GalacticEffectsView, GALACTIC_EFFECT_CAPACITY, GALACTIC_EFFECT_DRAW_CALL_BUDGET } from '../../src/render/galactic/GalacticEffectsView';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../../src/render/materials/InvertedHullOutline';
import { fixture, race, variants } from '../fixtures/teemtoActualCamera';
const rows: unknown[] = [];
afterAll(async () => {
  const path = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.V31_CONTACT_METRICS_PATH;
  if (path) { const module: string = 'node:fs'; const { writeFileSync } = await import(/* @vite-ignore */ module); writeFileSync(path, JSON.stringify(rows, null, 2) + '\n'); }
});
const footprint = () => ({ center: new Vector3(0, 0, 0), axis: new Vector3(0, 0, 1), halfLength: 1.5, halfWidth: .5,
  edges: [new Vector3(-2, 0, 0), new Vector3(2, 0, 0)] as const });
const rupture = { position: new Vector3(), direction: new Vector3(1, 0, 0) };
describe('Owned porous rear-contact cloud cards', () => {
  it.each(variants)('%s keeps complete card carriers above actual terrain with fixed query cost', name => {
    const art = fixture(name), sim = race(), fx = new GalacticEffectsView();
    // Native V30 wreck910; first fixed-tick rear contact920.
    for (let frame = 1; frame <= 920; frame++) sim.step({ brake: 1, boost: frame >= 558 && frame <= 910 });
    const entry = sim.state.entries[0]!, remaining = entry.galactic!.wreck.timer;
    const pose = art.cache.update(entry.vehicle, remaining, sim.terrain); art.breakup.update(pose, remaining, sim.terrain);
    const c = pose.groundContact!, f = c.footprint!, before = JSON.stringify(f);
    const terrain = { heightAt: vi.fn((x: number, z: number) => sim.terrain.heightAt(x, z)) };
    const geometry = fx.contactDust.geometry, positions = geometry.getAttribute('position');
    const source = Array.from({ length: positions.count }, (_, i) => new Vector3().fromBufferAttribute(positions, i));
    const matrix = new Matrix4(), metrics: unknown[] = [], yawMetrics: unknown[] = []; let minimum = Infinity;
    try {
      expect(geometry.index!.count / 3).toBe(2);
      // The bottom-anchored card has no opaque shell or downward-facing base.
      for (const local of source) {
        expect(Math.abs(local.x)).toBeLessThanOrEqual(.5);
        expect(Math.abs(local.z)).toBeLessThanOrEqual(.5);
        expect(local.y).toBeGreaterThanOrEqual(0); expect(local.y).toBeLessThanOrEqual(1);
      }
      fx.emitWreckGroundContact(4, c.position, c.direction, f, { terrain, owner: 0, sequence: 1 });
      for (const age of [0, .058333333333, .16, .408333333333, 1.208333333333, 1.64]) {
        terrain.heightAt.mockClear(); fx.update(4 + age);
        expect(terrain.heightAt).toHaveBeenCalledTimes(45);
        expect(fx.contactDust.count).toBe(10); expect(fx.explosionPlates.count).toBe(0);
        let ageMin = Infinity, ageMaxRise = 0, maxBaseGap = 0;
        for (let i = 0; i < 10; i++) {
          fx.contactDust.getMatrixAt(i, matrix); expect(matrix.elements.every(Number.isFinite)).toBe(true);
          expect(matrix.determinant()).toBeGreaterThan(0);
          expect(geometry.getAttribute('aContactState').getX(i)).toBeCloseTo(age, 5);
          for (const local of source) {
            const world = local.clone().applyMatrix4(matrix), gap = world.y - sim.terrain.heightAt(world.x, world.z);
            minimum = Math.min(minimum, gap); ageMin = Math.min(ageMin, gap);
            expect(gap).toBeGreaterThan(.0199);
            if (local.y === 0) maxBaseGap = Math.max(maxBaseGap, gap);
          }
          const bottom = new Vector3().applyMatrix4(matrix), top = new Vector3(0, 1, 0).applyMatrix4(matrix);
          ageMaxRise = Math.max(ageMaxRise, top.y - bottom.y);
          expect(top.y - bottom.y).toBeLessThanOrEqual(2.601);
        }
        if (age > 1.2 && age < 1.3) { expect(ageMaxRise).toBeGreaterThan(.9); expect(ageMaxRise).toBeLessThan(1.8); }
        if (age > 1.6) {
          expect(ageMaxRise).toBeGreaterThan(.8); // Erode/fade; do not flatten into hard lumps.
          expect(geometry.getAttribute('aContactState').getZ(0)).toBeLessThan(.002);
        }
        const unchanged = [...fx.contactDust.instanceMatrix.array]; terrain.heightAt.mockClear(); fx.update(4 + age);
        expect(terrain.heightAt).not.toHaveBeenCalled(); expect([...fx.contactDust.instanceMatrix.array]).toEqual(unchanged);
        metrics.push({ age, minimumGap: ageMin, maximumBaseGap: maxBaseGap, maximumVerticalRise: ageMaxRise, queries: 45 });
      }
      // Reborn same actual footprint: every camera azimuth must stay inside
      // the already sampled support envelope, without a new terrain query.
      fx.clearEffects(); fx.emitWreckGroundContact(4, c.position, c.direction, f, { terrain, owner: 0, sequence: 2 });
      const camera = new PerspectiveCamera(70, 1.6, .1, 120), target = f.center.clone().add(new Vector3(0, 1, 0));
      let previousMatrices: number[] | undefined;
      for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, -1]) {
        camera.position.set(target.x + Math.sin(yaw) * 25, target.y + 7, target.z + Math.cos(yaw) * 25);
        if (yaw === -1) camera.position.set(18627.292385532623, -9.25189197067709, 27.651508510057557);
        camera.lookAt(target); camera.updateMatrixWorld(true);
        terrain.heightAt.mockClear(); fx.update(4.4, camera);
        expect(terrain.heightAt).toHaveBeenCalledTimes(previousMatrices ? 0 : 45);
        expect(fx.contactDust.count).toBe(10);
        let lastDepth = Infinity, totalArea = 0, baseMinimum = Infinity, minRight = Infinity, maxRight = -Infinity, peak = 0;
        const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        for (let i = 0; i < 10; i++) {
          fx.contactDust.getMatrixAt(i, matrix); expect(matrix.elements.every(Number.isFinite)).toBe(true);
          const center = new Vector3(0, .5, 0).applyMatrix4(matrix), eye = camera.position.clone().sub(center); eye.y = 0;
          const normal = new Vector3(matrix.elements[8], 0, matrix.elements[10]).normalize();
          expect(normal.dot(eye.normalize())).toBeGreaterThan(.999);
          const depth = -center.clone().applyMatrix4(camera.matrixWorldInverse).z;
          expect(depth).toBeLessThanOrEqual(lastDepth + .004); lastDepth = depth;
          totalArea += Math.hypot(matrix.elements[0]!, matrix.elements[2]!) * matrix.elements[5]!;
          peak = Math.max(peak, matrix.elements[5]!);
          for (const local of source) { const world = local.clone().applyMatrix4(matrix), x = world.dot(right); minRight = Math.min(minRight, x); maxRight = Math.max(maxRight, x); }
          for (let j = 0; j <= 8; j++) {
            const bottom = new Vector3(j / 8 - .5, 0, 0).applyMatrix4(matrix);
            const gap = bottom.y - sim.terrain.heightAt(bottom.x, bottom.z); baseMinimum = Math.min(baseMinimum, gap);
            expect(gap).toBeGreaterThan(.0199);
          }
        }
        yawMetrics.push({ yaw: yaw === -1 ? "observed V30 eye; chosen target" : yaw, sumCarrierArea: totalArea, cameraRightCarrierSpan: maxRight - minRight, maximumHeight: peak, minimumBaseGap: baseMinimum, queries: previousMatrices ? 0 : 45 });
        expect(totalArea).toBeLessThan(90); // Sum of local carrier rectangles, not screen coverage.
        if (previousMatrices) expect([...fx.contactDust.instanceMatrix.array]).not.toEqual(previousMatrices);
        previousMatrices = [...fx.contactDust.instanceMatrix.array];
      }
      expect(JSON.stringify(f)).toBe(before); expect(fx.children).toHaveLength(9);
      fx.update(5.65); expect(fx.contactDust.count).toBe(0);
      rows.push({ name, birthFootprint: JSON.parse(before), minimumGeometryGap: minimum, metrics, yawMetrics,
        scope: 'Actual V30-input source fixture, all card corners versus physical terrain. Nine probes per parent cover every yaw; no continuous-terrain/pixel/FPS claim.' });
    } finally { fx.dispose(); art.breakup.reset(); }
  });
  it('keeps bounded resources, exact owner/sequence replacement and recovery/reset/disposal clearing', () => {
    const fx = new GalacticEffectsView(), f = footprint(), terrain = { heightAt: vi.fn(() => 0) };
    let disposed = false;
    try {
      expect(GALACTIC_EFFECT_DRAW_CALL_BUDGET).toBe(9); expect(GALACTIC_EFFECT_CAPACITY.contactDust).toBe(48); expect(GALACTIC_EFFECT_CAPACITY.contactDustCards).toBe(96);
      for (let owner = 0; owner < 8; owner++) fx.emitWreckGroundContact(1, new Vector3(), new Vector3(1, 0, 0), f, { terrain, owner, sequence: 1 });
      const camera = new PerspectiveCamera(70, 1.6, .1, 120); camera.position.set(20, 8, 25); camera.lookAt(0, 1, 0); camera.updateMatrixWorld(true);
      terrain.heightAt.mockClear(); fx.update(1.2, camera); expect(fx.contactDust.count).toBe(80); expect(terrain.heightAt).toHaveBeenCalledTimes(360);
      const matrix = new Matrix4(); let lastDepth = Infinity;
      for (let i = 0; i < 80; i++) { fx.contactDust.getMatrixAt(i, matrix); const depth = -new Vector3(0, .5, 0).applyMatrix4(matrix).applyMatrix4(camera.matrixWorldInverse).z; expect(depth).toBeLessThanOrEqual(lastDepth + .00001); lastDepth = depth; }
      // Horizontal eye exactly over one parent: the finite source-axis fallback
      // must still produce valid cards without requerying held-clock terrain.
      const parent = (fx as unknown as { contactDustSlots: { cx: number; cz: number }[] }).contactDustSlots[0]!;
      camera.position.set(parent.cx, 5, parent.cz); camera.lookAt(parent.cx, 0, parent.cz); camera.updateMatrixWorld(true);
      terrain.heightAt.mockClear(); fx.update(1.2, camera); expect(terrain.heightAt).not.toHaveBeenCalled();
      for (let i = 0; i < fx.contactDust.count; i++) { fx.contactDust.getMatrixAt(i, matrix); expect(matrix.elements.every(Number.isFinite)).toBe(true); expect(matrix.determinant()).toBeGreaterThan(0); }
      fx.emitWreckGroundContact(1.2, new Vector3(), new Vector3(1, 0, 0), f, { terrain, owner: 0, sequence: 2 });
      fx.syncWreckRupture(0, 2, rupture); fx.update(1.3); expect(fx.contactDust.count).toBe(80);
      fx.syncWreckRupture(0, 2); fx.update(1.3); expect(fx.contactDust.count).toBe(70);
      const slots = (fx as unknown as { contactDustSlots: { active: boolean; terrain: unknown; owner: number }[] }).contactDustSlots;
      expect(slots.filter(s => s.owner === 0).every(s => !s.active && !s.terrain)).toBe(true);
      fx.clearEffects(); expect(fx.contactDust.count).toBe(0); expect(slots.every(s => !s.active && !s.terrain)).toBe(true);
      const material = fx.contactDust.material as MeshBasicMaterial;
      expect(material.transparent).toBe(true); expect(material.depthTest).toBe(true); expect(material.depthWrite).toBe(false);
      expect(fx.contactDust.userData[CEL_POST_EXCLUDE_USER_DATA_KEY]).toBe(true);
      const disposeGeometry = vi.spyOn(fx.contactDust.geometry, 'dispose'), disposeMaterial = vi.spyOn(material, 'dispose');
      fx.dispose(); disposed = true; expect(disposeGeometry).toHaveBeenCalledTimes(1); expect(disposeMaterial).toHaveBeenCalledTimes(1);
    } finally { if (!disposed) fx.dispose(); }
  });
  it('retires the rounded-zero expiry neighbour before terrain-gradient division', () => {
    const fx = new GalacticEffectsView(), heightAt = vi.fn(() => 0);
    try {
      fx.emitWreckGroundContact(0, new Vector3(), new Vector3(1, 0, 0), footprint(),
        { terrain: { heightAt }, owner: 0, sequence: 1 });
      fx.update(1.65 - 1e-10);
      expect(heightAt).not.toHaveBeenCalled(); expect(fx.contactDust.count).toBe(0);
      expect([...fx.contactDust.instanceMatrix.array].every(Number.isFinite)).toBe(true);
      const slots = (fx as unknown as { contactDustSlots: { active: boolean; terrain: unknown }[] }).contactDustSlots;
      expect(slots.every(slot => !slot.active && !slot.terrain)).toBe(true);
    } finally { fx.dispose(); }
  });
  it('preserves context-free plate behavior and rejects non-finite terrain without corrupting matrices', () => {
    const fx = new GalacticEffectsView(), f = footprint();
    try {
      fx.emitWreckGroundContact(1, new Vector3(), new Vector3(1, 0, 0), f);
      fx.update(1.2); expect(fx.contactDust.count).toBe(0); expect(fx.explosionPlates.count).toBe(2);
      fx.clearEffects();
      const heightAt = vi.fn(() => NaN);
      fx.emitWreckGroundContact(2, new Vector3(), new Vector3(1, 0, 0), f, { terrain: { heightAt }, owner: 1, sequence: 1 });
      fx.update(2.1); expect(fx.contactDust.count).toBe(0); expect(heightAt).toHaveBeenCalledTimes(45);
      expect([...fx.contactDust.instanceMatrix.array].every(Number.isFinite)).toBe(true);
    } finally { fx.dispose(); }
  });
});

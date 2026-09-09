import { Matrix4, MeshBasicMaterial, Vector3 } from 'three';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { GalacticEffectsView, GALACTIC_EFFECT_CAPACITY, GALACTIC_EFFECT_DRAW_CALL_BUDGET } from '../../src/render/galactic/GalacticEffectsView';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../../src/render/materials/InvertedHullOutline';
import { fixture, race, variants } from '../fixtures/teemtoActualCamera';
const rows: unknown[] = [];
afterAll(async () => {
  const path = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.V30_CONTACT_METRICS_PATH;
  if (path) { const module: string = 'node:fs'; const { writeFileSync } = await import(/* @vite-ignore */ module); writeFileSync(path, JSON.stringify(rows, null, 2) + '\n'); }
});
const footprint = () => ({ center: new Vector3(0, 0, 0), axis: new Vector3(0, 0, 1), halfLength: 1.5, halfWidth: .5,
  edges: [new Vector3(-2, 0, 0), new Vector3(2, 0, 0)] as const });
const rupture = { position: new Vector3(), direction: new Vector3(1, 0, 0) };
describe('Owned rolling rear-contact volume', () => {
  it.each(variants)('%s uses real current terrain under its complete closed dust geometry with fixed query cost', name => {
    const art = fixture(name), sim = race(), fx = new GalacticEffectsView();
    // Native V29 heat onset560 / wreck912: exact hero body position at922.
    for (let frame = 1; frame <= 922; frame++) sim.step({ brake: 1, boost: frame >= 560 && frame <= 912 });
    const entry = sim.state.entries[0]!, remaining = entry.galactic!.wreck.timer;
    const pose = art.cache.update(entry.vehicle, remaining, sim.terrain); art.breakup.update(pose, remaining, sim.terrain);
    const c = pose.groundContact!, f = c.footprint!, before = JSON.stringify(f);
    const terrain = { heightAt: vi.fn((x: number, z: number) => sim.terrain.heightAt(x, z)) };
    const geometry = fx.contactDust.geometry, positions = geometry.getAttribute('position');
    const source = Array.from({ length: positions.count }, (_, i) => new Vector3().fromBufferAttribute(positions, i));
    const matrix = new Matrix4(), metrics: unknown[] = []; let minimum = Infinity;
    try {
      expect(geometry.index!.count / 3).toBe(144);
      fx.emitWreckGroundContact(4, c.position, c.direction, f, { terrain, owner: 0, sequence: 1 });
      for (const age of [0, .058333333333, .16, .408333333333, 1.208333333333, 1.64]) {
        terrain.heightAt.mockClear(); fx.update(4 + age);
        expect(terrain.heightAt).toHaveBeenCalledTimes(45);
        expect(fx.contactDust.count).toBe(5); expect(fx.explosionPlates.count).toBe(0);
        let ageMin = Infinity, ageMaxRise = 0, maxBaseGap = 0;
        for (let i = 0; i < 5; i++) {
          fx.contactDust.getMatrixAt(i, matrix); expect(matrix.elements.every(Number.isFinite)).toBe(true);
          expect(matrix.determinant()).toBeGreaterThan(0);
          for (const local of source) {
            const world = local.clone().applyMatrix4(matrix), gap = world.y - sim.terrain.heightAt(world.x, world.z);
            minimum = Math.min(minimum, gap); ageMin = Math.min(ageMin, gap);
            expect(gap).toBeGreaterThan(.0199);
            if (local.y === 0) maxBaseGap = Math.max(maxBaseGap, gap);
          }
          const bottom = new Vector3().applyMatrix4(matrix), top = new Vector3(0, 1, 0).applyMatrix4(matrix);
          ageMaxRise = Math.max(ageMaxRise, top.y - bottom.y);
          expect(top.y - bottom.y).toBeLessThanOrEqual(1.801);
        }
        if (age > 1.2 && age < 1.3) { expect(ageMaxRise).toBeGreaterThan(.3); expect(ageMaxRise).toBeLessThan(.6); }
        if (age > 1.6) expect(ageMaxRise).toBeLessThan(.01);
        const unchanged = [...fx.contactDust.instanceMatrix.array]; terrain.heightAt.mockClear(); fx.update(4 + age);
        expect(terrain.heightAt).not.toHaveBeenCalled(); expect([...fx.contactDust.instanceMatrix.array]).toEqual(unchanged);
        metrics.push({ age, minimumGap: ageMin, maximumBaseGap: maxBaseGap, maximumVerticalRise: ageMaxRise, queries: 45 });
      }
      expect(JSON.stringify(f)).toBe(before); expect(fx.children).toHaveLength(9);
      fx.update(5.65); expect(fx.contactDust.count).toBe(0);
      rows.push({ name, birthFootprint: JSON.parse(before), minimumGeometryGap: minimum, metrics,
        scope: 'Actual native-input source fixture, complete dust vertices versus physical terrain; no native pixels/casing occlusion/FPS claim. Nine terrain probes per active lobe, zero on repeated same clock.' });
    } finally { fx.dispose(); art.breakup.reset(); }
  });
  it('keeps bounded resources, exact owner/sequence replacement and recovery/reset/disposal clearing', () => {
    const fx = new GalacticEffectsView(), f = footprint(), terrain = { heightAt: vi.fn(() => 0) };
    let disposed = false;
    try {
      expect(GALACTIC_EFFECT_DRAW_CALL_BUDGET).toBe(9); expect(GALACTIC_EFFECT_CAPACITY.contactDust).toBe(40);
      for (let owner = 0; owner < 8; owner++) fx.emitWreckGroundContact(1, new Vector3(), new Vector3(1, 0, 0), f, { terrain, owner, sequence: 1 });
      terrain.heightAt.mockClear(); fx.update(1.2); expect(fx.contactDust.count).toBe(40); expect(terrain.heightAt).toHaveBeenCalledTimes(360);
      fx.emitWreckGroundContact(1.2, new Vector3(), new Vector3(1, 0, 0), f, { terrain, owner: 0, sequence: 2 });
      fx.syncWreckRupture(0, 2, rupture); fx.update(1.3); expect(fx.contactDust.count).toBe(40);
      fx.syncWreckRupture(0, 2); fx.update(1.3); expect(fx.contactDust.count).toBe(35);
      const slots = (fx as unknown as { contactDustSlots: { active: boolean; terrain: unknown; owner: number }[] }).contactDustSlots;
      expect(slots.filter(s => s.owner === 0).every(s => !s.active && !s.terrain)).toBe(true);
      fx.clearEffects(); expect(fx.contactDust.count).toBe(0); expect(slots.every(s => !s.active && !s.terrain)).toBe(true);
      const material = fx.contactDust.material as MeshBasicMaterial;
      expect(material.transparent).toBe(false); expect(material.depthTest).toBe(true); expect(material.depthWrite).toBe(true);
      expect(fx.contactDust.userData[CEL_POST_EXCLUDE_USER_DATA_KEY]).toBe(false);
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

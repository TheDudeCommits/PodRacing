import { Euler, Group, Matrix4, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { TEEMTO_ART_DEFINITIONS } from '../../src/game/vehicleAppearance';
import type { GalacticEvent } from '../../src/game/galactic/types';
import { GameApp } from '../../src/render/app/GameApp';
import { GalacticEffectsView, type CrashEffectEvent } from '../../src/render/galactic/GalacticEffectsView';
import { RaceSimulation } from '../../src/game/race/RaceSimulation';
import { sampleTerrainHeight } from '../../src/render/terrain/terrainMath';

// Exercise the actual event adapter without constructing a renderer, DOM, or
// running simulation. The group is intentionally at a stale pre-wreck pose.
const consume = (GameApp.prototype as unknown as {
  consumeGalacticEffects(events: readonly GalacticEvent[], time: number): void;
}).consumeGalacticEffects;

function fixture() {
  const view = new Group();
  view.position.set(-400, -30, 900);
  view.rotation.set(0.2, -1, 0.1, 'YXZ');
  const anchor = new Group();
  anchor.position.fromArray(TEEMTO_ART_DEFINITIONS.hero.attachments!.exhaustRight!.position);
  view.add(anchor);
  Object.assign(view, { importedActive: true, imported: { getAttachment: () => anchor } });
  const vehicle = {
    position: Object.freeze({ x: 100, y: 8, z: -25 }),
    velocity: Object.freeze({ x: 12, y: 8.5, z: 3 }),
    orientation: Object.freeze({ yaw: 0.4, pitch: 0.1, roll: 0.02, bank: -0.03 }),
  };
  const entry = { id: 'player', vehicle, galactic: { wreck: { phase: 'wrecked' } } };
  const emitCrash = vi.fn<(event: CrashEffectEvent) => void>();
  const heightAt = vi.fn(() => 2);
  const wreckPose = { position: new Vector3(100, 12, -25), rotation: new Euler(0.12, 0.55, -0.3, 'YXZ') };
  const resolveWreckVisualPose = vi.fn(() => wreckPose);
  const app = { race: { state: { entries: [entry] }, terrain: { heightAt } },
    racerViews: [view], galacticEffects: { emitCrash }, localRacerId: () => 'player', resolveWreckVisualPose };
  return { app, vehicle, view, anchor, emitCrash, heightAt, wreckPose, resolveWreckVisualPose };
}

describe('authoritative event to visible rupture placement', () => {
  it('places one redline rupture on the real authored nozzle in the displayed wreck pose', () => {
    const f = fixture(), time = 7.6;
    const before = JSON.stringify(f.vehicle), rotationBefore = f.view.rotation.toArray();
    const poseBefore = JSON.stringify(f.wreckPose);
    const events: readonly GalacticEvent[] = Object.freeze([
      Object.freeze({ type: 'redline-explosion' as const, racerId: 'player', heat: 1 }),
      Object.freeze({ type: 'wreck' as const, racerId: 'player', cause: 'redline-explosion', sourceId: null, takedownBy: null, runTokens: 2 }),
    ]);
    consume.call(f.app, events, time);
    expect(f.emitCrash).toHaveBeenCalledTimes(1);
    const emitted = f.emitCrash.mock.calls[0]![0];
    const expected = new Vector3().copy(f.anchor.position).applyEuler(f.wreckPose.rotation).add(f.wreckPose.position);
    expect(f.resolveWreckVisualPose).toHaveBeenCalledOnce();
    expect(f.resolveWreckVisualPose).toHaveBeenCalledWith(f.app.race.state.entries[0]);
    expect(emitted.position.x).toBeCloseTo(expected.x, 8);
    expect(emitted.position.y).toBeCloseTo(expected.y, 8);
    expect(emitted.position.z).toBeCloseTo(expected.z, 8);
    expect(expected.distanceTo(new Vector3().copy(f.vehicle.position))).toBeGreaterThan(6);
    expect(f.heightAt).toHaveBeenCalledWith(emitted.position.x, emitted.position.z);
    expect(JSON.stringify(f.vehicle)).toBe(before);
    expect(JSON.stringify(f.wreckPose)).toBe(poseBefore);
    // Updating derived matrixWorld caches is allowed; the presented TRS is intact.
    expect(f.view.position.toArray()).toEqual([-400, -30, 900]);
    expect(f.view.rotation.toArray()).toEqual(rotationBefore);
  });

  it('retains root origin for energy cues and safely falls back when no source is loaded', () => {
    const f = fixture();
    consume.call(f.app, [{ type: 'shield-block', racerId: 'player', sourceId: null, absorbed: 0.2 }], 1);
    expect(f.emitCrash.mock.calls[0]![0].position).toBe(f.vehicle.position);
    Object.assign(f.view, { imported: { getAttachment: () => undefined } });
    consume.call(f.app, [{ type: 'redline-explosion', racerId: 'player', heat: 1 }], 2);
    expect(f.emitCrash.mock.calls[1]![0].position).toBe(f.vehicle.position);
  });

  it('surface-projects the reproduced native V9 buried rupture without changing simulation or horizontal placement', () => {
    const race = new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: 1229867859,
      totalLaps: 1, countdownSeconds: 3, competitionProfile: 'time-trial' });
    let events: readonly GalacticEvent[] = [];
    for (let frame = 1; frame <= 910; frame++) {
      events = race.step({ brake: 1, boost: frame >= 558 }).galacticEvents;
    }
    expect(events.some(event => event.type === 'redline-explosion')).toBe(true);
    const effects = new GalacticEffectsView();
    const stateBefore = JSON.stringify(race.snapshot());
    // Preserve the executed V9 origin as a historical regression, independent
    // of later corrections to the displayed rigid wreck pose. See the private
    // v9-rupture-investigation/before-projection.json and native receipt.
    expect(race.state.entries[0]!.vehicle.position.y).toBeCloseTo(-10.899386940635921, 9);
    const position = Object.freeze({ x: 18598.824685153697, y: -16.654480452532752, z: 10.266170358915868 });
    const authored: CrashEffectEvent = Object.freeze({ type: 'crash', time: 910 / 120,
      position, groundY: race.terrain.heightAt(position.x, position.z), severity: 2, style: 'redline' });
    effects.emitCrash(authored);
    expect(authored.groundY! - authored.position.y).toBeCloseTo(3.7455868441427107, 7);
    const matrix = new Matrix4();
    effects.update(910 / 120);
    effects.explosionPlates.getMatrixAt(0, matrix);
    const projected = new Vector3().setFromMatrixPosition(matrix);
    // GPU instance attributes are Float32 at world coordinates around 18,600m.
    expect(projected.x).toBeCloseTo(authored.position.x, 2);
    expect(projected.z).toBeCloseTo(authored.position.z, 4);
    expect(projected.y - authored.groundY!).toBeCloseTo(1.12, 5);
    expect(projected.y - 2.7 * 0.4).toBeGreaterThan(authored.groundY!);
    expect(effects.crashDebris.count).toBe(18);
    expect(effects.children).toHaveLength(8);
    expect(JSON.stringify(race.snapshot())).toBe(stateBefore);
    effects.dispose();
  });
});

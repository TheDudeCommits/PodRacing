import { describe, expect, it } from 'vitest';
import { createRaceSimulation } from '../../src/game/race';
import {
  FLAT_HEIGHT_SAMPLER,
  createPodracerState,
} from '../../src/game/simulation';

describe('host-authoritative race simulation adapters', () => {
  it('lets a remote human override one AI slot while absent slots keep AI control', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      seed: 0x9001,
    });
    const controlled = race.step({}, {
      'ai-vexa': { throttle: 0.35, steer: -0.75, fire: true, mine: true },
    });

    expect(controlled.inputs['ai-vexa']).toMatchObject({
      throttle: 0.35,
      steer: -0.75,
      fire: true,
      mine: true,
    });
    expect(controlled.galacticEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'heat-lance-fired', racerId: 'ai-vexa' }),
      expect.objectContaining({ type: 'scrap-mine-deployed', racerId: 'ai-vexa' }),
    ]));
    expect(controlled.inputs['ai-talik']?.throttle).toBeGreaterThan(0);

    const aiFallback = race.step();
    expect(aiFallback.inputs['ai-vexa']?.fire).toBe(false);
    expect(aiFallback.inputs['ai-vexa']?.mine).toBe(false);
    expect(aiFallback.inputs['ai-vexa']?.throttle).not.toBe(0.35);
  });

  it('limits pre-grid laps, selects any stable slot, and preserves both on reset', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 3,
      seed: 0x9002,
    });

    expect(race.setTotalLaps(2)).toBe(true);
    expect(race.setTotalLaps(4)).toBe(false);
    expect(race.selectRacerVehicle('ai-vexa', 'skim-speeder')).toMatchObject({
      type: 'vehicle-class-changed',
      racerId: 'ai-vexa',
      vehicleClass: 'skim-speeder',
    });
    expect(race.selectPlayerVehicle('speeder-bike')).toMatchObject({
      racerId: 'player',
      vehicleClass: 'speeder-bike',
    });

    race.reset();
    expect(race.totalLaps).toBe(2);
    expect(race.state.totalLaps).toBe(2);
    expect(race.state.entries.find((entry) => entry.id === 'player')?.galactic?.vehicleClass)
      .toBe('speeder-bike');
    expect(race.state.entries.find((entry) => entry.id === 'ai-vexa')?.galactic?.vehicleClass)
      .toBe('skim-speeder');
  });

  it('restores host truth while preserving the renderer-owned local vehicle reference', () => {
    const host = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      totalLaps: 2,
      seed: 0x9003,
    });
    host.step({ throttle: 1 });
    const hostLocal = host.state.entries.find((entry) => entry.id === 'ai-vexa')!;
    hostLocal.vehicle.damage = 0.42;
    hostLocal.vehicle.heat = 0.61;
    const authoritative = host.snapshot();

    const supplied = createPodracerState({
      id: 'renderer-local',
      terrain: FLAT_HEIGHT_SAMPLER,
    });
    const guest = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 3,
      playerVehicle: supplied,
      seed: 0x9004,
    });
    const restored = guest.restoreAuthoritativeSnapshot(authoritative, 'ai-vexa');
    const local = restored.entries.find((entry) => entry.id === 'ai-vexa')!;

    expect(local.isPlayer).toBe(true);
    expect(local.vehicle).toBe(supplied);
    expect(local.vehicle.damage).toBe(0.42);
    expect(local.vehicle.heat).toBe(0.61);
    expect(restored.entries.filter((entry) => entry.isPlayer)).toHaveLength(1);
    expect(restored.entries.find((entry) => entry.id === 'player')?.isPlayer).toBe(false);
    expect(guest.totalLaps).toBe(2);

    hostLocal.vehicle.damage = 0.9;
    expect(local.vehicle.damage).toBe(0.42);
    expect(() => guest.restoreAuthoritativeSnapshot(authoritative, 'missing-slot'))
      .toThrow(/omits local racer/);
  });

  it('emits an overtake when standings swap after progress is updated', () => {
    const race = createRaceSimulation({
      terrain: FLAT_HEIGHT_SAMPLER,
      countdownSeconds: 0,
      seed: 0x9005,
    });
    race.step();
    const progressById: Record<string, number> = {
      player: 0.4,
      'ai-vexa': 0.3,
      'ai-talik': 0.2,
      'ai-kodo': 0.1,
    };
    const oldPlacementById: Record<string, number> = {
      player: 2,
      'ai-vexa': 1,
      'ai-talik': 3,
      'ai-kodo': 4,
    };
    for (const [index, entry] of race.state.entries.entries()) {
      const progress = progressById[entry.id] ?? 0;
      const sample = race.course.sampleAtProgress(progress);
      const lane = (index - 1.5) * 12;
      entry.progress.courseProgress = progress;
      entry.progress.previousProgress = progress;
      entry.progress.unwrappedProgress = progress;
      entry.progress.placement = oldPlacementById[entry.id] ?? index + 1;
      entry.vehicle.position.x = sample.x + sample.rightX * lane;
      entry.vehicle.position.z = sample.z + sample.rightZ * lane;
      entry.vehicle.position.y = FLAT_HEIGHT_SAMPLER.heightAt(
        entry.vehicle.position.x,
        entry.vehicle.position.z,
      ) + 2.45;
      entry.vehicle.velocity.x = 0;
      entry.vehicle.velocity.z = 0;
    }

    const result = race.step({ brake: 1 }, {
      'ai-vexa': { brake: 1 },
      'ai-talik': { brake: 1 },
      'ai-kodo': { brake: 1 },
    });
    expect(result.events).toContainEqual({
      type: 'overtake',
      racerId: 'player',
      passedId: 'ai-vexa',
      fromPosition: 2,
      toPosition: 1,
    });
  });
});

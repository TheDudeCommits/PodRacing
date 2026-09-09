import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRaceSimulation } from '../../src/game/race';
import { FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';
import {
  BLOCKRUNNER_ART_DEFINITIONS,
  resolveRacerAppearancePreference,
  type VehicleAppearanceId,
} from '../../src/game/vehicleAppearance';
import { RacerPresentation } from '../../src/render/vehicles/RacerPresentation';
import { VehicleArtLibrary } from '../../src/render/vehicles/VehicleArtLibrary';

// Real roster and presentation routing, with synthetic art. Actual GLB bytes and
// visual/performance admission require the separate runtime capture evidence.
function rivalFixture() {
  const root = new Group();
  const body = new Mesh(new BoxGeometry(2, 1, 4), new MeshStandardMaterial());
  body.name = 'blockrunner-body';
  root.add(body);
  return root;
}

const libraries: VehicleArtLibrary[] = [];
const views: RacerPresentation[] = [];
function library() {
  const load = vi.fn(async () => rivalFixture());
  const value = new VehicleArtLibrary({ load, maxIdleEntries: 0 });
  libraries.push(value);
  return { value, load };
}
function view(value: VehicleArtLibrary, index: number) {
  const result = new RacerPresentation(value, undefined, index);
  views.push(result);
  result.createCelPrepassProxy();
  return result;
}
afterEach(() => {
  for (const value of views.splice(0)) value.dispose();
  for (const value of libraries.splice(0)) value.dispose();
});

describe('production AI appearance roster', () => {
  it.each(['clean-race', 'chaos'] as const)('loads Sola through the real rival URL in an ordinary %s grid without changing race truth', async competitionProfile => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x8ace, competitionProfile });
    const before = race.snapshot();
    const { value, load } = library();
    const racers = race.state.entries.map((entry, index) => {
      const racer = view(value, index);
      racer.setVehicleClass(entry.galactic!.vehicleClass);
      void racer.setAppearance(resolveRacerAppearancePreference(entry.id, 'player', 'procedural', []));
      return racer;
    });
    await Promise.all(racers.map(racer => racer.ready));

    // No force-to-podracer fixture: these are the unmodified simulation classes.
    expect(race.state.entries.map(entry => [entry.id, entry.galactic!.vehicleClass])).toEqual([
      ['player', 'podracer'], ['ai-vexa', 'landspeeder'],
      ['ai-talik', 'speeder-bike'], ['ai-kodo', 'skim-speeder'],
      ['ai-sola', 'podracer'], ['ai-rax', 'landspeeder'],
      ['ai-miri', 'speeder-bike'], ['ai-olan', 'skim-speeder'],
    ]);
    expect(load.mock.calls).toEqual([[BLOCKRUNNER_ART_DEFINITIONS.rival.url]]);
    expect(racers.map(racer => racer.activeAppearanceId)).toEqual([
      'procedural', 'procedural', 'procedural', 'procedural',
      'blockrunner', 'procedural', 'procedural', 'procedural',
    ]);
    expect(racers[4]!.appearanceStatus).toBe('ready');
    expect(racers[4]!.imported.activeSource).toEqual(BLOCKRUNNER_ART_DEFINITIONS.rival);
    expect(race.snapshot()).toEqual(before);
  });

  it('keeps identity assignments independent of entry order and local appearance', () => {
    const ids = ['ai-vexa', 'ai-talik', 'ai-kodo', 'ai-sola', 'ai-rax', 'ai-miri', 'ai-olan'];
    const expected = {
      'ai-vexa': 'polwo', 'ai-talik': 'teemto', 'ai-kodo': 'sebulba',
      'ai-sola': 'blockrunner', 'ai-rax': 'teemto', 'ai-miri': 'sebulba', 'ai-olan': 'polwo',
    };
    for (const preference of ['teemto', 'sebulba', 'polwo', 'blockrunner', 'procedural'] as const) {
      for (const order of [ids, [...ids].reverse()]) {
        expect(Object.fromEntries(order.map(id => [id, resolveRacerAppearancePreference(id, 'player', preference, [])])))
          .toEqual(expected);
      }
    }
    for (const id of ['unknown-racer', 'constructor', '__proto__', 'toString']) {
      expect(resolveRacerAppearancePreference(id, 'player', 'polwo', [])).toBe('teemto');
    }
  });

  it('prioritizes each local human selection while keeping occupied remote AI ids on the unsynchronized fallback', () => {
    const humanMembers = Object.freeze(['player', 'ai-vexa', 'ai-talik', 'ai-kodo'].map(racerId => Object.freeze({ racerId })));
    const preferences: readonly VehicleAppearanceId[] = ['teemto', 'sebulba', 'polwo', 'blockrunner', 'procedural'];
    for (const local of humanMembers) {
      for (const preference of preferences) {
        expect(resolveRacerAppearancePreference(local.racerId, local.racerId, preference, humanMembers)).toBe(preference);
        for (const remote of humanMembers.filter(member => member !== local)) {
          expect(resolveRacerAppearancePreference(remote.racerId, local.racerId, preference, humanMembers)).toBe('teemto');
        }
        expect(resolveRacerAppearancePreference('ai-sola', local.racerId, preference, humanMembers)).toBe('blockrunner');
      }
    }
    // A vacated network slot resumes its stable AI preference, not the local skin.
    expect(resolveRacerAppearancePreference('ai-vexa', 'player', 'sebulba', [])).toBe('polwo');
  });

  it.each(['time-trial', 'training'] as const)('does not request a hidden rival for unused slots in %s', async competitionProfile => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x8ace, competitionProfile });
    expect(race.state.entries).toHaveLength(1);
    const { value, load } = library();
    const unusedPodracer = view(value, 4);
    await unusedPodracer.setAppearance(resolveRacerAppearancePreference(race.state.entries[4]?.id, 'player', 'polwo', []));
    expect(unusedPodracer.appearanceId).toBe('procedural');
    expect(load).not.toHaveBeenCalled();
  });
});

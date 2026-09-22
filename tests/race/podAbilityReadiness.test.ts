import { describe, expect, it } from 'vitest';
import { createGalacticRacerState } from '../../src/game/galactic/system';
import { stepPodAbilities, type AbilityRacer } from '../../src/game/galactic/podAbilities';
import { normalizePlayerInput } from '../../src/game/input';
import { createRaceSimulation } from '../../src/game/race';
import { createPodracerState, FLAT_HEIGHT_SAMPLER } from '../../src/game/simulation';
import { deriveRaceHudViewModel } from '../../src/ui/model';

const dt = 1 / 120;
function racer(identity: AbilityRacer['identity']): AbilityRacer {
  return { id: 'player', identity, vehicle: createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER }),
    galactic: createGalacticRacerState(), progress: 0, finished: false };
}

describe('pod ability activation and readiness', () => {
  it.each([['teemto', .24], ['verdigris', .4]] as const)('lets an overheated %s vent heat and restore boost', (identity, cooling) => {
    const r = racer(identity);
    r.vehicle.boost.overheated = true;
    r.vehicle.heat = 1.1;
    r.galactic.redline.heat = .9;
    r.vehicle.boost.energy = .2;
    const events = [];
    for (let tick = 0; tick < 240; tick++) {
      events.push(...stepPodAbilities([r], { player: normalizePlayerInput({ ability: true }) }, dt, true, () => null).events);
    }
    expect(events.filter(e => e.type === 'pod-ability' && e.phase === 'active')).toHaveLength(1);
    expect(r.vehicle.heat).toBeCloseTo(1.1 - cooling, 2);
    expect(r.galactic.redline.heat).toBeCloseTo(.9 - cooling, 2);
    expect(r.vehicle.boost.energy).toBeCloseTo(.32, 2);
  });

  it('does not consume a dodge in mid-air or fire it unexpectedly on landing while held', () => {
    const r = racer('needle');
    r.vehicle.grounded = false;
    const held = { player: normalizePlayerInput({ ability: true, steer: -1 }) };
    expect(stepPodAbilities([r], held, dt, true, () => null).events).toEqual([]);
    expect(r.galactic.ability?.cooldown).toBe(0);
    r.vehicle.grounded = true;
    expect(stepPodAbilities([r], held, dt, true, () => null).events).toEqual([]);
    stepPodAbilities([r], { player: normalizePlayerInput() }, dt, true, () => null);
    expect(stepPodAbilities([r], held, dt, true, () => null).events).toContainEqual(
      expect.objectContaining({ kind: 'shunt', phase: 'windup' }),
    );
  });

  it.each(['skybolt', 'sebulba', 'blockrunner', 'needle'] as const)('keeps the overheat restriction on %s', identity => {
    const r = racer(identity); r.vehicle.boost.overheated = true;
    expect(stepPodAbilities([r], { player: normalizePlayerInput({ ability: true }) }, dt, true, () => null).events).toEqual([]);
    expect(r.galactic.ability?.cooldown).toBe(0);
  });

  it('passes the player ability through a full race tick and projects the real cooling state', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, countdownSeconds: .01 });
    race.selectRacerPodIdentity('player', 'teemto');
    while (race.state.phase === 'countdown') race.step({});
    const player = race.state.entries.find(e => e.isPlayer)!;
    player.vehicle.heat = 1.1; player.vehicle.boost.overheated = true;
    expect(deriveRaceHudViewModel(race.snapshot()).ability).toMatchObject({ blocked: null, cooldown: 0 });
    const result = race.step({ ability: true });
    expect(result.inputs.player?.ability).toBe(true);
    expect(result.galacticEvents).toContainEqual(expect.objectContaining({ racerId: 'player', type: 'pod-ability', phase: 'windup' }));
    expect(deriveRaceHudViewModel(race.snapshot()).ability).toMatchObject({ blocked: null, windup: true });
  });

  it('reports overheat, airborne and recovery instead of claiming READY', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER });
    race.selectRacerPodIdentity('player', 'needle');
    const player = race.state.entries.find(e => e.isPlayer)!;
    player.vehicle.boost.overheated = true;
    expect(deriveRaceHudViewModel(race.snapshot()).ability?.blocked).toBe('OVERHEATED');
    player.vehicle.boost.overheated = false; player.vehicle.grounded = false;
    expect(deriveRaceHudViewModel(race.snapshot()).ability?.blocked).toBe('AIRBORNE');
    player.galactic!.wreck.phase = 'recovering';
    expect(deriveRaceHudViewModel(race.snapshot()).ability?.blocked).toBe('RECOVERING');
  });
});

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_POD_IDENTITY,
  POD_IDENTITIES,
  derivePodIdentityConfig,
  isPodIdentityId,
  podIdentityStatRows,
  resolvePodIdentity,
  type PodIdentityId,
} from '../../src/game/podIdentity';
import { SELECTABLE_POD_APPEARANCES } from '../../src/game/vehicleAppearance';
import { createRaceSimulation } from '../../src/game/race';
import { DEFAULT_PODRACER_CONFIG, FLAT_HEIGHT_SAMPLER, stepPodracer, createPodracerState } from '../../src/game/simulation';
import { ENGINE_VOICE_PROFILES } from '../../src/audio/model';
import { RECORDED_ENGINE_VOICES } from '../../src/audio/catalogue';

const REGISTERED: readonly PodIdentityId[] = ['teemto', 'sebulba', 'polwo', 'blockrunner'];

describe('pod identities', () => {
  it('covers every selectable appearance with a balanced, agile, heavy and fast role', () => {
    for (const appearance of SELECTABLE_POD_APPEARANCES) expect(isPodIdentityId(appearance)).toBe(true);
    expect(new Set(REGISTERED.map((id) => POD_IDENTITIES[id].role))).toEqual(new Set(['balanced', 'agile', 'heavy', 'fast']));
    expect(resolvePodIdentity('nope')).toBe(DEFAULT_POD_IDENTITY);
    expect(POD_IDENTITIES.procedural.role).toBe('balanced');
  });

  it('derives four materially distinct tunes without touching cadence or probes', () => {
    const configs = REGISTERED.map((id) => derivePodIdentityConfig(id, DEFAULT_PODRACER_CONFIG));
    expect(new Set(configs.map((config) => config.mass)).size).toBe(4);
    expect(new Set(configs.map((config) => config.maxSpeed)).size).toBe(4);
    expect(new Set(configs.map((config) => config.steeringRateHighSpeed)).size).toBe(4);
    for (const config of configs) {
      expect(config.fixedDelta).toBe(DEFAULT_PODRACER_CONFIG.fixedDelta);
      expect(config.probes).toBe(DEFAULT_PODRACER_CONFIG.probes);
    }
    expect(derivePodIdentityConfig('teemto', DEFAULT_PODRACER_CONFIG)).toBe(DEFAULT_PODRACER_CONFIG);
  });

  it('gives each identity a distinguishable feel in the same manoeuvre', () => {
    const outcomes = REGISTERED.map((id) => {
      const config = derivePodIdentityConfig(id, DEFAULT_PODRACER_CONFIG);
      const state = createPodracerState({ terrain: FLAT_HEIGHT_SAMPLER, initialSpeed: 60 }, config);
      for (let tick = 0; tick < 480; tick += 1) stepPodracer(state, { throttle: 1, steer: tick > 240 ? 1 : 0, boost: tick > 120 }, { terrain: FLAT_HEIGHT_SAMPLER }, config);
      return { id, speed: state.telemetry.speed, yaw: Math.abs(state.orientation.yaw), heat: state.heat };
    });
    const byId = Object.fromEntries(outcomes.map((outcome) => [outcome.id, outcome]));
    expect(byId.sebulba!.speed).toBeGreaterThan(byId.teemto!.speed);
    expect(byId.sebulba!.heat).toBeGreaterThan(byId.teemto!.heat);
    expect(byId.polwo!.yaw).toBeGreaterThan(byId.teemto!.yaw);
    expect(byId.blockrunner!.yaw).toBeLessThan(byId.teemto!.yaw);
    expect(byId.blockrunner!.heat).toBeLessThan(byId.teemto!.heat);
  });

  it('exposes stat rows and sourced engine voices for the garage and audio bank', () => {
    for (const id of REGISTERED) {
      expect(podIdentityStatRows(id)).toHaveLength(4);
      expect(Object.hasOwn(RECORDED_ENGINE_VOICES, POD_IDENTITIES[id].engineVoice)).toBe(true);
      expect(Object.hasOwn(ENGINE_VOICE_PROFILES, id)).toBe(true);
    }
    expect(new Set(REGISTERED.map((id) => POD_IDENTITIES[id].engineVoice)).size).toBe(4);
  });

  it('applies the identity to the race entry, survives reset and gates on the grid', () => {
    const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 3 });
    const player = race.state.entries.find((entry) => entry.isPlayer)!;
    expect(race.podIdentityFor(player.id)).toBe('teemto');
    expect(race.selectRacerPodIdentity(player.id, 'unknown')).toBe(false);
    expect(race.selectRacerPodIdentity(player.id, 'blockrunner')).toBe(true);
    expect(player.podIdentity).toBe('blockrunner');
    expect(race.snapshot().entries.find((entry) => entry.isPlayer)?.podIdentity).toBe('blockrunner');
    race.reset();
    expect(race.podIdentityFor(player.id)).toBe('blockrunner');
    race.lockPlayerVehicleSelection();
    expect(race.selectRacerPodIdentity(player.id, 'polwo')).toBe(false);
    expect(race.podIdentityFor(player.id)).toBe('blockrunner');
    // Other classes keep the reference tune regardless of appearance.
    const rival = race.state.entries.find((entry) => !entry.isPlayer)!;
    expect(race.podIdentityFor(rival.id)).toBe('procedural');
  });

  it('makes a heavy pod push a light pod farther in the same contact', () => {
    const run = (identity: PodIdentityId) => {
      const race = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 0, competitionProfile: 'clean-race' });
      const player = race.state.entries.find((entry) => entry.isPlayer)!;
      return { race, player, identity };
    };
    const heavy = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 3, competitionProfile: 'clean-race' });
    const light = createRaceSimulation({ terrain: FLAT_HEIGHT_SAMPLER, seed: 0x494e4b53, countdownSeconds: 3, competitionProfile: 'clean-race' });
    const heavyPlayer = heavy.state.entries.find((entry) => entry.isPlayer)!;
    const lightPlayer = light.state.entries.find((entry) => entry.isPlayer)!;
    heavy.selectRacerPodIdentity(heavyPlayer.id, 'blockrunner');
    light.selectRacerPodIdentity(lightPlayer.id, 'polwo');
    const heavyMass = derivePodIdentityConfig('blockrunner', DEFAULT_PODRACER_CONFIG).mass;
    const lightMass = derivePodIdentityConfig('polwo', DEFAULT_PODRACER_CONFIG).mass;
    expect(heavyMass).toBeGreaterThan(lightMass * 1.4);
    expect(run('teemto').identity).toBe('teemto');
  });
});

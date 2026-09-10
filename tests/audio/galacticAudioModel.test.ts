import { describe, expect, it } from 'vitest';
import {
  createAudioEnvelopeSchedule,
  mapGameEventsToAudioCues,
  type PodracerAudioCueKind,
} from '../../src/audio';

describe('Galactic Racer procedural audio mapping', () => {
  it('maps actual simulation events, scopes racers, and coalesces shield voices', () => {
    const cues = mapGameEventsToAudioCues([
      { type: 'heat-lance-fired', racerId: 'player', projectileId: 'shot-1' },
      { type: 'weapon-hit', attackerId: 'player', targetId: 'ai-vexa', weapon: 'heat-lance', damage: 0.6, shielded: true },
      { type: 'shield-block', racerId: 'player', sourceId: 'ai-vexa', absorbed: 0.9 },
      { type: 'hazard-hit', racerId: 'ai-kodo', hazardId: 'dust', hazard: 'dust-interference', intensity: 1 },
    ], { playerId: 'player' });

    expect(cues.filter((cue) => cue.kind === 'shield')).toHaveLength(1);
    expect(cues.some((cue) => cue.kind === 'weapon')).toBe(true);
    expect(cues.some((cue) => cue.kind === 'electric')).toBe(true);
    expect(cues.some((cue) => cue.kind === 'hazard')).toBe(false);
  });

  it('gives every expansion beat a recorded cue family', () => {
    const events = [
      { type: 'pulse-shell', racerId: 'player', active: true, cooldown: 4 },
      { type: 'scrap-mine-deployed', racerId: 'player', mineId: 'mine-1' },
      { type: 'hazard-hit', racerId: 'player', hazardId: 'geyser', hazard: 'sand-geyser', intensity: 0.8 },
      { type: 'redline-surge', racerId: 'player', active: true, heat: 0.9, lockout: 0 },
      { type: 'wreck', racerId: 'player', cause: 'impact', sourceId: null, takedownBy: null, runTokens: 2 },
      { type: 'takedown', attackerId: 'player', victimId: 'ai-vexa', cause: 'heat-lance' },
      { type: 'recovered', racerId: 'player', invulnerable: 1.2 },
      { type: 'upgrade-collected', racerId: 'player', pickupId: 'part', part: 'vector-vanes', level: 2 },
      { type: 'vehicle-class-changed', racerId: 'player', vehicleClass: 'speeder-bike' },
    ];
    const kinds = new Set(mapGameEventsToAudioCues(events, { playerId: 'player' }).map((cue) => cue.kind));
    expect(kinds).toEqual(new Set([
      'shield', 'mine', 'hazard', 'redline', 'wreck',
      'takedown', 'recovery', 'upgrade', 'vehicle',
    ]));
  });

  it('separates the Heat Lance firing snap from its heavier unshielded hit', () => {
    const fired = mapGameEventsToAudioCues([
      { type: 'heat-lance-fired', racerId: 'player', projectileId: 'shot-2' },
    ], { playerId: 'player' });
    const hit = mapGameEventsToAudioCues([{
      type: 'weapon-hit',
      attackerId: 'player',
      targetId: 'ai-vexa',
      weapon: 'heat-lance',
      damage: 0.72,
      shielded: false,
    }], { playerId: 'player' });

    expect(fired).toEqual([{ kind: 'weapon', intensity: 0.82, pitch: 1.08 }]);
    expect(hit).toHaveLength(1);
    expect(hit[0]?.kind).toBe('weapon-hit');
    expect(hit[0]?.intensity).toBeGreaterThan(fired[0]!.intensity);
    expect(createAudioEnvelopeSchedule(hit[0]!, 0).at(-1)?.time)
      .toBeGreaterThan(createAudioEnvelopeSchedule(fired[0]!, 0).at(-1)!.time);
  });

  it('does not give a scrap-mine impact the Heat Lance hit voice', () => {
    const cues = mapGameEventsToAudioCues([{
      type: 'weapon-hit',
      attackerId: 'player',
      targetId: 'ai-vexa',
      weapon: 'scrap-mine',
      damage: 0.8,
      shielded: false,
    }], { playerId: 'player' });
    expect(cues.some((cue) => cue.kind === 'weapon-hit')).toBe(false);
    expect(cues.some((cue) => cue.kind === 'impact')).toBe(true);
  });

  it('keeps every new envelope finite, ordered and bounded', () => {
    const kinds: PodracerAudioCueKind[] = [
      'weapon', 'weapon-hit', 'shield', 'mine', 'hazard', 'redline',
      'wreck', 'takedown', 'recovery', 'upgrade', 'vehicle',
    ];
    for (const kind of kinds) {
      const schedule = createAudioEnvelopeSchedule({ kind, intensity: 0.8 }, 1.5);
      expect(schedule).toHaveLength(4);
      expect(schedule.every((point, index) =>
        Number.isFinite(point.time) && Number.isFinite(point.value)
          && point.value > 0 && point.value <= 1
          && (index === 0 || point.time >= schedule[index - 1]!.time),
      )).toBe(true);
    }
  });
});

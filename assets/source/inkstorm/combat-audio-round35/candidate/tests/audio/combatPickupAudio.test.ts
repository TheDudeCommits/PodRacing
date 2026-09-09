import { describe, expect, it } from 'vitest';
import { createAudioEnvelopeSchedule, mapGameEventsToAudioCues } from '../../src/audio';

const local = { playerId: 'player' };
describe('EMP and repair audio event routing', () => {
  it('keeps emitter and receiver perspectives separate without sounding every nearby AI hit', () => {
    const events = [
      { type: 'emp-pulse', racerId: 'player' },
      { type: 'emp-hit', attackerId: 'player', targetId: 'rival-a', blocked: false },
      { type: 'emp-hit', attackerId: 'player', targetId: 'rival-b', blocked: true },
    ];
    expect(mapGameEventsToAudioCues(events, local).map(cue => cue.kind)).toEqual(['emp-pulse']);
    expect(mapGameEventsToAudioCues([{ type: 'emp-pulse', racerId: 'rival' },
      { type: 'emp-hit', targetId: 'player', blocked: false }], local).map(cue => cue.kind)).toEqual(['electric']);
    expect(mapGameEventsToAudioCues([{ type: 'emp-hit', targetId: 'player', blocked: true }], local).map(cue => cue.kind)).toEqual(['shield']);
    expect(mapGameEventsToAudioCues([{ type: 'emp-pulse', racerId: 'rival' }, { type: 'emp-hit', targetId: 'other', blocked: true }], local)).toEqual([]);
  });
  it('coalesces duplicate local EMP and shield voices within the authoritative event batch', () => {
    const cues = mapGameEventsToAudioCues([
      { type: 'emp-pulse', racerId: 'player' }, { type: 'emp-pulse', racerId: 'player' },
      { type: 'emp-hit', targetId: 'player', blocked: true }, { type: 'shield-block', racerId: 'player', absorbed: .5 },
    ], local);
    expect(cues.filter(cue => cue.kind === 'emp-pulse')).toHaveLength(1);
    expect(cues.filter(cue => cue.kind === 'shield')).toHaveLength(1);
  });
  it('accounts for damage, ordinary heat and core-only heat without rewarding no-op or malformed restoration', () => {
    for (const amounts of [{ repaired: .2 }, { cooled: .3 }, { coreCooled: .4 }]) {
      const cues = mapGameEventsToAudioCues([{ type: 'repair-salvage-collected', racerId: 'player', ...amounts }], local);
      expect(cues).toHaveLength(1); expect(cues[0]!.kind).toBe('repair');
      expect(cues[0]!.intensity).toBeLessThanOrEqual(.62);
    }
    expect(mapGameEventsToAudioCues([
      { type: 'repair-salvage-collected', racerId: 'rival', repaired: 1 },
      { type: 'repair-salvage-collected', racerId: 'player', repaired: -2, cooled: NaN, coreCooled: Infinity },
    ], local)).toEqual([]);
  });
  it('retains unscoped preview mapping and short finite conservative cue envelopes', () => {
    expect(mapGameEventsToAudioCues([{ type: 'emp-pulse', racerId: 'preview' }])[0]?.kind).toBe('emp-pulse');
    for (const kind of ['emp-pulse', 'repair'] as const) for (const intensity of [0, .5, 1, NaN, Infinity]) {
      const schedule = createAudioEnvelopeSchedule({ kind, intensity }, 2);
      expect(schedule.every((point, index) => Number.isFinite(point.time) && Number.isFinite(point.value)
        && point.value > 0 && point.value <= .23 && (!index || point.time > schedule[index - 1]!.time))).toBe(true);
      expect(schedule.at(-1)!.time - 2).toBeLessThan(.23);
    }
  });
});

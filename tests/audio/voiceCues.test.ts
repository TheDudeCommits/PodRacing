import { describe, expect, it } from 'vitest';
import { mapGameEventsToAudioCues } from '../../src/audio';
import { RECORDED_VOICE_LINES } from '../../src/audio/catalogue';

describe('sourced voice lines', () => {
  it('speaks the rivalry beats only for the local racer', () => {
    const events = [
      { type: 'rivalry-marked', racerId: 'player', rivalId: 'ai-1', duration: 45 },
      { type: 'revenge-pass', racerId: 'ai-1', rivalId: 'player', fromPosition: 3, toPosition: 2 },
    ];
    const cues = mapGameEventsToAudioCues(events, { playerId: 'player' });
    expect(cues.find((cue) => cue.kind === 'voice')?.voice).toBe(RECORDED_VOICE_LINES['rival-marked']);
    expect(mapGameEventsToAudioCues([{ type: 'revenge-pass', racerId: 'player', rivalId: 'ai-1', fromPosition: 3, toPosition: 2 }], { playerId: 'player' })
      .find((cue) => cue.kind === 'voice')?.voice).toBe(RECORDED_VOICE_LINES['revenge-pass']);
    expect(mapGameEventsToAudioCues([{ type: 'rivalry-settled', racerId: 'player', rivalId: 'ai-1' }], { playerId: 'player' })
      .find((cue) => cue.kind === 'voice')?.voice).toBe(RECORDED_VOICE_LINES['revenge-settled']);
  });

  it('calls the final lap only when a multi-lap race enters its last lap', () => {
    const lap = (completed: number, totalLaps: number) => mapGameEventsToAudioCues(
      [{ type: 'lap-complete', racerId: 'player', lap: completed, lapTime: 60 }], { playerId: 'player', totalLaps })
      .find((cue) => cue.kind === 'voice')?.voice;
    expect(lap(2, 3)).toBe(RECORDED_VOICE_LINES['final-lap']);
    expect(lap(1, 3)).toBeUndefined();
    expect(lap(0, 1)).toBeUndefined();
    expect(lap(2, 3 as number) && mapGameEventsToAudioCues([{ type: 'lap-complete', racerId: 'ai-1', lap: 2, lapTime: 60 }], { playerId: 'player', totalLaps: 3 })).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { RaceHighlightRecorder, type HighlightEntryLike } from '../../src/game/race/highlights';

function entry(id: string, finishTime: number | null = null): HighlightEntryLike {
  return {
    id,
    vehicle: {
      position: { x: id.length, y: 3, z: 10 },
      orientation: { yaw: 0.25 },
      telemetry: { speed: 190 },
    },
    progress: { courseProgress: 0.4, placement: null, finishTime },
  };
}

describe('RaceHighlightRecorder', () => {
  it('keeps bounded sparse JSON pose history', () => {
    const recorder = new RaceHighlightRecorder({ historySeconds: 4, sampleHz: 5 });
    const entries = [entry('player'), entry('rival')];
    for (let index = 0; index < 80; index += 1) recorder.recordFrame(index / 10, entries);
    const snapshot = recorder.snapshot(entries);
    expect(snapshot.frames).toHaveLength(20);
    expect(snapshot.frames[0]?.racers).toHaveLength(2);
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  it('classifies the most important race moments', () => {
    const recorder = new RaceHighlightRecorder();
    const entries = [entry('player'), entry('rival')];
    recorder.recordFrame(1, entries);
    recorder.consumeEvents(1, [
      { type: 'launch-result', racerId: 'player', outcome: 'perfect' },
      { type: 'overtake', racerId: 'player', passedId: 'rival' },
      { type: 'takedown', racerId: 'player', victimId: 'rival' },
    ]);
    expect(recorder.snapshot(entries).moments.map((moment) => moment.kind)).toEqual([
      'takedown', 'perfect-launch', 'overtake',
    ]);
  });

  it('identifies a sub-180ms photo finish', () => {
    const recorder = new RaceHighlightRecorder();
    const entries = [entry('player', 62.125), entry('rival', 62.244)];
    recorder.recordFrame(62.2, entries);
    const snapshot = recorder.snapshot(entries);
    expect(snapshot.photoFinishGap).toBeCloseTo(0.119, 8);
    expect(snapshot.moments.some((moment) => moment.kind === 'photo-finish')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { judgeRaceCadence, type RaceCadenceSummary } from '../../scripts/lib/race-cadence';

const complete: RaceCadenceSummary = { samples: 3800, durationMs: 63330.8, averageFps: 60.0024,
  p95Ms: 16.8, firstRaceTime: 0, lastRaceTime: 63.3167 };

describe('continuous race cadence acceptance', () => {
  it('accepts the complete recorded 60 Hz race', () => {
    expect(judgeRaceCadence(complete, 63.3167).outcome).toBe('PASS');
  });
  it('rejects an empty measurement rather than coercing a null start time to zero', () => {
    const result = judgeRaceCadence({ samples: 0, durationMs: 0, averageFps: null,
      p95Ms: null, firstRaceTime: null, lastRaceTime: null }, 63.3167);
    expect(result.outcome).toBe('FAIL');
    expect(result.issues).toContain('missed race start');
  });
  it('rejects a slow complete race even when gameplay succeeds', () => {
    expect(judgeRaceCadence({ ...complete, averageFps: 35, p95Ms: 33.4 }, 63.3167).issues)
      .toEqual(['mean cadence below 40 Hz', 'p95 interval above 25 ms']);
  });
  it('rejects a clipped or non-finite recording', () => {
    for (const patch of [{ firstRaceTime: 2 }, { lastRaceTime: 60 }, { durationMs: 40000 }, { p95Ms: NaN }]) {
      expect(judgeRaceCadence({ ...complete, ...patch }, 63.3167).outcome).toBe('FAIL');
    }
  });
});

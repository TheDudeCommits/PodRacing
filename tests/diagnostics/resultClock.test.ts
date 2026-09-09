import { describe, expect, it } from 'vitest';
import { expectedResultClock } from '../../scripts/lib/result-clock';

describe('independent result clock oracle', () => {
  it('preserves the recorded Sebulba boundary instead of losing a millisecond', () => {
    expect(expectedResultClock(63.32499999999705)).toBe('1:03.325');
    expect(expectedResultClock(63.32500000000295)).toBe('1:03.325');
  });

  it('still truncates real fractional milliseconds and detects a one-ms error', () => {
    expect(expectedResultClock(63.3249999)).toBe('1:03.324');
    expect(expectedResultClock(63.32499)).toBe('1:03.324');
    expect(expectedResultClock(63.316666666663714)).toBe('1:03.316');
    expect(expectedResultClock(63.323999999997)).not.toBe('1:03.325');
  });

  it('carries through minute and hour boundaries without changing precision', () => {
    expect(expectedResultClock(0)).toBe('0:00.000');
    expect(expectedResultClock(59.999999999999)).toBe('1:00.000');
    expect(expectedResultClock(3599.99999999999)).toBe('1:00:00.000');
    expect(expectedResultClock(3661.123456)).toBe('1:01:01.123');
  });

  it('rejects missing, negative, nonfinite and numerically unsafe race times', () => {
    for (const value of [NaN, Infinity, -Infinity, -1, Number.MAX_SAFE_INTEGER]) {
      expect(() => expectedResultClock(value)).toThrow(RangeError);
    }
  });
});

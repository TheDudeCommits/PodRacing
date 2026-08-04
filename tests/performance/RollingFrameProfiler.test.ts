import { describe, expect, it } from 'vitest';
import { RollingFrameProfiler } from '../../src/diagnostics/performance';

describe('RollingFrameProfiler', () => {
  it('keeps a fixed rolling window and reuses its telemetry object', () => {
    const profiler = new RollingFrameProfiler({
      windowSize: 4,
      budgetMs: 13.5,
      histogramBinMs: 0.5,
    });
    const telemetry = profiler.telemetry;
    profiler.sample(8);
    profiler.sample(10);
    profiler.sample(12);
    const last = profiler.sample(14);

    expect(last).toBe(telemetry);
    expect(last.averageFrameMs).toBe(11);
    expect(last.worstFrameMs).toBe(14);
    expect(last.overBudgetRatio).toBe(0.25);

    profiler.sample(6);
    expect(telemetry.windowSamples).toBe(4);
    expect(telemetry.totalSamples).toBe(5);
    expect(telemetry.averageFrameMs).toBe(10.5);
    expect(telemetry.worstFrameMs).toBe(14);
  });

  it('clamps pathological intervals and reports bounded percentiles', () => {
    const profiler = new RollingFrameProfiler({
      windowSize: 4,
      maximumFrameMs: 100,
      histogramBinMs: 0.5,
    });
    profiler.sample(-5);
    profiler.sample(Number.NaN);
    profiler.sample(Number.POSITIVE_INFINITY);
    profiler.sample(250);

    const telemetry = profiler.telemetry;
    expect(telemetry.lastFrameMs).toBe(100);
    expect(telemetry.worstFrameMs).toBe(100);
    expect(telemetry.p95FrameMs).toBeLessThanOrEqual(100);
    expect(telemetry.invalidSampleCount).toBe(2);
    expect(telemetry.averageFrameMs).toBe(75);
  });

  it('resets without replacing its storage-facing telemetry', () => {
    const profiler = new RollingFrameProfiler();
    const telemetry = profiler.sample(12);
    profiler.reset();
    expect(profiler.telemetry).toBe(telemetry);
    expect(telemetry.totalSamples).toBe(0);
    expect(telemetry.averageFrameMs).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  PERFORMANCE_QUALITY_LEVEL_COUNT,
  PerformanceGovernor,
} from '../../src/diagnostics/performance';

function sampleMany(
  governor: PerformanceGovernor,
  count: number,
  frameMs: number,
  startMs: number,
  intervalMs = 17,
): void {
  for (let index = 0; index < count; index += 1) {
    governor.sample(frameMs, startMs + index * intervalMs);
  }
}

describe('PerformanceGovernor', () => {
  it('requires sustained overload and respects its degradation cooldown', () => {
    const governor = new PerformanceGovernor({
      windowSize: 4,
      warmupSamples: 1,
      degradeHoldSamples: 3,
      recoverHoldSamples: 4,
      degradeCooldownMs: 1_000,
      initialQualityLevel: 2,
    });
    const decision = governor.decision;

    governor.sample(20, 0);
    governor.sample(20, 17);
    expect(decision.qualityLevel).toBe(2);
    const changed = governor.sample(20, 34);
    expect(changed).toBe(decision);
    expect(changed.changed).toBe(true);
    expect(changed.reason).toBe('frame-budget');
    expect(changed.qualityLevel).toBe(3);

    sampleMany(governor, 10, 20, 51, 17);
    expect(decision.qualityLevel).toBe(3);
    expect(governor.telemetry.cooldownRemainingMs).toBeGreaterThan(0);

    governor.sample(20, 1_034);
    governor.sample(20, 1_051);
    governor.sample(20, 1_068);
    expect(decision.qualityLevel).toBe(4);
  });

  it('recovers more slowly after a clean rolling window', () => {
    const governor = new PerformanceGovernor({
      windowSize: 4,
      warmupSamples: 1,
      degradeHoldSamples: 2,
      recoverHoldSamples: 5,
      degradeCooldownMs: 0,
      recoverCooldownMs: 0,
      initialQualityLevel: 5,
    });

    let recovered = false;
    for (let index = 0; index < 8; index += 1) {
      const decision = governor.sample(7, index * 17);
      if (decision.changed && decision.reason === 'recovered') recovered = true;
    }
    expect(recovered).toBe(true);
    expect(governor.decision.qualityLevel).toBe(4);
    expect(governor.decision.dustQuality).toBe('medium');
  });

  it('uses renderer pressure as a structural degradation signal', () => {
    const governor = new PerformanceGovernor({
      windowSize: 4,
      rendererWindowSize: 4,
      warmupSamples: 2,
      degradeHoldSamples: 2,
      degradeCooldownMs: 0,
      initialQualityLevel: 4,
    });
    governor.observeRendererInfo({ calls: 986, triangles: 251_000 });
    governor.sample(8, 0);
    governor.observeRendererInfo({ calls: 980, triangles: 253_000 });
    governor.sample(8, 17);
    governor.observeRendererInfo({ calls: 970, triangles: 250_000 });
    const decision = governor.sample(8, 34);

    expect(decision.changed).toBe(true);
    expect(decision.reason).toBe('renderer-budget');
    expect(decision.qualityLevel).toBe(5);
    expect(decision.distantRivalLod).toBe('simplified');
    expect(governor.telemetry.cadenceAware).toBe(false);
    expect(governor.telemetry.cadence).toBeNull();
  });

  it('keeps maximum sharpness with fast CPU work and 60 Hz cadence despite high renderer counts', () => {
    const governor = new PerformanceGovernor({
      cadenceAware: true,
      windowSize: 4,
      rendererWindowSize: 4,
      warmupSamples: 2,
      degradeHoldSamples: 2,
      recoverHoldSamples: 3,
      degradeCooldownMs: 0,
      initialQualityLevel: 0,
    });
    const decision = governor.decision;
    const cadence = governor.telemetry.cadence;
    for (let index = 0; index < 40; index += 1) {
      governor.observeRendererInfo({ calls: 900, triangles: 1_200_000 });
      expect(governor.sample(6, index * 1000 / 60)).toBe(decision);
    }
    expect(decision.qualityLevel).toBe(0);
    expect(decision.pixelRatio).toBe(2);
    expect(governor.telemetry.renderer.pressure).toBeGreaterThan(1);
    expect(governor.telemetry.cadence).toBe(cadence);
    expect(cadence?.averageFrameMs).toBeCloseTo(1000 / 60);
    expect(cadence?.totalSamples).toBe(39);
    expect(governor.telemetry.cadenceWarmedUp).toBe(true);
  });

  it.each([33, 300])('degrades on sustained %i ms callback cadence with low CPU work', (intervalMs) => {
    const governor = new PerformanceGovernor({
      cadenceAware: true,
      windowSize: 4,
      warmupSamples: 2,
      degradeHoldSamples: 3,
      degradeCooldownMs: 1_000,
      initialQualityLevel: 0,
    });
    sampleMany(governor, 4, 5, 0, intervalMs);
    expect(governor.decision.qualityLevel).toBe(0);
    governor.sample(5, intervalMs * 4);
    expect(governor.decision.qualityLevel).toBe(1);
    expect(governor.decision.reason).toBe('cadence-budget');
    expect(governor.telemetry.frame.averageFrameMs).toBe(5);
    expect(governor.telemetry.cadence?.averageFrameMs).toBe(intervalMs);
    // Even 300 ms active intervals count; they must not repeatedly reset the
    // cadence window and mask sustained very poor presentation cadence.
    expect(governor.telemetry.cadence?.totalSamples).toBe(4);
    sampleMany(governor, 3, 5, intervalMs * 5, intervalMs);
    expect(governor.decision.qualityLevel).toBe(1);
    expect(governor.telemetry.cooldownRemainingMs).toBeGreaterThan(0);
  });

  it('still degrades sustained measured work overload when cadence fits the target', () => {
    const governor = new PerformanceGovernor({
      cadenceAware: true,
      windowSize: 4,
      warmupSamples: 2,
      degradeHoldSamples: 3,
      initialQualityLevel: 0,
    });
    sampleMany(governor, 5, 20, 0, 1000 / 60);
    expect(governor.decision.qualityLevel).toBe(1);
    expect(governor.decision.reason).toBe('frame-budget');
  });

  it('recovers with sustained 20 ms cadence despite renderer counts and preserves recovery cooldown', () => {
    const governor = new PerformanceGovernor({
      cadenceAware: true,
      windowSize: 4,
      rendererWindowSize: 4,
      warmupSamples: 2,
      recoverHoldSamples: 5,
      recoverCooldownMs: 1_000,
      initialQualityLevel: 4,
    });
    for (let index = 0; index < 7; index += 1) {
      governor.observeRendererInfo({ calls: 900, triangles: 1_200_000 });
      governor.sample(7, index * 20);
    }
    expect(governor.decision.qualityLevel).toBe(3);
    expect(governor.decision.reason).toBe('recovered');
    expect(governor.telemetry.cadence?.framesPerSecond).toBe(50);
    expect(governor.telemetry.renderer.pressure).toBeGreaterThan(1);
    sampleMany(governor, 10, 7, 140, 20);
    expect(governor.decision.qualityLevel).toBe(3);
    expect(governor.telemetry.cooldownRemainingMs).toBeGreaterThan(0);
  });

  it('holds quality inside the cadence hysteresis band without premature recovery', () => {
    const governor = new PerformanceGovernor({
      cadenceAware: true,
      windowSize: 4,
      warmupSamples: 2,
      degradeHoldSamples: 2,
      recoverHoldSamples: 2,
      initialQualityLevel: 4,
    });
    sampleMany(governor, 30, 7, 0, 24);
    expect(governor.decision.qualityLevel).toBe(4);
    expect(governor.telemetry.overBudgetSamples).toBe(0);
    expect(governor.telemetry.underBudgetSamples).toBe(0);
  });

  it.each(['reset', 'adaptive boundary'])('excludes the first interval after an explicit %s', (boundary) => {
    const governor = new PerformanceGovernor({
      cadenceAware: true,
      windowSize: 4,
      warmupSamples: 2,
      degradeHoldSamples: 2,
      recoverHoldSamples: 100,
      initialQualityLevel: 2,
    });
    sampleMany(governor, 4, 6, 0, 17);
    if (boundary === 'reset') {
      governor.resetMeasurements();
    } else {
      governor.setAdaptiveEnabled(false);
      governor.sample(6, 9_000);
      governor.setAdaptiveEnabled(true);
    }
    governor.sample(6, 10_000);
    expect(governor.telemetry.cadence?.totalSamples).toBe(0);
    expect(governor.telemetry.warmedUp).toBe(false);
    governor.sample(6, 10_017);
    expect(governor.telemetry.warmedUp).toBe(false);
    governor.sample(6, 10_034);
    expect(governor.telemetry.warmedUp).toBe(true);
    expect(governor.telemetry.cadence?.totalSamples).toBe(2);
    expect(governor.telemetry.cadence?.worstFrameMs).toBe(17);
    expect(governor.decision.qualityLevel).toBe(2);
  });

  it('does not invent cadence intervals or recovery samples from invalid timestamps', () => {
    const governor = new PerformanceGovernor({
      cadenceAware: true,
      windowSize: 4,
      warmupSamples: 1,
      recoverHoldSamples: 2,
      initialQualityLevel: 4,
    });
    governor.sample(6, 0);
    governor.sample(6, 17);
    governor.sample(6, Number.NaN);
    governor.sample(6, 17);
    governor.sample(6, 10);
    expect(governor.telemetry.cadence?.totalSamples).toBe(1);
    expect(governor.decision.qualityLevel).toBe(4);
    governor.sample(6, 34);
    expect(governor.telemetry.cadence?.totalSamples).toBe(2);
    expect(governor.decision.reason).toBe('recovered');
    expect(governor.decision.qualityLevel).toBe(3);
  });

  it('clamps every public quality output to the supported range', () => {
    const governor = new PerformanceGovernor({
      initialQualityLevel: -20,
      minPixelRatio: 0.25,
      maxPixelRatio: 4,
      minTerrainLevels: 0,
      maxTerrainLevels: 20,
    });
    expect(governor.decision.qualityLevel).toBe(0);
    expect(governor.decision.pixelRatio).toBe(2);
    expect(governor.decision.prepassScale).toBe(1);
    expect(governor.decision.terrainLevelCount).toBe(8);

    governor.setQualityLevel(Number.POSITIVE_INFINITY);
    expect(governor.decision.qualityLevel).toBe(0);
    governor.setQualityLevel(999);
    expect(governor.decision.qualityLevel).toBe(PERFORMANCE_QUALITY_LEVEL_COUNT - 1);
    expect(governor.decision.pixelRatio).toBe(1);
    expect(governor.decision.prepassScale).toBe(0.65);
    expect(governor.decision.terrainLevelCount).toBe(1);
    expect(governor.decision.dustQuality).toBe('low');
    expect(governor.decision.distantRivalLod).toBe('silhouette');
  });

  it('freezes adaptation for deterministic review capture', () => {
    const governor = new PerformanceGovernor({
      warmupSamples: 1,
      degradeHoldSamples: 1,
    });
    governor.setAdaptiveEnabled(false);
    sampleMany(governor, 20, 100, 0);
    expect(governor.decision.qualityLevel).toBe(2);
    expect(governor.decision.reason).toBe('adaptive-disabled');
  });
});

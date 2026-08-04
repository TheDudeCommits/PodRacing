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

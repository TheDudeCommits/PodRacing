import { describe, expect, it } from 'vitest';
import { RendererInfoAggregator } from '../../src/diagnostics/performance';

describe('RendererInfoAggregator', () => {
  it('aggregates the complete frame graph against explicit budgets', () => {
    const aggregator = new RendererInfoAggregator({
      windowSize: 4,
      drawCallBudget: 180,
      triangleBudget: 600_000,
    });
    const telemetry = aggregator.telemetry;
    aggregator.sampleCounts(160, 300_000);
    aggregator.sample({ calls: 220, triangles: 420_000, lines: 840 });

    expect(aggregator.telemetry).toBe(telemetry);
    expect(telemetry.averageCalls).toBe(190);
    expect(telemetry.averageTriangles).toBe(360_000);
    expect(telemetry.callPressure).toBeCloseTo(190 / 180);
    expect(telemetry.trianglePressure).toBeCloseTo(0.6);
    expect(telemetry.pressure).toBe(telemetry.callPressure);
    expect(telemetry.overBudgetRatio).toBe(0.5);
    expect(telemetry.overBudget).toBe(true);
    expect(telemetry.lines).toBe(840);
  });

  it('evicts old peaks with the rolling window', () => {
    const aggregator = new RendererInfoAggregator({ windowSize: 4 });
    aggregator.sampleCounts(900, 900_000);
    aggregator.sampleCounts(100, 100_000);
    aggregator.sampleCounts(110, 110_000);
    aggregator.sampleCounts(120, 120_000);
    aggregator.sampleCounts(130, 130_000);

    expect(aggregator.telemetry.peakCalls).toBe(130);
    expect(aggregator.telemetry.peakTriangles).toBe(130_000);
    expect(aggregator.telemetry.averageCalls).toBe(115);
  });
});

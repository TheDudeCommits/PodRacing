import type {
  RendererBudgetTelemetry,
  RendererInfoLike,
} from './types';

export interface RendererInfoAggregatorOptions {
  windowSize?: number;
  drawCallBudget?: number;
  triangleBudget?: number;
}

function finiteCount(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value ?? 0)) : 0;
}

/**
 * Aggregates the full Three.js frame graph after a single `renderer.info.reset`.
 * Its sample path uses fixed typed arrays and a stable telemetry object.
 */
export class RendererInfoAggregator {
  readonly windowSize: number;

  private readonly callRing: Float64Array;
  private readonly triangleRing: Float64Array;
  private readonly overBudgetRing: Uint8Array;
  private readonly telemetryValue: RendererBudgetTelemetry;
  private cursor = 0;
  private count = 0;
  private sumCalls = 0;
  private sumTriangles = 0;
  private overBudgetCount = 0;

  constructor(options: RendererInfoAggregatorOptions = {}) {
    this.windowSize = Math.min(4096, Math.max(4, Math.floor(options.windowSize ?? 120)));
    const drawCallBudget = Math.max(1, Math.floor(options.drawCallBudget ?? 180));
    const triangleBudget = Math.max(1, Math.floor(options.triangleBudget ?? 600_000));
    this.callRing = new Float64Array(this.windowSize);
    this.triangleRing = new Float64Array(this.windowSize);
    this.overBudgetRing = new Uint8Array(this.windowSize);
    this.telemetryValue = {
      totalSamples: 0,
      windowSamples: 0,
      drawCallBudget,
      triangleBudget,
      calls: 0,
      triangles: 0,
      points: 0,
      lines: 0,
      averageCalls: 0,
      averageTriangles: 0,
      peakCalls: 0,
      peakTriangles: 0,
      callPressure: 0,
      trianglePressure: 0,
      pressure: 0,
      overBudgetRatio: 0,
      overBudget: false,
    };
  }

  get telemetry(): Readonly<RendererBudgetTelemetry> {
    return this.telemetryValue;
  }

  sample(info: RendererInfoLike): Readonly<RendererBudgetTelemetry> {
    return this.sampleCounts(
      info.calls,
      info.triangles,
      info.points ?? 0,
      info.lines ?? 0,
    );
  }

  sampleCounts(
    calls: number,
    triangles: number,
    points = 0,
    lines = 0,
  ): Readonly<RendererBudgetTelemetry> {
    const nextCalls = finiteCount(calls);
    const nextTriangles = finiteCount(triangles);
    let removedCalls = 0;
    let removedTriangles = 0;
    let recomputePeakCalls = false;
    let recomputePeakTriangles = false;

    if (this.count === this.windowSize) {
      removedCalls = this.callRing[this.cursor] ?? 0;
      removedTriangles = this.triangleRing[this.cursor] ?? 0;
      recomputePeakCalls = removedCalls >= this.telemetryValue.peakCalls;
      recomputePeakTriangles = removedTriangles >= this.telemetryValue.peakTriangles;
      this.sumCalls -= removedCalls;
      this.sumTriangles -= removedTriangles;
      this.overBudgetCount -= this.overBudgetRing[this.cursor] ?? 0;
    } else {
      this.count += 1;
    }

    const overBudget = nextCalls > this.telemetryValue.drawCallBudget
      || nextTriangles > this.telemetryValue.triangleBudget;
    this.callRing[this.cursor] = nextCalls;
    this.triangleRing[this.cursor] = nextTriangles;
    this.overBudgetRing[this.cursor] = overBudget ? 1 : 0;
    this.cursor = (this.cursor + 1) % this.windowSize;
    this.sumCalls += nextCalls;
    this.sumTriangles += nextTriangles;
    if (overBudget) this.overBudgetCount += 1;

    const telemetry = this.telemetryValue;
    telemetry.totalSamples += 1;
    telemetry.windowSamples = this.count;
    telemetry.calls = nextCalls;
    telemetry.triangles = nextTriangles;
    telemetry.points = finiteCount(points);
    telemetry.lines = finiteCount(lines);
    telemetry.averageCalls = this.sumCalls / this.count;
    telemetry.averageTriangles = this.sumTriangles / this.count;
    telemetry.callPressure = telemetry.averageCalls / telemetry.drawCallBudget;
    telemetry.trianglePressure = telemetry.averageTriangles / telemetry.triangleBudget;
    telemetry.pressure = Math.max(telemetry.callPressure, telemetry.trianglePressure);
    telemetry.overBudgetRatio = this.overBudgetCount / this.count;
    telemetry.overBudget = telemetry.pressure > 1;

    if (nextCalls > telemetry.peakCalls) telemetry.peakCalls = nextCalls;
    else if (recomputePeakCalls) telemetry.peakCalls = this.findPeak(this.callRing);
    if (nextTriangles > telemetry.peakTriangles) telemetry.peakTriangles = nextTriangles;
    else if (recomputePeakTriangles) telemetry.peakTriangles = this.findPeak(this.triangleRing);

    return telemetry;
  }

  reset(): void {
    this.callRing.fill(0);
    this.triangleRing.fill(0);
    this.overBudgetRing.fill(0);
    this.cursor = 0;
    this.count = 0;
    this.sumCalls = 0;
    this.sumTriangles = 0;
    this.overBudgetCount = 0;
    const telemetry = this.telemetryValue;
    telemetry.totalSamples = 0;
    telemetry.windowSamples = 0;
    telemetry.calls = 0;
    telemetry.triangles = 0;
    telemetry.points = 0;
    telemetry.lines = 0;
    telemetry.averageCalls = 0;
    telemetry.averageTriangles = 0;
    telemetry.peakCalls = 0;
    telemetry.peakTriangles = 0;
    telemetry.callPressure = 0;
    telemetry.trianglePressure = 0;
    telemetry.pressure = 0;
    telemetry.overBudgetRatio = 0;
    telemetry.overBudget = false;
  }

  private findPeak(values: Float64Array): number {
    let peak = 0;
    for (let index = 0; index < this.count; index += 1) {
      const value = values[index] ?? 0;
      if (value > peak) peak = value;
    }
    return peak;
  }
}

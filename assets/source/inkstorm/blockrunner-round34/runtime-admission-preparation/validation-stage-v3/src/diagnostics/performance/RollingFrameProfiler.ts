import type { FrameProfileTelemetry } from './types';

export interface RollingFrameProfilerOptions {
  windowSize?: number;
  budgetMs?: number;
  vsyncFrameMs?: number;
  maximumFrameMs?: number;
  histogramBinMs?: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Fixed-capacity, allocation-free frame statistics.
 *
 * `sample` mutates a preallocated ring, histogram and telemetry object. The
 * percentile values are histogram estimates rounded up to the configured bin
 * width (0.5 ms by default), which is accurate enough for governor decisions
 * without sorting or allocating a scratch array every frame.
 */
export class RollingFrameProfiler {
  readonly windowSize: number;
  readonly budgetMs: number;

  private readonly maximumFrameMs: number;
  private readonly vsyncFrameMs: number;
  private readonly histogramBinMs: number;
  private readonly frames: Float64Array;
  private readonly histogram: Uint16Array;
  private readonly telemetryValue: FrameProfileTelemetry = {
    totalSamples: 0,
    windowSamples: 0,
    lastFrameMs: 0,
    averageFrameMs: 0,
    emaFrameMs: 0,
    p50FrameMs: 0,
    p95FrameMs: 0,
    p99FrameMs: 0,
    worstFrameMs: 0,
    framesPerSecond: 0,
    overBudgetRatio: 0,
    missedVsyncRatio: 0,
    invalidSampleCount: 0,
  };

  private cursor = 0;
  private count = 0;
  private sum = 0;
  private overBudgetCount = 0;
  private missedVsyncCount = 0;

  constructor(options: RollingFrameProfilerOptions = {}) {
    this.windowSize = Math.floor(clamp(options.windowSize ?? 180, 4, 4096));
    this.budgetMs = clamp(options.budgetMs ?? 13.5, 1, 100);
    this.vsyncFrameMs = clamp(options.vsyncFrameMs ?? 1000 / 60, this.budgetMs, 250);
    this.maximumFrameMs = clamp(options.maximumFrameMs ?? 250, this.vsyncFrameMs, 1000);
    this.histogramBinMs = clamp(options.histogramBinMs ?? 0.5, 0.1, 5);
    this.frames = new Float64Array(this.windowSize);
    this.histogram = new Uint16Array(
      Math.ceil(this.maximumFrameMs / this.histogramBinMs) + 1,
    );
  }

  get telemetry(): Readonly<FrameProfileTelemetry> {
    return this.telemetryValue;
  }

  /** Adds one measured work interval and returns the same telemetry object. */
  sample(frameMs: number): Readonly<FrameProfileTelemetry> {
    let value = frameMs;
    if (!Number.isFinite(value)) {
      this.telemetryValue.invalidSampleCount += 1;
      value = this.maximumFrameMs;
    }
    value = clamp(value, 0, this.maximumFrameMs);

    let removed = 0;
    let removedWasWorst = false;
    if (this.count === this.windowSize) {
      removed = this.frames[this.cursor] ?? 0;
      removedWasWorst = removed >= this.telemetryValue.worstFrameMs;
      this.sum -= removed;
      const removedBucket = this.bucketFor(removed);
      this.histogram[removedBucket] = (this.histogram[removedBucket] ?? 0) - 1;
      if (removed > this.budgetMs) this.overBudgetCount -= 1;
      if (removed > this.vsyncFrameMs) this.missedVsyncCount -= 1;
    } else {
      this.count += 1;
    }

    this.frames[this.cursor] = value;
    this.cursor = (this.cursor + 1) % this.windowSize;
    this.sum += value;
    const valueBucket = this.bucketFor(value);
    this.histogram[valueBucket] = (this.histogram[valueBucket] ?? 0) + 1;
    if (value > this.budgetMs) this.overBudgetCount += 1;
    if (value > this.vsyncFrameMs) this.missedVsyncCount += 1;

    const telemetry = this.telemetryValue;
    telemetry.totalSamples += 1;
    telemetry.windowSamples = this.count;
    telemetry.lastFrameMs = value;
    telemetry.averageFrameMs = this.sum / this.count;
    telemetry.framesPerSecond = telemetry.averageFrameMs > 0
      ? 1000 / telemetry.averageFrameMs
      : 0;
    telemetry.overBudgetRatio = this.overBudgetCount / this.count;
    telemetry.missedVsyncRatio = this.missedVsyncCount / this.count;
    telemetry.emaFrameMs = telemetry.totalSamples === 1
      ? value
      : telemetry.emaFrameMs + (value - telemetry.emaFrameMs) * (2 / (this.windowSize + 1));

    if (value > telemetry.worstFrameMs) {
      telemetry.worstFrameMs = value;
    } else if (removedWasWorst) {
      let worst = 0;
      for (let index = 0; index < this.count; index += 1) {
        const candidate = this.frames[index] ?? 0;
        if (candidate > worst) worst = candidate;
      }
      telemetry.worstFrameMs = worst;
    }

    this.updatePercentiles();
    return telemetry;
  }

  reset(): void {
    this.frames.fill(0);
    this.histogram.fill(0);
    this.cursor = 0;
    this.count = 0;
    this.sum = 0;
    this.overBudgetCount = 0;
    this.missedVsyncCount = 0;
    const telemetry = this.telemetryValue;
    telemetry.totalSamples = 0;
    telemetry.windowSamples = 0;
    telemetry.lastFrameMs = 0;
    telemetry.averageFrameMs = 0;
    telemetry.emaFrameMs = 0;
    telemetry.p50FrameMs = 0;
    telemetry.p95FrameMs = 0;
    telemetry.p99FrameMs = 0;
    telemetry.worstFrameMs = 0;
    telemetry.framesPerSecond = 0;
    telemetry.overBudgetRatio = 0;
    telemetry.missedVsyncRatio = 0;
    telemetry.invalidSampleCount = 0;
  }

  private bucketFor(value: number): number {
    return Math.min(
      this.histogram.length - 1,
      Math.floor(value / this.histogramBinMs),
    );
  }

  private updatePercentiles(): void {
    if (this.count === 0) return;
    const p50Target = Math.max(1, Math.ceil(this.count * 0.5));
    const p95Target = Math.max(1, Math.ceil(this.count * 0.95));
    const p99Target = Math.max(1, Math.ceil(this.count * 0.99));
    let cumulative = 0;
    let found50 = false;
    let found95 = false;
    for (let index = 0; index < this.histogram.length; index += 1) {
      cumulative += this.histogram[index] ?? 0;
      const upperBound = Math.min(
        this.maximumFrameMs,
        (index + 1) * this.histogramBinMs,
      );
      if (!found50 && cumulative >= p50Target) {
        this.telemetryValue.p50FrameMs = upperBound;
        found50 = true;
      }
      if (!found95 && cumulative >= p95Target) {
        this.telemetryValue.p95FrameMs = upperBound;
        found95 = true;
      }
      if (cumulative >= p99Target) {
        this.telemetryValue.p99FrameMs = upperBound;
        return;
      }
    }
  }
}

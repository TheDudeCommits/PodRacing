import { RendererInfoAggregator } from './RendererInfoAggregator';
import { RollingFrameProfiler } from './RollingFrameProfiler';
import type {
  DistantRivalLod,
  DustQuality,
  GovernorDecisionReason,
  PerformanceDecision,
  PerformanceGovernorOptions,
  PerformanceGovernorTelemetry,
  RendererBudgetTelemetry,
  RendererInfoLike,
} from './types';

export const PERFORMANCE_TARGET_FRAME_MS = 1000 / 60;
export const PERFORMANCE_SOFT_BUDGET_MS = 13.5;
export const PERFORMANCE_DRAW_CALL_BUDGET = 180;
export const PERFORMANCE_TRIANGLE_BUDGET = 600_000;
export const PERFORMANCE_QUALITY_LEVEL_COUNT = 9;

// Level zero is highest quality. The two initial steps preserve silhouettes and
// effects while reducing fill-rate; structural simplification comes later.
const PROFILE_DPR = [2, 1.875, 1.75, 1.625, 1.5, 1.375, 1.25, 1.125, 1] as const;
const PROFILE_PREPASS = [1, 0.92, 0.78, 0.78, 0.72, 0.72, 0.65, 0.65, 0.65] as const;
const PROFILE_TERRAIN = [1, 1, 1, 1, 1, 0.5, 0.5, 0, 0] as const;
const PROFILE_DUST: readonly DustQuality[] = [
  'high', 'high', 'high', 'high', 'medium', 'medium', 'medium', 'low', 'low',
];
const PROFILE_RIVAL: readonly DistantRivalLod[] = [
  // Every quality level uses the purpose-built distance LOD. Inside the
  // corresponding boundary rivals still render at full hero detail; beyond
  // it their animated pilot and turbine inserts project to only a few pixels,
  // yet keeping those articulated meshes submitted costs roughly twenty
  // beauty/outline draws per racer. `simplified` preserves both engine masses,
  // cockpit, class armour, connectivity, coupling glow and exhaust, so the
  // racing silhouette is unchanged while genuinely sub-pixel work is culled.
  'simplified', 'simplified', 'simplified', 'simplified', 'simplified', 'simplified', 'simplified', 'simplified', 'silhouette',
];
const PROFILE_RIVAL_DISTANCE = [360, 340, 320, 300, 260, 220, 180, 130, 90] as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value ?? fallback) : fallback;
}

/**
 * A conservative, allocation-free adaptive-quality state machine.
 *
 * Pass measured simulation + render work (not raw vsynced RAF intervals) to
 * `sample`. Report Three.js renderer information once after each complete frame
 * graph with `observeRendererInfo`. Degradation requires a sustained overload;
 * recovery is intentionally much slower to prevent visible quality pumping.
 */
export class PerformanceGovernor {
  readonly profiler: RollingFrameProfiler;
  readonly rendererInfo: RendererInfoAggregator;

  private readonly warmupSamples: number;
  private readonly degradeHoldSamples: number;
  private readonly recoverHoldSamples: number;
  private readonly degradeCooldownMs: number;
  private readonly recoverCooldownMs: number;
  private readonly minPixelRatio: number;
  private readonly maxPixelRatio: number;
  private readonly minTerrainLevels: number;
  private readonly maxTerrainLevels: number;
  private readonly decisionValue: PerformanceDecision;
  private readonly telemetryValue: PerformanceGovernorTelemetry;
  private readonly degradeThresholdMs: number;
  private readonly recoverThresholdMs: number;

  private adaptiveEnabledValue = true;
  private nextTransitionMs = 0;
  private lastNowMs = 0;

  constructor(options: PerformanceGovernorOptions = {}) {
    const softBudgetMs = clamp(
      finiteOr(options.softBudgetMs, PERFORMANCE_SOFT_BUDGET_MS),
      1,
      PERFORMANCE_TARGET_FRAME_MS,
    );
    this.degradeThresholdMs = clamp(
      finiteOr(options.degradeThresholdMs, softBudgetMs + 1),
      softBudgetMs,
      100,
    );
    this.recoverThresholdMs = clamp(
      finiteOr(options.recoverThresholdMs, softBudgetMs - 2.25),
      0.5,
      softBudgetMs - 0.1,
    );
    this.warmupSamples = Math.floor(clamp(finiteOr(options.warmupSamples, 45), 1, 4096));
    this.degradeHoldSamples = Math.floor(clamp(finiteOr(options.degradeHoldSamples, 24), 1, 4096));
    this.recoverHoldSamples = Math.floor(clamp(finiteOr(options.recoverHoldSamples, 240), 1, 16_384));
    this.degradeCooldownMs = clamp(finiteOr(options.degradeCooldownMs, 900), 0, 60_000);
    this.recoverCooldownMs = clamp(finiteOr(options.recoverCooldownMs, 3_000), 0, 120_000);

    this.minPixelRatio = clamp(finiteOr(options.minPixelRatio, 1), 1, 2);
    this.maxPixelRatio = Math.max(
      this.minPixelRatio,
      clamp(finiteOr(options.maxPixelRatio, 2), 1, 2),
    );
    this.minTerrainLevels = Math.floor(clamp(finiteOr(options.minTerrainLevels, 4), 1, 8));
    this.maxTerrainLevels = Math.max(
      this.minTerrainLevels,
      Math.floor(clamp(finiteOr(options.maxTerrainLevels, 6), 1, 8)),
    );

    this.profiler = new RollingFrameProfiler({
      windowSize: options.windowSize,
      budgetMs: softBudgetMs,
    });
    this.rendererInfo = new RendererInfoAggregator({
      windowSize: options.rendererWindowSize,
      drawCallBudget: options.drawCallBudget ?? PERFORMANCE_DRAW_CALL_BUDGET,
      triangleBudget: options.triangleBudget ?? PERFORMANCE_TRIANGLE_BUDGET,
    });

    const initialLevel = Math.floor(clamp(
      finiteOr(options.initialQualityLevel, 2),
      0,
      PERFORMANCE_QUALITY_LEVEL_COUNT - 1,
    ));
    this.decisionValue = {
      changed: true,
      revision: 0,
      reason: 'initial',
      qualityLevel: initialLevel,
      pixelRatio: 1,
      prepassScale: 1,
      terrainLevelCount: this.maxTerrainLevels,
      dustQuality: 'high',
      distantRivalLod: 'full',
      distantRivalLodDistance: 320,
    };
    this.applyProfile(initialLevel);
    this.telemetryValue = {
      frame: this.profiler.telemetry,
      renderer: this.rendererInfo.telemetry,
      decision: this.decisionValue,
      targetFrameMs: PERFORMANCE_TARGET_FRAME_MS,
      softBudgetMs,
      degradeThresholdMs: this.degradeThresholdMs,
      recoverThresholdMs: this.recoverThresholdMs,
      overBudgetSamples: 0,
      underBudgetSamples: 0,
      adaptiveEnabled: true,
      warmedUp: false,
      cooldownRemainingMs: 0,
    };
  }

  get decision(): Readonly<PerformanceDecision> {
    return this.decisionValue;
  }

  get telemetry(): Readonly<PerformanceGovernorTelemetry> {
    return this.telemetryValue;
  }

  /** Call after the full MRT + beauty + outline + composite frame graph. */
  observeRendererInfo(info: RendererInfoLike): Readonly<RendererBudgetTelemetry> {
    return this.rendererInfo.sample(info);
  }

  setAdaptiveEnabled(enabled: boolean): void {
    this.adaptiveEnabledValue = enabled;
    this.telemetryValue.adaptiveEnabled = enabled;
    this.telemetryValue.overBudgetSamples = 0;
    this.telemetryValue.underBudgetSamples = 0;
  }

  /** Manual/capture override. The requested level is clamped to the ladder. */
  setQualityLevel(level: number, nowMs = this.lastNowMs): Readonly<PerformanceDecision> {
    const clampedLevel = Math.floor(clamp(
      Number.isFinite(level) ? level : this.decisionValue.qualityLevel,
      0,
      PERFORMANCE_QUALITY_LEVEL_COUNT - 1,
    ));
    this.commitLevel(clampedLevel, 'manual', this.sanitizeNow(nowMs));
    return this.decisionValue;
  }

  /**
   * Samples measured frame work and returns a stable decision object. No object,
   * array or closure is allocated on this hot path.
   */
  sample(frameMs: number, nowMs: number): Readonly<PerformanceDecision> {
    const now = this.sanitizeNow(nowMs);
    const frame = this.profiler.sample(frameMs);
    const renderer = this.rendererInfo.telemetry;
    const telemetry = this.telemetryValue;
    const decision = this.decisionValue;
    decision.changed = false;
    decision.reason = 'stable';

    telemetry.warmedUp = frame.windowSamples >= Math.min(
      this.profiler.windowSize,
      this.warmupSamples,
    );
    telemetry.cooldownRemainingMs = Math.max(0, this.nextTransitionMs - now);
    if (!this.adaptiveEnabledValue) {
      decision.reason = 'adaptive-disabled';
      return decision;
    }
    if (!telemetry.warmedUp) return decision;

    const rendererWarmed = renderer.windowSamples >= Math.min(
      this.rendererInfo.windowSize,
      this.warmupSamples,
    );
    const frameOverBudget = frame.emaFrameMs >= this.degradeThresholdMs
      || (
        frame.p95FrameMs >= this.degradeThresholdMs + 2
        && frame.overBudgetRatio >= 0.35
      );
    const rendererOverBudget = rendererWarmed
      && renderer.pressure > 1
      && renderer.overBudgetRatio >= 0.5;
    const frameUnderBudget = frame.emaFrameMs <= this.recoverThresholdMs
      && frame.p95FrameMs <= this.telemetryValue.softBudgetMs
      && frame.overBudgetRatio <= 0.05;
    const rendererHasHeadroom = !rendererWarmed || renderer.pressure <= 0.82;

    if (frameOverBudget || rendererOverBudget) {
      telemetry.overBudgetSamples += 1;
      telemetry.underBudgetSamples = 0;
    } else if (frameUnderBudget && rendererHasHeadroom) {
      telemetry.underBudgetSamples += 1;
      telemetry.overBudgetSamples = 0;
    } else {
      telemetry.overBudgetSamples = 0;
      telemetry.underBudgetSamples = 0;
    }

    if (
      telemetry.overBudgetSamples >= this.degradeHoldSamples
      && now >= this.nextTransitionMs
    ) {
      telemetry.overBudgetSamples = 0;
      const reason: GovernorDecisionReason = rendererOverBudget
        ? 'renderer-budget'
        : 'frame-budget';
      if (!this.moveLevel(1, reason, now)) decision.reason = 'minimum-quality';
    } else if (
      telemetry.underBudgetSamples >= this.recoverHoldSamples
      && now >= this.nextTransitionMs
    ) {
      telemetry.underBudgetSamples = 0;
      if (!this.moveLevel(-1, 'recovered', now)) decision.reason = 'maximum-quality';
    }

    telemetry.cooldownRemainingMs = Math.max(0, this.nextTransitionMs - now);
    return decision;
  }

  resetMeasurements(): void {
    this.profiler.reset();
    this.rendererInfo.reset();
    this.telemetryValue.overBudgetSamples = 0;
    this.telemetryValue.underBudgetSamples = 0;
    this.telemetryValue.warmedUp = false;
    this.telemetryValue.cooldownRemainingMs = 0;
    this.nextTransitionMs = this.lastNowMs;
  }

  private moveLevel(
    direction: -1 | 1,
    reason: GovernorDecisionReason,
    nowMs: number,
  ): boolean {
    let candidate = this.decisionValue.qualityLevel + direction;
    while (candidate >= 0 && candidate < PERFORMANCE_QUALITY_LEVEL_COUNT) {
      if (this.profileDiffers(candidate)) {
        this.commitLevel(candidate, reason, nowMs);
        return true;
      }
      candidate += direction;
    }
    return false;
  }

  private commitLevel(
    level: number,
    reason: GovernorDecisionReason,
    nowMs: number,
  ): void {
    const changed = this.profileDiffers(level)
      || level !== this.decisionValue.qualityLevel;
    this.applyProfile(level);
    if (!changed) {
      this.decisionValue.changed = false;
      this.decisionValue.reason = reason;
      return;
    }
    this.decisionValue.changed = true;
    this.decisionValue.revision += 1;
    this.decisionValue.reason = reason;
    this.telemetryValue.overBudgetSamples = 0;
    this.telemetryValue.underBudgetSamples = 0;
    this.nextTransitionMs = nowMs + (
      reason === 'recovered' ? this.recoverCooldownMs : this.degradeCooldownMs
    );
  }

  private profileDiffers(level: number): boolean {
    const dpr = this.pixelRatioFor(level);
    const prepass = PROFILE_PREPASS[level] ?? 0.65;
    const terrain = this.terrainLevelsFor(level);
    return dpr !== this.decisionValue.pixelRatio
      || prepass !== this.decisionValue.prepassScale
      || terrain !== this.decisionValue.terrainLevelCount
      || PROFILE_DUST[level] !== this.decisionValue.dustQuality
      || PROFILE_RIVAL[level] !== this.decisionValue.distantRivalLod
      || PROFILE_RIVAL_DISTANCE[level] !== this.decisionValue.distantRivalLodDistance;
  }

  private applyProfile(level: number): void {
    this.decisionValue.qualityLevel = level;
    this.decisionValue.pixelRatio = this.pixelRatioFor(level);
    this.decisionValue.prepassScale = PROFILE_PREPASS[level] ?? 0.65;
    this.decisionValue.terrainLevelCount = this.terrainLevelsFor(level);
    this.decisionValue.dustQuality = PROFILE_DUST[level] ?? 'low';
    this.decisionValue.distantRivalLod = PROFILE_RIVAL[level] ?? 'silhouette';
    this.decisionValue.distantRivalLodDistance = PROFILE_RIVAL_DISTANCE[level] ?? 90;
  }

  private pixelRatioFor(level: number): number {
    const profile = PROFILE_DPR[level] ?? 1;
    return clamp(profile, this.minPixelRatio, this.maxPixelRatio);
  }

  private terrainLevelsFor(level: number): number {
    const normalized = PROFILE_TERRAIN[level] ?? 0;
    return Math.round(
      this.minTerrainLevels
      + (this.maxTerrainLevels - this.minTerrainLevels) * normalized,
    );
  }

  private sanitizeNow(nowMs: number): number {
    const finiteNow = Number.isFinite(nowMs) ? nowMs : this.lastNowMs;
    this.lastNowMs = Math.max(this.lastNowMs, finiteNow);
    return this.lastNowMs;
  }
}

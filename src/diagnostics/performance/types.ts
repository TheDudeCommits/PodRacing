export type DustQuality = 'high' | 'medium' | 'low';

/**
 * A render-side hint, deliberately independent of any particular racer view.
 * `silhouette` should retain the inked overall shape and engine glow rather
 * than hiding a rival entirely.
 */
export type DistantRivalLod = 'full' | 'simplified' | 'silhouette';

export type GovernorDecisionReason =
  | 'initial'
  | 'stable'
  | 'frame-budget'
  | 'renderer-budget'
  | 'recovered'
  | 'manual'
  | 'adaptive-disabled'
  | 'minimum-quality'
  | 'maximum-quality';

/**
 * This object is stable for the lifetime of the governor. Consumers should
 * read it after `sample` and apply values only when `changed` is true.
 */
export interface PerformanceDecision {
  changed: boolean;
  revision: number;
  reason: GovernorDecisionReason;
  /** Zero is the highest quality; larger values are progressively cheaper. */
  qualityLevel: number;
  pixelRatio: number;
  prepassScale: number;
  terrainLevelCount: number;
  dustQuality: DustQuality;
  distantRivalLod: DistantRivalLod;
  /** Suggested logical distance beyond which the rival LOD may be used. */
  distantRivalLodDistance: number;
}

export interface FrameProfileTelemetry {
  totalSamples: number;
  windowSamples: number;
  lastFrameMs: number;
  averageFrameMs: number;
  emaFrameMs: number;
  p50FrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  worstFrameMs: number;
  framesPerSecond: number;
  overBudgetRatio: number;
  missedVsyncRatio: number;
  invalidSampleCount: number;
}

/** The subset of THREE.WebGLInfo.render consumed by diagnostics. */
export interface RendererInfoLike {
  readonly calls: number;
  readonly triangles: number;
  readonly points?: number;
  readonly lines?: number;
}

export interface RendererBudgetTelemetry {
  totalSamples: number;
  windowSamples: number;
  drawCallBudget: number;
  triangleBudget: number;
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  averageCalls: number;
  averageTriangles: number;
  peakCalls: number;
  peakTriangles: number;
  callPressure: number;
  trianglePressure: number;
  pressure: number;
  overBudgetRatio: number;
  overBudget: boolean;
}

export interface PerformanceGovernorTelemetry {
  readonly frame: Readonly<FrameProfileTelemetry>;
  readonly renderer: Readonly<RendererBudgetTelemetry>;
  readonly decision: Readonly<PerformanceDecision>;
  targetFrameMs: number;
  softBudgetMs: number;
  degradeThresholdMs: number;
  recoverThresholdMs: number;
  overBudgetSamples: number;
  underBudgetSamples: number;
  adaptiveEnabled: boolean;
  warmedUp: boolean;
  cooldownRemainingMs: number;
}

export interface PerformanceGovernorOptions {
  /** Rolling workload window. Defaults to 180 samples (three seconds at 60 Hz). */
  windowSize?: number;
  /** The CPU + observed render-work ceiling, leaving headroom below vsync. */
  softBudgetMs?: number;
  degradeThresholdMs?: number;
  recoverThresholdMs?: number;
  warmupSamples?: number;
  degradeHoldSamples?: number;
  recoverHoldSamples?: number;
  degradeCooldownMs?: number;
  recoverCooldownMs?: number;
  initialQualityLevel?: number;
  minPixelRatio?: number;
  maxPixelRatio?: number;
  minTerrainLevels?: number;
  maxTerrainLevels?: number;
  rendererWindowSize?: number;
  drawCallBudget?: number;
  triangleBudget?: number;
}

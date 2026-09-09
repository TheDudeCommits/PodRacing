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
  | 'cadence-budget'
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
  /** Callback intervals, not GPU durations. Null in the default legacy mode.
   * Its over-budget/missed-vsync ratios use cadenceDegradeThresholdMs (40 Hz
   * by default), not an inferred monitor refresh rate.
   */
  readonly cadence: Readonly<FrameProfileTelemetry> | null;
  readonly renderer: Readonly<RendererBudgetTelemetry>;
  readonly decision: Readonly<PerformanceDecision>;
  targetFrameMs: number;
  softBudgetMs: number;
  degradeThresholdMs: number;
  recoverThresholdMs: number;
  readonly cadenceAware: boolean;
  readonly cadenceDegradeThresholdMs: number;
  readonly cadenceRecoverThresholdMs: number;
  cadenceWarmedUp: boolean;
  overBudgetSamples: number;
  underBudgetSamples: number;
  adaptiveEnabled: boolean;
  warmedUp: boolean;
  cooldownRemainingMs: number;
}

export interface PerformanceGovernorOptions {
  /** Opt in to measured callback cadence plus CPU work for adaptation. Renderer
   * counts remain diagnostic and cannot force degradation or block recovery.
   * sample() must receive actual consecutive RAF timestamps. Call
   * resetMeasurements() across visibility/lifecycle pauses; no long interval is
   * silently discarded based on its duration. Defaults to false.
   */
  cadenceAware?: boolean;
  /** Default 25 ms: sustained callback cadence below 40 Hz is over budget. */
  cadenceDegradeThresholdMs?: number;
  /** Default 22.5 ms, leaving recovery headroom inside the 40–60 Hz target. */
  cadenceRecoverThresholdMs?: number;
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

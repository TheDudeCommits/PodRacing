/** Acceptance for a continuous race measurement; a completed race alone is not an FPS pass. */
export interface RaceCadenceSummary {
  samples: number;
  durationMs: number;
  averageFps: number | null;
  p95Ms: number | null;
  firstRaceTime: number | null;
  lastRaceTime: number | null;
}

export function judgeRaceCadence(summary: RaceCadenceSummary, finishTime: number) {
  const issues: string[] = [];
  const finite = (value: number | null): value is number => typeof value === 'number' && Number.isFinite(value);
  if (summary.samples < 2 || !Number.isFinite(summary.samples)) issues.push('missing racing intervals');
  if (!finite(summary.durationMs) || summary.durationMs <= 0) issues.push('invalid duration');
  if (!Number.isFinite(finishTime) || finishTime <= 0) issues.push('invalid finish time');
  if (!finite(summary.firstRaceTime) || summary.firstRaceTime < 0 || summary.firstRaceTime > .05) issues.push('missed race start');
  if (!finite(summary.lastRaceTime) || summary.lastRaceTime < finishTime - .05) issues.push('missed race finish');
  if (summary.durationMs < (finishTime - .05) * 1000) issues.push('incomplete racing coverage');
  if (!finite(summary.averageFps) || summary.averageFps < 40) issues.push('mean cadence below 40 Hz');
  if (!finite(summary.p95Ms) || summary.p95Ms > 25) issues.push('p95 interval above 25 ms');
  return { outcome: issues.length ? 'FAIL' as const : 'PASS' as const,
    criteria: { minimumMeanHz: 40, maximumP95Ms: 25, boundaryToleranceSeconds: .05 }, issues };
}

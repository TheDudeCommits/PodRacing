/** Shared by deterministic handling, presentation and HUD. No renderer state. */
export const DRIFT_THRESHOLDS = [0.28, 0.58, 0.88] as const;
export const DRIFT_COLORS = [0xa2d5df, 0x35cfff, 0xffac32, 0xff54df] as const;
export const DRIFT_LABELS = ['CHARGING', 'TURBO I', 'TURBO II', 'TURBO III'] as const;
export type DriftStage = 0 | 1 | 2 | 3;
export function driftStage(charge: number): DriftStage {
  return charge >= .88 ? 3 : charge >= .58 ? 2 : charge >= .28 ? 1 : 0;
}
export function driftBoostDuration(charge: number, maximum = 1.75): number {
  return [0, .55, 1.1, maximum][driftStage(charge)] ?? 0;
}

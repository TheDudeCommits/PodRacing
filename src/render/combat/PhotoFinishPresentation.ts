/**
 * Presentation-only photo finish. When the local racer and a rival are both
 * on their final lap, close to the line and predicted to cross within half a
 * second of each other, wall time slows until the local racer has crossed.
 * It scales the scheduler's wall delta the way the combat cinematic does; it
 * never changes fixed-step simulation results, records or inputs.
 */
export interface PhotoFinishRacer {
  readonly id: string;
  readonly finished: boolean;
  /** True only once the racer is inside the last stretch of the final lap. */
  readonly onFinalLap: boolean;
  /** Metres left to the finish line along the course. */
  readonly distanceToLine: number;
  /** Metres per second. */
  readonly speed: number;
}

export const PHOTO_FINISH_GAP_SECONDS = 0.5;
export const PHOTO_FINISH_ARM_DISTANCE = 90;
export const PHOTO_FINISH_TIME_SCALE = 0.32;
export const PHOTO_FINISH_HOLD_SECONDS = 0.7;

const eta = (racer: PhotoFinishRacer): number => racer.distanceToLine / Math.max(15, racer.speed);

/** Predicted gap (seconds) to the nearest rival at the line, or null when no photo finish is possible. */
export function photoFinishGap(local: PhotoFinishRacer, racers: readonly PhotoFinishRacer[]): number | null {
  if (local.finished || !local.onFinalLap || !(local.distanceToLine <= PHOTO_FINISH_ARM_DISTANCE)) return null;
  let best: number | null = null;
  for (const racer of racers) {
    if (racer.id === local.id || racer.finished || !racer.onFinalLap) continue;
    if (racer.distanceToLine > PHOTO_FINISH_ARM_DISTANCE * 2) continue;
    const gap = Math.abs(eta(racer) - eta(local));
    if (best === null || gap < best) best = gap;
  }
  return best;
}

export class PhotoFinishPresentation {
  private scale = 1;
  private armed = false;
  private holdRemaining = 0;

  get active(): boolean { return this.armed; }
  /** Multiplier for the wall-clock delta fed to the fixed-step scheduler and motion. */
  get timeScale(): number { return this.scale; }

  reset(): void {
    this.scale = 1;
    this.armed = false;
    this.holdRemaining = 0;
  }

  /** Returns true on the frame the photo finish arms, for a one-shot voice line. */
  update(wallDelta: number, local: PhotoFinishRacer | null, racers: readonly PhotoFinishRacer[], enabled: boolean): boolean {
    const dt = Number.isFinite(wallDelta) ? Math.max(0, Math.min(0.1, wallDelta)) : 0;
    let armedNow = false;
    if (!enabled || !local) {
      this.armed = false;
      this.holdRemaining = 0;
    } else if (!this.armed) {
      const gap = photoFinishGap(local, racers);
      if (gap !== null && gap < PHOTO_FINISH_GAP_SECONDS) {
        this.armed = true;
        this.holdRemaining = PHOTO_FINISH_HOLD_SECONDS;
        armedNow = true;
      }
    } else if (local.finished) {
      this.holdRemaining -= dt;
      if (this.holdRemaining <= 0) this.armed = false;
    } else if (!local.onFinalLap || local.distanceToLine > PHOTO_FINISH_ARM_DISTANCE * 1.5) {
      // A reset or a wrong-way turn: release rather than freeze the race.
      this.armed = false;
    }
    const target = this.armed ? PHOTO_FINISH_TIME_SCALE : 1;
    this.scale += (target - this.scale) * Math.min(1, dt * (this.armed ? 12 : 7));
    if (Math.abs(this.scale - target) < 0.004) this.scale = target;
    return armedNow;
  }
}

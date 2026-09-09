import type { PodracerState } from '../simulation/types';
import type { GhostFrame, GhostPose, GhostRun } from './types';

export const GHOST_SAMPLE_HZ = 10;
export const MAX_GHOST_FRAMES = 6002;
const rounded = (value: number) => Math.round(value * 1000) / 1000;

/** Presentation capture only. This object cannot advance or restore race truth. */
export class PersonalBestGhostRecorder {
  private frames: GhostFrame[] = [];
  private nextSampleAt = 0;
  private overflow = false;

  reset(): void { this.frames = []; this.nextSampleAt = 0; this.overflow = false; }

  record(time: number, vehicle: PodracerState, force = false): void {
    if (!Number.isFinite(time) || time < 0 || this.overflow) return;
    if (!force && time + 0.00001 < this.nextSampleAt) return;
    if (this.frames.length >= MAX_GHOST_FRAMES) { this.overflow = true; return; }
    const orientation = vehicle.orientation;
    const frame: GhostFrame = [time, vehicle.position.x, vehicle.position.y, vehicle.position.z,
      orientation.yaw, orientation.pitch, orientation.roll, orientation.bank].map(rounded) as GhostFrame;
    const previous = this.frames.at(-1);
    if (previous && frame[0] <= previous[0]) {
      if (force && frame[0] === previous[0]) this.frames[this.frames.length - 1] = frame;
      return;
    }
    this.frames.push(frame);
    this.nextSampleAt = time + 1 / GHOST_SAMPLE_HZ - 0.00001;
  }

  finish(identityKey: string, duration: number): GhostRun | null {
    if (this.overflow || this.frames.length < 2) return null;
    return { version: 1, identityKey, duration, sampleHz: GHOST_SAMPLE_HZ, frames: this.frames.slice() };
  }
}

function blendAngle(a: number, b: number, alpha: number): number {
  let delta = (b - a) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * alpha;
}

export function sampleGhost(run: GhostRun | null, time: number): GhostPose | null {
  if (!run || time < 0 || time > run.duration || run.frames.length < 2) return null;
  let lo = 0;
  let hi = run.frames.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >>> 1;
    if (run.frames[mid]![0] <= time) lo = mid;
    else hi = mid;
  }
  const a = run.frames[lo]!;
  const b = run.frames[hi]!;
  // Defensive handling for old/imported recordings containing a recovery jump.
  // The ghost disappears briefly rather than cutting across driveable space.
  if (Math.hypot(b[1] - a[1], b[2] - a[2], b[3] - a[3]) > 100) return null;
  const alpha = Math.max(0, Math.min(1, (time - a[0]) / Math.max(0.0001, b[0] - a[0])));
  return {
    x: a[1] + (b[1] - a[1]) * alpha, y: a[2] + (b[2] - a[2]) * alpha,
    z: a[3] + (b[3] - a[3]) * alpha, yaw: blendAngle(a[4], b[4], alpha),
    pitch: blendAngle(a[5], b[5], alpha), roll: blendAngle(a[6], b[6], alpha),
    bank: blendAngle(a[7], b[7], alpha),
  };
}

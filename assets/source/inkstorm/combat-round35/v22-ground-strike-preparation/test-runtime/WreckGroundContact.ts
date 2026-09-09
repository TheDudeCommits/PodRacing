import type { Vector3 } from 'three';

export interface WreckGroundFootprint {
  readonly center: Vector3;
  readonly axis: Vector3;
  readonly halfLength: number;
  readonly halfWidth: number;
}

/** Sampled contact of the displayed engine, never a simulation collision. */
export interface WreckGroundContact {
  readonly position: Vector3;
  readonly direction: Vector3;
  /** Cached near-ground source band; cosmetic ejecta extent, not collision state. */
  readonly footprint?: WreckGroundFootprint;
}

/** One bounded renderer cue per received authoritative wreck identity.
 * Fixed ticks may run ahead of rendering: eligibility uses the current wreck
 * count plus its recorded birth frame, not a cached previous render pose.
 */
export class WreckGroundContactGate {
  private readonly entries = new Map<string, { frame: number; crashCount: number; emitted: boolean }>();

  begin(racerId: string, frame: number, crashCount: number): void {
    if (!Number.isSafeInteger(frame) || frame < 0 || !Number.isSafeInteger(crashCount) || crashCount < 1) return;
    const previous = this.entries.get(racerId);
    if (previous && previous.crashCount >= crashCount) return;
    // At most eight racer identities are needed by this presentation. A stale
    // entry can only lose a cosmetic cue; it cannot allocate an unbounded log.
    if (!this.entries.has(racerId) && this.entries.size >= 8) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(racerId, { frame, crashCount, emitted: false });
  }

  take(racerId: string, currentFrame: number, crashCount: number, contact: WreckGroundContact | undefined): boolean {
    const entry = this.entries.get(racerId);
    if (!contact || !entry || entry.emitted || entry.crashCount !== crashCount
      || currentFrame <= entry.frame || !Number.isSafeInteger(currentFrame)) return false;
    if (!Number.isFinite(contact.position.x + contact.position.y + contact.position.z
      + contact.direction.x + contact.direction.y + contact.direction.z)) return false;
    // Match the dust emitter before consuming this wreck's only contact cue.
    if (Math.hypot(contact.direction.x, contact.direction.z) < .001) return false;
    entry.emitted = true;
    return true;
  }

  clear(): void { this.entries.clear(); }
}

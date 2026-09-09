import type { Vector3 } from 'three';

export interface WreckGroundFootprint {
  readonly center: Vector3;
  readonly axis: Vector3;
  readonly halfLength: number;
  readonly halfWidth: number;
  /** Opposing cached source casing extrema projected onto their sampled ground. */
  readonly edges?: readonly [Vector3, Vector3];
}

/** Sampled contact of the displayed engine, never a simulation collision. */
export interface WreckGroundContact {
  readonly position: Vector3;
  readonly direction: Vector3;
  /** Cached near-ground source band; cosmetic ejecta extent, not collision state. */
  readonly footprint?: WreckGroundFootprint;
}

export type WreckSupportPartId = 0 | 1 | 2;

/** Display support proximity, not an authoritative metal/terrain collision.
 * position is the sampled floor below witness; exterior footprint edges are
 * cosmetic escape roots and do not claim contact at those outer vertices. */
export interface WreckPresentationSupport extends WreckGroundContact {
  readonly partId: WreckSupportPartId;
  readonly kind: 'presentation-support';
  readonly footprint: WreckGroundFootprint;
  /** Height of this cached source witness above its sampled floor; not a
   * guarantee that every uncached mesh vertex has the identical clearance. */
  readonly clearance: number;
  readonly witness: Vector3;
}

/** The measured band can narrow to an edge while a casing rolls. Its two
 * cosmetic escape roots instead cover the bounded full casing (12 m axial,
 * 6 m lateral/vertical from the band center); this never enlarges the band. */
export function isWreckSupportFootprint(footprint: WreckGroundFootprint | undefined): boolean {
  if (!footprint || !footprint.edges || !Number.isFinite(footprint.center.x + footprint.center.y + footprint.center.z
    + footprint.axis.x + footprint.axis.y + footprint.axis.z + footprint.halfLength + footprint.halfWidth)
    || footprint.halfLength < .000001 || footprint.halfLength > 12 || footprint.halfWidth < 0 || footprint.halfWidth > 6
    || Math.abs(footprint.axis.y) > .000001 || Math.abs(Math.hypot(footprint.axis.x, footprint.axis.z) - 1) >= .001) return false;
  for (let index = 0; index < 2; index++) {
    const edge = footprint.edges[index];
    if (!edge || !Number.isFinite(edge.x + edge.y + edge.z)) return false;
    const x = edge.x - footprint.center.x, z = edge.z - footprint.center.z;
    const along = x * footprint.axis.x + z * footprint.axis.z;
    const across = (x * footprint.axis.z - z * footprint.axis.x) * (index === 0 ? -1 : 1);
    if (Math.abs(along) > 12 || across < Math.max(.05, footprint.halfWidth)
      || across > 6 || Math.abs(edge.y - footprint.center.y) > 6) return false;
  }
  return true;
}

/** One bounded renderer cue per supported part of a received authoritative wreck identity.
 * Fixed ticks may run ahead of rendering: eligibility uses the current wreck
 * count plus its recorded birth frame, not a cached previous render pose.
 */
export class WreckGroundContactGate {
  private readonly entries = new Map<string, { frame: number; crashCount: number; emitted: number }>();

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
    this.entries.set(racerId, { frame, crashCount, emitted: 0 });
  }

  take(racerId: string, currentFrame: number, crashCount: number, contact: WreckGroundContact | undefined): boolean {
    const entry = this.entries.get(racerId);
    if (!contact || !entry || entry.crashCount !== crashCount
      || currentFrame <= entry.frame || !Number.isSafeInteger(currentFrame)) return false;
    if (!Number.isFinite(contact.position.x + contact.position.y + contact.position.z
      + contact.direction.x + contact.direction.y + contact.direction.z)) return false;
    // Legacy point/rear consumers share part 2's bit. Malformed declared
    // metadata must not consume any part's valid future cue.
    let partId: WreckSupportPartId = 2;
    if ('partId' in contact || 'kind' in contact || 'clearance' in contact || 'witness' in contact) {
      const support = contact as WreckPresentationSupport;
      if ((support.partId !== 0 && support.partId !== 1 && support.partId !== 2)
        || support.kind !== 'presentation-support' || !isWreckSupportFootprint(support.footprint) || !Number.isFinite(support.clearance)
        || support.clearance < 0 || support.clearance > (support.partId === 2 ? .100001 : .180001)
        || !support.witness || !Number.isFinite(support.witness.x + support.witness.y + support.witness.z)
        || Math.abs(support.witness.x - support.position.x) > .000001
        || Math.abs(support.witness.z - support.position.z) > .000001
        || Math.abs(support.witness.y - support.position.y - support.clearance) > .000001) return false;
      partId = support.partId;
    }
    const bit = 1 << partId;
    if (entry.emitted & bit) return false;
    // Match the dust emitter before consuming this part's contact cue.
    if (Math.hypot(contact.direction.x, contact.direction.z) < .001) return false;
    entry.emitted |= bit;
    return true;
  }

  clear(): void { this.entries.clear(); }
}

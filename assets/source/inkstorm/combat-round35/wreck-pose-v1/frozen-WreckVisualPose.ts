import { Box3, Euler, Matrix4, Quaternion, Vector3, type Mesh, type Object3D } from 'three';
import type { PodracerState } from '../../game/simulation';

// The presentation follows the existing recovery-start duration. It never
// advances the timer or feeds a transformed pose back to the race simulation.
export const WRECK_PRESENTATION_DURATION = 2.15;
export const WRECK_SUPPORT_LIMIT = 74;
// Covers the measured reduced-support error on the admitted long Polwo hull.
// It is a presentation stand-off, not a claim of exact triangle/terrain contact.
const CONTACT_MARGIN = .55;
const DIRECTIONS: Vector3[] = [];
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
  if (x || y || z) DIRECTIONS.push(new Vector3(x, y, z));
}
const smooth = (value: number): number => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

export interface WreckVisualPose {
  readonly position: Vector3;
  readonly rotation: Euler;
  readonly center: Vector3;
  readonly forward: Vector3;
  radius: number;
  groundCorrection: number;
}

/** Per-racer, renderer-owned rigid pose. All update storage is reused. */
export class WreckVisualPoseCache {
  readonly localBounds = new Box3();
  readonly localCenter = new Vector3();
  readonly supportPoints: Vector3[] = [];
  readonly pose: WreckVisualPose = {
    position: new Vector3(), rotation: new Euler(0, 0, 0, 'YXZ'),
    center: new Vector3(), forward: new Vector3(), radius: 17, groundCorrection: 0,
  };
  private revision = -1;
  private readonly inverse = new Matrix4();
  private readonly matrix = new Matrix4();
  private readonly point = new Vector3();
  private readonly baseCenter = new Vector3();
  private readonly baseRotation = new Euler(0, 0, 0, 'YXZ');
  private readonly quaternion = new Quaternion();

  /** Actual source vertices, refreshed only when the presentation geometry changes.
   * 26 directional extrema plus the lowest vertex in each of 48 XZ cells
   * retain engine/cockpit support instead of inventing the corners of a full box.
   * This is a bounded terrain support approximation, not a collision hull.
   */
  refresh(root: Object3D, meshes: readonly Mesh[], revision: number): void {
    if (revision === this.revision) return;
    this.revision = revision;
    this.supportPoints.length = 0;
    this.localBounds.makeEmpty();
    root.updateWorldMatrix(true, false);
    this.inverse.copy(root.matrixWorld).invert();
    let count = 0;
    for (const mesh of meshes) count += mesh.geometry.getAttribute('position')?.count ?? 0;
    const vertices = new Float64Array(count * 3);
    let offset = 0;
    for (const mesh of meshes) {
      const positions = mesh.geometry.getAttribute('position');
      if (!positions) continue;
      mesh.updateWorldMatrix(true, false);
      this.matrix.multiplyMatrices(this.inverse, mesh.matrixWorld);
      for (let index = 0; index < positions.count; index++) {
        this.point.fromBufferAttribute(positions, index).applyMatrix4(this.matrix);
        this.localBounds.expandByPoint(this.point);
        vertices[offset++] = this.point.x;
        vertices[offset++] = this.point.y;
        vertices[offset++] = this.point.z;
      }
    }
    if (!count) {
      this.localBounds.set(new Vector3(-6, 0, -8), new Vector3(6, 5.6, 22));
      for (const x of [-6, 6]) for (const y of [0, 5.6]) for (const z of [-8, 22]) {
        this.supportPoints.push(new Vector3(x, y, z));
      }
    } else {
      const extremal = new Int32Array(26).fill(-1), scores = new Float64Array(26).fill(-Infinity);
      const low = new Int32Array(48).fill(-1);
      const width = Math.max(.001, this.localBounds.max.x - this.localBounds.min.x);
      const length = Math.max(.001, this.localBounds.max.z - this.localBounds.min.z);
      for (let index = 0; index < count; index++) {
        const x = vertices[index * 3]!, y = vertices[index * 3 + 1]!, z = vertices[index * 3 + 2]!;
        const cell = Math.min(5, Math.floor((x - this.localBounds.min.x) / width * 6))
          + Math.min(7, Math.floor((z - this.localBounds.min.z) / length * 8)) * 6;
        if (low[cell]! < 0 || y < vertices[low[cell]! * 3 + 1]!) low[cell] = index;
        for (let direction = 0; direction < DIRECTIONS.length; direction++) {
          const d = DIRECTIONS[direction]!, score = x * d.x + y * d.y + z * d.z;
          if (score > scores[direction]!) { scores[direction] = score; extremal[direction] = index; }
        }
      }
      const unique = new Set<string>();
      for (const index of [...extremal, ...low]) {
        if (index < 0) continue;
        const x = vertices[index * 3]!, y = vertices[index * 3 + 1]!, z = vertices[index * 3 + 2]!;
        const key = `${x},${y},${z}`;
        if (unique.has(key)) continue;
        unique.add(key);
        this.supportPoints.push(new Vector3(x, y, z));
      }
    }
    this.localBounds.getCenter(this.localCenter);
    this.localBounds.getSize(this.point);
    this.pose.radius = this.point.length() * .5;
  }

  /** Bounded settling/rotation around the measured art center, independent of
   * global time and wall-clock speed. At event entry the intact pose is exact.
   * At most three passes over <=74 cached support samples; no render traversal.
   */
  update(state: PodracerState, remaining: number, terrain: { heightAt(x: number, z: number): number }, extrapolation = 0): WreckVisualPose {
    const pose = this.pose;
    const elapsed = Math.max(0, Math.min(WRECK_PRESENTATION_DURATION,
      WRECK_PRESENTATION_DURATION - remaining + extrapolation));
    const blend = smooth(elapsed / .3) * smooth((remaining - extrapolation) / .35);
    this.baseRotation.set(state.orientation.pitch, state.orientation.yaw,
      state.orientation.roll + state.orientation.bank, 'YXZ');
    this.baseCenter.copy(this.localCenter).applyEuler(this.baseRotation);
    const pitch = Math.sin(elapsed * 2.2) * .1 * blend;
    const roll = -Math.sin(Math.min(elapsed * 3, Math.PI * .75)) * .32 * blend;
    const yaw = (1 - Math.cos(elapsed * 1.35)) * .38 * blend;
    let scale = 1, gap = Infinity;
    for (let pass = 0; pass < 3; pass++) {
      pose.rotation.set(this.baseRotation.x + pitch * scale, this.baseRotation.y + yaw * scale,
        this.baseRotation.z + roll * scale, 'YXZ');
      this.quaternion.setFromEuler(pose.rotation);
      pose.position.copy(this.localCenter).applyQuaternion(this.quaternion).negate().add(this.baseCenter);
      pose.position.x += state.position.x + state.velocity.x * extrapolation;
      pose.position.y += state.position.y + state.velocity.y * extrapolation;
      pose.position.z += state.position.z + state.velocity.z * extrapolation;
      gap = Infinity;
      for (const support of this.supportPoints) {
        this.point.copy(support).applyQuaternion(this.quaternion).add(pose.position);
        gap = Math.min(gap, this.point.y - terrain.heightAt(this.point.x, this.point.z));
      }
      const requiredLift = Math.max(0, CONTACT_MARGIN - gap);
      if (requiredLift <= 1.25 || pass === 2 || blend === 0) break;
      scale *= Math.max(.1, 1.25 / requiredLift);
    }
    // Grounding follows entry/exit smoothly. The modest angle envelope avoids
    // the former 13m emergency root lift; no frame-history integration is used.
    pose.groundCorrection = Number.isFinite(gap)
      ? Math.max(-3.5 * smooth(elapsed / .8) * smooth((remaining - extrapolation) / .35),
        (CONTACT_MARGIN - gap) * blend) : 0;
    pose.position.y += pose.groundCorrection;
    pose.center.copy(this.localCenter).applyQuaternion(this.quaternion).add(pose.position);
    pose.forward.set(Math.sin(pose.rotation.y), 0, Math.cos(pose.rotation.y));
    return pose;
  }
}

import { Box3, Matrix4, Quaternion, Vector3, type Mesh, type Object3D } from 'three';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION, writeWreckBounds, type WreckVisualPose } from './WreckVisualPose';

const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1), UNIT = new Vector3(1, 1, 1);
const smooth = (value: number): number => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const FRONT = 'teemto-damage-right-front-v16', REAR = 'teemto-damage-right-rear-v16';
const STUBS = 'teemto-damage-cockpit-stubs-v16', TETHERS = 'teemto-damage-severed-tethers-v16';
interface Part {
  readonly node: Object3D;
  readonly samples: WreckVisualPoseCache;
  readonly matrix: Matrix4;
  readonly restMatrix: Matrix4;
  readonly restPosition: Vector3;
  readonly restRotation: Quaternion;
  readonly restScale: Vector3;
  readonly auto: boolean;
}

/** Optional, explicitly authored Teemto geometry. The pilot and intact assets
 * are never duplicated or edited. All support reduction happens at bind time;
 * the event-age update changes existing instance matrices/visibility only.
 */
export class TeemtoAuthoredDamage {
  private readonly parts: readonly Part[];
  private readonly stationary = new WreckVisualPoseCache();
  private readonly bounds: Vector3[];
  private readonly assembly = new Box3();
  private readonly partBox = new Box3();
  private readonly body = new Matrix4();
  private readonly world = new Matrix4();
  private readonly rotation = new Quaternion();
  private readonly axis = new Quaternion();
  private readonly bodyRotation = new Quaternion();
  private readonly inverseBody = new Quaternion();
  private readonly translation = new Vector3();
  private readonly groundOffset = new Vector3();
  private readonly point = new Vector3();
  private readonly contact = { position: new Vector3(), direction: new Vector3() };
  private readonly rupture = { position: new Vector3(), direction: new Vector3() };
  private readonly ruptureLocal: Vector3;
  private rupturePose: WreckVisualPose | null = null;
  private contactPose: WreckVisualPose | null = null;
  private activeValue = false;
  private readonly originalVisibility: readonly boolean[];
  get active(): boolean { return this.activeValue; }

  static create(root: Object3D, originals: readonly Mesh[], left: Object3D, meshes: readonly Mesh[]): TeemtoAuthoredDamage | null {
    if (meshes.length !== 2 && meshes.length !== 4) return null;
    const names = new Map(meshes.map(mesh => [mesh.name, mesh]));
    const front = names.get(FRONT), rear = names.get(REAR), stubs = names.get(STUBS), tethers = names.get(TETHERS);
    const originalRight = originals.find(mesh => mesh.name === 'teemto-engine-right-body');
    const originalLeft = originals.find(mesh => mesh.name === 'teemto-engine-left-body');
    const originalCockpit = originals.find(mesh => mesh.name === 'teemto-cockpit-body');
    if (names.size !== meshes.length || !front || !rear || !originalRight || !originalLeft || !originalCockpit
      || (meshes.length === 4 ? !stubs || !tethers : !!stubs || !!tethers)) return null;
    for (const mesh of meshes) {
      // Exported pivots may translate, but the intermediate import groups must
      // be identity: the runtime matrices below are in the intact root space.
      if (mesh.matrixAutoUpdate) mesh.updateMatrix();
      if (!mesh.matrix.elements.every(Number.isFinite) || !mesh.geometry.getAttribute('position')?.count) return null;
      let parent = mesh.parent;
      while (parent && parent !== root) {
        if (parent.matrixAutoUpdate) parent.updateMatrix();
        if (!parent.matrix.elements.every((v, i) => v === (i % 5 === 0 ? 1 : 0))) return null;
        parent = parent.parent;
      }
      if (parent !== root) return null;
    }
    return new TeemtoAuthoredDamage(root, originals, meshes, stubs ? [originalRight, originalCockpit] : [originalRight],
      left, originalLeft, front, rear, stubs, tethers);
  }

  private constructor(root: Object3D, originals: readonly Mesh[], private readonly replacements: readonly Mesh[],
    private readonly hidden: readonly Mesh[], left: Object3D, originalLeft: Mesh, front: Mesh, rear: Mesh,
    stubs: Mesh | undefined, tethers: Mesh | undefined) {
    const moving: [Object3D, Mesh][] = [[left, originalLeft], [front, front], [rear, rear]];
    if (tethers) moving.push([tethers, tethers]);
    this.parts = moving.map(([node, mesh], index) => {
      const samples = new WreckVisualPoseCache(index === 2); samples.refresh(root, [mesh], 0);
      return { node, samples, matrix: new Matrix4(), restMatrix: node.matrix.clone(), restPosition: node.position.clone(),
        restRotation: node.quaternion.clone(), restScale: node.scale.clone(), auto: node.matrixAutoUpdate };
    });
    const stationary = originals.filter(mesh => mesh !== originalLeft && !hidden.includes(mesh));
    if (stubs) stationary.push(stubs);
    this.stationary.refresh(root, stationary, 0);
    this.bounds = Array.from({ length: (this.parts.length + 1) * 8 }, () => new Vector3());
    this.originalVisibility = hidden.map(mesh => mesh.visible);
    // Exact outer rear cut-loop centroid from the hero/rival Blender receipts,
    // in admitted +Y-up/+Z-forward metres. This face opens toward +Z. Neither
    // a guessed exhaust offset nor the intact root center identifies the tear.
    this.ruptureLocal = stubs ? new Vector3(4.023553848266602, 2.6643872261047363, 15.200007438659668)
      : new Vector3(4.022682189941406, 2.6537137031555176, 15.200004577636719);
    for (const mesh of replacements) mesh.visible = false;
  }

  update(pose: WreckVisualPose, remaining: number, terrain: { heightAt(x: number, z: number): number }, extrapolation = 0): void {
    if (this.contactPose?.groundContact === this.contact) this.contactPose.groundContact = undefined;
    this.contactPose = null; pose.groundContact = undefined;
    if (this.rupturePose?.rupture === this.rupture) this.rupturePose.rupture = undefined;
    this.rupturePose = null; pose.rupture = undefined;
    const age = Math.max(0, Math.min(WRECK_PRESENTATION_DURATION, WRECK_PRESENTATION_DURATION - remaining + extrapolation));
    const release = smooth((remaining - extrapolation) / .35), spread = smooth(age / .10) * release;
    this.bodyRotation.setFromEuler(pose.rotation); this.inverseBody.copy(this.bodyRotation).invert();
    this.body.compose(pose.position, this.bodyRotation, UNIT);
    if (!Number.isFinite(spread) || spread === 0) {
      this.reset();
      if (Number.isFinite(spread)) this.writeRupture(pose);
      return;
    }
    if (!this.activeValue) {
      for (const mesh of this.hidden) mesh.visible = false;
      for (const mesh of this.replacements) mesh.visible = true;
      this.activeValue = true;
    }
    const followThrough = smooth((age - .06) / .46) * release;
    this.assembly.copy(this.stationary.localBounds);
    writeWreckBounds(this.stationary.localBounds, this.body, this.bounds);
    for (let index = 0; index < this.parts.length; index++) {
      const part = this.parts[index]!;
      // Left intact engine, torn front cowl, rear machinery, then severed rods.
      // Opening and follow-through have different directions/timings. The
      // intact left engine rolls down too; the front cowl topples outward,
      // while the rear machinery rolls toward the cockpit side. These remain
      // bounded analytic presentation paths, not a simulated collision solve.
      const yaw = (index === 0 ? -.26 : index === 1 ? .30 : index === 2 ? -.40 : -.25) * spread
        + (index === 0 ? -.30 : index === 1 ? .34 : index === 2 ? -.55 : -.36) * followThrough;
      const pitch = (index === 0 ? .13 : index === 1 ? .18 : index === 2 ? -.35 : .10) * spread
        + (index === 0 ? -.29 : index === 1 ? -.35 : index === 2 ? .48 : -.22) * followThrough;
      const roll = (index === 0 ? -.22 : index === 1 ? .65 : index === 2 ? 1.30 : .65) * spread
        + (index === 0 ? -.88 : index === 1 ? 1.0 : index === 2 ? 1.10 : -.53) * followThrough;
      this.rotation.setFromAxisAngle(Y, yaw);
      this.axis.setFromAxisAngle(X, pitch); this.rotation.multiply(this.axis);
      this.axis.setFromAxisAngle(Z, roll); this.rotation.multiply(this.axis);
      this.translation.copy(part.samples.localCenter).applyQuaternion(this.rotation).negate().add(part.samples.localCenter);
      this.translation.x += (index === 0 ? -2.4 : index === 1 ? 3.4 : index === 2 ? 1.5 : -2.8) * spread;
      this.translation.z += (index === 0 ? 1.3 : index === 1 ? 1.6 : index === 2 ? -3.3 : -1) * spread;
      this.translation.x += (index === 0 ? -1.2 : index === 1 ? 1.6 : index === 2 ? -2.0 : -.8) * followThrough;
      this.translation.z += (index === 0 ? .5 : index === 1 ? 1.9 : index === 2 ? -1.2 : -1.4) * followThrough;
      part.matrix.compose(this.translation, this.rotation, UNIT);
      this.world.multiplyMatrices(this.body, part.matrix);
      let gap = Infinity;
      for (const support of part.samples.supportPoints) {
        this.point.copy(support).applyMatrix4(this.world);
        const ground = terrain.heightAt(this.point.x, this.point.z), candidate = this.point.y - ground;
        if (candidate < gap) {
          gap = candidate;
          if (index === 2) this.contact.position.set(this.point.x, ground, this.point.z);
        }
      }
      if (Number.isFinite(gap)) {
        const settle = smooth(age / (index === 0 ? .34 : index === 1 ? .22 : index === 2 ? .14 : .18)) * release;
        const margin = .55 - (index === 2 ? .45 : .37) * settle;
        const correction = gap < margin ? margin - gap : Math.max(-8, margin - gap) * settle;
        this.groundOffset.set(0, correction, 0).applyQuaternion(this.inverseBody);
        this.translation.add(this.groundOffset); part.matrix.compose(this.translation, this.rotation, UNIT);
        this.world.multiplyMatrices(this.body, part.matrix);
        if (index === 2 && settle === 1 && gap + correction <= .100001) {
          // Follow the rear section's local departure (-X/-Z), not the
          // perpendicular fracture-face normal used by the birth rupture.
          this.contact.direction.set(-2, 0, -1.2).applyQuaternion(this.bodyRotation); this.contact.direction.y = 0;
          if (this.contact.direction.lengthSq() < .0001) this.contact.direction.copy(pose.forward);
          this.contact.direction.normalize(); pose.groundContact = this.contact; this.contactPose = pose;
        }
      }
      writeWreckBounds(part.samples.localBounds, this.world, this.bounds, (index + 1) * 8);
      part.node.matrixAutoUpdate = false; part.node.matrix.multiplyMatrices(part.matrix, part.restMatrix);
      part.node.matrix.decompose(part.node.position, part.node.quaternion, part.node.scale);
      part.node.matrixWorldNeedsUpdate = true;
      this.partBox.copy(part.samples.localBounds).applyMatrix4(part.matrix); this.assembly.union(this.partBox);
    }
    this.assembly.getCenter(pose.center).applyMatrix4(this.body); this.assembly.getSize(this.point);
    pose.radius = this.point.length() * .5; pose.bounds = this.bounds;
    this.writeRupture(pose);
  }

  private writeRupture(pose: WreckVisualPose): void {
    this.world.multiplyMatrices(this.body, this.parts[2]!.matrix);
    this.rupture.position.copy(this.ruptureLocal).applyMatrix4(this.world);
    this.rupture.direction.set(0, 0, 1).transformDirection(this.world);
    pose.rupture = this.rupture; this.rupturePose = pose;
  }

  transformAttachment(name: string, point: Vector3): void {
    if (!this.activeValue) return;
    if (name === 'exhaustLeft' || name === 'couplingLeft') point.applyMatrix4(this.parts[0]!.matrix);
    else if (name === 'couplingRight') point.applyMatrix4(this.parts[1]!.matrix);
    else if (name === 'exhaustRight') point.applyMatrix4(this.parts[2]!.matrix);
  }

  reset(): void {
    if (this.rupturePose?.rupture === this.rupture) this.rupturePose.rupture = undefined;
    this.rupturePose = null;
    if (this.contactPose?.groundContact === this.contact) this.contactPose.groundContact = undefined;
    this.contactPose = null;
    if (!this.activeValue) return;
    for (const part of this.parts) {
      part.node.position.copy(part.restPosition); part.node.quaternion.copy(part.restRotation); part.node.scale.copy(part.restScale);
      part.node.matrix.copy(part.restMatrix); part.node.matrixAutoUpdate = part.auto; part.node.matrixWorldNeedsUpdate = true;
      part.matrix.identity();
    }
    for (let index = 0; index < this.hidden.length; index++) this.hidden[index]!.visible = this.originalVisibility[index]!;
    for (const mesh of this.replacements) mesh.visible = false;
    this.activeValue = false;
  }
}

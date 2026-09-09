import { Box3, Matrix4, PropertyBinding, Quaternion, Vector3, type Mesh, type Object3D } from 'three';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION, writeWreckBounds, type WreckVisualPose } from '/Users/amir/Projects/PodRacing/src/render/combat/WreckVisualPose';
import { TeemtoAuthoredDamage } from '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v20-contact-beat/test-runtime/TeemtoAuthoredDamageBaseline';

interface EnginePart {
  readonly node: Object3D;
  readonly samples: WreckVisualPoseCache;
  readonly matrix: Matrix4;
  readonly restMatrix: Matrix4;
  readonly restPosition: Vector3;
  readonly restQuaternion: Quaternion;
  readonly restScale: Vector3;
  readonly matrixAutoUpdate: boolean;
}

const smooth = (value: number): number => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const X = new Vector3(1, 0, 0), Y = new Vector3(0, 1, 0), Z = new Vector3(0, 0, 1);
const UNIT = new Vector3(1, 1, 1);

function identity(node: Object3D): boolean {
  if (node.matrixAutoUpdate) node.updateMatrix();
  return node.matrix.elements.every((value, index) => value === (index % 5 === 0 ? 1 : 0));
}

/** Three authored rigid masses, not a physics fracture. Only the two existing
 * Teemto engine groups move. Buffers, materials, cockpit and seated pilot stay
 * unchanged. Preparation reads source geometry once before the first wreck.
 */
export class TeemtoWreckBreakup {
  private readonly parts: readonly EnginePart[];
  private readonly stationary = new WreckVisualPoseCache();
  private readonly bodyMatrix = new Matrix4();
  private readonly worldMatrix = new Matrix4();
  private readonly assemblyBounds = new Box3();
  private readonly partBounds = new Box3();
  private readonly rotation = new Quaternion();
  private readonly axisRotation = new Quaternion();
  private readonly bodyRotation = new Quaternion();
  private readonly inverseBodyRotation = new Quaternion();
  private readonly point = new Vector3();
  private readonly translation = new Vector3();
  private readonly groundOffset = new Vector3();
  private readonly contact = { position: new Vector3(), direction: new Vector3() };
  private contactPose: WreckVisualPose | null = null;
  private readonly cameraBounds = Array.from({ length: 24 }, () => new Vector3());
  private activeValue = false;
  private damage: TeemtoAuthoredDamage | null = null;

  get active(): boolean { return this.damage?.active ?? this.activeValue; }
  get damageVariantAvailable(): boolean { return this.damage !== null; }
  get damageVariantActive(): boolean { return this.damage?.active ?? false; }

  installDamageVariant(meshes: readonly Mesh[]): boolean {
    if (this.damage || this.activeValue) return false;
    this.damage = TeemtoAuthoredDamage.create(this.root, this.originals, this.parts[0]!.node, meshes);
    return this.damage !== null;
  }

  static create(root: Object3D, nodes: ReadonlyMap<string, Object3D>, meshes: readonly Mesh[]): TeemtoWreckBreakup | null {
    if (!identity(root)) return null;
    // GLTFLoader removes reserved punctuation before registering Object3D names.
    // Resolve that exact installed-loader spelling, never fuzzy source aliases.
    const left = nodes.get(PropertyBinding.sanitizeNodeName('teemto-engine-left.001'));
    const right = nodes.get(PropertyBinding.sanitizeNodeName('teemto-engine-right.001'));
    const leftMesh = meshes.find(mesh => mesh.name === 'teemto-engine-left-body');
    const rightMesh = meshes.find(mesh => mesh.name === 'teemto-engine-right-body');
    // A changed export falls back to the valid rigid presentation. Never infer
    // a partition from X sign or apply this to a material-consolidated family.
    if (!left || !right || !leftMesh || !rightMesh || left.parent !== root || right.parent !== root
      || leftMesh.parent !== left || rightMesh.parent !== right || left.children.length !== 1 || right.children.length !== 1
      || !identity(left) || !identity(right) || !identity(leftMesh) || !identity(rightMesh)) return null;
    for (const mesh of meshes) {
      for (let parent = mesh.parent; parent && parent !== root; parent = parent.parent) {
        if ((parent === left && mesh !== leftMesh) || (parent === right && mesh !== rightMesh)) return null;
      }
    }
    return new TeemtoWreckBreakup(root, meshes, left, right, leftMesh, rightMesh);
  }

  private constructor(private readonly root: Object3D, private readonly originals: readonly Mesh[], left: Object3D, right: Object3D, leftMesh: Mesh, rightMesh: Mesh) {
    this.parts = [left, right].map((node, index) => {
      const samples = new WreckVisualPoseCache();
      samples.refresh(root, [index === 0 ? leftMesh : rightMesh], 0);
      return { node, samples, matrix: new Matrix4(), restMatrix: node.matrix.clone(),
        restPosition: node.position.clone(), restQuaternion: node.quaternion.clone(), restScale: node.scale.clone(),
        matrixAutoUpdate: node.matrixAutoUpdate };
    });
    this.stationary.refresh(root, originals.filter(mesh => mesh !== leftMesh && mesh !== rightMesh), 0);
  }

  /** Pure event-age pose, including calls made by FX before the next render.
   * Two <=74-point support sets bound terrain work; no vertex read/traversal,
   * geometry upload, material allocation, timer or accumulated integration.
   * The right engine rolls and settles down to the sampled sand; either engine
   * can lift out of terrain. This is visual support, not collision truth.
   */
  update(pose: WreckVisualPose, remaining: number, terrain: { heightAt(x: number, z: number): number }, extrapolation = 0): void {
    if (this.damage) { this.damage.update(pose, remaining, terrain, extrapolation); return; }
    const age = Math.max(0, Math.min(WRECK_PRESENTATION_DURATION, WRECK_PRESENTATION_DURATION - remaining + extrapolation));
    if (this.contactPose?.groundContact === this.contact) this.contactPose.groundContact = undefined;
    this.contactPose = null;
    pose.groundContact = undefined;
    // V13 reached full opening at the 820ms cut exit under solo slow motion.
    // Reach the same envelope during the held impact, with exact intact birth.
    const spread = smooth(age / .12) * smooth((remaining - extrapolation) / .35);
    if (!Number.isFinite(spread) || spread === 0) { this.reset(); return; }
    this.activeValue = true;
    this.bodyRotation.setFromEuler(pose.rotation);
    this.inverseBodyRotation.copy(this.bodyRotation).invert();
    this.bodyMatrix.compose(pose.position, this.bodyRotation, UNIT);
    this.assemblyBounds.copy(this.stationary.localBounds);
    writeWreckBounds(this.stationary.localBounds, this.bodyMatrix, this.cameraBounds);
    const release = smooth((remaining - extrapolation) / .35);
    const settle = smooth(age / .16) * release;
    const roll = smooth(age / .20) * release;
    for (let index = 0; index < this.parts.length; index++) {
      const part = this.parts[index]!;
      // Asymmetric opening breaks the orderly parallel silhouette while the
      // long engines remain recognisable. Original cockpit tethers stay with it.
      const side = index === 0 ? -1 : 1;
      this.rotation.setFromAxisAngle(Y, side * (index === 0 ? .26 : .38) * spread);
      this.axisRotation.setFromAxisAngle(X, (index === 0 ? .13 : -.20) * spread - (index === 1 ? .18 * roll : 0));
      this.rotation.multiply(this.axisRotation);
      this.axisRotation.setFromAxisAngle(Z, side * .22 * spread + (index === 1 ? .88 * roll : 0));
      this.rotation.multiply(this.axisRotation);
      this.translation.copy(part.samples.localCenter).applyQuaternion(this.rotation).negate().add(part.samples.localCenter);
      this.translation.x += side * (index === 0 ? 3.2 : 4.2) * spread;
      this.translation.z += (index === 0 ? 1.3 : -1.7) * spread;
      part.matrix.compose(this.translation, this.rotation, UNIT);
      this.worldMatrix.multiplyMatrices(this.bodyMatrix, part.matrix);
      let gap = Infinity;
      for (const support of part.samples.supportPoints) {
        this.point.copy(support).applyMatrix4(this.worldMatrix);
        const ground = terrain.heightAt(this.point.x, this.point.z);
        const candidate = this.point.y - ground;
        if (candidate < gap) {
          gap = candidate;
          if (index === 1) this.contact.position.set(this.point.x, ground, this.point.z);
        }
      }
      if (Number.isFinite(gap)) {
        // V14 only lifted parts, leaving the long engine hanging above its
        // shadow. Ease the right engine down too. Positive correction remains
        // immediate to protect the sampled surface throughout its roll.
        // The stationary/airborne support keeps its conservative margin; the
        // engine intentionally settling onto sand closes that gap to ten cm.
        const margin = index === 1 ? .55 - .45 * settle : .55;
        const correction = gap < margin ? margin - gap : index === 1 ? Math.max(-8, margin - gap) * settle : 0;
        this.groundOffset.set(0, correction, 0).applyQuaternion(this.inverseBodyRotation);
        this.translation.add(this.groundOffset);
        part.matrix.compose(this.translation, this.rotation, UNIT);
        this.worldMatrix.multiplyMatrices(this.bodyMatrix, part.matrix);
        if (index === 1 && settle === 1 && gap + correction <= .100001) {
          this.contact.direction.set(0, 0, 1).transformDirection(this.worldMatrix);
          this.contact.direction.y = 0;
          if (this.contact.direction.lengthSq() < .0001) this.contact.direction.copy(pose.forward);
          this.contact.direction.normalize();
          pose.groundContact = this.contact;
          this.contactPose = pose;
        }
      }
      writeWreckBounds(part.samples.localBounds, this.worldMatrix, this.cameraBounds, 8 + index * 8);
      part.node.matrixAutoUpdate = false;
      part.node.matrix.copy(part.matrix);
      part.matrix.decompose(part.node.position, part.node.quaternion, part.node.scale);
      part.node.matrixWorldNeedsUpdate = true;
      this.partBounds.copy(part.samples.localBounds).applyMatrix4(part.matrix);
      this.assemblyBounds.union(this.partBounds);
    }
    // The camera receives the complete separated assembly, not the old rigid
    // sphere. Source boxes are transformed each time; no vertex scan is needed.
    // Measure in assembly space before the parent rotation; converting an
    // already-rotated world AABB into a sphere needlessly widens the shot.
    this.assemblyBounds.getCenter(pose.center).applyMatrix4(this.bodyMatrix);
    this.assemblyBounds.getSize(this.point);
    pose.radius = this.point.length() * .5;
    pose.bounds = this.cameraBounds;
  }

  transformAttachment(name: string, point: Vector3): void {
    if (this.damage) { this.damage.transformAttachment(name, point); return; }
    if (!this.activeValue) return;
    if (name === 'exhaustLeft' || name === 'couplingLeft') point.applyMatrix4(this.parts[0]!.matrix);
    else if (name === 'exhaustRight' || name === 'couplingRight') point.applyMatrix4(this.parts[1]!.matrix);
  }

  reset(): void {
    this.damage?.reset();
    if (this.contactPose?.groundContact === this.contact) this.contactPose.groundContact = undefined;
    this.contactPose = null;
    if (!this.activeValue) return;
    for (const part of this.parts) {
      part.node.position.copy(part.restPosition); part.node.quaternion.copy(part.restQuaternion); part.node.scale.copy(part.restScale);
      part.node.matrix.copy(part.restMatrix); part.node.matrixAutoUpdate = part.matrixAutoUpdate;
      part.node.matrixWorldNeedsUpdate = true; part.matrix.identity();
    }
    this.activeValue = false;
  }
}

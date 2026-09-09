import { Box3, Euler, Matrix4, Quaternion, Vector3, type Mesh, type Object3D } from 'three';
import { WreckVisualPoseCache, WRECK_PRESENTATION_DURATION, writeWreckBounds, type WreckVisualPose } from './WreckVisualPose';

import { sampleTeemtoStrikeMotion, sampleTeemtoContactRoll, teemtoSlideTime, teemtoStrikeTime, sampleTeemtoFrontCatch, TEEMTO_FRONT_CATCH_PITCH, TEEMTO_FRONT_RESERVED_ROLL, TEEMTO_FRONT_CATCH_END } from './TeemtoStrikeMotion';

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
  readonly groundGaps: Float64Array;
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
  private readonly impactBox = new Box3();
  private readonly impactFraming: { center: Vector3; bounds: Vector3[]; ageSeconds: number; horizontalHalfSpan: number };
  private impactPose: WreckVisualPose | null = null;
  private readonly partBox = new Box3();
  private readonly body = new Matrix4();
  private readonly world = new Matrix4();
  private readonly inverseWorldBody = new Matrix4();
  private readonly baseQuaternion = new Quaternion();
  private readonly motionQuaternion = new Quaternion();
  private readonly motionEuler = new Euler(0, 0, 0, 'YXZ');
  private readonly path = new Vector3();
  private readonly pathVelocity = new Vector3();
  private readonly movingCenter = new Vector3();
  private readonly supportPivot = new Vector3();
  private readonly pivotOffset = new Vector3();
  private readonly rollAxis = new Vector3();
  private readonly rollRotation = new Quaternion();
  private contactGrade = 0;
  private readonly derivativeA = new Vector3();
  private readonly derivativeB = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly axis = new Quaternion();
  private readonly bodyRotation = new Quaternion();
  private readonly settledRotation = new Quaternion();
  private readonly contactRotation = new Quaternion();
  private readonly inverseBody = new Quaternion();
  private readonly translation = new Vector3();
  private readonly groundOffset = new Vector3();
  private readonly point = new Vector3();
  private readonly contact = { position: new Vector3(), direction: new Vector3(),
    footprint: { center: new Vector3(), axis: new Vector3(), halfLength: 0, halfWidth: 0,
      edges: [new Vector3(), new Vector3()] as const } };
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
      const samples = new WreckVisualPoseCache(index === 1 || index === 2); samples.refresh(root, [mesh], 0);
      return { node, samples, matrix: new Matrix4(), restMatrix: node.matrix.clone(), restPosition: node.position.clone(),
        restRotation: node.quaternion.clone(), restScale: node.scale.clone(), auto: node.matrixAutoUpdate, groundGaps: new Float64Array(samples.supportPoints.length) };
    });
    const stationary = originals.filter(mesh => mesh !== originalLeft && !hidden.includes(mesh));
    if (stubs) stationary.push(stubs);
    this.stationary.refresh(root, stationary, 0);
    this.bounds = Array.from({ length: (this.parts.length + 1) * 8 }, () => new Vector3());
    // First beat: the two torn right-engine boxes and two actual witnesses.
    // Eight preallocated points reveal the left engine during the later beat;
    // their initial collapsed positions cannot enlarge the early fit. The full
    // stationary/engine/tether bounds remain unchanged for lens safety.
    this.impactFraming = { center: new Vector3(), ageSeconds: 0, horizontalHalfSpan: .88, bounds: [
      ...this.bounds.slice(16, 32), new Vector3(), new Vector3(),
      ...Array.from({ length: 8 }, () => new Vector3()),
    ] };
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
    if (this.impactPose?.impactFraming === this.impactFraming) this.impactPose.impactFraming = undefined;
    this.impactPose = null; pose.impactFraming = undefined;
    if (this.rupturePose?.rupture === this.rupture) this.rupturePose.rupture = undefined;
    this.rupturePose = null; pose.rupture = undefined;
    const age = Math.max(0, Math.min(WRECK_PRESENTATION_DURATION, WRECK_PRESENTATION_DURATION - remaining + extrapolation));
    const release = smooth((remaining - extrapolation) / .35), spread = smooth(age / .10) * release;
    this.bodyRotation.setFromEuler(pose.rotation); this.inverseBody.copy(this.bodyRotation).invert();
    this.body.compose(pose.position, this.bodyRotation, UNIT);
    this.inverseWorldBody.copy(this.body).invert();
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
      if (index < 3) {
        this.updateStrikingEngine(index, part, pose, age, release, terrain);
        continue;
      }
      // The remaining severed tether mass keeps its small bounded tumble.
      const yaw = -.25 * spread - .36 * followThrough;
      const pitch = .10 * spread - .22 * followThrough;
      const roll = .65 * spread - .53 * followThrough;
      this.rotation.setFromAxisAngle(Y, yaw);
      this.axis.setFromAxisAngle(X, pitch); this.rotation.multiply(this.axis);
      this.axis.setFromAxisAngle(Z, roll); this.rotation.multiply(this.axis);
      const settle = smooth(age / .18) * release;
      this.translation.copy(part.samples.localCenter).applyQuaternion(this.rotation).negate().add(part.samples.localCenter);
      this.translation.x += -2.8 * spread;
      this.translation.z += -spread;
      this.translation.x += -.8 * followThrough;
      this.translation.z += -1.4 * followThrough;
      part.matrix.compose(this.translation, this.rotation, UNIT);
      this.world.multiplyMatrices(this.body, part.matrix);
      let gap = Infinity;
      for (const support of part.samples.supportPoints) {
        this.point.copy(support).applyMatrix4(this.world);
        const ground = terrain.heightAt(this.point.x, this.point.z), candidate = this.point.y - ground;
        if (candidate < gap) {
          gap = candidate;

        }
      }
      if (Number.isFinite(gap)) {
        const margin = .55 - .37 * settle;
        const correction = gap < margin ? margin - gap : Math.max(-8, margin - gap) * settle;
        this.groundOffset.set(0, correction, 0).applyQuaternion(this.inverseBody);
        this.translation.add(this.groundOffset); part.matrix.compose(this.translation, this.rotation, UNIT);
        this.world.multiplyMatrices(this.body, part.matrix);

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
    this.impactFraming.ageSeconds = age;
    this.impactFraming.bounds[16]!.copy(this.rupture.position);
    this.impactFraming.bounds[17]!.copy(this.contactPose === pose ? this.contact.position : this.rupture.position);
    this.impactBox.makeEmpty();
    for (let index = 0; index < 18; index++) this.impactBox.expandByPoint(this.impactFraming.bounds[index]!);
    this.impactBox.getCenter(this.impactFraming.center);
    // Keep the torn pair dominant through its catch, then reveal settled context
    // without switching arrays or creating a discontinuous aim rectangle.
    const contextBlend = smooth((age - .13) / .52);
    this.impactFraming.horizontalHalfSpan = .88 - .14 * contextBlend;
    for (let index = 0; index < 8; index++) {
      const bound = this.impactFraming.bounds[18 + index]!;
      bound.copy(this.impactFraming.center).lerp(this.bounds[8 + index]!, contextBlend);
      this.impactBox.expandByPoint(bound);
    }
    this.impactBox.getCenter(this.impactFraming.center);
    pose.impactFraming = this.impactFraming; this.impactPose = pose;
  }

  private updateStrikingEngine(index: number, part: Part, pose: WreckVisualPose, age: number,
    release: number, terrain: { heightAt(x: number, z: number): number }): void {
    const base = pose.baseMotion;
    const basePosition = base?.position ?? pose.position, baseRotation = base?.rotation ?? pose.rotation;
    this.baseQuaternion.setFromEuler(baseRotation);
    sampleTeemtoStrikeMotion(index, age, this.path, this.pathVelocity);
    this.movingCenter.copy(part.samples.localCenter).add(this.path).applyQuaternion(this.baseQuaternion).add(basePosition);
    const strike = Math.min(1, age / teemtoStrikeTime(index));
    // An accelerating drop ends with a defined impact, rather than easing to
    // zero speed before touching. Orientation arrests into a supported side.
    const fall = strike * strike;
    const heading = baseRotation.y + (index === 0 ? -.5 : index === 1 ? .6 : -.65);
    const dx = Math.sin(heading), dz = Math.cos(heading);
    const reach = Math.max(2, (part.samples.localBounds.max.z - part.samples.localBounds.min.z) * .4);
    const a = terrain.heightAt(this.movingCenter.x + dx * reach, this.movingCenter.z + dz * reach);
    const b = terrain.heightAt(this.movingCenter.x - dx * reach, this.movingCenter.z - dz * reach);
    const grade = Number.isFinite(a + b) ? Math.max(-.35, Math.min(.35, Math.atan2(a - b, reach * 2))) : 0;
    this.settledRotation.setFromAxisAngle(Y, heading);
    this.axis.setFromAxisAngle(X, -grade); this.settledRotation.multiply(this.axis);
    // Exact source surface bands: the rear belly supports ~10 m, the left
    // shallow bank ~13 m, and the front roof ~7 m. A quarter-roll rested the
    // rear on a 0.36 m protrusion while leaving most of its casing elevated.
    this.axis.setFromAxisAngle(Z, index === 0 ? -Math.PI / 12 : index === 1 ? Math.PI * 11 / 12 : 0);
    this.settledRotation.multiply(this.axis);
    this.contactRotation.copy(this.settledRotation);
    if (index === 1) {
      this.contactRotation.setFromAxisAngle(Y, heading);
      this.axis.setFromAxisAngle(X, -grade + TEEMTO_FRONT_CATCH_PITCH); this.contactRotation.multiply(this.axis);
      this.axis.setFromAxisAngle(Z, Math.PI * 11 / 12 - TEEMTO_FRONT_RESERVED_ROLL); this.contactRotation.multiply(this.axis);
    }
    this.rotation.copy(this.baseQuaternion).slerp(this.contactRotation, smooth(strike));
    this.translation.copy(part.samples.localCenter).applyQuaternion(this.rotation).negate().add(this.movingCenter);
    // Select a real support at first contact, including the front's incomplete
    // pitch/roll. The sampled longitudinal plane and cached source points are
    // reused; no terrain calls or source reads are added. Full grounding below
    // permits honest support transfer as another part of the casing rolls down.
    const contactAge = age - teemtoStrikeTime(index);
    if (contactAge >= 0 && (index === 1 || contactAge < teemtoSlideTime(index))) {
      let lowest = Infinity;
      const slope = Math.tan(grade);
      for (const support of part.samples.supportPoints) {
        this.point.copy(support).applyQuaternion(this.contactRotation);
        const height = this.point.y - slope * (this.point.x * dx + this.point.z * dz);
        if (height < lowest) { lowest = height; this.supportPivot.copy(support); }
      }
      this.groundOffset.copy(this.supportPivot).applyQuaternion(this.rotation).add(this.translation);
      if (index === 1) {
        const catchRemaining = sampleTeemtoFrontCatch(age);
        this.rotation.setFromAxisAngle(Y, heading);
        this.axis.setFromAxisAngle(X, -grade + TEEMTO_FRONT_CATCH_PITCH * catchRemaining); this.rotation.multiply(this.axis);
        this.axis.setFromAxisAngle(Z, Math.PI * 11 / 12 - TEEMTO_FRONT_RESERVED_ROLL * catchRemaining
          + sampleTeemtoContactRoll(index, age)); this.rotation.multiply(this.axis);
      } else {
        this.rollAxis.copy(Z).applyQuaternion(this.settledRotation);
        this.rollRotation.setFromAxisAngle(this.rollAxis, sampleTeemtoContactRoll(index, age));
        this.rotation.premultiply(this.rollRotation);
      }
      this.translation.copy(this.supportPivot).applyQuaternion(this.rotation).negate().add(this.groundOffset);
    }
    if (index === 2) this.contactGrade = grade;
    // Exact recovery goes back to the existing intact parent pose. Until then
    // detached masses do not inherit its unrelated late yaw/roll orbit.
    this.rotation.slerp(this.bodyRotation, 1 - release);
    this.translation.lerp(pose.position, 1 - release);
    this.world.compose(this.translation, this.rotation, UNIT);
    let gap = Infinity;
    const frontBalance = index === 1 ? smooth((age - TEEMTO_FRONT_CATCH_END) / .12) : 0;
    for (let pass = 0; pass < (index === 0 || frontBalance > 0 ? 2 : 1); pass++) {
      gap = Infinity;
      let supportIndex = 0, rearGap = Infinity, frontGap = Infinity, rearZ = 0, frontZ = 0;
      const minZ = part.samples.localBounds.min.z, length = part.samples.localBounds.max.z - minZ;
      for (const support of part.samples.supportPoints) {
        this.point.copy(support).applyMatrix4(this.world);
        const ground = terrain.heightAt(this.point.x, this.point.z), candidate = this.point.y - ground;
        part.groundGaps[supportIndex++] = candidate;
        if (candidate < gap) { gap = candidate; if (index === 2) this.contact.position.set(this.point.x, ground, this.point.z); }
        if (support.z < minZ + length * .25 && candidate < rearGap) { rearGap = candidate; rearZ = support.z; }
        if (support.z > minZ + length * .75 && candidate < frontGap) { frontGap = candidate; frontZ = support.z; }
      }
      if ((index !== 0 && frontBalance === 0) || pass > 0 || !Number.isFinite(rearGap + frontGap) || frontZ - rearZ < 1) break;
      // The long left casing's tail protrusion can hold its nose a metre above
      // sloped sand. Balance separated fore/aft source supports, then resample
      // the same bounded cache so no hidden vertex is deliberately submerged.
      // The front's real contact arc lands on a different patch than its
      // pre-contact slope samples. After the large catch, fade in one bounded
      // support balancing pass. The second pass resamples the rotated cache;
      // neither the broad terminal band nor full-source floor safety is faked.
      // This late terrain adapter preserves the center, as on the left; the
      // large front catch above is the actual source-point pivot motion.
      const balance = Math.max(-.12, Math.min(.12, Math.atan2(rearGap - frontGap, frontZ - rearZ)))
        * (index === 1 ? frontBalance : fall) * release;
      if (Math.abs(balance) < .00001) break;
      this.groundOffset.copy(part.samples.localCenter).applyQuaternion(this.rotation).add(this.translation);
      this.point.set(0, 0, 1).applyQuaternion(this.rotation).setY(0).normalize();
      this.point.set(this.point.z, 0, -this.point.x);
      this.axis.setFromAxisAngle(this.point, -balance); this.rotation.premultiply(this.axis);
      this.translation.copy(part.samples.localCenter).applyQuaternion(this.rotation).negate().add(this.groundOffset);
      this.world.compose(this.translation, this.rotation, UNIT);
    }
    if (Number.isFinite(gap)) {
      const settle = fall * release, margin = .55 - (index === 2 ? .45 : .37) * settle;
      const correction = gap < margin ? margin - gap : Math.max(-8, margin - gap) * settle;
      this.translation.y += correction; this.world.compose(this.translation, this.rotation, UNIT);
      if (index === 2 && strike === 1 && release === 1 && gap + correction <= .100001) {
        this.writeStrikeDirection(part, pose, age);
        this.writeContactFootprint(part, correction, terrain);
        pose.groundContact = this.contact; this.contactPose = pose;
      }
    }
    // Explicitly cancel the moving rendered parent; node/prepass/shadow paths
    // receive the same existing root-local deformation matrix.
    part.matrix.multiplyMatrices(this.inverseWorldBody, this.world);
    writeWreckBounds(part.samples.localBounds, this.world, this.bounds, (index + 1) * 8);
    part.node.matrixAutoUpdate = false; part.node.matrix.multiplyMatrices(part.matrix, part.restMatrix);
    part.node.matrix.decompose(part.node.position, part.node.quaternion, part.node.scale);
    part.node.matrixWorldNeedsUpdate = true;
    this.partBox.copy(part.samples.localBounds).applyMatrix4(part.matrix); this.assembly.union(this.partBox);
  }

  private writeContactFootprint(part: Part, correction: number, terrain: { heightAt(x: number, z: number): number }): void {
    const footprint = this.contact.footprint;
    footprint.axis.set(0, 0, 1).applyQuaternion(this.rotation).setY(0).normalize();
    const ax = footprint.axis.x, az = footprint.axis.z;
    let minAlong = Infinity, maxAlong = -Infinity, minAcross = Infinity, maxAcross = -Infinity;
    let left = Infinity, right = -Infinity;
    footprint.edges[0].copy(this.contact.position); footprint.edges[1].copy(this.contact.position);
    for (let index = 0; index < part.samples.supportPoints.length; index++) {
      // Reuse the exact terrain samples from the grounding pass. The belly's
      // narrow contact band sits inside a much wider casing; placing both dust
      // planes there lets that casing depth-occlude the contact presentation.
      const gap = part.groundGaps[index]! + correction;
      this.point.copy(part.samples.supportPoints[index]!).applyMatrix4(this.world);
      const across = (this.point.x - this.contact.position.x) * az - (this.point.z - this.contact.position.z) * ax;
      if (Number.isFinite(gap)) {
        if (across < left) { left = across; footprint.edges[0].copy(this.point); footprint.edges[0].y -= gap; }
        if (across > right) { right = across; footprint.edges[1].copy(this.point); footprint.edges[1].y -= gap; }
      }
      // Preserve the existing near-ground band and minimum support witness.
      // Each edge retains an actual source vertex's XZ and its own ground Y;
      // no box corner, extra terrain query or new collision area is introduced.
      if (gap > .45) continue;
      this.point.sub(this.contact.position);
      const along = this.point.x * ax + this.point.z * az;
      minAlong = Math.min(minAlong, along); maxAlong = Math.max(maxAlong, along);
      minAcross = Math.min(minAcross, across); maxAcross = Math.max(maxAcross, across);
    }
    footprint.halfLength = Number.isFinite(minAlong + maxAlong) ? (maxAlong - minAlong) * .5 : 0;
    footprint.halfWidth = Number.isFinite(minAcross + maxAcross) ? (maxAcross - minAcross) * .5 : 0;
    footprint.center.copy(this.contact.position);
    if (footprint.halfLength > 0) {
      const along = (minAlong + maxAlong) * .5, across = (minAcross + maxAcross) * .5;
      footprint.center.x += ax * along + az * across; footprint.center.z += az * along - ax * across;
      const ground = terrain.heightAt(footprint.center.x, footprint.center.z);
      if (Number.isFinite(ground)) footprint.center.y = ground;
    }
  }

  private writeStrikeDirection(part: Part, pose: WreckVisualPose, age: number): void {
    const base = pose.baseMotion, rotation = base?.rotation ?? pose.rotation;
    const omega = base?.angularVelocity, epsilon = .0001;
    // Differentiate the desired WORLD center, including simulation-base
    // angular and linear motion. Generic parent tumble has been cancelled.
    for (let side = 0; side < 2; side++) {
      const delta = side === 0 ? -epsilon : epsilon;
      sampleTeemtoStrikeMotion(2, age + delta, this.path, this.pathVelocity);
      this.motionEuler.set(rotation.x + (omega?.x ?? 0) * delta,
        rotation.y + (omega?.y ?? 0) * delta, rotation.z + (omega?.z ?? 0) * delta, 'YXZ');
      this.motionQuaternion.setFromEuler(this.motionEuler);
      const target = side === 0 ? this.derivativeA : this.derivativeB;
      target.copy(part.samples.localCenter).add(this.path).applyQuaternion(this.motionQuaternion);
      // The contact roll moves the center around its source support. Include
      // that arc in the world departure direction, using the same sampled
      // terrain grade rather than issuing derivative-only terrain queries.
      if (age < teemtoStrikeTime(2) + teemtoSlideTime(2)) {
        this.settledRotation.setFromAxisAngle(Y, this.motionEuler.y - .65);
        this.axis.setFromAxisAngle(X, -this.contactGrade); this.settledRotation.multiply(this.axis);
        this.pivotOffset.copy(this.supportPivot).sub(part.samples.localCenter).applyQuaternion(this.settledRotation);
        target.add(this.pivotOffset);
        this.rollAxis.copy(Z).applyQuaternion(this.settledRotation);
        this.rollRotation.setFromAxisAngle(this.rollAxis, sampleTeemtoContactRoll(2, age + delta));
        this.pivotOffset.applyQuaternion(this.rollRotation); target.sub(this.pivotOffset);
      }
    }
    this.contact.direction.copy(this.derivativeB).sub(this.derivativeA).multiplyScalar(.5 / epsilon);
    if (base) this.contact.direction.add(base.velocity);
    this.contact.direction.y = 0;
    if (this.contact.direction.lengthSq() < .0001) {
      sampleTeemtoStrikeMotion(2, teemtoStrikeTime(2), this.path, this.pathVelocity);
      this.contact.direction.copy(this.pathVelocity).applyQuaternion(this.baseQuaternion); this.contact.direction.y = 0;
    }
    this.contact.direction.normalize();
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
    if (this.impactPose?.impactFraming === this.impactFraming) this.impactPose.impactFraming = undefined;
    this.impactPose = null;
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

import { describe, expect, it } from 'vitest';
import { Box3, Matrix4, Mesh, Object3D, PerspectiveCamera, Quaternion, Vector3 } from 'three';

import {
  PILOT_VARIANT_ORDER,
  PILOT_VARIANTS,
  PilotView,
  attachPilotToAnchor,
  pilotVariantForRacer,
} from '../../src/render/pilots';

function expectFiniteObject(object: Object3D): void {
  const values = [
    ...object.position.toArray(),
    ...object.quaternion.toArray(),
    ...object.scale.toArray(),
    ...object.matrix.elements,
    ...object.matrixWorld.elements,
  ];
  for (const value of values) expect(Number.isFinite(value)).toBe(true);
}

function updateFrames(
  pilot: PilotView,
  frames: number,
  input: Parameters<PilotView['updateAnimation']>[0],
): void {
  for (let frame = 0; frame < frames; frame += 1) {
    pilot.updateAnimation({ ...input, time: input.time + frame / 60, deltaTime: 1 / 60 });
  }
}

function projectedBounds(mesh: Mesh, camera: PerspectiveCamera): Box3 {
  const position = mesh.geometry.getAttribute('position');
  const projected = new Vector3();
  const bounds = new Box3();
  bounds.makeEmpty();
  for (let index = 0; index < position.count; index += 1) {
    projected.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld).project(camera);
    bounds.expandByPoint(projected);
  }
  return bounds;
}

describe('procedural pilot rig', () => {
  it('keeps every transform finite under hostile telemetry', () => {
    for (const id of PILOT_VARIANT_ORDER) {
      const pilot = new PilotView({ variant: id, detail: 'hero' });
      pilot.updateAnimation({
        time: Number.NaN,
        deltaTime: Number.POSITIVE_INFINITY,
        steering: Number.NEGATIVE_INFINITY,
        throttle: 99,
        brake: -99,
        lateralAcceleration: Number.NaN,
        verticalAcceleration: 999,
        drift: -999,
        grounded: false,
        landingIntensity: Number.POSITIVE_INFINITY,
        engineVibration: 999,
        racePhase: 'racing',
      });
      pilot.updateMatrixWorld(true);
      pilot.traverse(expectFiniteObject);
      expectFiniteObject(pilot.rig.leftArm.hand);
      expectFiniteObject(pilot.rig.rightArm.hand);
      pilot.dispose();
    }
  });

  it('mirrors neutral lever targets and analytically keeps both hands on them', () => {
    const pilot = new PilotView({ variant: 'sunflare', detail: 'hero', outlines: false });
    updateFrames(pilot, 8, {
      time: 0,
      steering: 0,
      throttle: 0.55,
      brake: 0,
      lateralAcceleration: 0,
      verticalAcceleration: 0,
      drift: 0,
      grounded: true,
      landingIntensity: 0,
      engineVibration: 0,
      racePhase: 'racing',
    });

    const leftTarget = pilot.leverTargets.left.position;
    const rightTarget = pilot.leverTargets.right.position;
    expect(leftTarget.x).toBeCloseTo(-rightTarget.x, 6);
    expect(leftTarget.y).toBeCloseTo(rightTarget.y, 6);
    expect(leftTarget.z).toBeCloseTo(rightTarget.z, 6);

    const leftHandWorld = pilot.rig.leftArm.hand.getWorldPosition(new Vector3());
    const rightHandWorld = pilot.rig.rightArm.hand.getWorldPosition(new Vector3());
    const leftTargetWorld = pilot.leverTargets.left.getWorldPosition(new Vector3());
    const rightTargetWorld = pilot.leverTargets.right.getWorldPosition(new Vector3());
    expect(leftHandWorld.distanceTo(leftTargetWorld)).toBeLessThan(0.025);
    expect(rightHandWorld.distanceTo(rightTargetWorld)).toBeLessThan(0.025);
    expect(leftHandWorld.x).toBeCloseTo(-rightHandWorld.x, 4);
    pilot.dispose();
  });

  it('visually seats both faceted gloves over their control grips', () => {
    const pilot = new PilotView({ variant: 'sunflare', detail: 'hero', outlines: false });
    updateFrames(pilot, 6, {
      time: 0,
      steering: -0.42,
      throttle: 0.9,
      lateralAcceleration: -9,
      grounded: true,
      racePhase: 'racing',
    });
    pilot.updateMatrixWorld(true);

    for (const side of ['left', 'right'] as const) {
      const glove = pilot.getObjectByName(`${side}-glove`);
      const grip = pilot.getObjectByName(`${side}-control-lever`);
      const gripCap = pilot.getObjectByName(`${side}-control-grip-cap`);
      expect(glove).toBeDefined();
      expect(grip).toBeDefined();
      expect(gripCap).toBeDefined();
      expect(gripCap!.parent?.name).toBe(`${side}-hand`);
      expect(gripCap!.renderOrder).toBeGreaterThan(0);
      expect((gripCap as Mesh).material).toMatchObject({
        depthTest: false,
        depthWrite: false,
      });
      expect(gripCap!.position.x).toBe(0);
      expect(gripCap!.position.y).toBeCloseTo(0.008, 6);
      const gloveBox = new Box3().setFromObject(glove!);
      const gripCapBox = new Box3().setFromObject(gripCap!);
      expect(glove!.getWorldPosition(new Vector3()).distanceTo(
        gripCap!.getWorldPosition(new Vector3()),
      )).toBeLessThan(0.000001);
      expect(gloveBox.intersectsBox(new Box3().setFromObject(grip!))).toBe(true);
      expect(gloveBox.intersectsBox(gripCapBox)).toBe(true);
      const contactSize = gripCapBox.getSize(new Vector3());
      expect(Math.max(contactSize.x, contactSize.y)).toBeGreaterThan(0.22);
      expect(gripCapBox.containsPoint(gloveBox.getCenter(new Vector3()))).toBe(true);
      const contactMesh = gripCap as Mesh;
      contactMesh.geometry.computeBoundingBox();
      const localContactSize = contactMesh.geometry.boundingBox!.getSize(new Vector3());
      if (side === 'right') {
        // Anatomical right is the screen-left fist in the authored cockpit view.
        expect(glove!.scale.x).toBeGreaterThan(1.4);
        expect(localContactSize.z).toBeGreaterThan(localContactSize.x * 5);
      } else {
        expect(localContactSize.x).toBeGreaterThan(localContactSize.z * 5);
      }
    }
    pilot.dispose();
  });

  it('keeps its shallow face plate forward of the rear helmet silhouette', () => {
    const pilot = new PilotView({ variant: 'sunflare', detail: 'hero', outlines: false });
    const face = pilot.getObjectByName('face');
    const helmet = pilot.getObjectByName('helmet-dome');
    expect(face).toBeDefined();
    expect(helmet).toBeDefined();
    expect(face!.position.z).toBeGreaterThan(helmet!.position.z + 0.12);
    expect(face!.scale.z).toBeLessThan(face!.scale.x * 0.7);
    pilot.dispose();
  });

  it('codes the asymmetric shoulder plate as flat dark armor, not a third glove', () => {
    const pilot = new PilotView({ variant: 'sunflare', detail: 'hero', outlines: false });
    const pauldron = pilot.getObjectByName('dominant-shoulder-pauldron') as Mesh;
    expect(pauldron).toBeDefined();
    expect((pauldron.material as { name: string }).name).toContain('pilot-visor');
    expect((pauldron.material as { name: string }).name).not.toContain('pilot-glove');
    pauldron.geometry.computeBoundingBox();
    const size = pauldron.geometry.boundingBox!.getSize(new Vector3());
    expect(size.y).toBeLessThan(size.x * 0.3);
    expect(size.y).toBeLessThan(size.z * 0.3);
    pilot.dispose();
  });

  it('projects the screen-left grip stripe through its warm glove silhouette', () => {
    const pilot = new PilotView({ variant: 'sunflare', detail: 'hero', outlines: false });
    updateFrames(pilot, 6, {
      time: 4,
      steering: 0,
      throttle: 1,
      grounded: false,
      engineVibration: 0.7,
      racePhase: 'racing',
    });
    const camera = new PerspectiveCamera(84, 16 / 9, 0.35, 18_000);
    // Authored cockpit camera transformed into the hero pilot's local frame.
    camera.position.set(0.1912169, 3.3211595, -6.1308072);
    camera.quaternion.set(0.019535, 0.9996961, -0.0150323, -0.0002937);
    pilot.add(camera);
    pilot.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    const glove = pilot.getObjectByName('right-glove') as Mesh;
    const contact = pilot.getObjectByName('right-control-grip-cap') as Mesh;
    const gloveCenter = glove.getWorldPosition(new Vector3()).project(camera);
    const contactCenter = contact.getWorldPosition(new Vector3()).project(camera);
    expect(contactCenter.distanceTo(gloveCenter)).toBeLessThan(0.000001);
    const gloveBounds = projectedBounds(glove, camera);
    const contactBounds = projectedBounds(contact, camera);
    expect(contactBounds.min.x).toBeGreaterThan(gloveBounds.min.x);
    expect(contactBounds.max.x).toBeLessThan(gloveBounds.max.x);
    expect(contactBounds.min.y).toBeGreaterThan(gloveBounds.min.y);
    expect(contactBounds.max.y).toBeLessThan(gloveBounds.max.y);
    pilot.dispose();
  });

  it('ships four structurally distinct racer variants', () => {
    const variants = PILOT_VARIANT_ORDER.map((id, racerIndex) => {
      expect(pilotVariantForRacer(racerIndex).id).toBe(id);
      return PILOT_VARIANTS[id];
    });
    expect(new Set(variants.map((variant) => variant.callSign)).size).toBe(4);
    expect(new Set(variants.map((variant) => variant.helmetStyle)).size).toBe(4);
    expect(new Set(variants.map((variant) => variant.accessory)).size).toBe(4);
    expect(new Set(variants.map((variant) => variant.suitPalette)).size).toBe(4);
  });

  it('crouches and folds its legs into a landing brace', () => {
    const pilot = new PilotView({ variant: 'dune-fang', detail: 'hero' });
    const restSpineHeight = pilot.rig.spine.position.y;
    const restKneeBend = pilot.rig.leftLeg.knee.rotation.x;
    pilot.updateAnimation({
      time: 1,
      deltaTime: 1 / 30,
      landingIntensity: 1,
      verticalAcceleration: 24,
      grounded: true,
      engineVibration: 0.7,
      racePhase: 'racing',
    });
    expect(pilot.animationState.landingBrace).toBeGreaterThan(0.5);
    expect(pilot.rig.spine.position.y).toBeLessThan(restSpineHeight - 0.035);
    expect(pilot.rig.leftLeg.knee.rotation.x).toBeGreaterThan(restKneeBend + 0.25);
    expect(pilot.rig.rightLeg.knee.rotation.x).toBeCloseTo(pilot.rig.leftLeg.knee.rotation.x, 6);
    pilot.dispose();
  });

  it('turns steering into a readable asymmetric upper-body pose', () => {
    const pilot = new PilotView({ variant: 'sunflare', detail: 'hero', outlines: false });
    updateFrames(pilot, 6, {
      time: 0,
      steering: 0.5,
      throttle: 0.8,
      lateralAcceleration: 10,
      drift: 0.35,
      grounded: true,
      engineVibration: 0.6,
      racePhase: 'racing',
    });

    expect(Math.abs(pilot.rig.chest.rotation.z)).toBeGreaterThan(0.28);
    expect(Math.abs(
      pilot.leverTargets.left.position.z - pilot.leverTargets.right.position.z,
    )).toBeGreaterThan(0.05);
    expect(Math.abs(
      pilot.leverTargets.left.position.y - pilot.leverTargets.right.position.y,
    )).toBeGreaterThan(0.03);
    expect(Math.abs(
      pilot.rig.leftArm.shoulder.position.y - pilot.rig.rightArm.shoulder.position.y,
    )).toBeGreaterThan(0.05);
    expect(Math.abs(
      pilot.rig.leftArm.shoulder.position.z - pilot.rig.rightArm.shoulder.position.z,
    )).toBeGreaterThan(0.08);
    const leftHand = pilot.rig.leftArm.hand.getWorldPosition(new Vector3());
    const rightHand = pilot.rig.rightArm.hand.getWorldPosition(new Vector3());
    const leftLever = pilot.leverTargets.left.getWorldPosition(new Vector3());
    const rightLever = pilot.leverTargets.right.getWorldPosition(new Vector3());
    expect(leftHand.distanceTo(leftLever)).toBeLessThan(0.025);
    expect(rightHand.distanceTo(rightLever)).toBeLessThan(0.025);
    pilot.dispose();
  });

  it('takes an asymmetric airborne weight-shift even with nearly neutral steering', () => {
    const pilot = new PilotView({ variant: 'sunflare', detail: 'hero', outlines: false });
    updateFrames(pilot, 6, {
      time: 4,
      steering: 0,
      throttle: 1,
      grounded: false,
      engineVibration: 0.7,
      racePhase: 'racing',
    });
    expect(Math.abs(pilot.animationState.lean)).toBeGreaterThan(0.12);
    expect(Math.abs(pilot.rig.chest.rotation.z)).toBeGreaterThan(0.14);
    expect(pilot.animationState.landingBrace).toBeGreaterThan(0.14);
    pilot.dispose();
  });

  it('releases the controls into a looping finish celebration', () => {
    const pilot = new PilotView({ variant: 'gilded-bolt', detail: 'hero', outlines: false });
    updateFrames(pilot, 8, {
      time: 0,
      grounded: true,
      engineVibration: 0.4,
      racePhase: 'racing',
    });
    const dominantArm = pilot.variant.dominantSide < 0 ? pilot.rig.leftArm : pilot.rig.rightArm;
    const supportArm = pilot.variant.dominantSide < 0 ? pilot.rig.rightArm : pilot.rig.leftArm;
    const leftUpperArm = pilot.getObjectByName('left-upper-arm')!;
    const rightUpperArm = pilot.getObjectByName('right-upper-arm')!;
    const racingLeftUpperScale = leftUpperArm.scale.x;
    const racingRightUpperScale = rightUpperArm.scale.x;
    const racingBodyHeight = pilot.rig.bodyRoot.position.y;
    const racingHandHeight = dominantArm.hand.getWorldPosition(new Vector3()).y;
    const racingSupportHeight = supportArm.hand.getWorldPosition(new Vector3()).y;

    pilot.resetAnimationState();
    pilot.updateAnimation({
      time: 0.9,
      deltaTime: 1 / 120,
      grounded: true,
      racePhase: 'finished',
      finished: true,
    });
    expect(pilot.animationState.celebration).toBeGreaterThan(0.3);
    pilot.updateAnimation({
      time: 0.9 + 1 / 120,
      deltaTime: 1 / 120,
      grounded: true,
      racePhase: 'finished',
      finished: true,
    });
    const firstCutLeft = pilot.rig.leftArm.hand.getWorldPosition(new Vector3());
    const firstCutRight = pilot.rig.rightArm.hand.getWorldPosition(new Vector3());
    expect(Math.abs(firstCutLeft.x - firstCutRight.x)).toBeGreaterThan(1.25);
    expect(Math.abs(firstCutLeft.z - firstCutRight.z)).toBeGreaterThan(0.65);
    const resultsScreenSpan = Math.abs(
      (firstCutRight.z - firstCutLeft.z) * 0.757
        + (firstCutRight.x - firstCutLeft.x) * 0.654,
    );
    expect(resultsScreenSpan).toBeGreaterThan(2);
    expect(leftUpperArm.scale.x).toBeGreaterThan(racingLeftUpperScale * 1.45);
    expect(rightUpperArm.scale.x).toBeGreaterThan(racingRightUpperScale * 1.45);
    expect(pilot.rig.leftArm.hand.scale.x).toBeGreaterThan(2.1);
    expect(pilot.rig.rightArm.hand.scale.x).toBeGreaterThan(2.1);
    expect(pilot.rig.bodyRoot.scale.x).toBeGreaterThan(1.65);
    expect(pilot.rig.bodyRoot.position.y).toBeGreaterThan(racingBodyHeight + 0.25);

    updateFrames(pilot, 60, {
      time: 1,
      grounded: true,
      engineVibration: 0.5,
      racePhase: 'finished',
      finished: true,
    });
    const celebrationHandHeight = dominantArm.hand.getWorldPosition(new Vector3()).y;
    const celebrationSupportHeight = supportArm.hand.getWorldPosition(new Vector3()).y;
    const celebrationHeadHeight = pilot.rig.head.getWorldPosition(new Vector3()).y;
    expect(pilot.animationState.celebration).toBeGreaterThan(0.98);
    expect(celebrationHandHeight).toBeGreaterThan(racingHandHeight + 0.45);
    expect(celebrationSupportHeight).toBeGreaterThan(racingSupportHeight + 0.22);
    expect(celebrationHandHeight).toBeGreaterThan(celebrationHeadHeight + 0.32);
    expect(celebrationSupportHeight).toBeGreaterThan(celebrationHeadHeight + 0.26);

    const firstPose = dominantArm.hand.getWorldQuaternion(new Quaternion());
    updateFrames(pilot, 13, {
      time: 2.1,
      grounded: true,
      racePhase: 'finished',
      finished: true,
    });
    const secondPose = dominantArm.hand.getWorldQuaternion(new Quaternion());
    expect(Math.abs(firstPose.dot(secondPose))).toBeLessThan(0.9999);
    pilot.dispose();
  });

  it('offers a materially cheaper distant AI rig and attachable factory', () => {
    const anchor = new Object3D();
    const hero = new PilotView({ racerIndex: 0, detail: 'hero' });
    const distant = attachPilotToAnchor(anchor, { racerIndex: 2, detail: 'distant' });
    expect(anchor.children).toContain(distant);
    expect(distant.renderStats.estimatedDrawCalls).toBeLessThan(hero.renderStats.estimatedDrawCalls);
    expect(distant.renderStats.triangles).toBeLessThan(hero.renderStats.triangles);
    expect(distant.outlineHandles.length).toBe(distant.renderStats.outlineMeshes);
    expect(hero.renderStats.estimatedDrawCalls).toBeLessThanOrEqual(40);
    expect(distant.renderStats.estimatedDrawCalls).toBeLessThanOrEqual(24);
    distant.setViewport(1512, 982, 2);
    distant.syncOutlines();
    expect(distant.matrixWorld).toBeInstanceOf(Matrix4);
    distant.dispose();
    expect(anchor.children).not.toContain(distant);
    distant.dispose();
    hero.dispose();
  });
});

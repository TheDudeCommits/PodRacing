import { describe, expect, it } from 'vitest';
import {
  AdditiveBlending,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  NormalBlending,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from 'three';

import {
  GALACTIC_EFFECT_DRAW_CALL_BUDGET,
  GalacticEffectsView,
} from '../../src/render/galactic/GalacticEffectsView';

describe('GalacticEffectsView', () => {
  it('keeps the complete expansion inside eight fixed instanced draws', () => {
    const view = new GalacticEffectsView();
    const draws = view.children.filter((child) => child instanceof InstancedMesh);
    expect(draws).toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
    expect(draws.every((mesh) => !mesh.frustumCulled)).toBe(true);
    expect(draws.every((mesh) => mesh.count === 0)).toBe(true);
    expect(draws.every((mesh) => (
      mesh.material instanceof MeshBasicMaterial && mesh.material.vertexColors === false
    ))).toBe(true);
    expect((view.shieldShells.material as MeshBasicMaterial).blending).toBe(NormalBlending);
    expect((view.shieldShells.material as MeshBasicMaterial).transparent).toBe(true);
    expect((view.heatLances.material as MeshBasicMaterial).blending).toBe(AdditiveBlending);
    const shieldPositions = view.shieldShells.geometry.getAttribute('position');
    let minimumShieldRadius = Number.POSITIVE_INFINITY;
    for (let index = 0; index < (shieldPositions?.count ?? 0); index += 1) {
      minimumShieldRadius = Math.min(minimumShieldRadius, Math.hypot(
        shieldPositions!.getX(index),
        shieldPositions!.getY(index),
        shieldPositions!.getZ(index),
      ));
    }
    expect(minimumShieldRadius).toBeGreaterThan(0.8);
    expect(shieldPositions?.count).toBeLessThan(2_000);
    view.dispose();
  });

  it('presents recovery as a thin vertical rematerialization scan', () => {
    const view = new GalacticEffectsView();
    view.setShields([{
      position: { x: 0, y: 4, z: 0 },
      radius: 5,
      mode: 'recovery',
      color: '#55ff9a',
    }]);
    const first = new Matrix4();
    const second = new Matrix4();
    const firstPosition = new Vector3();
    const secondPosition = new Vector3();
    const scanScale = new Vector3();
    view.update(0);
    view.shieldShells.getMatrixAt(0, first);
    first.decompose(firstPosition, new Quaternion(), scanScale);
    expect(scanScale.y).toBeLessThan(scanScale.x * 0.1);
    view.update(0.6);
    view.shieldShells.getMatrixAt(0, second);
    second.decompose(secondPosition, new Quaternion(), new Vector3());
    expect(Math.abs(secondPosition.y - firstPosition.y)).toBeGreaterThan(1);
    view.dispose();
  });

  it('copies serializable state and animates all persistent pools', () => {
    const view = new GalacticEffectsView();
    view.setState({
      shields: [{ position: { x: 1, y: 2, z: 3 }, radius: 4 }],
      weaponBolts: [{ origin: { x: 0, y: 1, z: 0 }, target: { x: 0, y: 1, z: 8 } }],
      heatLances: [{ origin: { x: 0, y: 1, z: 0 }, target: { x: 0, y: 1, z: 40 }, width: 1.5 }],
      scrapMines: [
        { position: { x: 3, y: 0, z: 4 }, armed: true },
        { position: { x: 6, y: 0, z: 8 }, variant: 'pickup', scale: 2.2 },
      ],
      hazards: [{ kind: 'sand-geyser', position: { x: 8, y: 0, z: 9 }, radius: 3 }],
    });
    view.update(2.5);

    expect(view.shieldShells.count).toBe(1);
    // One ordinary bolt plus the full core and traveling pulse of one lance.
    expect(view.weaponBolts.count).toBe(3);
    expect(view.heatLances.count).toBe(1);
    expect(view.scrapMines.count).toBe(2);
    expect(view.hazardTelegraphs.count).toBe(1);
    expect(view.hazardBodies.count).toBe(1);
    const matrix = new Matrix4();
    view.weaponBolts.getMatrixAt(0, matrix);
    expect(matrix.elements.every(Number.isFinite)).toBe(true);
    const scale = new Vector3();
    view.heatLances.getMatrixAt(0, matrix);
    matrix.decompose(new Vector3(), new Quaternion(), scale);
    expect(scale.z).toBeGreaterThan(35);
    expect(scale.x).toBeGreaterThan(1.2);
    expect(view.shieldShells.geometry.getAttribute('position')?.count).toBeGreaterThan(100);
    expect(view.heatLances.geometry.getAttribute('position')?.count).toBeGreaterThan(220);

    view.clearEffects();
    expect(view.children.every((child) => !(child instanceof InstancedMesh) || child.count === 0)).toBe(true);
    view.dispose();
  });

  it('animates a bright Heat Lance core and a shorter traveling energy pulse', () => {
    const view = new GalacticEffectsView();
    view.setHeatLances([{
      origin: { x: 0, y: 2, z: 0 },
      target: { x: 0, y: 2, z: 48 },
      width: 1.4,
      phase: 0.3,
    }]);
    const matrix = new Matrix4();
    const coreScale = new Vector3();
    const pulseScale = new Vector3();
    const firstPulsePosition = new Vector3();
    const laterPulsePosition = new Vector3();
    view.update(0);
    expect(view.heatLances.count).toBe(1);
    expect(view.weaponBolts.count).toBe(2);
    view.weaponBolts.getMatrixAt(0, matrix);
    matrix.decompose(new Vector3(), new Quaternion(), coreScale);
    view.weaponBolts.getMatrixAt(1, matrix);
    matrix.decompose(firstPulsePosition, new Quaternion(), pulseScale);
    expect(coreScale.y).toBeGreaterThan(45);
    expect(pulseScale.y).toBeLessThan(coreScale.y * 0.25);
    expect(pulseScale.x).toBeGreaterThan(coreScale.x);
    view.update(0.12);
    view.weaponBolts.getMatrixAt(1, matrix);
    matrix.decompose(laterPulsePosition, new Quaternion(), new Vector3());
    expect(laterPulsePosition.z).toBeGreaterThan(firstPulsePosition.z + 10);
    view.dispose();
  });

  it('gives energy hits a four-stage anime impact plate burst', () => {
    const view = new GalacticEffectsView();
    view.emitCrash({
      type: 'crash',
      time: 3,
      position: { x: 0, y: 4, z: 0 },
      severity: 1.2,
      style: 'energy',
      color: '#ff6940',
    });
    view.update(3.14);
    expect(view.explosionPlates.count).toBe(4);
    expect(view.crashDebris.count).toBeGreaterThan(8);
    view.dispose();
  });

  it('emits crash plates and debris without adding scene nodes', () => {
    const view = new GalacticEffectsView();
    const childrenBefore = view.children.length;
    view.emitCrash({
      type: 'crash',
      time: 4,
      position: { x: 2, y: 3, z: 5 },
      velocity: { x: 10, y: 0, z: -4 },
      groundY: 0,
      severity: 1.4,
    });
    view.update(4.08);
    expect(view.children).toHaveLength(childrenBefore);
    expect(view.crashDebris.count).toBeGreaterThan(0);
    expect(view.explosionPlates.count).toBe(3);
    view.update(8);
    expect(view.crashDebris.count).toBe(0);
    expect(view.explosionPlates.count).toBe(0);
    view.dispose();
  });

  it('uses the same burst pools for a large four-plate upgrade reward', () => {
    const view = new GalacticEffectsView();
    view.emitCrash({
      type: 'crash',
      time: 2,
      position: { x: 0, y: 2, z: 0 },
      severity: 1.5,
      style: 'reward',
    });
    view.update(2.12);
    expect(view.explosionPlates.count).toBe(4);
    expect(view.crashDebris.count).toBeGreaterThan(10);
    const lowRing = new Matrix4();
    const highRing = new Matrix4();
    const lowPosition = new Vector3();
    const highPosition = new Vector3();
    view.explosionPlates.getMatrixAt(0, lowRing);
    view.explosionPlates.getMatrixAt(3, highRing);
    lowRing.decompose(lowPosition, new Quaternion(), new Vector3());
    highRing.decompose(highPosition, new Quaternion(), new Vector3());
    expect(highPosition.y).toBeGreaterThan(lowPosition.y);
    expect(view.children.filter((child) => child instanceof InstancedMesh))
      .toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
    view.dispose();
  });

  it('grounds mine trigger plates and advances faceted rockfall downward', () => {
    const view = new GalacticEffectsView();
    view.emitCrash({
      type: 'crash',
      time: 1,
      position: { x: 2, y: 4, z: 3 },
      groundY: 0,
      severity: 1.4,
      style: 'mine',
    });
    view.update(1.08);
    const matrix = new Matrix4();
    const position = new Vector3();
    const fragmentScale = new Vector3();
    view.explosionPlates.getMatrixAt(0, matrix);
    matrix.decompose(position, new Quaternion(), new Vector3());
    expect(position.y).toBeLessThan(0.2);
    view.crashDebris.getMatrixAt(0, matrix);
    matrix.decompose(new Vector3(), new Quaternion(), fragmentScale);
    expect(Math.max(fragmentScale.x, fragmentScale.y, fragmentScale.z)).toBeLessThan(1);

    view.setHazards([{
      kind: 'rockfall',
      position: { x: 0, y: 0, z: 0 },
      radius: 8,
      height: 7,
      phase: 0,
    }]);
    const highRock = new Vector3();
    const lowRock = new Vector3();
    view.update(0);
    view.hazardBodies.getMatrixAt(0, matrix);
    matrix.decompose(highRock, new Quaternion(), new Vector3());
    view.update(0.8);
    view.hazardBodies.getMatrixAt(0, matrix);
    matrix.decompose(lowRock, new Quaternion(), new Vector3());
    expect(lowRock.y).toBeLessThan(highRock.y);
    view.dispose();
  });

  it('compacts remote state out of fixed pools when a render camera is supplied', () => {
    const view = new GalacticEffectsView();
    const camera = new PerspectiveCamera(60, 1, 0.1, 8_000);
    camera.position.set(0, 8, 0);
    camera.lookAt(0, 4, -20);
    view.setState({
      shields: [{ position: { x: 0, y: 2, z: -4_000 }, radius: 6 }],
      heatLances: [{ origin: { x: 0, y: 2, z: -4_000 }, target: { x: 0, y: 2, z: -3_980 } }],
      scrapMines: [{ position: { x: 0, y: 0, z: -4_000 }, armed: true }],
      hazards: [{ kind: 'rockfall', position: { x: 0, y: 0, z: -4_000 }, radius: 12 }],
    });
    view.update(1, camera);
    expect(view.shieldShells.count).toBe(0);
    expect(view.heatLances.count).toBe(0);
    expect(view.scrapMines.count).toBe(0);
    expect(view.hazardBodies.count).toBe(0);

    view.setState({
      shields: [{ position: { x: 0, y: 2, z: -20 }, radius: 6 }],
      heatLances: [{ origin: { x: 0, y: 2, z: -24 }, target: { x: 0, y: 2, z: -16 } }],
      scrapMines: [{ position: { x: 0, y: 0, z: -20 }, armed: true }],
      hazards: [{ kind: 'rockfall', position: { x: 0, y: 0, z: -30 }, radius: 12 }],
    });
    view.update(1, camera);
    expect(view.shieldShells.count).toBe(1);
    expect(view.heatLances.count).toBe(1);
    expect(view.scrapMines.count).toBe(1);
    expect(view.hazardBodies.count).toBe(1);
    expect(view.children.filter((child) => child instanceof InstancedMesh))
      .toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
    view.dispose();
  });
});

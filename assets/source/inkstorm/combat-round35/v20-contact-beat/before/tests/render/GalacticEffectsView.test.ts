import { describe, expect, it } from 'vitest';
import {
  AdditiveBlending,
  Color,
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
  GALACTIC_EFFECT_CAPACITY,
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
    expect(view.hazardBodies.count).toBe(0);
    expect(view.explosionPlates.count).toBe(3);
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
    expect(view.explosionPlates.count).toBe(4);
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

  it('keeps solid rubble visible while faceted rockfall advances downward', () => {
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
    view.hazardBodies.geometry.computeBoundingBox();
    expect(view.hazardBodies.geometry.boundingBox!.clone().applyMatrix4(matrix).min.y).toBeCloseTo(0, 1);
    view.hazardBodies.getMatrixAt(1, matrix);
    matrix.decompose(highRock, new Quaternion(), new Vector3());
    view.update(0.8);
    view.hazardBodies.getMatrixAt(0, matrix);
    expect(view.hazardBodies.geometry.boundingBox!.clone().applyMatrix4(matrix).min.y).toBeCloseTo(0, 1);
    view.hazardBodies.getMatrixAt(1, matrix);
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
    expect(view.hazardBodies.count).toBe(2);
    expect(view.children.filter((child) => child instanceof InstancedMesh))
      .toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
    view.dispose();
  });
});

describe('compact recovery energy cue', () => {
  it.each([.2, 1.4, 2])('uses only two small transparent surface pulses at severity%s and expires within .4 seconds', severity => {
    const view = new GalacticEffectsView(), matrix = new Matrix4(), position = new Vector3(), scale = new Vector3(), rotation = new Quaternion();
    const event = Object.freeze({ type: 'crash' as const, time: 1, position: Object.freeze({ x: 20, y: 8, z: -4 }),
      velocity: Object.freeze({ x: 60, y: 20, z: -30 }), groundY: 2, severity, style: 'recovery' as const, color: '#60ff91' });
    const before = JSON.stringify(event), children = [...view.children];
    view.emitCrash(event);
    const surface = view.explosionPlates.geometry.getAttribute('aEffectSurface');
    for (const age of [0, .02, .04, .1, .2, .3, .37]) {
      view.update(1 + age);
      expect(view.crashDebris.count, `recovery must not emit opaque ballistic casing at age${age}`).toBe(0);
      expect(view.explosionPlates.count).toBeGreaterThan(0);
      expect(view.explosionPlates.count).toBeLessThanOrEqual(2);
      for (let index = 0; index < view.explosionPlates.count; index++) {
        view.explosionPlates.getMatrixAt(index, matrix); matrix.decompose(position, rotation, scale);
        expect(position.x).toBe(20); expect(position.z).toBe(-4);
        expect(position.y).toBeGreaterThan(2);
        expect(position.y).toBeLessThanOrEqual(2.82 + 1e-6);
        // The shared plane is2×2: even maximum severity stays below4.6m across.
        expect(Math.max(scale.x, scale.y, scale.z)).toBeLessThanOrEqual(2.3 + 1e-6);
        expect(new Vector3(0, 0, 1).applyQuaternion(rotation).y).toBeCloseTo(1, 6);
        expect(surface.getX(index)).toBe(0);
        expect(surface.getY(index)).toBeGreaterThanOrEqual(0);
        expect(surface.getY(index)).toBeLessThanOrEqual(.42 + 1e-6);
      }
    }
    view.update(1.4);
    expect(view.explosionPlates.count).toBe(0); expect(view.crashDebris.count).toBe(0);
    expect(view.children).toEqual(children); expect(view.children).toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
    expect((view.explosionPlates.material as MeshBasicMaterial).transparent).toBe(true);
    expect((view.explosionPlates.material as MeshBasicMaterial).depthWrite).toBe(false);
    expect((view.explosionPlates.material as MeshBasicMaterial).depthTest).toBe(true);
    expect(JSON.stringify(event)).toBe(before);
    view.dispose();
  });

  it('uses explicit recovery semantics rather than changing green energy hits or existing casing', () => {
    const energy = new GalacticEffectsView(), recovery = new GalacticEffectsView();
    for (const [view, style] of [[energy, 'energy'], [recovery, 'recovery']] as const) {
      view.emitCrash({ type: 'crash', time: 1, position: { x: 0, y: 5, z: 0 }, groundY: 0, severity: 1.4, color: '#60ff91', style });
      view.update(1.14);
    }
    expect(energy.crashDebris.count).toBe(15); expect(energy.explosionPlates.count).toBe(4);
    expect(recovery.crashDebris.count).toBe(0); expect(recovery.explosionPlates.count).toBe(2);
    energy.dispose(); recovery.dispose();
    const mixed = new GalacticEffectsView();
    mixed.emitCrash({ type: 'crash', time: 2, position: { x: 0, y: 8, z: 0 }, severity: 2, style: 'redline' });
    mixed.update(2.08);
    const matrices = mixed.crashDebris.instanceMatrix.array.slice(), colors = mixed.crashDebris.instanceColor!.array.slice();
    mixed.emitCrash({ type: 'crash', time: 2.08, position: { x: 4, y: 3, z: 2 }, style: 'recovery' });
    mixed.update(2.08);
    expect(mixed.crashDebris.count).toBe(18);
    expect(mixed.crashDebris.instanceMatrix.array).toEqual(matrices);
    expect(mixed.crashDebris.instanceColor!.array).toEqual(colors);
    mixed.dispose();
  });

  it('wraps repeated recovery pulses in the existing pool and clears without adding resources', () => {
    const a = new GalacticEffectsView(), b = new GalacticEffectsView();
    const geometry = a.children.map(child => (child as InstancedMesh).geometry);
    const materials = a.children.map(child => (child as InstancedMesh).material);
    for (const view of [a, b]) for (let index = 0; index < 20; index++) {
      view.emitCrash({ type: 'crash', time: 1, position: { x: index, y: 3, z: 0 }, groundY: 0, style: 'recovery' });
    }
    a.update(1.1); b.update(1.1);
    expect(a.explosionPlates.count).toBe(GALACTIC_EFFECT_CAPACITY.explosionPlates);
    expect(a.crashDebris.count).toBe(0);
    expect(a.children).toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
    expect(a.children.map(child => (child as InstancedMesh).geometry)).toEqual(geometry);
    expect(a.children.map(child => (child as InstancedMesh).material)).toEqual(materials);
    expect(a.explosionPlates.instanceMatrix.array).toEqual(b.explosionPlates.instanceMatrix.array);
    expect(a.explosionPlates.instanceColor!.array).toEqual(b.explosionPlates.instanceColor!.array);
    a.clearEffects(); a.update(1.2);
    expect(a.explosionPlates.count).toBe(0); expect(a.crashDebris.count).toBe(0);
    b.update(1.4);
    expect(b.explosionPlates.count).toBe(0); expect(b.crashDebris.count).toBe(0);
    a.dispose(); b.dispose();
  });
});

describe('localized wreck rupture', () => {
  it('exposes initial casing in the authored rear cone before the flash disappears', () => {
    const view = new GalacticEffectsView(), matrix = new Matrix4(), point = new Vector3();
    view.emitCrash({ type: 'crash', time: 1, position: { x: 0, y: 8, z: 0 },
      direction: { x: 0, y: 0, z: 1 }, severity: 2, style: 'redline' });
    view.update(1);
    expect(view.crashDebris.count).toBe(18);
    for (let i = 0; i < 18; i++) {
      view.crashDebris.getMatrixAt(i, matrix); point.setFromMatrixPosition(matrix);
      expect(Math.hypot(point.x, point.z)).toBeGreaterThan(1);
      expect(Math.hypot(point.x, point.z)).toBeLessThan(2.2);
      expect(point.z).toBeLessThan(0);
    }
    view.update(1.05);
    let maximumTravel = 0;
    for (let i = 0; i < 18; i++) {
      view.crashDebris.getMatrixAt(i, matrix); point.setFromMatrixPosition(matrix);
      expect(point.z).toBeLessThan(0);
      maximumTravel = Math.max(maximumTravel, Math.hypot(point.x, point.z));
    }
    expect(maximumTravel).toBeGreaterThan(3);
    const surfaces = view.explosionPlates.geometry.getAttribute('aEffectSurface');
    expect(Array.from({ length: view.explosionPlates.count }, (_, i) => surfaces.getX(i))).toContain(2);
    view.dispose();
  });

  it('uses the sampled engine groundpoint for a directional spark fan and two low dust lobes', () => {
    const view = new GalacticEffectsView(), matrix = new Matrix4(), point = new Vector3(), size = new Vector3();
    const position = Object.freeze({ x: 20, y: -12, z: 3 });
    const direction = Object.freeze({ x: 0, y: 0, z: 1 });
    view.emitWreckGroundContact(1, position, direction);
    view.update(1.08);
    expect(view.crashDebris.count).toBe(10);
    expect(view.explosionPlates.count).toBe(2);
    for (let i = 0; i < 10; i++) {
      view.crashDebris.getMatrixAt(i, matrix); matrix.decompose(point, new Quaternion(), size);
      expect(point.z).toBeLessThan(position.z);
      expect(point.y).toBeGreaterThan(position.y);
      expect(size.z / size.x).toBeGreaterThan(20);
      expect(view.crashDebris.geometry.getAttribute('aFragmentMetal').getX(i)).toBe(0);
    }
    const surface = view.explosionPlates.geometry.getAttribute('aEffectSurface');
    for (let i = 0; i < 2; i++) {
      view.explosionPlates.getMatrixAt(i, matrix); matrix.decompose(point, new Quaternion(), size);
      expect(point.z).toBeLessThan(position.z);
      expect(point.y - position.y).toBeLessThan(3);
      expect(size.y / size.x).toBeCloseTo(.48, 5);
      expect(surface.getX(i)).toBe(1);
      expect(surface.getY(i)).toBeLessThanOrEqual(Math.fround(.67));
    }
    view.update(2.21);
    expect(view.crashDebris.count).toBe(0); expect(view.explosionPlates.count).toBe(0);
    view.dispose();
  });

  it('keeps repeated ground contacts within unchanged pools and resets dust drift before unrelated effects', () => {
    const view = new GalacticEffectsView(), mirror = new GalacticEffectsView();
    const geometry = view.children.map(child => (child as InstancedMesh).geometry);
    const material = view.children.map(child => (child as InstancedMesh).material);
    for (const candidate of [view, mirror]) {
      for (let i = 0; i < 20; i++) candidate.emitWreckGroundContact(1, { x: i, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
      candidate.update(1.1);
    }
    expect(view.children).toHaveLength(8);
    expect(view.children.map(child => (child as InstancedMesh).geometry)).toEqual(geometry);
    expect(view.children.map(child => (child as InstancedMesh).material)).toEqual(material);
    expect(view.crashDebris.count).toBe(64); expect(view.explosionPlates.count).toBe(16);
    expect(view.crashDebris.instanceMatrix.array).toEqual(mirror.crashDebris.instanceMatrix.array);
    expect(view.explosionPlates.instanceMatrix.array).toEqual(mirror.explosionPlates.instanceMatrix.array);
    view.clearEffects();
    view.emitWreckGroundContact(NaN, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    view.emitWreckGroundContact(2, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    view.update(2); expect(view.crashDebris.count).toBe(0); expect(view.explosionPlates.count).toBe(0);
    view.emitCrash({ type: 'crash', time: 2, position: { x: 20, y: 8, z: 3 }, severity: 2, style: 'redline' });
    view.update(2.5);
    const matrix = new Matrix4(), point = new Vector3();
    for (let i = 0; i < view.explosionPlates.count; i++) {
      view.explosionPlates.getMatrixAt(i, matrix); point.setFromMatrixPosition(matrix);
      expect(point.x).toBe(20); expect(point.z).toBe(3);
    }
    view.dispose(); mirror.dispose();
  });

  it('leaves airborne rupture anchors and unrelated energy effects at their authored heights', () => {
    const view = new GalacticEffectsView(), matrix = new Matrix4();
    for (const style of ['crash', 'redline'] as const) {
      const position = Object.freeze({ x: 12, y: 18, z: 25 });
      view.emitCrash({ type: 'crash', time: 1, position, groundY: 2, severity: 2, style });
      view.update(1);
      view.explosionPlates.getMatrixAt(0, matrix);
      expect(new Vector3().setFromMatrixPosition(matrix).toArray()).toEqual([12, 18, 25]);
      view.clearEffects();
    }
    view.emitCrash({ type: 'crash', time: 2, position: { x: 12, y: -4, z: 25 }, groundY: 2, severity: 2, style: 'energy' });
    view.update(2);
    view.explosionPlates.getMatrixAt(0, matrix);
    expect(new Vector3().setFromMatrixPosition(matrix).y).toBe(-4);
    view.dispose();
  });

  it('separates fifteen dark casing fragments from three thin hot sparks at full severity', () => {
    const view = new GalacticEffectsView();
    const event = Object.freeze({ type: 'crash' as const, time: 2,
      position: Object.freeze({ x: 40, y: 8, z: -12 }),
      velocity: Object.freeze({ x: 12, y: 0, z: -7 }),
      severity: 2, style: 'redline' as const, color: '#ff0011', groundY: 0 });
    const before = JSON.stringify(event);
    view.emitCrash(event);
    view.update(2.08);
    expect(JSON.stringify(event)).toBe(before);
    expect(view.crashDebris.count).toBe(18);
    expect(view.explosionPlates.count).toBe(4);
    const metal = view.crashDebris.geometry.getAttribute('aFragmentMetal');
    const matrix = new Matrix4(), scale = new Vector3(), tint = new Color();
    let metalCount = 0, sparks = 0;
    for (let i = 0; i < view.crashDebris.count; i++) {
      view.crashDebris.getColorAt(i, tint);
      view.crashDebris.getMatrixAt(i, matrix);
      matrix.decompose(new Vector3(), new Quaternion(), scale);
      if (metal.getX(i) === 1) {
        metalCount++;
        expect(Math.max(tint.r, tint.g, tint.b)).toBeLessThan(0.14);
        expect(tint.r / tint.g).toBeLessThan(1.3);
        expect(scale.x).toBeGreaterThan(0.5);
      } else {
        sparks++;
        expect(tint.r).toBeGreaterThan(0.6);
        expect(scale.z / scale.x).toBeGreaterThan(20);
      }
    }
    expect(metalCount).toBe(15);
    expect(sparks).toBe(3);
    expect((view.crashDebris.material as MeshBasicMaterial).transparent).toBe(false);
    expect((view.crashDebris.material as MeshBasicMaterial).depthWrite).toBe(true);
    expect(view.crashDebris.geometry.index!.count / 3).toBe(12);
    view.dispose();
  });

  it('peaks at the rupture point, then leaves bounded smoke and readable moving metal', () => {
    const view = new GalacticEffectsView();
    view.emitCrash({ type: 'crash', time: 4, position: { x: 20, y: 6, z: -3 }, severity: 2, style: 'redline' });
    const matrix = new Matrix4(), position = new Vector3(), scale = new Vector3(), color = new Color();
    const surface = view.explosionPlates.geometry.getAttribute('aEffectSurface');
    view.update(4.025);
    const hotIndex = Array.from({ length: view.explosionPlates.count }, (_, i) => i).find(i => surface.getX(i) === 2)!;
    expect(hotIndex).toBe(view.explosionPlates.count - 1);
    expect(surface.getY(hotIndex)).toBeGreaterThan(0.9);
    view.explosionPlates.getMatrixAt(hotIndex, matrix);
    matrix.decompose(position, new Quaternion(), scale);
    expect(position.toArray()).toEqual([20, 6, -3]);
    expect(Math.max(scale.x, scale.y)).toBeLessThan(8);
    view.crashDebris.getColorAt(1, color);
    const metalTint = color.clone();
    view.crashDebris.getMatrixAt(1, matrix);
    const firstPosition = new Vector3().setFromMatrixPosition(matrix);
    view.update(4.5);
    expect(view.crashDebris.count).toBe(15);
    expect(view.explosionPlates.count).toBe(2);
    for (let i = 0; i < view.explosionPlates.count; i++) {
      expect(surface.getX(i)).toBe(3);
      expect(surface.getY(i)).toBeLessThanOrEqual(Math.fround(0.68));
      view.explosionPlates.getMatrixAt(i, matrix);
      matrix.decompose(position, new Quaternion(), scale);
      expect(Math.max(scale.x, scale.y)).toBeLessThan(12);
      expect(Math.hypot(position.x - 20, position.z + 3)).toBe(0);
    }
    // Compaction puts the first surviving metal in slot zero after sparks expire.
    view.crashDebris.getColorAt(0, color);
    expect(color.toArray()).toEqual(metalTint.toArray());
    view.crashDebris.getMatrixAt(0, matrix);
    expect(new Vector3().setFromMatrixPosition(matrix).distanceTo(firstPosition)).toBeGreaterThan(2);
    view.update(6);
    expect(view.crashDebris.count).toBe(0);
    expect(view.explosionPlates.count).toBe(0);
    view.dispose();
  });

  it('wraps repeated rupture events within existing pools and produces repeatable geometry', () => {
    const a = new GalacticEffectsView(), b = new GalacticEffectsView();
    const children = [...a.children], geometry = a.crashDebris.geometry;
    for (let i = 0; i < 20; i++) {
      const event = { type: 'crash' as const, time: 1, position: { x: i, y: 8, z: 3 }, severity: 2, style: 'redline' as const };
      a.emitCrash(event); b.emitCrash(event);
    }
    a.update(1.1); b.update(1.1);
    expect(a.children).toEqual(children);
    expect(a.children).toHaveLength(8);
    expect(a.crashDebris.geometry).toBe(geometry);
    expect(a.crashDebris.count).toBe(GALACTIC_EFFECT_CAPACITY.crashDebris);
    expect(a.explosionPlates.count).toBe(GALACTIC_EFFECT_CAPACITY.explosionPlates);
    expect(a.crashDebris.instanceMatrix.array).toEqual(b.crashDebris.instanceMatrix.array);
    expect(a.crashDebris.instanceColor!.array).toEqual(b.crashDebris.instanceColor!.array);
    a.clearEffects(); a.update(1.2);
    expect(a.crashDebris.count).toBe(0);
    expect(a.explosionPlates.count).toBe(0);
    a.dispose(); b.dispose();
  });
});


describe('readable rockfall aftermath', () => {
  it('grounds compact impact plates instead of obscuring the driver with opaque billboards', () => {
    const view = new GalacticEffectsView();
    view.emitCrash({ type: 'crash', time: 0, position: { x: 0, y: 4, z: 0 }, groundY: 0, severity: 1.7, style: 'rock' });
    view.update(0.2);
    expect(view.explosionPlates.count).toBe(2);
    const matrix = new Matrix4(), position = new Vector3(), rotation = new Quaternion(), scale = new Vector3();
    view.explosionPlates.getMatrixAt(0, matrix);
    matrix.decompose(position, rotation, scale);
    expect(position.y).toBeLessThan(0.3);
    expect(scale.x).toBeLessThan(3);
    const normal = new Vector3(0, 0, 1).applyQuaternion(rotation);
    expect(Math.abs(normal.y)).toBeGreaterThan(0.99);
    expect((view.hazardBodies.material as MeshBasicMaterial).transparent).toBe(false);
    expect((view.hazardBodies.material as MeshBasicMaterial).depthWrite).toBe(true);
    view.dispose();
  });
});

describe('atmospheric hazard rendering', () => {
  it('keeps the full danger footprint while separating dust from solid, outlined rubble', () => {
    const view = new GalacticEffectsView();
    view.setHazards([
      { kind: 'sand-geyser', position: { x: 0, y: 4, z: 0 }, radius: 24, height: 13 },
      { kind: 'heat-vent', position: { x: 60, y: 4, z: 0 }, radius: 13, height: 8.5 },
      { kind: 'rockfall', position: { x: 100, y: 4, z: 0 }, radius: 14, height: 4.6 },
    ]);
    view.update(0.4);
    expect(view.hazardTelegraphs.count).toBe(3);
    expect(view.hazardBodies.count).toBe(2);
    expect(view.explosionPlates.count).toBe(6);
    const matrix = new Matrix4(), position = new Vector3(), scale = new Vector3();
    view.hazardTelegraphs.getMatrixAt(0, matrix);
    matrix.decompose(position, new Quaternion(), scale);
    expect(scale.x).toBe(24);
    const material = view.explosionPlates.material as MeshBasicMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthTest).toBe(true);
    expect(material.depthWrite).toBe(false);
    const surface = view.explosionPlates.geometry.getAttribute('aEffectSurface');
    for (let index = 0; index < 6; index += 1) {
      expect(surface.getX(index)).toBe(1);
      expect(surface.getY(index)).toBeGreaterThan(0);
      expect(surface.getY(index)).toBeLessThan(0.5);
    }
    view.explosionPlates.getMatrixAt(0, matrix);
    matrix.decompose(position, new Quaternion(), scale);
    const initialHeight = position.y;
    view.update(0.7);
    view.explosionPlates.getMatrixAt(0, matrix);
    matrix.decompose(position, new Quaternion(), scale);
    expect(position.y).toBeGreaterThan(initialHeight);
    view.dispose();
  });

  it('reserves all plume and burst capacity in the existing eight draws and clears both', () => {
    const view = new GalacticEffectsView();
    view.setHazards(Array.from({ length: 24 }, (_, index) => ({
      kind: 'sand-geyser' as const, position: { x: index * 20, y: 0, z: 0 }, radius: 15,
    })));
    for (let index = 0; index < 4; index += 1) {
      view.emitCrash({ type: 'crash', time: 1, position: { x: index * 10, y: 4, z: 0 }, style: 'energy' });
    }
    view.update(1.2);
    const count = GALACTIC_EFFECT_CAPACITY.hazardPlumes + GALACTIC_EFFECT_CAPACITY.explosionPlates;
    expect(view.explosionPlates.count).toBe(count);
    expect(view.explosionPlates.instanceMatrix.count).toBe(count);
    expect(view.children).toHaveLength(GALACTIC_EFFECT_DRAW_CALL_BUDGET);
    const surface = view.explosionPlates.geometry.getAttribute('aEffectSurface');
    expect(Array.from(surface.array).every(Number.isFinite)).toBe(true);
    expect(surface.getX(71)).toBe(1);
    expect(surface.getX(72)).toBe(0);
    view.clearEffects();
    view.update(1.3);
    expect(view.explosionPlates.count).toBe(0);
    view.dispose();
  });
});
